import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';
import AvailabilitySlot from './AvailabilitySlot.model';
import ElderlyProfile from './ElderlyProfile.model';
import User from './User.model';

export enum BookingStatus {
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED'
}

interface BookingAttributes {
    id: string;
    slot_id: string;
    elderly_id: string;
    booked_by: string;
    status: BookingStatus;
    notes?: string;
    booked_at: Date;
    cancelled_at?: Date;
    cancel_reason?: string;
    created_at: Date;
    updated_at: Date;
}

export interface BookingCreationAttributes extends Optional<BookingAttributes, 'id' | 'status' | 'notes' | 'booked_at' | 'cancelled_at' | 'cancel_reason' | 'created_at' | 'updated_at'> { }

class Booking extends Model<BookingAttributes, BookingCreationAttributes> implements BookingAttributes {
    public id!: string;
    public slot_id!: string;
    public elderly_id!: string;
    public booked_by!: string;
    public status!: BookingStatus;
    public notes?: string;
    public booked_at!: Date;
    public cancelled_at?: Date;
    public cancel_reason?: string;
    public created_at!: Date;
    public updated_at!: Date;

    // Associations
    public readonly slot?: AvailabilitySlot;
    public readonly elderly?: ElderlyProfile;
    public readonly booker?: User;
}

Booking.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        slot_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'availability_slots',
                key: 'id',
            },
        },
        elderly_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'elderly_profiles',
                key: 'id',
            },
        },
        booked_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        status: {
            type: DataTypes.ENUM(...Object.values(BookingStatus)),
            allowNull: false,
            defaultValue: BookingStatus.CONFIRMED,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        booked_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        cancelled_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        cancel_reason: {
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
        tableName: 'bookings',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

export default Booking;
