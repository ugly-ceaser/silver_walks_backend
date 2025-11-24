import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import ElderlyProfile from './ElderlyProfile.model';

interface EmergencyContactAttributes {
  id: string;
  elderly_id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

interface EmergencyContactCreationAttributes extends Optional<EmergencyContactAttributes, 'id' | 'created_at' | 'updated_at' | 'is_primary'> {}

class EmergencyContact extends Model<EmergencyContactAttributes, EmergencyContactCreationAttributes> implements EmergencyContactAttributes {
  public id!: string;
  public elderly_id!: string;
  public name!: string;
  public relationship!: string;
  public phone!: string;
  public email!: string;
  public is_primary!: boolean;
  public created_at!: Date;
  public updated_at!: Date;
}

EmergencyContact.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    relationship: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    is_primary: {
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
    tableName: 'emergency_contacts',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default EmergencyContact;