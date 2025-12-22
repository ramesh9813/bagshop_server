const express = require('express');
const { addToCart, getCart, removeItemFromCart, updateCartItemQuantity } = require('../controllers/cartController');
const { isAuthenticatedUser } = require('../middleware/auth');

const router = express.Router();

router.route('/cart/add').post(isAuthenticatedUser, addToCart);
router.route('/cart').get(isAuthenticatedUser, getCart);
router.route('/cart/update').put(isAuthenticatedUser, updateCartItemQuantity);
router.route('/cart/remove/:productId').delete(isAuthenticatedUser, removeItemFromCart);

module.exports = router;
