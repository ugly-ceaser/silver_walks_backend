# Postman Documentation: Auth Flow

This directory contains the Postman Collection for the Silver Walks Authentication Flow.

## Collection File
- [auth_flow_collection.json](./auth_flow_collection.json)

## How to Import
1. Open Postman.
2. Click on the **Import** button in the top left.
3. Drag and drop the `auth_flow_collection.json` file.
4. Set the `baseUrl` variable in the collection variables if your server is running on a different port (default: `http://localhost:5000`).

## Included Endpoints

### 1. Registration & Verification
- **Register Elderly**: `POST /api/v1/auth/register-elderly`
- **Verify Email**: `POST /api/v1/auth/verify-email`

### 2. Authentication
- **Login Elderly**: `POST /api/v1/auth/login-elderly`

### 3. Password Management
- **Forgot Password**: `POST /api/v1/auth/forgot-password`
- **Reset Password**: `POST /api/v1/auth/reset-password`

## Notes
- **Verification**: You must verify the email before you can log in.
- **OTPs**: In a development environment, check your console or configured email provider for the 6-digit OTP.
- **Passwords**: Ensure passwords meet the complexity requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
