import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // 1. Create enum types
        await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_availability_rules_recurrence_type AS ENUM('WEEKLY', 'DAILY', 'ONCE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_availability_slots_status AS ENUM('OPEN', 'BOOKED', 'CANCELLED', 'EXPIRED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_availability_slots_source AS ENUM('RULE', 'MANUAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_bookings_status AS ENUM('CONFIRMED', 'CANCELLED', 'COMPLETED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        // 2. Create availability_rules table
        await queryInterface.createTable('availability_rules', {
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
            recurrence_type: {
                type: 'enum_availability_rules_recurrence_type',
                allowNull: false,
            },
            day_of_week: {
                type: DataTypes.INTEGER, // 0-6
                allowNull: true,
            },
            start_time: {
                type: DataTypes.TIME,
                allowNull: false,
            },
            duration_mins: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            effective_from: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            effective_until: {
                type: DataTypes.DATEONLY,
                allowNull: true,
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
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

        // 3. Create availability_slots table
        await queryInterface.createTable('availability_slots', {
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
            date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            start_time: {
                type: DataTypes.TIME,
                allowNull: false,
            },
            duration_mins: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            status: {
                type: 'enum_availability_slots_status',
                allowNull: false,
                defaultValue: 'OPEN',
            },
            source: {
                type: 'enum_availability_slots_source',
                allowNull: false,
                defaultValue: 'RULE',
            },
            rule_id: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'availability_rules',
                    key: 'id',
                },
                onDelete: 'SET NULL',
            },
            version: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
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

        // 4. Create bookings table
        await queryInterface.createTable('bookings', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            slot_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'availability_slots',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            elderly_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'elderly_profiles',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            booked_by: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            status: {
                type: 'enum_bookings_status',
                allowNull: false,
                defaultValue: 'CONFIRMED',
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            booked_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            cancelled_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            cancel_reason: {
                type: DataTypes.TEXT,
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

        // 5. Add Constraints and Indexes
        await queryInterface.addConstraint('availability_slots', {
            fields: ['duration_mins'],
            type: 'check',
            where: {
                duration_mins: [30, 45, 60]
            }
        });

        // Partial unique index for conflict detection
        await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX idx_nurse_date_time_unique 
      ON availability_slots (nurse_id, date, start_time) 
      WHERE status != 'CANCELLED';
    `);

        // General indexes
        await queryInterface.addIndex('availability_rules', ['nurse_id']);
        await queryInterface.addIndex('availability_slots', ['nurse_id', 'date']);
        await queryInterface.addIndex('bookings', ['slot_id']);
        await queryInterface.addIndex('bookings', ['elderly_id']);
    },

    down: async (queryInterface: QueryInterface): Promise<void> => {
        await queryInterface.dropTable('bookings');
        await queryInterface.dropTable('availability_slots');
        await queryInterface.dropTable('availability_rules');

        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_bookings_status;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_availability_slots_source;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_availability_slots_status;');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_availability_rules_recurrence_type;');
    },
};
