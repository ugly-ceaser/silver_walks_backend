import { UserRole, UserStatus } from "../../models/User.model";
import { sequelize } from "../../config/database.config";
import { SubscriptionStatus, SubscriptionPlan } from "../../types/subscription.types";
import { MobilityLevel } from "../../types/mobility.types";
import { logger } from "../../utils/logger.util";
import { comparePassword, hashPassword } from "../../utils/encryption.util";
import { sendElderlyWelcomeEmail, sendNurseWelcomeEmail, sendPasswordResetSuccessEmail } from "../../utils/emailHelpers.util";
import { otpService } from "../../services/otp.service";
import { OtpPurpose } from "../../models/Otp.model";
import { authRepository } from "./auth.repository";
import { generateTokenPair, verifyRefreshToken } from "../../utils/jwt.util";
import RefreshToken from "../../models/RefreshToken.model";
import AuthEvent, { AuthEventType } from "../../models/AuthEvent.model";
import { hashData } from "../../utils/encryption.util";
import { Op } from "sequelize";


//  DTO Type
interface RegisterElderlyUserData {
  fullName: string;
  age: number;
  phone: string;
  email?: string;
  homeAddress: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  healthConditions?: string[] | string;
  currentMedications?: string[] | string;
  specialNeeds?: string;
  gender: string;
  mobilityLevel?: string;
}

interface RegisterNurseData {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  yearsOfExperience: number;
  maxPatientsPerDay: number;
  address: string;
  certifications: {
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate: string | null;
  }[];
  specializations: string[];
  availableTimeSlots: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
}

interface CheckElderlyRecords {
  identifier: string; // email or phone
  password: string;
}

//  Return Type (Explicit)
interface RegisterElderlyResult {
  userId: string;
  elderlyProfileId: string;
  email: string;
}

interface RegisterNurseResult {
  userId: string;
  nurseProfileId: string;
  email: string;
}

interface LoginNurseResult {
  userId: string;
  nurseProfileId: string;
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
}

interface LoginElderlyResult {
  userId: string;
  elderlyProfileId: string;
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
}

/**  Helper: Generate fallback email */
const generateFallbackEmail = (phone: string) => `elderly_${phone}@silverwalks.com`;

/** Helper: Calculate approximate DOB */
const calculateDOB = (age: number) => {
  const year = new Date().getFullYear() - age;
  return new Date(year, 0, 1); // January 1st
};

/** Helper: Log Auth Event */
const logAuthEvent = async (
  userId: string | undefined,
  eventType: AuthEventType,
  reqInfo: { ip: string; userAgent: string },
  metadata?: any
) => {
  try {
    await AuthEvent.create({
      user_id: userId,
      event_type: eventType,
      ip_address: reqInfo.ip,
      user_agent: reqInfo.userAgent,
      metadata,
    });
  } catch (error) {
    logger.error('Failed to log auth event', error as Error);
  }
};

/** Helper: Dummy password check for timing-safe account enumeration guard */
const dummyPasswordCheck = async (password: string) => {
  const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$6vB7f7M7...'; // Realistic Argon2 dummy hash
  await comparePassword(password, dummyHash);
};

