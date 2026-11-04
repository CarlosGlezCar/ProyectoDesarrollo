const { Customer } = require('../models/documents');

//CREATE
async function create(req, res, next){
    const customer = await Customer.create(req.body);
    res.status(201).json({
        message: req.__('customers.created'),
        data: customer
    });
}

//READ
async function list(req, res, next) {
    const customer = await Customer.find();
    res.json({
        message: req.__('customers.list'),
        data: customer
    });
}

async function find(req, res, next){
    const customer = await Customer.findById(req.params.id);
    res.json({
        message: req.__('customers.found'),
        data: customer
    });
}

//UPDATE
async function update(req, res, next){
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {new: true, runValidators: true});
    if(!customer) {
    return res.status(404).json({message: req.__('customers.notFound')});
    }
    res.json({
        message: req.__('customers.updated'),
        data: customer
    });
}

//DELETE
async function destroy(req, res, next){
    const customer = await Customer.findByIdAndDelete(req.params.id);
    res.json({
        message: req.__('customers.deleted'),
        data: customer
    });
}

module.exports = {list, create, find, update, destroy};