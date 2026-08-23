import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { HoldsService } from '../src/modules/holds/holds.service';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { WaitlistsService } from '../src/modules/waitlists/waitlists.service';
import { UserRole, EventType, EventStatus, SeatStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('Booking Engine & Concurrency Unit/Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let holdsService: HoldsService;
  let bookingsService: BookingsService;
  let waitlistsService: WaitlistsService;

  let testVenueId: string;
  let testEventId: string;
  let testCategoryId: string;
  let testSeatIds: string[] = [];
  let testEventSeatIds: string[] = [];
  let testCustomerIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    holdsService = moduleFixture.get<HoldsService>(HoldsService);
    bookingsService = moduleFixture.get<BookingsService>(BookingsService);
    waitlistsService = moduleFixture.get<WaitlistsService>(WaitlistsService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Setup isolated test fixtures
    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // Create 25 test users for parallel contention tests
    testCustomerIds = [];
    for (let i = 1; i <= 25; i++) {
      const email = `concurrency.user.${i}.${Date.now()}@test.com`;
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: `Concurrency Buyer ${i}`,
          role: UserRole.CUSTOMER,
        },
      });
      testCustomerIds.push(user.id);
    }

    // Create test venue with 5 seats
    const venue = await prisma.venue.create({
      data: {
        name: `Test Arena ${Date.now()}`,
        capacity: 5,
        seatCategories: {
          create: [{ name: 'VIP', color: '#f59e0b', displayOrder: 1 }],
        },
      },
      include: { seatCategories: true },
    });
    testVenueId = venue.id;
    testCategoryId = venue.seatCategories[0].id;

    // Create 5 physical seats
    testSeatIds = [];
    for (let col = 1; col <= 5; col++) {
      const seat = await prisma.seat.create({
        data: {
          venueId: testVenueId,
          categoryId: testCategoryId,
          row: 'A',
          column: col,
          seatNumber: `A${col}`,
        },
      });
      testSeatIds.push(seat.id);
    }

    // Create test event
    const event = await prisma.event.create({
      data: {
        title: `Concurrency Test Event ${Date.now()}`,
        eventType: EventType.MOVIE,
        venueId: testVenueId,
        organiserId: testCustomerIds[0],
        date: new Date('2026-12-01T00:00:00.000Z'),
        startTime: '18:00',
        status: EventStatus.PUBLISHED,
        eventSeatPrices: {
          create: [{ categoryId: testCategoryId, price: 500.0 }],
        },
      },
    });
    testEventId = event.id;

    // Create event_seats
    testEventSeatIds = [];
    for (const sId of testSeatIds) {
      const es = await prisma.eventSeat.create({
        data: {
          eventId: testEventId,
          seatId: sId,
          status: SeatStatus.AVAILABLE,
        },
      });
      testEventSeatIds.push(es.id);
    }
  });

  describe('P0: High-Concurrency Seat Hold (Simultaneous 20+ Contention)', () => {
    it('guarantees exactly 1 winner and 19 rejections when 20 simultaneous users compete for the same seat', async () => {
      const targetEventSeatId = testEventSeatIds[0]; // Seat A1
      const competingBuyers = testCustomerIds.slice(0, 20);

      // Fire 20 parallel requests at the EXACT same instant
      const results = await Promise.allSettled(
        competingBuyers.map((userId) =>
          holdsService.holdSeats(userId, {
            eventId: testEventId,
            eventSeatIds: [targetEventSeatId],
          }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // CRITICAL ASSERTION: Exactly 1 succeeds, 19 fail
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(19);

      // Database verification
      const dbSeat = await prisma.eventSeat.findUnique({
        where: { id: targetEventSeatId },
      });
      expect(dbSeat?.status).toBe(SeatStatus.HELD);

      // Active hold verification
      const activeHolds = await prisma.seatHold.findMany({
        where: {
          eventId: testEventId,
          status: 'ACTIVE',
          items: { some: { eventSeatId: targetEventSeatId } },
        },
      });
      expect(activeHolds.length).toBe(1);
    });
  });

  describe('P1: Seat Hold Expiration & Reclaiming', () => {
    it('automatically recycles expired holds back to AVAILABLE status', async () => {
      const targetEventSeatId = testEventSeatIds[1]; // Seat A2
      const buyerId = testCustomerIds[0];

      // Hold seat
      const hold = await holdsService.holdSeats(buyerId, {
        eventId: testEventId,
        eventSeatIds: [targetEventSeatId],
      });

      // Manually backdate the hold in DB to simulate TTL expiration
      await prisma.seatHold.update({
        where: { id: hold.holdId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      // Run cleanup worker
      const releasedCount = await holdsService.cleanupExpiredHolds();
      expect(releasedCount).toBeGreaterThanOrEqual(1);

      // Verify seat is AVAILABLE again
      const dbSeat = await prisma.eventSeat.findUnique({
        where: { id: targetEventSeatId },
      });
      expect(dbSeat?.status).toBe(SeatStatus.AVAILABLE);

      // Another user should now be able to hold the seat immediately
      const newHold = await holdsService.holdSeats(testCustomerIds[1], {
        eventId: testEventId,
        eventSeatIds: [targetEventSeatId],
      });
      expect(newHold.holdId).toBeDefined();
    });
  });

  describe('P1: Atomic Booking Transaction', () => {
    it('successfully confirms an active hold into a BOOKED seat with a ticket and QR payload', async () => {
      const targetEventSeatId = testEventSeatIds[2]; // Seat A3
      const buyerId = testCustomerIds[2];

      const hold = await holdsService.holdSeats(buyerId, {
        eventId: testEventId,
        eventSeatIds: [targetEventSeatId],
      });

      const booking = await bookingsService.createBooking(buyerId, {
        holdId: hold.holdId,
      });

      expect(booking.bookingRef).toMatch(/^TBS-[A-Z0-9]{6}$/);
      expect(booking.status).toBe('CONFIRMED');
      expect(booking.ticket?.qrDataUrl).toBeDefined();

      const dbSeat = await prisma.eventSeat.findUnique({
        where: { id: targetEventSeatId },
      });
      expect(dbSeat?.status).toBe(SeatStatus.BOOKED);
    });

    it('rejects booking attempts with an expired hold', async () => {
      const targetEventSeatId = testEventSeatIds[3];
      const buyerId = testCustomerIds[3];

      const hold = await holdsService.holdSeats(buyerId, {
        eventId: testEventId,
        eventSeatIds: [targetEventSeatId],
      });

      // Expire hold
      await prisma.seatHold.update({
        where: { id: hold.holdId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await expect(
        bookingsService.createBooking(buyerId, { holdId: hold.holdId }),
      ).rejects.toThrow();
    });
  });

  describe('P1: Cancellation & Sequential FIFO Waitlist Cascade', () => {
    it('triggers time-limited offer to first waitlisted customer upon booking cancellation', async () => {
      const targetEventSeatId = testEventSeatIds[4]; // Seat A5
      const buyerA = testCustomerIds[0];
      const waitlisterB = testCustomerIds[1];
      const waitlisterC = testCustomerIds[2];

      // 1. Buyer A books seat
      const hold = await holdsService.holdSeats(buyerA, {
        eventId: testEventId,
        eventSeatIds: [targetEventSeatId],
      });
      const booking = await bookingsService.createBooking(buyerA, {
        holdId: hold.holdId,
      });

      // 2. Buyer B and Buyer C join waitlist
      await waitlistsService.joinWaitlist(waitlisterB, {
        eventId: testEventId,
        categoryId: testCategoryId,
      });
      await waitlistsService.joinWaitlist(waitlisterC, {
        eventId: testEventId,
        categoryId: testCategoryId,
      });

      // 3. Buyer A cancels booking
      await bookingsService.cancelBooking(buyerA, booking.id);

      // 4. Verify Seat becomes OFFERED to Buyer B (first in FIFO)
      const seatAfterCancel = await prisma.eventSeat.findUnique({
        where: { id: targetEventSeatId },
      });
      expect(seatAfterCancel?.status).toBe(SeatStatus.OFFERED);

      const offerB = await prisma.waitlistOffer.findFirst({
        where: {
          eventSeatId: targetEventSeatId,
          status: 'PENDING',
        },
        include: { waitlistEntry: true },
      });

      expect(offerB).toBeDefined();
      expect(offerB?.waitlistEntry.userId).toBe(waitlisterB);

      // 5. Simulate Buyer B ignoring offer until it expires
      await prisma.waitlistOffer.update({
        where: { id: offerB!.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      // Run offer expiration cleanup -> should cascade to Buyer C!
      await waitlistsService.cleanupExpiredOffers();

      const offerC = await prisma.waitlistOffer.findFirst({
        where: {
          eventSeatId: targetEventSeatId,
          status: 'PENDING',
        },
        include: { waitlistEntry: true },
      });

      expect(offerC).toBeDefined();
      expect(offerC?.waitlistEntry.userId).toBe(waitlisterC);

      // 6. Buyer C accepts offer -> completes booking
      const completedBooking = await waitlistsService.acceptOffer(
        waitlisterC,
        offerC!.id,
      );
      expect(completedBooking.status).toBe('CONFIRMED');

      const finalSeatState = await prisma.eventSeat.findUnique({
        where: { id: targetEventSeatId },
      });
      expect(finalSeatState?.status).toBe(SeatStatus.BOOKED);
    });
  });
});
