import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import NurseProfile from './NurseProfile.model';

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings'
}

interface NurseBankAccountAttributes {
  id: string;
  nurse_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  routing_number: string;
  account_type: AccountType;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

interface NurseBankAccountCreationAttributes extends Optional<NurseBankAccountAttributes, 'id' | 'created_at' | 'updated_at' | 'is_verified'> {}

class NurseBankAccount extends Model<NurseBankAccountAttributes, NurseBankAccountCreationAttributes> implements NurseBankAccountAttributes {
  public id!: string;
  public nurse_id!: string;
  public account_holder_name!: string;
  public bank_name!: string;
  public account_number!: string;
  public routing_number!: string;
  public account_type!: AccountType;
  public is_verified!: boolean;
  public created_at!: Date;
  public updated_at!: Date;
}

NurseBankAccount.init(
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
      onDelete: 'CASCADE',
    },
    account_holder_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bank_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    account_number: {
      type: DataTypes.STRING,
      allowNull: false,
      // Note: Should be encrypted at application level before storing
    },
    routing_number: {
      type: DataTypes.STRING,
      allowNull: false,
      // Note: Should be encrypted at application level before storing
    },
    account_type: {
      type: DataTypes.ENUM(...Object.values(AccountType)),
      allowNull: false,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'nurse_bank_accounts',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default NurseBankAccount;