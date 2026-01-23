import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import User from './User.model';
import NurseProfile from './NurseProfile.model';
import HealthProfile from './HealthProfile.model';
import { SubscriptionPlan, SubscriptionStatus } from '../types/subscription.types';


interface ElderlyProfileAttributes {
  id: string;
  user_id: string;
  name: string;
  date_of_birth: Date;
  gender: string;
  phone: string;
  address: string;
  profile_picture?: string;
  health_profile_id?: string;
  assigned_nurse_id?: string;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  subscription_start_date?: Date;
  subscription_end_date?: Date;
  walks_remaining: number;
  walks_used_this_month: number;
  created_at: Date;
  updated_at: Date;
}

export interface ElderlyProfileCreationAttributes extends Optional<ElderlyProfileAttributes, 'id' | 'created_at' | 'updated_at' | 'profile_picture' | 'health_profile_id' | 'assigned_nurse_id' | 'subscription_start_date' | 'subscription_end_date' | 'walks_remaining' | 'walks_used_this_month'> { }

class ElderlyProfile extends Model<ElderlyProfileAttributes, ElderlyProfileCreationAttributes> implements ElderlyProfileAttributes {
  public id!: string;
  public user_id!: string;
  public name!: string;
  public date_of_birth!: Date;
  public gender!: string;
  public phone!: string;
  public address!: string;
  public profile_picture?: string;
  public health_profile_id?: string;
  public assigned_nurse_id?: string;
  public subscription_plan!: SubscriptionPlan;
  public subscription_status!: SubscriptionStatus;
  public subscription_start_date?: Date;
  public subscription_end_date?: Date;
  public walks_remaining!: number;
  public walks_used_this_month!: number;
  public created_at!: Date;
  public updated_at!: Date;
}

ElderlyProfile.init(
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
    date_of_birth: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    profile_picture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    health_profile_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'health_profiles',
        key: 'id',
      },
    },
    assigned_nurse_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'nurse_profiles',
        key: 'id',
      },
    },
    subscription_plan: {
      type: DataTypes.ENUM(...Object.values(SubscriptionPlan)),
      allowNull: false,
      defaultValue: SubscriptionPlan.BASIC,
    },
    subscription_status: {
      type: DataTypes.ENUM(...Object.values(SubscriptionStatus)),
      allowNull: false,
      defaultValue: SubscriptionStatus.INACTIVE,
    },
    subscription_start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    subscription_end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    walks_remaining: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    walks_used_this_month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'elderly_profiles',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default ElderlyProfile;