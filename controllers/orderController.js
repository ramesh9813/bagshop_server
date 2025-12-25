const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const logActivity = require("../utils/activityLogger");
const sendEmail = require("../utils/sendEmail");

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
            console.log("Order Error: Cart is empty for user", userId);
            return res.status(400).json({ success: false, message: "Your cart is empty" });
        }

        let calculatedItemsPrice = 0;
        const verifiedOrderItems = [];

        // 2. First Pass: Verify ALL items and stock without saving
        for (const item of cart.cartItems) {
            const product = await Product.findById(item.product);
            
            if (!product) {
                return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
            }

            if (product.stock < item.quantity) {
                console.log(`Order Error: Insufficient stock for ${product.name}. Requested: ${item.quantity}, Available: ${product.stock}`);
                return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.name}` });
            }

            calculatedItemsPrice += product.price * item.quantity;

            verifiedOrderItems.push({
                product: product._id,
                name: product.name,
                price: product.price,
                image: product.imageUrl,
                quantity: item.quantity
            });
        }

        // 3. Second Pass: Deduct stock after all items verified
        for (const item of cart.cartItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: {
                    stock: -item.quantity,
                    soldCount: item.quantity
                }
            }, { validateBeforeSave: false });
        }

        const totalPrice = calculatedItemsPrice + (Number(shippingPrice) || 0);

        // 4. Create the Order
        const order = await Order.create({
            shippingInfo,
            orderItems: verifiedOrderItems,
            paymentInfo,
            itemsPrice: calculatedItemsPrice,
            shippingPrice: Number(shippingPrice) || 0,
            totalPrice,
            user: userId,
        });

        // 5. Clear cart if COD (or always clear if order created successfully)
        await Cart.findOneAndDelete({ user: userId });

        // 6. Send Order Confirmation Email
        try {
            const message = `Order Confirmed: ${order._id}`;
            const html = `
                <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
                    <h2 style="color: #28a745; text-align: center;">Order Confirmed!</h2>
                    <p>Hi ${req.user.name},</p>
                    <p>Thank you for your order. We are processing it now.</p>
                    
                    <h3 style="border-bottom: 2px solid #ffc107; padding-bottom: 5px;">Order Summary</h3>
                    <p><strong>Order ID:</strong> ${order._id}</p>
                    <p><strong>Payment Method:</strong> ${order.paymentInfo.method}</p>
                    <p><strong>Status:</strong> ${order.paymentInfo.status}</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Qty</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.orderItems.map(item => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">NRS ${item.price}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div style="text-align: right; margin-top: 20px;">
                        <p>Subtotal: NRS ${order.itemsPrice}</p>
                        <p>Shipping: NRS ${order.shippingPrice}</p>
                        <h3 style="color: #333;">Total Amount: NRS ${order.totalPrice}</h3>
                    </div>
                    
                    <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #777;">
                        &copy; ${new Date().getFullYear()} BagShop. All rights reserved.
                    </p>
                </div>
            `;

            await sendEmail({
                email: req.user.email,
                subject: 'Order Confirmation - BagShop',
                message,
                html
            });
        } catch (emailError) {
            console.error("Failed to send order confirmation email:", emailError);
        }

        res.status(201).json({
            success: true,
            order,
        });
    } catch (error) {
        console.error("Order Creation Exception:", error);
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

        const oldStatus = order.orderStatus;
        order.orderStatus = req.body.status;

        if (req.body.status === "Delivered") {
            order.deliveredAt = Date.now();
        }

        await order.save({ validateBeforeSave: false });

        // Log Activity
        await logActivity(req.user, "UPDATE_STATUS", "Order", order._id, `Updated order status from ${oldStatus} to ${req.body.status}`);

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

        const orderId = order._id;
        await order.deleteOne();

        // Log Activity
        await logActivity(req.user, "DELETE", "Order", orderId, `Deleted order: ${orderId}`);

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Check if user has purchased the product
exports.checkProductPurchase = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        // Find any order by this user that contains the product and is NOT Cancelled
        // We accept Processing, Shipped, or Delivered.
        const order = await Order.findOne({
            user: userId,
            "orderItems.product": productId,
            orderStatus: { $in: ['Processing', 'Shipped', 'Delivered'] }
        });

        if (order) {
            return res.status(200).json({
                success: true,
                hasPurchased: true
            });
        }

        res.status(200).json({
            success: true,
            hasPurchased: false
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
