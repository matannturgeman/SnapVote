# Database Documentation

## Overview

This document provides comprehensive details about the database layer used in this Nx monorepo project. The application leverages **polyglot persistence** with multiple databases serving different purposes:

- **PostgreSQL**: Primary relational database for structured data
- **MongoDB**: Document store for flexible schema requirements
- **Redis**: In-memory cache and real-time features

---

## Table of Contents

1. [PostgreSQL Database](#postgresql-database)
2. [MongoDB Database](#mongodb-database)
3. [Redis Cache Layer](#redis-cache-layer)
4. [ORM/ODM Configuration](#ormodm-configuration)
5. [Database Connection Setup](#database-connection-setup)
6. [Migration Strategy](#migration-strategy)
7. [Connection Pooling](#connection-pooling)
8. [Security Best Practices](#security-best-practices)

---

## PostgreSQL Database

### Purpose and Use Cases

PostgreSQL serves as the **primary relational database** for this application with the following responsibilities:

- User authentication and authorization data
- Core business entity storage
- Transactional operations requiring ACID compliance
- Complex queries with joins and relationships
- Structured data that requires normalization

### Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 15.x (Docker) | Relational database engine |
| Prisma ORM | 7.4.2 | Type-safe database access |
| @prisma/adapter-pg | 7.4.2 | NestJS integration adapter |

### Docker Configuration

The PostgreSQL container is defined in `docker/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:15
    container_name: nx_postgres
    restart: always
    environment:
      POSTGRES_USER: nxuser
      POSTGRES_PASSWORD: nxpass
      POSTGRES_DB: nxdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Connection String

For development and local use, use this connection string format:

```env
DATABASE_URL=postgres://nxuser:nxpass@localhost:5432/nxdb?schema=public
```

The `schema=public` parameter ensures PostgreSQL uses the default public schema.

---

## MongoDB Database

### Purpose and Use Cases

MongoDB is used as a **secondary document store** for scenarios where flexible schemas are beneficial:

- Content management systems with dynamic documents
- Session data storage
- Audit logs and historical records
- Analytics and event data
- Real-time feeds that require dynamic structure

### Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| MongoDB | 7.x (Docker) | NoSQL document database |
| Mongoose | via @nestjs/mongoose | ODM for Node.js applications |

### Docker Configuration

```yaml
services:
  mongo:
    image: mongo:7
    container_name: nx_mongo
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
```

### Connection String

For MongoDB connections, use this format:

```env
MONGODB_URI=mongodb://localhost:27017/nxdb?authSource=admin
```

With username/password authentication:

```env
MONGODB_URI=mongodb://nxuser:nxpass@localhost:27017/nxdb?authSource=admin
```

---

## Redis Cache Layer

### Purpose and Use Cases

Redis provides **in-memory data structures** for high-performance caching:

- Session storage for JWT validation
- Rate limiting middleware
- Real-time notifications via pub/sub
- Caching of frequently accessed data
- Distributed locks and queues

### Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| Redis | 7.x (Docker) | In-memory data structure store |
| ioredis | 5.10.0 | Node.js client library |
| @nestjs-labs/nestjs-ioredis | 11.0.4 | NestJS integration |

### Docker Configuration

```yaml
services:
  redis:
    image: redis:7
    container_name: nx_redis
    restart: always
    ports:
      - "6379:6379"
```

### Connection String

Redis typically uses this connection format (password-protected):

```env
REDIS_URL=redis://:nxpass@localhost:6379
```

Without authentication (development only):

```env
REDIS_URL=redis://localhost:6379
```

---

## ORM/ODM Configuration

### Prisma ORM for PostgreSQL

Prisma provides type-safe database access with the following configuration:

#### Schema Location

Located at `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
```

#### Prisma Client Setup

The Prisma client is initialized via `prisma.config.ts`:

```typescript
import { defineConfig } from 'tsconfig-paths';

export default defineConfig({
  compilerOptions: {
    paths: {
      '@prisma/client': ['prisma/client/#client'],
    },
  },
});
```

#### Using Prisma in NestJS

```typescript
import { PrismaClient } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
}
```

#### Database Migrations

Generate and run migrations with these commands:

```bash
# Apply migrations to database
npx prisma migrate deploy

# Create new migration for schema changes
npx prisma migrate dev --name <migration_name>

# Generate Prisma Client types
npx prisma generate
```

---

### Mongoose ODM for MongoDB

Mongoose provides schema validation and query building for MongoDB:

#### Setting up NestJS-Mongoose

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Post',
        useFactory: () => ({
          schema: new Schema(
            { title: String, content: String },
            { collection: 'posts' },
          ),
        }),
      },
    ]),
  ],
})
export class PostsModule {}
```

#### Schema Definition

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  author?: Types.ObjectId;
  tags?: string[];
  views: number;
  publishedAt?: Date;
}

const PostSchema = SchemaFactory.createForClass(IPost);

export const PostsModel = new Model<IPost>(PostSchema);
```

---

### ioredis for Redis

Redis integration using ioredis with NestJS:

#### Connecting to Redis

```typescript
import { Module } from '@nestjs/common';
import { RedisService, IoredisModule } from '@nestjs-labs/nestjs-ioredis';

@Module({
  imports: [IoredisModule.forRoot()],
  providers: [RedisService],
})
export class CacheModule {}
```

#### Using Redis in Controllers

```typescript
@Cacheable('users', { keyBuilder: 'user:{userId}' })
@Get(':id')
async findOne(@Param('id') id: number): Promise<User> {
  return await this.usersRepository.findById(id);
}
```

---

## Database Connection Setup

### Environment Variables

Create `.env` files in appropriate project directories (not tracked in git). Required environment variables include:

#### For API Service (`apps/api/.env`)

```env
# PostgreSQL
DATABASE_URL=postgresql://nxuser:nxpass@localhost:5432/nxdb?schema=public
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nxdb
DB_USER=nxuser
DB_PASSWORD=nxpass

# MongoDB (optional, comment out if not using)
MONGODB_URI=mongodb://nxuser:nxpass@localhost:27017/nxdb?authSource=admin
MONGODB_HOST=localhost
MONGODB_PORT=27017

# Redis
REDIS_URL=redis://nxpass@localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=nxpass
```

### Connection Pooling Configuration

#### PostgreSQL Pool Settings

PostgreSQL connection pooling is configured in Prisma via `datasource.db`:

```typescript
prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
  log: env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});
```

#### MongoDB Connection Options

```typescript
MongooseModule.forRoot(process.env.MONGODB_URI!, {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
});
```

#### Redis Client Configuration

```typescript
IoredisModule.forRoot({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT?.parseInt() ?? 6379,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
});
```

---

## Migration Strategy

### PostgreSQL Migrations (Prisma)

For PostgreSQL migrations using Prisma:

```bash
# Create migration
npx prisma migrate dev --name create_users_table

# Run migrations
npx prisma migrate deploy

# Rollback last migration
npx prisma migrate resolve --finished <migration_name>

# Reset database (development only)
npx prisma studio
```

### MongoDB Indexes and Collections

MongoDB uses auto-created collections with schema-less design:

```typescript
// Create indexes on model
@Index()
static async createIndexes(): Promise<void> {
  await Post.createIndex({ title: 1 });
}
```

---

## Connection Pooling

### Monitoring Connections

Monitor active database connections:

```typescript
// PostgreSQL connection stats
await prisma.$queryRawUnsafe('SELECT count(*) FROM pg_stat_activity;');

// MongoDB server status
await mongoose.connection.db.admin().serverStatus();

// Redis info
const info = await redis.info();
console.log(info);
```

### Connection Limits

Configure connection limits per environment:

- **Development**: No strict limits, allow pooling
- **Staging**: Limit to 20 concurrent connections
- **Production**: Limit to 100 concurrent connections per DB instance

---

## Security Best Practices

### Environment Variables

Never commit `.env` files. Use a `.gitignore` pattern:

```
# Environment variables
.env
.env.*
!node_modules
```

### Password Management

Store database credentials securely:

- Use separate environment variable files for different environments
- Rotate passwords regularly
- Use strong passwords (minimum 16 characters)
- Implement secret management in CI/CD pipelines

### Database Access Controls

Configure PostgreSQL authentication:

```conf
# postgresql.conf
listen_addresses = 'localhost'
password_encryption = 'scram-sha-256'
hba_file = 'pg_hba.conf'
max_connections = 100
shared_buffers = 128MB
```

---

*Document Version: 1.0.0*  
*Last Updated: 2024*