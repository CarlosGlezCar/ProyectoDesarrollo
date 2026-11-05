const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Permission = sequelize.define('Permission', {
    key: { type: DataTypes.STRING(100), allowNull: false , unique: true},
    description: { type: DataTypes.STRING(255), allowNull: false },
}, 

{
    tableName: 'permissions',
    timestamps: false // --> created_at y updated_at
});

module.exports = Permission;