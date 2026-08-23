import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketsService } from '../tickets/tickets.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import {
  WaitlistStatus,
  OfferStatus,
  SeatStatus,
  BookingStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class WaitlistsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WaitlistsService.name);
  private offerExpirationInterval: NodeJS.Timeout | null = null;
  private readonly offerTtlMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly ticketsService: TicketsService,
  ) {
    this.offerTtlMinutes = Number(
      this.configService.get<number>('WAITLIST_OFFER_TTL_MINUTES', 5),
    );
  }

  onModuleInit() {
    const intervalMs = Number(
      this.configService.get<number>('WAITLIST_OFFER_EXPIRATION_INTERVAL_MS', 5000),
    );
    this.offerExpirationInterval = setInterval(() => {
      this.cleanupExpiredOffers().catch((err) => {
        this.logger.error(`Error in waitlist offer expiration worker: ${err.message}`);
      });
    }, intervalMs);

    this.logger.log(`Waitlist offer expiration worker started (Interval: ${intervalMs}ms, TTL: ${this.offerTtlMinutes}m)`);
  }

  onModuleDestroy() {
    if (this.offerExpirationInterval) {
      clearInterval(this.offerExpirationInterval);
    }
  }

  /**
   * Join FIFO category waitlist
   */
  async joinWaitlist(userId: string, dto: JoinWaitlistDto) {
    const { eventId, categoryId } = dto;

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventSeatPrices: { where: { categoryId } },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    if (event.eventSeatPrices.length === 0) {
      throw new BadRequestException('Category not found for this event.');
    }

    // Check if user already has an active waitlist entry
    const existing = await this.prisma.waitlistEntry.findFirst({
      where: {
        eventId,
        userId,
        categoryId,
        status: { in: [WaitlistStatus.WAITING, WaitlistStatus.OFFERED] },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_WAITLISTED',
        message: 'You are already on the waitlist for this category.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Get current max position for FIFO ordering
      const count = await tx.waitlistEntry.count({
        where: {
          eventId,
          categoryId,
          status: WaitlistStatus.WAITING,
        },
      });

      const entry = await tx.waitlistEntry.create({
        data: {
          eventId,
          userId,
          categoryId,
          position: count + 1,
          status: WaitlistStatus.WAITING,
        },
        include: {
          category: true,
          event: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'WAITLIST_JOINED',
          entityType: 'WAITLIST_ENTRY',
          entityId: entry.id,
          details: { eventId, categoryId, position: entry.position },
        },
      });

      return {
        waitlistId: entry.id,
        eventId: entry.eventId,
        eventTitle: entry.event.title,
        categoryName: entry.category.name,
        position: entry.position,
        status: entry.status,
        createdAt: entry.createdAt.toISOString(),
      };
    });
  }

  /**
   * Called when a seat is released/cancelled. Checks if anyone is waiting in this category.
   * If yes: creates a time-limited offer for the earliest customer.
   * If no: marks the seat as AVAILABLE.
   */
  async triggerWaitlistAllocation(eventId: string, eventSeatId: string, categoryId: string): Promise<boolean> {
    const candidate = await this.prisma.$transaction(async (tx) => {
      // Find earliest WAITING entry in FIFO order with FOR UPDATE SKIP LOCKED
      const entries = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          position: number;
        }>
      >`
        SELECT id, user_id, position
        FROM waitlist_entries
        WHERE event_id = ${eventId}::uuid
          AND category_id = ${categoryId}::uuid
          AND status = 'WAITING'
        ORDER BY position ASC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (entries.length === 0) {
        // No waitlist candidates -> Set seat back to AVAILABLE
        await tx.eventSeat.update({
          where: { id: eventSeatId },
          data: { status: SeatStatus.AVAILABLE, version: { increment: 1 } },
        });
        return null;
      }

      const winner = entries[0];
      const ttlMs = this.offerTtlMinutes * 60 * 1000;
      const expiresAt = new Date(Date.now() + ttlMs);

      // 1. Mark waitlist entry as OFFERED
      await tx.waitlistEntry.update({
        where: { id: winner.id },
        data: { status: WaitlistStatus.OFFERED },
      });

      // 2. Mark event_seat as OFFERED
      await tx.eventSeat.update({
        where: { id: eventSeatId },
        data: { status: SeatStatus.OFFERED, version: { increment: 1 } },
      });

      // 3. Create WaitlistOffer
      const offer = await tx.waitlistOffer.create({
        data: {
          waitlistEntryId: winner.id,
          eventSeatId,
          status: OfferStatus.PENDING,
          expiresAt,
        },
        include: {
          eventSeat: {
            include: {
              seat: { include: { category: true } },
              event: true,
            },
          },
          waitlistEntry: {
            include: {
              user: true,
              category: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: winner.user_id,
          action: 'WAITLIST_OFFER_CREATED',
          entityType: 'WAITLIST_OFFER',
          entityId: offer.id,
          details: { eventId, eventSeatId, expiresAt: expiresAt.toISOString() },
        },
      });

      return offer;
    });

    if (!candidate) {
      // Seat was made available
      const seat = await this.prisma.eventSeat.findUnique({
        where: { id: eventSeatId },
        include: { seat: true },
      });
      if (seat) {
        this.eventsGateway.broadcastSeatReleased({
          eventId,
          seatId: seat.seatId,
          eventSeatId,
          seatNumber: seat.seat.seatNumber,
          status: 'AVAILABLE',
        });
      }
      return false;
    }

    // Broadcast seat offered & notify user
    const seatInfo = candidate.eventSeat.seat;
    this.eventsGateway.broadcastSeatOffered({
      eventId,
      seatId: seatInfo.id,
      eventSeatId,
      seatNumber: seatInfo.seatNumber,
      status: 'OFFERED',
      heldByUserId: candidate.waitlistEntry.userId,
      expiresAt: candidate.expiresAt.toISOString(),
    });

    // Notify winning user via private WebSocket room
    this.eventsGateway.sendToUser(candidate.waitlistEntry.userId, 'waitlist:offer_created', {
      offerId: candidate.id,
      eventId,
      eventTitle: candidate.eventSeat.event.title,
      seatNumber: seatInfo.seatNumber,
      categoryName: candidate.waitlistEntry.category.name,
      expiresAt: candidate.expiresAt.toISOString(),
      ttlMinutes: this.offerTtlMinutes,
    });

    // Send notification email asynchronously
    this.notificationsService.sendWaitlistOfferEmail({
      userId: candidate.waitlistEntry.userId,
      toEmail: candidate.waitlistEntry.user.email,
      customerName: candidate.waitlistEntry.user.name,
      eventTitle: candidate.eventSeat.event.title,
      categoryName: candidate.waitlistEntry.category.name,
      seatNumber: seatInfo.seatNumber,
      expiresInMinutes: this.offerTtlMinutes,
      offerId: candidate.id,
    }).catch(() => {});

    return true;
  }

  /**
   * Accept Waitlist Offer and create confirmed booking atomically
   */
  async acceptOffer(userId: string, offerId: string) {
    const offer = await this.prisma.waitlistOffer.findUnique({
      where: { id: offerId },
      include: {
        waitlistEntry: {
          include: {
            user: true,
            category: true,
          },
        },
        eventSeat: {
          include: {
            seat: { include: { category: true } },
            event: {
              include: {
                venue: true,
                eventSeatPrices: true,
              },
            },
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Waitlist offer not found.');
    }

    if (offer.waitlistEntry.userId !== userId) {
      throw new ForbiddenException('This waitlist offer belongs to another user.');
    }

    if (offer.status !== OfferStatus.PENDING || offer.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'WAITLIST_OFFER_EXPIRED',
        message: 'This waitlist offer has expired and is no longer valid.',
      });
    }

    const event = offer.eventSeat.event;
    const seat = offer.eventSeat.seat;
    const priceRecord = event.eventSeatPrices.find(
      (p) => p.categoryId === seat.categoryId,
    );
    const price = priceRecord ? Number(priceRecord.price) : 0;

    // Generate unique human-readable booking reference (e.g. TBS-9K4P2L)
    const bookingRef = `TBS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Generate QR
    const qr = await this.ticketsService.generateTicketQr(bookingRef);

    const booking = await this.prisma.$transaction(async (tx) => {
      // 1. Mark offer as ACCEPTED
      await tx.waitlistOffer.update({
        where: { id: offerId },
        data: { status: OfferStatus.ACCEPTED },
      });

      // 2. Mark waitlist entry as BOOKED
      await tx.waitlistEntry.update({
        where: { id: offer.waitlistEntryId },
        data: { status: WaitlistStatus.BOOKED },
      });

      // 3. Mark event_seat as BOOKED
      await tx.eventSeat.update({
        where: { id: offer.eventSeatId },
        data: { status: SeatStatus.BOOKED, version: { increment: 1 } },
      });

      // 4. Create Booking & BookingItem
      const newBooking = await tx.booking.create({
        data: {
          bookingRef,
          eventId: event.id,
          userId,
          totalAmount: price,
          status: BookingStatus.CONFIRMED,
          items: {
            create: [
              {
                eventSeatId: offer.eventSeatId,
                seatLabel: seat.seatNumber,
                categoryName: seat.category.name,
                price,
              },
            ],
          },
          ticket: {
            create: {
              qrPayload: qr.qrPayload,
              qrDataUrl: qr.qrDataUrl,
            },
          },
        },
        include: {
          items: true,
          ticket: true,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'WAITLIST_BOOKING_COMPLETED',
          entityType: 'BOOKING',
          entityId: newBooking.id,
          details: { bookingRef, offerId, seatNumber: seat.seatNumber },
        },
      });

      return newBooking;
    });

    // 5. Broadcast real-time seat:booked
    this.eventsGateway.broadcastSeatBooked({
      eventId: event.id,
      seatId: seat.id,
      eventSeatId: offer.eventSeatId,
      seatNumber: seat.seatNumber,
      status: 'BOOKED',
    });

    // 6. Send confirmation email
    const eventDateStr = event.date.toISOString().split('T')[0];
    this.notificationsService.sendBookingConfirmationEmail({
      userId,
      toEmail: offer.waitlistEntry.user.email,
      customerName: offer.waitlistEntry.user.name,
      bookingRef,
      eventTitle: event.title,
      venueName: event.venue.name,
      eventDate: eventDateStr,
      eventTime: event.startTime,
      seats: [seat.seatNumber],
      totalAmount: price.toFixed(2),
      qrDataUrl: qr.qrDataUrl,
    }).catch(() => {});

    return {
      bookingId: booking.id,
      bookingRef,
      totalAmount: price,
      status: booking.status,
      ticket: {
        qrDataUrl: qr.qrDataUrl,
        bookingRef,
      },
    };
  }

  /**
   * Automatic Offer Expiration & Sequential Cascade Worker
   */
  async cleanupExpiredOffers(): Promise<number> {
    const now = new Date();

    const expiredOffers = await this.prisma.waitlistOffer.findMany({
      where: {
        status: OfferStatus.PENDING,
        expiresAt: { lt: now },
      },
      include: {
        eventSeat: {
          include: {
            seat: true,
            event: true,
          },
        },
        waitlistEntry: true,
      },
      take: 20,
    });

    if (expiredOffers.length === 0) {
      return 0;
    }

    this.logger.log(`Found ${expiredOffers.length} expired waitlist offers. Cascading to next customers...`);

    for (const offer of expiredOffers) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Mark offer as EXPIRED
          await tx.waitlistOffer.update({
            where: { id: offer.id },
            data: { status: OfferStatus.EXPIRED },
          });

          // Mark waitlist entry as EXPIRED
          await tx.waitlistEntry.update({
            where: { id: offer.waitlistEntryId },
            data: { status: WaitlistStatus.EXPIRED },
          });

          await tx.auditLog.create({
            data: {
              userId: offer.waitlistEntry.userId,
              action: 'WAITLIST_OFFER_EXPIRED',
              entityType: 'WAITLIST_OFFER',
              entityId: offer.id,
              details: { eventSeatId: offer.eventSeatId },
            },
          });
        });

        // Trigger cascade to the NEXT waiting customer
        await this.triggerWaitlistAllocation(
          offer.eventSeat.eventId,
          offer.eventSeatId,
          offer.eventSeat.seat.categoryId,
        );
      } catch (err: any) {
        this.logger.error(`Error cascading offer ${offer.id}: ${err.message}`);
      }
    }

    return expiredOffers.length;
  }

  /**
   * Get user's waitlist status
   */
  async getUserWaitlists(userId: string) {
    const entries = await this.prisma.waitlistEntry.findMany({
      where: { userId },
      include: {
        event: {
          include: { venue: true },
        },
        category: true,
        offers: {
          where: { status: OfferStatus.PENDING, expiresAt: { gt: new Date() } },
          include: {
            eventSeat: { include: { seat: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return entries.map((entry) => {
      const activeOffer = entry.offers[0];
      return {
        id: entry.id,
        eventId: entry.eventId,
        eventTitle: entry.event.title,
        venueName: entry.event.venue.name,
        categoryName: entry.category.name,
        position: entry.position,
        status: entry.status,
        createdAt: entry.createdAt.toISOString(),
        activeOffer: activeOffer
          ? {
              offerId: activeOffer.id,
              seatNumber: activeOffer.eventSeat.seat.seatNumber,
              expiresAt: activeOffer.expiresAt.toISOString(),
              remainingSeconds: Math.max(
                0,
                Math.floor((activeOffer.expiresAt.getTime() - Date.now()) / 1000),
              ),
            }
          : null,
      };
    });
  }
}
