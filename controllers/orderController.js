const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");

// Create New Order
exports.newOrder = async (req, res, next) => {
    try {
        const {
            shippingInfo,
            paymentInfo,
            shippingPrice,
        } = req.body;

        const userId = req.user._id;

        // 1. Fetch User's Cart
        const cart = await Cart.findOne({ user: userId });

        if (!cart || cart.cartItems.length === 0) {
            return res.status(400).json({ success: false, message: "Your cart is empty" });
        }

        let calculatedItemsPrice = 0;
        const verifiedOrderItems = [];

        // 2. Verify products and calculate prices based on Cart Items
        for (const item of cart.cartItems) {
            const product = await Product.findById(item.product);
            
            if (!product) {
                return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.name}` });
            }

            // Deduct stock
            product.stock -= item.quantity;
            await product.save();

            const itemTotal = product.price * item.quantity;
            calculatedItemsPrice += itemTotal;

            verifiedOrderItems.push({
                product: product._id,
                name: product.name,
                price: product.price,
                image: product.imageUrl,
                quantity: item.quantity
            });
        }

        const totalPrice = calculatedItemsPrice + (Number(shippingPrice) || 0);

        // 3. Create the Order
        const order = await Order.create({
            shippingInfo,
            orderItems: verifiedOrderItems,
            paymentInfo,
            itemsPrice: calculatedItemsPrice,
            shippingPrice: Number(shippingPrice) || 0,
            totalPrice,
            user: userId,
        });

        // 4. Clear cart if COD
        if (paymentInfo && paymentInfo.method === 'COD') {
             await Cart.findOneAndDelete({ user: userId });
        }
        
        // await Cart.findOneAndDelete({ user: userId });

        res.status(201).json({
            success: true,
            order,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Single Order
exports.getSingleOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).populate("user", "name email");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found with this Id" });
        }

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Logged In User Orders
exports.myOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user._id });

        res.status(200).json({
            success: true,
            orders,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get All Orders (Admin)
exports.getAllOrders = async (req, res, next) => {
    try {
        const orders = await Order.find();

        let totalAmount = 0;
        orders.forEach((order) => {
            totalAmount += order.totalPrice;
        });

        res.status(200).json({
            success: true,
            totalAmount,
            orders,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Order Status (Admin)
exports.updateOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found with this Id" });
        }

        if (order.orderStatus === "Delivered") {
            return res.status(400).json({ success: false, message: "You have already delivered this order" });
        }

        order.orderStatus = req.body.status;

        if (req.body.status === "Delivered") {
            order.deliveredAt = Date.now();
        }

        await order.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Order (Admin)
exports.deleteOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found with this Id" });
        }

        await order.deleteOne();

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
