const Product = require('../models/Product');

// 1. Create a New Product (Admin only logic will be added later)
exports.createProduct = async (req, res) => {
    console.log("Request received: User is attempting to create a new product.");
    console.log("Request Headers Content-Type:", req.headers['content-type']);
    console.log("Posting product data:", req.body);

    try {
        if (!req.body) {
             throw new Error("Request body is empty. Make sure you are sending JSON and Content-Type is application/json");
        }

        // TEMPORARY: Assign a default 'createdBy' ID if not provided, for testing purposes
        if (!req.body.createdBy) {
            req.body.createdBy = "64f1a2b3c4d5e6f7a8b9c0d1"; 
        }

        // Check if product with same name already exists
        const existingProduct = await Product.findOne({ name: req.body.name });
        if (existingProduct) {
             throw new Error("Product with this name already exists");
        }

        const product = await Product.create(req.body);
        console.log("Success: Product added to database with ID:", product._id);
        res.status(201).json({
            success: true,
            product
        });
    } catch (error) {
        console.error("Error: Failed to add product.", error.message);
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
                    rev.rating = rating;
                    rev.comment = comment;
                }
            });
        } else {
            product.reviews.push(review);
            product.numOfReviews = product.reviews.length;
        }

        let avg = 0;
        product.reviews.forEach((rev) => {
            avg += rev.rating;
        });

        product.ratings = avg / product.reviews.length;

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

        product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
            useFindAndModify: false
        });

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

        await product.deleteOne();

        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};