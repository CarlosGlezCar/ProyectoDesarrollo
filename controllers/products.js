const { Product, ProductVariant, Inventory } = require('../models/relationals');

//CREATE
async function create(req, res, next) {
    try {
        const { categoryId, name, description, brand, price, active } = req.body;

        const product = await Product.create({
            category_id: categoryId,
            name,
            description,
            brand,
            price,
            active
        });

        res.status(201).json({
            message: req.__('products.created'),
            data: product
        });
    } catch (err) {
        next(err);
    }
}

//READ ALL
async function list(req, res, next) {
    try {
        const products = await Product.findAll({
            include: {
                model: ProductVariant,
                as: 'variants',
                include: {
                    model: Inventory,
                    as: 'inventory'
                }
            }
        });

        res.json({
            message: req.__('products.list'),
            data: products
        });

    } catch (err) {
        next(err);
    }
}

// READ BY ID
async function find(req, res, next) {
    try {
        const id = req.params.id;
        const product = await Product.findByPk(id, {
            include: {
                model: ProductVariant,
                as: 'variants',
                include: {
                    model: Inventory,
                    as: 'inventory'
                }
            }
        });

        if (!product) {
            return res.status(404).json({
                message: req.__('products.notFound')
            });
        }

        res.json({
            message: req.__('products.found'),
            data: product
        });

    } catch (err) {
        next(err);
    }
}

//UPDATE
async function update(req, res, next) {
    try {
        const id = req.params.id;
        const { categoryId, name, description, brand, price, active } = req.body;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                message: req.__('products.notFound')
            });
        }

        const changes = {
            category_id: categoryId ?? product.category_id,
            name: name ?? product.name,
            description: description ?? product.description,
            brand: brand ?? product.brand,
            price: price ?? product.price,
            active: active ?? product.active
        };

        await product.update(changes);

        res.json({
            message: req.__('products.updated'),
            data: product
        });

    } catch (err) {
        next(err);
    }
}

//DELETE
async function destroy(req, res, next) {
    try {
        const id = req.params.id;
        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({
                message: req.__('products.notFound')
            });
        }

        await product.destroy();

        res.json({
            message: req.__('products.deleted'),
            data: product
        });

    } catch (err) {
        next(err);
    }
}

module.exports = {create, list, find, update, destroy};