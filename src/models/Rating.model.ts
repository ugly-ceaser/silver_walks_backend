import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';

interface RatingAttributes {
  id: string;
  walk_session_id: string;
  elderly_id: string;
  nurse_id: string;
  rating: number;
  comment?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RatingCreationAttributes extends Optional<RatingAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Rating extends Model<RatingAttributes, RatingCreationAttributes> implements RatingAttributes {
  public id!: string;
  public walk_session_id!: string;
  public elderly_id!: string;
  public nurse_id!: string;
  public rating!: number;
  public comment?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Rating.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    walk_session_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    elderly_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    nurse_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.TEXT,
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
    tableName: 'ratings',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Rating;
