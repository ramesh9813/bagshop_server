const Inquiry = require('../models/Inquiry');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for local storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/inquiries');
        // Ensure directory exists
        if (!fs.existsSync(uploadPath)){
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'));
    }
}).single('image');

// Create new inquiry
exports.createInquiry = async (req, res) => {
    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        try {
            const { name, email, product, subject, message, user } = req.body;

            const inquiryData = {
                name,
                email,
                product,
                subject,
                message,
                user: user ? user : undefined // Link to user if provided
            };

            if (req.file) {
                // Construct URL for the uploaded file
                // Assuming server serves 'uploads' directory statically
                const fileUrl = `${req.protocol}://${req.get('host')}/uploads/inquiries/${req.file.filename}`;
                
                inquiryData.image = {
                    public_id: req.file.filename, // Using filename as ID for local storage
                    url: fileUrl
                };
            }

            const inquiry = await Inquiry.create(inquiryData);

            res.status(201).json({
                success: true,
                message: "Inquiry submitted successfully",
                inquiry
            });

        } catch (error) {
            console.error("Error creating inquiry:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    });
};

// Get all inquiries (Admin)
exports.getAllInquiries = async (req, res) => {
    try {
        const inquiries = await Inquiry.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            inquiries
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single inquiry details (Admin)
exports.getSingleInquiry = async (req, res) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({ success: false, message: "Inquiry not found" });
        }

        res.status(200).json({
            success: true,
            inquiry
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update inquiry status (Admin)
exports.updateInquiry = async (req, res) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({ success: false, message: "Inquiry not found" });
        }

        if (req.body.status) {
            inquiry.status = req.body.status;
        }

        await inquiry.save();

        res.status(200).json({
            success: true,
            message: "Inquiry updated successfully",
            inquiry
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
