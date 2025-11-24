import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import Activity from './Activity.model';
import ElderlyProfile from './ElderlyProfile.model';

export enum AttendanceStatus {
  REGISTERED = 'registered',
  ATTENDED = 'attended',
  ABSENT = 'absent',
  CANCELLED = 'cancelled'
}

interface ActivityParticipantAttributes {
  id: string;
  activity_id: string;
  elderly_id: string;
  attendance_status: AttendanceStatus;
  created_at: Date;
}

interface ActivityParticipantCreationAttributes extends Optional<ActivityParticipantAttributes, 'id' | 'created_at' | 'attendance_status'> {}

class ActivityParticipant extends Model<ActivityParticipantAttributes, ActivityParticipantCreationAttributes> implements ActivityParticipantAttributes {
  public id!: string;
  public activity_id!: string;
  public elderly_id!: string;
  public attendance_status!: AttendanceStatus;
  public created_at!: Date;
}

ActivityParticipant.init(
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
    attendance_status: {
      type: DataTypes.ENUM(...Object.values(AttendanceStatus)),
      allowNull: false,
      defaultValue: AttendanceStatus.REGISTERED,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'activity_participants',
    timestamps: false,
    underscored: true,
  }
);

export default ActivityParticipant;