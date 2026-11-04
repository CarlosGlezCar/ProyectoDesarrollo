const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Inventory = sequelize.define('Inventory', {
    variant_id: { type: DataTypes.INTEGER, allowNull: false, unique: true,
        references: {
            model: 'product_variants',
            key: 'id'
        }
    },

    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    reserved: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }

}, 

{
    tableName: 'inventory',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at'
});

module.exports = Inventory;