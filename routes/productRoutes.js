const express = require('express');
const router = express.Router();
const { getProducts, createProduct, updateProduct, deleteProduct, searchProducts, createProductReview, getSingleProduct } = require('../controllers/productController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

// Define the paths
router.route('/products').get(getProducts);
router.route('/products/search').get(searchProducts);
router.route('/product/new').post(isAuthenticatedUser, authorizeRoles("admin", "owner"), createProduct);
router.route('/review').put(isAuthenticatedUser, createProductReview); 

router.route('/product/:id')
    .get(getSingleProduct)
    .put(isAuthenticatedUser, authorizeRoles("admin", "owner"), updateProduct)
    .delete(isAuthenticatedUser, authorizeRoles("admin", "owner"), deleteProduct);

module.exports = router;