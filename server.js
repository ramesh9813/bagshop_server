const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const mongoose = require('mongoose');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const requestLogger = require('./middleware/requestLogger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json()); // Allows you to read JSON data sent from frontend
app.use(cookieParser());
app.use(requestLogger);

// Serve Static Files (Uploads)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/v1', productRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1', orderRoutes);
app.use('/api/v1', cartRoutes);
app.use('/api/v1', paymentRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1', inquiryRoutes);

// Connect to MongoDB
mongoose.connect(process.env.DB_URI)
    .then(() => console.log("Database Connected"))
    .catch(err => console.log(err));

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


