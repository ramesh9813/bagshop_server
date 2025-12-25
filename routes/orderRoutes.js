const express = require("express");
const { newOrder, getSingleOrder, myOrders, getAllOrders, updateOrder, deleteOrder, checkProductPurchase, cancelOrder } = require("../controllers/orderController");
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

router.route("/order/new").post(isAuthenticatedUser, newOrder);
router.route("/order/:id").get(isAuthenticatedUser, getSingleOrder);
router.route("/orders/me").get(isAuthenticatedUser, myOrders);
router.route("/order/cancel/:id").put(isAuthenticatedUser, cancelOrder);
router.route("/order/check-purchase/:productId").get(isAuthenticatedUser, checkProductPurchase);

// Admin routes
router.route("/admin/orders").get(isAuthenticatedUser, authorizeRoles("admin", "owner"), getAllOrders);
router.route("/admin/order/:id")
    .put(isAuthenticatedUser, authorizeRoles("admin", "owner"), updateOrder)
    .delete(isAuthenticatedUser, authorizeRoles("admin", "owner"), deleteOrder);

module.exports = router;
