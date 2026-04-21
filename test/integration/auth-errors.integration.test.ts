import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

import authRoutes from '../../src/modules/auth/auth.routes';
import { errorHandler, notFoundHandler } from '../../src/middlewares/error.middleware';
import * as authService from '../../src/modules/auth/auth.service';
import { AppError, ErrorCode } from '../../src/utils/error.util';

let server: http.Server;
let baseUrl = '';

const originalRegisterElderlyUser = authService.registerElderlyUser;
const originalVerifyEmailWithOtp = authService.verifyEmailWithOtp;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get test server address');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  (authService as any).registerElderlyUser = originalRegisterElderlyUser;
  (authService as any).verifyEmailWithOtp = originalVerifyEmailWithOtp;

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

const postJson = async (path: string, body: unknown) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const parsedBody = (await response.json()) as any;

  return {
    status: response.status,
    body: parsedBody,
  };
};

const validElderlyRegistrationPayload = {
  fullName: 'Martha Doe',
  age: 68,
  phone: '+2348012345678',
  email: 'martha@example.com',
  homeAddress: '22 Palm Avenue',
  gender: 'female',
  emergencyContactName: 'John Doe',
  emergencyContactRelationship: 'Son',
  emergencyContactPhone: '+2348098765432',
  password: 'StrongPass1!',
};

test('returns INVALID_PHONE_FORMAT for elderly registration phone validation failure', async () => {
  const response = await postJson('/auth/register-elderly', {
    ...validElderlyRegistrationPayload,
    phone: 'abc-123',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, ErrorCode.INVALID_PHONE_FORMAT);
  assert.equal(response.body.error.message, 'Invalid phone number format');
});

test('returns WEAK_PASSWORD for elderly registration password validation failure', async () => {
  const response = await postJson('/auth/register-elderly', {
    ...validElderlyRegistrationPayload,
    password: 'weak',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, ErrorCode.WEAK_PASSWORD);
  assert.equal(response.body.error.message, 'Password fails complexity requirements');
});

test('returns EMAIL_ALREADY_EXISTS when registration service rejects duplicate email', async () => {
  (authService as any).registerElderlyUser = async () => {
    throw new AppError(
      'An account with this email is already registered and verified. Please login instead.',
      409,
      ErrorCode.EMAIL_ALREADY_EXISTS
    );
  };

  const response = await postJson('/auth/register-elderly', validElderlyRegistrationPayload);

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, ErrorCode.EMAIL_ALREADY_EXISTS);
  assert.equal(
    response.body.error.message,
    'An account with this email is already registered and verified. Please login instead.'
  );

  (authService as any).registerElderlyUser = originalRegisterElderlyUser;
});

test('returns PHONE_ALREADY_EXISTS when registration service rejects duplicate phone', async () => {
  (authService as any).registerElderlyUser = async () => {
    throw new AppError(
      'An account with this phone number is already registered.',
      409,
      ErrorCode.PHONE_ALREADY_EXISTS
    );
  };

  const response = await postJson('/auth/register-elderly', validElderlyRegistrationPayload);

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, ErrorCode.PHONE_ALREADY_EXISTS);
  assert.equal(response.body.error.message, 'An account with this phone number is already registered.');

  (authService as any).registerElderlyUser = originalRegisterElderlyUser;
});

const otpErrorCases = [
  {
    code: ErrorCode.OTP_EXPIRED,
    message: 'OTP has expired',
    route: '/auth/verify-email',
  },
  {
    code: ErrorCode.OTP_INVALID,
    message: 'Invalid OTP',
    route: '/auth/verify-email',
  },
  {
    code: ErrorCode.OTP_MAX_ATTEMPTS_REACHED,
    message: 'Maximum OTP attempts reached',
    route: '/auth/verify-email',
  },
  {
    code: ErrorCode.OTP_ALREADY_USED,
    message: 'OTP has already been used',
    route: '/auth/verify-otp',
  },
];

for (const otpCase of otpErrorCases) {
  test(`returns ${otpCase.code} from verify-email route`, async () => {
    (authService as any).verifyEmailWithOtp = async () => {
      throw new AppError(otpCase.message, 400, otpCase.code);
    };

    const response = await postJson(otpCase.route, {
      email: 'elderly@example.com',
      otp: '123456',
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, otpCase.code);
    assert.equal(response.body.error.message, otpCase.message);

    (authService as any).verifyEmailWithOtp = originalVerifyEmailWithOtp;
  });
}
