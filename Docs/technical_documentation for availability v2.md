# Technical Manual: Silver Walks Availability & Booking Engine

This comprehensive document details the internal architecture, database schema, service logic, and API interfaces for the Silver Walks nurse availability and slot booking system.

---

## 1. Domain Models (Data Layer)

### 1.1 [AvailabilityRule](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/AvailabilityRule.model.ts#27-43)
The "Template" for a nurse's schedule.
| Field | Type | Description |
| :--- | :--- | :--- |
| [id](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/walks/walks.schemaValidator.ts#39-70) | UUID | Primary Key |
| `nurse_id` | UUID | Foreign Key to [NurseProfile](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/NurseProfile.model.ts#49-76) |
| `recurrence_type` | Enum | `WEEKLY`, `DAILY`, `ONCE` |
| `day_of_week` | Int | 0 (Sun) to 6 (Sat). Optional, used for `WEEKLY`. |
| `start_time` | Time | Format: `HH:mm` |
| `duration_mins` | Int | Allowed: `30`, `45`, `60` |
| `effective_from`| Date | Start of rule validity |
| `effective_until` | Date | End of rule validity (Optional) |
| `is_active` | Boolean | Soft-deletion flag |

### 1.2 [AvailabilitySlot](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/AvailabilitySlot.model.ts#34-51)
The "Materialized Inventory".
| Field | Type | Description |
| :--- | :--- | :--- |
| [id](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/walks/walks.schemaValidator.ts#39-70) | UUID | Primary Key |
| `nurse_id` | UUID | Foreign Key to [NurseProfile](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/NurseProfile.model.ts#49-76) |
| [date](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/walks/walks.schemaValidator.ts#39-70) | Date | Specific date of the slot |
| `start_time` | Time | Specific start time |
| `duration_mins` | Int | Duration of this specific slot |
| `status` | Enum | `OPEN`, `BOOKED`, `CANCELLED`, `EXPIRED` |
| `version` | Int | Incremented on every update (Optimistic Locking) |

### 1.3 [Booking](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/Booking.model.ts#29-47)
The "Transaction Audit Log".
| Field | Type | Description |
| :--- | :--- | :--- |
| [id](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/walks/walks.schemaValidator.ts#39-70) | UUID | Primary Key |
| `slot_id` | UUID | Foreign Key to [AvailabilitySlot](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/AvailabilitySlot.model.ts#34-51) |
| `elderly_id` | UUID | Foreign Key to [ElderlyProfile](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/walks/walks.controller.ts#11-21) |
| `booked_by` | UUID | Foreign Key to [User](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/nurses/nurses.repository.ts#86-99) (The requester) |
| `status` | Enum | `CONFIRMED`, `CANCELLED`, `COMPLETED` |

---

## 2. Core Workflows

### 2.1 Availability Rule Scaling
When a nurse submits availability, the `NursesService` generates multiple rules using a cross-product algorithm.

**Example Request:**
```json
{
  "recurrence_type": "WEEKLY",
  "days_of_week": [1, 3],
  "start_times": ["08:00", "10:00"],
  "durations_mins": [30, 60],
  "effective_from": "2026-03-15"
}
```
**Transformation Logic:**
- Days (2) × Times (2) × Durations (2) = **8 [AvailabilityRule](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/AvailabilityRule.model.ts#27-43) records**.
- This granularity allows the search engine to match users with exact duration preferences.

### 2.2 The Slot Engine (Materialization)
Automated task triggered on Rule creation.
1. **Window Selection**: Identifies a 30-day window from `effective_from`.
2. **Expansion**: Iterates through each day in the window. If the day matches the `recurrence_type` and `day_of_week`, a slot is pre-calculated.
3. **Persistance**: Uses `findOrCreate` style logic (enforced by a partial unique index on `nurse_id`, [date](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/walks/walks.schemaValidator.ts#39-70), `start_time`) to prevent duplicates.

### 2.3 Atomic Booking Transaction
The most critical flow in the backend, designed to prevent double-booking.

```mermaid
sequenceDiagram
    participant U as User/Elderly
    participant C as WalksController
    participant S as BookingService
    participant DB as Database
    
    U->>C: POST /walks/book {slotId}
    C->>S: createBooking(slotId, userId)
    S->>S: Start Transaction
    S->>DB: Fetch Slot (status, version)
    DB-->>S: Return Slot {v: 1, status: OPEN}
    S->>DB: UPDATE Slot SET status='BOOKED', v=2 WHERE id=ID AND v=1
    Note right of DB: Optimistic Lock Check
    DB-->>S: rowsAffected: 1
    alt Success
        S->>DB: Create Booking record
        S->>DB: Create WalkSession record
        S->>S: Commit Transaction
        S-->>C: Success Response
        C-->>U: 201 Created
    else Conflict (version mismatch)
        S->>S: Rollback Transaction
        S-->>C: ConflictError
        C-->>U: 409 Conflict (Already Booked)
    end
```

---

## 3. Searching & Ranking

### Finding Matching Nurses (`GET /walks/match`)
1. **Scan**: Queries [AvailabilitySlot](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/AvailabilitySlot.model.ts#34-51) for `OPEN` status, matching date/time.
2. **Duration Filter**: `duration_mins >= requested_duration`.
3. **Availability Filter**: Verifies the `NurseProfile.availability_status` is not `OFFLINE`.
4. **Ranking**: Results are sorted by `NurseProfile.rating` DESC.
5. **Auto-Assignment**: In `auto` mode, the top result is instantly passed to the Booking Service.

---

## 4. Status Lifecycle Diagram

### Availability Slot Lifecycle
```mermaid
stateDiagram-v2
    [*] --> OPEN: Materialized from Rule
    OPEN --> BOOKED: createBooking()
    OPEN --> EXPIRED: Background Cron (Time Passed)
    BOOKED --> OPEN: cancelBooking() (Slot Reopened)
    BOOKED --> CANCELLED: cancelBooking() (Optional Policy)
    OPEN --> CANCELLED: Rule Deactivated
```

---

## 5. API Reference

### Create Availability Rules
`POST /api/v1/nurses/availability/rules`
- **Body**: Accepts `days_of_week[]`, `start_times[]`, and `durations_mins[]`.
- **Result**: Triggers background materialization.

### Get Available Slots
`GET /api/v1/walks/slots?date=YYYY-MM-DD&page=1&limit=10`
- **Response**: Paginated list of slots including nurse names and ratings.

### Create/Book Walk (Batch)
`POST /api/v1/walks`
- **Payload**: Supports `scheduledDates[]` for multi-day booking.
- **Logic**: Iterates through dates, finds match for each, and executes a sub-transaction for each booking.
