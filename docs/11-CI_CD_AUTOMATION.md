# CI/CD Automation Documentation

## Overview

This document provides comprehensive details about **Continuous Integration/Continuous Deployment (CI/CD)** configuration and automation for this Nx monorepo project. The setup is designed to provide fast, reliable, and secure deployments across development, staging, and production environments while leveraging Nx Cloud features like remote caching and task distribution.

---

## Table of Contents

1. [Nx Cloud Integration](#nx-cloud-integration)
2. [GitHub Actions Workflows](#github-actions-workflows)
3. [Build Pipeline Configuration](#build-pipeline-configuration)
4. [Deployment Automation](#deployment-automation)
5. [Testing Strategy in CI](#testing-strategy-in-ci)
6. [Security Scanning](#security-scanning)
7. [Performance Optimization](#performance-optimization)
8. [Best Practices](#best-practices)

---

## Nx Cloud Integration

### Remote Caching Setup

Nx Cloud significantly speeds up CI builds by caching task results across machines:

```yaml
# .github/workflows/ci.yml - Example with Nx Cloud
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Cache with Nx Cloud
        uses: nx-cloud/nx-cache-action@latest
        with:
          cache_path: .nx/cache
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run tests
        run: pnpm test
      
      - name: Build API
        run: pnpm build:api
      
      - name: Build Client
        run: pnpm build:client
```

### Connecting to Nx Cloud

To enable Nx Cloud features, connect your workspace via the URL provided in the README or run:

```bash
npx nx cloud connect
```

This automatically configures remote caching and distributed task execution in your `.github` workflows.

---

## GitHub Actions Workflows

### Complete CI/CD Workflow Setup

Located at `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop, staging]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deploy environment'
        required: true
        default: 'staging'
        type: choice
        options: ['staging', 'production']

jobs:
  # Job 1: Lint and Test
  test-and-lint:
    name: Test & Lint
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        if: github.event_name != 'pull_request'
      
      - name: Cache with Nx Cloud (CI only)
        uses: nx-cloud/nx-cache-action@latest
        if: github.event_name != 'pull_request'
        
      - name: Run lint checks
        run: npx nx lint projects
        if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
      
      - name: Run type checking
        run: npx nx affected -t typecheck --all
      
      - name: Run unit tests
        run: pnpm test
        env:
          CI: true
          
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.info
      
      - name: Publish test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            !coverage/lcov-report/

  # Job 2: Build All Projects
  build:
    name: Build Applications
    runs-on: ubuntu-latest
    needs: test-and-lint
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Cache with Nx Cloud
        uses: nx-cloud/nx-cache-action@latest
        
      - name: Build API
        run: npx nx build api
      
      - name: Build Client
        run: npx nx build client
      
      - name: Run affected build
        run: npx nx run-many --target=build --affected
      
      - name: Archive artifacts
        uses: actions/upload-artifact@v3
        with:
          name: nx-builds
          path: |
            dist/
            !dist/.gitignore
          
      # Store build artifacts for release pipeline
      - name: Save artifact checksum
        run: |
          sha256sum dist/* > dist.sha256
      
  # Job 3: Deploy to Staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [test-and-lint, build]
    if: github.ref == 'refs/heads/develop' || github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'staging'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          pattern: nx-builds
          path: dist/
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        
      - name: Deploy to staging server
        run: |
          # SSH to staging and deploy
          scp -r -i ${SSH_KEY} dist/* user@staging-server:/opt/nx-api/
          ssh -i ${SSH_KEY} user@staging-server "cd /opt/nx-api && pnpm install --frozen-lockfile && npm start"
        env:
          SSH_KEY: ${{ secrets.STAGING_SSH_KEY }}
          
      - name: Notify deployment success
        uses: 8398a7/action-slack@v3
        with:
          status: success
          channel: '#deployments'
        if: always()

  # Job 4: Deploy to Production
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [test-and-lint, build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          pattern: nx-builds
          path: dist/
      
      - name: Build and push Docker image
        run: |
          docker build \
            --tag ghcr.io/${{ github.repository }}:${{ github.sha }} \
            .
          docker push ghcr.io/${{ github.repository }}:${{ github.sha }}
        
      - name: Notify production deployment
        uses: 8398a7/action-slack@v3
        with:
          status: success
          channel: '#production-alerts'
```

---

## Build Pipeline Configuration

### Package.json Scripts

The root `package.json` defines scripts that work seamlessly with CI/CD:

```json
{
  "scripts": {
    "dev:api": "nx serve api",
    "build:api": "nx build api",
    "dev:client": "nx serve client",
    "build:client": "nx build client",
    "test": "nx run-many -t test",
    "lint": "npx nx lint projects",
    "format": "prettier --write \"**/*.{ts,tsx,json}\""
  }
}
```

### Nx Affected Command Usage

In CI/CD, use `nx affected` to run tasks only on changed projects:

```bash
# Build only changed projects
npx nx run-many --target=build --affected

# Test only changed libraries
npx nx run-many --target=test --affected --exclude=e2e

# Lint only API and client apps
npx nx affected -t lint --projects=api,client
```

---

## Deployment Automation

### Environment-Specific Configuration

Create separate `docker-compose` files for each environment:

#### Production Docker Compose (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Build API
        run: pnpm build:api
      
      - name: Create production docker-compose
        run: |
          cat > docker-compose.prod.yml << EOF
          version: "3.9"
          
          services:
            api:
              image: ghcr.io/${{ github.repository }}:${{ github.sha }}
              environment:
                - NODE_ENV=production
                - LOG_LEVEL=warn
                - CORS_ORIGINS=${{ secrets.CORS_ORIGINS }}
              deploy:
                resources:
                  limits:
                    cpus: '0.5'
                    memory: 1G
            postgres:
              image: postgres:15-alpine
              environment:
                POSTGRES_USER: ${POSTGRES_USER}
                POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
                POSTGRES_DB: nxdb
              volumes:
                - postgres_data:/var/lib/postgresql/data
            redis:
              image: redis:7-alpine
              command: redis-server --requirepass ${REDIS_PASSWORD}
          volumes:
            postgres_data:
          EOF
      
      - name: Deploy to production server
        run: |
          scp docker-compose.prod.yml user@prod-server:/opt/nx-api/
          ssh user@prod-server "cd /opt/nx-api && docker-compose -f docker-compose.prod.yml up -d --build"
        env:
          SSH_KEY: ${{ secrets.PROD_SSH_KEY }}
          POSTGRES_USER: ${{ secrets.DB_USER }}
          POSTGRES_PASSWORD: ${{ secrets.DB_PASSWORD }}
          REDIS_PASSWORD: ${{ secrets.REDIS_PASSWORD }}
```

---

## Testing Strategy in CI

### Test Execution Order

1. **Lint first** - Catch formatting issues early
2. **Type check** - Ensure TypeScript types are correct
3. **Unit tests (Jest/Vitest)** - Fast, isolated tests
4. **E2E tests (Playwright)** - Browser automation if needed

```yaml
# Example: Optimize test execution in CI
steps:
  # Run fast unit tests first
  - name: Run unit tests
    run: npx nx run-many --target=test --all --skip-nx-cache
      
  # Only run e2e tests if no failures occurred
  - name: Run e2e tests
    if: ${{ !failure() }}
    run: npx nx run-many --target=e2e --all
```

### Test Filtering Strategies

```bash
# Run specific test files
npx nx test api --testPathPattern="users"

# Watch mode for local development only (not CI)
npx nx test api --watch
```

---

## Security Scanning

### Dependency Vulnerability Scanning

Add to your CI pipeline:

```yaml
steps:
  - name: Audit dependencies
    run: pnpm audit --prod
    
  - name: SAST scan with npm audit
    if: always()
    run: pnpm audit

  # Optional: Integrate Snyk or similar tool
  - uses: snyk/actions/node@latest
    env:
      SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Secret Detection

GitHub Actions has built-in secret scanning. Never commit `.env` files or secrets.

---

## Performance Optimization

### Caching Strategies

1. **Nx Cache** - Store task outputs in `.nx/cache`
2. **pnpm Store Pruning** - Remove unused package versions
3. **Artifact Reuse** - Upload build artifacts between jobs

```yaml
# In CI, use these caches:
- uses: actions/cache@v3
  with:
    path: .nx/cache
    key: ${{ runner.os }}-nx-cache-${{ hashFiles('pnpm-lock.yaml') }}
```

### Parallel Execution

Use Nx's distributed task execution in CI:

```yaml
- name: Run parallel tasks
  run: npx nx run-many --target=lint,test,build --all --parallel=4
```

---

## Best Practices

### Do's

- ✅ Use `nx affected` commands for incremental builds
- ✅ Enable Nx Cloud remote caching in CI
- ✅ Run unit tests before E2E tests (faster feedback)
- ✅ Pin Node.js to LTS version in workflows
- ✅ Use `.gitignore` to exclude `node_modules/`, `dist/`, and coverage folders

### Don'ts

- ❌ Don't run E2E tests on every PR (slow and flaky)
- ❌ Don't commit build artifacts or logs
- ❌ Don't use relative paths in CI (use workspace protocol)
- ❌ Don't hardcode secrets in workflows (use encrypted secrets)

### CI Optimization Checklist

- [ ] Enable Nx Cloud remote caching
- [ ] Use frozen lockfile (`--frozen-lockfile`) for reproducible installs
- [ ] Run `pnpm audit` before deploying to production
- [ ] Set up monitoring/alerting for failed deployments
- [ ] Implement blue-green or canary deployments for zero downtime

---

## Environment Variables Reference

Create these environment files for different environments:

```bash
# .env.development (Local)
NODE_ENV=development
DEBUG=true
DATABASE_URL=postgresql://localhost:5432/nxdb
CLIENT_URL=http://localhost:4200

# .env.staging (Staging Environment)
NODE_ENV=staging
DATABASE_URL=${STAGING_DB_URL}
ALLOWED_ORIGINS=https://staging.example.com

# .env.production (Production)
NODE_ENV=production
DATABASE_URL=${PROD_DATABASE_URL}
LOG_LEVEL=error
RATE_LIMIT=true
```

---

## Related Documentation

- [Nx Cloud Documentation](https://nx.dev/ci/intro/why-nx-cloud) - Remote caching setup
- [GitHub Actions Docs](https://docs.github.com/actions) - Workflow configuration
- [Codecov Documentation](https://docs.codecov.com/) - Coverage reporting
- [Snyk Documentation](https://snyk.io/) - Security scanning

---

*Document Version: 1.0.0*  
*Last Updated: 2024*