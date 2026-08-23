# 🎟️ TicketFlow Pro — Real-Time Concurrency-Safe Ticket Booking Engine

**TicketFlow Pro** is an enterprise-grade full-stack ticket reservation platform for movies and live events. Engineered around the reality of flash-sales and high demand, the platform treats **seat inventory as a transactional resource** with PostgreSQL row-level locks, automatic 10-minute hold TTL expiration, FIFO category waitlists with cascading offers, real-time WebSocket state synchronization, and digital QR ticket passes.

---

## 🌟 Key Engineering Features

- **🛡️ P0 Concurrency Protection**: Guaranteed zero double-booking or double-holding under simultaneous parallel buyer requests using PostgreSQL transaction row-level locking (`FOR UPDATE`) and partial unique indexes.
- **⏳ 10-Minute Temporary Seat Holds**: Time-limited reservations during checkout with automatic background expiration worker and in-band lazy reclamation.
- **⚡ Real-Time WebSocket Seat Map**: Interactive SVG seat grid with pan/zoom controls and live delta synchronization across all connected clients via Socket.IO.
- **📋 FIFO Category Waitlist & Cascades**: When booked seats are cancelled, the engine automatically creates 5-minute time-limited offers for the earliest waiting customer in the category queue, cascading automatically if expired.
- **🎫 Digital QR Passes**: Cryptographically safe ticket generation with verified QR codes and automated HTML email dispatch.
- **👥 Role-Based Access Control**: Server-side RBAC for `CUSTOMER`, `ORGANISER`, and `ADMIN` with dedicated dashboards.

---

## 🏗️ Technology Stack

| Layer | Technology | Version | Purpose |
|:---|:---|:---|:---|
| **Frontend** | Next.js (App Router) | 14.2.x | React Server Components + Client Boundaries |
| **Styling** | Tailwind CSS + Framer Motion | Latest | Dark cinematic design system |
| **State / Fetching** | TanStack Query v5 | 5.59+ | WebSocket delta cache mutations |
| **Seat Canvas** | SVG + react-zoom-pan-pinch | 3.6.x | DOM-accessible interactive venue grid |
| **Backend** | NestJS | 11.x | Domain-oriented modular monolith |
| **ORM** | Prisma | 6.4.x | Typed schema, migrations, raw SQL locking |
| **Database** | PostgreSQL | 16.x | Row-level locks, advisory locks, partial unique indexes |
| **Real-Time** | Socket.IO | 4.8.x | Room-based real-time event broadcasting |
| **Background Jobs** | Built-in Worker Scheduler / BullMQ | 6.x | Expired hold and offer recycling |
| **Email** | Resend API | Latest | Transactional HTML ticket dispatch |

---

## 📁 Repository Structure

```text
ticket-booking-system/
├── docker-compose.yml          # PostgreSQL 16 & Redis 7 development containers
├── .env.example                # Unified environment variables template
├── SYSTEM_DESIGN.md            # In-depth system design & concurrency write-up
├── API_DOCUMENTATION.md        # Comprehensive REST API contracts
├── README.md                   # Full documentation & setup guide
│
├── server/                     # NestJS Backend API & Real-time Gateway
│   ├── prisma/
│   │   ├── schema.prisma       # 14 relational tables & partial indexes
│   │   └── seed.ts             # Realistic demo venues, events, & users
│   ├── src/
│   │   ├── core/               # PrismaService, RedisService, WebSockets
│   │   ├── common/             # Guards, decorators, filters, interceptors
│   │   └── modules/
│   │       ├── auth/           # JWT authentication & bcrypt hashing
│   │       ├── venues/         # Venue CRUD & visual layout configuration
│   │       ├── events/         # Events discovery & inventory generation
│   │       ├── holds/          # Concurrency hold engine & TTL workers
│   │       ├── bookings/       # Atomic checkout & cancellation triggers
│   │       ├── waitlists/      # FIFO queues & cascading offer engine
│   │       ├── tickets/        # QR code payload & image generation
│   │       ├── notifications/  # Resend email & WebSocket gateway
│   │       └── analytics/      # Organiser & Admin metrics calculation
│   └── test/
│       └── booking-engine.spec.ts  # Concurrency stress tests (20+ buyers)
│
└── client/                     # Next.js 14 Frontend Application
    ├── app/
    │   ├── page.tsx            # Cinematic Landing Page
    │   ├── events/page.tsx     # Event discovery with instant filters
    │   ├── events/[id]/page.tsx# Event details & capacity overview
    │   ├── events/[id]/seats/  # Visual interactive seat map with live sync
    │   ├── checkout/[holdId]/  # Checkout countdown & order summary
    │   ├── bookings/[id]/      # Digital QR ticket pass & cancellation
    │   ├── dashboard/          # Customer bookings & waitlist claims
    │   ├── organiser/          # Organiser revenue & event publisher
    │   ├── admin/              # Admin console & visual venue builder
    │   ├── login/page.tsx      # Sign in with One-Click Demo accounts
    │   └── register/page.tsx   # Sign up with role selection
    ├── components/
    │   ├── seat-map/           # SVG grid, legend, and zoom/pan canvas
    │   ├── booking/            # Countdown timer, ticket card
    │   └── layout/             # Navbar, footer
    └── providers/              # TanStack Query, Auth, & Socket providers
```

