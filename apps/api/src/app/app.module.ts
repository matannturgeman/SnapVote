import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-labs/nestjs-ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '@libs/server-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelemetryInterceptor } from './telemetry/telemetry.interceptor';
import { TelemetryService } from './telemetry/telemetry.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST,
        port: +(process.env.REDIS_PORT || 6379),
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: +(process.env.DATABASE_PORT || 5432),
      username: process.env.DATABASE_USER || 'nxuser',
      password: process.env.DATABASE_PASS || 'nxpass',
      database: process.env.DATABASE_NAME || 'nxdb',
      autoLoadEntities: true,
      synchronize: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/nxdb',
    ),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TelemetryService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TelemetryInterceptor,
    },
  ],
})
export class AppModule {}
