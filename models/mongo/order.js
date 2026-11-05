const mongoose = require('mongoose');

function positiveInteger() {
    return {
        type: Number,
        required: true,
        min: 1,
        max: 2147483647,
        validate: { validator: Number.isInteger }
    };
}

function toCents(value) {
    const text = String(value);
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;

    const [whole, fraction = ''] = text.split('.');
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function money(defaultValue) {
    return {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: defaultValue,
        validate: { validator: value => toCents(value) !== null }
    };
}

function nonEmptyList(schema, path) {
    return {
        type: [schema],
        required: true,
        default: [],
        set(value) {
            if (!Array.isArray(value)) {
                throw new mongoose.Error.CastError('Array', value, path);
            }
            return value;
        },
        validate: {
            validator: value => value.length > 0 && value.every(item => item != null)
        }
    };
}

const totalsSchema = new mongoose.Schema({
    subtotal: money(),
    shipping: money('0'),
    discount: money('0'),
    total: money()
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
    street: { type: String, required: true, trim: true },
    number: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true }
}, { _id: false });

const itemSchema = new mongoose.Schema({
    productId: positiveInteger(),
    quantity: positiveInteger(),
    unitPrice: money()
}, { _id: false });

const statusSchema = new mongoose.Schema({
    status: {
        type: String,
        required: true,
        enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled']
    },
    changedById: positiveInteger(),
    changedAt: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    salesPersonId: positiveInteger(),
    paymentMethod: {
        type: String,
        required: true,
        enum: ['cash', 'card', 'transfer']
    },
    totals: { type: totalsSchema, required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    items: nonEmptyList(itemSchema, 'items'),
    statusHistory: nonEmptyList(statusSchema, 'statusHistory')
}, {
    timestamps: true,
    toJSON: {
        transform(document, data) {
            if (data.totals) {
                for (const field of ['subtotal', 'shipping', 'discount', 'total']) {
                    if (data.totals[field] != null) {
                        data.totals[field] = data.totals[field].toString();
                    }
                }
            }
            for (const item of data.items || []) {
                if (item && item.unitPrice != null) {
                    item.unitPrice = item.unitPrice.toString();
                }
            }
            return data;
        }
    }
});

orderSchema.pre('validate', function () {
    if (!this.totals) return;

    const amounts = ['subtotal', 'shipping', 'discount', 'total']
        .map(field => toCents(this.totals[field]));
    if (amounts.includes(null)) return;

    const [subtotal, shipping, discount, total] = amounts;
    if (total !== subtotal + shipping - discount) {
        this.invalidate('totals.total', 'El total no coincide con los importes.');
    }

    let itemsSubtotal = 0n;
    for (const item of this.items || []) {
        if (!item || !Number.isInteger(item.quantity) || item.quantity < 1) return;

        const price = toCents(item.unitPrice);
        if (price === null) return;

        itemsSubtotal += price * BigInt(item.quantity);
    }
    if (subtotal !== itemsSubtotal) {
        this.invalidate('totals.subtotal', 'El subtotal no coincide con los productos.');
    }
});

module.exports = mongoose.model('Order', orderSchema);