const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Product = sequelize.define('Product', {
    category_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    brand: { type: DataTypes.STRING(100), allowNull: false },
    price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, 

{
    tableName: 'products',
    timestamps: true // --> created_at y updated_at
});

module.exports = Product;