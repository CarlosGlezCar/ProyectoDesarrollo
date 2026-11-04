const mongoose = require('mongoose');
const config = require('config');

async function connectMongo() {
    try {
        const uri = config.get('database.mongo.uri');

        await mongoose.connect(uri);

        console.log('MongoDB Atlas conectado correctamente');
    } catch (error) {
        console.error(
        'Error al conectar con MongoDB:',
        error.message
        );

        throw error;
    }
}

module.exports = connectMongo;
