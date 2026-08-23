import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketsService } from '../tickets/tickets.service';
import { WaitlistsService } from '../waitlists/waitlists.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  HoldStatus,
  SeatStatus,
  BookingStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly ticketsService: TicketsService,
    private readonly waitlistsService: WaitlistsService,
  ) {}

  /**
   * Atomic Transactional Booking Creation
   * 1. Validate active hold ownership and hold expiration timestamp
   * 2. Idempotency protection against duplicate requests
   * 3. Convert hold status from ACTIVE to COMPLETED
   * 4. Convert event_seats from HELD to BOOKED
   * 5. Generate secure unique booking reference
   * 6. Generate QR code payload and visual data URL
   * 7. Create booking, booking items, ticket
   * 8. Broadcast real-time seat:booked event
   * 9. Deliver confirmation email asynchronously
   */
  async createBooking(userId: string, dto: CreateBookingDto) {
    const { holdId, idempotencyKey } = dto;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existing = await this.prisma.booking.findUnique({
        where: { idempotencyKey },
        include: {
          items: true,
          ticket: true,
          event: { include: { venue: true } },
        },
      });

      if (existing) {
        return this.formatBookingResponse(existing);
      }
    }

    // 2. Fetch Hold details
    const hold = await this.prisma.seatHold.findUnique({
      where: { id: holdId },
      include: {
        event: {
          include: {
            venue: true,
            eventSeatPrices: { include: { category: true } },
          },
        },
        items: {
          include: {
            eventSeat: {
              include: {
                seat: { include: { category: true } },
              },
            },
          },
        },
        user: true,
      },
    });

    if (!hold) {
      throw new NotFoundException('Hold record not found.');
    }

    if (hold.userId !== userId) {
      throw new ForbiddenException('You do not own this reservation.');
    }

    if (hold.status !== HoldStatus.ACTIVE || hold.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'HOLD_EXPIRED',
        message: 'Your seat hold has expired. Please select seats again.',
      });
    }

    // Price Map
    const priceMap = new Map<string, number>();
    for (const esp of hold.event.eventSeatPrices) {
      priceMap.set(esp.categoryId, Number(esp.price));
    }

    // Calculate total
    let totalAmount = 0;
    const itemsData = hold.items.map((item) => {
      const seat = item.eventSeat.seat;
      const price = priceMap.get(seat.categoryId) ?? 0;
      totalAmount += price;
      return {
        eventSeatId: item.eventSeatId,
        seatLabel: seat.seatNumber,
        categoryName: seat.category.name,
        price,
        seatId: seat.id,
      };
    });

    // Generate unique human-readable booking reference
    const bookingRef = `TBS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Generate QR code
    const qr = await this.ticketsService.generateTicketQr(bookingRef);

    const sortedEventSeatIds = hold.items.map((i) => i.eventSeatId).sort();

    // 3. Database Transaction
    const booking = await this.prisma.$transaction(
      async (tx) => {
        // A. Verify seats are still in HELD status
        const currentSeats = await tx.eventSeat.findMany({
          where: {
            id: { in: sortedEventSeatIds },
            status: SeatStatus.HELD,
          },
        });

        if (currentSeats.length !== sortedEventSeatIds.length) {
          throw new ConflictException({
            code: 'SEAT_STATE_CONFLICT',
            message: 'One or more held seats are no longer available.',
          });
        }

        // B. Mark Hold as COMPLETED
        await tx.seatHold.update({
          where: { id: holdId },
          data: { status: HoldStatus.COMPLETED },
        });

        // C. Convert event_seats from HELD to BOOKED
        await tx.eventSeat.updateMany({
          where: { id: { in: sortedEventSeatIds } },
          data: {
            status: SeatStatus.BOOKED,
            version: { increment: 1 },
          },
        });

        // D. Create Booking Record
        const newBooking = await tx.booking.create({
          data: {
            bookingRef,
            eventId: hold.eventId,
            userId,
            holdId,
            totalAmount,
            status: BookingStatus.CONFIRMED,
            idempotencyKey,
            items: {
              create: itemsData.map((item) => ({
                eventSeatId: item.eventSeatId,
                seatLabel: item.seatLabel,
                categoryName: item.categoryName,
                price: item.price,
              })),
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
            event: { include: { venue: true } },
          },
        });

        // E. Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'BOOKING_CREATED',
            entityType: 'BOOKING',
            entityId: newBooking.id,
            details: {
              bookingRef,
              eventId: hold.eventId,
              totalAmount,
              seatCount: itemsData.length,
            },
          },
        });

        return newBooking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
        maxWait: 5000,
      },
    );

    // 4. Broadcast real-time seat:booked
    for (const item of itemsData) {
      this.eventsGateway.broadcastSeatBooked({
        eventId: hold.eventId,
        seatId: item.seatId,
        eventSeatId: item.eventSeatId,
        seatNumber: item.seatLabel,
        status: 'BOOKED',
      });
    }

    // 5. Send Confirmation Email asynchronously
    const eventDateStr = hold.event.date.toISOString().split('T')[0];
    this.notificationsService.sendBookingConfirmationEmail({
      userId,
      toEmail: hold.user.email,
      customerName: hold.user.name,
      bookingRef,
      eventTitle: hold.event.title,
      venueName: hold.event.venue.name,
      eventDate: eventDateStr,
      eventTime: hold.event.startTime,
      seats: itemsData.map((i) => i.seatLabel),
      totalAmount: totalAmount.toFixed(2),
      qrDataUrl: qr.qrDataUrl,
    }).catch(() => {});

    return this.formatBookingResponse(booking);
  }

  /**
   * Cancel an eligible confirmed booking
   * Releases seats and immediately triggers FIFO waitlist allocation
   */
  async cancelBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        items: {
          include: {
            eventSeat: {
              include: {
                seat: true,
              },
            },
          },
        },
        event: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not own this booking.');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('This booking is not cancellable.');
    }

    // 1. Mark booking as CANCELLED
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'BOOKING_CANCELLED',
          entityType: 'BOOKING',
          entityId: bookingId,
          details: { bookingRef: booking.bookingRef },
        },
      });
    });

    // 2. Trigger waitlist check for each released seat
    for (const item of booking.items) {
      await this.waitlistsService.triggerWaitlistAllocation(
        booking.eventId,
        item.eventSeatId,
        item.eventSeat.seat.categoryId,
      );
    }

    return { message: 'Booking cancelled successfully. Seats have been processed.' };
  }

  async getUserBookings(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        items: true,
        ticket: true,
        event: {
          include: {
            venue: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((b) => this.formatBookingResponse(b));
  }

  async getBookingById(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        items: true,
        ticket: true,
        event: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not own this booking.');
    }

    return this.formatBookingResponse(booking);
  }

  private formatBookingResponse(booking: any) {
    return {
      id: booking.id,
      bookingRef: booking.bookingRef,
      totalAmount: Number(booking.totalAmount),
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
      event: {
        id: booking.event.id,
        title: booking.event.title,
        posterUrl: booking.event.posterUrl,
        venueName: booking.event.venue.name,
        venueAddress: booking.event.venue.address,
        date: booking.event.date,
        startTime: booking.event.startTime,
        endTime: booking.event.endTime,
      },
      seats: booking.items.map((i: any) => ({
        label: i.seatLabel,
        category: i.categoryName,
        price: Number(i.price),
      })),
      ticket: booking.ticket
        ? {
            id: booking.ticket.id,
            qrPayload: booking.ticket.qrPayload,
            qrDataUrl: booking.ticket.qrDataUrl,
          }
        : null,
    };
  }
}
