import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import User from './User.model';
import NurseAvailability from './NurseAvailability.model';
import NurseCertification from './NurseCertification.model';

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
  RESERVED = 'reserved',
  SUSPENDED = 'suspended'
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',


}

interface NurseProfileAttributes {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  gender: string;
  profile_picture?: string;
  specializations: string[];
  certifications: any[];
  experience_years: number;
  max_patients_per_day: number;
  address: string;
  rating?: number;
  total_walks?: number;
  points_earned?: number;
  points_withdrawn?: number;
  points_balance?: number;
  availability_status?: AvailabilityStatus;
  verification_status?: VerificationStatus;
  created_at: Date;
  updated_at: Date;
}

export interface NurseProfileCreationAttributes extends Optional<NurseProfileAttributes, 'id' | 'created_at' | 'updated_at' | 'profile_picture' | 'rating' | 'total_walks' | 'points_earned' | 'points_withdrawn' | 'points_balance' | 'availability_status' | 'verification_status' | 'max_patients_per_day' | 'certifications' | 'specializations'> { }

class NurseProfile extends Model<NurseProfileAttributes, NurseProfileCreationAttributes> implements NurseProfileAttributes {
  public id!: string;
  public user_id!: string;
  public name!: string;
  public phone!: string;
  public gender!: string;
  public profile_picture?: string;
  public specializations!: string[];
  public certifications!: any[];
  public experience_years!: number;
  public max_patients_per_day!: number;
  public address!: string;
  public rating!: number;
  public total_walks!: number;
  public points_earned!: number;
  public points_withdrawn!: number;
  public points_balance!: number;
  public availability_status!: AvailabilityStatus;
  public verification_status!: VerificationStatus;
  public created_at!: Date;
  public updated_at!: Date;

  // Associations
  public readonly availability?: NurseAvailability[];
  public readonly certifications_list?: NurseCertification[]; // Using certifications_list to avoid conflict with the JSONB certifications field
}

NurseProfile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    profile_picture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    specializations: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    certifications: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    experience_years: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    max_patients_per_day: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    total_walks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    points_earned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    points_withdrawn: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    points_balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    availability_status: {
      type: DataTypes.ENUM(...Object.values(AvailabilityStatus)),
      allowNull: false,
      defaultValue: AvailabilityStatus.OFFLINE,
    },
    verification_status: {
      type: DataTypes.ENUM(...Object.values(VerificationStatus)),
      allowNull: false,
      defaultValue: VerificationStatus.PENDING,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'nurse_profiles',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default NurseProfile;