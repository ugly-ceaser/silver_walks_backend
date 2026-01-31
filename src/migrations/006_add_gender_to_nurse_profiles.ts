import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        await queryInterface.addColumn('nurse_profiles', 'gender', {
            type: DataTypes.STRING,
            allowNull: true, // Making it nullable initially to avoid issues with existing records
        });
    },

    down: async (queryInterface: QueryInterface): Promise<void> => {
        await queryInterface.removeColumn('nurse_profiles', 'gender');
    },
};
