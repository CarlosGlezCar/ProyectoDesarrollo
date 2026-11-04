const { Order } = require('../models/documents');

//CREATE
async function create(req, res, next){
    const order = await Order.create(req.body);
    res.status(201).json({
        message: req.__('orders.created'),
        data: order
    });
}

async function find(req, res, next){
    const order = await Order.findById(req.params.id);
    res.json({
        message: req.__('orders.found'),
        data: order
    });
}

//UPDATE
async function update(req, res, next){
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        req.body,
        {new: true, runValidators: true}
    );

    if(!order) {
        return res.status(404).json({message: req.__('orders.notFound')});
    }

    res.json({
        message: req.__('orders.statusUpdated'),
        data: order
    });
}

//DELETE
async function destroy(req, res, next){
    const order = await Order.findByIdAndDelete(req.params.id);

    res.json({
        message: req.__('orders.deleted'),
        data: order
    });
}

module.exports = {create, find, update, destroy};