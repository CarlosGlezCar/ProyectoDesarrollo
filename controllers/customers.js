const { isMongoId, readBody, checkTypes, checkIds } = require('../utils/validation');
const customerService = require('../services/customer.service');

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

async function create(req, res, next) {
  try {
    const data = readCustomerBody(req.body, true);
    const { customer, error } = await customerService.createCustomer(data);
    if (error) {
      return res.status(error.status).json({ message: req.__(error.key), data: null });
    }

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
    const customers = await customerService.listCustomers(filter);

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
    const customer = await customerService.findById(req.params.id);
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

    const { customer, error } = await customerService.updateCustomer(req.params.id, data);
    if (error) {
      return res.status(error.status).json({ message: req.__(error.key), data: null });
    }

    return res.json({ message: req.__('customers.updated'), data: customer });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const { customer, error } = await customerService.deleteCustomer(req.params.id);
    if (error) {
      return res.status(error.status).json({ message: req.__(error.key), data: null });
    }

    return res.json({ message: req.__('customers.deleted'), data: customer });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, find, update, destroy };
