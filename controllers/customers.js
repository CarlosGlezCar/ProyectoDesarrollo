const { Customer } = require('../models/mongo');
const { User } = require('../models/sql');
const { isMongoId, readBody, checkTypes, checkIds } = require('../utils/validation');

const FIELDS = ['userId', 'phone', 'email', 'addresses'];

function validId(req, res) {
  if (isMongoId(req.params.id)) return true;
  res.status(400).json({ message: req.__('common.invalidId'), data: null });
  return false;
}

function readCustomerBody(body, creating = false) {
  const data = readBody(body, FIELDS, creating ? ['userId', 'email'] : []);

  checkIds(data, ['userId']);
  checkTypes(data, ['email'], 'string');
  if (Object.hasOwn(data, 'phone') && data.phone !== null) {
    checkTypes(data, ['phone'], 'string');
  }
  if (typeof data.email === 'string') {
    data.email = data.email.trim().toLowerCase();
  }

  return data;
}

// Comprueba que el usuario exista en PostgreSQL y que no se repitan userId ni email.
async function checkReferences(data, currentId = null) {
  const others = currentId ? { _id: { $ne: currentId } } : {};

  if (Object.hasOwn(data, 'userId')) {
    if (!(await User.findByPk(data.userId))) {
      return { status: 404, key: 'users.notFound' };
    }
    if (await Customer.findOne({ ...others, userId: data.userId })) {
      return { status: 400, key: 'common.duplicate' };
    }
  }

  if (Object.hasOwn(data, 'email') &&
      await Customer.findOne({ ...others, email: data.email })) {
    return { status: 400, key: 'customers.emailExists' };
  }

  return null;
}

async function create(req, res, next) {
  try {
    const data = readCustomerBody(req.body, true);
    const error = await checkReferences(data);
    if (error) {
      return res.status(error.status).json({ message: req.__(error.key), data: null });
    }

    const customer = await Customer.create(data);
    return res.status(201).json({
      message: req.__('customers.created'),
      data: customer
    });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const filter = req.ownershipFilter || {};
    const customers = await Customer.find(filter);

    return res.json({
      message: req.__('customers.list'),
      data: customers
    });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        message: req.__('customers.notFound'), data: null
      });
    }
    return res.json({ message: req.__('customers.found'), data: customer });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const data = readCustomerBody(req.body);

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        message: req.__('customers.notFound'), data: null
      });
    }

    const error = await checkReferences(data, customer._id);
    if (error) {
      return res.status(error.status).json({ message: req.__(error.key), data: null });
    }

    customer.set(data);
    await customer.save();
    return res.json({ message: req.__('customers.updated'), data: customer });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({
        message: req.__('customers.notFound'), data: null
      });
    }
    return res.json({ message: req.__('customers.deleted'), data: customer });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, find, update, destroy };
