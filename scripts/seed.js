const connectMongo = require('../config/mongoose');
const mongoose = require('mongoose');
const {
    sequelize,
    User,
    Role,
    Permission,
    Product,
    ProductVariant,
    Inventory
} = require('../models/relationals');
const { Customer, Order } = require('../models/documents');
const { hashPassword } = require('../utils/passwords');

const resources = [
    'users',
    'roles',
    'permissions',
    'products',
    'variants',
    'inventory',
    'customers',
    'orders'
];

const actions = ['create', 'read', 'update', 'delete'];

const permissionMatrix = {
    ADMIN: resources.flatMap(resource =>
        actions.map(action => `${resource}:${action}:any`)
    ),

    SALES: [
        'products:read:any',
        'variants:read:any',
        'inventory:read:any',
        'inventory:update:any',
        'customers:read:any',
        'customers:update:any',
        'orders:create:any',
        'orders:read:any',
        'orders:update:any'
    ],

    USER: [
        'products:read:any',
        'variants:read:any',
        'inventory:read:any',
        'customers:read:own',
        'orders:create:own',
        'orders:read:own',
        'orders:update:own'
    ]
};

async function createRole(name, description) {
    const [role] = await Role.findOrCreate({
        where: { name },
        defaults: { name, description }
    });

    return role;
}

async function createUser(first_name, last_name, email, password, role) {
    const existingUser = await User.findOne({
        where: { email }
    });

    if (existingUser) {
        if (existingUser.role_id !== role.id || !existingUser.active) {
            await existingUser.update({
                role_id: role.id,
                active: true
            });
        }

        return existingUser;
    }

    const hashed = await hashPassword(password);

    return await User.create({
        first_name,
        last_name,
        email,
        password_hash: hashed.password_hash,
        salt_key: hashed.salt_key,
        active: true,
        role_id: role.id
    });
}

async function createCustomer(user) {
    let customer = await Customer.findOne({ email: user.email });

    if (!customer) {
        customer = await Customer.create({
            userId: user.id,
            email: user.email,
            phone: '6141234567',
            addresses: [{
                type: 'SHIPING',
                street: 'Avenida Principal',
                number: '100',
                city: 'Chihuahua',
                state: 'Chihuahua',
                zipCode: '31000',
                country: 'México'
            }]
        });
    }

    return customer;
}

async function seed() {
    try {
        await connectMongo();
        await sequelize.authenticate();
        await sequelize.sync();

        console.log('Preparando roles y permisos...');

        const roles = {
            ADMIN: await createRole('ADMIN', 'Administrador del sistema'),
            SALES: await createRole('SALES', 'Personal de ventas'),
            USER: await createRole('USER', 'Cliente del sistema')
        };

        const permissions = {};

        for (const resource of resources) {
            for (const action of actions) {
                const key = `${resource}:${action}:any`;

                const [permission] = await Permission.findOrCreate({
                    where: { key },
                    defaults: {
                        key,
                        description: `${action} ${resource} (cualquier registro)`
                    }
                });

                permissions[key] = permission;
            }
        }

        const ownPermissions = [
            'customers:read:own',
            'orders:create:own',
            'orders:read:own',
            'orders:update:own'
        ];

        for (const key of ownPermissions) {
            const [permission] = await Permission.findOrCreate({
                where: { key },
                defaults: {
                    key,
                    description: `${key.split(':')[1]} ${key.split(':')[0]} propios`
                }
            });

            permissions[key] = permission;
        }

        for (const [roleName, keys] of Object.entries(permissionMatrix)) {
            await roles[roleName].setPermissions(
                keys.map(key => permissions[key])
            );
        }

        console.log('Roles y permisos preparados.');

        console.log('Creando usuarios de prueba...');

        const admin = await createUser(
            'Administrador',
            'Stride',
            'admin@strideco.test',
            'Admin123!',
            roles.ADMIN
        );

        const sales = await createUser(
            'Vendedor',
            'Stride',
            'ventas@strideco.test',
            'Ventas123!',
            roles.SALES
        );

        const user = await createUser(
            'Cliente',
            'Stride',
            'usuario@strideco.test',
            'Usuario123!',
            roles.USER
        );

        console.log('Usuarios preparados.');

        console.log('Creando catálogo e inventario...');

        const [product] = await Product.findOrCreate({
            where: { name: 'Tenis deportivos Stride' },
            defaults: {
                category_id: 1,
                name: 'Tenis deportivos Stride',
                description: 'Tenis deportivos de prueba',
                brand: 'Stride & Co.',
                price: 1000,
                active: true
            }
        });

        const [variant] = await ProductVariant.findOrCreate({
            where: { sku: 'STRIDE-001-25' },
            defaults: {
                product_id: product.id,
                sku: 'STRIDE-001-25',
                size: '25',
                color: 'Negro',
                active: true
            }
        });

        await Inventory.findOrCreate({
            where: { variant_id: variant.id },
            defaults: {
                variant_id: variant.id,
                stock: 20,
                reserved: 0
            }
        });

        console.log('Catálogo e inventario preparados.');

        console.log('Creando clientes y pedidos de prueba...');

        const customerUser = await createCustomer(user);
        const salesCustomer = await createCustomer(sales);

        for (const customer of [customerUser, salesCustomer]) {
            const existingOrder = await Order.findOne({
                customerId: customer._id
            });

            if (!existingOrder) {
                await Order.create({
                    customerId: customer._id,
                    totals: {
                        subTotal: 1000,
                        shiping: 100,
                        discount: 0,
                        total: 1100
                    }
                });
            }
        }

        console.log('Seed completado correctamente.');
        console.log('Usuarios de prueba:');
        console.log('ADMIN: admin@strideco.test / Admin123!');
        console.log('SALES: ventas@strideco.test / Ventas123!');
        console.log('USER: usuario@strideco.test / Usuario123!');
    } catch (error) {
        console.error('Error al ejecutar el seed:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect().catch(() => {});
        await sequelize.close().catch(() => {});
    }
}

seed();