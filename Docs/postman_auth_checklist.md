# Postman Auth Module Documentation Checklist

This checklist provides a comprehensive set of test scenarios for documenting the Authentication module in Postman. Use these scenarios to ensure your documentation covers all possible outcomes.

## 1. POST /register-elderly
*   [ ] **Success (201 Created)**: Valid registration with all required fields (fullName, age, phone, homeAddress, gender, emergency contact details).
*   [ ] **Validation Error (422 Unprocessed Entity)**: Missing required fields (e.g., `phone` or `fullName`).
*   [ ] **Conflict (409 Conflict)**: Attempting to register with an email or phone number that already exists in the system.
*   [ ] **Bad Request (400)**: Invalid data types (e.g., [age](file:///c:/Users/Martins%20Onyia/Documents/Projects/silver_walks_backend/src/modules/nurses/nurses.service.ts#111-134) provided as a string instead of an integer).

## 2. POST /register-nurse
*   [ ] **Success (201 Created)**: Valid registration with professional details (license, experience, specializations).
*   [ ] **Bad Request (422)**: Missing nurse-specific required fields.
*   [ ] **Conflict (409)**: Email or phone already registered.

## 3. POST /login-elderly
*   [ ] **Success (200 OK)**: Valid credentials (email/phone and password). Should return `accessToken` and `refreshToken`.
*   [ ] **Unauthorized (401 Unauthorized)**: Correct identifier but incorrect password.
*   [ ] **Not Found (404 Not Found)**: Identifier (email/phone) does not exist.
*   [ ] **Validation Error (422)**: Identifier or password not provided in the request body.

## 4. POST /verify-otp / /verify-email
*   [ ] **Success (200 OK)**: Sending the correct 6-digit OTP received.
*   [ ] **Expired OTP (401)**: Sending a token that has passed its expiration time.
*   [ ] **Incorrect OTP (401)**: Sending an invalid 6-digit code.
*   [ ] **Rate Limit (429 Too Many Requests)**: More than 5 failed attempts within 15 minutes.

## 5. POST /forgot-password
*   [ ] **Success (200 OK)**: Valid email provided (returns success even if email is not found to prevent user enumeration).
*   [ ] **Invalid Input (422)**: Malformed email address.

## 6. POST /reset-password
*   [ ] **Success (200 OK)**: Valid reset token and new password provided.
*   [ ] **Invalid Token (401)**: Expired or already used password reset token.
*   [ ] **Weak Password (422)**: New password does not meet complexity requirements.

## 7. POST /refresh
*   [ ] **Success (200 OK)**: Valid, non-expired `refreshToken` provided. Returns new `accessToken`.
*   [ ] **Invalid/Expired Refresh Token (401)**: Token is expired, blacklisted, or malformed.
*   [ ] **Missing Token (400)**: No refresh token sent in the request.

## 8. POST /logout
*   [ ] **Success (200 OK)**: Authenticated user revokes their session. Token is blacklisted.
*   [ ] **Missing Auth (401)**: Attempting to logout without a valid `Bearer` token in the header.

---

### Implementation Tips
- **Environment**: Set up a `baseUrl` environment variable.
- **Auto-Auth**: Add this script to the "Tests" tab of your Login request to automatically update your token:
  ```javascript
  const response = pm.response.json();
  if (response.data && response.data.accessToken) {
      pm.environment.set("accessToken", response.data.accessToken);
  }
  ```
