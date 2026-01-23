import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import ElderlyProfile from './ElderlyProfile.model';
import NurseProfile from './NurseProfile.model';

export enum WalkSessionStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

export interface WalkSessionAttributes {
  id: string;
  elderly_id: string;
  nurse_id: string;
  scheduled_date: Date;
  scheduled_time: string;
  duration_minutes: number;
  status: WalkSessionStatus;
  route_data?: any;
  actual_start_time?: Date;
  actual_end_time?: Date;
  distance_meters?: number;
  steps_count?: number;
  calories_burned?: number;
  points_earned?: number;
  elderly_feedback?: any;
  nurse_feedback?: any;
  cancellation_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface WalkSessionCreationAttributes extends Optional<WalkSessionAttributes, 'id' | 'created_at' | 'updated_at' | 'route_data' | 'actual_start_time' | 'actual_end_time' | 'distance_meters' | 'steps_count' | 'calories_burned' | 'points_earned' | 'elderly_feedback' | 'nurse_feedback' | 'cancellation_reason'> { }

class WalkSession extends Model<WalkSessionAttributes, WalkSessionCreationAttributes> implements WalkSessionAttributes {
  public id!: string;
  public elderly_id!: string;
  public nurse_id!: string;
  public scheduled_date!: Date;
  public scheduled_time!: string;
  public duration_minutes!: number;
  public status!: WalkSessionStatus;
  public route_data?: any;
  public actual_start_time?: Date;
  public actual_end_time?: Date;
  public distance_meters?: number;
  public steps_count?: number;
  public calories_burned?: number;
  public points_earned?: number;
  public elderly_feedback?: any;
  public nurse_feedback?: any;
  public cancellation_reason?: string;
  public created_at!: Date;
  public updated_at!: Date;
}

WalkSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    elderly_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'elderly_profiles',
        key: 'id',
      },
    },
    nurse_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'nurse_profiles',
        key: 'id',
      },
    },
    scheduled_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    scheduled_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(WalkSessionStatus)),
      allowNull: false,
      defaultValue: WalkSessionStatus.SCHEDULED,
    },
    route_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    actual_start_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actual_end_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    distance_meters: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    steps_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    calories_burned: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    points_earned: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    elderly_feedback: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    nurse_feedback: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'walk_sessions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default WalkSession;