# Troubleshooting Guide

## Overview

This document provides solutions to common issues developers encounter when working with this Nx monorepo project. It covers development setup, build errors, runtime problems, database connectivity, and more.

---

## Table of Contents

1. [Development Setup Issues](#development-setup-issues)
2. [Build Errors](#build-errors)
3. [Runtime Problems](#runtime-problems)
4. [Database Connection Issues](#database-connection-issues)
5. [TypeScript Errors](#typescript-errors)
6. [Testing Failures](#testing-failures)
7. [Docker/Deployment Issues](#dockerdeployment-issues)
8. [Performance Problems](#performance-problems)

---

## Development Setup Issues

### Issue: pnpm not recognized in terminal

**Error Message:** `pnpm is not recognized as an internal or external command`

**Solution:**
```bash
# Windows - Add to PATH permanently
Set-Environment -Variable "PnPMDIR=C:\Users\YourUsername\AppData\Local\nodejs" -Value "$PSPnPMDIR;C:\Program Files\nodejs"

# Or install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

### Issue: TypeScript errors after cloning repository

**Error Message:** Multiple `Cannot find module` or `Failed to resolve path` errors

**Solution:**
```bash
# Reset all caches and reinstall
rm -rf node_modules .nx
pnpm install

# Ensure you have the latest pnpm version (required for monorepos)
pnpm add -g pnpm@latest

# Verify Node.js version (must be 18+)
node --version
```

### Issue: Database connection fails on first run

**Error Message:** `ECONNREFUSED` or authentication errors when starting API

**Solution:**
```bash
# Start database containers
cd docker
docker-compose up -d postgres mongo redis

# Verify containers are running
docker-compose ps

# Check that .env file exists and has correct DATABASE_URL
cat apps/api/.env | grep DATABASE_URL
```

### Issue: Port already in use

**Error Message:** `EADDRINUSE: address already in use` when starting development servers

**Solution (Linux/Mac):**
```bash
# Find what's using port 3000 or 4200
sudo lsof -i :3000
sudo netstat -n | grep :3000

# Kill process on the port
sudo kill -9 <PID>
```

**Solution (Windows):**
```powershell
# Find process using the port
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

### Issue: Vite HMR not working

**Symptoms:** Changes don't appear in browser after saving files

**Solution:**
```bash
# Clear Vite cache
rm -rf node_modules/.vite/client

# Or delete the entire vite cache directory
rmdir /s /q node_modules\.vite\client  # Windows

# Restart development server
pnpm dev:client
```

### Issue: NestJS hot reload not working

**Symptoms:** Manual restart required after code changes

**Solution:**
```bash
# Check that the API is running in watch mode
npx nx serve api --watch

# If already running, try restarting with clean slate
pnpm dev:api
```

---

## Build Errors

### Issue: Webpack build fails with circular dependency

**Error Message:** `Circular dependency: ./a -> ./b -> ./a`

**Solution:**
```bash
# Check the import structure in the affected files
npx nx show projects --graph

# Resolve by extracting shared code to a library or reorganizing imports
# Example: Move shared types to libs/shared-types
npx nx sync  # Update TypeScript references
```

### Issue: Build fails due to outdated lock file

**Error Message:** Missing dependencies after running build

**Solution:**
```bash
# Reset lock file and reinstall
rm pnpm-lock.yaml
pnpm install

# Or use frozen lockfile in CI environments
pnpm install --frozen-lockfile
```

### Issue: TypeScript compilation errors after library changes

**Error Message:** Multiple `Cannot find module` or import resolution errors across projects

**Solution:**
```bash
# Update TypeScript project references
npx nx sync

# Or reset all caches if sync doesn't help
npx nx reset --all
pnpm install
```

### Issue: Module not found errors in React components

**Error Message:** `Failed to parse source code... Can't find module`

**Solution:**
```bash
# Check that dependencies are correctly linked
pnpm list @react/*

# Ensure all React dependencies are installed
pnpm add react react-dom react-router-dom

# Restart development server
pnpm dev:client
```

### Issue: SCSS compilation errors in UI components

**Error Message:** `Error: Can't find stylesheet to import`

**Solution:**
```bash
# Verify that SCSS is configured correctly
npx nx show target build client --help | grep style

# Ensure sass is installed globally if needed
pnpm add -g sass

# Check relative paths in .scss files
# Use absolute imports or correct @use syntax
```

---

## Runtime Problems

### Issue: API crashes on startup

**Error Message:** Application error on server start, often related to missing environment variables

**Solution:**
```bash
# Verify all required environment variables are set
cat apps/api/.env | grep -E "(DATABASE_URL|REDIS_URL|MONGODB_URI)"

# Check that PostgreSQL is running and accessible
psql -h localhost -U postgres -c "SELECT version();"

# If using Docker, ensure containers are started
cd docker && docker-compose up -d
```

### Issue: CORS errors when calling API from client

**Error Message:** `CORS policy blocked` in browser console

**Solution (API side):**
```typescript
// apps/api/src/main.ts or app module
import { CorsOptions } from '@nestjs/common/interfaces';

const corsConfig: CorsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
  methods: 'GET,POST,PUT,PATCH,DELETE',
  credentials: true,
};

// Register in AppModule or global configuration
```

**Solution (Client side):**
```bash
# Check VITE_API_URL in client .env file
cat apps/client/.env.local | grep VITE_API_URL

# Ensure it points to correct API endpoint
echo "VITE_API_URL=http://localhost:3000" > apps/client/.env.local
```

### Issue: Redis cache not connecting

**Error Message:** `Redis connection error` or timeout

**Solution:**
```bash
# Verify Redis is running
docker-compose ps | grep redis
docker exec nx_redis redis-cli ping

# If using Docker, check Redis password configuration
cat docker/.env | grep REDIS_PASSWORD

# Test connection string from API environment
echo "REDIS_URL=redis://nxpass@localhost:6379/0" > test-redis.env
```

### Issue: MongoDB not initializing properly

**Error Message:** `MongoServerError: Authentication failed` or empty collections

**Solution:**
```bash
# Restart MongoDB container
docker-compose restart mongo

# Verify mongod is running and database exists
docker exec nx_mongo mongosh --eval "db.runCommand('ping')"

# Check that required environment variables are set
cat docker/.env | grep MONGO_
```

### Issue: PostgreSQL migrations failing

**Error Message:** `PrismaError: The query failed` or table does not exist

**Solution:**
```bash
# Generate and apply database migrations
npx prisma migrate deploy

# Or reset development database (only in development!)
npx prisma migrate reset

# Verify Prisma Client is generated
ls -la prisma/client/

# Re-generate Prisma client if needed
npx prisma generate
```

---

## TypeScript Errors

### Issue: Missing type declarations for npm packages

**Error Message:** `Object is of type 'any'` or missing type errors everywhere

**Solution:**
```bash
# Install @types/package for common missing types
pnpm add -D @types/node @types/express @types/multer

# Rebuild development servers to pick up new types
pnpm dev:api pnpm dev:client
```

### Issue: Cannot find module 'prisma' in tsconfig

**Error Message:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
# Ensure Prisma is installed globally or locally
pnpm add prisma @prisma/client @prisma/adapter-pg

# Generate Prisma client
npx prisma generate

# Check that tsconfig paths are correctly configured
cat prisma.config.ts
cat apps/api/tsconfig.json | grep prisma
```

### Issue: Project references not updated after adding new library

**Error Message:** TypeScript errors showing missing exports from newly created libraries

**Solution:**
```bash
# Manually update TypeScript project references
npx nx sync

# Or reset if references are still incorrect
npx nx reset --all
pnpm install
```

---

## Testing Failures

### Issue: Jest tests not finding modules

**Error Message:** `Cannot find module` or mock failures

**Solution:**
```bash
# Clear Jest cache
rm -rf node_modules/.cache/jest

# Regenerate jest config if necessary
npx nx run jest:generate --project=api

# Or rebuild to ensure all mocks are properly set up
pnpm dev:api
```

### Issue: E2E tests failing in CI but passing locally

**Symptoms:** Tests pass on local machine but fail in GitHub Actions or GitLab CI

**Solution:**
```bash
# Check that environment variables match between environments
# Local vs CI can have different API URLs, database connections, etc.

# Update Playwright config for production if necessary
cat apps/client-e2e/playwright.config.ts | grep baseURL

# Or set up same test infrastructure in both environments
```

### Issue: Test coverage showing 0%

**Symptoms:** Coverage reports are empty or don't include new tests

**Solution:**
```bash
# Ensure tests are being collected properly
npx nx test api --coverage

# Check that your test files have correct naming convention
ls apps/api/src/**/*.spec.ts | head -5

# Run with specific flags if needed
npx nx test api --testFile=users.service.spec.ts
```

---

## Docker/Deployment Issues

### Issue: Docker container won't start

**Error Message:** Container exits immediately after starting

**Solution:**
```bash
# View logs to understand why container is failing
docker-compose logs api

# Common fixes:
# 1. Ensure all environment variables are set
echo "DATABASE_URL=..." > docker/.env
echo "REDIS_URL=..." >> docker/.env

# 2. Check if database containers are running
docker-compose ps

# 3. Restart all services
docker-compose down
docker-compose up -d --build
```

### Issue: Database migration fails in production

**Error Message:** Migration timeout or conflict errors

**Solution:**
```bash
# For production, ensure migrations are run before API starts
docker exec nx_postgres psql -U nxuser -d nxdb -c "ALTER DATABASE nxdb SET idle_in_transaction_session_timeout=0;"

# Or use a database seed script if available
docker exec nx_postgres pg_restore -d nxdb backup.sql
```

### Issue: Docker images too large

**Symptoms:** Slow deployments due to large image sizes

**Solution:**
```bash
# Create multi-stage Dockerfile for smaller images
cat > Dockerfile << EOF
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --production

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm nx build api

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/api/main.js ./dist/
COPY --from=builder /app/package.json ./package.json

HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1
USER node
CMD ["node", "dist/apps/api/main.js"]
EOF
```

---

## Performance Problems

### Issue: Slow build times

**Symptoms:** Builds taking longer than expected, often minutes instead of seconds

**Solution:**
```bash
# Enable Nx caching for faster builds
npx nx cloud connect  # Connect to Nx Cloud if available

# Or enable local caching (already on by default)
npx nx cache-check --target=build --all

# Clear stale caches periodically
npx nx reset --all
```

### Issue: Application memory usage growing over time

**Symptoms:** Node.js process consumes more memory after running for hours

**Solution:**
```bash
# Increase Node.js heap size (if needed)
export NODE_OPTIONS="--max-old-space-size=4096"

# Check memory usage
ps aux | grep node

# Restart application if memory is critically high
pnpm dev:api  # Or deploy with new deployment configuration
```

### Issue: Database queries taking too long

**Symptoms:** Slow API response times, especially on list endpoints

**Solution:**
```bash
# Add database indexes for frequently queried fields
npx prisma migrate create --name add_indexes MigrationName

# Or manually add indexes to existing schema
docker exec nx_postgres psql -U nxuser -d nxdb -c "CREATE INDEX idx_users_email ON users(email);"
```

---

## Quick Reference: Common Commands

### Reset Everything (Use with Caution!)

```bash
# Development environment reset
rm -rf node_modules .nx dist coverage
pnpm install

# Production deployment reset (backup first!)
docker-compose down -v
docker system prune -a
```

### Check All Services Status

```bash
# Docker containers
docker-compose ps

# Database health check
docker exec nx_postgres psql -U nxuser -c "SELECT 1;"
docker exec nx_redis redis-cli ping
docker exec nx_mongo mongosh --eval "db.adminCommand('ping')"
```

### View Recent Logs

```bash
# All containers (latest only)
docker-compose logs tail 100

# Specific container
docker-compose logs -f api
docker-compose logs -f postgres
```

---

## Still Having Issues?

If you encounter an issue not covered in this guide:

1. **Check Nx Logs:** `npx nx show projects --graph` to see project dependencies
2. **Review Error Messages:** Look for specific error codes or stack traces
3. **Search GitHub Issues:** Check if others have reported similar issues
4. **Create Debug Output:** Add console.log() statements in your application
5. **Ask for Help:** Provide detailed reproduction steps and full error messages

---

*Document Version: 1.0.0*  
*Last Updated: 2024*