/**  Separated DB logic  */
const createElderlyRecords = async (data: RegisterElderlyUserData, t: any) => {
  const {
    fullName,
    age,
    phone,
    email,
    homeAddress,
    emergencyContactName,
    emergencyContactRelationship,
    emergencyContactPhone,
    healthConditions,
    currentMedications,
    specialNeeds,
    gender,
    mobilityLevel,
  } = data;

  // Generate temporary password and hash it
  const tempPassword = "SilverWalks123#"; //crypto.randomBytes(8).toString('hex'); // Generate random temp password
  const hashedPassword = await hashPassword(tempPassword);
  //  User Record
  const user = await authRepository.createUser(
    {
      email: email || generateFallbackEmail(phone),
      password_hash: hashedPassword,
      role: UserRole.ELDERLY,
      status: UserStatus.ACTIVE,
      is_active: true,
    },
    t
  );

  //  Elderly Profile
  const elderlyProfile = await authRepository.createElderlyProfile(
    {
      user_id: user.id,
      name: fullName,
      date_of_birth: calculateDOB(age),
      phone,
      address: homeAddress,
      gender,
      subscription_plan: SubscriptionPlan.BASIC,
      subscription_status: SubscriptionStatus.ACTIVE,
      walks_remaining: 0,
      walks_used_this_month: 0,
      latitude: 0, // Default for now
      longitude: 0, // Default for now
    },
    t
  );

  //  Emergency Contact
  await authRepository.createEmergencyContact(
    {
      elderly_id: elderlyProfile.id,
      name: emergencyContactName,
      relationship: emergencyContactRelationship,
      phone: emergencyContactPhone,
      email: email || "",
      is_primary: true,
    },
    t
  );

  // Ensure healthConditions is an array
  const healthList = Array.isArray(healthConditions)
    ? healthConditions
    : (healthConditions && typeof healthConditions === 'string' ? healthConditions.split(',').map(c => c.trim()).filter(c => c !== '') : []);

  // Ensure currentMedications is an array
  const medicationList = Array.isArray(currentMedications)
    ? currentMedications
    : (currentMedications && typeof currentMedications === 'string' ? currentMedications.split(',').map(m => m.trim()).filter(m => m !== '') : []);

  // Map mobilityLevel string to enum if needed (case-insensitive)
  let mLevel = MobilityLevel.INDEPENDENT;
  if (mobilityLevel) {
    const normalized = mobilityLevel.toUpperCase().trim();
    if (Object.values(MobilityLevel).includes(normalized as MobilityLevel)) {
      mLevel = normalized as MobilityLevel;
    } else if (normalized.includes('INDEPENDENT')) {
      mLevel = MobilityLevel.INDEPENDENT;
    } else if (normalized.includes('ASSISTED')) {
      mLevel = MobilityLevel.ASSISTED;
    } else if (normalized.includes('WHEELCHAIR')) {
      mLevel = MobilityLevel.WHEELCHAIR;
    } else if (normalized.includes('BEDRIDDEN')) {
      mLevel = MobilityLevel.BEDRIDDEN;
    }
  }

  //  Health Profile
  await authRepository.createHealthProfile(
    {
      elderly_id: elderlyProfile.id,
      medical_conditions: healthList.map((c) => ({
        condition: c,
        diagnosedDate: null,
        notes: "",
      })),

      medications: medicationList.map((m) => ({
        medication: m,
        dosage: "",
        frequency: "",
        prescribedDate: null,
      })),

      allergies: [],
      dietary_restrictions: [],
      emergency_notes: specialNeeds || "",
      mobility_level: mLevel,
    },
    t
  );

  return { user, elderlyProfile };
};

/**  Separated DB logic for login  */
const checkElderlyRecordsExist = async (data: CheckElderlyRecords, reqInfo: { ip: string; userAgent: string }) => {
  const { identifier, password } = data;
  const genericError = "Invalid credentials";

  let user = await authRepository.findUserByEmail(identifier);
  let elderlyProfile = null;

  // If not found by email, try phone lookup
  if (!user) {
    elderlyProfile = await authRepository.findElderlyProfileByPhone(identifier);
    if (elderlyProfile && elderlyProfile.user_id) {
      user = await authRepository.findUserById(elderlyProfile.user_id);
    }
  }

  // Account enumeration guard: even if user not found, perform dummy check
  if (!user) {
    await dummyPasswordCheck(password);
    await logAuthEvent(undefined, AuthEventType.LOGIN_FAILURE, reqInfo, { identifier, reason: 'user_not_found' });
    throw new Error(genericError);
  }

  // 2️⃣ Validate password
  const isValidPassword = await comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    await logAuthEvent(user.id, AuthEventType.LOGIN_FAILURE, reqInfo, { reason: 'invalid_password' });
    throw new Error(genericError);
  }

  if (!user.is_email_verified) {
    throw new Error("Email not verified. Please verify your email to login.");
  }

  // 3️⃣ Fetch elderly profile if not found earlier
  if (!elderlyProfile) {
    elderlyProfile = await authRepository.findElderlyProfileByUserId(user.id);
    if (!elderlyProfile) {
      throw new Error("Elderly profile not found");
    }
  }

  return { user, elderlyProfile };
}

