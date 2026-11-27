const { isMongoId, readBody } = require('../utils/validation');
const orderService = require('../services/order.service');

const CREATE_FIELDS = [
  'customerId', 'salesPersonId', 'paymentMethod',
  'totals', 'shippingAddress', 'items'
];
const UPDATE_FIELDS = ['paymentMethod', 'shippingAddress', 'status', 'note'];
const STATUSES = orderService.ORDER_STATUSES;

function validId(req, res) {
  if (isMongoId(req.params.id)) return true;
  res.status(400).json({ message: req.__('common.invalidId'), data: null });
  return false;
}

function reply(req, res, status, key) {
  return res.status(status).json({ message: req.__(key), data: null });
}

async function create(req, res, next) {
  try {
    const data = readBody(req.body, CREATE_FIELDS, CREATE_FIELDS);
    const { order, error } = await orderService.createApiOrder(data, req.user.id);
    if (error) return reply(req, res, error.status, error.key);

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

    const orders = await orderService.listOrders(filter);

    return res.json({
      message: req.__('orders.list'),
      data: orders
    });

  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const order = await orderService.findAdminOrder(req.params.id);
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

    const { order, error } = await orderService.updateApiOrder(req.params.id, data, req.user.id);
    if (error) return reply(req, res, error.status, error.key);

    return res.json({ message: req.__('orders.updated'), data: order });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const { order, error } = await orderService.deleteApiOrder(req.params.id);
    if (error) return reply(req, res, error.status, error.key);

    return res.json({ message: req.__('orders.deleted'), data: order });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, find, update, destroy };
