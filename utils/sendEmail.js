const nodemailer = require('nodemailer');
const axios = require('axios');

const normalizeEnvValue = (value) => {
    if (!value) return value;
    const trimmed = String(value).trim();
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
};

const sendEmail = async (options) => {
    console.log(`[Email] Attempting to send email to: ${options.email}`);

    const timeoutMs = Number(process.env.SMTP_TIMEOUT_MS) || 8000;
    const mailtrapToken = normalizeEnvValue(process.env.MAILTRAP_API_TOKEN);
    const mailtrapEndpoint =
        normalizeEnvValue(process.env.MAILTRAP_API_URL) || "https://send.api.mailtrap.io/api/send";
    const mailtrapFromEmail =
        normalizeEnvValue(process.env.MAILTRAP_FROM_EMAIL) || normalizeEnvValue(process.env.SMTP_FROM_EMAIL);
    const mailtrapFromName =
        normalizeEnvValue(process.env.MAILTRAP_FROM_NAME) || normalizeEnvValue(process.env.SMTP_FROM_NAME) || "BagShop Support";

    if (mailtrapToken) {
        if (!mailtrapFromEmail) {
            throw new Error("MAILTRAP_FROM_EMAIL or SMTP_FROM_EMAIL is required when using Mailtrap API");
        }

        const payload = {
            from: {
                email: mailtrapFromEmail,
                name: mailtrapFromName
            },
            to: [
                {
                    email: options.email
                }
            ],
            subject: options.subject,
            text: options.message,
            html: options.html
        };

        try {
            const response = await axios.post(mailtrapEndpoint, payload, {
                headers: {
                    Authorization: `Bearer ${mailtrapToken}`,
                    "Content-Type": "application/json"
                },
                timeout: timeoutMs
            });
            console.log(`[Email] Mailtrap API accepted: ${response.status}`);
            return;
        } catch (error) {
            const errorPayload = error.response?.data || error.message;
            console.error(`[Email] Mailtrap API failed:`, errorPayload);
            throw error;
        }
    }

    const transporter = nodemailer.createTransport({
        service: normalizeEnvValue(process.env.SMTP_SERVICE), // e.g., 'gmail'
        host: normalizeEnvValue(process.env.SMTP_HOST),
        port: normalizeEnvValue(process.env.SMTP_PORT),
        secure: normalizeEnvValue(process.env.SMTP_PORT) == 465, // true for 465, false for other ports
        connectionTimeout: timeoutMs,
        greetingTimeout: timeoutMs,
        socketTimeout: timeoutMs,
        auth: {
            user: normalizeEnvValue(process.env.SMTP_USER),
            pass: normalizeEnvValue(process.env.SMTP_PASS),
        },
    });

    const mailOptions = {
        from: `"${normalizeEnvValue(process.env.SMTP_FROM_NAME)}" <${normalizeEnvValue(process.env.SMTP_FROM_EMAIL)}>`,
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
