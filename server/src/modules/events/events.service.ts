import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { EventStatus, SeatStatus, UserRole } from '@prisma/client';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createEvent(organiserId: string, dto: CreateEventDto) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: dto.venueId, isActive: true },
      include: {
        seats: { where: { isActive: true } },
        seatCategories: true,
      },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found or inactive.');
    }

    if (venue.seats.length === 0) {
      throw new BadRequestException('The selected venue does not have any configured seats.');
    }

    // Validate that all venue categories have a price specified
    const categoryIds = new Set(dto.categoryPrices.map((cp) => cp.categoryId));
    for (const cat of venue.seatCategories) {
      if (!categoryIds.has(cat.id)) {
        throw new BadRequestException(`Price must be specified for category "${cat.name}".`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Event
      const eventDate = new Date(`${dto.date}T00:00:00.000Z`);
      const event = await tx.event.create({
        data: {
          title: dto.title.trim(),
          description: dto.description,
          posterUrl: dto.posterUrl,
          eventType: dto.eventType,
          venueId: dto.venueId,
          organiserId,
          date: eventDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: dto.status || EventStatus.PUBLISHED,
          eventSeatPrices: {
            create: dto.categoryPrices.map((cp) => ({
              categoryId: cp.categoryId,
              price: cp.price,
            })),
          },
        },
        include: {
          eventSeatPrices: { include: { category: true } },
          venue: true,
        },
      });

      // 2. Clone Venue's physical seats into Event-Specific Inventory (event_seats)
      const eventSeatRecords = venue.seats.map((seat) => ({
        eventId: event.id,
        seatId: seat.id,
        status: SeatStatus.AVAILABLE,
      }));

      await tx.eventSeat.createMany({
        data: eventSeatRecords,
      });

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          userId: organiserId,
          action: 'EVENT_CREATED',
          entityType: 'EVENT',
          entityId: event.id,
          details: { title: event.title, totalSeats: eventSeatRecords.length },
        },
      });

      return event;
    });
  }

  async getEvents(query: QueryEventsDto) {
    const {
      search,
      eventType,
      status,
      venueId,
      date,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'asc',
    } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (eventType) where.eventType = eventType;
    if (status) where.status = status;
    else where.status = { not: EventStatus.DRAFT }; // Default to public visible statuses
    if (venueId) where.venueId = venueId;
    if (date) where.date = new Date(`${date}T00:00:00.000Z`);

    const skip = (page - 1) * limit;

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        include: {
          venue: {
            select: { id: true, name: true, address: true, capacity: true },
          },
          organiser: {
            select: { id: true, name: true, email: true },
          },
          eventSeatPrices: {
            include: { category: true },
            orderBy: { price: 'asc' },
          },
          _count: {
            select: {
              eventSeats: true,
              bookings: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    // Calculate real-time available seat counts and min/max prices
    const eventsWithStats = await Promise.all(
      events.map(async (ev) => {
        const availableCount = await this.prisma.eventSeat.count({
          where: {
            eventId: ev.id,
            status: SeatStatus.AVAILABLE,
            seat: { isAisle: false },
          },
        });

        const prices = ev.eventSeatPrices.map((p) => Number(p.price));
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        return {
          ...ev,
          availableSeats: availableCount,
          minPrice,
          maxPrice,
          isSoldOut: availableCount === 0,
        };
      }),
    );

    return {
      data: eventsWithStats,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEventById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        venue: {
          include: {
            seatCategories: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        organiser: {
          select: { id: true, name: true, email: true },
        },
        eventSeatPrices: {
          include: { category: true },
          orderBy: { price: 'asc' },
        },
        _count: {
          select: {
            eventSeats: true,
            bookings: true,
            waitlistEntries: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    // Compute inventory breakdown
    const [availableCount, heldCount, bookedCount, offeredCount] = await Promise.all([
      this.prisma.eventSeat.count({ where: { eventId: id, status: SeatStatus.AVAILABLE, seat: { isAisle: false } } }),
      this.prisma.eventSeat.count({ where: { eventId: id, status: SeatStatus.HELD, seat: { isAisle: false } } }),
      this.prisma.eventSeat.count({ where: { eventId: id, status: SeatStatus.BOOKED, seat: { isAisle: false } } }),
      this.prisma.eventSeat.count({ where: { eventId: id, status: SeatStatus.OFFERED, seat: { isAisle: false } } }),
    ]);

    const prices = event.eventSeatPrices.map((p) => Number(p.price));
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    return {
      ...event,
      stats: {
        available: availableCount,
        held: heldCount,
        booked: bookedCount,
        offered: offeredCount,
        totalCapacity: availableCount + heldCount + bookedCount + offeredCount,
        minPrice,
        maxPrice,
        isSoldOut: availableCount === 0,
      },
    };
  }

  async getEventSeats(eventId: string, currentUserId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventSeatPrices: {
          include: { category: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    // Price lookup map
    const priceMap = new Map<string, number>();
    for (const esp of event.eventSeatPrices) {
      priceMap.set(esp.categoryId, Number(esp.price));
    }

    // Fetch all event seats with their physical seat metadata
    const eventSeats = await this.prisma.eventSeat.findMany({
      where: { eventId },
      include: {
        seat: {
          include: {
            category: true,
          },
        },
        holdItems: {
          where: {
            hold: { status: 'ACTIVE' },
          },
          include: {
            hold: true,
          },
        },
      },
      orderBy: [
        { seat: { row: 'asc' } },
        { seat: { column: 'asc' } },
      ],
    });

    const now = new Date();

    const formattedSeats = eventSeats.map((es) => {
      const activeHold = es.holdItems[0]?.hold;
      let effectiveStatus = es.status;

      // Lazy check: if status is HELD but the hold timestamp is expired in the DB
      if (es.status === SeatStatus.HELD && activeHold && activeHold.expiresAt < now) {
        effectiveStatus = SeatStatus.AVAILABLE;
      }

      const isHeldByMe = activeHold ? activeHold.userId === currentUserId : false;

      return {
        id: es.id,
        seatId: es.seatId,
        row: es.seat.row,
        column: es.seat.column,
        seatNumber: es.seat.seatNumber,
        isAisle: es.seat.isAisle,
        category: {
          id: es.seat.category.id,
          name: es.seat.category.name,
          color: es.seat.category.color,
        },
        price: priceMap.get(es.seat.categoryId) ?? 0,
        status: effectiveStatus,
        isHeldByMe,
        expiresAt: activeHold && isHeldByMe ? activeHold.expiresAt.toISOString() : undefined,
      };
    });

    return {
      eventId,
      categories: event.eventSeatPrices.map((esp) => ({
        id: esp.category.id,
        name: esp.category.name,
        color: esp.category.color,
        price: Number(esp.price),
      })),
      seats: formattedSeats,
      serverTime: new Date().toISOString(),
    };
  }

  async updateEventStatus(eventId: string, organiserId: string, status: EventStatus, userRole: UserRole) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    if (event.organiserId !== organiserId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to manage this event.');
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: { status },
    });
  }
}
