const { Inventory, ProductVariant, Product } = require('../models/relationals');

// READ ALL
async function list(req, res, next) {
    try {
        const inventory = await Inventory.findAll({
            include: {
                model: ProductVariant,
                as: 'variant',
                include: {
                    model: Product,
                    as: 'product'
                }
            }
        });

        return res.json({
            message: 'Inventory list',
            data: inventory
        });

    } catch (err) {
        next(err);
    }
}


// READ BY ID
async function find(req, res, next) {
    try {
        const id = req.params.id;

        const inventory = await Inventory.findByPk(id, {
            include: {
                model: ProductVariant,
                as: 'variant',
                include: {
                    model: Product,
                    as: 'product'
                }
            }
        });

        if (!inventory) {
            return res.status(404).json({
                message: 'Inventory not found',
                data: null
            });
        }

        return res.json({
            message: 'Inventory found',
            data: inventory
        });

    } catch (err) {
        next(err);
    }
}

// UPDATE
async function update(req, res, next) {
    try {
        const id = req.params.id;

        const inventory = await Inventory.findByPk(id);

        if (!inventory) {
            return res.status(404).json({
                message: 'Inventory not found',
                data: null
            });
        }

        const { stock, reserved } = req.body;

        // Evitar valores negativos
        if (stock !== undefined && stock < 0) {
            return res.status(400).json({
                message: 'Stock cannot be negative',
                data: null
            });
        }

        if (reserved !== undefined && reserved < 0) {
            return res.status(400).json({
                message: 'Reserved cannot be negative',
                data: null
            });
        }

        const newStock = stock ?? inventory.stock;
        const newReserved = reserved ?? inventory.reserved;

        // No reservar más productos de los que existen
        if (newReserved > newStock) {
            return res.status(400).json({
                message: 'Reserved stock cannot be greater than stock',
                data: null
            });
        }

        await inventory.update({
            stock: newStock,
            reserved: newReserved
        });

        return res.json({
            message: 'Inventory updated',
            data: inventory
        });

    } catch (err) {
        next(err);
    }
}
module.exports = {list, find, update};