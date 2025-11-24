import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import Activity from './Activity.model';
import ElderlyProfile from './ElderlyProfile.model';
import User from './User.model';

interface ActivityLogAttributes {
  id: string;
  activity_id: string;
  elderly_id: string;
  notes: string;
  performance_rating: number;
  logged_at: Date;
  logged_by: string;
}

interface ActivityLogCreationAttributes extends Optional<ActivityLogAttributes, 'id' | 'logged_at'> {}

class ActivityLog extends Model<ActivityLogAttributes, ActivityLogCreationAttributes> implements ActivityLogAttributes {
  public id!: string;
  public activity_id!: string;
  public elderly_id!: string;
  public notes!: string;
  public performance_rating!: number;
  public logged_at!: Date;
  public logged_by!: string;
}

ActivityLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    activity_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'activities',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    notes: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    performance_rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    logged_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    logged_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'activity_logs',
    timestamps: false,
    underscored: true,
  }
);

export default ActivityLog;