import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // Create enum type
        await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_otps_purpose AS ENUM('email_verification', 'password_reset', 'login_verification');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        // Create otps table
        await queryInterface.createTable('otps', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            otp: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            purpose: {
                type: 'enum_otps_purpose',
                allowNull: false,
            },
            expires_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            is_used: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
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

        // Add indexes
        await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE INDEX otps_email ON otps (email);
      EXCEPTION
        WHEN duplicate_table THEN null;
      END $$;
    `);

        await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE INDEX otps_expires_at ON otps (expires_at);
      EXCEPTION
        WHEN duplicate_table THEN null;
      END $$;
    `);
    },

    down: async (queryInterface: QueryInterface): Promise<void> => {
        await queryInterface.dropTable('otps');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_otps_purpose;');
    },
};
