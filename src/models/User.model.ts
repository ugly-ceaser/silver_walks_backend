import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';

export enum UserRole {
  ADMIN = 'admin',
  ELDERLY = 'elderly',
  NURSE = 'nurse'
}

interface UserAttributes {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  is_active: boolean;
  is_email_verified: boolean;
  email_verified_at?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at' | 'last_login_at' | 'is_active' | 'is_email_verified'> { }

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password_hash!: string;
  public role!: UserRole;
  public created_at!: Date;
  public updated_at!: Date;
  public last_login_at?: Date;
  public is_active!: boolean;
  public is_email_verified!: boolean;
  public email_verified_at?: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
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
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
    ],
  }
);

export default User;