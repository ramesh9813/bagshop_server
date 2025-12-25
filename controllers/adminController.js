const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

exports.getAdminStats = async (req, res, next) => {
    try {
        const productsCount = await Product.countDocuments();
        const usersCount = await User.countDocuments();
        const criticalItemsCount = await Product.countDocuments({ stock: { $lt: 5 } });
        
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
            totalSales,
            criticalItemsCount
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
        const { range } = req.query;
        let dateFilter = {};

        if (range && range !== 'all') {
            const now = new Date();
            let start = new Date();
            
            if (range === 'today') start.setHours(0, 0, 0, 0);
            else if (range === 'week') start.setDate(now.getDate() - 7);
            else if (range === 'month') start.setMonth(now.getMonth() - 1);
            else if (range === 'year') start.setFullYear(now.getFullYear() - 1);
            
            dateFilter = { createdAt: { $gte: start } };
        }

        const orders = await Order.find(dateFilter).sort({ createdAt: 1 });
        
        // Group by category sales
        const categorySales = await Order.aggregate([
            { $match: dateFilter }, // Filter first
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