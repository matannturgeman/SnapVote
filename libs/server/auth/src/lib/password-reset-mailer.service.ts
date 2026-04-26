import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface PasswordResetEmailPayload {
  to: string;
  name?: string | null;
  token: string;
}

const DEFAULT_RESET_URL = 'http://localhost:4200/reset-password';

@Injectable()
export class PasswordResetMailerService {
  private readonly logger = new Logger(PasswordResetMailerService.name);
  private readonly resend: Resend | null;

  constructor(private readonly configService: ConfigService) {
    this.resend = this.createResendClient();
  }

  async sendPasswordResetEmail(
    payload: PasswordResetEmailPayload,
  ): Promise<void> {
    if (!this.resend) {
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

    const { data, error } = await this.resend.emails.send({
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

    if (error) {
      this.logger.error(
        `Failed to send password reset email to ${payload.to}: ${error.message}`,
      );
      throw new Error(`Failed to send email: ${error.message}`);
    }

    this.logger.log(
      `Password reset email queued for ${payload.to}. id=${data?.id}`,
    );
  }

  private createResendClient(): Resend | null {
    const apiKey = this.configService.get<string>('SMTP_PASS');

    if (!apiKey) {
      return null;
    }

    return new Resend(apiKey);
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

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
