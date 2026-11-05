const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    userId: Number,
    phone: String,
    email: String,

    addresses : [
        {
            type: { type: String, enum: ['SHIPING', 'BILING', ], required: true},
            street: String,
            number: String,
            city: String,
            state: String,
            zipCode: String,
            country: String
        }
    ]
}, {
    timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);
