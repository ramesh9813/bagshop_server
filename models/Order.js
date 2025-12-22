const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    shippingInfo: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        phoneNo: { type: String, required: true },
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    orderItems: [
        {
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true },
            image: { type: String, required: true },
            product: {
                type: mongoose.Schema.ObjectId,
                ref: 'Product',
                required: true
            },
        }
    ],
    paymentInfo: {
        id: { type: String }, // Transaction ID from eSewa
        status: { type: String, default: "Pending" },
        method: { type: String, default: "eSewa" }
    },
    itemsPrice: { type: Number, default: 0 },
    shippingPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    orderStatus: {
        type: String,
        required: true,
        default: 'Processing'
    },
    paidAt: Date,
    deliveredAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
