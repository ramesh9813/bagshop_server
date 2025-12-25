const mongoose = require('mongoose');

const adminChatSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'New Conversation'
    },
    settings: {
        provider: { type: String, default: 'openai' },
        model: { type: String, default: 'openai/gpt-3.5-turbo' },
        collectionName: { type: String, default: 'Products' }
    },
    messages: [
        {
            type: { 
                type: String, 
                enum: ['user', 'bot'], 
                required: true 
            },
            text: { type: String, required: true },
            modelName: { type: String }, // To store which model replied
            timestamp: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('AdminChatSession', adminChatSchema);
