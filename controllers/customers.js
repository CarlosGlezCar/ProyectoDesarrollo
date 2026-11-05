const mongoose = require('mongoose');
const { Customer } = require('../models/documents');

function validId(req, res) {
  if (mongoose.isValidObjectId(req.params.id)) return true;
  res.status(400).json({ message: req.__('common.invalidId'), data: null });
  return false;
}

async function create(req, res, next) {
  try {
    const customer = await Customer.create(req.body);
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
    const customer = await Customer.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!customer) {
      return res.status(404).json({
        message: req.__('customers.notFound'), data: null
      });
    }
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
