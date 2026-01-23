import { UserRole } from "../../models/User.model";
import { sequelize } from "../../config/database.config";
import { SubscriptionStatus, SubscriptionPlan } from "../../types/subscription.types";
import { MobilityLevel } from "../../types/mobility.types";
import { logger } from "../../utils/logger.util";
import { comparePassword, hashPassword } from "../../utils/encryption.util";
import { sendElderlyWelcomeEmail } from "../../utils/emailHelpers.util";
import { otpService } from "../../services/otp.service";
import { OtpPurpose } from "../../models/Otp.model";
import { authRepository } from "./auth.repository";


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
  healthConditions?: string[];
  currentMedications?: string[];
  specialNeeds?: string;
  gender: string;
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

/**  Helper: Generate fallback email */
const generateFallbackEmail = (phone: string) => `elderly_${phone}@silverwalks.com`;

/** Helper: Calculate approximate DOB */
const calculateDOB = (age: number) => {
  const year = new Date().getFullYear() - age;
  return new Date(year, 0, 1); // January 1st
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

  //  Health Profile
  await authRepository.createHealthProfile(
    {
      elderly_id: elderlyProfile.id,
      medical_conditions: healthConditions?.map((c) => ({
        condition: c,
        diagnosedDate: null,
        notes: "",
      })) || [],

      medications: currentMedications?.map((m) => ({
        medication: m,
        dosage: "",
        frequency: "",
        prescribedDate: null,
      })) || [],

      allergies: [],
      dietary_restrictions: [],
      emergency_notes: specialNeeds || "",
      mobility_level: MobilityLevel.INDEPENDENT,
    },
    t
  );

  return { user, elderlyProfile };
};

/**  Separated DB logic for login  */
const checkElderlyRecordsExist = async (data: CheckElderlyRecords) => {
  const { identifier, password } = data;

  let user = await authRepository.findUserByEmail(identifier);

  let elderlyProfile = null;

  // If not found by email, try phone lookup
  if (!user) {
    elderlyProfile = await authRepository.findElderlyProfileByPhone(identifier);

    if (!elderlyProfile || !elderlyProfile.user_id) {
      throw new Error("Invalid credentials");
    }

    user = await authRepository.findUserById(elderlyProfile.user_id);
  }

  // If somehow user still doesn't exist
  if (!user) {
    throw new Error("Invalid credentials");
  }

  // 2️⃣ Validate password using bcrypt
  const isValidPassword = await comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    throw new Error("Invalid credentials");
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

/**
 *  PUBLIC SERVICE - REGISTER ELDERLY USER
 */
export const registerElderlyUser = async (
  data: RegisterElderlyUserData
): Promise<RegisterElderlyResult> => {
  logger.info("Starting elderly user registration", { phone: data.phone });

  try {
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
  password: string
): Promise<RegisterElderlyResult> => {
  logger.info("Attempting elderly user login", { identifier });

  try {
    const { user, elderlyProfile } = await checkElderlyRecordsExist({ identifier, password });

    logger.info("Elderly login successful", { userId: user.id });

    return {
      userId: user.id,
      elderlyProfileId: elderlyProfile.id,
      email: user.email,
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

    // TODO: Invalidate all sessions/tokens (if applicable)

    logger.info("Password reset successfully", { userId: user.id });

  } catch (error) {
    logger.error("Error completing password reset", error as Error);
    throw error;
  }
};
