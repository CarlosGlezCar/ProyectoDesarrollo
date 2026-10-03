const { Customer } = require('../models/documents');

//CREATE
async function create(req, res, next){
    const customer = await Customer.create(req.body);
    res.status(201).json({
        message: "Add a new customer",
        data: customer
    });
}

//READ
async function list(req, res, next) {
    const customers = await Customer.find();
    res.json({
        message: "Show customer list",
        data: customer
    });
}

async function find(req, res, next){
    const customer = await Customer.findById(req.params.id);
    res.json({
        message: "Find customer by id",
        data: customer
    });
}

//UPDATE
async function update(req, res, next){
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {new: true, runValidators: true});
    if(!customer) res.status(404).json({message: 'Customer not found'});
    res.json({
        message: "Update customer info",
        data: customer
    });
}

//DELETE
async function destroy(req, res, next){
    const customr = await Customer.findByIdAndDelete();
    res.json({
        message: "Remove a customer",
        data: customer
    });
}

module.exports = {list, create, find, update, destroy};