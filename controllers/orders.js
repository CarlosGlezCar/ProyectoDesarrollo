const mongoose = require('mongoose');
const { Order } = require('../models/documents');

function validId(req, res) {
  if (mongoose.isValidObjectId(req.params.id)) return true;
  res.status(400).json({ message: req.__('common.invalidId'), data: null });
  return false;
}

async function create(req, res, next) {
  try {
    const order = await Order.create(req.body);
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
    const orders = await Order.find().populate('customerId');
    return res.json({ message: req.__('orders.list'), data: orders });
  } catch (err) {
    return next(err);
  }
}

async function find(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const order = await Order.findById(req.params.id).populate('customerId');
    if (!order) {
      return res.status(404).json({
        message: req.__('orders.notFound'), data: null
      });
    }
    return res.json({ message: req.__('orders.found'), data: order });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({
        message: req.__('orders.notFound'), data: null
      });
    }
    return res.json({ message: req.__('orders.updated'), data: order });
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  if (!validId(req, res)) return;
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({
        message: req.__('orders.notFound'), data: null
      });
    }
    return res.json({ message: req.__('orders.deleted'), data: order });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, find, update, destroy };
