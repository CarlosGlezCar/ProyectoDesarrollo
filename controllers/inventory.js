const { Inventory, ProductVariant, Product } = require('../models/relationals');

const variantInclude = {
  model: ProductVariant,
  as: 'variant',
  include: { model: Product, as: 'product' }
};

async function list(req, res, next) {
  try {
    const inventory = await Inventory.findAll({ include: variantInclude });
    return res.json({ message: req.__('inventory.list'), data: inventory });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  try {
    const inventory = await Inventory.findByPk(req.params.id, { include: variantInclude });
    if (!inventory) {
      return res.status(404).json({ message: req.__('inventory.notFound'), data: null });
    }
    return res.json({ message: req.__('inventory.found'), data: inventory });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const inventory = await Inventory.findByPk(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: req.__('inventory.notFound'), data: null });
    }
    const { stock, reserved } = req.body || {};
    if (stock !== undefined && !Number.isInteger(stock)) {
      return res.status(400).json({ message: req.__('common.invalidData'), data: null });
    }
    if (reserved !== undefined && !Number.isInteger(reserved)) {
      return res.status(400).json({ message: req.__('common.invalidData'), data: null });
    }
    if (stock !== undefined && stock < 0) {
      return res.status(400).json({ message: req.__('inventory.stockNegative'), data: null });
    }
    if (reserved !== undefined && reserved < 0) {
      return res.status(400).json({ message: req.__('inventory.reservedNegative'), data: null });
    }
    const newStock = stock ?? inventory.stock;
    const newReserved = reserved ?? inventory.reserved;
    if (newReserved > newStock) {
      return res.status(400).json({
        message: req.__('inventory.reservedExceedsStock'), data: null
      });
    }
    await inventory.update({ stock: newStock, reserved: newReserved });
    return res.json({ message: req.__('inventory.updated'), data: inventory });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, find, update };
