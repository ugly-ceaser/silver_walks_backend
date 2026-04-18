# Auth Error Response Audit — SilverWalks
**Task:** Define error response contract / Login + password reset audit  
**Deadline:** Before 11am  
**Files audited:** `auth.service.ts`, `auth.controller.ts`, `error.util.ts`, `logger.util.ts`

---

## What Was Done

The goal was to audit every error response in the auth flow and ensure two things:

1. No error message leaks internal implementation details to the client (DB structure, entity names, data inconsistencies)
2. No error bypasses the agreed error contract shape `{ code, message, field? }`

The audit covered registration, login, email verification, password reset, token refresh, and logout across both elderly and nurse user flows.

---

## Error Contract

All error responses follow this shape, defined in `error.util.ts`:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "field": "optional — which form field caused the error",
    "details": "optional — validation breakdown"
  }
}
```

Errors are handled centrally in `handleError()`. Operational errors (`AppError` subclasses with `isOperational: true`) return their own status code and message. Unexpected errors always return a generic 500.

---

## Error Classes Available

| Class | Status | Code |
|---|---|---|
| `AppError` | configurable | configurable |
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |

---

## Full Error Response Inventory

### Registration — Elderly (`registerElderlyUser`)

| Scenario | Error Thrown | Code | Status | Notes |
|---|---|---|---|---|
| User exists, unverified, but profile row missing | `AppError('An unexpected error occurred. Please contact support.')` | `INTERNAL_ERROR` | 500 | `isOperational: false` — data integrity issue, logged server-side |
| User exists and is already verified | `ConflictError('An account with this email already exists.')` | `CONFLICT` | 409 | Mild enumeration risk accepted for UX; healthcare context noted |

### Registration — Nurse (`registerNurse`)

| Scenario | Error Thrown | Code | Status | Notes |
|---|---|---|---|---|
| Sequelize/DB failure during transaction | Caught by outer catch, re-thrown as-is | `INTERNAL_ERROR` | 500 | Handled by global `handleError` |

---

### Login — Elderly (`loginElderlyUser` / `checkElderlyRecordsExist`)

| Scenario | Error Thrown | Code | Status | Notes |
|---|---|---|---|---|
| User not found by email or phone | `UnauthorizedError('Invalid credentials')` | `UNAUTHORIZED` | 401 | Timing-safe: dummy password hash checked before throwing |
| Password incorrect | `UnauthorizedError('Invalid credentials')` | `UNAUTHORIZED` | 401 | Same message as above — no distinction exposed |
| Email not verified | `Error('Email not verified. Please verify your email to login.')` | — | 500* | Plain `Error` — routes through generic 500 handler. Acceptable message but should be upgraded to `UnauthorizedError` |
| Profile row missing after auth (data integrity) | `UnauthorizedError('Invalid Credentials')` | `UNAUTHORIZED` | 401 | Hides the internal DB inconsistency |

*Routes to 500 because plain `Error` is not an `AppError` instance — the message never reaches the client.

### Login — Nurse (`loginNurse` / `checkNurseRecordsExist`)

| Scenario | Error Thrown | Code | Status | Notes |
|---|---|---|---|---|
| User not found by email or phone | `UnauthorizedError('Invalid credentials')` | `UNAUTHORIZED` | 401 | Timing-safe dummy check applied |
| Password incorrect | `UnauthorizedError('Invalid credentials')` | `UNAUTHORIZED` | 401 | Same message as above |
| Email not verified | `Error('Email not verified. Please verify your email to login.')` | — | 500* | Same plain `Error` issue as elderly login |
| Profile row missing after auth | `UnauthorizedError('Login Failed')` | `UNAUTHORIZED` | 401 | Safe |

---

### Email Verification (`verifyEmailWithOtp`)

| Scenario | Error Thrown | Code | Status | Notes |
|---|---|---|---|---|
| OTP invalid or expired | `Error('Invalid or expired OTP')` | — | 500* | Safe message, but plain `Error` — should be `ValidationError` |
| User not found for email | `Error('Invalid Credentials')` | — | 500* | Correctly does not reveal account existence |

---

### Password Reset — Initiate (`initiatePasswordReset`)

| Scenario | Error Thrown | Code | Status | Notes |
|---|---|---|---|---|
| Email does not exist | Returns silently with no error | — | 200 | Correct — does not reveal whether email is registered |
| OTP send failure | Logged, re-thrown | `INTERNAL_ERROR` | 500 | Safe |

### Password Reset — Complete (`completePasswordReset`)

| Scenario | Error Thrown | Code | Status | Notes |
|---|---|---|---|---|
| OTP invalid or expired | `Error('Invalid or expired OTP')` | — | 500* | Safe message, plain `Error` issue |
| User not found for email | `Error('Invalid Credentials')` | — | 500* | Safe — no account existence revealed |
| Password update DB failure | Caught by outer catch, re-thrown | `INTERNAL_ERROR` | 500 | Safe |

---

### Token Refresh (`refreshTokens`)

| Scenario | Error Thrown | Code | Status | Notes |
|---|---|---|---|---|
| Token reuse detected | Family revoked, then `UnauthorizedError('Session expired or invalid')` | `UNAUTHORIZED` | 401 | Safe |
| Token not in DB / already revoked | `UnauthorizedError('Session expired or invalid')` | `UNAUTHORIZED` | 401 | Safe |
| Any unexpected error | `UnauthorizedError('Session expired or invalid')` | `UNAUTHORIZED` | 401 | Note: real error is logged before rethrowing |

---

### Logout (`logout`)

| Scenario | Error Thrown | Code | Status | Notes |
|---|---|---|---|---|
| DB failure during token revocation | `AppError('Logout failed. Please try again.')` | `INTERNAL_ERROR` | 500 | Previously swallowed silently — now throws so token revocation failure is surfaced |

---

## Issues Fixed During This Audit

| # | File | What Was Wrong | What Was Changed |
|---|---|---|---|
| 1 | `auth.service.ts` | `"Elderly profile not found"` — leaked DB structure | → `UnauthorizedError("Invalid Credentials")` |
| 2 | `auth.service.ts` | `"Nurse profile not found"` — leaked DB structure | → `UnauthorizedError("Invalid Credentials")` |
| 3 | `auth.service.ts` | `"User not found"` in verifyEmailWithOtp — account enumeration | → `"Invalid Credentials"` |
| 4 | `auth.service.ts` | `"User not found"` in completePasswordReset — account enumeration | → `"Invalid Credentials"` |
| 5 | `auth.service.ts` | `"User exists but elderly profile is missing"` — leaked DB inconsistency state | → `AppError` 500 with `isOperational: false`, real detail logged server-side only |
| 6 | `auth.service.ts` | Manual `(error as any).statusCode = 409` hack on plain `Error` | → `ConflictError("An account with this email already exists.")` |
| 7 | `auth.service.ts` | `AppError` used but not imported | → Added to import from `error.util` |
| 8 | `auth.service.ts` | `logout` silently swallowed DB errors — token revocation could fail invisibly | → Added `throw new AppError(...)` in catch block |
| 9 | `auth.service.ts` | `refreshTokens` catch replaced all errors with generic message, losing real error detail | → Logs original error before throwing `UnauthorizedError` |
| 10 | `auth.service.ts` | `logger.error('Data integrity issue...', { userId })` — wrong argument position | → `logger.error('...', undefined, { userId })` — `error` is 2nd param, `data` is 3rd |
| 11 | `auth.service.ts` | `logger.info` used for suspicious re-registration attempt | → `logger.warn` |

---

## Remaining Known Gaps

| Gap | Location | Priority |
|---|---|---|
| `throw new Error(genericError)` in login helpers still uses plain `Error` (not `UnauthorizedError`) — routes to 500 instead of 401 | `checkElderlyRecordsExist`, `checkNurseRecordsExist` | Medium |
| `throw new Error("Email not verified...")` and OTP errors use plain `Error` — same 500 issue | `verifyEmailWithOtp`, `completePasswordReset` | Medium |
| After password reset, existing refresh tokens are not invalidated — all sessions remain active | `completePasswordReset` | High — security gap |
| `handleErrorResponseOptions` interface in `error.util.ts` is empty dead code | `error.util.ts` | Low |
| `details` typed as `any` in `error.util.ts` | `error.util.ts` | Low |

---

*Documentation generated after audit session. All changes applied to `auth.service.ts`.*