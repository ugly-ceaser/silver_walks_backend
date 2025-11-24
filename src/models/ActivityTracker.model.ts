import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import { UserRole } from './User.model';

export enum ActivityAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  OTHER = 'other',
}

export enum ActivityStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

interface ActivityTrackerAttributes {
  id: string;
  user_id: string;
  user_role: UserRole;
  action: ActivityAction;
  method: string; // HTTP method
  endpoint: string; // API endpoint
  resource_type?: string; // e.g., 'user', 'walk_session', 'subscription'
  resource_id?: string; // ID of the resource being acted upon
  request_body?: any; // Request body (sanitized)
  response_status?: number; // HTTP response status
  status: ActivityStatus;
  ip_address?: string;
  user_agent?: string;
  error_message?: string;
  metadata?: any; // Additional metadata
  created_at: Date;
}

interface ActivityTrackerCreationAttributes
  extends Optional<
    ActivityTrackerAttributes,
    | 'id'
    | 'created_at'
    | 'resource_type'
    | 'resource_id'
    | 'request_body'
    | 'response_status'
    | 'ip_address'
    | 'user_agent'
    | 'error_message'
    | 'metadata'
    | 'status'
  > {}

class ActivityTracker extends Model<
  ActivityTrackerAttributes,
  ActivityTrackerCreationAttributes
> implements ActivityTrackerAttributes {
  public id!: string;
  public user_id!: string;
  public user_role!: UserRole;
  public action!: ActivityAction;
  public method!: string;
  public endpoint!: string;
  public resource_type?: string;
  public resource_id?: string;
  public request_body?: any;
  public response_status?: number;
  public status!: ActivityStatus;
  public ip_address?: string;
  public user_agent?: string;
  public error_message?: string;
  public metadata?: any;
  public created_at!: Date;
}

ActivityTracker.init(
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
    },
    user_role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
    },
    action: {
      type: DataTypes.ENUM(...Object.values(ActivityAction)),
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    resource_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resource_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    request_body: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    response_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ActivityStatus)),
      allowNull: false,
      defaultValue: ActivityStatus.PENDING,
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'activity_tracker',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['user_role'],
      },
      {
        fields: ['action'],
      },
      {
        fields: ['endpoint'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['resource_type', 'resource_id'],
      },
    ],
  }
);

export default ActivityTracker;

