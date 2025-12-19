const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logout, updateProfile, deleteProfile, getUserDetails, getAllUsers } = require('../controllers/userController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/logout').get(logout);

router.route('/me').get(isAuthenticatedUser, getUserDetails);
router.route('/me/update').put(isAuthenticatedUser, updateProfile);
router.route('/me/delete').delete(isAuthenticatedUser, deleteProfile);

router.route('/admin/users').get(isAuthenticatedUser, authorizeRoles("admin"), getAllUsers);

module.exports = router;