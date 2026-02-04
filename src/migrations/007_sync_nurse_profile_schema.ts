import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // 1. Update nurse_profiles table
        const tableInfo = await queryInterface.describeTable('nurse_profiles');

        // Rename years_of_experience to experience_years if it exists
        if (tableInfo['years_of_experience'] && !tableInfo['experience_years']) {
            await queryInterface.renameColumn('nurse_profiles', 'years_of_experience', 'experience_years');
        } else if (!tableInfo['experience_years']) {
            await queryInterface.addColumn('nurse_profiles', 'experience_years', {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            });
        }

        // Add max_patients_per_day if it doesn't exist
        if (!tableInfo['max_patients_per_day']) {
            await queryInterface.addColumn('nurse_profiles', 'max_patients_per_day', {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            });
        }

        // Add specializations if it doesn't exist
        if (!tableInfo['specializations']) {
            await queryInterface.addColumn('nurse_profiles', 'specializations', {
                type: DataTypes.ARRAY(DataTypes.STRING),
                allowNull: false,
                defaultValue: [],
            });
        }

        // Change certifications to JSONB if it's currently an array of strings
        if (tableInfo['certifications'] && tableInfo['certifications'].type.includes('ARRAY')) {
            // In PostgreSQL, changing from ARRAY to JSONB requires dropping default first if it exists
            await queryInterface.sequelize.query('ALTER TABLE nurse_profiles ALTER COLUMN certifications DROP DEFAULT;');
            await queryInterface.sequelize.query('ALTER TABLE nurse_profiles ALTER COLUMN certifications TYPE JSONB USING to_jsonb(certifications);');
            await queryInterface.sequelize.query("ALTER TABLE nurse_profiles ALTER COLUMN certifications SET DEFAULT '[]'::jsonb;");
        } else if (!tableInfo['certifications']) {
            await queryInterface.addColumn('nurse_profiles', 'certifications', {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: [],
            });
        }

        // Add points_balance if missing (some models might have it)
        if (!tableInfo['points_balance']) {
            await queryInterface.addColumn('nurse_profiles', 'points_balance', {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            });
        }

        // 2. Create nurse_certifications table (separate from the JSONB field)
        await queryInterface.createTable('nurse_certifications', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            nurse_profile_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'nurse_profiles',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            issuer: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            issue_date: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            expiry_date: {
                type: DataTypes.DATE,
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

        // 3. Create nurse_availability table
        await queryInterface.createTable('nurse_availability', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            nurse_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'nurse_profiles',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            day_of_week: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            start_time: {
                type: DataTypes.TIME,
                allowNull: false,
            },
            end_time: {
                type: DataTypes.TIME,
                allowNull: false,
            },
            is_recurring: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            specific_date: {
                type: DataTypes.DATEONLY,
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
    },

    down: async (queryInterface: QueryInterface): Promise<void> => {
        await queryInterface.dropTable('nurse_availability');
        await queryInterface.dropTable('nurse_certifications');

        // We don't necessarily want to undo renames or additions to nurse_profiles 
        // in a 'down' migration unless specifically requested, as it could lose data.
        // But for completeness:
        await queryInterface.removeColumn('nurse_profiles', 'points_balance');
        await queryInterface.removeColumn('nurse_profiles', 'specializations');
        await queryInterface.removeColumn('nurse_profiles', 'max_patients_per_day');
        // Renaming back would be:
        // await queryInterface.renameColumn('nurse_profiles', 'experience_years', 'years_of_experience');
    },
};