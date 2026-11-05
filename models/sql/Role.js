const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Role = sequelize.define('Role', {
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 50]
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
    tableName: 'roles',
    timestamps: true
});

module.exports = Role;