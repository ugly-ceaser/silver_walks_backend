import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // Create enum types
        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE enum_notifications_type AS ENUM('walk_reminder', 'walk_request', 'walk_cancelled', 'payment', 'system');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE enum_notifications_priority AS ENUM('low', 'medium', 'high', 'urgent');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryInterface.createTable('notifications', {
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
            type: {
                type: 'enum_notifications_type',
                allowNull: false,
            },
            title: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            message: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            priority: {
                type: 'enum_notifications_priority',
                allowNull: false,
                defaultValue: 'medium',
            },
            is_read: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            action_url: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        });

        // Add index on user_id
        await queryInterface.addIndex('notifications', ['user_id']);
    },

    down: async (queryInterface: QueryInterface): Promise<void> => {
        await queryInterface.dropTable('notifications');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_notifications_type;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_notifications_priority;');
    },
};
