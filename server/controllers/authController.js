const crypto = require('crypto');
const User = require('../models/User');
const Settings = require('../models/Settings');
const PendingUser = require('../models/PendingUser');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');


// @desc    Register a new user (Create PendingUser)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, phone, role } = req.body;

    const settings = await Settings.findOne();
    if (settings && settings.registrationOpen === false) {
        return res.status(403).json({ message: 'New registrations are currently closed.' });
    }

    // Check if user already exists in MAIN User table
    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if there is already a pending registration for this email
    const pendingUserExists = await PendingUser.findOne({ email });

    if (pendingUserExists) {
        // Update existing pending user
        // Note: PendingUser model has a pre-save hook that hashes the password
        pendingUserExists.name = name;
        pendingUserExists.password = password;
        pendingUserExists.phone = phone;
        pendingUserExists.role = role || 'author';
        pendingUserExists.verificationCode = verificationCode;
        pendingUserExists.createdAt = Date.now(); // Reset TTL
        await pendingUserExists.save();
    } else {
        // Create new pending user
        // Note: Password will be hashed by PendingUser pre-save hook
        await PendingUser.create({
            name,
            email,
            password,
            phone,
            role: role || 'author',
            verificationCode
        });
    }

    try {
        await sendEmail({
            email,
            subject: 'CIETM 2026 - Email Verification',
            message: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #6366f1;">Welcome to CIETM 2026!</h2>
                    <p>Hello ${name},</p>
                    <p>Thank you for registering. Please verify your email to complete your account creation.</p>
                    <p>Your verification code is:</p>
                    <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <h1 style="color: #6366f1; font-size: 32px; letter-spacing: 8px; margin: 0;">${verificationCode}</h1>
                    </div>
                    <p>This code will expire in 1 hour.</p>
                </div>
            `
        });
        res.status(201).json({
            message: 'Verification code sent to your email. Please verify to complete registration.'
        });
    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({ message: 'Failed to send verification email' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
        if (!user.isEmailVerified) {
            return res.status(401).json({ message: 'Please verify your email first', isUnverified: true, email: user.email });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            department: user.department,
            college: user.college,
            delegateId: user.delegateId,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            department: user.department,
            college: user.college,
            delegateId: user.delegateId
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.department = req.body.department || user.department;
        user.college = req.body.college || user.college;
        
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            phone: updatedUser.phone,
            department: updatedUser.department,
            college: updatedUser.college,
            delegateId: updatedUser.delegateId,
            token: generateToken(updatedUser._id),
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Verify email (Move from Pending -> User)
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;

        // Check PendingUser first
        const pendingUser = await PendingUser.findOne({ email });

        if (!pendingUser) {
            // Check if already verified in main User table
            const user = await User.findOne({ email });
            if (user) {
                return res.status(400).json({ message: 'User already verified. Please login.' });
            }
            return res.status(400).json({ message: 'Invalid or expired verification session.' });
        }

        if (pendingUser.verificationCode !== code) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        const delegateId = `CIETM-${Math.floor(100000 + Math.random() * 900000)}`;

        // Create actual User from PendingUser data
        // We use insertOne to bypass Mongoose hooks because the password IS ALREADY HASHED in pendingUser
        await User.collection.insertOne({
            name: pendingUser.name,
            email: pendingUser.email,
            password: pendingUser.password, // Already hashed
            phone: pendingUser.phone,
            role: pendingUser.role,
            isEmailVerified: true,
            delegateId,
            createdAt: new Date(),
            updatedAt: new Date(),
            __v: 0
        });

        const createdUser = await User.findOne({ email });

        // Delete pending record
        await PendingUser.deleteOne({ _id: pendingUser._id });

        res.json({
            _id: createdUser._id,
            name: createdUser.name,
            email: createdUser.email,
            role: createdUser.role,
            phone: createdUser.phone,
            delegateId: createdUser.delegateId,
            isEmailVerified: createdUser.isEmailVerified,
            token: generateToken(createdUser._id),
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Error in verifyEmail:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

// @desc    Resend verification code
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerification = async (req, res) => {
    const { email } = req.body;

    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
        // If already verified user tries to resend?
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already verified.' });
        }
        return res.status(404).json({ message: 'Pending registration not found' });
    }

    // Generate new code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    pendingUser.verificationCode = verificationCode;
    pendingUser.createdAt = Date.now(); // Reset TTL
    await pendingUser.save();

    try {
        await sendEmail({
            email,
            subject: 'CIETM 2026 - New Verification Code',
            message: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #6366f1;">New Verification Code</h2>
                    <p>Hello ${pendingUser.name},</p>
                    <p>Here is your new verification code:</p>
                    <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <h1 style="color: #6366f1; font-size: 32px; letter-spacing: 8px; margin: 0;">${verificationCode}</h1>
                    </div>
                    <p>This code will expire in 1 hour.</p>
                </div>
            `
        });
        res.json({ message: 'New verification code sent to your email' });
    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({ message: 'Failed to send verification email' });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Please provide an email address' });
    }

    try {
        // Case-insensitive and trimmed search
        const user = await User.findOne({
            email: new RegExp('^' + email.trim() + '$', 'i')
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get reset token
        const resetToken = user.getResetPasswordToken();

        await user.save({ validateBeforeSave: false });

        // Create reset url
        let frontendBaseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
        if (req.headers.referer) {
            try {
                // Extract origin from referer (e.g. http://10.237.41.18:5173 out of http://10.237.41.18:5173/login)
                frontendBaseUrl = new URL(req.headers.referer).origin;
            } catch (e) { }
        }

        const frontendResetUrl = `${frontendBaseUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;


        const message = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #6366f1;">Password Reset Request</h2>
                <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
                <p>Please click the button below to reset your password:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${frontendResetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </div>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
                <p>This link will expire in 10 minutes.</p>
            </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'CIETM 2026 - Password Reset',
                message: message
            });

            res.status(200).json({ message: 'Email sent' });
        } catch (error) {
            console.error(error);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ message: 'Email could not be sent', error: error.message || error.toString() });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
const resetPassword = async (req, res) => {
    // Get hashed token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resetToken)
        .digest('hex');

    try {
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({
            message: 'Password updated successfully',
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update Password
// @route   PUT /api/auth/update-password
// @access  Private
const updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+password');
        const { currentPassword, newPassword } = req.body;

        if (!(await user.matchPassword(currentPassword))) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Admin Create User
// @route   POST /api/auth/admin/create-user
// @access  Private/Admin
// @desc    Update user role
// @route   PUT /api/auth/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            const newRole = req.body.role || user.role;
            
            // Auto-assign first track (CIDT) if becoming a reviewer and has no tracks
            if (newRole === 'reviewer' && user.role !== 'reviewer' && (!user.assignedTracks || user.assignedTracks.length === 0)) {
                user.assignedTracks = ['CIDT'];
            }
            
            const wasReviewer = user.role === 'reviewer';
            const isReviewer = newRole === 'reviewer';
            
            user.role = newRole;
            await user.save();

            // Try to assign papers if they just became a reviewer
            if (isReviewer && !wasReviewer) {
                const { performAutoAssignment } = require('./registrationController');
                await performAutoAssignment();
            }

            res.json({ message: 'User role updated successfully', user });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update reviewer tracks
// @route   PUT /api/auth/users/:id/tracks
// @access  Private/Chair/Admin
const updateReviewerTracks = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.assignedTracks = req.body.tracks || [];
        await user.save();

        // Dynamically auto-assign papers based on their new expertise profile
        const { performAutoAssignment } = require('./registrationController');
        await performAutoAssignment();

        res.json({ message: 'Reviewer tracks updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const adminCreateUser = async (req, res) => {
    const { name, email, password, phone, role } = req.body;

    try {
        // Check if user already exists in MAIN User table
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create the user directly
        const user = await User.create({
            name,
            email,
            password, // Mongoose pre-save hook on User will hash this
            phone,
            role: role || 'author',
            isEmailVerified: true,
            delegateId: `CIETM-${Math.floor(100000 + Math.random() * 900000)}`,
            assignedTracks: (role === 'reviewer') ? ['CIDT'] : []
        });

        // If they were pending, remove them from pending
        await PendingUser.deleteOne({ email });

        // Auto assign papers if they were created as a reviewer
        if (user.role === 'reviewer') {
            const { performAutoAssignment } = require('./registrationController');
            await performAutoAssignment();
        }

        res.status(201).json({
            message: 'User created successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                delegateId: user.delegateId,
                isEmailVerified: user.isEmailVerified
            }
        });
    } catch (error) {
        console.error('Admin Create User error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    getUsers,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    updatePassword,
    adminCreateUser,
    updateUserRole,
    updateReviewerTracks,
    updateUserProfile
};
