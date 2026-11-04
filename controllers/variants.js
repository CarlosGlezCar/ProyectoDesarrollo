const { Product, ProductVariant, Inventory, sequelize } = require('../models/relationals');

async function create(req, res, next) {
  let transaction;
  try {
    const { productId, sku, size, color, active } = req.body || {};
    if (typeof sku !== 'string' || !sku.trim()) {
      return res.status(400).json({ message: req.__('variants.skuRequired'), data: null });
    }
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: req.__('variants.productNotFound'), data: null });
    }

    transaction = await sequelize.transaction();
    const variant = await ProductVariant.create({
      product_id: productId, sku, size, color, active
    }, { transaction });
    await Inventory.create({
      variant_id: variant.id, stock: 0, reserved: 0
    }, { transaction });
    await transaction.commit();
    transaction = null;

    const createdVariant = await ProductVariant.findByPk(variant.id, {
      include: { model: Inventory, as: 'inventory' }
    });
    return res.status(201).json({ message: req.__('variants.created'), data: createdVariant });
  } catch (err) {
    if (transaction) await transaction.rollback();
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const variants = await ProductVariant.findAll({
      include: [
        { model: Product, as: 'product' },
        { model: Inventory, as: 'inventory' }
      ]
    });
    return res.json({ message: req.__('variants.list'), data: variants });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    const variant = await ProductVariant.findByPk(req.params.id, {
      include: [
        { model: Product, as: 'product' },
        { model: Inventory, as: 'inventory' }
      ]
    });
    if (!variant) {
      return res.status(404).json({ message: req.__('variants.notFound'), data: null });
    }
    return res.json({ message: req.__('variants.found'), data: variant });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const variant = await ProductVariant.findByPk(req.params.id);
    if (!variant) {
      return res.status(404).json({ message: req.__('variants.notFound'), data: null });
    }
    const { productId, sku, size, color, active } = req.body || {};
    if (sku !== undefined && (typeof sku !== 'string' || !sku.trim())) {
      return res.status(400).json({ message: req.__('variants.skuRequired'), data: null });
    }
    if (productId !== undefined && !(await Product.findByPk(productId))) {
      return res.status(404).json({ message: req.__('variants.productNotFound'), data: null });
    }
    await variant.update({
      product_id: productId ?? variant.product_id,
      sku: sku ?? variant.sku,
      size: size ?? variant.size,
      color: color ?? variant.color,
      active: active ?? variant.active
    });
    const updatedVariant = await ProductVariant.findByPk(req.params.id, {
      include: { model: Inventory, as: 'inventory' }
    });
    return res.json({ message: req.__('variants.updated'), data: updatedVariant });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const variant = await ProductVariant.findByPk(req.params.id, { transaction });
    if (!variant) {
      await transaction.rollback();
      transaction = null;
      return res.status(404).json({ message: req.__('variants.notFound'), data: null });
    }
    await Inventory.destroy({
      where: { variant_id: variant.id }, transaction
    });
    await variant.destroy({ transaction });
    await transaction.commit();
    transaction = null;
    return res.json({ message: req.__('variants.deleted'), data: variant });
  } catch (err) {
    if (transaction) await transaction.rollback();
    return next(err);
  }
}

module.exports = { list, create, find, update, destroy };
