import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { PasswordResetMailerService } from './password-reset-mailer.service';
import { CloudinaryService, CLOUDINARY } from './cloudinary.service';
import { StorageService } from './storage.service';

/**
 * AuthModule
 *
 * Registers the JwtAuthGuard globally so every route is protected by default.
 * Mark individual routes or controllers as public with the @Public() decorator.
 */
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetMailerService,
    CloudinaryService,
    StorageService,
    {
      provide: CLOUDINARY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        cloudinary.config({
          cloud_name: config.get<string>('CLOUDINARY_CLOUD_NAME'),
          api_key: config.get<string>('CLOUDINARY_API_KEY'),
          api_secret: config.get<string>('CLOUDINARY_API_SECRET'),
        });
        return cloudinary;
      },
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
