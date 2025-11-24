import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import User from './User.model';

export enum ActivityType {
  WALK = 'walk',
  EXERCISE = 'exercise',
  SOCIAL = 'social',
  MEDICAL = 'medical'
}

export enum ActivityStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

interface ActivityAttributes {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  scheduled_date: Date;
  scheduled_time: string;
  duration_minutes: number;
  location: string;
  capacity: number;
  status: ActivityStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface ActivityCreationAttributes extends Optional<ActivityAttributes, 'id' | 'created_at' | 'updated_at' | 'status'> {}

class Activity extends Model<ActivityAttributes, ActivityCreationAttributes> implements ActivityAttributes {
  public id!: string;
  public title!: string;
  public description!: string;
  public type!: ActivityType;
  public scheduled_date!: Date;
  public scheduled_time!: string;
  public duration_minutes!: number;
  public location!: string;
  public capacity!: number;
  public status!: ActivityStatus;
  public created_by!: string;
  public created_at!: Date;
  public updated_at!: Date;
}

Activity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(ActivityType)),
      allowNull: false,
    },
    scheduled_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    scheduled_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ActivityStatus)),
      allowNull: false,
      defaultValue: ActivityStatus.SCHEDULED,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
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
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'activities',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Activity;