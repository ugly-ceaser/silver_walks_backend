import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import NurseProfile from './NurseProfile.model';
import AvailabilityRule from './AvailabilityRule.model';

export enum SlotStatus {
    OPEN = 'OPEN',
    BOOKED = 'BOOKED',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED'
}

export enum SlotSource {
    RULE = 'RULE',
    MANUAL = 'MANUAL'
}

interface AvailabilitySlotAttributes {
    id: string;
    nurse_id: string;
    date: string;
    start_time: string;
    duration_mins: number;
    status: SlotStatus;
    source: SlotSource;
    rule_id?: string;
    version: number;
    created_at: Date;
    updated_at: Date;
}

export interface AvailabilitySlotCreationAttributes extends Optional<AvailabilitySlotAttributes, 'id' | 'status' | 'source' | 'rule_id' | 'version' | 'created_at' | 'updated_at'> { }

class AvailabilitySlot extends Model<AvailabilitySlotAttributes, AvailabilitySlotCreationAttributes> implements AvailabilitySlotAttributes {
    public id!: string;
    public nurse_id!: string;
    public date!: string;
    public start_time!: string;
    public duration_mins!: number;
    public status!: SlotStatus;
    public source!: SlotSource;
    public rule_id?: string;
    public version!: number;
    public created_at!: Date;
    public updated_at!: Date;

    // Associations
    public readonly nurse?: NurseProfile;
    public readonly rule?: AvailabilityRule;
}

AvailabilitySlot.init(
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
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        start_time: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        duration_mins: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isIn: [[30, 45, 60]]
            }
        },
        status: {
            type: DataTypes.ENUM(...Object.values(SlotStatus)),
            allowNull: false,
            defaultValue: SlotStatus.OPEN,
        },
        source: {
            type: DataTypes.ENUM(...Object.values(SlotSource)),
            allowNull: false,
            defaultValue: SlotSource.RULE,
        },
        rule_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'availability_rules',
                key: 'id',
            },
        },
        version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
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
        tableName: 'availability_slots',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

export default AvailabilitySlot;
