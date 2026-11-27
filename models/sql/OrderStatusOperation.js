const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const OrderStatusOperation = sequelize.define(
  'OrderStatusOperation',
  {
    order_id: {
      type: DataTypes.STRING(24),
      primaryKey: true,
      references: {
        model: 'checkout_attempts',
        key: 'order_id'
      },
      onDelete: 'RESTRICT'
    },

    history_index: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      validate: { min: 1 }
    },

    previous_status: {
      type: DataTypes.STRING(20),
      allowNull: false
    },

    entry: {
      type: DataTypes.JSONB,
      allowNull: false
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'completed']]
      }
    }
  },
  {
    tableName: 'order_status_operations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['status']
      }
    ]
  }
);

module.exports = OrderStatusOperation;