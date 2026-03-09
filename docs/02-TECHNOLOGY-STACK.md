# Technology Stack Documentation

## Overview

This document provides a comprehensive breakdown of all technologies used in this Nx monorepo project across frontend, backend, database, and development tooling layers. The project leverages a modern, production-ready tech stack with careful selection of tools for scalability, developer experience, and maintainability.

---

## Table of Contents

1. [Frontend Technologies](#frontend-technologies)
2. [Backend Technologies](#backend-technologies)
3. [Database Technologies](#database-technologies)
4. [Development Tools & Linting](#development-tools--linting)
5. [Testing Frameworks](#testing-frameworks)
6. [Package Management](#package-management)
7. [Version Control & Configuration](#version-control--configuration)

---

## Frontend Technologies

### React Framework

**React 19.0.0** - The UI framework for the client application
  
- **Purpose**: Building reactive user interfaces with component-based architecture
- **Features used**: 
  - Functional components with hooks
  - React Router for navigation and routing
  - Context API for state management (implied)
- **Version**: 19.0.0 (latest stable)
- **Build Tool**: Vite (see below)

### Styling Solutions

**SCSS** (Sassy CSS)

- **Purpose**: CSS preprocessor with advanced features
- **Sass Version**: 1.55.0
- **Features used**:
  - Variables and mixins
  - Nesting and inheritance
  - Math operations
- **Integration**: Webpack/Vite plugin for SCSS compilation

### State Management (Implied Dependencies)

Based on the tech stack, potential state management solutions include:

- **React Context API** (built-in)
- **Redux Toolkit** (if used with @reduxjs/toolkit in libs/ui)
- **Zustand/Jotai** (lightweight alternatives if present)

---

## Backend Technologies

### NestJS Framework

**NestJS 11.0.0** - Progressive Node.js framework

- **Purpose**: Building scalable, maintainable backend APIs
- **Architecture Pattern**: Dependency injection with modules/pipes/filters
- **Key Features**:
  - TypeScript-first architecture
  - Decorator-based design patterns
  - Built-in support for validation, guards, interceptors
  - Swagger/OpenAPI documentation integration

### NestJS Modules & Integrations

| Package | Version | Purpose |
|---------|---------|---------|
| @nestjs/common | 11.0.0 | Core decorators and utilities |
| @nestjs/core | 11.0.0 | Application core functionality |
| @nestjs/config | 4.0.3 | Environment configuration management |
| @nestjs/platform-express | 11.0.0 | Express-based HTTP platform |
| @nestjs/swagger | 11.2.6 | API documentation generation |
| @nestjs/mongoose | 11.0.4 | MongoDB integration |
| @nestjs/typeorm | 11.0.0 | TypeORM/SQL database integration |
| @nestjs-labs/nestjs-ioredis | 11.0.4 | Redis caching and pub/sub |

### HTTP Client & Communication

**Axios 1.6.0** - HTTP client for API calls
  
- **Purpose**: Making HTTP requests from the backend
- **Features**: Interceptors, request/response transformers, timeouts
- **Use Cases**: External API integrations, microservice communication

---

## Database Technologies

### Primary: PostgreSQL with Prisma ORM

#### PostgreSQL Database

- **Role**: Primary relational database for structured data storage
- **Docker Image**: `postgres:15` (PostgreSQL 15)
- **Connection via**: Prisma ORM and @prisma/adapter-pg
- **Port**: 5432
- **Credentials** (from docker-compose):
  - User: nxuser
  - Password: nxpass
  - Database: nxdb

#### Prisma ORM

- **Version**: 7.4.2
- **Purpose**: Type-safe database query builder and migration tool
- **Adapter**: @prisma/adapter-pg for NestJS integration
- **Key Features**:
  - Auto-generated TypeScript types from schema
  - Database migrations via prisma migrate
  - Prisma Client as lightweight data proxy
  - SQL optimization with caching

**Prisma Schema Overview:**

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
```

#### TypeORM (Alternative/Complementary)

- **Version**: 0.3.28
- **Purpose**: Additional ORM support for PostgreSQL operations
- **Use Case**: Complex queries requiring raw SQL or specific ORM features

---

### Secondary: MongoDB with Mongoose ODM

#### MongoDB Database

- **Docker Image**: `mongo:7` (MongoDB version 7)
- **Port**: 27017
- **Connection via**: Mongoose ODM
- **Use Cases**: Flexible document storage, caching layers, real-time features

#### Mongoose ODM

- **Package**: @nestjs/mongoose (integration)
- **Purpose**: MongoDB Object Data Modeling for Node.js applications
- **Key Features**:
  - Schema definition and validation
  - Middleware hooks for business logic
  - Static methods and instance methods

---

### Caching: Redis

#### Redis In-Memory Store

- **Docker Image**: `redis:7` (Redis version 7)
- **Port**: 6379
- **Connection via**: ioredis client library
- **Purpose**: 
  - Session management
  - Rate limiting
  - Real-time notifications/pub/sub
  - Caching of frequently accessed data

#### ioredis Client

- **Version**: 5.10.0
- **Purpose**: High-performance Redis client for Node.js
- **Features**: Promises, async/await support, connection pooling

---

## Development Tools & Linting

### TypeScript Configuration

**TypeScript 5.9.2** - The language of the project

- **Base Config**: tsconfig.base.json with shared compiler options
- **Projects**: 
  - apps/api/tsconfig.app.json (production build)
  - apps/api/tsconfig.spec.json (testing)
  - apps/client/tsconfig.app.json (React frontend)
  - libs/*/tsconfig.json (shared libraries)

### ESLint Code Quality

**ESLint 9.8.0** with TypeScript parser and rules

- **Configuration**: eslint.config.mjs (flat config format v9)
- **Plugins**:
  - @eslint/js - JavaScript language features
  - eslint-plugin-import - Import statement handling
  - eslint-plugin-react - React-specific rules
  - eslint-plugin-react-hooks - React hooks validation
  - eslint-plugin-jsdoc - JSDoc comment checking
  - eslint-plugin-playwright - Playwright E2E test rules

### Prettier Code Formatting

**Prettier 3.6.2** - Opinionated code formatter

- **Configuration**: .prettierrc / package.json prettier options
- **Integration**: Works seamlessly with ESLint via eslint-config-prettier
- **Features**: Auto-formatting on save, consistent spacing/indentation

### Linting Tools

| Tool | Purpose | Version |
|------|---------|---------|
| ESLint | Static code analysis | 9.8.0 |
| Prettier | Code formatting | 3.6.2 |
| eslint-config-prettier | Disable conflicting rules | 10.0.0 |

---

## Testing Frameworks

### Unit Testing: Jest & Vitest

#### Jest Test Runner

- **Version**: 30.0.2
- **Purpose**: Primary unit testing framework for libraries and utilities
- **Configuration**: 
  - jest.config.ts (root)
  - apps/api/jest.config.cts
  - apps/client/jest.config.cts
- **Features**: Mocking, snapshot testing, code coverage

#### Vitest

- **Version**: 4.0.0
- **Purpose**: Alternative test runner with Vite integration
- **Configuration**: vitest configuration in vite config
- **Use Case**: Frontend-specific tests leveraging Vite's fast execution

### Testing Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| @testing-library/react | 16.3.0 | React component testing |
| @testing-library/dom | 10.4.0 | DOM utilities for RTL |
| ts-jest | 29.4.0 | TypeScript support for Jest |
| jest-environment-jsdom | 30.0.2 | Browser-like environment |
| babel-jest | 30.0.2 | Babel transformation for JS files |

### E2E Testing: Playwright

- **Version**: @playwright/test 1.36.0
- **Purpose**: Cross-browser end-to-end testing
- **Integration**: nx-playwright plugin
- **Test Targets**: client-e2e project

---

## Package Management

### pnpm Monorepo Manager

**pnpm** - Primary package manager for dependency resolution

- **Configuration**: pnpm-workspace.yaml
- **Lock File**: pnpm-lock.yaml (commit-safe)
- **Advantages**:
  - Hard links for faster installs
  - Single node_modules at root
  - Better deduplication
  - Deterministic builds

### NPM Script Management

**NestJS + Nx Scripts** in package.json

```json
{
  "scripts": {
    "dev:api": "nx serve api",
    "build:api": "nx build api",
    "dev:client": "nx serve client",
    "build:client": "nx build client",
    "test": "nx run-many -t test"
  }
}
```

### Workspace Configuration

**pnpm-workspace.yaml**:

```yaml
packages:
  - 'packages/*'
```

This configures pnpm to recognize and link packages in the packages directory.

---

## Version Control & Configuration

### TypeScript Project References

Nx automatically maintains TypeScript project references between projects:

- Ensures type safety across imports
- Updated when running build/typecheck targets
- Command: `npx nx sync` to manually update

### SWC Fast Compilation

**SWC** - Optimizing compiler for faster builds

- **Version**: @swc/core 1.15.8, @swc-node/register 1.11.1
- **Purpose**: Sub-second TypeScript/JS compilation
- **Use Case**: Development server hot reloading, fast builds

### Babel Transpilation (Legacy Support)

**Babel 7.14.5** - Legacy JavaScript transpilation

- **Preset**: @babel/preset-react 7.14.5
- **Purpose**: ES5 support or legacy browser targeting
- **Integration**: Works with webpack build process

---

## Build System & Bundling

### Webpack Production Builds

**Webpack** - Module bundler for production builds

- **Version**: webpack-cli 5.1.4
- **Used For**: API and client production builds
- **Build Command**: `webpack --mode production`
- **Output**: dist/ directory structure

### Vite Development Server

**Vite** - Next-generation frontend build tool

- **Version**: 7.0.0
- **Purpose**: Fast HMR dev server for React client
- **Dev Server**: Port 4200 on localhost (configurable)
- **Build Output**: dist/client/

---

## Summary Matrix

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| UI Framework | React | 19.0.0 | Component-based interfaces |
| Build Tool | Vite | 7.0.0 | Fast dev server & builds |
| Styling | SCSS | 1.55.0 | CSS preprocessor |
| Backend Framework | NestJS | 11.0.0 | Server-side application logic |
| HTTP Client | Axios | 1.6.0 | API requests and communication |
| Relational DB | PostgreSQL | 15.x | Structured data persistence |
| ORM | Prisma | 7.4.2 | Type-safe database queries |
| Document DB | MongoDB | 7.x | Flexible document storage |
| Cache | Redis | 7.x | In-memory caching and pub/sub |
| Node Framework | NestJS (Mongoose) | 11.0.4 | MongoDB integration |
| Test Runner (Unit) | Jest/Vitest | 30.0.2/4.0.0 | Unit testing |
| Test Runner (E2E) | Playwright | 1.36.0 | End-to-end testing |
| Linting | ESLint | 9.8.0 | Code quality checking |
| Formatting | Prettier | 3.6.2 | Code formatting |
| Package Manager | pnpm | - | Dependency management |

---

## Upgrade Path Notes

### Recommended Approach

1. **Major Versions**: Wait for LTS releases and test thoroughly
2. **Minor Versions**: Backport fixes as needed
3. **Patch Versions**: Apply selectively for security fixes

### Version Compatibility Matrix

| Layer | Minimum Supported | Current | Target |
|-------|-------------------|---------|--------|
| Node.js | 18.x | 20.x (Docker) | LTS releases |
| React | 18.x+ | 19.0.0 | Latest LTS |
| NestJS | 9.x+ | 11.0.0 | Latest stable |
| PostgreSQL | 13.x+ | 15.x | 16+ recommended |

---

## Security Considerations

- **Environment Variables**: Never commit .env files (use gitignore)
- **Dependencies**: Regular audits with pnpm audit
- **TypeScript**: Strict mode enabled for type safety
- **HTTP Headers**: Configured through NestJS helmet/security plugins (if used)
- **Database Credentials**: Stored in environment variables, not hardcoded

---

*Document Version: 1.0.0*  
*Last Updated: 2024*