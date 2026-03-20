# Nurse Availability Rules Documentation

The Silver Walks platform uses a "Rule-Materialization" engine for nurse availability. Nurses don't just book individual hours; they set **Rules** that the system automatically converts into bookable **Slots**.

## 1. Core Rule Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `recurrence_type` | `DAILY`, `WEEKLY`, or `ONCE` | `WEEKLY` |
| `day_of_week` | 0 (Sunday) to 6 (Saturday). Required for `WEEKLY`. | `1` (Monday) |
| `start_time` | The time the slot starts (24h format). | `"08:00"` |
| `duration_mins` | How long the session lasts. | `120` (2 hours) |
| `effective_from` | The date the rule becomes active. | `"2026-04-01"` |
| `effective_until` | When the rule expires (optional). | `"2026-12-31"` |

## 2. Complex Rule Scenarios

### A. The "Bulk Schedule" (Cartesian Product)
Our API supports creating multiple rules in a single call by providing arrays. This is the most powerful way for a nurse to set a schedule.

**Example Payload:**
```json
{
  "days_of_week": [1, 3, 5], 
  "start_times": ["08:00", "14:00"],
  "duration_mins": [60],
  "effective_from": "2026-03-25"
}
```
**Result**: This single request creates **6 rules**:
- Mon 08:00, Mon 14:00
- Wed 08:00, Wed 14:00
- Fri 08:00, Fri 14:00

### B. Recurring Weekly Shifts
To set a regular shift that lasts all year.
**Example**: "I work every Tuesday morning from 9 AM to 12 PM."
```json
{
  "recurrence_type": "WEEKLY",
  "day_of_week": 2,
  "start_time": "09:00",
  "duration_mins": 180,
  "effective_from": "2026-01-01"
}
```

### C. One-Time Availability
To pick up an extra shift on a specific holiday or date.
**Example**: "I am available only on June 15th for 4 hours."
```json
{
  "recurrence_type": "ONCE",
  "effective_from": "2026-06-15",
  "start_time": "10:00",
  "duration_mins": 240
}
```

## 3. How it Works (Materialization)
*   **The Engine**: As soon as a rule is created, the `SlotEngine` calculates all dates matching the rule for the next **30 days**.
*   **Conflict Prevention**: If a rule tries to create a slot that already exists (same nurse, same time), the system ignores the duplicate to prevent database bloat.
*   **Cleanup**: A background job automatically marks past `OPEN` slots as `EXPIRED` if they weren't booked.

## 4. Postman Integration Tip
When testing in Postman, always check the `nurses/availability/rules` endpoint after a POST to see the list of generated IDs. You will need these IDs if you ever want to **Deactivate** a specific schedule pattern.
