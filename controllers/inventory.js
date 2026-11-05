const createError = require('http-errors');
const { Inventory, ProductVariant, Product, sequelize } = require('../models/sql');
const { isSqlId, readBody, checkIds } = require('../utils/validation');

const MAX_QUANTITY = 2147483647;

const variantInclude = {
  model: ProductVariant,
  as: 'variant',
  include: { model: Product, as: 'product' }
};

function readInventoryBody(body, creating = false) {
  const fields = creating ? ['variantId', 'stock', 'reserved'] : ['stock', 'reserved'];
  const data = readBody(body, fields, creating ? ['variantId'] : []);
  checkIds(data, ['variantId']);

  for (const field of ['stock', 'reserved']) {
    if (Object.hasOwn(data, field) &&
        (!Number.isInteger(data[field]) || data[field] > MAX_QUANTITY)) {
      throw createError(400);
    }
  }
  return data;
}

function balanceError(stock, reserved) {
  if (stock < 0) return 'inventory.stockNegative';
  if (reserved < 0) return 'inventory.reservedNegative';
  if (reserved > stock) return 'inventory.reservedExceedsStock';
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
    const data = readInventoryBody(req.body, true);
    const stock = data.stock ?? 0;
    const reserved = data.reserved ?? 0;
    const error = balanceError(stock, reserved);

    if (error) {
      return res.status(400).json({
        message: req.__(error), data: null
      });
    }

    const result = await sequelize.transaction(async transaction => {
      const variant = await ProductVariant.findByPk(data.variantId, { transaction });
      if (!variant) return { status: 404, error: 'inventory.variantNotFound' };

      const existing = await Inventory.findOne({
        where: { variant_id: data.variantId }, transaction
      });
      if (existing) return { status: 400, error: 'common.duplicate' };

      const created = await Inventory.create({
        variant_id: data.variantId, stock, reserved
      }, { transaction });

      return {
        inventory: await created.reload({ include: variantInclude, transaction })
      };
    });

    if (result.error) {
      return res.status(result.status).json({
        message: req.__(result.error), data: null
      });
    }
    return res.status(201).json({
      message: req.__('inventory.created'), data: result.inventory
    });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const inventory = await Inventory.findAll({ include: variantInclude });
    return res.json({
      message: req.__('inventory.list'), data: inventory
    });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const inventory = await Inventory.findByPk(Number(req.params.id), {
      include: variantInclude
    });
    if (!inventory) {
      return res.status(404).json({
        message: req.__('inventory.notFound'), data: null
      });
    }

    return res.json({
      message: req.__('inventory.found'), data: inventory
    });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!validId(req, res)) return;
    const data = readInventoryBody(req.body);

    const result = await sequelize.transaction(async transaction => {
      const inventory = await Inventory.findByPk(Number(req.params.id), {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!inventory) {
        return { status: 404, error: 'inventory.notFound' };
      }

      const stock = data.stock ?? inventory.stock;
      const reserved = data.reserved ?? inventory.reserved;
      const error = balanceError(stock, reserved);

      if (error) return { status: 400, error };

      await inventory.update(data, { transaction });
      return {
        inventory: await inventory.reload({
          include: variantInclude,
          transaction
        })
      };
    });

    if (result.error) {
      return res.status(result.status).json({
        message: req.__(result.error), data: null
      });
    }
    return res.json({
      message: req.__('inventory.updated'), data: result.inventory
    });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const inventory = await Inventory.findByPk(Number(req.params.id));
    if (!inventory) {
      return res.status(404).json({
        message: req.__('inventory.notFound'), data: null
      });
    }

    await inventory.destroy();
    return res.json({
      message: req.__('inventory.deleted'), data: inventory
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, find, create, update, destroy };