/**  Separated DB logic for nurse login  */
const checkNurseRecordsExist = async (data: CheckElderlyRecords, reqInfo: { ip: string; userAgent: string }) => {
  const { identifier, password } = data;
  const genericError = "Invalid credentials";

  let user = await authRepository.findUserByEmail(identifier);
  let nurseProfile = null;

  // If not found by email, try phone lookup
  if (!user) {
    nurseProfile = await authRepository.findNurseProfileByPhone(identifier);
    if (nurseProfile && nurseProfile.user_id) {
      user = await authRepository.findUserById(nurseProfile.user_id);
    }
  }

  // Account enumeration guard
  if (!user) {
    await dummyPasswordCheck(password);
    await logAuthEvent(undefined, AuthEventType.LOGIN_FAILURE, reqInfo, { identifier, reason: 'user_not_found' });
    throw new Error(genericError);
  }

  // 2️⃣ Validate password
  const isValidPassword = await comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    await logAuthEvent(user.id, AuthEventType.LOGIN_FAILURE, reqInfo, { reason: 'invalid_password' });
    throw new Error(genericError);
  }

  if (!user.is_email_verified) {
    throw new Error("Email not verified. Please verify your email to login.");
  }

  // 3️⃣ Fetch nurse profile if not found earlier
  if (!nurseProfile) {
    nurseProfile = await authRepository.findNurseProfileByUserId(user.id);
    if (!nurseProfile) {
      throw new Error("Nurse profile not found");
    }
  }

  return { user, nurseProfile };
}

/**
 *  PUBLIC SERVICE - REGISTER ELDERLY USER
 */
export const registerElderlyUser = async (
  data: RegisterElderlyUserData
): Promise<RegisterElderlyResult> => {
  logger.info("Starting elderly user registration", { email: data.email, phone: data.phone });

  try {
    // 1. Check if user already exists
    const existingUser = await authRepository.findUserByEmail(data.email || generateFallbackEmail(data.phone));

    if (existingUser) {
      if (!existingUser.is_email_verified) {
        logger.info("User exists but is unverified. Resending OTP.", { email: existingUser.email });

        // Trigger new OTP (non-blocking)
        otpService.createAndSendOtp(existingUser.email, OtpPurpose.EMAIL_VERIFICATION)
          .catch((error: Error) => {
            logger.error('Failed to resend verification OTP during retry', error as Error);
          });

        // Fetch elderly profile to return
        const elderlyProfile = await authRepository.findElderlyProfileByUserId(existingUser.id);
        if (!elderlyProfile) {
          throw new Error("User exists but elderly profile is missing. Please contact support.");
        }

        return {
          userId: existingUser.id,
          elderlyProfileId: elderlyProfile.id,
          email: existingUser.email
        };
      } else {
        logger.warn("Registration attempt for already verified user", { email: existingUser.email });
        const error = new Error("An account with this email is already registered and verified. Please login instead.");
        (error as any).statusCode = 409;
        throw error;
      }
    }

    // 2. If user doesn't exist, proceed with creation
    const result = await sequelize.transaction(async (t) => {
      const { user, elderlyProfile } = await createElderlyRecords(data, t);

      return {
        userId: user.id,
        elderlyProfileId: elderlyProfile.id,
        email: user.email
      };
    });

    logger.info("Elderly user registration completed successfully", { userId: result.userId });

    // Send verification OTP (non-blocking)
    otpService.createAndSendOtp(result.email, OtpPurpose.EMAIL_VERIFICATION)
      .catch((error: Error) => {
        logger.error('Failed to send verification OTP', error as Error);
      });

    return result;
  } catch (error) {
    logger.error("Error registering elderly user", error as Error);
    throw error;
  }
};

/**
 *  LOGIN ELDERLY USER
 */
