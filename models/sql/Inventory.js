const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Inventory = sequelize.define('Inventory', {
    variant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        validate: {
            isInt: true,
            min: 1,
            max: 2147483647
        },
        references: {
            model: 'product_variants',
            key: 'id'
        }
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            isInt: true,
            min: 0,
            max: 2147483647
        }
    },
    reserved: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            isInt: true,
            min: 0,
            max: 2147483647
        }
    }
}, {
    tableName: 'inventory',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',
    validate: {
        reservedWithinStock() {
            if (Number(this.reserved) > Number(this.stock)) {
                throw new Error('La cantidad reservada no puede superar el stock.');
            }
        }
    }
});

module.exports = Inventory;