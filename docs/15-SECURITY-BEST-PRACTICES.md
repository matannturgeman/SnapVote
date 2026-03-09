# Security Best Practices Documentation

## Overview

This document provides comprehensive details about **security best practices**, **authentication flows**, **authorization patterns**, and **vulnerability prevention strategies** implemented across this Nx monorepo project. The application follows OWASP Top 10 guidelines and industry security standards for protecting sensitive data, user privacy, and system integrity.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [JWT Token Management](#jwt-token-management)
3. [CORS Configuration](#cors-configuration)
4. [Rate Limiting & Throttling](#rate-limiting--throttling)
5. [Input Validation & Sanitization](#input-validation--sanitization)
6. [Secure Headers](#secure-headers)
7. [Environment Variables Security](#environment-variables-security)
8. [Database Security](#database-security)
9. [Logging & Monitoring](#logging--monitoring)
10. [Secret Management](#secret-management)
11. [Deployment Security](#deployment-security)
12. [Penetration Testing Checklist](#penetration-testing-checklist)

---

## Authentication & Authorization

### JWT Authentication Flow

The application uses **JSON Web Tokens (JWT)** for stateless authentication. Here's the complete flow:

#### Registration Process

```typescript
// apps/api/src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private jwt: JwtService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() registerDto: RegisterUserDto): Promise<void> {
    const { email, password } = registerDto;

    // Hash password before storing (never store plain text!)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Save to database via repository...
    console.log('User registered securely');
  }
}
```

#### Login Process

```typescript
@Post('login')
@ApiOperation({ summary: 'User login' })
async login(@Body() loginDto: LoginDto): Promise<{ token: string; refreshToken: string }> {
  const { email, password } = loginDto;

  // Verify user exists and credentials match
  const user = await this.userService.findByEmail(email);
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // Generate JWT token
  const payload = { sub: user.id, email: user.email };
  const token = this.jwt.sign(payload, { 
    expiresIn: '15m',
    secret: process.env.JWT_SECRET,
  });

  return { token, refreshToken };
}
```

#### Protected Routes

```typescript
@Get()
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Get all users' })
async findAll(@Req() req: Request): Promise<UserDto[]> {
  // req.user contains decoded JWT payload
  const userId = req.user.id;
  
  return this.usersService.findByUser(userId);
}
```

### Refresh Token Strategy

Refresh tokens allow getting new access tokens without requiring username/password:

```typescript
// apps/api/src/auth/refresh-token.controller.ts
@Post('refresh')
async refresh(@Body() body: { refreshToken: string }): Promise<{ token: string }> {
  const payload = this.jwt.verify(body.refreshToken);
  
  if (!payload || !this.isValidRefreshToken(payload)) {
    throw new UnauthorizedException();
  }

  return {
    token: this.jwt.sign({ sub: payload.sub }, { expiresIn: '15m' }),
  };
}
```

---

## JWT Token Management

### JWT Configuration

Configure JWT settings securely in environment variables:

```bash
# apps/api/.env
JWT_SECRET=your-super-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
NODE_ENV=production
```

### Token Validation Middleware

```typescript
// apps/api/src/auth/guards/jwt.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  // Validate token on every protected route
  getRequestWithUser(context: ExecutionContext): any {
    const request = this.getRequestFromContext(context);
    
    try {
      const payload = this.jwtService.verify(request.headers.authorization);
      request.user = payload;
    } catch (error) {
      console.error('JWT validation failed:', error);
    }

    return request;
  }
}
```

### Rate Limiting for Auth Endpoints

```typescript
// apps/api/src/auth/rate-limiter.guard.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RateLimiterGuard {
  constructor(private jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Store failed login attempts per IP
    const ip = this.getClientIp(request);
    const attempts = await this.rateLimiterRepository.getAttempts(ip);
    
    if (attempts >= 5) {
      throw new UnauthorizedException('Too many login attempts. Please try again in 1 hour.');
    }

    return true;
  }
}
```

---

## CORS Configuration

### Secure CORS Setup

Configure CORS to only allow trusted origins:

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS configuration - be strict about allowed origins
  const whitelist = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:4200',
  ];
  
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || whitelist.includes(origin)) {
        return callback(null, true);
      } else {
        console.log(`Request from unauthorized origin ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies/authorization headers
    methods: 'GET,POST,PUT,PATCH,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    exposedHeaders: 'X-Total-Count',
  });

  // Enable Swagger in development only
  if (process.env.NODE_ENV === 'development') {
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(new DocumentBuilder().build()),
    );
  }

  await app.listen(process.env.API_PORT || 3000);
}
bootstrap();
```

---

## Rate Limiting & Throttling

### Request Rate Limiting

Implement rate limiting to prevent brute force attacks:

```typescript
// apps/api/src/common/rate-limiter.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import * as express from 'express';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  public async use(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
    // Implement sliding window rate limiting
    const clientIp = req.ip;
    const now = Date.now();
    
    if (this.isRateLimited(clientIp)) {
      console.log(`Rate limit exceeded for IP ${clientIp}`);
      res.status(429).json({ message: 'Too many requests' });
      return;
    }

    next();
  }

  private isRateLimited(ip: string): boolean {
    // Check Redis or in-memory store for request count
    const requestCount = this.redis.get(`rate_limit:${ip}`);
    
    if (requestCount >= parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)) {
      return true;
    }

    return false;
  }
}
```

### Throttling for GraphQL APIs

```typescript
// apps/api/src/graphql/throttle.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerStorageRedisService } from '@nestjs/throttler';
import { RedisService } from './redis.service';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttler: {
          ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60000,
          limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
        },
        storage: new ThrottlerStorageRedisService(),
      }),
    }),
  ],
})
export class ThrottleModule {}
```

---

## Input Validation & Sanitization

### DTO Validation with Class-Validator

Always validate incoming requests with decorators:

```typescript
// apps/api/src/dto/create-user.dto.ts
import { IsEmail, MaxLength, MinLength, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @MaxLength(100)
  name?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  age?: number;
}

// Usage in controller
@Post('users')
@UseGuards(JwtAuthGuard)
async create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
  const validatedPayload = await validate(createUserDto);
  
  return this.usersService.create(validatedPayload);
}
```

### SQL Injection Prevention

Prisma uses parameterized queries by default, preventing SQL injection:

```typescript
// apps/api/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserDto> {
    // Safe - uses parameterized query
    return this.prisma.user.findUnique({
      where: { email },
      include: { posts: true },
    });
  }

  // ✅ SAFE: Prisma escapes special characters automatically
  async findBySearchTerm(search: string): Promise<UserDto[]> {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      },
    });
  }

  // ❌ NEVER do this - use Prisma query builder instead
  async unsafeFindByEmail(email: string): Promise<UserDto> {
    return this.prisma.$queryRawUnsafe(
      'SELECT * FROM users WHERE email = ?', [email],
    );
  }
}
```

### XSS Prevention with Helmet

```typescript
// apps/api/src/common/helmet.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import * as helmet from 'helmet';
import * as express from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  public async use(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
    req.header('x-powered-by') = 'Nx Monorepo';
    
    // Add security headers to all responses
    res.setHeader(
      'X-DNS-Prefetch-Control',
      'off',
    );
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'");

    next();
  }
}
```

---

## Environment Variables Security

### Never Commit Secrets

Never commit environment files or secrets:

```bash
# apps/api/.env.example (SAFE to commit)
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/your_db
REDIS_URL=redis://password@localhost:6379/0
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3001

# apps/api/.env (DO NOT commit)
NODE_ENV=production
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}
```

### Secret Management Best Practices

```bash
# Create separate .env files per environment
apps/api/.env.development
apps/api/.env.staging  
apps/api/.env.production

# Use secure credential storage in production
AWS_SECRET_MANAGER=arn:aws:secretsmanager:us-east-1:123456789012:secret/MyAppDatabase-xYz
```

---

## Database Security

### PostgreSQL Hardening

Configure PostgreSQL security settings in docker-compose:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: admin_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: nxdb
      
    # Disable unnecessary extensions
    command: -c listen_addresses='localhost' -c password_encryption=scram-sha-256
    
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
      # Custom pg_hba.conf for authentication
      - ./docker/pg_hba.conf:/etc/postgresql/15/main/pg_hba.conf:ro
      
      # PostgreSQL configuration with security best practices
      - ./docker/postgresql.conf:/etc/postgresql/15/main/postgresql.conf:ro
    
    networks:
      - default

# Custom pg_hba.conf (restrict access)
# docker/docker/pg_hba.conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
host    all             all             0.0.0.0/0               reject  # Only allow trusted networks
```

### Prisma Security Settings

Secure Prisma migrations and schema:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  # Configure migrations path
  migrationBinary = "../node_modules/.bin/prisma-migrate"
}

# Add unique constraints on critical fields
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  
  // Index frequently queried fields for better performance
  @@index([email])
}
```

---

## Logging & Monitoring

### Secure Logging Configuration

Log sensitive information appropriately:

```typescript
// apps/api/src/common/logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class SecureLogger implements LoggerService {
  private readonly logger = new Logger('SecureLogger');

  warn(message: string, trace?: string): void {
    this.logger.warn(this.sanitizeMessage(message), trace);
  }

  error(error: Error | string, context?: string): void {
    this.logger.error(
      typeof error === 'string' ? error : error.message,
      context,
    );
  }

  private sanitizeMessage(message: string): string {
    // Remove sensitive data from log messages
    const sanitized = message.replace(/(password|token|secret)/gi, '[REDACTED]');
    return sanitized;
  }
}
```

### Audit Logging for Security Events

```typescript
// apps/api/src/common/audit.service.ts
import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class AuditService {
  constructor(private readonly logger: LoggerService) {}

  async logAction(
    action: string,
    userId: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // Log important actions to separate audit table
    await this.auditRepository.create({
      userId,
      action,
      timestamp: new Date(),
      ...metadata,
    });
  }
}
```

---

## Penetration Testing Checklist

Use this checklist before deployment:

### Authentication Tests

- [ ] Test JWT token expiration (should be short)
- [ ] Test refresh token rotation
- [ ] Verify password hashing algorithm (bcrypt with salt rounds >= 12)
- [ ] Confirm SQL injection prevention on auth forms
- [ ] Verify brute force protection (rate limiting)

### Authorization Tests

- [ ] Test privilege escalation attempts
- [ ] Confirm horizontal permission checks on user data
- [ ] Verify CORS preflight responses for admin routes
- [ ] Test XSS in input fields and search boxes

### Input Validation Tests

- [ ] Validate all API request parameters
- [ ] Check file upload limits (max size, types)
- [ ] Test with special characters (quotes, angle brackets)
- [ ] Verify length limits on text inputs

### Session Management Tests

- [ ] Verify session timeout works correctly
- [ ] Test concurrent sessions (one per user principle)
- [ ] Confirm logout invalidates all tokens
- [ ] Check for secure cookie flags (HttpOnly, Secure, SameSite)

### Infrastructure Tests

- [ ] Review security headers in responses
- [ ] Test database connection encryption (SSL/TLS)
- [ ] Verify firewall rules allow only necessary ports
- [ ] Confirm environment variables aren't exposed to logs

---

## Emergency Response Procedures

### Security Incident Response Plan

```bash
# Step 1: Identify the threat
docker-compose logs -f | grep -i error
curl http://localhost:3000/health

# Step 2: Isolate affected services
docker-compose stop api
docker-compose up -d postgres redis

# Step 3: Audit recent changes
git diff HEAD~1
npx nx sync:check --projects=api

# Step 4: Deploy hotfix if needed
docker-compose up -d --build api

# Step 5: Notify security team immediately
echo "Security Incident Report" | mail -s "[SECURITY]" security@example.com
```

---

*Document Version: 1.0.0*  
*Last Updated: 2024*