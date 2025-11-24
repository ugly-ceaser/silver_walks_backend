import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import NurseProfile from './NurseProfile.model';

interface NurseAvailabilityAttributes {
  id: string;
  nurse_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date?: Date;
  created_at: Date;
  updated_at: Date;
}

interface NurseAvailabilityCreationAttributes extends Optional<NurseAvailabilityAttributes, 'id' | 'created_at' | 'updated_at' | 'specific_date' | 'is_recurring'> {}

class NurseAvailability extends Model<NurseAvailabilityAttributes, NurseAvailabilityCreationAttributes> implements NurseAvailabilityAttributes {
  public id!: string;
  public nurse_id!: string;
  public day_of_week!: number;
  public start_time!: string;
  public end_time!: string;
  public is_recurring!: boolean;
  public specific_date?: Date;
  public created_at!: Date;
  public updated_at!: Date;
}

NurseAvailability.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nurse_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'nurse_profiles',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 6,
      },
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    specific_date: {
      type: DataTypes.DATEONLY,
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
    tableName: 'nurse_availability',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default NurseAvailability;