export const loginElderlyUser = async (
  identifier: string, // email OR phone
  password: string,
  reqInfo: { ip: string; userAgent: string }
): Promise<LoginElderlyResult> => {
  logger.info("Attempting elderly user login", { identifier });

  try {
    const { user, elderlyProfile } = await checkElderlyRecordsExist({ identifier, password }, reqInfo);

    if (!elderlyProfile) {
      throw new Error("Elderly profile not found");
    }

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token hash
    await RefreshToken.create({
      user_id: user.id,
      token_hash: hashData(tokens.refreshToken),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      device_fingerprint: reqInfo.userAgent, // Simplified fingerprint
    });

    await logAuthEvent(user.id, AuthEventType.LOGIN_SUCCESS, reqInfo);

    logger.info("Elderly login successful", { userId: user.id });

    return {
      userId: user.id,
      elderlyProfileId: elderlyProfile.id,
      email: user.email,
      role: user.role,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

  } catch (error) {
    logger.error("Error logging in elderly user", error as Error);
    throw error;
  }
};

/**
 * VERIFY EMAIL WITH OTP
 */
export const verifyEmailWithOtp = async (
  email: string,
  otp: string
): Promise<boolean> => {
  logger.info("Attempting email verification", { email });

  try {
    // 1. Verify OTP
    const isValid = await otpService.verifyOtp(email, otp, OtpPurpose.EMAIL_VERIFICATION);

    if (!isValid) {
      throw new Error("Invalid or expired OTP");
    }

    // 2. Mark user as verified
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.is_email_verified) {
      logger.info("User already verified", { userId: user.id });
      return true;
    }

    user.is_email_verified = true;
    user.email_verified_at = new Date();
    await user.save();

    // Fetch elderly profile to get name for email
    const elderlyProfile = await authRepository.findElderlyProfileByUserId(user.id);

    if (elderlyProfile) {
      // Send welcome email (non-blocking)
      const tempPassword = "SilverWalks123#"; // In a real app, you might not send the password here if they set it during reg, but keeping consistent with previous logic
      sendElderlyWelcomeEmail(
        user.email,
        elderlyProfile.name,
        tempPassword,
        process.env.CLIENT_URL || 'http://localhost:3000/login'
      ).catch((error: Error) => {
        logger.error('Failed to send welcome email after verification', error);
      });
    } else {
      // Check if it's a nurse
      const nurseProfile = await authRepository.findNurseProfileByUserId(user.id);
      if (nurseProfile) {
        const tempPassword = "SilverWalks123#";
        sendNurseWelcomeEmail(
          user.email,
          nurseProfile.name,
          tempPassword,
          process.env.CLIENT_URL || 'http://localhost:3000/login'
        ).catch((error: Error) => {
          logger.error('Failed to send nurse welcome email after verification', error);
        });
      }
    }

    logger.info("Email verified successfully", { userId: user.id });
    return true;

  } catch (error) {
    logger.error("Error verifying email", error as Error);
    throw error;
  }
};

/**
 * INITIATE PASSWORD RESET
 */
export const initiatePasswordReset = async (email: string): Promise<void> => {
  logger.info("Initiating password reset", { email });

  try {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      // Don't reveal user existence
      logger.info("Password reset requested for non-existent email", { email });
      return;
    }

    await otpService.createAndSendOtp(email, OtpPurpose.PASSWORD_RESET);
    logger.info("Password reset OTP sent", { userId: user.id });

  } catch (error) {
    logger.error("Error initiating password reset", error as Error);
    throw error;
  }
};

/**
 * COMPLETE PASSWORD RESET
 */
export const completePasswordReset = async (
  email: string,
  otp: string,
  newPassword: string
): Promise<void> => {
  logger.info("Completing password reset", { email });

  try {
    // 1. Verify OTP
    const isValid = await otpService.verifyOtp(email, otp, OtpPurpose.PASSWORD_RESET);

    if (!isValid) {
      throw new Error("Invalid or expired OTP");
    }

    // 2. Find User
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      throw new Error("User not found");
    }

    // 3. Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // 4. Update password
    user.password_hash = hashedPassword;
    await user.save();

    // Fetch the user's profile to get their name for the email
    const profile = await authRepository.findElderlyProfileByUserId(user.id) || await authRepository.findNurseProfileByUserId(user.id);
    const userName = profile ? profile.name : 'Silver Walks User';

    // 5. Send success notification
    sendPasswordResetSuccessEmail(
      user.email,
      userName,
      process.env.CLIENT_URL || 'http://localhost:3000/login'
    ).catch(err => logger.error('Failed to send password reset success email', err));

    // TODO: Invalidate all sessions/tokens (if applicable)

    logger.info("Password reset successfully", { userId: user.id });

  } catch (error) {
    logger.error("Error completing password reset", error as Error);
    throw error;
  }
};

/**
 *  PUBLIC SERVICE - REGISTER NURSE
 */
