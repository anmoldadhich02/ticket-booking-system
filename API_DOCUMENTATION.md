# Ticket Booking System — REST API Specification

**Base URL**: `http://localhost:4000/api`  
**Authentication**: Bearer Token in `Authorization` header OR HTTP-only `auth_token` cookie.

---

## 1. Standard Response Formats

### Success Response
```json
{
  "success": true,
  "data": {},
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "SEAT_ALREADY_HELD",
    "message": "Seat A4 is temporarily reserved by another customer."
  }
}
```

---

## 2. Authentication API

### `POST /auth/register`
Creates a new customer or organiser account.
- **Access**: Public
- **Body**:
  ```json
  {
    "name": "Alex Johnson",
    "email": "alex.customer@gmail.com",
    "password": "Password123!",
    "role": "CUSTOMER"
  }
  ```
- **Response `201 Created`**: Returns `{ user, token }` and sets `auth_token` cookie.

### `POST /auth/login`
Authenticates existing user.
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "alex.customer@gmail.com",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`**: Returns `{ user, token }`.

### `POST /auth/logout`
Clears session cookies.
- **Access**: Authenticated

### `GET /auth/me`
Retrieves authenticated user profile.
- **Access**: Authenticated

---

## 3. Events API

### `GET /events`
Query upcoming events with optional filters.
- **Access**: Public
- **Query Params**:
  - `search` (string)
  - `eventType` (`MOVIE`, `CONCERT`, `THEATRE`, `SPORTS`, `COMEDY`)
  - `sortBy` (`date`, `price`)
  - `page` (number), `limit` (number)

### `GET /events/:id`
Retrieves detailed event info, venue information, category pricing, and live seat count.
- **Access**: Public

### `GET /events/:id/seats`
Retrieves visual seat grid, category colors, and real-time status (`AVAILABLE`, `HELD`, `BOOKED`, `OFFERED`).
- **Access**: Public (authenticates session if provided to reflect user-owned holds).

### `POST /events`
Publishes a new event and generates `event_seats` inventory.
- **Access**: `ORGANISER`, `ADMIN`
- **Body**:
  ```json
  {
    "title": "Avengers: Secret Wars",
    "eventType": "MOVIE",
    "venueId": "uuid-venue-id",
    "date": "2026-09-15",
    "startTime": "19:30",
    "categoryPrices": [
      { "categoryId": "uuid-vip", "price": 650.0 },
      { "categoryId": "uuid-prem", "price": 450.0 }
    ]
  }
  ```

---

## 4. Seat Hold Engine API

### `POST /holds`
Acquires a concurrency-safe 10-minute temporary seat hold.
- **Access**: `CUSTOMER`
- **Body**:
  ```json
  {
    "eventId": "uuid-event-id",
    "eventSeatIds": ["uuid-event-seat-1", "uuid-event-seat-2"]
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "holdId": "uuid-hold-id",
    "expiresAt": "2026-08-23T18:00:00.000Z",
    "serverTime": "2026-08-23T17:50:00.000Z",
    "ttlSeconds": 600,
    "totalAmount": 1300.0,
    "seats": [
      { "seatNumber": "A1", "categoryName": "VIP", "price": 650.0 },
      { "seatNumber": "A2", "categoryName": "VIP", "price": 650.0 }
    ]
  }
  ```

### `POST /holds/release`
Manually releases an active hold before expiration.
- **Access**: `CUSTOMER` (hold owner)

### `GET /holds/:id`
Inspects active hold details and remaining seconds.
- **Access**: `CUSTOMER` (hold owner)

---

## 5. Bookings API

### `POST /bookings`
Converts an active hold into a confirmed booking with digital QR ticket.
- **Access**: `CUSTOMER`
- **Body**:
  ```json
  {
    "holdId": "uuid-hold-id",
    "idempotencyKey": "optional-unique-string"
  }
  ```
- **Response `201 Created`**: Returns `{ id, bookingRef, totalAmount, status, ticket: { qrDataUrl, bookingRef } }`.

### `POST /bookings/:id/cancel`
Cancels confirmed booking, releases seats, and triggers FIFO waitlist allocation.
- **Access**: `CUSTOMER` (booking owner)

### `GET /bookings`
Retrieves authenticated customer's booking history.
- **Access**: `CUSTOMER`

### `GET /bookings/:id`
Retrieves booking pass and ticket details.
- **Access**: `CUSTOMER` (booking owner)

---

## 6. Waitlist API

### `POST /waitlist/join`
Queues customer into category-specific FIFO waitlist.
- **Access**: `CUSTOMER`
- **Body**:
  ```json
  {
    "eventId": "uuid-event-id",
    "categoryId": "uuid-category-id"
  }
  ```

### `POST /waitlist/accept-offer`
Claims time-limited waitlist offer and creates confirmed booking.
- **Access**: `CUSTOMER`
- **Body**:
  ```json
  {
    "offerId": "uuid-offer-id"
  }
  ```

### `GET /waitlist/my-status`
Returns customer's active waitlist queue positions and pending offers.
- **Access**: `CUSTOMER`

---

## 7. Admin & Organiser Analytics API

### `GET /analytics/organiser`
Returns revenue, occupancy %, tickets sold, and per-event stats.
- **Access**: `ORGANISER`, `ADMIN`

### `GET /analytics/admin`
Returns platform-wide metrics, active holds, expired holds, waitlist totals, and live audit trails.
- **Access**: `ADMIN`
