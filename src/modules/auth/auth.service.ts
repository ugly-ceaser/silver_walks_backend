import { UserRole, UserStatus } from "../../models/User.model";
import { sequelize } from "../../config/database.config";
import { SubscriptionStatus, SubscriptionPlan } from "../../types/subscription.types";
import { MobilityLevel } from "../../types/mobility.types";
import { logger } from "../../utils/logger.util";
import { comparePassword, hashPassword } from "../../utils/encryption.util";
import { sendElderlyWelcomeEmail } from "../../utils/emailHelpers.util";
import { otpService } from "../../services/otp.service";
import { OtpPurpose } from "../../models/Otp.model";
import { authRepository } from "./auth.repository";
import { generateTokenPair } from "../../utils/jwt.util";


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
): Promise<LoginElderlyResult> => {
  logger.info("Attempting elderly user login", { identifier });

  try {
    const { user, elderlyProfile } = await checkElderlyRecordsExist({ identifier, password });

    if (!elderlyProfile) {
      throw new Error("Elderly profile not found");
    }

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

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
