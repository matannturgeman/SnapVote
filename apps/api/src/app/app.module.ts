import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-labs/nestjs-ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '@libs/server-auth';
import { PollModule } from '@libs/server-poll';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelemetryInterceptor } from './telemetry/telemetry.interceptor';
import { TelemetryService } from './telemetry/telemetry.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        config: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get<string>('DATABASE_USER', 'nxuser'),
        password: config.get<string>('DATABASE_PASS', 'nxpass'),
        database: config.get<string>('DATABASE_NAME', 'nxdb'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI', 'mongodb://localhost:27017/nxdb'),
      }),
    }),
    AuthModule,
    PollModule,
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
