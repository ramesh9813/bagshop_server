const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, "Please enter product name"], 
        trim: true 
    },
    description: { 
        type: String, 
        required: [true, "Please enter product description"] 
    },
    
    price: { 
        type: Number, 
        required: [true, "Please enter product price"] 
    },
    category: { 
        type: String, 
        required: [true, "Please select category"],
        enum: ['Men', 'Women', 'Children'] // Enforces your project specific categories
    },
    size: { 
        type: String, 
        required: [true, "Please specify size"] 
    },
    imageUrl: { 
        type: String, 
        required: [true, "Please upload product image"] 
    },
    stock: { 
        type: Number, 
        required: [true, "Please enter stock quantity"],
        default: 1 
    },
    
    // REVIEWS SECTION
    reviews: [
        {
            user: {
                type: mongoose.Schema.ObjectId,
                ref: 'User',
                required: true
            },
            name: { type: String, required: true },
            rating: { type: Number, required: true, min: 1, max: 5 },
            comment: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    
    // Summary data
    ratings: { type: Number, default: 0 },
    numOfReviews: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },

    // Reference to the Admin who created this product
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    }
}, { 
    // This automatically creates 'createdAt' (Created Date) 
    // and 'updatedAt' (Modified Date)
    timestamps: true 
});

module.exports = mongoose.model('Product', productSchema);