const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const User = sequelize.define('User', {
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    salt_key: { type: DataTypes.STRING(255), allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'roles',
            key: 'id'
        }
    }
}, {
    tableName: 'users',
    timestamps: true // --> created_at y updated_at
});

// Ocultar los datos de contraseña en las respuestas JSON.
User.prototype.toJSON = function () {
    const values = { ...this.get({ plain: true }) };

    delete values.password;
    delete values.password_hash;
    delete values.salt_key;

    return values;
};

module.exports = User;