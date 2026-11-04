const mongoose = require('mongoose');
const config = require('config');

function connectMongo() {
    const uri = config.get('database.mongo.uri');
    return mongoose.connect(uri);
}

module.exports = connectMongo;
