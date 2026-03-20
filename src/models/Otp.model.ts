import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';

export enum OtpPurpose {
    EMAIL_VERIFICATION = 'email_verification',
    PASSWORD_RESET = 'password_reset',
    LOGIN_VERIFICATION = 'login_verification'
}

interface OtpAttributes {
    id: string;
    email: string;
    otp: string;
    purpose: OtpPurpose;
    expires_at: Date;
    is_used: boolean;
    attempt_count: number;
    max_attempts: number;
    created_at: Date;
    updated_at: Date;
}

interface OtpCreationAttributes extends Optional<OtpAttributes, 'id' | 'is_used' | 'attempt_count' | 'max_attempts' | 'created_at' | 'updated_at'> { }

class Otp extends Model<OtpAttributes, OtpCreationAttributes> implements OtpAttributes {
    public id!: string;
    public email!: string;
    public otp!: string;
    public purpose!: OtpPurpose;
    public expires_at!: Date;
    public is_used!: boolean;
    public attempt_count!: number;
    public max_attempts!: number;
    public created_at!: Date;
    public updated_at!: Date;
}

Otp.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true,
            },
        },
        otp: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        purpose: {
            type: DataTypes.ENUM(...Object.values(OtpPurpose)),
            allowNull: false,
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        is_used: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        attempt_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        max_attempts: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 5,
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
        tableName: 'otps',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                fields: ['email'],
            },
            {
                fields: ['expires_at'],
            },
        ],
    }
);

export default Otp;
