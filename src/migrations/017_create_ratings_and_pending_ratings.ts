import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('ratings', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      walk_session_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'walk_sessions',
          key: 'id',
        },
      },
      elderly_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'elderly_profiles',
          key: 'id',
        },
      },
      nurse_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'nurse_profiles',
          key: 'id',
        },
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.createTable('pending_ratings', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      walk_session_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'walk_sessions',
          key: 'id',
        },
      },
      elderly_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'elderly_profiles',
          key: 'id',
        },
      },
      nurse_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'nurse_profiles',
          key: 'id',
        },
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      is_expired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('ratings', ['walk_session_id']);
    await queryInterface.addIndex('ratings', ['nurse_id']);
    await queryInterface.addIndex('pending_ratings', ['elderly_id']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('pending_ratings');
    await queryInterface.dropTable('ratings');
  },
};
