const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Role = sequelize.define('Role', {
    name: { type: DataTypes.STRING(50), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: false },
}, 

{
    tableName: 'roles',
    timestamps: false // --> created_at y updated_at
});

module.exports = Role;