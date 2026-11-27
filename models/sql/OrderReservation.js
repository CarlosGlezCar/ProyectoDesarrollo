const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const OrderReservation = sequelize.define('OrderReservation', {
  order_id: {
    type: DataTypes.STRING(24),
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'checkout_attempts',
      key: 'order_id'
    },
    onDelete: 'RESTRICT'
  },

  variant_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'inventory',
      key: 'variant_id'
    },
    onDelete: 'RESTRICT'
  },

  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: true,
      min: 1,
      max: 99
    }
  },

  status: {
    type: DataTypes.ENUM(
      'reserved',
      'released',
      'consumed'
    ),
    allowNull: false,
    defaultValue: 'reserved'
  }

}, {
  tableName: 'order_reservations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['variant_id', 'status']
    }
  ]
});

module.exports = OrderReservation;