# Development Workflow Documentation

## Overview

This document provides a comprehensive guide to the development workflow in this Nx monorepo. It covers initial setup, running tasks, IDE configuration, troubleshooting common issues, and best practices for efficient daily development.

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Running Tasks](#running-tasks)
3. [IDE Configuration](#ide-configuration)
4. [Daily Development Workflow](#daily-development-workflow)
5. [Common Problems and Solutions](#common-problems-and-solutions)
6. [CI/CD Integration](#cidc-integration)
7. [Performance Tips](#performance-tips)

---

## Initial Setup

### Prerequisites Checklist

Before starting development, ensure you have:

- [ ] **Node.js** (v18 or higher) - Download from https://nodejs.org/
- [ ] **pnpm** (v8.6+) - Package manager for monorepos
- [ ] **Git** - For version control
- [ ] Modern code editor (**VS Code recommended**)
- [ ] Optional: Docker Desktop (for local database containers)

### Installing pnpm

If pnpm is not installed globally, run:

```bash
# Using npm
npm install -g pnpm

# Or using corepack (comes with Node.js 16.7+)
corepack enable pnpm

# Or nvm users can install specific version
nvm install pnpm
```

### Cloning and Installing Dependencies

Clone the repository and navigate to the project root:

```bash
git clone <repository-url>
cd nx-project
```

Install all dependencies from the root:

```bash
pnpm install
```

This will:
1. Install root dependencies defined in `package.json`
2. Set up pnpm workspace linking for libraries
3. Create lock file at `.pnpm-lock.yaml`

### Database Setup (Optional)

If you want to run local databases instead of using Docker, create a `.env` file:

```bash
# apps/api/.env
DATABASE_URL=postgresql://nxuser:nxpass@localhost:5432/nxdb?schema=public
MONGODB_URI=mongodb://nxuser:nxpass@localhost:27017/nxdb
REDIS_URL=redis://nxpass@localhost:6379/0
```

Then start the databases:

```bash
cd docker
docker-compose up -d postgres mongo redis
```

### Verify Installation

Run these commands to verify everything is working:

```bash
# Check Node version
node --version

# Check pnpm version
pnpm --version

# List all installed projects
npx nx show projects

# Visualize dependency graph
npx nx graph --files
```

---

## Running Tasks

### Development Servers

#### Start Backend API (NestJS)

```bash
# Using npm script
pnpm dev:api

# Or using Nx directly
nx serve api

# With specific configuration
nx serve api --configuration=development
```

The API will start on `http://localhost:3000` by default.

#### Start Frontend Client (React + Vite)

```bash
# Using npm script
pnpm dev:client

# Or using Nx directly
nx serve client

# With specific port (Vite config allows customization)
```

The client will start on `http://localhost:4200` by default.

#### Start Both Servers Concurrently

Run multiple development servers in separate terminals:

```bash
# Terminal 1 - API
pnpm dev:api

# Terminal 2 - Client
pnpm dev:client
```

Use a terminal multiplexer for convenience:

```bash
# Using tmux
tmux new-session -d "pnpm dev:api"
tmux split-window -v "pnpm dev:client"

# Or using screen/other tools
```

### Build Tasks

#### Production Build API

```bash
pnpm build:api

# Check output
ls -la dist/apps/api/

# Verify bundle size
du -sh dist/apps/api/main.js
```

#### Production Build Client

```bash
pnpm build:client

# Check output
ls -la dist/client/
```

#### Build All Projects

```bash
# Build all projects in the workspace
pnpm nx run-many --target=build --all

# Or using Nx command directly
npx nx run-many --target=build
```

### Testing Tasks

#### Run Unit Tests (All Projects)

```bash
pnpm test

# Run specific project tests
nx test api

nx test client

# With coverage
nx test api -- --coverage

# Watch mode for development
nx test api --watch
```

#### Run E2E Tests (Playwright)

```bash
npx nx e2e client-e2e

# Or run all e2e tests
npx nx run-many --target=e2e --all
```

### Linting and Formatting

#### Run ESLint

```bash
pnpm lint

# Specific project
nx lint api

# Fix auto-fixable issues
npx nx lint api --fix
```

#### Run Prettier

```bash
npx prettier --write "**/*.{ts,tsx,json,md,yml}"

# Check formatting only
npx prettier --check "**/*.{ts,tsx,json,md,yml}"
```

#### Lint and Format Combined

```bash
pnpm lint:all

# Custom script combining eslint and prettier
npx nx lint projects && npx nx format projects
```

### Other Useful Commands

#### Reset Caches

If changes aren't reflected after edits:

```bash
# Clear all Nx caches
npx nx reset --all

# Reset specific project cache
npx nx reset api

# View cached tasks
npx nx cache-check
```

#### Watch Dependencies

While developing, watch dependencies automatically rebuild when they change:

```bash
# Watch deps for a project
npx nx watch-deps api

# Or use the shorthand
npx nx build-deps api
```

#### Sync TypeScript References

After modifying library exports or adding new projects:

```bash
# Update TypeScript project references
npx nx sync

# Check if references are up to date
npx nx sync:check
```

---

## IDE Configuration

### VS Code Extensions Recommended

Install these extensions for optimal development experience:

1. **ESLint** - Code linting and diagnostics
2. **Prettier - Code formatter** - Automatic formatting
3. **TypeScript Language Services** - Intellisense and type checking
4. **Nx Console** - Nx plugin for code generation and task management
5. **Prisma** - Prisma schema editing support
6. **NestJS** - NestJS-specific snippets and navigation
7. **Thunder Client / HTTP Client** - API testing locally

### VS Code Settings

Create `.vscode/settings.json` in project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "prettier.singleQuote": false,
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/dist/**": true,
    "**/node_modules/**": true,
    "**/.nx/**": true
  },
  "nx.useInlayHint": "always"
}
```

### Task Runner Settings

Install Nx Console for VS Code:

1. Open Extensions panel (Ctrl+Shift+X)
2. Search for "Nx Console"
3. Install the extension by Netlify

This enables:
- **Task list** in command palette (Ctrl+Shift+P → "Tasks: Run Task")
- **Project graph visualization** directly in VS Code
- **Code generation** via generator commands
- **Target execution** without remembering exact commands

### Prisma Studio for Development

View database schema and data visually:

```bash
npx prisma studio
```

This opens a web UI at `http://localhost:5555` showing all tables, relationships, and data.

---

## Daily Development Workflow

### Starting Your Day

1. **Pull latest changes** (if on git):
   ```bash
   git pull origin main
   pnpm install
   ```

2. **Start development servers**:
   ```bash
   # Terminal 1 - API
   pnpm dev:api
   
   # Terminal 2 - Client
   pnpm dev:client
   ```

3. **Run database migrations** (if schema changed):
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

### Making Changes

#### Backend Changes (API)

1. Edit files in `apps/api/src/`
2. Hot reload updates automatically via NestJS
3. Check logs for compilation errors
4. Test endpoints with Swagger UI or HTTP client

#### Frontend Changes (Client)

1. Edit files in `apps/client/src/`
2. Vite hot module replacement shows changes instantly
3. Check React DevTools for component state/debugging
4. View bundle analyzer results when building

#### Library Changes (Shared Code)

When modifying libraries in `libs/`:

```bash
# After changing shared library
npx nx sync  # Update TypeScript references
pnpm dev:api # Restart affected app
pnpm dev:client  # Restart affected app
```

### Testing Your Changes

1. **Unit Tests**: Run tests for modified code
   ```bash
   npx nx test api  # For API projects
   npx nx test client  # For frontend
   ```

2. **E2E Tests**: Run full user journey tests
   ```bash
   npx nx e2e client-e2e
   ```

3. **Lint and Format**: Ensure code quality
   ```bash
   npx nx lint api
   npx nx format api
   ```

### Committing Changes

Follow conventional commit guidelines:

```bash
# Typical messages
git add .
git commit -m "feat(users): add email validation"
git commit -m "fix(api): correct database connection string parsing"
git commit -m "docs(readme): update installation instructions"
```

### Handling Type Errors

If you see TypeScript errors after editing:

1. **Check if references are outdated**:
   ```bash
   npx nx sync:check
   ```

2. **Run the sync command** if needed:
   ```bash
   npx nx sync
   ```

3. **Restart development server**:
   ```bash
   pnpm dev:api  # For backend
   pnpm dev:client  # For frontend
   ```

---

## Common Problems and Solutions

### Problem: Changes Not Reflecting in UI

**Cause**: Vite cache or NestJS hot reload issues.

**Solution**:
```bash
# Clear Vite cache
rm -rf node_modules/.vite/client

# Restart development server
pnpm dev:client
```

### Problem: TypeScript Errors After Library Changes

**Cause**: Project references not updated automatically.

**Solution**:
```bash
npx nx sync

# If still failing, reset and reinstall
npx nx reset --all
pnpm install
```

### Problem: Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Find what's using the port (Linux/Mac)
lsof -i :3000
# or Windows
netstat -ano | findstr :3000

# Kill process or change port in configuration
# API: Update nest-cli.json or environment variable
# Client: Update apps/client/vite.config.mts
```

### Problem: Database Connection Fails

**Error**: `ECONNREFUSED` or authentication errors.

**Solution**:
```bash
# Check if Docker containers are running
docker-compose ps

# If not running, start them
cd docker && docker-compose up -d

# Verify connection string in .env file matches container settings
# API: DATABASE_URL=postgresql://nxuser:nxpass@localhost:5432/nxdb?schema=public
```

### Problem: Build Fails with Circular Dependencies

**Cause**: Two libraries importing each other.

**Solution**:
1. Remove circular import by extracting common code
2. Move shared types to `libs/shared-types`
3. Use project graph to visualize: `npx nx graph`

### Problem: Lock File Conflicts After Update

**Error**: Missing dependencies after `pnpm install`.

**Solution**:
```bash
# Reset lock file and reinstall
rm pnpm-lock.yaml
pnpm install

# Or use frozen lockfile in CI environments
pnpm install --frozen-lockfile
```

---

## CI/CD Integration

### Building for Deployment

In your CI pipeline (GitHub Actions, GitLab CI, etc.):

```yaml
# Example GitHub Actions step
- name: Install dependencies
  run: pnpm install --frozen-lockfile
  
- name: Build API
  run: pnpm build:api
  
- name: Build Client
  run: pnpm build:client
  
- name: Run tests
  run: pnpm test
  
- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    name: nx-builds
    path: dist/
```

### Database Setup in CI

In production environments, use environment variables instead of local containers:

```bash
# Set these in your CI secrets or infrastructure config
DATABASE_URL=$PROD_DATABASE_URL
REDIS_URL=$PROD_REDIS_URL
MONGODB_URI=$PROD_MONGODB_URI

# Run migrations before starting API service
npx prisma migrate deploy
pnpm build:api
node dist/apps/api/main.js
```

---

## Performance Tips

### Speed Up Development

1. **Use SWC instead of Babel** (handled automatically by Nx)
2. **Enable incremental compilation** in TypeScript settings
3. **Keep node_modules clean** with `pnpm prune`
4. **Use disk cache** for pnpm dependencies

### Reduce Build Times

```bash
# Clear outdated caches
npx nx reset --all

# Check which tasks are cached
npx nx show projects api --web

# Force rebuild specific project without caching
npx nx build api --skip-cache
```

### Monitor Memory Usage

If you're experiencing memory issues:

```bash
# Check Node.js heap usage during dev
node --max-old-space-size=4096 node_modules/.bin/nx serve api

# Or use pnpm's built-in cleanup
pnpm store prune
```

---

## Additional Resources

- [Nx Documentation](https://nx.dev) - Official Nx docs
- [NestJS Guide](https://docs.nestjs.com) - Backend framework docs
- [React Docs](https://react.dev) - Frontend framework reference
- [Prisma Docs](https://www.prisma.io/docs) - ORM documentation
- [PNPM Docs](https://pnpm.io) - Package manager guide

---

*Document Version: 1.0.0*  
*Last Updated: 2024*