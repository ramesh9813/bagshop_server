const AuditLog = require('../models/AuditLog');

const logActivity = async (user, action, targetType, targetId, details = "") => {
    try {
        await AuditLog.create({
            user: user._id,
            action,
            targetType,
            targetId,
            details
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
};

module.exports = logActivity;
