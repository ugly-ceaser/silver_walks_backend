# Monday & Tuesday Tasks Audit Documentation

This document compiles the outcomes and specifications for the Monday and Tuesday audit and error code tasks, primarily focusing on the backend implementations.

---

## Monday Tasks

### 1. Registration + OTP Audit (Izumi - BE)

**Goal:** List every error in nurse and elderly registration flows.
**Status:** Completed.

**Registration Errors Generated:**

- **422 Validation Errors:** Detailed schema validation failures (e.g., missing fields, invalid types, length constraints) returned by Joi.
- **`EMAIL_ALREADY_EXISTS` (409):** Thrown when registering an account with an email that is already registered and verified.
- **`PHONE_ALREADY_EXISTS` (409):** Thrown when registering an account with a phone number already linked to an existing profile.
- **`INVALID_PHONE_FORMAT` (400):** Thrown during schema validation if the phone number does not adhere to standard E.164/international formatting requirements.
- **`WEAK_PASSWORD` (400):** Thrown during schema validation if the provided password does not meet the minimum complexity (1 lowercase, 1 uppercase, 1 digit, 1 special character, min 8 chars).

**OTP Verification Errors Generated:**

- **`OTP_INVALID` (400):** Submitting an incorrect OTP code.
- **`OTP_EXPIRED` (400):** Submitting an OTP after its expiration threshold.
- **`OTP_ALREADY_USED` (400):** Submitting an OTP that has already been validated successfully.
- **`OTP_MAX_ATTEMPTS_REACHED` (400):** Surpassing the maximum allowed failed attempts, causing the OTP to be burned and locked.

## Tuesday Tasks

### 1. Registration Error Codes

**Goal:** Implement specific error codes for Registration (`EMAIL_ALREADY_EXISTS`, `PHONE_ALREADY_EXISTS`, `INVALID_PHONE_FORMAT`, `WEAK_PASSWORD`).
**Status:** Completed and integrated.
**Implementation details:**

- Added custom validation hooks in `src/modules/auth/auth.schemaValidator.ts`.
- Integrated phone verification logic into `authRepository` and `registerElderlyUser` / `registerNurse` services within `src/modules/auth/auth.service.ts`.

### 2. OTP Error Codes

**Goal:** Implement specific error codes for OTP (`OTP_EXPIRED`, `OTP_INVALID`, `OTP_MAX_ATTEMPTS_REACHED`, `OTP_ALREADY_USED`).
**Status:** Completed and integrated.
**Implementation details:**

- Modified return type of `verifyOtp` down in `src/services/otp.service.ts` to actively throw `AppError` on explicit failure milestones, replacing a plain boolean check.
