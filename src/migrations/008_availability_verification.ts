import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // 1. Update nurse_profiles table
        const tableInfo = await queryInterface.describeTable('nurse_profiles');

        // Availability Status ENUM
        await queryInterface.sequelize.query(`
        DO $$
        BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'availability_status_enum') THEN
            CREATE TYPE availability_status_enum AS ENUM ('available','offline','busy','reserved','suspended');
        END IF;
        END
        $$;
        `);

        // Verification Status ENUM
        await queryInterface.sequelize.query(`
        DO $$
        BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status_enum') THEN
            CREATE TYPE verification_status_enum AS ENUM ('pending','approved','rejected');
        END IF;
        END
        $$;
        `);

        // Add availability_status if missing
        if (!tableInfo['availability_status']) {
            await queryInterface.addColumn('nurse_profiles', 'availability_status', {
                type: 'availability_status_enum',
                allowNull: false,
                defaultValue: 'offline',
            });
        }

        // Add verification_status if missing
        if (tableInfo['is_verified'] && !tableInfo['verification_status']) {
            await queryInterface.addColumn('nurse_profiles', 'verification_status', {
                type: 'verification_status_enum',
                allowNull: false,
                defaultValue: 'pending',
            });

            await queryInterface.removeColumn('nurse_profiles', 'is_verified');
        }
    },

    down: async (queryInterface: QueryInterface): Promise<void> => {
        /**
         * Intentionally left empty.
         * This migration is additive and safe for production.
         * Reverting enum/column changes could cause data loss.
         */        
    },
};
