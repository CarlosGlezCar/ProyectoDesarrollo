const { Product, ProductVariant, Inventory } = require('../models/relationals');

const variantsInclude = {
  model: ProductVariant,
  as: 'variants',
  include: { model: Inventory, as: 'inventory' }
};

async function create(req, res, next) {
  try {
    const { categoryId, name, description, brand, price, active } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: req.__('products.nameRequired'), data: null });
    }
    if (price === undefined || price === null || price === '' ||
        !Number.isFinite(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ message: req.__('products.invalidPrice'), data: null });
    }
    const product = await Product.create({
      category_id: categoryId, name, description, brand, price, active
    });
    return res.status(201).json({ message: req.__('products.created'), data: product });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const products = await Product.findAll({ include: variantsInclude });
    return res.json({ message: req.__('products.list'), data: products });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id, { include: variantsInclude });
    if (!product) {
      return res.status(404).json({ message: req.__('products.notFound'), data: null });
    }
    return res.json({ message: req.__('products.found'), data: product });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: req.__('products.notFound'), data: null });
    }
    const { categoryId, name, description, brand, price, active } = req.body || {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ message: req.__('products.nameRequired'), data: null });
    }
    if (price !== undefined && (price === null || price === '' ||
        !Number.isFinite(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({ message: req.__('products.invalidPrice'), data: null });
    }
    await product.update({
      category_id: categoryId ?? product.category_id,
      name: name ?? product.name,
      description: description ?? product.description,
      brand: brand ?? product.brand,
      price: price ?? product.price,
      active: active ?? product.active
    });
    return res.json({ message: req.__('products.updated'), data: product });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: req.__('products.notFound'), data: null });
    }
    await product.destroy();
    return res.json({ message: req.__('products.deleted'), data: product });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, find, update, destroy };