---

## ⚡ Quick Start & Running Locally

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **Docker** & **Docker Compose** (for PostgreSQL & Redis)

### 2. Start PostgreSQL & Redis
```bash
# In the root directory:
docker-compose up -d
```

### 3. Setup Backend
```bash
cd server

# Copy environment config
cp .env.example .env

# Generate Prisma Client & Run Database Migrations
npx prisma generate
npx prisma db push

# Seed Realistic Demo Data
npx ts-node prisma/seed.ts

# Start Backend Dev Server (Runs on port 4000)
npm run start:dev
```

### 4. Setup Frontend
```bash
cd ../client

# Start Next.js Development Server (Runs on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## 🔑 One-Click Demo Accounts

The login page features instant **One-Click Demo Fill buttons**:

| Role | Email | Password | Permissions |
|:---|:---|:---|:---|
| **Customer** | `alex.customer@gmail.com` | `Password123!` | Browse events, hold seats, checkout, cancel, join waitlists |
| **Organiser** | `pvr.organiser@cinema.com` | `Password123!` | Create & publish events, set category pricing, revenue analytics |
| **Admin** | `admin@ticketbooking.com` | `Password123!` | Platform metrics, visual venue & layout builder, live audit trail |

---

## 🧪 Concurrency Stress Testing

A dedicated test suite simulates **20 simultaneous parallel buyer requests** competing for the exact same seat at the identical millisecond:

```bash
cd server
npm test
```

### Expected Output:
```text
PASS test/booking-engine.spec.ts
  Booking Engine & Concurrency Unit/Integration Tests
    P0: High-Concurrency Seat Hold (Simultaneous 20+ Contention)
      ✓ guarantees exactly 1 winner and 19 rejections when 20 simultaneous users compete for the same seat (42ms)
    P1: Seat Hold Expiration & Reclaiming
      ✓ automatically recycles expired holds back to AVAILABLE status (28ms)
    P1: Atomic Booking Transaction
      ✓ successfully confirms an active hold into a BOOKED seat with a ticket and QR payload (19ms)
      ✓ rejects booking attempts with an expired hold (14ms)
    P1: Cancellation & Sequential FIFO Waitlist Cascade
      ✓ triggers time-limited offer to first waitlisted customer upon booking cancellation (35ms)
```

---

## 📜 System Verification Scenarios

### Scenario A — Normal Booking Flow
1. Login as `alex.customer@gmail.com`
2. Open *Avengers: Secret Wars* -> Click **Select Seats**
3. Select Seat `B4` -> Click **Hold Seats & Checkout**
4. Observe **08:42 Countdown Timer** in Checkout
5. Click **Confirm & Book Tickets**
6. View generated digital pass with verified QR code.

### Scenario B — Abandoned Checkout & Auto-Release
1. Select Seat `C5` and proceed to checkout
2. Close browser tab or wait for the 10-minute hold to expire
3. Background worker detects `expiresAt < NOW()`, resets seat to `AVAILABLE`, and broadcasts `seat:released`.

### Scenario C — Concurrent Booking Contention
1. Open two separate incognito windows logged into Customer 1 and Customer 2
2. Navigate both to the seat selection map for the same event
3. Click Seat `A1` on both screens simultaneously
4. **Result**: Exactly one customer acquires the hold; the other immediately sees *"Seat A1 is temporarily reserved by another customer."*

### Scenario D — Cancellation & Automatic FIFO Waitlist Cascade
1. Customer A cancels their booking for Seat `A5`
2. The engine detects active waitlist entries for that category
3. The seat status changes to `OFFERED`
4. Customer B (first in FIFO queue) receives an instant notification with a 5-minute countdown offer
5. If Customer B ignores the offer until expiration, the worker cascades the offer to Customer C.

---

## 🚀 Deployment Instructions

- **Backend**: Can be containerized with Docker and deployed to **Railway** or **Render** with PostgreSQL.
- **Frontend**: Deployable directly to **Vercel** with `NEXT_PUBLIC_API_URL` pointing to the backend.

---

## 📄 Documentation Links
- [System Design & Concurrency Strategy](file:///Users/anmoldadhich/.gemini/antigravity/scratch/ticket-booking-system/SYSTEM_DESIGN.md)
- [Complete REST API Documentation](file:///Users/anmoldadhich/.gemini/antigravity/scratch/ticket-booking-system/API_DOCUMENTATION.md)
