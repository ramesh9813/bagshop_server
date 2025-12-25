const express = require('express');
const router = express.Router();
const { createInquiry, getAllInquiries, getSingleInquiry, updateInquiry } = require('../controllers/inquiryController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

router.route('/inquiry/new').post(createInquiry);

// Admin routes
router.route('/admin/inquiries').get(isAuthenticatedUser, authorizeRoles('admin', 'owner'), getAllInquiries);
router.route('/admin/inquiry/:id')
    .get(isAuthenticatedUser, authorizeRoles('admin', 'owner'), getSingleInquiry)
    .put(isAuthenticatedUser, authorizeRoles('admin', 'owner'), updateInquiry);

module.exports = router;
