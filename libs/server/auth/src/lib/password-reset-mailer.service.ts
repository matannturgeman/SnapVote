import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface PasswordResetEmailPayload {
  to: string;
  name?: string | null;
  token: string;
}

const DEFAULT_RESET_URL = 'http://localhost:4200/reset-password';

@Injectable()
export class PasswordResetMailerService {
  private readonly logger = new Logger(PasswordResetMailerService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly configService: ConfigService) {
    this.transporter = this.createTransporter();
  }

  async sendPasswordResetEmail(
    payload: PasswordResetEmailPayload,
  ): Promise<void> {
    if (!this.transporter) {
      const message =
        'SMTP is not configured. Password reset email was not sent.';

      if (this.requireEmailTransport()) {
        throw new Error(message);
      }

      this.logger.warn(message);
      return;
    }

    const from = this.configService.get<string>(
      'SMTP_FROM',
      'no-reply@localhost',
    );
    const resetLink = this.buildResetPasswordLink(payload.token);
    const recipientName = payload.name?.trim() || 'there';
    const escapedRecipientName = this.escapeHtml(recipientName);

    const info = await this.transporter.sendMail({
      from,
      to: payload.to,
      subject: 'Reset your password',
      text: [
        `Hi ${recipientName},`,
        '',
        'We received a request to reset your password.',
        `Use this link to set a new password: ${resetLink}`,
        '',
        'If you did not request this, you can ignore this email.',
      ].join('\n'),
      html: [
        `<p>Hi ${escapedRecipientName},</p>`,
        '<p>We received a request to reset your password.</p>',
        `<p><a href="${resetLink}">Reset your password</a></p>`,
        '<p>If you did not request this, you can ignore this email.</p>',
      ].join(''),
    });

    this.logger.log(
      `Password reset email queued for ${payload.to}. messageId=${info.messageId}`,
    );
  }

  private createTransporter(): nodemailer.Transporter | null {
    const host = this.configService.get<string>('SMTP_HOST');

    if (!host) {
      return null;
    }

    const port = this.parseIntEnv('SMTP_PORT', 587);
    const smtpSecure = this.configService.get<string>('SMTP_SECURE');
    const secure =
      smtpSecure === 'true' || (smtpSecure == null && port === 465);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    const auth = user && pass ? { user, pass } : undefined;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
    });
  }

  private buildResetPasswordLink(token: string): string {
    const configuredBase =
      this.configService.get<string>('AUTH_RESET_PASSWORD_URL_BASE') ??
      this.configService.get<string>('CLIENT_URL') ??
      DEFAULT_RESET_URL;

    try {
      if (configuredBase.includes('{token}')) {
        return configuredBase.replace('{token}', encodeURIComponent(token));
      }

      const url = new URL(configuredBase);
      url.searchParams.set('token', token);
      return url.toString();
    } catch {
      this.logger.warn(
        `Invalid AUTH_RESET_PASSWORD_URL_BASE/CLIENT_URL value: "${configuredBase}". Falling back to default reset URL.`,
      );

      const fallback = new URL(DEFAULT_RESET_URL);
      fallback.searchParams.set('token', token);
      return fallback.toString();
    }
  }

  private requireEmailTransport(): boolean {
    return (
      this.configService.get<string>('AUTH_REQUIRE_EMAIL_TRANSPORT') === 'true'
    );
  }

  private parseIntEnv(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);

    if (!raw) {
      return fallback;
    }

    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
