# API Documentation Guide

## Overview

This document provides comprehensive details about **API documentation** using **Swagger/OpenAPI specification** generated automatically by NestJS in this Nx monorepo project. The API is fully documented with request/response schemas, parameter descriptions, and example responses to help both developers and consumers understand the available endpoints.

---

## Table of Contents

1. [Swagger Setup Overview](#swagger-setup-overview)
2. [Installing NestJS Swagger](#installing-nestjs-swagger)
3. [Configuration Files](#configuration-files)
4. [Documenting Controllers](#documenting-controllers)
5. [Common Annotations](#common-annotations)
6. [Generating API Documentation](#generating-api-documentation)
7. [Customizing the UI](#customizing-the-ui)
8. [Best Practices](#best-practices)

---

## Swagger Setup Overview

### Automatic Documentation Generation

NestJS automatically generates OpenAPI/Swagger documentation based on decorators and DTOs defined in your controllers and services. This means you don't need to write manual documentation for every endpoint.

### Default Documentation Endpoints

When the NestJS application starts with Swagger enabled, these endpoints are automatically available:

- **`/swagger.json`** - OpenAPI 3.0 specification in JSON format
- **`/api-docs`** or **`/api/swagger.yaml`** - Swagger UI web interface
- **`/openapi.json`** - OpenAPI specification in YAML format (for CI/CD validation)

### Visual Preview Example

```
┌─────────────────────────────────────┐
│   Browser: http://localhost:3000    │
│   ─────────────────────────────────  │
│   API Docs                        /swagger.json  │
│      ─────────────────────────     /api-docs      │
│                                     /openapi.json │
└─────────────────────────────────────┘
                  ↓
        Swagger UI Interface (HTML)
         Interactive API Explorer
```

---

## Installing NestJS Swagger

### Required Packages

The root `package.json` already includes these dependencies:

```json
{
  "dependencies": {
    "@nestjs/swagger": "11.2.6",
    "swagger-ui-express": "5.0.1"
  }
}
```

### Setup in NestJS Application

Add Swagger to your API application's module:

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UsersModule,
    ProductsModule,
    
    // Swagger documentation module
    SwaggerModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        enabled: configService.get('SWAGGER_ENABLED', true),
        document: configService.get('SWAGGER_DOCUMENT_PATH') || '/api-docs',
        title: 'Nx Monorepo API',
        description: 'API documentation for the Nx monorepo project',
        version: '1.0.0',
      }),
    }),
  ],
})
export class AppModule {}
```

### Conditional Swagger (Development Only)

For production environments, you can disable Swagger with an environment variable:

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import * as swaggerUi from 'swagger-ui-express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Only enable Swagger in development or explicitly enabled
  if (process.env.NODE_ENV === 'development') {
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(app.get(DocumentBuilder).build()),
    );
  }
  
  await app.listen(3000);
}
bootstrap();
```

---

## Documenting Controllers

### Creating a Controller with Full Documentation

Each endpoint should be documented with these decorators:

```typescript
// apps/api/src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Fetch all users with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1, type: Number })
  @ApiQuery({ name: 'limit', required: false, example: 10, type: Number })
  @ApiResponse({ status: 200, description: 'Users fetched successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<any> {
    return this.usersService.findAll({ page, limit });
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'User ID to fetch' })
  @ApiOperation({ summary: 'Fetch a single user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.usersService.findById(parseInt(id));
  }

  @Post()
  @ApiBody({ schema: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto): Promise<any> {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'User ID to update' })
  @ApiBody({ schema: UpdateUserDto, required: false })
  @ApiOperation({ summary: 'Partial update of user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<any> {
    return this.usersService.update(parseInt(id), updateUserDto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'User ID to delete' })
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(parseInt(id));
  }
}
```

---

## Common Annotations

### `@ApiTags` - Grouping Endpoints

Groups related endpoints for better organization in the UI:

```typescript
@ApiTags('authentication')  // Group all auth endpoints
@Controller('auth')
export class AuthController {}

@ApiTags('users', 'admin')  // Multiple tags possible
@Controller('admin/users')
export class AdminUserController {}
```

### `@ApiOperation` - Describing Operations

Provides summary and details for specific operations:

```typescript
@ApiOperation({ 
  summary: 'Create a new user',
  description: 'Creates a new user account with the provided information. Returns the created user with generated ID.',
})
@Post()
async create(@Body() createUserDto: CreateUserDto) {}
```

### `@ApiResponse` - Documenting Responses

Documents all possible responses including success and errors:

```typescript
@ApiResponse({ 
  status: 200, 
  description: 'Users fetched successfully',
  type: PaginatedResult,
  schema: {
    example: {
      items: [],
      totalItems: 0,
      pageNumber: 1,
      pageSize: 10,
    },
  },
})

@ApiResponse({ 
  status: 404, 
  description: 'User not found',
  schema: {
    example: { statusCode: 404, message: 'User not found' },
  },
})

@ApiResponse({ 
  status: 500, 
  description: 'Internal server error',
})
```

### `@ApiBody` - Request Body Schema

Documents the request body for POST/PUT/PATCH operations:

```typescript
@Post()
@ApiBody({
  schema: CreateUserDto,
  examples: {
    'application/json': {
      summary: 'New user creation',
      value: {
        email: 'john@example.com',
        name: 'John Doe',
      },
    },
  },
})
async create(@Body() createUserDto: CreateUserDto) {}
```

### `@ApiParam` - Path Parameters

Documents parameters in the URL path:

```typescript
@Get(':id')
@ApiParam({
  name: 'id',
  description: 'The ID of the user to fetch',
  example: '42',
})
async findOne(@Param('id') id: string) {}
```

### `@ApiQuery` - Query Parameters

Documents query string parameters for GET requests:

```typescript
@Get()
@ApiQuery({
  name: 'page',
  required: false,
  description: 'Page number for pagination',
  example: 1,
})
@ApiQuery({
  name: 'limit',
  required: false,
  description: 'Number of items per page',
  example: 10,
})
async findAll() {}
```

### `@ApiResponse with examples` - Documenting Examples

Provide example responses for different scenarios:

```typescript
@ApiResponse({
  status: 201,
  description: 'User created successfully',
  schema: {
    example: {
      id: 42,
      email: 'john@example.com',
      name: 'John Doe',
      createdAt: new Date().toISOString(),
    },
  },
})
```

---

## Generating API Documentation

### Build and Serve with Swagger

When building for production, Swagger documentation is included in the build output:

```bash
# Build API application (includes Swagger)
pnpm build:api

# The generated file will include swagger.json and OpenAPI spec
ls -la dist/apps/api/swagger.json
```

### Serve Documentation Only

You can serve just the Swagger UI for browser-based documentation viewing:

```bash
# Start with documentation
npx nx serve api --watch

# Access at http://localhost:3000/api-docs
```

### Generate Static Documentation

For hosting API docs on a separate server, generate static files:

```bash
# Generate OpenAPI spec
npx nx run api:build
npx swagger-ui-dist/cli copy -s apps/api/dist/swagger.json -d docs/api-docs/
```

---

## Customizing the UI

### Custom Swagger Configuration

Customize the Swagger UI appearance and behavior:

```typescript
// apps/api/src/swagger.config.ts
import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerOptions = new DocumentBuilder()
  .setTitle('Nx Monorepo API')
  .setDescription('Complete API documentation for this monorepo')
  .setVersion('1.0.0')
  .addTag('users', 'User management operations')
  .addBearerAuth() // Enable OAuth bearer auth example
  .build();
```

### Add Additional Headers

Add security headers or other customizations:

```typescript
// apps/api/src/main.ts
const options = swaggerUi.createSecurityRequire(
  { apiKey: {} },
  [],
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(options));
```

---

## Best Practices

### 1. Document All Public Endpoints

Every endpoint that external consumers can access should be documented:

- ✅ Use `@ApiOperation` to describe what the operation does
- ✅ Use `@ApiResponse` to document all possible responses
- ✅ Use `@ApiBody` for request schemas on POST/PUT/PATCH operations
- ❌ Don't skip documentation just because it's "internal use" only

### 2. Keep Documentation in Sync with Code

When modifying endpoints, update their decorators:

```typescript
// Before changing this controller method
@Get(':id')
async findOne(@Param('id') id: string) {}

// After modifying to support filtering
@Get()
@ApiQuery({ name: 'status', example: 'active' })
async findAll(@Query('status') status?: string) {}
```

### 3. Use DTOs for Request Validation

Always create TypeScript DTOs and reference them in `@ApiBody`:

```typescript
// apps/api/src/dto/create-user.dto.ts
import { IsEmail, MaxLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @MaxLength(100)
  name?: string | null;
}

// Then reference in controller
@Post()
@ApiBody({ schema: CreateUserDto })
async create(@Body() createUserDto: CreateUserDto) {}
```

### 4. Document Pagination Clearly

If endpoints support pagination, document it consistently:

```typescript
@Get()
@ApiQuery({
  name: 'page',
  required: false,
  description: 'Page number (starts at 1)',
  example: 1,
  maximum: 1000,
})
@ApiQuery({
  name: 'limit',
  required: false,
  description: 'Items per page',
  example: 20,
  minimum: 1,
  maximum: 100,
})
async findAll() {}
```

### 5. Use Tags for Namespace Organization

Group related endpoints with the same tags:

```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {}

@ApiTags('orders')
@Controller('orders')
export class OrdersController {}

@ApiTags('admin')
@Controller('admin')
export class AdminController {}
```

---

## Example Documentation Output

When you access `http://localhost:3000/api-docs`, users will see:

### Available Endpoints Table

| Method | Path | Tags | Description |
|--------|------|------|-------------|
| GET | /users/42 | users | Fetch a single user by ID |
| POST | /users/users | users | Create new user account |
| PATCH | /users/:id | users | Partial update of user |

### Request Schema Examples

```json
{
  "requestBody": {
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/CreateUserDto"
        }
      }
    }
  }
}
```

### Response Schema Examples

```json
{
  "responses": {
    "201": {
      "description": "User created successfully",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/User"
          },
          "example": {
            "id": 42,
            "email": "john@example.com",
            "name": "John Doe",
            "createdAt": "2024-01-15T10:30:00.000Z"
          }
        }
      }
    }
  }
}
```

---

## Related Documentation

- [NestJS Swagger Official Docs](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification](https://github.com/OAI/OpenAPI-Specification)
- [Swagger UI Configuration Options](https://swagger.io/docs/open-source-tools/swagger-ui/)

---

*Document Version: 1.0.0*  
*Last Updated: 2024*