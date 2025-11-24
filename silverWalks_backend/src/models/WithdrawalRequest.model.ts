import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import NurseProfile from './NurseProfile.model';
import NurseBankAccount from './NurseBankAccount.model';
import User from './User.model';

export enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

interface WithdrawalRequestAttributes {
  id: string;
  nurse_id: string;
  bank_account_id: string;
  points_amount: number;
  cash_amount: number;
  conversion_rate: number;
  status: WithdrawalStatus;
  requested_at: Date;
  processed_at?: Date;
  processed_by?: string;
  transaction_reference?: string;
  rejection_reason?: string;
}

interface WithdrawalRequestCreationAttributes extends Optional<WithdrawalRequestAttributes, 'id' | 'requested_at' | 'status' | 'processed_at' | 'processed_by' | 'transaction_reference' | 'rejection_reason'> {}

class WithdrawalRequest extends Model<WithdrawalRequestAttributes, WithdrawalRequestCreationAttributes> implements WithdrawalRequestAttributes {
  public id!: string;
  public nurse_id!: string;
  public bank_account_id!: string;
  public points_amount!: number;
  public cash_amount!: number;
  public conversion_rate!: number;
  public status!: WithdrawalStatus;
  public requested_at!: Date;
  public processed_at?: Date;
  public processed_by?: string;
  public transaction_reference?: string;
  public rejection_reason?: string;
}

WithdrawalRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nurse_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'nurse_profiles',
        key: 'id',
      },
    },
    bank_account_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'nurse_bank_accounts',
        key: 'id',
      },
    },
    points_amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cash_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    conversion_rate: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(WithdrawalStatus)),
      allowNull: false,
      defaultValue: WithdrawalStatus.PENDING,
    },
    requested_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    processed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    transaction_reference: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'withdrawal_requests',
    timestamps: false,
    underscored: true,
  }
);

export default WithdrawalRequest;