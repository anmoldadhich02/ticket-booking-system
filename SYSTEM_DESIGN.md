# Ticket Booking System — System Design Document

## 1. Overview
TicketFlow Pro is a high-concurrency ticket reservation engine for movies and live events. The architecture treats seat inventory as a finite transactional state machine rather than standard CRUD records, guaranteeing zero double-bookings, automatic 10-minute hold TTL expiration, and automated FIFO waitlist cascades.

---

## 2. Seat Hold and TTL Mechanism

### State Lifecycle
Seats transition through strict states: `AVAILABLE` $\rightarrow$ `HELD` $\rightarrow$ `BOOKED` $\rightarrow$ `OFFERED`.

When a customer selects seats, the system places a temporary hold with a configurable TTL (10 minutes) stored in the `seat_holds` table (`expires_at`).

### Drift-Proof PostgreSQL Expiration
Expiration timestamps are computed solely using PostgreSQL server time (`NOW() + INTERVAL '10 minutes'`), never Node.js or client device clocks. This eliminates client clock tampering and distributed clock skew vulnerabilities.

### Two-Tier Expiration Reclamation
1. **In-Band Lazy Check**: Any query checking seat availability or attempting a hold treats `HELD` seats whose `expires_at < NOW()` as immediately claimable.
2. **Active Out-of-Band Worker**: A background scheduler runs every 5 seconds, queries expired active holds using `SELECT FOR UPDATE SKIP LOCKED`, sets hold status to `EXPIRED`, resets `event_seats` back to `AVAILABLE`, and broadcasts `seat:released` events over WebSockets.

---

## 3. Concurrency Prevention Strategy

### The Race Condition Problem
During flash-sale spikes, dozens of customers may click the exact same seat at the identical millisecond.

### Mathematical Zero Double-Booking Guarantee
The system implements a four-layer defense:

1. **Deterministic ID Sorting**: All requested seat IDs are sorted alphabetically (`eventSeatIds.sort()`) before acquiring locks. This prevents circular lock-order deadlocks between concurrent multi-seat orders (e.g. Buyer 1 locking [A1, A2] vs Buyer 2 locking [A2, A1]).
2. **Row-Level Locking**: Inside an interactive transaction under `READ COMMITTED` isolation, target seats are locked using PostgreSQL row-level locks:
   ```sql
   SELECT es.id, es.status
   FROM event_seats es
   WHERE es.id = ANY($1::uuid[]) AND es.event_id = $2::uuid
   ORDER BY es.id ASC
   FOR UPDATE;
   ```
3. **Atomic Conditional State Transitions**:
   ```sql
   UPDATE event_seats
   SET status = 'HELD', version = version + 1, updated_at = NOW()
   WHERE id = ANY($1::uuid[])
     AND event_id = $2
     AND status = 'AVAILABLE'
   RETURNING id;
   ```
   If the returned row count is strictly less than requested seats, the transaction throws a `409 ConflictException`, automatically rolling back the entire reservation.
4. **Database Constraint Safety Net**:
   ```sql
   CREATE UNIQUE INDEX idx_one_active_reservation_per_seat
   ON event_seats(event_id, seat_id)
   WHERE status IN ('HELD', 'BOOKED', 'OFFERED');
   ```
   This makes concurrent double-holding or double-booking physically impossible at the database engine level.

---

## 4. Waitlist Auto-Assignment & Time-Limited Offers

When high-demand events sell out, customers join category-specific FIFO waitlists (`waitlist_entries`).

### FIFO Queue Integrity
Each waitlist entry is assigned an incrementing integer `position` scoped to `(event_id, category_id)`. Duplicate active entries per user and category are blocked by unique constraints.

### Automated Cancellation Handling & Allocation
When a confirmed booking is cancelled:
1. The seat is **NOT** returned to general public availability.
2. The engine queries the earliest `WAITING` candidate using `SELECT id, user_id FROM waitlist_entries WHERE status = 'WAITING' ORDER BY position ASC LIMIT 1 FOR UPDATE SKIP LOCKED`.
3. The seat status transitions to `OFFERED`.
4. A `waitlist_offer` record is generated with a 5-minute TTL (`expires_at = NOW() + INTERVAL '5 minutes'`).
5. The winning customer receives an instant private WebSocket event and transactional email with a direct claim link.

### Multi-Step Sequential Cascades
1. If the customer accepts before expiry, the offer transitions to `ACCEPTED`, and the seat converts atomically to `BOOKED` with QR pass generation.
2. If the offer expires without action, the worker marks the offer `EXPIRED`, queries the **next customer in the FIFO queue**, and generates a new 5-minute offer.
3. The cascade repeats sequentially until a customer claims the seat or the queue is exhausted (in which case the seat returns to `AVAILABLE`).

---

## 5. Real-Time Synchronization & Reconciliation

- **WebSocket Delta Sync**: Clients join event rooms (`event:{eventId}`) via Socket.IO. State changes (`seat:held`, `seat:released`, `seat:booked`, `seat:offered`) emit delta updates that mutate TanStack Query cache directly without full-page reloads.
- **State Reconciliation**: Authoritative seat state automatically re-synchronizes when the browser tab regains visibility (`document.visibilityState === 'visible'`) or on network reconnection.
