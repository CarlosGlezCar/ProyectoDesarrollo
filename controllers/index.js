const { json } = require("express");
const { Product } = require('../models/relationals');

async function home(req, res) {
    const products = await Product.findAll();
    res.render('index', { title: 'Stride-co', products: products});
}

function healthCheck(req, res){
    res.status(200).json({
        status : "UP"
    });
}

module.exports = {home, healthCheck};