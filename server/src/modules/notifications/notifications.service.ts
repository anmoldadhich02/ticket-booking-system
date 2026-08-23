import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { EmailType, EmailStatus } from '@prisma/client';
import { Resend } from 'resend';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: Resend | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey && !apiKey.includes('your_resend_api_key')) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendBookingConfirmationEmail(params: {
    userId: string;
    toEmail: string;
    customerName: string;
    bookingRef: string;
    eventTitle: string;
    venueName: string;
    eventDate: string;
    eventTime: string;
    seats: string[];
    totalAmount: string;
    qrDataUrl?: string;
  }) {
    const emailLog = await this.prisma.emailLog.create({
      data: {
        userId: params.userId,
        emailType: EmailType.BOOKING_CONFIRMATION,
        status: EmailStatus.PENDING,
      },
    });

    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px; }
            .card { background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; max-width: 580px; margin: 0 auto; overflow: hidden; }
            .header { background: linear-gradient(135deg, #0891b2, #06b6d4); padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; color: #ffffff; font-size: 24px; letter-spacing: -0.5px; }
            .content { padding: 28px 24px; }
            .ref-box { background-color: #27272a; border-radius: 8px; padding: 12px 16px; text-align: center; margin-bottom: 24px; }
            .ref-label { font-size: 11px; text-transform: uppercase; color: #a1a1aa; letter-spacing: 1px; }
            .ref-code { font-size: 20px; font-weight: 700; color: #22d3ee; font-family: monospace; }
            .row { display: flex; justify-content: space-between; border-bottom: 1px solid #27272a; padding: 10px 0; font-size: 14px; }
            .label { color: #a1a1aa; }
            .value { color: #fafafa; font-weight: 500; }
            .qr-section { text-align: center; margin-top: 24px; padding: 16px; background-color: #ffffff; border-radius: 12px; display: inline-block; }
            .footer { text-align: center; font-size: 12px; color: #71717a; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${params.customerName},</p>
              <p>Your seats are confirmed. Please present the QR code at the venue entrance.</p>
              
              <div class="ref-box">
                <div class="ref-label">Booking Reference</div>
                <div class="ref-code">${params.bookingRef}</div>
              </div>

              <div class="row"><span class="label">Event</span><span class="value">${params.eventTitle}</span></div>
              <div class="row"><span class="label">Venue</span><span class="value">${params.venueName}</span></div>
              <div class="row"><span class="label">Date & Time</span><span class="value">${params.eventDate} at ${params.eventTime}</span></div>
              <div class="row"><span class="label">Seats</span><span class="value">${params.seats.join(', ')}</span></div>
              <div class="row"><span class="label">Total Paid</span><span class="value">₹${params.totalAmount}</span></div>

              ${
                params.qrDataUrl
                  ? `<div style="text-align: center; margin-top: 24px;">
                      <img src="${params.qrDataUrl}" alt="Ticket QR Code" style="width: 180px; height: 180px; border-radius: 8px;" />
                    </div>`
                  : ''
              }
            </div>
            <div class="footer">
              <p>Thank you for choosing Ticket Booking System. Enjoy your event!</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (this.resend) {
        await this.resend.emails.send({
          from: this.configService.get<string>('EMAIL_FROM', 'tickets@resend.dev'),
          to: params.toEmail,
          subject: `Booking Confirmed: ${params.eventTitle} [${params.bookingRef}]`,
          html,
        });
      } else {
        this.logger.log(`[Mock Email] To: ${params.toEmail} | Ref: ${params.bookingRef} | Subject: Booking Confirmed: ${params.eventTitle}`);
      }

      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: EmailStatus.SENT },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to deliver email to ${params.toEmail}: ${err.message}`);
      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.FAILED,
          errorMessage: err.message,
        },
      });
      // Do not rethrow: email delivery failure must not abort successful booking!
    }
  }

  async sendWaitlistOfferEmail(params: {
    userId: string;
    toEmail: string;
    customerName: string;
    eventTitle: string;
    categoryName: string;
    seatNumber: string;
    expiresInMinutes: number;
    offerId: string;
  }) {
    const emailLog = await this.prisma.emailLog.create({
      data: {
        userId: params.userId,
        emailType: EmailType.WAITLIST_OFFER,
        status: EmailStatus.PENDING,
      },
    });

    try {
      if (this.resend) {
        await this.resend.emails.send({
          from: this.configService.get<string>('EMAIL_FROM', 'tickets@resend.dev'),
          to: params.toEmail,
          subject: `A seat is now available for ${params.eventTitle}!`,
          html: `<p>Hi ${params.customerName}, a ${params.categoryName} seat (${params.seatNumber}) opened up for ${params.eventTitle}. You have ${params.expiresInMinutes} minutes to accept this offer.</p>`,
        });
      } else {
        this.logger.log(`[Mock Email] Waitlist offer sent to ${params.toEmail} for ${params.eventTitle}`);
      }

      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: EmailStatus.SENT },
      });
    } catch (err: any) {
      this.logger.warn(`Waitlist email error: ${err.message}`);
      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: EmailStatus.FAILED, errorMessage: err.message },
      });
    }
  }
}
