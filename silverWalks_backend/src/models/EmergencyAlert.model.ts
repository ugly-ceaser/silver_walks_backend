import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import WalkSession from './WalkSession.model';
import ElderlyProfile from './ElderlyProfile.model';
import NurseProfile from './NurseProfile.model';
import User from './User.model';

export enum AlertType {
  FALL = 'fall',
  MEDICAL = 'medical',
  LOCATION = 'location',
  OTHER = 'other'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved'
}

interface EmergencyAlertAttributes {
  id: string;
  walk_session_id?: string;
  elderly_id: string;
  nurse_id?: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  description: string;
  location_data: any;
  status: AlertStatus;
  resolved_at?: Date;
  resolved_by?: string;
  created_at: Date;
}

interface EmergencyAlertCreationAttributes extends Optional<EmergencyAlertAttributes, 'id' | 'created_at' | 'walk_session_id' | 'nurse_id' | 'resolved_at' | 'resolved_by' | 'status'> {}

class EmergencyAlert extends Model<EmergencyAlertAttributes, EmergencyAlertCreationAttributes> implements EmergencyAlertAttributes {
  public id!: string;
  public walk_session_id?: string;
  public elderly_id!: string;
  public nurse_id?: string;
  public alert_type!: AlertType;
  public severity!: AlertSeverity;
  public description!: string;
  public location_data!: any;
  public status!: AlertStatus;
  public resolved_at?: Date;
  public resolved_by?: string;
  public created_at!: Date;
}

EmergencyAlert.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    walk_session_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'walk_sessions',
        key: 'id',
      },
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
      allowNull: true,
      references: {
        model: 'nurse_profiles',
        key: 'id',
      },
    },
    alert_type: {
      type: DataTypes.ENUM(...Object.values(AlertType)),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM(...Object.values(AlertSeverity)),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    location_data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(AlertStatus)),
      allowNull: false,
      defaultValue: AlertStatus.ACTIVE,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'emergency_alerts',
    timestamps: false,
    underscored: true,
  }
);

export default EmergencyAlert;