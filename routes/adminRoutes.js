const express = require('express');
const router = express.Router();
const { getAdminStats } = require('../controllers/adminController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

router.route('/admin/stats').get(isAuthenticatedUser, authorizeRoles("admin"), getAdminStats);

module.exports = router;