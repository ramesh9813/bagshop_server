const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logout, updateProfile, deleteProfile, getUserDetails, getAllUsers, updatePassword, updateUserRole, verifyEmail, forgotPassword, resetPassword } = require('../controllers/userController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

router.route('/register').post(registerUser);
router.route('/verify-email/:token').get(verifyEmail);
router.route('/login').post(loginUser);
router.route('/password/forgot').post(forgotPassword);
router.route('/password/reset/:token').put(resetPassword);
router.route('/logout').get(logout);

router.route('/me').get(isAuthenticatedUser, getUserDetails);
router.route('/me/update').put(isAuthenticatedUser, updateProfile);
router.route('/password/update').put(isAuthenticatedUser, updatePassword);
router.route('/me/delete').delete(isAuthenticatedUser, deleteProfile);

router.route('/admin/users').get(isAuthenticatedUser, authorizeRoles("admin", "owner"), getAllUsers);
router.route('/admin/user/:id').put(isAuthenticatedUser, authorizeRoles("admin", "owner"), updateUserRole);

module.exports = router;