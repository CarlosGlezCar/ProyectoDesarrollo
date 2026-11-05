const { Product, ProductVariant, Inventory, sequelize } = require('../models/sql');
const { isSqlId, readBody, checkTypes, checkIds } = require('../utils/validation');

const variantIncludes = [
  { model: Product, as: 'product' },
  { model: Inventory, as: 'inventory' }
];

function readVariantBody(body, creating = false) {
  const fields = ['productId', 'sku', 'size', 'color', 'active'];
  const data = readBody(body, fields, creating ? ['productId', 'sku'] : []);

  checkTypes(data, ['sku'], 'string');
  checkTypes(data, ['active'], 'boolean');
  checkIds(data, ['productId']);

  for (const field of ['size', 'color']) {
    if (Object.hasOwn(data, field) && data[field] !== null) {
      checkTypes(data, [field], 'string');
    }
  }
  for (const field of ['sku', 'size', 'color']) {
    if (typeof data[field] === 'string') data[field] = data[field].trim();
  }

  return data;
}

function variantChanges(data) {
  const changes = { ...data };
  if (Object.hasOwn(changes, 'productId')) {
    changes.product_id = changes.productId;
    delete changes.productId;
  }
  return changes;
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
    const data = readVariantBody(req.body, true);
    if (!data.sku) {
      return res.status(400).json({
        message: req.__('variants.skuRequired'), data: null
      });
    }

    const product = await Product.findByPk(data.productId);
    if (!product) {
      return res.status(404).json({
        message: req.__('variants.productNotFound'), data: null
      });
    }

    const created = await ProductVariant.create(variantChanges(data));
    const variant = await created.reload({ include: variantIncludes });

    return res.status(201).json({
      message: req.__('variants.created'), data: variant
    });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const variants = await ProductVariant.findAll({
      include: variantIncludes
    });
    return res.json({
      message: req.__('variants.list'), data: variants
    });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const variant = await ProductVariant.findByPk(Number(req.params.id), {
      include: variantIncludes
    });
    if (!variant) {
      return res.status(404).json({
        message: req.__('variants.notFound'), data: null
      });
    }
    return res.json({
      message: req.__('variants.found'), data: variant
    });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!validId(req, res)) return;
    const data = readVariantBody(req.body);

    if (Object.hasOwn(data, 'sku') && !data.sku) {
      return res.status(400).json({
        message: req.__('variants.skuRequired'), data: null
      });
    }

    const result = await sequelize.transaction(async transaction => {
      const variant = await ProductVariant.findByPk(Number(req.params.id), {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!variant) return { error: 'variants.notFound' };

      if (Object.hasOwn(data, 'productId')) {
        const product = await Product.findByPk(data.productId, { transaction });
        if (!product) return { error: 'variants.productNotFound' };
      }

      await variant.update(variantChanges(data), { transaction });
      return {
        variant: await variant.reload({
          include: variantIncludes,
          transaction
        })
      };
    });

    if (result.error) {
      return res.status(404).json({
        message: req.__(result.error), data: null
      });
    }
    return res.json({
      message: req.__('variants.updated'), data: result.variant
    });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const variant = await sequelize.transaction(async transaction => {
      const found = await ProductVariant.findByPk(Number(req.params.id), { transaction });
      if (!found) return null;

      await Inventory.destroy({ where: { variant_id: found.id }, transaction });
      await found.destroy({ transaction });
      return found;
    });

    if (!variant) {
      return res.status(404).json({
        message: req.__('variants.notFound'), data: null
      });
    }
    return res.json({
      message: req.__('variants.deleted'), data: variant
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, find, update, destroy };