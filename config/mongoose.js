const mongoose = require('mongoose');

function connectMongo(){
    const url = "mongodb://localhost:27017/ProyectoDesarrollo";
    return mongoose.connect(url);
}

module.exports = connectMongo;