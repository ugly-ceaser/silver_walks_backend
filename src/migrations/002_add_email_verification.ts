import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // Add is_email_verified column
        await queryInterface.addColumn('users', 'is_email_verified', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });

        // Add email_verified_at column
        await queryInterface.addColumn('users', 'email_verified_at', {
            type: DataTypes.DATE,
            allowNull: true,
        });
    },

    down: async (queryInterface: QueryInterface): Promise<void> => {
        // Remove columns
        await queryInterface.removeColumn('users', 'is_email_verified');
        await queryInterface.removeColumn('users', 'email_verified_at');
    },
};
