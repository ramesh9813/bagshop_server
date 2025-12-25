const Order = require('../models/Order');
const Cart = require('../models/Cart');
const generateEsewaSignature = require('../utils/esewaSignature');
const axios = require('axios');
const sendEmail = require('../utils/sendEmail');

// 1. Initiate eSewa Payment
exports.initiateEsewaPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // eSewa specific parameters
        // Ensure total_amount is a clean string (no decimals if whole number)
        const total_amount = Math.round(order.totalPrice).toString();
        const transaction_uuid = `${orderId}-${Date.now()}`;
        const product_code = (process.env.ESEWA_MERCHANT_ID || 'EPAYTEST').trim();

        const signature = generateEsewaSignature(total_amount, transaction_uuid, product_code);

        const formData = {
            amount: Math.round(order.itemsPrice).toString(),
            tax_amount: "0",
            total_amount: total_amount,
            transaction_uuid: transaction_uuid,
            product_code: product_code,
            product_service_charge: "0",
            product_delivery_charge: Math.round(order.shippingPrice).toString(),
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
            // Populate user to get email for sending receipt
            const order = await Order.findById(orderId).populate('user', 'email name');

            if (order) {
                order.paymentInfo.id = decodedData.ref_id;
                order.paymentInfo.status = "Succeeded";
                order.paidAt = Date.now();
                await order.save();

                // Clear User's Cart
                await Cart.findOneAndDelete({ user: order.user._id });

                // Send Order Summary Email
                try {
                    const message = `Payment Verified for Order: ${order._id}`;
                    const html = `
                        <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
                            <h2 style="color: #28a745; text-align: center;">Payment Successful!</h2>
                            <p>Hi ${order.user.name},</p>
                            <p>Thank you for your purchase. Your payment has been successfully verified.</p>
                            
                            <h3 style="border-bottom: 2px solid #ffc107; padding-bottom: 5px;">Order Summary</h3>
                            <p><strong>Order ID:</strong> ${order._id}</p>
                            <p><strong>Payment Method:</strong> eSewa</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                <thead>
                                    <tr style="background-color: #f8f9fa;">
                                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
                                        <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Qty</th>
                                        <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${order.orderItems.map(item => `
                                    <tr>
                                        <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
                                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">NRS ${item.price}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            
                            <div style="text-align: right; margin-top: 20px;">
                                <p>Subtotal: NRS ${order.itemsPrice}</p>
                                <p>Shipping: NRS ${order.shippingPrice}</p>
                                <h3 style="color: #333;">Total Paid: NRS ${order.totalPrice}</h3>
                            </div>
                            
                            <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #777;">
                                &copy; ${new Date().getFullYear()} BagShop. All rights reserved.
                            </p>
                        </div>
                    `;

                    await sendEmail({
                        email: order.user.email,
                        subject: 'Order Confirmation - Payment Successful',
                        message,
                        html
                    });
                } catch (emailError) {
                    console.error("Failed to send order confirmation email:", emailError);
                }

                return res.status(200).json({ success: true, message: "Payment Verified and Order Updated", order });
            }
        }

        res.status(400).json({ success: false, message: "Payment Verification Failed" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
