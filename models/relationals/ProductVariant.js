const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const ProductVariant = sequelize.define('ProductVariant', {
    product_id: { type: DataTypes.INTEGER, allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },

    sku: { type: DataTypes.STRING(100), allowNull: false, unique: true },

    size: { type: DataTypes.STRING(50), allowNull: true },

    color: { type: DataTypes.STRING(50), allowNull: true },

    active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, 

{
    tableName: 'product_variants',
    timestamps: false
});

module.exports = ProductVariant;