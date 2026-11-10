const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const ProductVariant = sequelize.define('ProductVariant', {
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: true,
            min: 1,
            max: 2147483647
        },
        references: {
            model: 'products',
            key: 'id'
        }
    },
    sku: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [1, 100]
        }
    },
    size: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
            notEmpty: true,
            len: [1, 20]
        }
    },
    color: {
        type: DataTypes.STRING(30),
        allowNull: true,
        validate: {
            notEmpty: true,
            len: [1, 30]
        }
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'product_variants',
    timestamps: false
});

module.exports = ProductVariant;