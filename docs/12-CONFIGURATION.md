# Configuration and Environment Management Documentation

## Overview

This document provides comprehensive details about **configuration management** and **environment variable handling** in this Nx monorepo project. Understanding how to configure the application for different environments is crucial for development, testing, staging, and production deployments.

---

## Table of Contents

1. [Environment Variables Fundamentals](#environment-variables-fundamentals)
2. [Directory Structure for Config Files](#directory-structure-for-config-files)
3. [.gitignore Configuration](#gitignore-configuration)
4. [NestJS Configuration Module](#nestjs-configuration-module)
5. [Prisma Configuration](#prisma-configuration)
6. [Vite Client Configuration](#vite-client-configuration)
7. [Docker Environment Setup](#docker-environment-setup)
8. [Best Practices](#best-practices)
9. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## Environment Variables Fundamentals

### What are Environment Variables?

Environment variables provide a way to configure application behavior without hardcoding values directly into the source code. They are:

- **OS-level**: Set by the operating system or container runtime
- **Dynamic**: Can be changed without deploying new code
- **Secure**: Should be used for secrets, credentials, and sensitive data

### Environment Variable Categories

| Category | Purpose | Examples | Location |
|---------|---------|----------|----------|
| Database | Connection strings, credentials | `DATABASE_URL`, `DB_HOST` | Root/Api `.env` files |
| Cache | Redis connection settings | `REDIS_URL`, `REDIS_PASSWORD` | Api `.env` files |
| Server | Port, hostname, API keys | `API_PORT`, `NODE_ENV` | App configs |
| CORS | Allowed origins, credentials | `ALLOWED_ORIGINS` | Client config |
| Feature Flags | Enable/disable features | `FEATURE_FLAG_X=on` | Feature toggles |

---

## Directory Structure for Config Files

### Recommended Layout

```
nx-project/
├── .env                          # Root (optional, workspace-wide settings)
├── apps/
│   ├── api/
│   │   ├── .env                 # API development environment
│   │   ├── .env.example         # Template with all possible variables
│   │   └── .env.production      # Production-specific values
│   └── client/
│       ├── .env.local           # Client-local overrides (Gitignored)
│       └── vite-env.d.ts        # Vite environment type declarations
├── docker/
│   └── .env.docker              # Docker container configurations
└── packages/
    └── .env.package             # Package-level environment variables
```

### Environment Files per Project

#### API Application (`apps/api`)

The NestJS backend application uses multiple `.env` files:

```bash
# apps/api/.env                    # Development (local)
NODE_ENV=development
API_PORT=3000

# PostgreSQL (Docker or local)
DATABASE_URL=postgresql://nxuser:nxpass@localhost:5432/nxdb?schema=public
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nxDB
DB_USER=nxuser
DB_PASSWORD=nxpass

# MongoDB (Optional, uncomment if needed)
# MONGODB_URI=mongodb://nxuser:nxpass@localhost:27017/nxdb?authSource=admin

# Redis
REDIS_URL=redis://nxpass@localhost:6379/0

# API Configuration
API_CORS_ORIGINS=http://localhost:4200,http://localhost:3001
CLIENT_API_URL=http://localhost:4200

# Feature Flags (Development)
FEATURE_SWAGGER_ENABLED=true
FEATURE_RATE_LIMITING=false

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

---

## Gitignore Configuration

### Essential Entries

The `.gitignore` file in the project root should include these entries to prevent sensitive data from being committed:

```
# Environment variables
.env
.env.*
!env.example  # Keep example file safe to share
.gitkeep      # Ignore .gitkeep files in packages/

# Build outputs
dist/
.nx/cache
coverage/
pnpm-lock.yaml.backup

# IDE settings
.vscode/settings.json
.idea/
*.swp
*.swo
```

**Note**: The `.env` pattern ignores all `.env` files, except those explicitly listed in the same file with `!`.

---

## NestJS Configuration Module

### Using @nestjs/config

The application uses **@nestjs/config** for environment variable management. Configure your app to load environment variables safely:

```typescript
// apps/api/src/config/app.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.API_PORT, 10) || 3000,
  corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
  clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
  nodeEnv: process.env.NODE_ENV || 'development',
  loggingLevel: process.env.LOG_LEVEL || 'info',
}));

---

## Prisma Configuration

### Database Connection in Prisma

The `prisma.config.ts` file configures TypeScript paths for the Prisma client. However, the actual connection string comes from environment variables:

```typescript
// prisma.config.ts (for tsconfig-paths)
import { defineConfig } from 'tsconfig-paths';

export default defineConfig({
  compilerOptions: {
    paths: {
      '@prisma/client': ['./prisma/client/#client'],
    },
  },
});
```

### Setting DATABASE_URL

The `DATABASE_URL` environment variable should follow this format:

```bash
# Local development (Docker containers)
DATABASE_URL=postgresql://nxuser:nxpass@localhost:5432/nxdb?schema=public

# Production environment
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public
```

### Environment-Specific Database URLs

Create different `.env` files for each environment:

#### Development (`apps/api/.env.development`)

```bash
NODE_ENV=development
DEBUG=true

# Local PostgreSQL (Docker)
DATABASE_URL=postgresql://nxuser:nxpass@localhost:5432/nxdb?schema=public

# MongoDB for documents
MONGODB_URI=mongodb://localhost:27017/nxdb

# Redis for caching
REDIS_URL=redis://localhost:6379/0

# Feature flags (Development only)
FEATURE_SWAGGER_ENABLED=true
FEATURE_RATE_LIMITING=false
```

#### Staging (`apps/api/.env.staging`)

```bash
NODE_ENV=staging
DEBUG=false

# Staging PostgreSQL
DATABASE_URL=postgresql://${STAGING_DB_USER}:${STAGING_DB_PASSWORD}@${STAGING_DB_HOST}:${STAGING_DB_PORT}/${STAGING_DB_NAME}

# Staging MongoDB
MONGODB_URI=mongodb://${STAGING_MONGO_USER}:${STAGING_MONGO_PASSWORD}@${STAGING_MONGO_HOST}:27017/${STAGING_DB_NAME}

# Staging Redis
REDIS_URL=redis://:staging_password@${STAGING_REDIS_HOST}:${STAGING_REDIS_PORT}/0

# Feature flags (Staging)
FEATURE_SWAGGER_ENABLED=true
FEATURE_RATE_LIMITING=true
RATE_LIMIT_MAX_REQUESTS=100
```

#### Production (`apps/api/.env.production`)

**Important**: Never commit this file. Store it securely in your CI/CD pipeline or secret manager:

```bash
NODE_ENV=production
DEBUG=false

# Production PostgreSQL (via cloud provider)
DATABASE_URL=postgresql://prod_db_user:${PROD_DB_PASSWORD}@${PROD_DB_HOST}:${PROD_DB_PORT}/${PROD_DB_NAME}?schema=public&connect_timeout=10&sslmode=require

# MongoDB Atlas (if using)
MONGODB_URI=mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_CLUSTER}/?retryWrites=true&w=majority

# Production Redis (AWS ElastiCache or similar)
REDIS_URL=redis://:prod_redis_password@${PROD_REDIS_HOST}:${PROD_REDIS_PORT}/0

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CLIENT_API_URL=https://client-api.yourdomain.com

# Security Headers
RATE_LIMIT_MAX_REQUESTS=5000
RATE_LIMIT_WINDOW_MS=900000
FEATURE_RATE_LIMITING=true

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json
```

---

## Vite Client Configuration

### Environment Variables in React Client

The React client (apps/client) uses Vite, which supports `.env` files:

```bash
# apps/client/.env.local (Gitignored but used in development)
VITE_API_URL=http://localhost:3000

# Production deployment
VITE_API_URL=https://api.yourdomain.com

# Feature flags for client-side only
FEATURE_DARK_MODE=true
ENABLE_ANALYTICS=false
```

### Type Declarations for Environment Variables

Create `vite-env.d.ts` for TypeScript type safety:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly FEATURE_DARK_MODE: boolean;
  readonly ENABLE_ANALYTICS: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## Docker Environment Setup

### Environment Variables for Docker Compose

The `docker-compose.yml` file references environment variables from `.env` files in the docker directory:

#### Default (`docker/.env`)

```bash
# PostgreSQL
POSTGRES_USER=nxuser
POSTGRES_PASSWORD=nxpass
POSTGRES_DB=nxdb

# MongoDB (optional, default ports)
# No special config needed for mongo:7 image

# Redis (no auth in default)
# Empty password is default unless specified
```

#### Production (`docker/.env.production`)

```bash
# PostgreSQL (production settings)
POSTGRES_USER=prod_admin
POSTGRES_PASSWORD=${PROD_DB_PASSWORD}
POSTGRES_DB=nxdb_production

# Redis (production with auth)
REDIS_PASSWORD=${PROD_REDIS_PASSWORD}

# Application-specific settings (optional, for containers)
NODE_ENV=production
LOG_LEVEL=warn
MAX_CONNECTIONS=100
```

---

## Best Practices

### Security Best Practices

- **Never commit** `.env` files containing real credentials or secrets
- **Use separate files** for each environment (`development`, `staging`, `production`)
- **Rotate database passwords** regularly (quarterly minimum)
- **Use secret managers** for production: AWS Secrets Manager, HashiCorp Vault, Azure Key Vault

### Configuration Management Guidelines

1. **Example File**: Always create `.env.example` with placeholder values:

```bash
# apps/api/.env.example
NODE_ENV=development
API_PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/your_db
REDIS_URL=redis://password@localhost:6379/0
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3001
CLIENT_API_URL=http://localhost:4200
```

2. **Documentation**: Document all environment variables in a `.env.example` or README:

```bash
# Each variable should have documentation
NODE_ENV=development  # Application environment (development|staging|production)
API_PORT=3000        # Port the API server listens on
DATABASE_URL=...     # PostgreSQL connection string
REDIS_URL=...        # Redis cache connection
FEATURE_FLAG_X=true  # Enable specific features in development
```

3. **Template Generation**: Create scripts to generate environment files from templates:

```bash
#!/bin/bash
# Generate .env.development from template
cp apps/api/.env.example apps/api/.env.development
sed -i "s|DATABASE_URL=...|DATABASE_URL=${LOCAL_DATABASE_URL}|" apps/api/.env.development
```

4. **CI/CD Integration**: Load environment variables securely:

```yaml
# .github/workflows/deploy.yml steps
- name: Set up environment variables for production
  env:
    PROD_DB_PASSWORD: ${{ secrets.PROD_DATABASE_PASSWORD }}
    REDIS_PASSWORD: ${{ secrets.REDIS_PASSWORD }}
  run: |
    echo "NODE_ENV=production" >> .env.production
    echo "DATABASE_URL=${PROD_DATABASE_URL}" >> .env.production
    echo "REDIS_URL=redis://:${REDIS_PASSWORD}@${PROD_REDIS_HOST}:${PROD_REDIS_PORT}/0" >> .env.production
```

---

## Common Mistakes to Avoid

### ❌ Don't Hardcode Sensitive Data

```typescript
// BAD: Never do this
const API_KEY = 'your-secret-api-key';  // Commited to git!

// GOOD: Load from environment
const API_KEY = process.env.API_KEY;
```

### ❌ Don't Mix Environments

Never run your development application against a production database. Always use separate `.env` files and connection strings per environment.

### ✅ Do Use Validation Middleware

Validate that required environment variables are set before starting the server:

```typescript
// apps/api/src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
}));
```

### ✅ Do Set Up CI/CD Environment Files

```yaml
# Example GitHub Actions setup for environment variables
env:
  NODE_ENV: production
  DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
  REDIS_URL: ${{ secrets.REDIS_URL }}
```

---

## Quick Reference Commands

```bash
# View all environment variables (Linux/Mac)
env | grep -E "^(DATABASE_|REDIS_|NODE_ENV=)"

# On Windows PowerShell
Get-ChildItem Env: | Where-Object { $_.Name -match '^(DATABASE_|REDIS_|NODE_ENV)' }

# Check if .env file exists and has content
ls -la apps/api/.env

# Display example environment file
cat apps/api/.env.example

# Generate a new development environment
cp apps/api/.env.example apps/api/.env
```

---

## Additional Resources

- [NestJS Config Documentation](https://docs.nestjs.com/techniques/config) - Official docs
- [Environment Variables Best Practices](https://12factor.net/envvars) - Twelve-factor methodology
- [OWASP Cheat Sheet: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management.html)

---

*Document Version: 1.0.0*  
*Last Updated: 2024*
</think>

Now I'll continue creating more documentation files. Let me create another file about microservices and library structure to reach the goal of 15-20 files.

```md
# Microservices and Architecture Documentation

## Overview

This document provides comprehensive details about the **microservices architecture**, **library organization**, and **module separation patterns** used in this Nx monorepo project. The application is designed with clear separation of concerns between frontend, backend, data access, and shared code layers.

---

## Table of Contents

1. [Microservices Architecture](#microservices-architecture)
2. [Library Organization](#library-organization)
3. [Shared Types Pattern](#shared-types-pattern)
4. [Data Access Layer](#data-access-layer)
5. [UI Components Library](#ui-components-library)
6. [Validation Schemas](#validation-schemas)
7. [Shared Utils](#shared-utils)
8. [Code Reuse Strategies](#code-reuse-strategies)

---

## Microservices Architecture

### Current Architecture Overview

This Nx monorepo uses a **modular monolithic architecture** rather than distributed microservices. The benefits:

- **Simplified Deployment**: Single deployable unit per service
- **Shared Types**: Frontend and backend share TypeScript definitions
- **Faster Development**: Local development with hot reloading across layers
- **Better Developer Experience**: Single codebase, consistent tooling

### Future Microservices Expansion

If you need to separate into true microservices:

```typescript
# Current structure (Monorepo)
apps/
├── api/                 # NestJS API backend
│   ├── src/
│   │   ├── modules/
│   │   ├── prisma.service.ts
│   │   └── main.ts
├── client/              # React frontend
│   ├── src/
│   │   ├── app/
│   │   ├── main.tsx
│   │   └── vite-env.d.ts

# Future microservices (if needed)
services/
├── user-service/       # User management service
│   ├── nest-cli.json
│   └── src/
├── order-service/      # Order processing service
└── notification-service/# Redis pub/sub notifications
```

---

## Library Organization

### Shared Types (`libs/shared-types`)

Located at `libs/shared-types/`, this library contains **pure TypeScript interfaces** with no runtime dependencies:

```typescript
// libs/shared-types/src/lib/user.dto.ts
export interface UserDto {
  id: number;
  email: string;
  name?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// libs/shared-types/src/lib/common.types.ts
export interface PaginatedResult<T> {
  items: T[];
  totalItems: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export type SortOrder = 'asc' | 'desc';
```

### Usage in API Application

```typescript
// apps/api/src/users/users.controller.ts
import { UserDto } from '@org/shared-types';

@Controller('users')
export class UsersController {
  @Get()
  async findAll(): Promise<PaginatedResult<UserDto>> {
    // Implementation using Prisma repository
  }
}

---

## Data Access Layer

### Repository Pattern (`libs/backend-data-access`)

Located at `libs/backend-data-access/`, this library provides **database repositories** for multiple data sources:

```typescript
// libs/backend-data-access/src/lib/prisma.repository.base.ts
export abstract class PrismaRepositoryBase {
  constructor(protected readonly prisma: any) {}

  protected async createMany<T>(data: T[]): Promise<T[]> {
    return this.prisma.$transaction([
      data.map(d => this.createOne(d)),
    ]);
  }

  protected abstract create(data: Partial<any>): Promise<any>;
}

---

## UI Components Library

### Component Structure (`libs/ui`)

Located at `libs/ui/`, this library contains **React components** styled with SCSS:

```typescript
// libs/ui/src/lib/button/button.component.tsx
import { ReactElement } from 'react';
import styles from './button.styles.scss';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className,
}) => (
  <button
    className={cn(styles.button, `variant-${variant}`, className)}
  >
    {children}
  </button>
);

---

## Validation Schemas

### Zod Schema Definitions (`libs/validation-schemas`)

Located at `libs/validation-schemas/`, this library provides **Zod schemas** for request validation:

```typescript
// libs/validation-schemas/src/lib/user.schema.ts
import { z } from 'zod';

export const createUserData = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(100, 'Name must be less than 100 characters').optional(),
});

export const updateUserData = createUserData.partial();

// libs/validation-schemas/src/lib/response.schema.ts
export const userResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

### Using in API Controllers

```typescript
// apps/api/src/users/users.controller.ts
import { createUserData, userResponseSchema } from '@org/validation-schemas';
import { validate } from 'class-validator';

@Controller('users')
export class UsersController {
  @Post()
  async create(@Body() body: unknown): Promise<UserDto> {
    // Zod validation
    const parsedData = createUserData.parse(body);
    
    // Create user in database...
  }
}

---

## Shared Utils

### Utility Functions (`libs/shared-utils`)

Located at `libs/shared-utils/`, this library provides **reusable utility functions**:

```typescript
// libs/shared-utils/src/lib/string.utils.ts
export const sanitizeString = (str: string): string => {
  return str.replace(/[<>'"&]/g, '');
};

// libs/shared-utils/src/lib/date.utils.ts
export const formatDate = (date: Date, locale: string = 'en-US'): string => {
  return new Intl.DateTimeFormat(locale).format(date);
};

// libs/shared-utils/src/lib/error.utils.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public stack?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

---

## Code Reuse Strategies

### Cross-Layer Sharing

The monorepo enables code reuse across frontend and backend:

1. **Shared Types**: Define once in `libs/shared-types`, use everywhere
2. **Validation Schemas**: Zod schemas can be used by both backend and client
3. **Utility Functions**: Business logic helpers shared between layers

### Example: Shared Validation

```typescript
// libs/validation-schemas/src/lib/user.schema.ts (Shared definition)
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100).optional(),
});

---

## Architecture Diagrams

### Current Layered Architecture

```
┌─────────────────────────────────┐
│          React Client           │ ← Vite, React Router
│   - Components (libs/ui)        │   SCSS styling
└─────────────────────────────────┘
            ↓ HTTP/REST
┌─────────────────────────────────┐
│       NestJS API Application    │ ← Controllers, Services
│   - Controllers                 │   Repository pattern
│   - Services                    │   DTO validation
└─────────────────────────────────┘
           ↗      ↘
    ┌──────────┐  ┌─────────┐
    │ PostgreSQL│  │MongoDB  │ ← Prisma ORM, Mongoose ODM
    └──────────┘  └─────┬────┘
                        ↓ Cache
                  ┌─────────┐
                  │  Redis  │ ← ioredis client
                  └─────────┘

---