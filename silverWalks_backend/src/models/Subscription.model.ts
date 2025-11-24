import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import ElderlyProfile from './ElderlyProfile.model';

export enum PlanType {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

interface SubscriptionAttributes {
  id: string;
  elderly_id: string;
  plan_type: PlanType;
  status: SubscriptionStatus;
  start_date: Date;
  end_date: Date;
  monthly_price: number;
  walks_per_month: number;
  auto_renew: boolean;
  payment_method_id?: string;
  created_at: Date;
  updated_at: Date;
}

interface SubscriptionCreationAttributes extends Optional<SubscriptionAttributes, 'id' | 'created_at' | 'updated_at' | 'payment_method_id' | 'auto_renew' | 'status'> {}

class Subscription extends Model<SubscriptionAttributes, SubscriptionCreationAttributes> implements SubscriptionAttributes {
  public id!: string;
  public elderly_id!: string;
  public plan_type!: PlanType;
  public status!: SubscriptionStatus;
  public start_date!: Date;
  public end_date!: Date;
  public monthly_price!: number;
  public walks_per_month!: number;
  public auto_renew!: boolean;
  public payment_method_id?: string;
  public created_at!: Date;
  public updated_at!: Date;
}

Subscription.init(
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
      onDelete: 'CASCADE',
    },
    plan_type: {
      type: DataTypes.ENUM(...Object.values(PlanType)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SubscriptionStatus)),
      allowNull: false,
      defaultValue: SubscriptionStatus.ACTIVE,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    monthly_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    walks_per_month: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    auto_renew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    payment_method_id: {
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
    tableName: 'subscriptions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Subscription;