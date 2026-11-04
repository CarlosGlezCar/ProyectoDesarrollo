const { Product, ProductVariant, Inventory, sequelize} = require('../models/relationals');

//CREATE
async function create(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
        const { productId, sku, size, color, active } = req.body;

        // Verificar que exista el producto
        const product = await Product.findByPk(productId);

        if (!product) {
            await transaction.rollback();

            return res.status(404).json({
                message: 'Product not found',
                data: null
            });
        }

        // Crear variante
        const variant = await ProductVariant.create({
            product_id: productId,
            sku,
            size,
            color,
            active
        }, {
            transaction
        });

        // Crear automáticamente su inventario
        await Inventory.create({
            variant_id: variant.id,
            stock: 0,
            reserved: 0
        }, {
            transaction
        });

        await transaction.commit();

        // Recuperar variante junto con inventory
        const createdVariant = await ProductVariant.findByPk(variant.id, {
            include: {
                model: Inventory,
                as: 'inventory'
            }
        });

        return res.status(201).json({
            message: 'Product variant created',
            data: createdVariant
        });

    } catch (err) {
        await transaction.rollback();
        next(err);
    }
}

// READ ALL
async function list(req, res, next) {
    try {
        const variants = await ProductVariant.findAll({
            include: [
                {
                    model: Product,
                    as: 'product'
                },
                {
                    model: Inventory,
                    as: 'inventory'
                }
            ]
        });

        return res.json({
            message: 'Product variants list',
            data: variants
        });

    } catch (err) {
        next(err);
    }
}

// READ BY ID
async function find(req, res, next) {
    try {
        const id = req.params.id;

        const variant = await ProductVariant.findByPk(id, {
            include: [
                {
                    model: Product,
                    as: 'product'
                },
                {
                    model: Inventory,
                    as: 'inventory'
                }
            ]
        });

        if (!variant) {
            return res.status(404).json({
                message: 'Product variant not found',
                data: null
            });
        }

        return res.json({
            message: 'Product variant found',
            data: variant
        });

    } catch (err) {
        next(err);
    }
}


// UPDATE
async function update(req, res, next) {
    try {
        const id = req.params.id;

        const variant = await ProductVariant.findByPk(id);

        if (!variant) {
            return res.status(404).json({
                message: 'Product variant not found',
                data: null
            });
        }

        const { productId, sku, size, color, active } = req.body;

        // Si quieren cambiar el producto, verificar que exista
        if (productId !== undefined) {
            const product = await Product.findByPk(productId);

            if (!product) {
                return res.status(404).json({
                    message: 'Product not found',
                    data: null
                });
            }
        }

        await variant.update({
            product_id: productId ?? variant.product_id,
            sku: sku ?? variant.sku,
            size: size ?? variant.size,
            color: color ?? variant.color,
            active: active ?? variant.active
        });

        const updatedVariant = await ProductVariant.findByPk(id, {
            include: {
                model: Inventory,
                as: 'inventory'
            }
        });

        return res.json({
            message: 'Product variant updated',
            data: updatedVariant
        });

    } catch (err) {
        next(err);
    }
}


// DELETE
async function destroy(req, res, next) {
    const transaction = await sequelize.transaction();

    try {
        const id = req.params.id;

        const variant = await ProductVariant.findByPk(id, {
            transaction
        });

        if (!variant) {
            await transaction.rollback();

            return res.status(404).json({
                message: 'Product variant not found',
                data: null
            });
        }

        // Eliminar primero su inventario
        await Inventory.destroy({
            where: {
                variant_id: id
            },
            transaction
        });

        await variant.destroy({
            transaction
        });

        await transaction.commit();

        return res.json({
            message: 'Product variant deleted',
            data: variant
        });

    } catch (err) {
        await transaction.rollback();
        next(err);
    }
}

module.exports = {list, create, find, update, destroy};