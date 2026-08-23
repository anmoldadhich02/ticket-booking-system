import { PrismaClient, UserRole, EventType, EventStatus, SeatStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.waitlistOffer.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.seatHoldItem.deleteMany();
  await prisma.seatHold.deleteMany();
  await prisma.eventSeat.deleteMany();
  await prisma.eventSeatPrice.deleteMany();
  await prisma.event.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.seatCategory.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // 2. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ticketbooking.com',
      passwordHash,
      name: 'System Administrator',
      role: UserRole.ADMIN,
    },
  });

  const organiserCinema = await prisma.user.create({
    data: {
      email: 'pvr.organiser@cinema.com',
      passwordHash,
      name: 'PVR Events Team',
      role: UserRole.ORGANISER,
    },
  });

  const organiserConcert = await prisma.user.create({
    data: {
      email: 'live.nation@concerts.com',
      passwordHash,
      name: 'Live Nation Shows',
      role: UserRole.ORGANISER,
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'alex.customer@gmail.com',
      passwordHash,
      name: 'Alex Johnson',
      role: UserRole.CUSTOMER,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'priya.patel@gmail.com',
      passwordHash,
      name: 'Priya Patel',
      role: UserRole.CUSTOMER,
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      email: 'rahul.sharma@gmail.com',
      passwordHash,
      name: 'Rahul Sharma',
      role: UserRole.CUSTOMER,
    },
  });

  const customer4 = await prisma.user.create({
    data: {
      email: 'sarah.smith@gmail.com',
      passwordHash,
      name: 'Sarah Smith',
      role: UserRole.CUSTOMER,
    },
  });

  console.log('✅ Users seeded');

  // 3. Create Venues and Seat Layouts
  // Venue 1: PVR Grand Cinema (Cinema Layout)
  const venue1 = await prisma.venue.create({
    data: {
      name: 'PVR Grand Cinema, Phoenix Mall',
      address: 'Lower Parel, Mumbai, Maharashtra 400013',
      description: '4K Laser Projection Dolby Atmos Cinema Hall with luxury recliner seating.',
      capacity: 48,
      seatCategories: {
        create: [
          { name: 'Recliner VIP', color: '#f59e0b', displayOrder: 1 },
          { name: 'Premium', color: '#06b6d4', displayOrder: 2 },
          { name: 'Executive', color: '#3b82f6', displayOrder: 3 },
          { name: 'Classic', color: '#64748b', displayOrder: 4 },
        ],
      },
    },
    include: { seatCategories: true },
  });

  const categories1 = venue1.seatCategories;
  const vipCat1 = categories1.find((c) => c.name === 'Recliner VIP')!;
  const premCat1 = categories1.find((c) => c.name === 'Premium')!;
  const execCat1 = categories1.find((c) => c.name === 'Executive')!;
  const classicCat1 = categories1.find((c) => c.name === 'Classic')!;

  // Generate 48 physical seats for Venue 1 (Rows A to F, 8 columns each, with aisle in middle)
  const seatsVenue1: any[] = [];
  const rows1 = [
    { row: 'A', cat: vipCat1.id },
    { row: 'B', cat: premCat1.id },
    { row: 'C', cat: premCat1.id },
    { row: 'D', cat: execCat1.id },
    { row: 'E', cat: execCat1.id },
    { row: 'F', cat: classicCat1.id },
  ];

  for (const r of rows1) {
    for (let col = 1; col <= 8; col++) {
      seatsVenue1.push({
        venueId: venue1.id,
        categoryId: r.cat,
        row: r.row,
        column: col,
        seatNumber: `${r.row}${col}`,
        isAisle: false,
      });
    }
  }
  await prisma.seat.createMany({ data: seatsVenue1 });

  // Venue 2: The Royal Arena (Concert Arena)
  const venue2 = await prisma.venue.create({
    data: {
      name: 'The Royal Arena, Whitefield',
      address: 'ITPL Main Road, Bangalore, Karnataka 560066',
      description: 'State of the art indoor arena engineered for world-class acoustics and live concerts.',
      capacity: 32,
      seatCategories: {
        create: [
          { name: 'Platinum Front Row', color: '#ec4899', displayOrder: 1 },
          { name: 'Gold Club', color: '#f59e0b', displayOrder: 2 },
          { name: 'Silver Tier', color: '#3b82f6', displayOrder: 3 },
        ],
      },
    },
    include: { seatCategories: true },
  });

  const categories2 = venue2.seatCategories;
  const platCat2 = categories2.find((c) => c.name === 'Platinum Front Row')!;
  const goldCat2 = categories2.find((c) => c.name === 'Gold Club')!;
  const silverCat2 = categories2.find((c) => c.name === 'Silver Tier')!;

  const seatsVenue2: any[] = [];
  const rows2 = [
    { row: 'A', cat: platCat2.id, count: 8 },
    { row: 'B', cat: goldCat2.id, count: 8 },
    { row: 'C', cat: goldCat2.id, count: 8 },
    { row: 'D', cat: silverCat2.id, count: 8 },
  ];

  for (const r of rows2) {
    for (let col = 1; col <= r.count; col++) {
      seatsVenue2.push({
        venueId: venue2.id,
        categoryId: r.cat,
        row: r.row,
        column: col,
        seatNumber: `${r.row}${col}`,
        isAisle: false,
      });
    }
  }
  await prisma.seat.createMany({ data: seatsVenue2 });

  console.log('✅ Venues and physical seats seeded');

  // 4. Create Events
  // Event 1: Avengers: Secret Wars (Available seats)
  const physicalSeatsV1 = await prisma.seat.findMany({ where: { venueId: venue1.id } });

  const event1 = await prisma.event.create({
    data: {
      title: 'Avengers: Secret Wars',
      description: 'The multiverse collides in the epic culmination of the Marvel Cinematic Universe saga. Witness all heroes unite on the biggest screen.',
      posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
      eventType: EventType.MOVIE,
      venueId: venue1.id,
      organiserId: organiserCinema.id,
      date: new Date('2026-09-15T00:00:00.000Z'),
      startTime: '19:30',
      endTime: '22:30',
      status: EventStatus.PUBLISHED,
      eventSeatPrices: {
        create: [
          { categoryId: vipCat1.id, price: 650.0 },
          { categoryId: premCat1.id, price: 450.0 },
          { categoryId: execCat1.id, price: 320.0 },
          { categoryId: classicCat1.id, price: 220.0 },
        ],
      },
    },
  });

  // Populate event_seats inventory for Event 1
  await prisma.eventSeat.createMany({
    data: physicalSeatsV1.map((s) => ({
      eventId: event1.id,
      seatId: s.id,
      status: SeatStatus.AVAILABLE,
    })),
  });

  // Event 2: Coldplay: Music of the Spheres (Sold Out with Active Waitlist)
  const physicalSeatsV2 = await prisma.seat.findMany({ where: { venueId: venue2.id } });

  const event2 = await prisma.event.create({
    data: {
      title: 'Coldplay: Music of the Spheres World Tour',
      description: 'Experience an unforgettable spectacle of light, music, and euphoria as Coldplay performs live in Bangalore.',
      posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
      eventType: EventType.CONCERT,
      venueId: venue2.id,
      organiserId: organiserConcert.id,
      date: new Date('2026-10-20T00:00:00.000Z'),
      startTime: '18:00',
      endTime: '21:30',
      status: EventStatus.PUBLISHED,
      eventSeatPrices: {
        create: [
          { categoryId: platCat2.id, price: 9500.0 },
          { categoryId: goldCat2.id, price: 6500.0 },
          { categoryId: silverCat2.id, price: 3500.0 },
        ],
      },
    },
  });

  // Mark all seats as BOOKED for Event 2 (to showcase waitlist system)
  await prisma.eventSeat.createMany({
    data: physicalSeatsV2.map((s) => ({
      eventId: event2.id,
      seatId: s.id,
      status: SeatStatus.BOOKED,
    })),
  });

  // Add waitlist entries for Event 2
  await prisma.waitlistEntry.createMany({
    data: [
      {
        eventId: event2.id,
        userId: customer1.id,
        categoryId: platCat2.id,
        position: 1,
        status: 'WAITING',
      },
      {
        eventId: event2.id,
        userId: customer2.id,
        categoryId: platCat2.id,
        position: 2,
        status: 'WAITING',
      },
      {
        eventId: event2.id,
        userId: customer3.id,
        categoryId: goldCat2.id,
        position: 1,
        status: 'WAITING',
      },
    ],
  });

  // Event 3: Interstellar 10th Anniversary (Partially booked with existing booking and tickets)
  const event3 = await prisma.event.create({
    data: {
      title: 'Interstellar — 10th Anniversary IMAX Re-Release',
      description: 'Christopher Nolan’s timeless sci-fi masterpiece returns to the IMAX screen with heart-stopping remastered audio and visual fidelity.',
      posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
      eventType: EventType.MOVIE,
      venueId: venue1.id,
      organiserId: organiserCinema.id,
      date: new Date('2026-09-28T00:00:00.000Z'),
      startTime: '20:00',
      endTime: '23:15',
      status: EventStatus.PUBLISHED,
      eventSeatPrices: {
        create: [
          { categoryId: vipCat1.id, price: 700.0 },
          { categoryId: premCat1.id, price: 500.0 },
          { categoryId: execCat1.id, price: 350.0 },
          { categoryId: classicCat1.id, price: 250.0 },
        ],
      },
    },
  });

  const eventSeats3 = await prisma.eventSeat.createManyAndReturn({
    data: physicalSeatsV1.map((s, idx) => ({
      eventId: event3.id,
      seatId: s.id,
      status: idx < 4 ? SeatStatus.BOOKED : SeatStatus.AVAILABLE,
    })),
  });

  // Create a confirmed booking for customer1 on Event 3
  const bookedEventSeats = eventSeats3.slice(0, 2);
  const bookingRef = 'TBS-7KX92P';
  const booking = await prisma.booking.create({
    data: {
      bookingRef,
      eventId: event3.id,
      userId: customer1.id,
      totalAmount: 1400.0,
      status: 'CONFIRMED',
      items: {
        create: [
          {
            eventSeatId: bookedEventSeats[0].id,
            seatLabel: 'A1',
            categoryName: 'Recliner VIP',
            price: 700.0,
          },
          {
            eventSeatId: bookedEventSeats[1].id,
            seatLabel: 'A2',
            categoryName: 'Recliner VIP',
            price: 700.0,
          },
        ],
      },
      ticket: {
        create: {
          qrPayload: JSON.stringify({ ref: bookingRef, type: 'TICKET_BOOKING_SYSTEM', v: 1 }),
        },
      },
    },
  });

  console.log('✅ Events, bookings, and waitlists seeded successfully');
  console.log('\n--- DEMO ACCOUNTS ---');
  console.log('Admin:       admin@ticketbooking.com        / Password123!');
  console.log('Organiser 1: pvr.organiser@cinema.com       / Password123!');
  console.log('Organiser 2: live.nation@concerts.com       / Password123!');
  console.log('Customer 1:  alex.customer@gmail.com        / Password123!');
  console.log('Customer 2:  priya.patel@gmail.com         / Password123!');
  console.log('Customer 3:  rahul.sharma@gmail.com        / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
