const express = require('express');
const router = express.Router();
const { 
    getAllSessions, 
    getSessionDetails, 
    createSession, 
    saveChat, 
    deleteSession 
} = require('../controllers/adminChatController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

// All routes are protected for 'owner' only
router.use(isAuthenticatedUser, authorizeRoles('owner'));

router.route('/admin/chat/sessions').get(getAllSessions);
router.route('/admin/chat/session/new').post(createSession);
router.route('/admin/chat/session/:id')
    .get(getSessionDetails)
    .delete(deleteSession);

router.route('/admin/chat/save').post(saveChat);

module.exports = router;