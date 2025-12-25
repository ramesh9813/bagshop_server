const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    console.log(`[Email] Attempting to send email to: ${options.email}`);
    
    const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE, // e.g., 'gmail'
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Success! Message sent: ${info.messageId}`);
    } catch (error) {
        console.error(`[Email] Failed to send email:`, error.message);
        throw error; // Re-throw so the controller knows it failed
    }
};

module.exports = sendEmail;
