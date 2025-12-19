const Order = require('../models/Order');
const generateEsewaSignature = require('../utils/esewaSignature');
const axios = require('axios');

// 1. Initiate eSewa Payment
exports.initiateEsewaPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // eSewa specific parameters
        const total_amount = order.totalPrice.toString();
        const transaction_uuid = `${orderId}-${Date.now()}`; // Unique for each attempt
        const product_code = process.env.ESEWA_MERCHANT_ID;

        const signature = generateEsewaSignature(total_amount, transaction_uuid, product_code);

        const formData = {
            amount: order.itemsPrice.toString(),
            tax_amount: "0",
            total_amount: total_amount,
            transaction_uuid: transaction_uuid,
            product_code: product_code,
            product_service_charge: "0",
            product_delivery_charge: order.shippingPrice.toString(),
            success_url: process.env.ESEWA_SUCCESS_URL,
            failure_url: process.env.ESEWA_FAILURE_URL,
            signed_field_names: "total_amount,transaction_uuid,product_code",
            signature: signature,
        };

        res.status(200).json({
            success: true,
            payment_url: process.env.ESEWA_INITIATE_URL,
            formData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Verify eSewa Payment
exports.verifyEsewaPayment = async (req, res) => {
    try {
        const { encodedData } = req.query; // eSewa returns data in 'data' param (base64)
        
        // Decoding the response from eSewa
        const decodedString = Buffer.from(encodedData, 'base64').toString('ascii');
        const decodedData = JSON.parse(decodedString);

        // eSewa returns: status, total_amount, transaction_uuid, product_code, ref_id, etc.
        if (decodedData.status !== 'COMPLETE') {
            return res.status(400).json({ success: false, message: "Payment not completed" });
        }

        // Verify with eSewa Status API for extra security
        const verificationUrl = `${process.env.ESEWA_VERIFY_URL}?product_code=${decodedData.product_code}&total_amount=${decodedData.total_amount}&transaction_uuid=${decodedData.transaction_uuid}`;
        
        const response = await axios.get(verificationUrl);

        if (response.data.status === 'COMPLETE') {
            // Update Order
            const orderId = decodedData.transaction_uuid.split('-')[0];
            const order = await Order.findById(orderId);

            if (order) {
                order.paymentInfo.id = decodedData.ref_id;
                order.paymentInfo.status = "Succeeded";
                order.paidAt = Date.now();
                await order.save();

                return res.status(200).json({ success: true, message: "Payment Verified and Order Updated", order });
            }
        }

        res.status(400).json({ success: false, message: "Payment Verification Failed" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
