const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Permission = sequelize.define('Permission', {
    key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [1, 100],
            is: /^[a-z][a-z0-9_-]*:(create|read|update|delete):(own|any)$/
        }
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    }
}, {
    tableName: 'permissions',
    timestamps: false
});

module.exports = Permission;