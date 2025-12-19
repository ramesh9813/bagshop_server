const crypto = require('crypto');

/**
 * Generates eSewa signature for payment initiation and verification.
 * Documentation: total_amount,transaction_uuid,product_code
 */
const generateEsewaSignature = (total_amount, transaction_uuid, product_code) => {
    const data = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    
    const secretKey = process.env.ESEWA_SECRET_KEY;
    
    const hash = crypto
        .createHmac('sha256', secretKey)
        .update(data)
        .digest('base64');
        
    return hash;
};

module.exports = generateEsewaSignature;
