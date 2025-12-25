const AdminChat = require('../models/AdminChat');

// Get All Chat Sessions (Titles only)
exports.getAllSessions = async (req, res, next) => {
    try {
        const sessions = await AdminChat.find({ user: req.user.id })
            .select('title createdAt updatedAt')
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            sessions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Single Session Details
exports.getSessionDetails = async (req, res, next) => {
    try {
        const chat = await AdminChat.findOne({ 
            _id: req.params.id,
            user: req.user.id 
        });

        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat session not found" });
        }

        res.status(200).json({
            success: true,
            chat
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create New Session
exports.createSession = async (req, res, next) => {
    try {
        const chat = await AdminChat.create({
            user: req.user.id,
            title: 'New Conversation',
            messages: [{ 
                type: 'bot', 
                text: 'Hello! I am your store AI assistant. How can I help you analyze your business today?', 
                modelName: 'System' 
            }]
        });

        res.status(201).json({
            success: true,
            chat
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Save Chat Message & Settings to a specific Session
exports.saveChat = async (req, res, next) => {
    try {
        const { sessionId, settings, message, title } = req.body;
        
        const chat = await AdminChat.findOne({ _id: sessionId, user: req.user.id });

        if (!chat) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        // Update settings if provided
        if (settings) {
            chat.settings = { ...chat.settings, ...settings };
        }

        // Update title if provided (e.g., auto-summary)
        if (title) {
            chat.title = title;
        }

        // Add message if provided
        if (message) {
            chat.messages.push(message);
        }

        await chat.save();

        res.status(200).json({
            success: true,
            chat
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Session
exports.deleteSession = async (req, res, next) => {
    try {
        const chat = await AdminChat.findOneAndDelete({ 
            _id: req.params.id,
            user: req.user.id 
        });

        if (!chat) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        res.status(200).json({
            success: true,
            message: "Chat session deleted"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};