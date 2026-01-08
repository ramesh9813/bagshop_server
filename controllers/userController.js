const User = require('../models/User');
const logActivity = require('../utils/activityLogger');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');

// Helper to send Token
const sendToken = (user, statusCode, res) => {
    const token = user.getJWTToken();

    // options for cookie
    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: true, // Always true for cross-site (Render)
        sameSite: 'none', // Allow cross-site cookie
    };

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        user,
        token,
    });
};

// Register a User
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
    const { name, email, password } = req.body;

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    const user = await User.create({
        name,
        email,
        password,
        avatar: {
            public_id: "sample_id",
            url: "profilepicUrl"
        },
        verificationToken
    });

    // Construct Verification URL
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    const message = `Welcome to BagShop, ${name}!\n\nPlease verify your account by clicking the link below:\n\n${verifyUrl}\n\nIf you did not request this, please ignore this email.`;

    const html = `
        <h1>Welcome to BagShop!</h1>
        <p>Hi ${name},</p>
        <p>Thank you for registering. Please click the button below to verify your email address:</p>
        <a href="${verifyUrl}" style="background-color: #ffc107; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
        <p>Or copy and paste this link: ${verifyUrl}</p>
    `;

    try {
        await sendEmail({
            email: user.email,
            subject: 'BagShop Account Verification',
            message,
            html
        });

        res.status(201).json({
            success: true,
            message: `Email sent to: ${user.email}. Please verify your account.`
        });

    } catch (emailError) {
        try {
            await user.deleteOne();
        } catch (cleanupError) {
            console.error(`[Register] Failed to remove user after email error: ${cleanupError.message}`);
        }
        return next(new ErrorHandler("Registration failed: could not send verification email. Please try again.", 503));
    }
});

// Verify Email
exports.verifyEmail = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findOne({
        verificationToken: req.params.token
    });

    if (!user) {
        return next(new ErrorHandler("Invalid or expired verification token", 400));
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    sendToken(user, 200, res);
});

// Login User
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    // checking if user has given password and email both
    if (!email || !password) {
        return next(new ErrorHandler("Please Enter Email and Password", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
        return next(new ErrorHandler("Invalid email or password", 401));
    }

    if (!user.isVerified) {
        return next(new ErrorHandler("Please verify your email to log in", 401));
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid email or password", 401));
    }

    sendToken(user, 200, res);
});

// Forgot Password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    // Get Reset Password Token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

    const message = `Your password reset token is:\n\n${resetUrl}\n\nIf you have not requested this email then, please ignore it.`;

    const html = `
        <h1>Password Reset Request</h1>
        <p>Hi ${user.name},</p>
        <p>You requested a password reset. Please click the button below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        <p>Or copy and paste this link: ${resetUrl}</p>
        <p>This link is valid for 15 minutes.</p>
    `;

    try {
        await sendEmail({
            email: user.email,
            subject: `BagShop Password Recovery`,
            message,
            html
        });

        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully`,
        });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        return next(new ErrorHandler(error.message, 500));
    }
});

// Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
    // Creating token hash
    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    const user = await User.findOne({
        resetPasswordToken: resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        return next(new ErrorHandler("Reset Password Token is invalid or has been expired", 400));
    }

    if (req.body.password !== req.body.confirmPassword) {
        return next(new ErrorHandler("Password does not match", 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendToken(user, 200, res);
});

// Logout User
exports.logout = catchAsyncErrors(async (req, res, next) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        secure: true,
        sameSite: 'none',
    });

    res.status(200).json({
        success: true,
        message: "Logged Out",
    });
});

// Get User Details
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        user,
    });
});

// Update Password
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id).select("+password");

    const { oldPassword, newPassword, confirmPassword } = req.body;

    const isMatched = await user.comparePassword(oldPassword);

    if (!isMatched) {
        return next(new ErrorHandler("Old Password is Incorrect", 400));
    }

    if (newPassword !== confirmPassword) {
        return next(new ErrorHandler("Password does not match", 400));
    }

    user.password = newPassword;
    await user.save();

    sendToken(user, 200, res);
});

// Update User Profile
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
    };

    if (req.body.shippingInfo) {
        newUserData.shippingInfo = req.body.shippingInfo;
    }

    // We use req.user.id which comes from the auth middleware
    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
        user,
    });
});

// Delete User Profile
exports.deleteProfile = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    await user.deleteOne();

    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: "User Deleted Successfully",
    });
});

// Get All Users (Admin)
exports.getAllUsers = catchAsyncErrors(async (req, res, next) => {
    const users = await User.find();

    res.status(200).json({
        success: true,
        users,
    });
});

// Update User Role (Admin)
exports.updateUserRole = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    const oldRole = user.role;
    const newRole = req.body.role;

    user.role = newRole;
    await user.save();

    // Log Activity
    await logActivity(req.user, "CHANGE_ROLE", "User", user._id, `Changed ${user.name}'s role from ${oldRole} to ${newRole}`);

    res.status(200).json({
        success: true,
        message: "User Role Updated Successfully",
    });
});