export const registerNurse = async (
  data: RegisterNurseData
): Promise<RegisterNurseResult> => {
  logger.info("Starting nurse registration", { email: data.email });

  try {
    const result = await sequelize.transaction(async (t) => {
      // 1. Create User
      const hashedPassword = await hashPassword("SilverWalks123#"); // Default password for now
      const user = await authRepository.createUser(
        {
          email: data.email,
          password_hash: hashedPassword,
          role: UserRole.NURSE,
          status: UserStatus.PENDING,
          is_active: true,
        },
        t
      );

      // 2. Create Nurse Profile
      const nurseProfile = await authRepository.createNurseProfile(
        {
          user_id: user.id,
          name: data.fullName,
          phone: data.phone,
          gender: data.gender,
          experience_years: data.yearsOfExperience,
          max_patients_per_day: data.maxPatientsPerDay,
          address: data.address,
          specializations: data.specializations,
          certifications: [], // This is the old JSONB field, we might still want to keep it or leave empty
          latitude: 0,
          longitude: 0,
        },
        t
      );

      // 3. Create Certifications
      for (const cert of data.certifications) {
        await authRepository.createNurseCertification(
          {
            nurse_profile_id: nurseProfile.id,
            name: cert.name,
            issuer: cert.issuer,
            issue_date: new Date(cert.issueDate),
            expiry_date: cert.expiryDate ? new Date(cert.expiryDate) : undefined,
          },
          t
        );
      }

      // 4. Create Availability
      for (const slot of data.availableTimeSlots) {
        await authRepository.createNurseAvailability(
          {
            nurse_id: nurseProfile.id,
            day_of_week: slot.dayOfWeek,
            start_time: slot.startTime,
            end_time: slot.endTime,
          },
          t
        );
      }

      return {
        userId: user.id,
        nurseProfileId: nurseProfile.id,
        email: user.email,
      };
    });

    logger.info("Nurse registration completed successfully", { userId: result.userId });

    // Send verification OTP (non-blocking)
    otpService.createAndSendOtp(result.email, OtpPurpose.EMAIL_VERIFICATION)
      .catch((error: Error) => {
        logger.error('Failed to send verification OTP to nurse', error as Error);
      });

    return result;
  } catch (error) {
    logger.error("Error registering nurse", error as Error);
    throw error;
  }
};

/**
 *  LOGIN NURSE USER
 */
export const loginNurse = async (
  identifier: string, // email OR phone
  password: string,
  reqInfo: { ip: string; userAgent: string }
): Promise<LoginNurseResult> => {
  logger.info("Attempting nurse user login", { identifier });

  try {
    const { user, nurseProfile } = await checkNurseRecordsExist({ identifier, password }, reqInfo);

    if (!nurseProfile) {
      throw new Error("Nurse profile not found");
    }

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token hash
    await RefreshToken.create({
      user_id: user.id,
      token_hash: hashData(tokens.refreshToken),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      device_fingerprint: reqInfo.userAgent,
    });

    await logAuthEvent(user.id, AuthEventType.LOGIN_SUCCESS, reqInfo);

    logger.info("Nurse login successful", { userId: user.id });

    return {
      userId: user.id,
      nurseProfileId: nurseProfile.id,
      email: user.email,
      role: user.role,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

  } catch (error) {
    logger.error("Error logging in nurse user", error as Error);
    throw error;
  }
};

/**
 * REFRESH TOKENS - WITH ROTATION & REUSE DETECTION
 */
export const refreshTokens = async (
  refreshToken: string,
  reqInfo: { ip: string; userAgent: string }
): Promise<any> => {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashData(refreshToken);

    // Find the token in DB
    const storedToken = await RefreshToken.findOne({
      where: { token_hash: tokenHash }
    });

    // REUSE DETECTION (FAMILY REVOCATION)
    if (!storedToken || storedToken.is_revoked) {
      logger.warn('Refresh token reuse detected / unknown token. Revoking family.', { userId: payload.userId });

      // Revoke all tokens for this user
      await RefreshToken.update(
        { is_revoked: true },
        { where: { user_id: payload.userId } }
      );

      await logAuthEvent(payload.userId, AuthEventType.TOKEN_REVOKED, reqInfo, { reason: 'reuse_detection' });
      throw new Error('Invalid refresh token');
    }

    // Immediately rotate: delete or revoke old token
    await storedToken.destroy();

    // Generate new pair
    const newTokens = generateTokenPair({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    // Store new refresh token hash
    await RefreshToken.create({
      user_id: payload.userId,
      token_hash: hashData(newTokens.refreshToken),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      device_fingerprint: reqInfo.userAgent,
    });

    await logAuthEvent(payload.userId, AuthEventType.TOKEN_REFRESH, reqInfo);

    return newTokens;
  } catch (error) {
    logger.error('Error refreshing tokens', error as Error);
    throw new Error('Session expired or invalid');
  }
};

/**
 * LOGOUT
 */
export const logout = async (
  refreshToken: string,
  userId: string,
  reqInfo: { ip: string; userAgent: string }
): Promise<void> => {
  try {
    const tokenHash = hashData(refreshToken);
    await RefreshToken.destroy({
      where: { token_hash: tokenHash, user_id: userId }
    });

    await logAuthEvent(userId, AuthEventType.LOGOUT, reqInfo);
    logger.info('User logged out', { userId });
  } catch (error) {
    logger.error('Error during logout', error as Error);
  }
};
