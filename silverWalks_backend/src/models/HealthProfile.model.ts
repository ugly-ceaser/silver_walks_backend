import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import ElderlyProfile from './ElderlyProfile.model';

export enum MobilityLevel {
  INDEPENDENT = 'independent',
  ASSISTED = 'assisted',
  WHEELCHAIR = 'wheelchair'
}

interface HealthProfileAttributes {
  id: string;
  elderly_id: string;
  mobility_level: MobilityLevel;
  medical_conditions: any[];
  medications: any[];
  allergies: string[];
  dietary_restrictions: string[];
  emergency_notes?: string;
  last_checkup_date?: Date;
  created_at: Date;
  updated_at: Date;
}

interface HealthProfileCreationAttributes extends Optional<HealthProfileAttributes, 'id' | 'created_at' | 'updated_at' | 'emergency_notes' | 'last_checkup_date' | 'medical_conditions' | 'medications' | 'allergies' | 'dietary_restrictions'> {}

class HealthProfile extends Model<HealthProfileAttributes, HealthProfileCreationAttributes> implements HealthProfileAttributes {
  public id!: string;
  public elderly_id!: string;
  public mobility_level!: MobilityLevel;
  public medical_conditions!: any[];
  public medications!: any[];
  public allergies!: string[];
  public dietary_restrictions!: string[];
  public emergency_notes?: string;
  public last_checkup_date?: Date;
  public created_at!: Date;
  public updated_at!: Date;
}

HealthProfile.init(
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
    mobility_level: {
      type: DataTypes.ENUM(...Object.values(MobilityLevel)),
      allowNull: false,
    },
    medical_conditions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    medications: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    allergies: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    dietary_restrictions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    emergency_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    last_checkup_date: {
      type: DataTypes.DATE,
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
    tableName: 'health_profiles',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default HealthProfile;