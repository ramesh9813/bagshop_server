const express = require('express');
const router = express.Router();
const { getProducts, createProduct, updateProduct, deleteProduct, searchProducts, createProductReview, getSingleProduct } = require('../controllers/productController');

// Define the paths
router.route('/products').get(getProducts);
router.route('/products/search').get(searchProducts);
router.route('/product/new').post(createProduct);
router.route('/review').put(createProductReview); // Review route
router.route('/product/:id')
    .get(getSingleProduct)
    .put(updateProduct)
    .delete(deleteProduct);

module.exports = router;