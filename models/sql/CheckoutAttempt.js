const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const CheckoutAttempt = sequelize.define('CheckoutAttempt', {
  order_id: {
    type: DataTypes.STRING(24),
    primaryKey: true
  },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'completed']]
    }
  },

  payload: {
    type: DataTypes.JSONB,
    allowNull: true
  }

}, {
  tableName: 'checkout_attempts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CheckoutAttempt;