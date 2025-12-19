const express = require('express');
const { initiateEsewaPayment, verifyEsewaPayment } = require('../controllers/paymentController');
const { isAuthenticatedUser } = require('../middleware/auth');

const router = express.Router();

router.route('/payment/initiate').post(isAuthenticatedUser, initiateEsewaPayment);
router.route('/payment/verify').get(verifyEsewaPayment); // eSewa success_url usually appends data in query

module.exports = router;
