import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
        // Create enum type if it doesn't exist (useful for Postgres, safe for others)
        // Note: For Postgres, we might need to create the type explicitly if not using Sequelize automatically
        
        await queryInterface.addColumn('notifications', 'channel', {
            type: DataTypes.ENUM('in_app', 'email', 'sms', 'push'),
            allowNull: false,
            defaultValue: 'in_app',
        });

        await queryInterface.addColumn('notifications', 'sent_at', {
            type: DataTypes.DATE,
            allowNull: true,
        });
    },

    down: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
        await queryInterface.removeColumn('notifications', 'channel');
        await queryInterface.removeColumn('notifications', 'sent_at');
        
        // Optionally drop the enum type if needed (Postgres specific)
        // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_channel";');
    }
};
