const Product = require('../models/Product');
const logActivity = require('../utils/activityLogger');

// 1. Create a New Product (Admin only logic will be added later)
exports.createProduct = async (req, res) => {
    try {
        if (!req.body) {
             throw new Error("Request body is empty.");
        }

        // Handle File Upload
        if (req.file) {
            req.body.imageUrl = `${req.protocol}://${req.get('host')}/uploads/products/${req.file.filename}`;
        }

        // TEMPORARY: Assign a default 'createdBy' ID if not provided
        if (!req.body.createdBy) {
            req.body.createdBy = req.user?._id || "64f1a2b3c4d5e6f7a8b9c0d1"; 
        }

        // Check if product with same name already exists
        const existingProduct = await Product.findOne({ name: req.body.name });
        if (existingProduct) {
             throw new Error("Product with this name already exists");
        }

        const product = await Product.create(req.body);
        
        // Log Activity
        await logActivity(req.user, "CREATE", "Product", product._id, `Created product: ${product.name}`);

        res.status(201).json({
            success: true,
            product
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 2. Get All Products (For the Homepage)
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2.1 Get Single Product Details
exports.getSingleProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            product
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Search Products
exports.searchProducts = async (req, res) => {
    try {
        const { keyword } = req.query;
        
        if (!keyword) {
             return res.status(400).json({ success: false, message: "Please provide a keyword to search" });
        }

        const searchRegex = new RegExp(keyword, 'i'); // 'i' makes it case insensitive

        // 1. Priority Search: Check Title (Name) first
        const productsByName = await Product.find({ name: searchRegex });

        if (productsByName.length > 0) {
            return res.status(200).json({
                success: true,
                count: productsByName.length,
                products: productsByName
            });
        }

        // 2. Secondary Search: Check Description if no title match
        const productsByDesc = await Product.find({ description: searchRegex });

        res.status(200).json({
            success: true,
            count: productsByDesc.length,
            products: productsByDesc
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Create/Update Review
exports.createProductReview = async (req, res) => {
    try {
        const { rating, comment, productId } = req.body;

        if (!comment) {
            return res.status(400).json({ success: false, message: "Comment is required for a review" });
        }

        const review = {
            user: req.user._id,
            name: req.user.name,
            rating: Number(rating),
            comment,
        };

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const isReviewed = product.reviews.find(
            (rev) => rev.user.toString() === review.user.toString()
        );

        if (isReviewed) {
            product.reviews.forEach((rev) => {
                if (rev.user.toString() === review.user.toString()) {
                    if (Number(rating) > 0) {
                         rev.rating = rating;
                    }
                    rev.comment = comment;
                }
            });
        } else {
            product.reviews.push(review);
            product.numOfReviews = product.reviews.length;
        }

        // Recalculate Average Rating (Only count reviews with rating > 0)
        let avg = 0;
        let ratedReviewsCount = 0;
        
        product.reviews.forEach((rev) => {
            if (rev.rating > 0) {
                avg += rev.rating;
                ratedReviewsCount++;
            }
        });

        // Avoid division by zero
        product.ratings = ratedReviewsCount > 0 ? avg / ratedReviewsCount : 0;

        await product.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: "Review added successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Update Product (Admin)
exports.updateProduct = async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Handle File Upload
        if (req.file) {
            req.body.imageUrl = `${req.protocol}://${req.get('host')}/uploads/products/${req.file.filename}`;
        }

        product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
            useFindAndModify: false
        });

        // Log Activity
        await logActivity(req.user, "UPDATE", "Product", product._id, `Updated product: ${product.name}`);

        res.status(200).json({
            success: true,
            product
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Delete Product (Admin)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const productName = product.name;
        const productId = product._id;
        await product.deleteOne();

        // Log Activity
        await logActivity(req.user, "DELETE", "Product", productId, `Deleted product: ${productName}`);

        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};