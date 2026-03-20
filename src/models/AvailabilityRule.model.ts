import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import NurseProfile from './NurseProfile.model';

export enum RecurrenceType {
    WEEKLY = 'WEEKLY',
    DAILY = 'DAILY',
    ONCE = 'ONCE'
}

interface AvailabilityRuleAttributes {
    id: string;
    nurse_id: string;
    recurrence_type: RecurrenceType;
    day_of_week?: number;
    start_time: string;
    duration_mins: number;
    effective_from: string;
    effective_until?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface AvailabilityRuleCreationAttributes extends Optional<AvailabilityRuleAttributes, 'id' | 'day_of_week' | 'effective_until' | 'is_active' | 'created_at' | 'updated_at'> { }

class AvailabilityRule extends Model<AvailabilityRuleAttributes, AvailabilityRuleCreationAttributes> implements AvailabilityRuleAttributes {
    public id!: string;
    public nurse_id!: string;
    public recurrence_type!: RecurrenceType;
    public day_of_week?: number;
    public start_time!: string;
    public duration_mins!: number;
    public effective_from!: string;
    public effective_until?: string;
    public is_active!: boolean;
    public created_at!: Date;
    public updated_at!: Date;

    // Associations
    public readonly nurse?: NurseProfile;
}

AvailabilityRule.init(
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
        },
        recurrence_type: {
            type: DataTypes.ENUM(...Object.values(RecurrenceType)),
            allowNull: false,
        },
        day_of_week: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        start_time: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        duration_mins: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        effective_from: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        effective_until: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
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
        tableName: 'availability_rules',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

export default AvailabilityRule;
