# Project Architecture Documentation

## Overview

This document provides a comprehensive overview of the **high-level architecture**, **microservices structure**, **data flow patterns**, and **architectural design decisions** made for this Nx monorepo project. The architecture is designed to be scalable, maintainable, and extensible while leveraging modern frontend and backend technologies.

---

## Table of Contents

1. [Architecture Summary](#architecture-summary)
2. [Project Structure](#project-structure)
3. [Layered Architecture](#layered-architecture)
4. [Data Flow Patterns](#data-flow-patterns)
5. [Technology Stack per Layer](#technology-stack-per-layer)
6. [API Design & Contracts](#api-design--contracts)
7. [Database Architecture](#database-architecture)
8. [Caching Strategy](#caching-strategy)
9. [Error Handling & Resilience](#error-handling--resilience)
10. [Security Architecture](#security-architecture)

---

## Architecture Summary

### High-Level View

The project follows a **layered monolithic architecture** with shared libraries pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                      CDN / Static Assets                      │
├─────────────────────────────────────────────────────────────┤
│                    React Client (Vite)                        │
│              SPA Framework with Router                        │
└─────────────────────────────────────────────────────────────┘
                          │ REST/GraphQL
┌─────────────────────────────────────────────────────────────┐
│                   NestJS API Server                            │
│           Node.js Backend with Modules                         │
│   ┌──────────────────┬──────────────────┬──────────────────┐ │
│   │ PostgreSQL Store │ MongoDB Storage  │ Redis Cache       │ │
│   └──────────────────┴──────────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Philosophy

- **Monorepo Benefits**: Shared dependencies, code reuse, and type safety across frontend and backend
- **Layered Separation**: Clear boundaries between presentation, domain logic, data access, and infrastructure
- **Multiple Database Pattern**: Polyglot persistence with each database serving its optimal use case
- **Type Safety Throughout**: End-to-end TypeScript with project references for type propagation

---

## Project Structure

### Nx Workspace Layout

The project uses Nx as a monorepo manager to organize applications and libraries:

```
nx-project/
├── apps/                        # Applications (buildable units)
│   ├── api/                     # NestJS backend API application
│   │   ├── src/                # Application source code
│   │   ├── project.json        # Nx project configuration
│   │   └── tsconfig.app.json   # Production TypeScript config
│   ├── client/                  # React frontend application
│   │   ├── src/                # Client source code
│   │   ├── vite.config.mts    # Vite bundler configuration
│   │   └── project.json        # Nx project configuration
│   └── *-e2e/                   # End-to-end test applications
│
├── libs/                        # Shared libraries (type-safe boundaries)
│   ├── backend-data-access/    # Database logic and repositories
│   ├── shared-types/           # Common TypeScript interfaces/types
│   ├── shared-utils/           # Utility functions and helpers
│   ├── ui/                     # Reusable React components
│   └── validation-schemas/     # Zod schemas for validation
│
├── packages/                    # npm packages (future expansion)
│
├── prisma/                      # Prisma ORM configuration
│   └── schema.prisma           # Database model definitions
│
└── docker/                      # Container deployment configurations
    └── docker-compose.yml      # Multi-service orchestration
```

### Application Types

| Project | Type | Description | Build Target | Serve Target |
|---------|------|-------------|--------------|--------------|
| `api` | Application (Node.js) | NestJS REST API | `nx build api` | `nx serve api` |
| `client` | Application (React) | Vite-based SPA | `nx build client` | `nx serve client` |
| `*-e2e` | Application | Playwright E2E tests | - | - |

### Library Types

| Library | Type | Description | Publishable |
|---------|------|-------------|-------------|
| `backend-data-access` | npm library | Backend data logic | ✅ Yes |
| `shared-types` | npm library | Common TypeScript types | ✅ Yes |
| `shared-utils` | npm library | Utility functions | ❌ No (private) |
| `ui` | npm library | React components | ✅ Yes |
| `validation-schemas` | npm library | Zod validation schemas | ✅ Yes |

---

## Layered Architecture

### Presentation Layer (Client)

Located in `apps/client/`, the React frontend serves as the **presentation layer**:

- **Responsibilities**: User interface, routing, state management for UI
- **Framework**: React 19 with functional components and hooks
- **Routing**: React Router v6.30.3 for client-side navigation
- **Styling**: SCSS with modular organization
- **Communication**: Fetch/Axios to consume REST APIs

### Domain Layer (Shared Libraries)

Located in `libs/`, this layer contains **business logic** independent of infrastructure:

- **shared-types/**: Pure TypeScript interfaces, no runtime dependencies
- **validation-schemas/**: Zod schemas for request/response validation
- **shared-utils/**: Business logic utilities and helper functions
- **ui/**: Reusable React components that can be consumed by any application

### Application Layer (API)

Located in `apps/api/`, the NestJS backend serves as the **application layer**:

- **Responsibilities**: Business rules, request handling, orchestration
- **Framework**: NestJS with modules, controllers, services, providers
- **Data Access**: Controllers → Services → Repositories/Repositories pattern
- **Integration Points**: External APIs, message queues, third-party services

### Infrastructure Layer (Data & Configuration)

Located in `prisma/`, `docker/`, and various library files:

- **PostgreSQL**: Primary relational database via Prisma ORM
- **MongoDB**: Document store for flexible schemas via Mongoose
- **Redis**: In-memory cache, pub/sub for real-time features
- **Configuration**: Environment variables, type-safe config with @nestjs/config

---

## Data Flow Patterns

### Request Flow Diagram

```mermaid
graph LR
    A[Browser Client] -->|HTTPS| B[Vite Dev Server / Production]
    B --> C[React Router]
    C --> D[UI Components]
    D -->|State Updates| E[Context/Store]
    E --> F[Axios Interceptors]
    F --> G[API Gateway/NestJS Controller]
    G --> H[Service Layer]
    H --> I{Validation}
    I -->|Pass| J[Biz Logic]
    I -->|Fail| K[400 Error Response]
    J --> L[Repository/Model]
    L --> M[(PostgreSQL/Mongo)]
    N[Redis Cache] -.->|Cache Hit| H
    H --> O[Response DTO]
    O --> P[JSON Web Tokens/Auth]
    P --> Q[Back to UI]
```

### Frontend-Backend Communication

1. **Browser Request**: User interacts with React component
2. **React Router**: Handles navigation and route matching
3. **Component State**: Local or global state updates trigger re-renders
4. **API Call**: Axios interceptors log requests, handle errors
5. **Authentication**: JWT tokens added to Authorization header
6. **NestJS Controller**: Receives request, validates input
7. **Business Logic**: Services process data according to domain rules
8. **Data Persistence**: Repositories communicate with databases via Prisma/Mongoose
9. **Response**: Data serialized back to client with status codes

### State Management Patterns

The project likely uses a combination of patterns:

- **React Context API**: Global state (user, theme) for server-rendered React apps
- **Component Props/Local State**: Component-level state managed via useState/useReducer
- **Potential Redux Toolkit**: For complex state if added in libs/ui
- **Zustand/Jotai**: Lightweight alternatives if needed

### Server-Side Rendering (SSR) Considerations

While Vite supports SSR out of the box, the current setup targets:
- **Client-Side Rendering (CSR)**: Default SPA mode with React Router
- **Future SSR Option**: Could migrate to Next.js or Remix if server-rendering becomes a requirement

---

## Technology Stack per Layer

### Client Layer Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| UI Framework | React 19.0.0 | Component-based architecture |
| Build Tool | Vite 7.0.0 | Fast HMR, optimized builds |
| Styling | SCSS 1.55.0 | CSS preprocessor with variables/nesting |
| Routing | React Router v6.30.3 | Client-side navigation and URL history |
| HTTP Client | Axios 1.6.0 (future) | API requests from frontend |
| Type Safety | TypeScript 5.9.2 | Type-safe development |

### API Layer Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | NestJS 11.0.0 | Server-side application logic |
| ORM/ODM | Prisma 7.4.2 | PostgreSQL data access |
| Mongoose | @nestjs/mongoose | MongoDB integration |
| HTTP Platform | @nestjs/platform-express | Express-based server |
| API Docs | @nestjs/swagger | OpenAPI/Swagger documentation |
| Config | @nestjs/config | Environment configuration management |
| Validation | class-validator 0.15.1 | DTO validation decorators |
| Transform | class-transformer 0.5.1 | JSON → Class transformations |

### Data Layer Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Relational DB | PostgreSQL 15 | Primary structured storage |
| Document Store | MongoDB 7 | Flexible document storage |
| Cache | Redis 7 | In-memory caching, pub/sub |
| ORM Client | Prisma Client | Type-safe database queries |
| Adapter | @prisma/adapter-pg | NestJS integration with PostgreSQL |

---

## API Design & Contracts

### RESTful Patterns

The API follows standard REST principles:

- **Resource URLs**: `/users`, `/posts`, `/comments` (noun-based)
- **HTTP Methods**: GET/POST/PUT/PATCH/DELETE mapped to CRUD operations
- **Status Codes**: Proper use of 200, 201, 400, 401, 404, 500 codes
- **Content-Type**: `application/json` for all payloads

### API Documentation (Swagger/OpenAPI)

Generated automatically by @nestjs/swagger:

```yaml
# /swagger.json endpoint provides:
/openapi.yaml  # OpenAPI specification
/api-docs      # Swagger UI in browser
```

### Request/Response Patterns

**Request Pattern:**
```typescript
// GET /users/:id
// Headers: Authorization: Bearer <jwt_token>
// Returns: UserDTO (type-safe from Prisma)
// Status: 200 OK

// POST /users
// Body: CreateUserDto (validated with class-validator)
// Returns: CreatedUserResponse { data, message }
// Status: 201 Created
```

**Response Pattern:**
```typescript
interface ApiResponse<T> {
  status: number;
  timestamp: string;
  data: T | null;
  message?: string;
}
```

---

## Database Architecture

### Multi-Database Strategy

The project uses **polyglot persistence** with each database serving its optimal use case:

#### PostgreSQL (Relational)

**Purpose**: Primary structured data storage

- **Use Cases**: 
  - User accounts and authentication
  - Transactions requiring ACID compliance
  - Relationships between entities (one-to-many, many-to-many)
  - Complex queries with joins

- **Connection String**: Managed via docker-compose:
  ```env
  DATABASE_URL=postgres://nxuser:nxpass@localhost:5432/nxdb
  ```

- **Prisma Schema**: See `prisma/schema.prisma`
- **Migrations**: Generated with `npx prisma migrate dev --name <migration_name>`

#### MongoDB (Document)

**Purpose**: Flexible document storage

- **Use Cases**:
  - Content management systems
  - Session data
  - Logs and audit trails
  - Real-time analytics data

- **Connection**: Handled via Mongoose ODM with @nestjs/mongoose
- **Schema Flexibility**: Dynamic fields, nested documents

#### Redis (In-Memory)

**Purpose**: High-performance caching and real-time features

- **Use Cases**:
  - Session storage (JWT validation)
  - Rate limiting middleware
  - Real-time notifications via pub/sub
  - Cache frequently accessed data

---

## Caching Strategy

### Redis Integration Pattern

```mermaid
sequenceDiagram
    participant Client as React Client
    participant API as NestJS API
    participant DB as PostgreSQL/MongoDB
    participant Redis as Cache Layer
    
    Client->>API: GET /posts/{id}
    
    alt Cache Hit
        API->>Redis: GET post:{postId}
        Redis-->>API: 200 OK <data>
        API-->>Client: 200 OK <cached data>
    else Cache Miss
        API->>DB: SELECT * FROM posts WHERE id = ?
        DB-->>API: {data}
        API->>Redis: SET post:{postId} <TTL=300s>
        Redis-->>API: OK
        API-->>Client: 200 OK <fresh data>
    end
    
    Client->>API: POST /posts (Create)
    API->>DB: INSERT INTO posts
    DB-->>API: NewId
    API->>Redis: DELETE cache/* (invalidate stale)
```

### Cache Invalidation Rules

- **Write-through**: Create/Update/Delete triggers cache invalidation
- **TTL-based**: Cache entries expire after defined time period
- **Pattern matching**: Wildcard keys like `post:*` for bulk deletion

---

## Error Handling & Resilience

### Global Exception Filters (NestJS)

```typescript
// Example global exception handler
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception:unknown, host:ExceptionArgumentsHost) {
    console.error(`Unhandled exception: ${exception}`);
    
    const response = host.switchToHttp();
    const ctx = response.getRequestByType(ExecutionContext);
    
    if (exception instanceof BadRequestException) {
      return this.httpAdapter.getInstance().getStatus(400, 'Bad request');
    }
  }
}
```

### Error Response Format

All errors follow a consistent format:
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": "InternalServerError"
}
```

### Resilience Patterns

- **Retry Logic**: Exponential backoff for transient failures
- **Circuit Breaker**: Prevent cascading failures to downstream services
- **Timeouts**: Request timeouts configured per endpoint importance

---

## Security Architecture

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Client as React Client
    participant API as NestJS API
    participant Redis as Auth Store
    
    Client->>API: Login with credentials
    API->>DB: Verify user credentials
    DB-->>API: User found + hashed password match
    API->>Redis: Generate JWT, store session ID
    API-->>Client: { token, refreshToken }
    
    Client->>Protected Endpoint: Header: Bearer <token>
    API->>Redis: Validate token + check expiration
    Redis-->>API: Token valid
    API-->>Client: 200 OK + data
    
    Note right of API: Uses @nestjs-labs/nestjs-ioredis
```

### Security Best Practices Implemented

1. **HTTPS Only**: All client-server communication uses TLS
2. **JWT Tokens**: Stateless authentication with configurable expiration
3. **Rate Limiting**: Middleware to prevent brute force attacks
4. **Input Validation**: Zod schemas + class-validator prevent injection attacks
5. **SQL Injection Prevention**: Prisma parameterized queries

### Git Security (Environment Variables)

- `.env` files are listed in `.gitignore`
- Example template: `apps/api/.env.example`
- Secrets managed via CI/CD environment variables or vault services

---

## Future Considerations

### Scalability Enhancements

1. **Horizontal Scaling**: Add more API instances behind load balancer
2. **Database Read Replicas**: Offload read queries to replicas
3. **Message Queue**: Integrate RabbitMQ/Kafka for async task processing
4. **Service Mesh**: Add Istio or similar for traffic management

### Technology Upgrades

- Monitor current versions against LTS releases
- Plan quarterly dependency audit cycles
- Evaluate TypeScript 6 features when stable

---

*Document Version: 1.0.0*  
*Last Updated: 2024*
