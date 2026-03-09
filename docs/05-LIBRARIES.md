# Libraries Documentation

## Overview

This document provides comprehensive details about all **shared libraries** in the Nx monorepo project located in the `libs/` directory. These libraries enable code reuse across applications while maintaining strong type safety through TypeScript project references.

---

## Table of Contents

1. [Library Architecture](#library-architecture)
2. [Shared Types Library](#shared-types-library)
3. [Backend Data Access Library](#backend-data-access-library)
4. [UI Components Library](#ui-components-library)
5. [Validation Schemas Library](#validation-schemas-library)
6. [Shared Utils Library](#shared-utils-library)
7. [Publishing Strategy](#publishing-strategy)
8. [Import Best Practices](#import-best-practices)
9. [Testing Shared Libraries](#testing-shared-libraries)

---

## Library Architecture

### Monorepo Library Benefits

Using libraries in an Nx workspace provides several advantages:

- **Type Safety**: TypeScript project references ensure types flow correctly between projects
- **Code Reuse**: Write once, use across frontend and backend applications
- **Version Control**: Libraries can be versioned independently with `nx release`
- **Selective Builds**: Only changed libraries rebuild automatically
- **Shared Dependencies**: Deduplication saves disk space

### Library Directory Structure

```
libs/
├── backend-data-access/   # Database logic and repositories
├── shared-types/          # Common TypeScript interfaces/types
├── shared-utils/          # Utility functions and helpers
├── ui/                    # Reusable React components
└── validation-schemas/    # Zod schemas for validation
```

### Library Types in Nx

Each library can be of two types:

- **Private Library**: Used internally, not published to npm
- **Publishable Library**: Can be published as an npm package with `@my-org/` scope

The project generators are configured for this via `nx.json`:

```json
{
  "generators": {
    "@nx/react": {
      "library": {
        "style": "scss",
        "linter": "eslint",
        "unitTestRunner": "jest"
      }
    }
  }
}
```

---

## Shared Types Library

### Location and Purpose

Located at `libs/shared-types/`, this library contains:

- **Common TypeScript interfaces** shared between frontend and backend
- **Type definitions** for API response structures
- **DTOs (Data Transfer Objects)** as type-only exports
- **Shared utility types** like `PaginatedResult<T>`, `FilterParams<T>`

### Example Shared Types

```typescript
// libs/shared-types/src/lib/common.types.ts

export interface UserDto {
  id: number;
  email: string;
  name?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  totalItems: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export type FilterParams<T extends Record<string, any>> = Partial<keyof T>;
```

### Importing Shared Types

Import types from the shared library using the scoped package name:

```typescript
// Frontend component
import { UserDto, PaginatedResult } from '@org/shared-types';

// Backend controller
import { FilterParams } from '@org/shared-types';
```

### Best Practices for Shared Types

1. **Keep Types Pure**: No runtime dependencies, only TypeScript interfaces
2. **Document Extensively**: Use JSDoc comments for all public types
3. **Export Named Exports**: Prefer named exports over wildcard imports
4. **Version When Changing Breaking APIs**: Maintain backward compatibility
5. **No Implementations**: Shared types should be interfaces only

---

## Backend Data Access Library

### Location and Purpose

Located at `libs/backend-data-access/`, this library handles:

- **Database repositories** for both PostgreSQL (Prisma) and MongoDB (Mongoose)
- **Data access logic** abstracted from controllers
- **Generic repository patterns** with type safety
- **Custom queries** that are reusable across features

### Repository Pattern Implementation

```typescript
// libs/backend-data-access/src/lib/users.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: FilterParams<Partial<UserData>>) {
    return this.prisma.user.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { posts: true }, // eager loading relationships
    });
  }

  async create(data: CreateUserData): Promise<UserData> {
    return this.prisma.user.create({ data, include: { posts: true } });
  }

  async update(id: number, data: UpdateUserData): Promise<UserData> {
    return this.prisma.user.update({ where: { id }, data });
  }
}
```

### Integration with NestJS

The library integrates with NestJS using dependency injection:

```typescript
// In controllers or services
import { UsersRepository } from '@org/backend-data-access';

@Controller('users')
export class UsersController {
  constructor(private usersRepo: UsersRepository) {}
  
  @Get()
  async findAll(): Promise<User[]> {
    return this.usersRepo.findAll();
  }
}
```

### Database Agnostic Design

The repository pattern should be designed to work with multiple databases:

```typescript
// Example of database-agnostic abstraction
export interface UserRepository {
  findAll(filters?: FilterParams): Promise<User[]>;
  findById(id: number): Promise<User | null>;
  create(data: CreateUserDto): Promise<User>;
  update(id: number, data: UpdateUserDto): Promise<User | null>;
  remove(id: number): Promise<void>;
}

// Implementation with Prisma for PostgreSQL
@Injectable()
export class PrismaUsersRepository implements UserRepository {
  // ... implementation using Prisma
}

// Alternative implementation with Mongoose for MongoDB
@Injectable()
export class MongoUsersRepository implements UserRepository {
  // ... implementation using Mongoose
}
```

---

## UI Components Library

### Location and Purpose

Located at `libs/ui/`, this library contains:

- **Reusable React components** for consistent UI across the application
- **Styled with SCSS** following design system guidelines
- **Accessible components** that follow WCAG guidelines
- **Form components** for data entry (inputs, selects, checkboxes)
- **Display components** for showing data (tables, cards, modals)

### Component Structure

Each component follows the Nx and React patterns:

```
libs/ui/
└── src/
    └── lib/
        ├── button/
        │   ├── button.component.tsx
        │   ├── button.styles.scss
        │   └── index.ts
        ├── card/
        │   ├── card.component.tsx
        │   ├── card.styles.scss
        │   └── index.ts
        └── ...
```

### Component Example

```typescript
// libs/ui/src/lib/button/button.component.tsx

import React from 'react';
import { cn } from '@org/shared-utils';
import styles from './button.styles.scss';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  icon,
  ...props
}) => {
  return (
    <button
      className={cn(
        styles.button,
        `variant-${variant}`,
        `size-${size}`,
        className,
      )}
      {...props}
    >
      {icon && <span className="icon">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
```

### SCSS Styling Approach

The UI library uses SCSS with modular organization:

```scss
// libs/ui/src/lib/button/button.styles.scss

$primary-color: #3498db;
$secondary-color: #2ecc71;
$danger-color: #e74c3c;

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &.variant-primary {
    background-color: $primary-color;
    color: white;
  }

  &.variant-secondary {
    background-color: $secondary-color;
    color: white;
  }

  &.variant-danger {
    background-color: $danger-color;
    color: white;
  }

  &.size-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }

  &.size-md {
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }

  &.size-lg {
    padding: 0.75rem 1.5rem;
    font-size: 1.125rem;
  }
}
```

---

## Validation Schemas Library

### Location and Purpose

Located at `libs/validation-schemas/`, this library provides:

- **Zod schemas** for request validation
- **DTO validators** with class-validator decorators
- **Schema reusability** across API endpoints
- **Error messages** that are user-friendly

### Zod Schema Examples

```typescript
// libs/validation-schemas/src/lib/user.schema.ts

import { z } from 'zod';

export const createUserData = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(100, 'Name must be less than 100 characters').optional(),
});

export const updateUserData = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().max(100, 'Name must be less than 100 characters').optional(),
});

export const createUserResponse = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

### DTO Validation Decorators

The library also provides class-based validators with NestJS integration:

```typescript
// libs/validation-schemas/src/lib/users.dto.ts

import { IsEmail, MaxLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @MaxLength(100)
  name?: string | null;
}

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsOptional()
  @MaxLength(100)
  name?: string | null;
}
```

### Using Schemas in Controllers

```typescript
import { CreateUserDto, createUserData } from '@org/validation-schemas';
import { validate } from 'class-validator';

@Controller('users')
export class UsersController {
  @Post()
  async create(@Body() body: CreateUserDto): Promise<UserDto> {
    const validatedPayload = await validate(body);
    // Process with repository...
  }
}
```

---

## Shared Utils Library

### Location and Purpose

Located at `libs/shared-utils/`, this library contains:

- **Utility functions** used across frontend and backend
- **Formatting helpers** for dates, numbers, strings
- **String manipulation** tools for sanitization
- **Error handling helpers** for consistent error messages
- **Type guards** for runtime type checking

### Utility Function Examples

```typescript
// libs/shared-utils/src/lib/strings.ts

export const sanitizeString = (str: string): string => {
  return str.replace(/[<>'"&]/g, '');
};

export const truncateString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
};

// libs/shared-utils/src/lib/formatters.ts

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDate = (date: Date, locale: string = 'en-US'): string => {
  return new Intl.DateTimeFormat(locale).format(date);
};

// libs/shared-utils/src/lib/type-guards.ts

export const isArrayOfType = <T>(
  item: any,
  predicate: (value: unknown) => value is T,
): item is T[] => {
  return Array.isArray(item) && item.every(predicate);
};
```

### Error Helper Functions

```typescript
// libs/shared-utils/src/lib/errors.ts

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public stack?: string,
  ) {
    super(message);
    this.name = 'AppError';
    if (isOperational && process.env.NODE_ENV === 'production') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export const handleValidationError = (errors: any[]): string => {
  return errors
    .map((error) => error.message || 'Validation failed')
    .join(', ');
};
```

---

## Publishing Strategy

### Private vs Publishable Libraries

Libraries in the `libs/` directory can be:

- **Private**: Only used within the monorepo, no published package.json
- **Publishable**: Have a valid npm scope and can be shared externally

### Configuring Libraries for Publishing

To make a library publishable:

1. Add `"publishable": true` to `project.json`
2. Set correct import path in package.json
3. Ensure proper versioning strategy
4. Configure release automation with `nx release`

Example `project.json` configuration:

```json
{
  "name": "ui",
  "$schema": "../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/ui/src",
  "projectType": "library",
  "tags": ["scope:@org", "type:lib"],
  "targets": {
    "build": {
      "defaultConfiguration": "production",
      "dependsOn": ["^build"]
    },
    "publish": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm publish --access public"
      }
    }
  }
}
```

### Version Management

Use semantic versioning for all publishable libraries:

- **Major version**: Breaking changes
- **Minor version**: New features, backward compatible
- **Patch version**: Bug fixes only

---

## Import Best Practices

### Using Workspace Protocol

When importing from other Nx projects, use the workspace protocol:

```typescript
// ✅ Correct - Uses workspace path alias
import { Button } from '@org/ui';
import { UserDto } from '@org/shared-types';

// ❌ Incorrect - Relative imports in monorepo (causes issues)
// import { Button } from '../../libs/ui/src/lib/button/button.component';
```

### Path Aliases Configuration

The `tsconfig.base.json` defines path aliases that Nx automatically syncs:

```json
{
  "compilerOptions": {
    "paths": {
      "@org/shared-types": ["../../libs/shared-types/src/index.ts"],
      "@org/ui": ["../../libs/ui/src/index.ts"],
      "@org/backend-data-access": ["../../libs/backend-data-access/src/index.ts"]
    }
  }
}
```

### Keeping Path References Updated

After changing project structure or renaming projects:

```bash
# Update TypeScript project references
npx nx sync

# Check if all references are up to date
npx nx sync:check
```

---

## Testing Shared Libraries

### Unit Testing with Jest

Each library should have its own test configuration:

```json
{
  "test": {
    "executor": "@nx/jest:jest",
    "outputs": ["coverage"],
    "options": {
      "jestConfig": "libs/shared-types/jest.config.ts",
      "passWithNoTests": true,
      "coverageDirectory": "../../coverage/libs/shared-types"
    }
  }
}
```

### Testing Strategy

| Library Type | Test Framework | Coverage Goal |
|--------------|---------------|----------------|
| shared-types | Jest | N/A (no runtime) |
| backend-data-access | Jest | 80%+ |
| ui | Jest/Vitest | 75%+ |
| validation-schemas | Jest + Playwright | 90%+ schemas |
| shared-utils | Jest | 85%+ |

### Example Test File

```typescript
// libs/shared-types/src/lib/user.dto.spec.ts

import { describe, expect } from '@jest/globals';
import { UserDto } from './user.dto';

describe('UserDto', () => {
  it('should validate user object', () => {
    const validUser: UserDto = {
      id: 1,
      email: 'test@example.com',
      name: 'John Doe',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(validUser).toBeDefined();
    expect(validUser.email).toContain('@');
  });

  it('should have optional name field', () => {
    const userWithoutName: UserDto = {
      id: 2,
      email: 'test2@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(userWithoutName.name).toBeUndefined();
  });
});
```

---

## Conclusion

The Nx monorepo libraries enable efficient code sharing between the frontend client and backend API while maintaining strong type safety. The shared libraries reduce duplication, ensure consistency across the application, and can be independently versioned for external consumption if needed.

### Quick Reference Commands

```bash
# Generate a new UI component
npx nx g @nx/react:component components/NewComponent --lib=ui

# Generate a new utility function
npx nx g @nx/js:function shared-utils:newFunction --project=shared-utils

# Generate validation schema
npx nx g @nx/vite:vite-lib validation-schemas:newSchema --publishable

# Build all libraries
pnpm build:libs

# Test all libraries
pnpm test:libs
```

### Key Takeaways

1. **Keep Libraries Small**: Single responsibility per library folder
2. **Document Everything**: JSDoc comments for public APIs
3. **Test Regularly**: Maintain high coverage on logic-heavy libraries
4. **Version Breaking Changes**: Major version bumps for API changes
5. **Use Workspace Protocol**: Always use scoped imports, never relative paths

---

*Document Version: 1.0.0*  
*Last Updated: 2024*