# Silver Walks: Deep Auth System Analysis

This report provides a comprehensive review of the authentication and authorization architecture, detailing the logic, data flow, and security measures implemented across all layers.

---

## 1. Physical Architecture & Data Models

### **User Model ([User.model.ts](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/User.model.ts))**
The central hub for identity. It stores credentials and status.
- **Attributes**: `email` (Unique), `password_hash`, `role` (Admin/Elderly/Nurse), `status` (Active/Pending/etc.), `is_email_verified`.
- **Logic**: Uses standard `bcrypt` hashing for passwords.

### **OTP Model ([Otp.model.ts](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/Otp.model.ts))**
Handles transient security tokens.
- **Purpose**: Scoped by `OtpPurpose` (Verification, Reset, etc.).
- **Security**: Includes `expires_at` (TTL-based) and `is_used` (One-time use enforcement).

---

## 2. Logical Flows & Service Layer ([auth.service.ts](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/auth/auth.service.ts))

### **Registration (Transactional Multi-Step)**
Both Elderly and Nurse registrations are wrapped in **Sequelize Transactions** to ensure atomic success or failure across multiple tables.

- **Elderly Flow**:
  1. Creates a [User](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/User.model.ts#33-46) record with a temporary hashed password.
  2. Creates an [ElderlyProfile](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/ElderlyProfile.model.ts#34-56).
  3. Creates an [EmergencyContact](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/auth/auth.repository.ts#25-31).
  4. Creates a [HealthProfile](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/auth/auth.repository.ts#32-38) with structured medical conditions and medications.
  5. Triggers an asynchronous (non-blocking) OTP for email verification.

- **Nurse Flow**:
  1. Creates a [User](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/User.model.ts#33-46) record (Status: `PENDING`).
  2. Creates a [NurseProfile](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/models/NurseProfile.model.ts#51-80).
  3. Batch creates [NurseCertification](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/auth/auth.repository.ts#46-52) and [NurseAvailability](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/auth/auth.repository.ts#53-59) records.
  4. Triggers verification OTP.

### **Login & Identity Resolving**
- **Identifier Agnosticism**: The system resolves users by either `email` or `phone`. If a phone number is provided, it looks up the profile first to find the associated `userId`.
- **JWT Generation**: On success, it generates a `TokenPair`. The payload includes `userId`, `email`, and `role`.

### **Verification & Password Recovery**
- **OTP Verification**: Validates the code, marks the user as verified, and sets `email_verified_at`. It then triggers a welcome email.
- **Password Reset**: A two-stage process (Initiate -> Complete). Completion requires a valid OTP and enforces password complexity during the update.

---

## 3. Controller Layer ([auth.controller.ts](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/auth/auth.controller.ts))

The controller acts as the orchestrator:
1. **Request Reception**: Receives the raw Express request.
2. **Service Invocation**: Calls corresponding `authService` methods.
3. **Common Response Handling**: Uses `createdResponse` or `validationErrorResponse` utils to ensure consistent JSON outputs.
4. **Error Propagation**: Delegates error handling to the `next(error)` middleware.

---

## 4. Middleware & Security Enforcers

### **Authentication ([auth.middleware.ts](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/middlewares/auth.middleware.ts))**
- Verifies the `Bearer` token.
- **Active Check**: Ensures the user is still `is_active` in the database, preventing disabled accounts with valid tokens from gaining access.

### **Authorization ([rbac.middleware.ts](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/middlewares/rbac.middleware.ts))**
- **Role Isolation**: Strictly enforces roles. A Nurse cannot access Elderly-specific endpoints (and vice-versa).
- **Ownership Verification**: Provides utility functions ([requireOwnership](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/middlewares/rbac.middleware.ts#79-96)) to ensure users can only modify their own profiles or sub-resources.

### **Rate Limiting ([rateLimit.middleware.ts](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/middlewares/rateLimit.middleware.ts))**
- Dedicated limiters for high-risk endpoints:
  - `authRateLimiter` (Login)
  - `passwordResetRateLimiter`
  - `emailVerificationRateLimiter`

---

## 5. Schema Validation ([auth.schemaValidator.ts](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/auth/auth.schemaValidator.ts))

Powered by **Joi**, the validation layer ensures data integrity before it hits the service.

- **Sanitization**: All string inputs pass through [stripHtmlAndControlChars](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/auth/auth.schemaValidator.ts#5-10) to prevent XSS and control-character injection.
- **Complex Regex**:
  - **Phone**: Validates international E.164 formats.
  - **Password**: Enforces "Strong Password" rules (Uppercase, Lowercase, Number, Special Char).
- **Conditional Logic**: Registration schemas are modular, validating nested arrays (like certifications or medications) with specific constraints (e.g., max 20 health conditions).

---

## 6. Repository Layer ([auth.repository.ts](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/auth/auth.repository.ts))

Provides a clean abstraction over Sequelize:
- **Clean Queries**: Centralizes all `Model.create`, `Model.findOne`, and `Model.update` calls.
- **Includes**: Handles the joining of User and Profile tables during lookup (especially for phone-based logins).
