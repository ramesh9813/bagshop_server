const express = require('express');
const router = express.Router();
const { getAdminStats, getAuditLogs, getDetailedAnalytics } = require('../controllers/adminController');
const { askGPT } = require('../controllers/llmController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

router.route('/admin/stats').get(isAuthenticatedUser, authorizeRoles("admin", "owner"), getAdminStats);
router.route('/admin/logs').get(isAuthenticatedUser, authorizeRoles("owner"), getAuditLogs);
router.route('/admin/analytics').get(isAuthenticatedUser, authorizeRoles("owner"), getDetailedAnalytics);
router.route('/admin/ask-gpt').post(isAuthenticatedUser, authorizeRoles("admin", "owner"), askGPT);

module.exports = router;