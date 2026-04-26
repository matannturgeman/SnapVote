import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-labs/nestjs-ioredis';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@libs/server-auth';
import { PollModule } from '@libs/server-poll';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelemetryInterceptor } from './telemetry/telemetry.interceptor';
import { TelemetryService } from './telemetry/telemetry.service';
import { HealthModule } from './health/health.module';
import { RATE_LIMITS } from '@libs/server-shared';

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
    ThrottlerModule.forRoot([
      {
        name: 'votes',
        ttl: RATE_LIMITS.VOTES.TTL * 1000,
        limit: RATE_LIMITS.VOTES.LIMIT,
      },
      {
        name: 'auth_login',
        ttl: RATE_LIMITS.AUTH_LOGIN.TTL * 1000,
        limit: RATE_LIMITS.AUTH_LOGIN.LIMIT,
      },
      {
        name: 'auth_register',
        ttl: RATE_LIMITS.AUTH_REGISTER.TTL * 1000,
        limit: RATE_LIMITS.AUTH_REGISTER.LIMIT,
      },
      {
        name: 'share_link_create',
        ttl: RATE_LIMITS.SHARE_LINK_CREATE.TTL * 1000,
        limit: RATE_LIMITS.SHARE_LINK_CREATE.LIMIT,
      },
      {
        name: 'poll_create',
        ttl: RATE_LIMITS.POLL_CREATE.TTL * 1000,
        limit: RATE_LIMITS.POLL_CREATE.LIMIT,
      },
      {
        name: 'report_create',
        ttl: RATE_LIMITS.REPORT_CREATE.TTL * 1000,
        limit: RATE_LIMITS.REPORT_CREATE.LIMIT,
      },
    ]),
    AuthModule,
    PollModule,
    HealthModule,
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
