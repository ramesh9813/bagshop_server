const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Inquiry = require('../models/Inquiry');
const axios = require('axios');

exports.askGPT = async (req, res) => {
    try {
        const { question, model, collection } = req.body;

        if (!question) {
            return res.status(400).json({ success: false, message: "Please provide a question" });
        }

        const selectedModel = model || "openai/gpt-3.5-turbo";
        const targetCollection = collection || "Products";

        // 1. Fetch live context based on selection
        let dataContext = "";
        
        if (targetCollection === "Products") {
            const data = await Product.find();
            dataContext = data.map(p => `- Product: ${p.name}, Price: NRS ${p.price}, Cat: ${p.category}, Stock: ${p.stock}, Sold: ${p.soldCount || 0}`).join('\n');
        } else if (targetCollection === "Orders") {
            const data = await Order.find().limit(20); // Limit to recent 20 for context safety
            dataContext = data.map(o => `- OrderID: ${o._id}, Total: NRS ${o.totalPrice}, Status: ${o.orderStatus}, Items: ${o.orderItems.length}`).join('\n');
        } else if (targetCollection === "Users") {
            const data = await User.find().select("-password");
            dataContext = data.map(u => `- User: ${u.name}, Email: ${u.email}, Role: ${u.role}`).join('\n');
        } else if (targetCollection === "Inquiries") {
            const data = await Inquiry.find().limit(20);
            dataContext = data.map(i => `- From: ${i.name}, Subject: ${i.subject}, Msg: ${i.message.substring(0, 50)}...`).join('\n');
        }

        const systemPrompt = `You are a helpful business assistant for 'BagShop'. 
        You are currently analyzing the ${targetCollection} database.
        Here is the data context:
        ${dataContext}
        
        Answer the owner's questions accurately based strictly on this data.`;

        // 2. Call OpenRouter API
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: selectedModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: question }
            ]
        }, {
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        const answer = response.data.choices[0].message.content;

        res.status(200).json({
            success: true,
            answer
        });

    } catch (error) {
        console.error("OpenRouter Error:", error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: error.response?.data?.error?.message || "Failed to communicate with AI" 
        });
    }
};
