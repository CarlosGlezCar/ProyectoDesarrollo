const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        enum: ['shipping', 'billing']
    },
    street: { type: String, required: true, trim: true },
    number: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true }
}, {
    _id: false
});

const customerSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true,
        min: 1,
        max: 2147483647,
        validate: {
            validator: Number.isInteger
        }
    },
    phone: {
        type: String,
        trim: true,
        validate: {
            validator(value) {
                if (value === null || value === undefined) return true;

                const digits = value.replace(/\D/g, '');
                return /^\+?[\d ()-]+$/.test(value)
                    && digits.length >= 7
                    && digits.length <= 15;
            }
        }
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    addresses: {
        type: [addressSchema],
        required: true,
        default: [],
        set(value) {
            if (!Array.isArray(value)) {
                throw new mongoose.Error.CastError('Array', value, 'addresses');
            }
            return value;
        },
        validate: {
            validator(value) {
                return value.every(address => address !== null && address !== undefined);
            }
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);