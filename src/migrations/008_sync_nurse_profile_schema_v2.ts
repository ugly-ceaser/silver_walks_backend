import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // 1. Create enum types for nurse status if they don't exist
        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE enum_nurse_profiles_availability_status AS ENUM('available', 'busy', 'offline', 'reserved', 'suspended');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE enum_nurse_profiles_verification_status AS ENUM('pending', 'approved', 'rejected');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        const tableInfo = await queryInterface.describeTable('nurse_profiles');

        // 2. Rename total_walks to total_walks_completed
        if (tableInfo['total_walks'] && !tableInfo['total_walks_completed']) {
            await queryInterface.renameColumn('nurse_profiles', 'total_walks', 'total_walks_completed');
        } else if (!tableInfo['total_walks_completed']) {
            await queryInterface.addColumn('nurse_profiles', 'total_walks_completed', {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            });
        }

        // 3. Add availability_status if missing
        if (!tableInfo['availability_status']) {
            await queryInterface.addColumn('nurse_profiles', 'availability_status', {
                type: 'enum_nurse_profiles_availability_status',
                allowNull: false,
                defaultValue: 'offline',
            });
        }

        // 4. Add verification_status if missing
        if (!tableInfo['verification_status']) {
            await queryInterface.addColumn('nurse_profiles', 'verification_status', {
                type: 'enum_nurse_profiles_verification_status',
                allowNull: false,
                defaultValue: 'pending',
            });

            // If is_verified exists, migrate data
            if (tableInfo['is_verified']) {
                await queryInterface.sequelize.query(`
                    UPDATE nurse_profiles 
                    SET verification_status = CASE 
                        WHEN is_verified = true THEN 'approved'::enum_nurse_profiles_verification_status 
                        ELSE 'pending'::enum_nurse_profiles_verification_status 
                    END
                `);
            }
        }

        // 5. Remove is_verified column
        if (tableInfo['is_verified']) {
            await queryInterface.removeColumn('nurse_profiles', 'is_verified');
        }
    },

    down: async (queryInterface: QueryInterface): Promise<void> => {
        await queryInterface.addColumn('nurse_profiles', 'is_verified', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });

        await queryInterface.sequelize.query(`
            UPDATE nurse_profiles 
            SET is_verified = CASE 
                WHEN verification_status = 'approved' THEN true 
                ELSE false 
            END
        `);

        await queryInterface.removeColumn('nurse_profiles', 'verification_status');
        await queryInterface.removeColumn('nurse_profiles', 'availability_status');

        // Rename back total_walks_completed to total_walks
        await queryInterface.renameColumn('nurse_profiles', 'total_walks_completed', 'total_walks');

        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_nurse_profiles_verification_status;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_nurse_profiles_availability_status;');
    },
};
