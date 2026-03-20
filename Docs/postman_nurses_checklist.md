# Postman Nurse Module Documentation Checklist

This checklist provides a set of test scenarios for documenting the Nurse module in Postman.

## 1. GET / (List Available Nurses)
*   [ ] **Success (200 OK)**: Retrieve a list of qualified nurses with their ratings and specializations.
*   [ ] **Filtered Success (200 OK)**: Filtering by date, time, or specialization (e.g., `?specialization=dementia`).
*   [ ] **Unauthorized (401)**: Accessing without a valid `Bearer` token.

## 2. GET /me (My Profile)
*   [ ] **Success (200 OK)**: Returns the currently logged-in nurse's profile, including their `total_walks_completed` (which we recently fixed!).
*   [ ] **Forbidden (403)**: Attempting to access this endpoint while logged in as an `elderly` user instead of a `nurse`.

## 3. PATCH /profile (Update Profile)
*   [ ] **Success (200 OK)**: Correctly updating name, address, or bio.
*   [ ] **Validation Error (422)**: Sending invalid data types (e.g., rating as a string).

## 4. Availability & Rules
*   [ ] **PUT /availability (200 OK)**: Updating recurring availability slots (e.g., set to Monday 8:00 AM - 12:00 PM).
*   [ ] **POST /availability/rules (201 Created)**: Creating availability rules. Test the following variations:

#### A. The "Bulk Schedule" (Best for initial setup)
Creates multiple rules in one go (Cartesian product).
```json
{
  "days_of_week": [1, 3, 5], 
  "start_times": ["08:00", "14:00"],
  "duration_mins": [60],
  "effective_from": "2026-03-25"
}
```

#### B. Weekly Recurring Rule
```json
{
  "recurrence_type": "WEEKLY",
  "day_of_week": 2,
  "start_time": "09:00",
  "duration_mins": 180,
  "effective_from": "2026-01-01"
}
```

#### C. Daily Recurring Rule
```json
{
  "recurrence_type": "DAILY",
  "start_time": "17:00",
  "duration_mins": 60,
  "effective_from": "2026-01-01"
}
```

#### D. One-Time Availability
```json
{
  "recurrence_type": "ONCE",
  "effective_from": "2026-06-15",
  "start_time": "10:00",
  "duration_mins": 240
}
```

*   [ ] **GET /availability/rules (200 OK)**: Fetching current list of rules.
*   [ ] **DELETE /availability/rules/:id (200 OK)**: Successfully removing a rule.
*   [ ] **Not Found (404)**: Attempting to delete a rule that doesn't exist.

## 5. Certifications
*   [ ] **POST /certifications (201 Created)**: Uploading a new certification (BLS, CPR, etc.).
*   [ ] **DELETE /certifications/:id (200 OK)**: Removing a stale certification.
*   [ ] **Forbidden (403)**: Attempting to delete a certification that belongs to another nurse.

## 6. PATCH /me/device-token (Push Notifications)
*   [ ] **Success (200 OK)**: Updating the device token for mobile push notifications.
*   [ ] **Bad Request (400)**: Token is missing or invalid format.

---

### Postman Implementation Tips
- **Role Control**: Create a separate Postman Environment for a "Nurse User" and an "Elderly User" to easily switch `accessToken` for role-based testing.
- **Dynamic Cleanup**: In the "After Response" (Tests) tab of a `POST /certifications` request, store the new ID:
  ```javascript
  const certId = pm.response.json().data.id;
  pm.environment.set("tempCertId", certId);
  ```
  Then use `{{tempCertId}}` in the `DELETE` request.
