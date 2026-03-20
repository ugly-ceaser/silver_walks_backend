import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
        // Add device_token to nurse_profiles
        await queryInterface.addColumn('nurse_profiles', 'device_token', {
            type: DataTypes.STRING(512),
            allowNull: true,
        });

        // Add device_token to elderly_profiles
        await queryInterface.addColumn('elderly_profiles', 'device_token', {
            type: DataTypes.STRING(512),
            allowNull: true,
        });
    },

    down: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
        // Remove device_token from nurse_profiles
        await queryInterface.removeColumn('nurse_profiles', 'device_token');

        // Remove device_token from elderly_profiles
        await queryInterface.removeColumn('elderly_profiles', 'device_token');
    }
};
