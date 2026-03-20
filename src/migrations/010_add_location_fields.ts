import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
        // Add location fields to nurse_profiles
        await queryInterface.addColumn('nurse_profiles', 'latitude', {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
        });
        await queryInterface.addColumn('nurse_profiles', 'longitude', {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
        });

        // Add location fields to elderly_profiles
        await queryInterface.addColumn('elderly_profiles', 'latitude', {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
        });
        await queryInterface.addColumn('elderly_profiles', 'longitude', {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
        });
    },

    down: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
        // Remove location fields from nurse_profiles
        await queryInterface.removeColumn('nurse_profiles', 'latitude');
        await queryInterface.removeColumn('nurse_profiles', 'longitude');

        // Remove location fields from elderly_profiles
        await queryInterface.removeColumn('elderly_profiles', 'latitude');
        await queryInterface.removeColumn('elderly_profiles', 'longitude');
    }
};
