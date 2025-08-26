const mongoose = require('mongoose');

const firmSchema = new mongoose.Schema({
    firmName: {
        type: String,
        required: true,
        unique: true
    },
    area: {
        type: String,
        required: true,
    },
    category: {
        type: [String], // This allows an array of strings
        enum: ['veg', 'non-veg'] // Enum for category values
    },
    region: {
        type: [String], // This allows an array of strings
        enum: ['south-indian', 'north-indian', 'chinese', 'bakery'] // Enum for region values
    },
    offer: {
        type: String,
    },
    image: {
        type: String
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }]
});

const Firm = mongoose.model('Firm', firmSchema);

module.exports = Firm;
