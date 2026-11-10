const { Order, Customer } = require('../models/mongo');
const { User, Product } = require('../models/sql');
const { isMongoId, isPositiveInteger, readBody } = require('../utils/validation');

const CREATE_FIELDS = [
  'customerId', 'salesPersonId', 'paymentMethod',
  'totals', 'shippingAddress', 'items'
];
const UPDATE_FIELDS = ['paymentMethod', 'shippingAddress', 'status', 'note'];
const STATUSES = Order.schema.path('statusHistory').schema.path('status').enumValues;

function validId(req, res) {
  if (isMongoId(req.params.id)) return true;
  res.status(400).json({ message: req.__('common.invalidId'), data: null });
  return false;
}

function reply(req, res, status, key) {
  return res.status(status).json({ message: req.__(key), data: null });
}

// Comprueba que el cliente (MongoDB), el vendedor y los productos (PostgreSQL) existan.
async function checkReferences(data) {
  if (!isMongoId(data.customerId)) {
    return { status: 400, key: 'common.invalidId' };
  }
  if (!(await Customer.exists({ _id: data.customerId }))) {
    return { status: 404, key: 'orders.customerNotFound' };
  }

  if (!isPositiveInteger(data.salesPersonId)) {
    return { status: 400, key: 'common.invalidData' };
  }
  const seller = await User.findByPk(data.salesPersonId);
  if (!seller || !seller.active) {
    return { status: 404, key: 'users.notFound' };
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    return { status: 400, key: 'orders.emptyItems' };
  }
  const productIds = [];
  for (const item of data.items) {
    if (!item || typeof item !== 'object' || !isPositiveInteger(item.productId)) {
      return { status: 400, key: 'common.invalidData' };
    }
    productIds.push(item.productId);
  }
  const uniqueIds = [...new Set(productIds)];
  const found = await Product.count({ where: { id: uniqueIds } });
  if (found !== uniqueIds.length) {
    return { status: 404, key: 'products.notFound' };
  }

  return null;
}

async function create(req, res, next) {
  try {
    const data = readBody(req.body, CREATE_FIELDS, CREATE_FIELDS);
    const error = await checkReferences(data);
    if (error) return reply(req, res, error.status, error.key);

    // El historial lo genera la API: estado inicial y usuario que creó la orden.
    const order = await Order.create({
      ...data,
      statusHistory: [{ status: 'pending', changedById: req.user.id }]
    });
    await order.populate('customerId');

    return res.status(201).json({
      message: req.__('orders.created'),
      data: order
    });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const filter = req.ownershipFilter || {};
    const orders = await Order.find(filter).populate('customerId');
    return res.json({ message: req.__('orders.list'), data: orders });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const order = await Order.findById(req.params.id).populate('customerId');
    if (!order) return reply(req, res, 404, 'orders.notFound');
    return res.json({ message: req.__('orders.found'), data: order });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const data = readBody(req.body, UPDATE_FIELDS);

    if (Object.hasOwn(data, 'status') && !STATUSES.includes(data.status)) {
      return reply(req, res, 400, 'orders.invalidStatus');
    }
    if (Object.hasOwn(data, 'note') &&
        (!Object.hasOwn(data, 'status') || typeof data.note !== 'string')) {
      return reply(req, res, 400, 'common.invalidData');
    }

    const order = await Order.findById(req.params.id);
    if (!order) return reply(req, res, 404, 'orders.notFound');

    if (Object.hasOwn(data, 'paymentMethod')) order.paymentMethod = data.paymentMethod;
    if (Object.hasOwn(data, 'shippingAddress')) order.shippingAddress = data.shippingAddress;
    if (Object.hasOwn(data, 'status')) {
      // Cada cambio de estado queda en el historial con quién lo hizo y cuándo.
      order.statusHistory.push({
        status: data.status,
        changedById: req.user.id,
        note: data.note
      });
    }

    await order.save();
    await order.populate('customerId');
    return res.json({ message: req.__('orders.updated'), data: order });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return reply(req, res, 404, 'orders.notFound');
    return res.json({ message: req.__('orders.deleted'), data: order });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, find, update, destroy };
