# Thursday Task Documentation: Auth Error Integration Tests

This document records the Thursday backend task completion for auth error integration tests.

---

## Goal

Create integration tests for auth error handling with **one test per error code**, validating:

- HTTP status code
- Error code string
- Error message text

---

## Status

Completed.

Test suite implemented at:

- `test/integration/auth-errors.integration.test.ts`

Script added in:

- `package.json` (`test:auth-errors`)

---

## What Was Implemented

### 1) Integration Test Harness

A minimal Express app is created in the test file with:

- `express.json()`
- Auth router: `src/modules/auth/auth.routes.ts`
- Global handlers:
  - `notFoundHandler`
  - `errorHandler`

This ensures responses are validated through the same route + middleware flow used by the API.

### 2) Error-Code Coverage (One Test Per Code)

The suite includes one dedicated test for each of the following auth-related codes:

1. `INVALID_PHONE_FORMAT`
2. `WEAK_PASSWORD`
3. `EMAIL_ALREADY_EXISTS`
4. `PHONE_ALREADY_EXISTS`
5. `OTP_EXPIRED`
6. `OTP_INVALID`
7. `OTP_MAX_ATTEMPTS_REACHED`
8. `OTP_ALREADY_USED`

Each test asserts:

- `response.status`
- `response.body.error.code`
- `response.body.error.message`

### 3) Route Targets Used

- Registration errors:
  - `POST /auth/register-elderly`
- OTP errors:
  - `POST /auth/verify-email` (for most OTP codes)
  - `POST /auth/verify-otp` (used for `OTP_ALREADY_USED` to avoid endpoint rate-limit collision in test flow)

---

## Test Matrix

| Error Code | Expected HTTP Status | Endpoint Used | Expected Message |
|---|---:|---|---|
| `INVALID_PHONE_FORMAT` | 400 | `/auth/register-elderly` | `Invalid phone number format` |
| `WEAK_PASSWORD` | 400 | `/auth/register-elderly` | `Password fails complexity requirements` |
| `EMAIL_ALREADY_EXISTS` | 409 | `/auth/register-elderly` | `An account with this email is already registered and verified. Please login instead.` |
| `PHONE_ALREADY_EXISTS` | 409 | `/auth/register-elderly` | `An account with this phone number is already registered.` |
| `OTP_EXPIRED` | 400 | `/auth/verify-email` | `OTP has expired` |
| `OTP_INVALID` | 400 | `/auth/verify-email` | `Invalid OTP` |
| `OTP_MAX_ATTEMPTS_REACHED` | 400 | `/auth/verify-email` | `Maximum OTP attempts reached` |
| `OTP_ALREADY_USED` | 400 | `/auth/verify-otp` | `OTP has already been used` |

---

From the project root:

```bash
npm run test:auth-errors
```

---


When successful, output should end with:

- `tests 8`
- `pass 8`
- `fail 0`

---


- The script/code uses Node's built-in test runner (`node:test`) through `ts-node/register`.
-