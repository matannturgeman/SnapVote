# Testing Documentation

## Overview

This document provides comprehensive details about the testing strategy and tooling used in this Nx monorepo project. The project leverages multiple testing frameworks to ensure quality across unit tests, integration tests, and end-to-end tests while maintaining speed through intelligent caching and selective test execution.

---

## Table of Contents

1. [Testing Architecture](#testing-architecture)
2. [Jest for Backend Libraries](#jest-for-backend-libraries)
3. [Vitest for Frontend](#vitest-for-frontend)
4. [Playwright E2E Testing](#playwright-e2e-testing)
5. [Test Strategies per Layer](#test-strategies-per-layer)
6. [Coverage Goals](#coverage-goals)
7. [Running Tests](#running-tests)
8. [Writing Good Tests](#writing-good-tests)
9. [Test Infrastructure](#test-infrastructure)

---

## Testing Architecture

### Multi-Runner Strategy

This project uses a multi-runner approach to optimize test execution across different types:

| Test Type | Runner | Framework | Location |
|-----------|--------|-----------|----------|
| Backend Libraries | Jest | @nestjs/testing | `libs/*`, `apps/api` |
| Frontend Components | Vitest | Testing Library | `apps/client`, `libs/ui` |
| End-to-End | Playwright | Chromium/Firefox/WebKit | `*-e2e` applications |

### Nx Test Plugins

The workspace is configured with these official Nx plugins for test orchestration:

```json
{
  "plugins": [
    {
      "plugin": "@nx/jest/plugin",
      "options": {
        "targetName": "test"
      }
    },
    {
      "plugin": "@nx/vite/plugin",
      "options": {
        "testTargetName": "test"
      }
    },
    {
      "plugin": "@nx/playwright/plugin",
      "options": {
        "targetName": "e2e"
      }
    }
  ]
}
```

---

## Jest for Backend Libraries

### Configuration Location

Jest is configured in these locations:

- **Root**: `jest.preset.js` - Shared Jest preset configuration
- **API Application**: `apps/api/jest.config.cts` - API-specific test setup
- **Client Application**: `apps/client/jest.config.cts` - Client-specific test setup
- **Libraries**: Each library can have its own `jest.config.ts`

### Root Jest Preset

The root preset shared across projects:

```typescript
// jest.preset.js
export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/prisma/client/#client',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    '**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.nx/**',
  ],
};
```

### Jest Setup File

```typescript
// jest.setup.ts
import '@testing-library/jest-dom';

// Mock browser APIs if needed for component tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
});

// Mock Redis for API tests
jest.mock('ioredis', () => {
  return {
    default: {
      get: jest.fn(),
      set: jest.fn(),
    },
  };
});
```

### Backend Testing Example

```typescript
// libs/backend-data-access/src/lib/users.repository.spec.ts
import { describe, it, expect } from '@jest/globals';
import { PrismaRepository } from './users.repository';

describe('PrismaRepository', () => {
  it('should be created with prisma service', () => {
    const repository = new PrismaRepository({ findMany: jest.fn(), create: jest.fn() });
    expect(repository).toBeDefined();
  });

  it('should call findMany with correct parameters', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([
      { id: 1, email: 'test@example.com' },
    ]);

    const repository = new PrismaRepository({ findMany: mockFindMany });
    
    await repository.findAll();
    
    expect(mockFindMany).toHaveBeenCalledWith({ where: {} });
  });
});
```

---

## Vitest for Frontend

### Vite Integration

Vitest is integrated with Vite's module resolution and hot module replacement, making it ideal for frontend testing:

- Located in `apps/client/vite.config.mts`
- Uses same Vite config as production builds
- Shares type definitions with React development

### Vitest Configuration

```typescript
// apps/client/vite.config.mts (Vitest integration)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
}));
```

### Frontend Testing Example

```typescript
// apps/client/src/app/components/user-card/user-card.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserCard from './user-card';

describe('UserCard', () => {
  const defaultProps = {
    user: {
      id: 1,
      email: 'test@example.com',
      name: 'John Doe',
    },
  };

  it('renders user email when provided', () => {
    render(<UserCard user={defaultProps.user} />);
    
    expect(screen.getByText(defaultProps.user.email)).toBeInTheDocument();
  });

  it('displays name if available', () => {
    render(<UserCard user={defaultProps.user} />);
    
    expect(screen.getByText(defaultProps.user.name)).toBeInTheDocument();
  });

  it('shows fallback text when no name', () => {
    const userWithoutName = { ...defaultProps.user, name: null };
    
    render(<UserCard user={userWithoutName} />);
    
    expect(screen.getByText('No name provided')).toBeInTheDocument();
  });
});
```

---

## Playwright E2E Testing

### Configuration Location

End-to-end tests are managed through the Playwright plugin:

- **Configuration**: Located in `apps/client-e2e/playwright.config.ts`
- **Tests**: Stored in `apps/client-e2e/src/` directory
- **Fixtures**: Test setup and teardown in `playwright.config.ts`

### Playwright Setup

```typescript
// apps/client-e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

### E2E Test Example

```typescript
// apps/client-e2e/src/user-profile.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/users/profile');
  });

  test('should display user dashboard', async ({ page }) => {
    // Verify page loads successfully
    await expect(page).toHaveTitle(/Dashboard/);
    
    // Check that user info is visible
    const nameElement = page.locator('.user-name');
    await expect(nameElement).toBeVisible();
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/settings');
    
    const title = page.title();
    await expect(title).toContain('Settings');
  });

  test('should submit form validation', async ({ page }) => {
    // Fill out and submit a form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

---

## Test Strategies per Layer

### Backend API Testing (NestJS)

**Strategy**: Unit tests for services and repositories, integration tests for controllers.

```typescript
// apps/api/src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { Repository } from 'typeorm';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    prismaMock = new PrismaService() as jest.Mocked<PrismaService>;
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, PrismaService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find user by email', async () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.findByEmail('test@example.com');
    
    expect(result).toEqual(mockUser);
    expect(prismaMock.user.findUnique).toHaveBeenCalled();
  });
});
```

### Frontend Client Testing (React)

**Strategy**: Component testing with React Testing Library, testing user interactions.

```typescript
// apps/client/src/app/components/login-form/login-form.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './login-form';
import axios from 'axios';

describe('LoginForm', () => {
  const mockLogin = jest.fn().mockResolvedValue({ token: 'test-token' });

  beforeEach(() => {
    mockLogin.mockClear();
    jest.spyOn(axios, 'post').mockImplementation(mockLogin);
  });

  it('renders login form fields', async () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('submits form on login button click', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });
    
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(submitButton);
    
    expect(axios.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('displays error message on failed login', async () => {
    mockLogin.mockResolvedValueOnce({ response: { status: 401 } });
    
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });
    
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'wrong-password');
    await userEvent.click(submitButton);
    
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

---

## Coverage Goals

### Minimum Coverage Targets

| Project | Framework | Coverage Goal | Critical Paths |
|---------|-----------|---------------|----------------|
| Backend Libraries (libs/*) | Jest | 80% | Business logic, error handling |
| Frontend Components (libs/ui) | Vitest/RTL | 75% | Props, user interactions |
| API Application | Jest | 70% | Controller routes, services |
| Client Application | Vitest | 70% | Component rendering, navigation |

### Coverage Configuration

```typescript
// jest.config.ts coverage settings
module.exports = {
  // ... other config
  coverage: {
    reporter: ['text', 'json', 'lcov'],
    reportsDirectory: '../../coverage/libs/backend-data-access',
    exclude: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/__tests__/**',
      '**/node_modules/**',
    ],
  },
};
```

### Coverage Command Examples

```bash
# Run tests with coverage for specific project
npx nx test api --coverage
npx nx test client --coverage

# View coverage report in browser
open coverage/report.html

# Generate coverage summary
npx nx test client --coverage --reporters=default --reporters=jest-junit
```

---

## Running Tests

### Command Reference

| Command | Description | Default Target |
|---------|-------------|----------------|
| `pnpm test` | Run tests for all projects | Jest/Vitest |
| `npx nx test <project>` | Test single project | Jest/Vitest |
| `npx nx e2e <project>` | Run Playwright E2E tests | playwright |
| `npx nx test --coverage` | Generate coverage report | All frameworks |

### Common Commands

```bash
# Run all tests
pnpm test

# Run API tests only
npx nx test api

# Run client tests only  
npx nx test client

# Run with coverage
pnpm test -- --coverage

# Watch mode for development
npx nx test api --watch
npx nx test client --watch

# Run specific test file
npx nx test api --testPathPattern=users.service.spec.ts

# Run e2e tests
npx nx e2e client-e2e

# Clean and re-run tests
npx nx reset && pnpm test
```

---

## Writing Good Tests

### TDD Guidelines

1. **Test Happy Path First**: Write tests for success scenarios before edge cases
2. **Mock External Dependencies**: Use `jest.fn()` or Vitest mocks for API calls
3. **Isolate Components**: Test one concept per file
4. **Descriptive Test Names**: Use format `{action on component} {expected result}`

### Example Structure

```typescript
// Good test structure
import { describe, it, expect } from 'vitest';
import Component from './component';

describe('Component', () => {
  it('renders with default props', () => {});
  it('handles user interactions', () => {});
  it('displays error on invalid input', () => {});
  it('loads async data correctly', () => {});
});
```

### Mocking Best Practices

```typescript
// ✅ Good: Mock specific functions needed
jest.mock('axios');
const mockedAxios = require('axios');

mockedAxios.get.mockResolvedValue({ data: { users: [] } });
await component();
expect(mockedAxios.get).toHaveBeenCalled();

// ❌ Bad: Don't mock internal implementation details
jest.spyOn(internalUtil, 'processData').mockReturnValue([]);
```

---

## Test Infrastructure

### CI Integration Example

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run tests
        run: pnpm test
      
      - name: Run linting
        run: pnpm lint
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

*Document Version: 1.0.0*  
*Last Updated: 2024*
</think>

# Testing Documentation

## Overview

This document provides comprehensive details about the testing strategy and tooling used in this Nx monorepo project. The project leverages multiple testing frameworks to ensure quality across unit tests, integration tests, and end-to-end tests while maintaining speed through intelligent caching and selective test execution.

---

## Table of Contents

1. [Testing Architecture](#testing-architecture)
2. [Jest for Backend Libraries](#jest-for-backend-libraries)
3. [Vitest for Frontend](#vitest-for-frontend)
4. [Playwright E2E Testing](#playwright-e2e-testing)
5. [Test Strategies per Layer](#test-strategies-per-layer)
6. [Coverage Goals](#coverage-goals)
7. [Running Tests](#running-tests)
8. [Writing Good Tests](#writing-good-tests)
9. [Test Infrastructure](#test-infrastructure)

---

## Testing Architecture

### Multi-Runner Strategy

This project uses a multi-runner approach to optimize test execution across different types:

| Test Type | Runner | Framework | Location |
|-----------|--------|-----------|----------|
| Backend Libraries | Jest | @nestjs/testing | `libs/*`, `apps/api` |
| Frontend Components | Vitest | Testing Library | `apps/client`, `libs/ui` |
| End-to-End | Playwright | Chromium/Firefox/WebKit | `*-e2e` applications |

### Nx Test Plugins

The workspace is configured with these official Nx plugins for test orchestration:

```json
{
  "plugins": [
    {
      "plugin": "@nx/jest/plugin",
      "options": {
        "targetName": "test"
      }
    },
    {
      "plugin": "@nx/vite/plugin",
      "options": {
        "testTargetName": "test"
      }
    },
    {
      "plugin": "@nx/playwright/plugin",
      "options": {
        "targetName": "e2e"
      }
    }
  ]
}
```

---

## Jest for Backend Libraries

### Configuration Location

Jest is configured in these locations:

- **Root**: `jest.preset.js` - Shared Jest preset configuration
- **API Application**: `apps/api/jest.config.cts` - API-specific test setup
- **Client Application**: `apps/client/jest.config.cts` - Client-specific test setup
- **Libraries**: Each library can have its own `jest.config.ts`

### Root Jest Preset

The root preset shared across projects:

```typescript
// jest.preset.js
export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/prisma/client/#client',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    '**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.nx/**',
  ],
};
```

### Jest Setup File

```typescript
// jest.setup.ts
import '@testing-library/jest-dom';

// Mock browser APIs if needed for component tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
});

// Mock Redis for API tests
jest.mock('ioredis', () => {
  return {
    default: {
      get: jest.fn(),
      set: jest.fn(),
    },
  };
});
```

### Backend Testing Example

```typescript
// libs/backend-data-access/src/lib/users.repository.spec.ts
import { describe, it, expect } from '@jest/globals';
import { PrismaRepository } from './users.repository';

describe('PrismaRepository', () => {
  it('should be created with prisma service', () => {
    const repository = new PrismaRepository({ findMany: jest.fn(), create: jest.fn() });
    expect(repository).toBeDefined();
  });

  it('should call findMany with correct parameters', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([
      { id: 1, email: 'test@example.com' },
    ]);

    const repository = new PrismaRepository({ findMany: mockFindMany });
    
    await repository.findAll();
    
    expect(mockFindMany).toHaveBeenCalledWith({ where: {} });
  });
});
```

---

## Vitest for Frontend

### Vite Integration

Vitest is integrated with Vite's module resolution and hot module replacement, making it ideal for frontend testing:

- Located in `apps/client/vite.config.mts`
- Uses same Vite config as production builds
- Shares type definitions with React development

### Vitest Configuration

```typescript
// apps/client/vite.config.mts (Vitest integration)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
}));
```

### Frontend Testing Example

```typescript
// apps/client/src/app/components/user-card/user-card.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserCard from './user-card';

describe('UserCard', () => {
  const defaultProps = {
    user: {
      id: 1,
      email: 'test@example.com',
      name: 'John Doe',
    },
  };

  it('renders user email when provided', () => {
    render(<UserCard user={defaultProps.user} />);
    
    expect(screen.getByText(defaultProps.user.email)).toBeInTheDocument();
  });

  it('displays name if available', () => {
    render(<UserCard user={defaultProps.user} />);
    
    expect(screen.getByText(defaultProps.user.name)).toBeInTheDocument();
  });

  it('shows fallback text when no name', () => {
    const userWithoutName = { ...defaultProps.user, name: null };
    
    render(<UserCard user={userWithoutName} />);
    
    expect(screen.getByText('No name provided')).toBeInTheDocument();
  });
});
```

---

## Playwright E2E Testing

### Configuration Location

End-to-end tests are managed through the Playwright plugin:

- **Configuration**: Located in `apps/client-e2e/playwright.config.ts`
- **Tests**: Stored in `apps/client-e2e/src/` directory
- **Fixtures**: Test setup and teardown in `playwright.config.ts`

### Playwright Setup

```typescript
// apps/client-e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

### E2E Test Example

```typescript
// apps/client-e2e/src/user-profile.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/users/profile');
  });

  test('should display user dashboard', async ({ page }) => {
    // Verify page loads successfully
    await expect(page).toHaveTitle(/Dashboard/);
    
    // Check that user info is visible
    const nameElement = page.locator('.user-name');
    await expect(nameElement).toBeVisible();
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/settings');
    
    const title = page.title();
    await expect(title).toContain('Settings');
  });

  test('should submit form validation', async ({ page }) => {
    // Fill out and submit a form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

---

## Test Strategies per Layer

### Backend API Testing (NestJS)

**Strategy**: Unit tests for services and repositories, integration tests for controllers.

```typescript
// apps/api/src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { Repository } from 'typeorm';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    prismaMock = new PrismaService() as jest.Mocked<PrismaService>;
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, PrismaService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find user by email', async () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.findByEmail('test@example.com');
    
    expect(result).toEqual(mockUser);
    expect(prismaMock.user.findUnique).toHaveBeenCalled();
  });
});
```

### Frontend Client Testing (React)

**Strategy**: Component testing with React Testing Library, testing user interactions.

```typescript
// apps/client/src/app/components/login-form/login-form.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './login-form';
import axios from 'axios';

describe('LoginForm', () => {
  const mockLogin = jest.fn().mockResolvedValue({ token: 'test-token' });

  beforeEach(() => {
    mockLogin.mockClear();
    jest.spyOn(axios, 'post').mockImplementation(mockLogin);
  });

  it('renders login form fields', async () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('submits form on login button click', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });
    
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(submitButton);
    
    expect(axios.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('displays error message on failed login', async () => {
    mockLogin.mockResolvedValueOnce({ response: { status: 401 } });
    
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });
    
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'wrong-password');
    await userEvent.click(submitButton);
    
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

---

## Coverage Goals

### Minimum Coverage Targets

| Project | Framework | Coverage Goal | Critical Paths |
|---------|-----------|---------------|----------------|
| Backend Libraries (libs/*) | Jest | 80% | Business logic, error handling |
| Frontend Components (libs/ui) | Vitest/RTL | 75% | Props, user interactions |
| API Application | Jest | 70% | Controller routes, services |
| Client Application | Vitest | 70% | Component rendering, navigation |

### Coverage Configuration

```typescript
// jest.config.ts coverage settings
module.exports = {
  // ... other config
  coverage: {
    reporter: ['text', 'json', 'lcov'],
    reportsDirectory: '../../coverage/libs/backend-data-access',
    exclude: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/__tests__/**',
      '**/node_modules/**',
    ],
  },
};
```

### Coverage Command Examples

```bash
# Run tests with coverage for specific project
npx nx test api --coverage
npx nx test client --coverage

# View coverage report in browser
open coverage/report.html

# Generate coverage summary
npx nx test client --coverage --reporters=default --reporters=jest-junit
```

---

## Running Tests

### Command Reference

| Command | Description | Default Target |
|---------|-------------|----------------|
| `pnpm test` | Run tests for all projects | Jest/Vitest |
| `npx nx test <project>` | Test single project | Jest/Vitest |
| `npx nx e2e <project>` | Run Playwright E2E tests | playwright |
| `npx nx test --coverage` | Generate coverage report | All frameworks |

### Common Commands

```bash
# Run all tests
pnpm test

# Run API tests only
npx nx test api

# Run client tests only  
npx nx test client

# Run with coverage
pnpm test -- --coverage

# Watch mode for development
npx nx test api --watch
npx nx test client --watch

# Run specific test file
npx nx test api --testPathPattern=users.service.spec.ts

# Run e2e tests
npx nx e2e client-e2e

# Clean and re-run tests
npx nx reset && pnpm test
```

---

## Writing Good Tests

### TDD Guidelines

1. **Test Happy Path First**: Write tests for success scenarios before edge cases
2. **Mock External Dependencies**: Use `jest.fn()` or Vitest mocks for API calls
3. **Isolate Components**: Test one concept per file
4. **Descriptive Test Names**: Use format `{action on component} {expected result}`

### Example Structure

```typescript
// Good test structure
import { describe, it, expect } from 'vitest';
import Component from './component';

describe('Component', () => {
  it('renders with default props', () => {});
  it('handles user interactions', () => {});
  it('displays error on invalid input', () => {});
  it('loads async data correctly', () => {});
});
```

### Mocking Best Practices

```typescript
// ✅ Good: Mock specific functions needed
jest.mock('axios');
const mockedAxios = require('axios');

mockedAxios.get.mockResolvedValue({ data: { users: [] } });
await component();
expect(mockedAxios.get).toHaveBeenCalled();

// ❌ Bad: Don't mock internal implementation details
jest.spyOn(internalUtil, 'processData').mockReturnValue([]);
```

---

## Test Infrastructure

### CI Integration Example

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run tests
        run: pnpm test
      
      - name: Run linting
        run: pnpm lint
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

*Document Version: 1.0.0*  
*Last Updated: 2024*