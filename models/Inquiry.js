const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: false
    },
    name: {
        type: String,
        required: [true, 'Please enter your name'],
        trim: true,
        maxLength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please enter a valid email address'
        ]
    },
    product: {
        type: String,
        required: false
    },
    subject: {
        type: String,
        required: [true, 'Please enter a subject'],
        maxLength: [200, 'Subject cannot exceed 200 characters']
    },
    message: {
        type: String,
        required: [true, 'Please enter your message']
    },
    image: {
        public_id: {
            type: String,
            required: false
        },
        url: {
            type: String,
            required: false
        }
    },
    status: {
        type: String,
        enum: ['New', 'In Progress', 'Resolved'],
        default: 'New'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Inquiry', inquirySchema);
