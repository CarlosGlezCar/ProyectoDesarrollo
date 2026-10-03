const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerId: {type: mongoose.Schema.Types.ObjectId, ref: 'Customer', require: true},
    totals: {
        subTotal: Number,
        shiping: Number,
        discount: Number,
        total: Number
    }
}, {timestamps: true});

module.exports = mongoose.model('Order', orderSchema);