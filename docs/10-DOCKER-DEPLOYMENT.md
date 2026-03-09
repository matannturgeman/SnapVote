# Docker and Deployment Documentation

## Overview

This document provides comprehensive details about the **Docker containerization** and **deployment configuration** for this Nx monorepo project. The application is designed to be easily containerized and deployed across various environments using multi-service orchestration with Docker Compose.

---

## Table of Contents

1. [Docker Architecture](#docker-architecture)
2. [Dockerfile Configuration](#dockerfile-configuration)
3. [Docker Compose Setup](#docker-compose-setup)
4. [Production Deployment](#production-deployment)
5. [Environment Variables](#environment-variables)
6. [Build Pipeline Integration](#build-pipeline-integration)
7. [Health Checks and Monitoring](#health-checks-and-monitoring)
8. [Scaling Strategies](#scaling-strategies)

---

## Docker Architecture

### Container Strategy

The project uses a **multi-container deployment strategy** to isolate different services:

```
┌─────────────────────────────────────────┐
│          Application Container           │
│  (NestJS API - Production Build)         │
└─────────────────────────────────────────┘
                  ↑
┌─────────────────────────────────────────┐
│        Database Layer                    │
│  ┌─────────────┬──────────┬──────────┐   │
│  │ PostgreSQL  │ MongoDB  │ Redis    │   │
│  └─────────────┴──────────┴──────────┘   │
└─────────────────────────────────────────┘
```

### Services Defined

| Service | Purpose | Docker Image | Port Mapping | Volume Mounts |
|---------|---------|--------------|--------------|---------------|
| API | NestJS backend application | Node:20-alpine | N/A (internal) | Code, node_modules |
| PostgreSQL | Relational database | postgres:15 | 5432:5432 | postgres_data:/var/lib/postgresql/data |
| MongoDB | Document store | mongo:7 | 27017:27017 | mongo_data:/data/db |
| Redis | Cache layer | redis:7 | 6379:6379 | N/A (uses internal) |

---

## Dockerfile Configuration

### Base Image Selection

Located at `Dockerfile` in the project root, the build uses:

```dockerfile
FROM node:20-alpine
```

**Choice Rationale:**
- **Alpine-based**: Smaller image size (~140MB vs ~950MB for full Node)
- **Node 20 LTS**: Latest stable Node.js version
- **Security**: Minimal attack surface with Alpine

### Build Process

The Dockerfile executes these steps in sequence:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy all project files
COPY . .

# Install pnpm globally (preferred package manager)
RUN npm install -g pnpm

# Install all dependencies from root package.json
RUN pnpm install

# Build API application for production
RUN pnpm nx build api

# Default command to run the built API
CMD ["node", "dist/apps/api/main.js"]
```

### Multi-Stage Build Optimization (Recommended for Production)

For optimized production builds, consider this alternative approach:

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm nx build api

# Stage 3: Runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Copy only production dependencies
COPY --from=builder /app/dist/apps/api/main.js ./dist/apps/api/
COPY --from=builder /app/package.json ./package.json

# Add production-only environment variables
ENV NODE_ENV=production
ENV TECHO_API=true

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/apps/api/main.js"]
```

### Image Tagging Best Practices

When building the image, use descriptive tags:

```bash
# Development build
docker build -t nx-api-dev .

# Production build with environment-specific tag
docker build \
  --build-arg NODE_ENV=production \
  -t nx-api:prod-latest \
  .
```

---

## Docker Compose Setup

### docker-compose.yml Configuration

Located at `docker/docker-compose.yml`, the configuration defines these services:

```yaml
version: "3.9"

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

  mongo:
    image: mongo:7
    container_name: nx_mongo
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7
    container_name: nx_redis
    restart: always
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  mongo_data:
```

### Environment Variables per Service

#### PostgreSQL Configuration

```yaml
services:
  postgres:
    environment:
      # Default superuser password (change in production)
      POSTGRES_USER: nxuser
      POSTGRES_PASSWORD: nxpass
      # Database name created on first start
      POSTGRES_DB: nxdb
      
      # Advanced PostgreSQL settings (if needed)
      MAX_CONNECTIONS: 100
      SHARED_BUFFERS: 128MB
```

#### MongoDB Configuration

```yaml
services:
  mongo:
    environment:
      MONGO_INITDB_DATABASE: nxdb
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: adminpass
    command: mongod --auth --port 27017
```

#### Redis Configuration

```yaml
services:
  redis:
    command: redis-server --requirepass nxpass
    environment:
      REDIS_MEMORY_MAX: 4gb
      REDIS_AOF_ENABLED: "no"  # Disable for faster startup in dev
```

### Volume Management

Persistent data volumes prevent data loss on container restart:

```yaml
volumes:
  postgres_data:      # PostgreSQL database files
    driver: local
  mongo_data:         # MongoDB data directory
    driver: local
  redis_data:         # Redis data (if using persistence)
    driver: local
```

**Important**: Volumes are mounted to container filesystem, not Docker image. Changes made to volumes persist across container restarts.

---

## Production Deployment

### Build and Deploy Workflow

#### Step 1: Build Application Locally

First, build the API application locally before deploying:

```bash
# Navigate to project root
cd nx-project

# Build API for production
pnpm build:api

# Verify build output
ls -la dist/apps/api/
```

#### Step 2: Build Docker Image

Build the application image:

```bash
# Build with latest tag (overwrites existing image)
docker build -t nx-api:latest .

# Or build with specific version tag
docker build -t nx-api:v1.0.0 .
```

#### Step 3: Run Container with Compose

Start all services including the API:

```bash
# Start all services defined in docker-compose.yml
cd docker
docker-compose up -d

# View logs from all containers
docker-compose logs -f

# Or start just the API container
docker run -d \
  --name nx-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=${DATABASE_URL} \
  nx-api:latest
```

#### Step 4: Verify Deployment

Check if the application is running:

```bash
# Test API endpoint
curl http://localhost:3000/health

# Check container status
docker-compose ps

# View logs
docker-compose logs api
```

---

## Environment Variables

### Production Environment Configuration

Create separate `.env` files for each environment:

#### Development (.env.development)

```bash
# API Server
API_PORT=3000
NODE_ENV=development
DEBUG=true

# PostgreSQL (Local Docker)
DATABASE_URL=postgresql://nxuser:nxpass@localhost:5432/nxdb?schema=public
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nxDB
DB_USER=nxuser
DB_PASSWORD=nxpass

# MongoDB (Optional, comment out if not using)
MONGODB_URI=mongodb://nxuser:nxpass@localhost:27017/nxdb?authSource=admin
MONGODB_ENABLED=true

# Redis
REDIS_URL=redis://nxpass@localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=nxpass

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3001
CLIENT_URL=http://localhost:4200
```

#### Production (.env.production)

```bash
# API Server
API_PORT=8080
NODE_ENV=production
DEBUG=false

# PostgreSQL (Production Database)
DATABASE_URL=postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:5432/${PGDB}?schema=public
DB_HOST=${PROD_POSTGRES_HOST}
DB_PORT=5432
DB_NAME=${PROD_DATABASE_NAME}
DB_USER=${PROD_DATABASE_USER}
DB_PASSWORD=${PROD_DATABASE_PASSWORD}

# MongoDB (Production, if needed)
MONGODB_URI=mongodb://${MONGOUSER}:${MONGOPASS}@${MONGOHOST}:27017/${MONGODATABASE}?authSource=admin
MONGODB_ENABLED=false  # Comment out or set false if not using

# Redis (Production Cache)
REDIS_URL=redis://:redispassword@${PROD_REDIS_HOST}:${PROD_REDIS_PORT}/0
REDIS_HOST=${PROD_REDIS_HOST}
REDIS_PORT=${PROD_REDIS_PORT}
REDIS_PASSWORD=${PROD_REDIS_PASSWORD}

# Security Headers
API_RATE_LIMIT=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# CORS Configuration (Production)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CLIENT_URL=https://client.yourdomain.com

# Logging Configuration
LOG_LEVEL=warn
LOG_FORMAT=json
```

### Environment Variable Injection Patterns

#### In CI/CD Pipelines

```yaml
# Example GitHub Actions step
- name: Deploy to Production
  run: |
    echo "${PRODUCTION_DATABASE_URL}" > .env.production
    docker-compose -f docker-compose.prod.yml up -d --build
```

#### With Docker Compose Env File

Create `docker-compose.prod.yml`:

```yaml
version: "3.9"

services:
  api:
    build:
      context: ../nx-project
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    depends_on:
      - postgres
      - redis
```

---

## Build Pipeline Integration

### CI/CD Configuration Example (GitHub Actions)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build API application
        run: pnpm build:api
      
      - name: Run tests
        run: pnpm test
      
      - name: Login to Docker Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Docker image
        run: |
          docker build \
            --tag ghcr.io/your-org/nx-api:${{ github.sha }} \
            .
          docker push ghcr.io/your-org/nx-api:${{ github.sha }}
      
      - name: Deploy to production server
        run: |
          ssh deploy@production-server.com << 'EOF'
            cd /opt/nx-api
            git pull origin main
            pnpm install --frozen-lockfile
            docker pull ghcr.io/your-org/nx-api:${{ github.sha }}
            docker-compose -f docker-compose.prod.yml up -d --build --no-deps api
          EOF
      
      - name: Notify deployment success
        run: echo "Deployment completed successfully"
```

### Kubernetes Deployment (Optional)

Create `kubernetes/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nx-api-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nx-api
  template:
    metadata:
      labels:
        app: nx-api
    spec:
      containers:
        - name: api
          image: ghcr.io/your-org/nx-api:v1.0.0
          ports:
            - containerPort: 3000
          envFrom:
            - configMapKeyRef:
                name: nx-api-config
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

---

## Health Checks and Monitoring

### Implementing Health Check Endpoints

Create a health check route in the NestJS application:

```typescript
// apps/api/src/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  async checkHealth(): Promise<{ status: string; db: string; cache: string }> {
    const dbStatus = await this.prisma.user.count();
    
    try {
      await this.redis.ping();
      const cacheStatus = 'ok';
    } catch (error) {
      const cacheStatus = 'error';
    }

    return {
      status: 'ok',
      db: dbStatus > 0 ? 'ok' : 'error',
      cache,
    };
  }
}
```

### Monitoring with Prometheus (Optional)

Set up Prometheus metrics endpoint:

```typescript
// apps/api/src/metrics.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('metrics')
export class MetricsController {
  @Get()
  getMetrics(): Record<string, number> {
    return {
      requests_total: 1500,
      errors_total: 3,
      uptime_seconds: 86400,
    };
  }
}
```

---

## Scaling Strategies

### Horizontal Pod Autoscaling

Configure Kubernetes HPA for automatic scaling based on CPU/memory usage:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nx-api-autoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nx-api-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: requests_per_second
        target:
          type: AverageValue
          averageValue: "50"
```

### Database Replication (Read/Write Separation)

Set up PostgreSQL read replicas:

```yaml
# docker-compose.replica.yml
services:
  postgres-primary:
    image: postgres:15
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: nxdb
    volumes:
      - postgres_primary:/var/lib/postgresql/data
      
  postgres-replica-1:
    image: postgres:15
    command: -c 'primary_conninfo=' -c 'hot_standby=on'
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_replica:/var/lib/postgresql/data

volumes:
  postgres_primary:
  postgres_replica:
```

---

## Security Considerations

### Running as Non-Root User

Modify Dockerfile for security:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install
RUN pnpm nx build api

# Run API as non-root user
USER node

CMD ["node", "dist/apps/api/main.js"]
```

### HTTPS Configuration (Production)

Use Let's Encrypt certificates:

```bash
docker run -d \
  --name nx-api \
  -p 443:443 \
  -e API_PORT=443 \
  -e TLS_ENABLED=true \
  nx-api:latest
```

---

## Summary Quick Reference

| Task | Command | Description |
|------|---------|-------------|
| Build locally | `pnpm build:api` | Build for production deployment |
| Build Docker image | `docker build -t nx-api:latest .` | Create container image |
| Start with databases | `docker-compose up -d` | Run all services |
| Stop all services | `docker-compose down` | Clean shutdown |
| View logs | `docker-compose logs -f` | Monitor application output |
| Health check | `curl http://localhost:3000/health` | Verify service status |
| Pull latest image | `docker pull ghcr.io/your-org/nx-api:latest` | Update from registry |

---

*Document Version: 1.0.0*  
*Last Updated: 2024*