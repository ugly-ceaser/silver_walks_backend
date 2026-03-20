import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';

interface PendingRatingAttributes {
  id: string;
  walk_session_id: string;
  elderly_id: string;
  nurse_id: string;
  expires_at: Date;
  is_expired: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PendingRatingCreationAttributes extends Optional<PendingRatingAttributes, 'id' | 'created_at' | 'updated_at' | 'is_expired'> {}

class PendingRating extends Model<PendingRatingAttributes, PendingRatingCreationAttributes> implements PendingRatingAttributes {
  public id!: string;
  public walk_session_id!: string;
  public elderly_id!: string;
  public nurse_id!: string;
  public expires_at!: Date;
  public is_expired!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PendingRating.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    walk_session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    elderly_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    nurse_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_expired: {
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
    tableName: 'pending_ratings',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default PendingRating;
