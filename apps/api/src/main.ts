/**
 * NX NestJS API Application Entry Point
 *
 * This script loads environment variables and starts the NestJS server.
 * Environment variables are loaded from nx-project/.env or nx-project/.env.local
 */

import 'dotenv/config'; // Load env vars from parent directory before importing other modules
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from '@libs/server-data-access';
import { AppModule } from './app/app.module';

async function bootstrap() {
  // Validate required environment variables
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const host = process.env.HOST || 'localhost';

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║       NX NestJS API Server is starting...         ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`\n📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Host: ${host}`);
  console.log(`📍 Port: ${port}`);
  console.log('\n--- Server Configuration ---');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Apply global exception filter for Swagger error handling
  app.useGlobalFilters(new AllExceptionsFilter());

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NX NestJS Template API')
    .setDescription('API documentation with Swagger UI')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api', app, document);

  // Enable CORS for all origins (adjust if needed for production)
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Origin, Content-Type, Accept, Authorization',
    exposedHeaders: true,
    credentials: true,
  });

  // Set global prefix for API routes
  const globalPrefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(globalPrefix);

  try {
    // Start the server
    await app.listen(port, host);

    console.log(`\n--- Server Addresses ---`);
    console.log(
      `🚀 API Server running at: http://${host}:${port}/${globalPrefix}`,
    );
    console.log(`📚 Swagger Documentation: http://${host}:${port}/api`);
    console.log('\n');

    // Optional: Log database/redis connection status if available
    try {
      const dbHost = process.env.DATABASE_HOST || 'localhost';
      const redisHost = process.env.REDIS_HOST || 'localhost';
      console.log(`✓ Database configured to connect to: ${dbHost}`);
      console.log(
        `✓ Redis configured to connect to: ${redisHost}:${process.env.REDIS_PORT || 6379}`,
      );
    } catch (error) {
      // Silent fail - database may not be connected yet or config is wrong
    }
  } catch (error) {
    console.error('\n❌ Failed to start server:', error.message);
    console.error(`Error details: ${error.stack}`);
    process.exit(1);
  }
}

// Bootstrap the application
bootstrap();
