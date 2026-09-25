const { json } = require("express");

function home(req, res, next) {
    res.render('index', { title: 'Express' });
}

function healthCheck(req, res){
    req.status(200).json({
        status : "UP"
    });
}

module.exports = {home, healthCheck};