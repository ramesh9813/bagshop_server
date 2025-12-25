const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

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

// 2. Get Audit Logs (Owner only logic in routes)
exports.getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .populate('user', 'name email role')
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json({
            success: true,
            logs
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get Detailed Analytics
exports.getDetailedAnalytics = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: 1 });
        
        // Group by category sales
        const categorySales = await Order.aggregate([
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderItems.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: "$productInfo.category",
                    totalSales: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
                    totalQuantity: { $sum: "$orderItems.quantity" }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            categorySales,
            allOrders: orders
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};