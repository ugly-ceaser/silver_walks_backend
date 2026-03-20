# Technical Documentation: Availability & Booking System

This document provides a detailed technical overview of how Silver Walks handles nurse availability, time slots, and walk session bookings.

---

## 1. High-Level Architecture

The system is built on a "Rule-to-Slot" materialization pattern. Instead of calculating availability on the fly, the system generates concrete **Slots** from user-defined **Rules**.

- **Availability Rules**: The "Template" (e.g., "I am available every Monday at 9 AM").
- **Availability Slots**: The "Inventory" (e.g., "Nurse Jane is available on 2026-03-16 at 9 AM").
- **Bookings**: The "Reservation" linking a User to a Slot.
- **Walk Sessions**: The "Operational Record" for tracking the actual activity.

---

## 2. Availability Rule Management

### Multi-Parameter Rule Creation
When a nurse creates availability, they can provide multiple days, start times, and durations in a single request. 

**Logic (Cross-Product Generation):**
The backend performs a cross-product of all provided parameters.
- **Input**: `days: [0, 2]`, `times: ["08:00", "09:00"]`, `durations: [30, 60]`
- **Result**: 8 distinct [AvailabilityRule](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/AvailabilityRule.model.ts#27-43) records are created.

### Recurrence Scaling
Rules support three types of recurrence:
- `ONCE`: A single specific date.
- `DAILY`: Every day within the effective date range.
- `WEEKLY`: Every specific day of the week (0-6) within the range.

---

## 3. The Slot Engine (Materialization)

The `SlotEngineService` is responsible for turning Rules into Slots.

### Materialization Process
1. **Trigger**: Triggered automatically whenever a new [AvailabilityRule](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/AvailabilityRule.model.ts#27-43) is created.
2. **Expansion**: The engine looks at the rule's recurrence and effective dates.
3. **Generation**: It creates [AvailabilitySlot](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/AvailabilitySlot.model.ts#34-51) records for the next 30 days (default) that match the rule.
4. **Collision Handling**: It uses a partial unique index (nurse + date + time) to ensure duplicate slots aren't created if materialization runs multiple times.

### Cleanup Logic
A background process periodically scans for `OPEN` slots where the date/time has already passed and updates their status to `EXPIRED`.

---

## 4. Finding Available Nurses (Matching)

The system uses the [AvailabilitySlot](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/AvailabilitySlot.model.ts#34-51) table as the primary source for search.

### Matching Logic ([findMatchingSlot](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/walks/walks.service.ts#363-396))
To find a nurse for a specific walk:
- **Criteria**: Searches for slots where `status = 'OPEN'`, `date = X`, `start_time = Y`, and `duration_mins >= Z`.
- **Ranking**: If multiple nurses satisfy the criteria, the system prioritizes those with the highest **Rating**.
- **Offline Guard**: Even if a slot is open, the system verifies the nurse is not currently `OFFLINE`.

---

## 5. Walk Session & Booking Flow

Booking a walk session is an atomic operation handled by the `BookingService`.

### The Atomic Transaction
To prevent double-booking, the system uses an **Optimistic Locking** strategy via a `version` column on the Slot.

**Step-by-Step Flow:**
1. **Open Transaction**: Start a SQL transaction.
2. **Fetch Slot**: Read the slot and its current `version`.
3. **Guard Update**: Update the slot to `status = 'BOOKED'` and `version = current + 1`. 
   - *Condition*: `WHERE id = ID AND version = current_version`. 
   - *Failure*: If 0 rows are affected, it means another request booked the slot in the millisecond between step 2 and 3. The system throws a `ConflictError`.
4. **Create Booking**: Insert a record into the `bookings` table for audit.
5. **Create Walk Session**: Insert a record into `walk_sessions` for the mobile app to track.
6. **Commit**: Finalize all changes.

---

## 6. Status Lifecycle

### Availability Slot Statuses
- `OPEN`: Available to be booked.
- `BOOKED`: Reserved by a user.
- `CANCELLED`: The nurse removed the rule or the user cancelled the booking (triggering a reopen).
- `EXPIRED`: The time has passed without a booking.

### Walk Session Statuses
- `scheduled`: Created but not yet started (Mapped to `pending` in frontend).
- `confirmed`: Accepted by the nurse (Mapped to `accepted`).
- `in_progress`: The walk is currently happening.
- `completed`: The walk finished successfully.
- `cancelled/rejected`: The walk did not take place.
