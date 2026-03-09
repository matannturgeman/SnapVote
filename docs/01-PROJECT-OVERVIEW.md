# Project Overview: Nx Workspace Monorepo Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Key Concepts](#key-concepts)
4. [Getting Started](#getting-started)
5. [Quick Links](#quick-links)

---

## Introduction

This document provides a comprehensive overview of the **Nx Workspace Monorepo** project structure, technology stack, and architectural decisions. This workspace represents a modern full-stack development environment leveraging the power of **Nx** as a build system and monorepo manager.

### What is Nx?

[Nx](https://nx.dev) is a powerful build system and monorepo tool that helps you:
- Scale your frontend and backend applications
- Share code between applications
- Speed up development with intelligent caching
- Distribute builds across multiple machines in CI/CD

### Project Type

This workspace is configured as a **full-stack application** with:
- **Frontend**: React applications using Vite for fast builds and dev server
- **Backend**: NestJS microservices architecture
- **Database Layer**: Multi-database support (PostgreSQL, MongoDB, Redis)
- **Package Manager**: pnpm for efficient dependency management

---

## Project Structure

```
nx-project/
├── apps/                      # Main applications
│   ├── api/                   # NestJS backend API
│   ├── client/               # React frontend application
│   └── *-e2e/                # E2E test applications
├── libs/                      # Shared libraries
│   ├── backend-data-access/  # Data access layer logic
│   ├── shared-types/         # TypeScript type definitions
│   ├── shared-utils/         # Utility functions
│   ├── ui/                   # React UI components
│   └── validation-schemas/   # Zod validation schemas
├── packages/                  # Shared npm packages (currently empty)
├── prisma/                    # Prisma ORM configuration
│   └── schema.prisma          # Database schema
├── docker/                    # Docker deployment configurations
│   └── docker-compose.yml     # Multi-service orchestration
├── dist/                      # Build output directory
├── docs/                      # This documentation folder
├── nx.json                    # Nx workspace configuration
├── package.json              # Root package.json with scripts
├── pnpm-workspace.yaml       # pnpm monorepo configuration
└── tsconfig.base.json        # Base TypeScript configuration
```

### Directory Breakdown

| Directory | Description |
|-----------|-------------|
| `apps/` | Contains the main applications (API, Client) and their E2E tests |
| `libs/` | Shared libraries that can be imported across projects |
| `packages/` | Packages that will be published to npm |
| `prisma/` | Prisma ORM schema and migrations |
| `docker/` | Containerization configuration for deployment |
| `dist/` | Compiled build artifacts (gitignored) |

---

## Key Concepts

### Monorepo Benefits

This workspace leverages the monorepo pattern to provide:

- **Shared Dependencies**: All packages share a single dependency resolution
- **Type Safety**: TypeScript project references ensure type safety across boundaries
- **Code Sharing**: Libraries can be reused between frontend and backend
- **Faster Iteration**: Changes in shared code only rebuild affected projects
- **Consistent Tooling**: Single configuration for linting, testing, and formatting

### Nx Plugins Installed

The workspace includes these official Nx plugins:

| Plugin | Purpose |
|--------|---------|
| `@nx/js` | JavaScript/TypeScript utilities |
| `@nx/webpack` | Webpack-based build system |
| `@nx/eslint` | ESLint integration |
| `@nx/jest` | Jest test runner configuration |
| `@nx/vite` | Vite bundler and dev server |
| `@nx/playwright` | End-to-end testing with Playwright |
| `@nx/nest` | NestJS-specific targets and utilities |
| `@nx/react` | React application generator |
| `@nx/node` | Node.js utilities |

### Database Technologies

The project supports multiple database types through different ORMs/ODMs:

- **PostgreSQL**: Primary relational database (via Prisma ORM)
- **MongoDB**: NoSQL document store (via Mongoose ODM)
- **Redis**: In-memory data structure store for caching and real-time features

| Database | ORM/ODM | Use Case |
|----------|---------|----------|
| PostgreSQL | Prisma | Relational data, primary storage |
| MongoDB | Mongoose | Document storage, flexible schema |
| Redis | ioredis | Caching, sessions, pub/sub |

---

## Getting Started

### Prerequisites

Before working on this project, ensure you have:

- [Node.js](https://nodejs.org/) (v18+) 
- [pnpm](https://pnpm.io/) package manager
- A modern code editor (VS Code recommended with Nx Console extension)

### Initial Setup

```bash
# Navigate to the project directory
cd nx-project

# Install dependencies
pnpm install

# Run development servers
pnpm dev:api    # Start NestJS backend API
pnpm dev:client # Start React frontend client
```

### Development Workflow

1. **Start Backend API**: `pnpm dev:api`
2. **Start Frontend Client**: `pnpm dev:client`
3. **Hot Reload**: Both applications support hot module replacement
4. **Lint on Save**: Configure your editor to run ESLint

### Running Tests

```bash
# Run all unit tests
pnpm test

# Run tests for specific project
npx nx test client
npx nx test api

# Run e2e tests
npx nx e2e client-e2e
```

---

## Quick Links

### Official Documentation

- [Nx Documentation](https://nx.dev)
- [NestJS Documentation](https://docs.nestjs.com)
- [React Documentation](https://react.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vite Documentation](https://vitejs.dev)

### Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:api` | Start API in development mode |
| `pnpm build:api` | Build API for production |
| `pnpm dev:client` | Start client in development mode |
| `pnpm build:client` | Build client for production |
| `npx nx graph` | Visualize project dependencies |
| `npx nx show projects` | List all projects |

### Useful Nx Commands

```bash
# Generate a new component
npx nx g @nx/react:component components/UserProfile

# Generate a new library
npx nx g @nx/react:lib shared-ui-lib --publishable

# Run a specific target
npx nx build api
npx nx serve client
npx nx lint projects
```

### Environment Variables

The project uses environment files (not included in git) for configuration. Common variables include:

```env
# Backend API
API_PORT=3000
DB_HOST=localhost
DB_NAME=nxdb
REDIS_HOST=localhost

# Frontend Client
CLIENT_API_URL=http://localhost:3000
```

### CI/CD Integration

The project is configured for [Nx Cloud](https://nx.dev/ci), which provides:
- Remote caching for faster builds
- Task distribution across multiple machines
- Automated e2e test splitting
- Flaky task detection and rerunning

Connect your workspace to get instant setup:  
[![Connect to Nx Cloud](https://nxql.cloud/assets/badge.svg)](https://cloud.nx.app/connect/gIKXcfsR7v)

---

## Technology Summary

### Frontend Stack

- **React**: UI framework (v19)
- **Vite**: Fast build tool and dev server
- **React Router**: Client-side routing
- **SCSS**: CSS preprocessor for styles

### Backend Stack

- **NestJS**: Node.js framework for building scalable servers
- **TypeScript**: Type-safe development
- **Prisma**: ORM for PostgreSQL
- **Mongoose**: ODM for MongoDB
- **ioredis**: Redis client library

### Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Unit testing
- **Vitest**: Alternative test runner
- **Playwright**: E2E testing

---

## Contributing Guidelines

1. **Follow Existing Patterns**: Use existing code generators and patterns
2. **Type Safety**: Keep TypeScript types strict and accurate
3. **Commit Messages**: Write clear, conventional commit messages
4. **Documentation**: Document new features and API changes
5. **Testing**: Add tests for all new functionality

---

## Support & Resources

- [Nx Discord Community](https://go.nx.dev/community)
- [Nx Blog](https://nx.dev/blog)
- [Stack Overflow (tag: nx)](https://stackoverflow.com/questions/tagged/nx)

---

*Last updated: 2024*  
*Documentation version: 1.0.0*