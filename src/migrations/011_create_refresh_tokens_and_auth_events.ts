import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // 1. Create enum for auth events if it doesn't exist
        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE enum_auth_events_event_type AS ENUM(
                    'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 
                    'OTP_ISSUED', 'OTP_VERIFIED', 'OTP_FAILED', 
                    'PASSWORD_RESET_INITIATED', 'PASSWORD_RESET_COMPLETED', 
                    'TOKEN_REFRESH', 'TOKEN_REVOKED'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // 2. Create refresh_tokens table
        await queryInterface.createTable('refresh_tokens', {
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
        });

        // 3. Create auth_events table
        await queryInterface.createTable('auth_events', {
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
                type: 'enum_auth_events_event_type',
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
        });

        // 4. Update otps table with brute-force protection fields
        await queryInterface.addColumn('otps', 'attempt_count', {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });

        await queryInterface.addColumn('otps', 'max_attempts', {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 5,
        });

        // 5. Add indexes
        await queryInterface.addIndex('refresh_tokens', ['user_id']);
        await queryInterface.addIndex('refresh_tokens', ['token_hash']);
        await queryInterface.addIndex('auth_events', ['user_id', 'timestamp']);
    },

    down: async (queryInterface: QueryInterface): Promise<void> => {
        await queryInterface.removeColumn('otps', 'max_attempts');
        await queryInterface.removeColumn('otps', 'attempt_count');
        await queryInterface.dropTable('auth_events');
        await queryInterface.dropTable('refresh_tokens');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_auth_events_event_type;');
    },
};
