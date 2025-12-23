const express = require('express');
const router = express.Router();
const { createInquiry, getAllInquiries } = require('../controllers/inquiryController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

router.route('/inquiry/new').post(createInquiry);

// Admin routes
router.route('/admin/inquiries').get(isAuthenticatedUser, authorizeRoles('admin'), getAllInquiries);

module.exports = router;
