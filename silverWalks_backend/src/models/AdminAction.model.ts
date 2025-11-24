import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import User from './User.model';

export enum AdminActionType {
  APPROVE_NURSE = 'approve_nurse',
  REJECT_NURSE = 'reject_nurse',
  SUSPEND_USER = 'suspend_user',
  MODIFY_SUBSCRIPTION = 'modify_subscription',
  PROCESS_WITHDRAWAL = 'process_withdrawal',
  RESOLVE_ALERT = 'resolve_alert',
  UPDATE_USER_ROLE = 'update_user_role',
  DELETE_USER = 'delete_user',
  OTHER = 'other'
}

interface AdminActionAttributes {
  id: string;
  admin_id: string;
  action_type: AdminActionType;
  target_user_id: string;
  details: any;
  created_at: Date;
}

interface AdminActionCreationAttributes extends Optional<AdminActionAttributes, 'id' | 'created_at' | 'details'> {}

class AdminAction extends Model<AdminActionAttributes, AdminActionCreationAttributes> implements AdminActionAttributes {
  public id!: string;
  public admin_id!: string;
  public action_type!: AdminActionType;
  public target_user_id!: string;
  public details!: any;
  public created_at!: Date;
}

AdminAction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    action_type: {
      type: DataTypes.ENUM(...Object.values(AdminActionType)),
      allowNull: false,
    },
    target_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: false,
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
    tableName: 'admin_actions',
    timestamps: false,
    underscored: true,
  }
);

export default AdminAction;