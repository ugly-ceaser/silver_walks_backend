# Postman Walks Module Documentation Checklist

This checklist provides a comprehensive set of test scenarios for documenting the Walks module in Postman.

## 1. GET / (List Walks)
*   [ ] **Success (200 OK)**: Retrieve walks for the authenticated user.
*   [ ] **Filtered Success (200 OK)**: Retrieve walks filtered by status (e.g., `?status=pending`).
*   [ ] **Unauthorized (401)**: Accessing without a valid `Bearer` token.

## 2. POST / (Create Walk)
*   [ ] **Success (201 Created)**: Creating a walk session with a specified date, time, and nurse ID.
*   [ ] **Validation Error (422)**: Missing required fields like `nurse_id` or `scheduled_at`.
*   [ ] **Conflict (409)**: Attempting to create a walk on a day/time where the nurse is already booked.

## 3. POST /book (Book Slot)
*   [ ] **Success (200 OK)**: Booking a pre-existing availability slot.
*   [ ] **Unauthorized (401)**: User not logged in.
*   [ ] **Not Found (404)**: Slot ID does not exist.

## 4. POST /match (Find Nurse)
*   [ ] **Success (200 OK)**: Returns a list of nurses that match elderly preferences/location.
*   [ ] **No Match (200 OK)**: Returns an empty list with a message if no nurses are available.

## 5. GET /slots (Available Slots)
*   [ ] **Success (200 OK)**: Retrieve list of available slots for a given date range.
*   [ ] **Invalid Range (422)**: Start date is after the end date.

## 6. POST /:id/start (Start Walk - Nurse Only)
*   [ ] **Success (200 OK)**: Nurse starting an assigned walk session.
*   [ ] **Forbidden (403)**: Non-nurse user or nurse not assigned to this walk attempting to start.
*   [ ] **Not Found (404)**: Walk ID does not exist.

## 7. PATCH /:id/metrics (Update Metrics - Nurse Only)
*   [ ] **Success (200 OK)**: Updating live metrics (e.g., steps, duration).
*   [ ] **Validation Error (422)**: Invalid metric values (e.g., negative duration).

## 8. POST /:id/complete (Complete Walk - Nurse Only)
*   [ ] **Success (200 OK)**: Finalizing the walk session.
*   [ ] **Already Completed (400)**: Attempting to complete a walk that was already finished.

## 9. Stats & Schedules
*   [ ] **GET /stats (200 OK)**: Returns cumulative statistics for the user.
*   [ ] **GET /schedule/daily (200 OK)**: Returns the current day's agenda.
*   [ ] **GET /schedule/weekly (200 OK)**: Returns the 7-day outlook.

---

### Postman Implementation Tips
- **Header Persistence**: Ensure the `Authorization: Bearer {{accessToken}}` header is present on every request.
- **Dynamic ID**: For the `:id` routes, capture a Walk ID from a previous "List Walks" request into a variable:
  ```javascript
  const walk = pm.response.json().data[0];
  if (walk) { pm.environment.set("currentWalkId", walk.id); }
  ```
