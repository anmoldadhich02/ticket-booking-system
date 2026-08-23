import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  /**
   * Generates high-contrast QR Data URL containing safe booking reference
   */
  async generateTicketQr(bookingRef: string): Promise<{ qrPayload: string; qrDataUrl: string }> {
    const qrPayload = JSON.stringify({
      ref: bookingRef,
      type: 'TICKET_BOOKING_SYSTEM',
      v: 1,
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return {
      qrPayload,
      qrDataUrl,
    };
  }
}
