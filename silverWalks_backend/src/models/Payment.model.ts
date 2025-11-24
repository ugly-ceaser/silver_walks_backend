import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import ElderlyProfile from './ElderlyProfile.model';
import Subscription from './Subscription.model';

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

interface PaymentAttributes {
  id: string;
  elderly_id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  transaction_id: string;
  payment_date: Date;
  created_at: Date;
}

interface PaymentCreationAttributes extends Optional<PaymentAttributes, 'id' | 'created_at' | 'subscription_id' | 'currency' | 'status' | 'payment_date'> {}

class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  public id!: string;
  public elderly_id!: string;
  public subscription_id?: string;
  public amount!: number;
  public currency!: string;
  public payment_method!: PaymentMethod;
  public status!: PaymentStatus;
  public transaction_id!: string;
  public payment_date!: Date;
  public created_at!: Date;
}

Payment.init(
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
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subscriptions',
        key: 'id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'USD',
    },
    payment_method: {
      type: DataTypes.ENUM(...Object.values(PaymentMethod)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PaymentStatus)),
      allowNull: false,
      defaultValue: PaymentStatus.PENDING,
    },
    transaction_id: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'payments',
    timestamps: false,
    underscored: true,
  }
);

export default Payment;