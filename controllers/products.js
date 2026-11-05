const { Product, ProductVariant, Inventory } = require('../models/sql');
const { isSqlId, readBody, checkTypes, checkIds } = require('../utils/validation');

const pricePattern = /^\d{1,8}(\.\d{1,2})?$/;

const variantsInclude = {
  model: ProductVariant,
  as: 'variants',
  include: { model: Inventory, as: 'inventory' }
};

function readProductBody(body, creating = false) {
  const fields = ['categoryId', 'name', 'description', 'brand', 'price', 'active'];
  const required = creating ? ['categoryId', 'name', 'description', 'brand', 'price'] : [];
  const data = readBody(body, fields, required);

  checkTypes(data, ['name', 'description', 'brand'], 'string');
  checkTypes(data, ['active'], 'boolean');
  checkIds(data, ['categoryId']);

  for (const field of ['name', 'description', 'brand']) {
    if (Object.hasOwn(data, field)) data[field] = data[field].trim();
  }
  if (typeof data.price === 'string') data.price = data.price.trim();

  return data;
}

function productChanges(data) {
  const changes = { ...data };
  if (Object.hasOwn(changes, 'categoryId')) {
    changes.category_id = changes.categoryId;
    delete changes.categoryId;
  }
  return changes;
}

function productError(data, req) {
  if (Object.hasOwn(data, 'name') && !data.name) {
    return req.__('products.nameRequired');
  }
  if (Object.hasOwn(data, 'price') &&
      (!['number', 'string'].includes(typeof data.price) ||
       !pricePattern.test(String(data.price)))) {
    return req.__('products.invalidPrice');
  }
  return null;
}

function validId(req, res) {
  if (isSqlId(req.params.id)) return true;
  res.status(400).json({
    message: req.__('common.invalidId'), data: null
  });
  return false;
}

async function create(req, res, next) {
  try {
    const data = readProductBody(req.body, true);
    const error = productError(data, req);
    if (error) {
      return res.status(400).json({ message: error, data: null });
    }

    const product = await Product.create(productChanges(data));
    return res.status(201).json({
      message: req.__('products.created'), data: product
    });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const products = await Product.findAll({ include: variantsInclude });
    return res.json({
      message: req.__('products.list'), data: products
    });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const product = await Product.findByPk(Number(req.params.id), {
      include: variantsInclude
    });
    if (!product) {
      return res.status(404).json({
        message: req.__('products.notFound'), data: null
      });
    }

    return res.json({
      message: req.__('products.found'), data: product
    });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!validId(req, res)) return;
    const data = readProductBody(req.body);
    const error = productError(data, req);
    if (error) {
      return res.status(400).json({ message: error, data: null });
    }

    const product = await Product.findByPk(Number(req.params.id));
    if (!product) {
      return res.status(404).json({
        message: req.__('products.notFound'), data: null
      });
    }

    await product.update(productChanges(data));
    return res.json({
      message: req.__('products.updated'), data: product
    });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const product = await Product.findByPk(Number(req.params.id));
    if (!product) {
      return res.status(404).json({
        message: req.__('products.notFound'), data: null
      });
    }

    await product.destroy();
    return res.json({
      message: req.__('products.deleted'), data: product
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, find, update, destroy };