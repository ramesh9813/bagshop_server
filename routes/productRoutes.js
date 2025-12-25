const express = require('express');
const router = express.Router();
const { getProducts, createProduct, updateProduct, deleteProduct, searchProducts, createProductReview, getSingleProduct } = require('../controllers/productController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/products/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Define the paths
router.route('/products').get(getProducts);
router.route('/products/search').get(searchProducts);
router.route('/product/new').post(isAuthenticatedUser, authorizeRoles("admin", "owner"), upload.single('image'), createProduct);
router.route('/review').put(isAuthenticatedUser, createProductReview); 

router.route('/product/:id')
    .get(getSingleProduct)
    .put(isAuthenticatedUser, authorizeRoles("admin", "owner"), upload.single('image'), updateProduct)
    .delete(isAuthenticatedUser, authorizeRoles("admin", "owner"), deleteProduct);

module.exports = router;