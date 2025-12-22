const crypto = require('crypto');

/**
 * Generates eSewa signature for payment initiation and verification.
 * Documentation: total_amount,transaction_uuid,product_code
 */
const generateEsewaSignature = (total_amount, transaction_uuid, product_code) => {
    // Ensure inputs are strings and trimmed
    const safeTotalAmount = String(total_amount).trim();
    const safeUuid = String(transaction_uuid).trim();
    const safeProductCode = String(product_code).trim();

    const data = `total_amount=${safeTotalAmount},transaction_uuid=${safeUuid},product_code=${safeProductCode}`;
    
    const secretKey = process.env.ESEWA_SECRET_KEY;
    
    // Debugging logs
    console.log("------- eSewa Signature Debug -------");
    console.log("Data String:", `"${data}"`);
    console.log("Secret Key:", `"${secretKey}"`);
    console.log("Key Length:", secretKey ? secretKey.length : 0);
    console.log("-------------------------------------");

    if (!secretKey) {
        throw new Error("ESEWA_SECRET_KEY is missing in environment variables");
    }
    
    const hash = crypto
        .createHmac('sha256', secretKey)
        .update(data)
        .digest('base64');
        
    return hash;
};

module.exports = generateEsewaSignature;