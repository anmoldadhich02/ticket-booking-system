import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  BookingStatus,
  EventStatus,
  HoldStatus,
  SeatStatus,
  UserRole,
  WaitlistStatus,
} from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Organiser-specific Analytics & Performance Metrics
   */
  async getOrganiserAnalytics(organiserId: string) {
    const events = await this.prisma.event.findMany({
      where: { organiserId },
      include: {
        venue: true,
        bookings: {
          where: { status: BookingStatus.CONFIRMED },
          include: { items: true },
        },
        _count: {
          select: {
            eventSeats: true,
            bookings: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    let totalRevenue = 0;
    let totalConfirmedBookings = 0;
    let totalSeatsAcrossEvents = 0;
    let totalBookedSeatsAcrossEvents = 0;

    const eventPerformance = await Promise.all(
      events.map(async (ev) => {
        const [available, held, booked, offered] = await Promise.all([
          this.prisma.eventSeat.count({
            where: { eventId: ev.id, status: SeatStatus.AVAILABLE, seat: { isAisle: false } },
          }),
          this.prisma.eventSeat.count({
            where: { eventId: ev.id, status: SeatStatus.HELD, seat: { isAisle: false } },
          }),
          this.prisma.eventSeat.count({
            where: { eventId: ev.id, status: SeatStatus.BOOKED, seat: { isAisle: false } },
          }),
          this.prisma.eventSeat.count({
            where: { eventId: ev.id, status: SeatStatus.OFFERED, seat: { isAisle: false } },
          }),
        ]);

        const capacity = available + held + booked + offered;
        const revenue = ev.bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
        const occupancyRate = capacity > 0 ? (booked / capacity) * 100 : 0;

        totalRevenue += revenue;
        totalConfirmedBookings += ev.bookings.length;
        totalSeatsAcrossEvents += capacity;
        totalBookedSeatsAcrossEvents += booked;

        return {
          id: ev.id,
          title: ev.title,
          venueName: ev.venue.name,
          date: ev.date,
          startTime: ev.startTime,
          status: ev.status,
          capacity,
          booked,
          available,
          held,
          offered,
          revenue,
          occupancyRate: Math.round(occupancyRate * 10) / 10,
        };
      }),
    );

    const overallOccupancy = totalSeatsAcrossEvents > 0
      ? Math.round((totalBookedSeatsAcrossEvents / totalSeatsAcrossEvents) * 1000) / 10
      : 0;

    const cancelledBookingsCount = await this.prisma.booking.count({
      where: {
        event: { organiserId },
        status: BookingStatus.CANCELLED,
      },
    });

    return {
      totalEvents: events.length,
      totalRevenue,
      totalConfirmedBookings,
      totalTicketsSold: totalBookedSeatsAcrossEvents,
      overallOccupancyRate: overallOccupancy,
      totalCancellations: cancelledBookingsCount,
      events: eventPerformance,
    };
  }

  /**
   * Platform-wide Administrator Analytics
   */
  async getAdminAnalytics() {
    const [
      totalUsers,
      totalOrganisers,
      totalCustomers,
      totalVenues,
      totalEvents,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      activeHolds,
      expiredHolds,
      activeWaitlistEntries,
      recentBookings,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.ORGANISER } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.venue.count({ where: { isActive: true } }),
      this.prisma.event.count(),
      this.prisma.booking.count(),
      this.prisma.booking.findMany({
        where: { status: BookingStatus.CONFIRMED },
        select: { totalAmount: true },
      }),
      this.prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
      this.prisma.seatHold.count({
        where: { status: HoldStatus.ACTIVE, expiresAt: { gt: new Date() } },
      }),
      this.prisma.seatHold.count({ where: { status: HoldStatus.EXPIRED } }),
      this.prisma.waitlistEntry.count({ where: { status: WaitlistStatus.WAITING } }),
      this.prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { title: true } },
          items: true,
        },
      }),
      this.prisma.auditLog.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
      }),
    ]);

    const totalRevenue = confirmedBookings.reduce(
      (sum, b) => sum + Number(b.totalAmount),
      0,
    );

    return {
      overview: {
        totalUsers,
        totalOrganisers,
        totalCustomers,
        totalVenues,
        totalEvents,
        totalBookings,
        confirmedBookingsCount: confirmedBookings.length,
        cancelledBookingsCount: cancelledBookings,
        totalRevenue,
        activeHolds,
        expiredHolds,
        activeWaitlistEntries,
      },
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        bookingRef: b.bookingRef,
        customerName: b.user.name,
        customerEmail: b.user.email,
        eventTitle: b.event.title,
        seatCount: b.items.length,
        totalAmount: Number(b.totalAmount),
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      })),
      recentActivity: recentAuditLogs.map((log) => ({
        id: log.id,
        userName: log.user?.name || 'System Worker',
        userRole: log.user?.role || 'SYSTEM',
        action: log.action,
        entityType: log.entityType,
        details: log.details,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }
}
