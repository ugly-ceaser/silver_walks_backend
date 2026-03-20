import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';

export enum AuthEventType {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILURE = 'LOGIN_FAILURE',
    LOGOUT = 'LOGOUT',
    OTP_ISSUED = 'OTP_ISSUED',
    OTP_VERIFIED = 'OTP_VERIFIED',
    OTP_FAILED = 'OTP_FAILED',
    PASSWORD_RESET_INITIATED = 'PASSWORD_RESET_INITIATED',
    PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
    TOKEN_REFRESH = 'TOKEN_REFRESH',
    TOKEN_REVOKED = 'TOKEN_REVOKED',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED'
}

interface AuthEventAttributes {
    id: string;
    user_id?: string;
    event_type: AuthEventType;
    ip_address?: string;
    user_agent?: string;
    metadata?: any;
    timestamp: Date;
}

interface AuthEventCreationAttributes extends Optional<AuthEventAttributes, 'id' | 'timestamp'> { }

class AuthEvent extends Model<AuthEventAttributes, AuthEventCreationAttributes> implements AuthEventAttributes {
    public id!: string;
    public user_id?: string;
    public event_type!: AuthEventType;
    public ip_address?: string;
    public user_agent?: string;
    public metadata?: any;
    public timestamp!: Date;
}

AuthEvent.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        event_type: {
            type: DataTypes.ENUM(...Object.values(AuthEventType)),
            allowNull: false,
        },
        ip_address: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'auth_events',
        timestamps: false,
        underscored: true,
    }
);

export default AuthEvent;
