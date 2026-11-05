const sequelize = require('../../config/sequelize');
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const Product = require('./Product');
const ProductVariant = require('./ProductVariant');
const Inventory = require('./Inventory');

Role.hasMany(User, {foreignKey: 'role_id', as:'users'});


User.belongsTo(Role, {foreignKey: 'role_id', as:'role'});


Role.belongsToMany(Permission, {
    through: 'role_permissions',  // tabla intermedia
    foreignKey: 'role_id', //lave foranea del modelo principal
    otherKey: 'permission_id', // la otra llave foranea
    as: 'permissions', //plural del segundo modelo
    timestamps: false
});


Permission.belongsToMany(Role, {
    through: 'role_permissions',  // tabla intermedia
    foreignKey: 'permission_id', //lave foranea del modelo principal
    otherKey: 'role_id', // la otra llave foranea
    as: 'roles', //plural del primer modelo
    timestamps: false
});

// Product 1:N ProductVariant
Product.hasMany(ProductVariant, {
    foreignKey: 'product_id',
    as: 'variants'
});

ProductVariant.belongsTo(Product, {
    foreignKey: 'product_id',
    as: 'product'
});

// ProductVariant 1:1 Inventory
ProductVariant.hasOne(Inventory, {
    foreignKey: 'variant_id',
    as: 'inventory'
});

Inventory.belongsTo(ProductVariant, {
    foreignKey: 'variant_id',
    as: 'variant'
});


module.exports = {sequelize, User, Role, Permission, Product, ProductVariant, Inventory};