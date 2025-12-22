const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

exports.getAdminStats = async (req, res, next) => {
    try {
        const productsCount = await Product.countDocuments();
        const usersCount = await User.countDocuments();
        
        const orders = await Order.find();
        const ordersCount = orders.length;
        
        let totalSales = 0;
        orders.forEach(order => {
            totalSales += order.totalPrice;
        });

        res.status(200).json({
            success: true,
            productsCount,
            usersCount,
            ordersCount,
            totalSales
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};