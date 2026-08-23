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
import { HoldSeatsDto } from './dto/hold-seats.dto';
import { HoldStatus, SeatStatus, Prisma } from '@prisma/client';

@Injectable()
export class HoldsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HoldsService.name);
  private expirationInterval: NodeJS.Timeout | null = null;
  private readonly holdTtlMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventsGateway: EventsGateway,
  ) {
    this.holdTtlMinutes = Number(
      this.configService.get<number>('SEAT_HOLD_TTL_MINUTES', 10),
    );
  }

  onModuleInit() {
    // Run hold expiration worker periodically (every 5 seconds)
    const intervalMs = Number(
      this.configService.get<number>('HOLD_EXPIRATION_INTERVAL_MS', 5000),
    );
    this.expirationInterval = setInterval(() => {
      this.cleanupExpiredHolds().catch((err) => {
        this.logger.error(`Error running hold cleanup: ${err.message}`);
      });
    }, intervalMs);

    this.logger.log(`Seat hold expiration worker started (Interval: ${intervalMs}ms, TTL: ${this.holdTtlMinutes}m)`);
  }

  onModuleDestroy() {
    if (this.expirationInterval) {
      clearInterval(this.expirationInterval);
    }
  }

  /**
   * Concurrency-Safe Seat Hold Creation
   * 1. Sorts seat IDs deterministically to prevent cross-request deadlocks
   * 2. Executes in an interactive transaction with READ COMMITTED isolation
   * 3. Locks target rows using SELECT FOR UPDATE NOWAIT or atomic conditional UPDATE
   * 4. Validates all requested seats are currently AVAILABLE (or lazily expired)
   * 5. Atomically sets status to HELD and creates SeatHold with expiration timestamp
   * 6. Broadcasts real-time WebSocket seat:held event
   */
  async holdSeats(userId: string, dto: HoldSeatsDto) {
    const { eventId, eventSeatIds } = dto;

    // 1. Enforce sorted array of IDs to eliminate deadlock risk
    const sortedEventSeatIds = [...new Set(eventSeatIds)].sort();

    // Check event status
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventSeatPrices: { include: { category: true } },
      },
    });

    if (!event || event.status !== 'PUBLISHED') {
      throw new BadRequestException('Event is not available for booking.');
    }

    const ttlMs = this.holdTtlMinutes * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);

    // 2. Execute Transaction
    const holdResult = await this.prisma.$transaction(
      async (tx) => {
        // First, check if any of these seats are locked by active holds that haven't expired
        // Lock rows with raw query to prevent any concurrent modification
        const currentSeats = await tx.$queryRaw<
          Array<{
            id: string;
            seat_id: string;
            status: string;
            seat_number: string;
            row: string;
            column: number;
            category_id: string;
          }>
        >`
          SELECT 
            es.id,
            es.seat_id,
            es.status,
            s.seat_number,
            s.row,
            s.column,
            s.category_id
          FROM event_seats es
          JOIN seats s ON s.id = es.seat_id
          WHERE es.id = ANY(${sortedEventSeatIds}::uuid[])
            AND es.event_id = ${eventId}::uuid
          ORDER BY es.id ASC
          FOR UPDATE
        `;

        if (currentSeats.length !== sortedEventSeatIds.length) {
          throw new NotFoundException('One or more selected seats do not exist for this event.');
        }

        // Check if any seat is already BOOKED or OFFERED or actively HELD
        const conflictingSeats = currentSeats.filter((seat) => {
          if (seat.status === SeatStatus.BOOKED) return true;
          if (seat.status === SeatStatus.OFFERED) return true;
          return false;
        });

        if (conflictingSeats.length > 0) {
          throw new ConflictException({
            code: 'SEAT_ALREADY_BOOKED',
            message: `Seat ${conflictingSeats[0].seat_number} is already booked or reserved.`,
          });
        }

        // Check for active holds
        const activeHoldItems = await tx.seatHoldItem.findMany({
          where: {
            eventSeatId: { in: sortedEventSeatIds },
            hold: {
              status: HoldStatus.ACTIVE,
              expiresAt: { gt: new Date() },
            },
          },
          include: {
            hold: true,
            eventSeat: { include: { seat: true } },
          },
        });

        // If held by another user and not expired -> Reject!
        const heldByOther = activeHoldItems.filter((item) => item.hold.userId !== userId);
        if (heldByOther.length > 0) {
          const seatLabel = heldByOther[0].eventSeat.seat.seatNumber;
          throw new ConflictException({
            code: 'SEAT_ALREADY_HELD',
            message: `Seat ${seatLabel} is temporarily reserved by another customer. Please choose another seat.`,
          });
        }

        // Release any prior active holds for this user on this event if replacing
        const priorUserHolds = await tx.seatHold.findMany({
          where: {
            eventId,
            userId,
            status: HoldStatus.ACTIVE,
          },
          include: { items: true },
        });

        for (const priorHold of priorUserHolds) {
          await tx.seatHold.update({
            where: { id: priorHold.id },
            data: { status: HoldStatus.RELEASED },
          });

          // Any seats in prior hold not in new hold should become AVAILABLE
          const priorSeatIds = priorHold.items
            .map((i) => i.eventSeatId)
            .filter((id) => !sortedEventSeatIds.includes(id));

          if (priorSeatIds.length > 0) {
            await tx.eventSeat.updateMany({
              where: { id: { in: priorSeatIds }, status: SeatStatus.HELD },
              data: { status: SeatStatus.AVAILABLE, version: { increment: 1 } },
            });
          }
        }

        // Atomically update all requested event_seats to HELD
        await tx.eventSeat.updateMany({
          where: {
            id: { in: sortedEventSeatIds },
            eventId,
          },
          data: {
            status: SeatStatus.HELD,
            version: { increment: 1 },
          },
        });

        // Create new SeatHold
        const newHold = await tx.seatHold.create({
          data: {
            eventId,
            userId,
            status: HoldStatus.ACTIVE,
            expiresAt,
            items: {
              create: sortedEventSeatIds.map((esId) => ({
                eventSeatId: esId,
              })),
            },
          },
          include: {
            items: {
              include: {
                eventSeat: {
                  include: {
                    seat: { include: { category: true } },
                  },
                },
              },
            },
          },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'SEAT_HELD',
            entityType: 'SEAT_HOLD',
            entityId: newHold.id,
            details: {
              eventId,
              seatCount: sortedEventSeatIds.length,
              expiresAt: expiresAt.toISOString(),
            },
          },
        });

        return {
          hold: newHold,
          seats: currentSeats,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
        maxWait: 5000,
      },
    );

    // 3. Broadcast real-time seat:held updates to all clients watching this event
    for (const seat of holdResult.seats) {
      this.eventsGateway.broadcastSeatHeld({
        eventId,
        seatId: seat.seat_id,
        eventSeatId: seat.id,
        seatNumber: seat.seat_number,
        status: 'HELD',
        heldByUserId: userId,
        expiresAt: expiresAt.toISOString(),
      });
    }

    // Price calculation
    const priceMap = new Map<string, number>();
    for (const p of event.eventSeatPrices) {
      priceMap.set(p.categoryId, Number(p.price));
    }

    const heldSeatsSummary = holdResult.hold.items.map((item) => {
      const seat = item.eventSeat.seat;
      const price = priceMap.get(seat.categoryId) ?? 0;
      return {
        eventSeatId: item.eventSeatId,
        seatId: seat.id,
        seatNumber: seat.seatNumber,
        row: seat.row,
        column: seat.column,
        categoryName: seat.category.name,
        price,
      };
    });

    const totalAmount = heldSeatsSummary.reduce((sum, s) => sum + s.price, 0);

    return {
      holdId: holdResult.hold.id,
      eventId,
      expiresAt: expiresAt.toISOString(),
      serverTime: new Date().toISOString(),
      ttlSeconds: this.holdTtlMinutes * 60,
      seats: heldSeatsSummary,
      totalAmount,
    };
  }

  /**
   * Manual Seat Hold Release
   */
  async releaseHold(userId: string, holdId: string) {
    const hold = await this.prisma.seatHold.findUnique({
      where: { id: holdId },
      include: {
        items: {
          include: {
            eventSeat: { include: { seat: true } },
          },
        },
      },
    });

    if (!hold) {
      throw new NotFoundException('Hold record not found.');
    }

    if (hold.userId !== userId) {
      throw new ForbiddenException('You do not own this hold.');
    }

    if (hold.status !== HoldStatus.ACTIVE) {
      return { message: 'Hold is no longer active.' };
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Mark hold as RELEASED
      await tx.seatHold.update({
        where: { id: holdId },
        data: { status: HoldStatus.RELEASED },
      });

      // 2. Set event_seats back to AVAILABLE
      const eventSeatIds = hold.items.map((i) => i.eventSeatId);
      await tx.eventSeat.updateMany({
        where: {
          id: { in: eventSeatIds },
          status: SeatStatus.HELD,
        },
        data: {
          status: SeatStatus.AVAILABLE,
          version: { increment: 1 },
        },
      });

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'SEAT_RELEASED',
          entityType: 'SEAT_HOLD',
          entityId: holdId,
          details: { reason: 'MANUAL_RELEASE' },
        },
      });
    });

    // 3. Broadcast real-time seat:released events
    for (const item of hold.items) {
      this.eventsGateway.broadcastSeatReleased({
        eventId: hold.eventId,
        seatId: item.eventSeat.seatId,
        eventSeatId: item.eventSeatId,
        seatNumber: item.eventSeat.seat.seatNumber,
        status: 'AVAILABLE',
      });
    }

    return { message: 'Seats released successfully.' };
  }

  /**
   * Automatic Background Worker: Finds and releases expired holds
   */
  async cleanupExpiredHolds(): Promise<number> {
    const now = new Date();

    // 1. Find all active holds whose expiresAt < NOW()
    const expiredHolds = await this.prisma.seatHold.findMany({
      where: {
        status: HoldStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      include: {
        items: {
          include: {
            eventSeat: { include: { seat: true } },
          },
        },
      },
      take: 50, // Batch limit
    });

    if (expiredHolds.length === 0) {
      return 0;
    }

    this.logger.log(`Found ${expiredHolds.length} expired seat holds. Releasing seats...`);

    for (const hold of expiredHolds) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Mark hold as EXPIRED
          await tx.seatHold.update({
            where: { id: hold.id },
            data: { status: HoldStatus.EXPIRED },
          });

          // Set seats back to AVAILABLE only if they are currently HELD
          const eventSeatIds = hold.items.map((i) => i.eventSeatId);
          await tx.eventSeat.updateMany({
            where: {
              id: { in: eventSeatIds },
              status: SeatStatus.HELD,
            },
            data: {
              status: SeatStatus.AVAILABLE,
              version: { increment: 1 },
            },
          });

          // Audit log
          await tx.auditLog.create({
            data: {
              userId: hold.userId,
              action: 'SEAT_HOLD_EXPIRED',
              entityType: 'SEAT_HOLD',
              entityId: hold.id,
              details: { seatCount: hold.items.length },
            },
          });
        });

        // Broadcast real-time updates for each seat
        for (const item of hold.items) {
          this.eventsGateway.broadcastSeatReleased({
            eventId: hold.eventId,
            seatId: item.eventSeat.seatId,
            eventSeatId: item.eventSeatId,
            seatNumber: item.eventSeat.seat.seatNumber,
            status: 'AVAILABLE',
          });
        }
      } catch (err: any) {
        this.logger.error(`Failed to cleanup expired hold ${hold.id}: ${err.message}`);
      }
    }

    return expiredHolds.length;
  }

  async getHoldDetails(holdId: string, userId: string) {
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
      },
    });

    if (!hold) {
      throw new NotFoundException('Hold record not found.');
    }

    if (hold.userId !== userId) {
      throw new ForbiddenException('Access denied to this hold.');
    }

    const priceMap = new Map<string, number>();
    for (const p of hold.event.eventSeatPrices) {
      priceMap.set(p.categoryId, Number(p.price));
    }

    const seats = hold.items.map((item) => {
      const s = item.eventSeat.seat;
      const price = priceMap.get(s.categoryId) ?? 0;
      return {
        eventSeatId: item.eventSeatId,
        seatId: s.id,
        seatNumber: s.seatNumber,
        row: s.row,
        column: s.column,
        categoryName: s.category.name,
        price,
      };
    });

    const isExpired = hold.status !== HoldStatus.ACTIVE || hold.expiresAt < new Date();
    const remainingMs = Math.max(0, hold.expiresAt.getTime() - Date.now());

    return {
      holdId: hold.id,
      status: hold.status,
      isExpired,
      expiresAt: hold.expiresAt.toISOString(),
      serverTime: new Date().toISOString(),
      remainingSeconds: Math.floor(remainingMs / 1000),
      event: {
        id: hold.event.id,
        title: hold.event.title,
        venueName: hold.event.venue.name,
        date: hold.event.date,
        startTime: hold.event.startTime,
      },
      seats,
      totalAmount: seats.reduce((sum, s) => sum + s.price, 0),
    };
  }
}
