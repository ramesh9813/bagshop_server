const User = require('../models/User');
const logActivity = require('../utils/activityLogger');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Helper to send Token
const sendToken = (user, statusCode, res) => {
    const token = user.getJWTToken();

    // options for cookie
    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
    };

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        user,
        token,
    });
};

// Register a User
exports.registerUser = async (req, res, next) => {
    try {
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
            user.verificationToken = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ success: false, message: "Registration successful but failed to send verification email. Please contact support." });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify Email
exports.verifyEmail = async (req, res, next) => {
    try {
        const user = await User.findOne({
            verificationToken: req.params.token
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired verification token" });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        sendToken(user, 200, res);

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Login User
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // checking if user has given password and email both
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please Enter Email and Password" });
        }

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        if (!user.isVerified) {
            return res.status(401).json({ success: false, message: "Please verify your email to log in" });
        }

        const isPasswordMatched = await user.comparePassword(password);

        if (!isPasswordMatched) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        sendToken(user, 200, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Logout User
exports.logout = async (req, res, next) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: "Logged Out",
    });
};

// Get User Details
exports.getUserDetails = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Password
exports.updatePassword = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("+password");

        const { oldPassword, newPassword, confirmPassword } = req.body;

        const isMatched = await user.comparePassword(oldPassword);

        if (!isMatched) {
            return res.status(400).json({ success: false, message: "Old Password is Incorrect" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Password does not match" });
        }

        user.password = newPassword;
        await user.save();

        sendToken(user, 200, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update User Profile
exports.updateProfile = async (req, res, next) => {
    try {
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
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete User Profile
exports.deleteProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
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
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get All Users (Admin)
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find();

        res.status(200).json({
            success: true,
            users,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update User Role (Admin)
exports.updateUserRole = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
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
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
