
const createError = require('http-errors');

const inventoryService = require('../services/inventory.service');

const {
  isSqlId,
  readBody,
  checkIds
} = require('../utils/validation');

const MAX_QUANTITY = 2147483647;

function readInventoryBody(body, creating = false) {
  const fields = creating
    ? ['variantId', 'stock', 'reserved']
    : ['stock', 'reserved'];

  const data = readBody(
    body,
    fields,
    creating ? ['variantId'] : []
  );

  checkIds(data, ['variantId']);

  for (const field of ['stock', 'reserved']) {
    if (
      Object.hasOwn(data, field) &&
      (
        !Number.isInteger(data[field]) ||
        data[field] > MAX_QUANTITY
      )
    ) {
      throw createError(400);
    }
  }

  return data;
}

function validId(req, res) {
  if (isSqlId(req.params.id)) {
    return true;
  }

  res.status(400).json({
    message: req.__('common.invalidId'),
    data: null
  });

  return false;
}

// GET /api/inventory
async function list(req, res, next) {
  try {
    const inventory = await inventoryService.listAll();

    return res.json({
      message: req.__('inventory.list'),
      data: inventory
    });
  } catch (err) {
    return next(err);
  }
}

// GET /api/inventory/:id
async function find(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const inventory = await inventoryService.findById(
      Number(req.params.id)
    );

    if (!inventory) {
      return res.status(404).json({
        message: req.__('inventory.notFound'),
        data: null
      });
    }

    return res.json({
      message: req.__('inventory.found'),
      data: inventory
    });
  } catch (err) {
    return next(err);
  }
}

// POST /api/inventory
async function create(req, res, next) {
  try {
    const data = readInventoryBody(req.body, true);

    const result = await inventoryService.createInventory(data);

    if (result.error) {
      return res.status(result.status).json({
        message: req.__(result.error),
        data: null
      });
    }

    return res.status(201).json({
      message: req.__('inventory.created'),
      data: result.inventory
    });
  } catch (err) {
    return next(err);
  }
}

// PUT /api/inventory/:id
async function update(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const data = readInventoryBody(req.body);

    const result = await inventoryService.updateById(
      Number(req.params.id),
      data
    );

    if (result.error) {
      return res.status(result.status).json({
        message: req.__(result.error),
        data: null
      });
    }

    return res.json({
      message: req.__('inventory.updated'),
      data: result.inventory
    });
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/inventory/:id
async function destroy(req, res, next) {
  try {
    if (!validId(req, res)) return;

    const inventory = await inventoryService.deleteInventory(
      Number(req.params.id)
    );

    if (!inventory) {
      return res.status(404).json({
        message: req.__('inventory.notFound'),
        data: null
      });
    }

    return res.json({
      message: req.__('inventory.deleted'),
      data: inventory
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  find,
  create,
  update,
  destroy
};