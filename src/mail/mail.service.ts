import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });
      this.logger.log('SMTP mail transporter initialized successfully.');
    } else {
      this.logger.warn(
        'SMTP configuration is incomplete. MailService will run in developer mode and log OTPs to the console.',
      );
    }
  }

  async sendOtpEmail(to: string, otp: string): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM') || '"Trinco Bites" <no-reply@trincobites.com>';
    const subject = 'Password Reset OTP - Trinco Bites';
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #f8dda4; border-radius: 20px; background-color: #fffdfa; box-shadow: 0 4px 12px rgba(129,52,5,0.05);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #d45113; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Trinco Bites</h2>
          <p style="color: #813405; margin: 5px 0 0 0; font-size: 13px; font-weight: 600; opacity: 0.8;">Premium Food Delivery</p>
        </div>
        <div style="background-color: #ffffff; border: 1.5px solid rgba(248,221,164,0.4); border-radius: 16px; padding: 25px; margin-bottom: 20px;">
          <p style="font-size: 14px; color: #532005; margin-top: 0; line-height: 1.5;">Hello,</p>
          <p style="font-size: 14px; color: #532005; line-height: 1.5;">We received a request to reset your Trinco Bites password. Please use the One-Time Password (OTP) below to complete your verification. This code is valid for <strong>5 minutes</strong>.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #532005; background-color: #fde8d7; padding: 12px 30px; border-radius: 12px; border: 1.5px dashed #d45113;">
              ${otp}
            </span>
          </div>
          
          <p style="font-size: 12px; color: #813405; line-height: 1.5; margin-bottom: 0;">If you did not request a password reset, please ignore this email or contact support if you believe this was an error.</p>
        </div>
        <hr style="border: 0; border-top: 1px solid rgba(129,52,5,0.1); margin: 20px 0;" />
        <p style="font-size: 11px; color: rgba(129,52,5,0.6); text-align: center; margin: 0;">© 2026 Trinco Bites. All rights reserved.</p>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to,
          subject,
          html,
        });
        this.logger.log(`Password reset OTP successfully sent to email: ${to}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send password reset email to ${to}:`, error);
        return false;
      }
    } else {
      this.logger.log('-----------------------------------------');
      this.logger.log(`[DEVELOPER MODE] Password Reset OTP for ${to}:`);
      this.logger.log(`OTP CODE: ${otp}`);
      this.logger.log('-----------------------------------------');
      return true;
    }
  }
}
