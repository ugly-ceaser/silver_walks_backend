import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database.config';

interface RefreshTokenAttributes {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    is_revoked: boolean;
    device_fingerprint?: string;
    created_at: Date;
    updated_at: Date;
}

interface RefreshTokenCreationAttributes extends Optional<RefreshTokenAttributes, 'id' | 'is_revoked' | 'created_at' | 'updated_at'> { }

class RefreshToken extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes> implements RefreshTokenAttributes {
    public id!: string;
    public user_id!: string;
    public token_hash!: string;
    public expires_at!: Date;
    public is_revoked!: boolean;
    public device_fingerprint?: string;
    public created_at!: Date;
    public updated_at!: Date;
}

RefreshToken.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        token_hash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        is_revoked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        device_fingerprint: {
            type: DataTypes.STRING,
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
        tableName: 'refresh_tokens',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                fields: ['user_id'],
            },
            {
                fields: ['token_hash'],
            },
        ],
    }
);

export default RefreshToken;
