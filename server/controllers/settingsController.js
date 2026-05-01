const Settings = require('../models/Settings');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PendingUser = require('../models/PendingUser');
const { createNotification } = require('./notificationController');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Public/Admin
const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Admin
const updateSettings = async (req, res) => {
    try {
        const settings = await Settings.findOneAndUpdate({}, req.body, { returnDocument: 'after', upsert: true });
        res.json(settings);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Broadcast notification to all users
// @route   POST /api/settings/broadcast
// @access  Admin
const broadcastNotification = async (req, res) => {
    const { title, message, type, roles } = req.body;
    try {
        // Find users based on provided roles, or default to 'author' if none provided
        const query = roles && roles.length > 0 ? { role: { $in: roles } } : { role: 'author' };
        const users = await User.find(query);

        if (users.length === 0) {
            return res.status(404).json({ message: "No users found for the selected roles" });
        }

        const notificationPromises = users.map(user => {
            const roleLinks = {
                'author': '/dashboard',
                'reviewer': '/reviewer/dashboard',
                'chair': '/chair/dashboard',
                'admin': '/admin/dashboard'
            };
            const targetLink = roleLinks[user.role] || '/dashboard';
            return createNotification(user._id, title, message, type || 'info', targetLink);
        });

        await Promise.all(notificationPromises);

        res.json({ message: `Notification sent to ${users.length} users (${roles?.join(', ') || 'author'})` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export registrations to CSV (simple version returning JSON for frontend to parse)
// @route   GET /api/settings/export
// @access  Admin
const exportRegistrations = async (req, res) => {
    try {
        const { status, paymentStatus, track, category, attended, authorType, columns } = req.query;
        const query = {};

        if (status && status !== 'All') query.status = status;
        if (paymentStatus && paymentStatus !== 'All') query.paymentStatus = paymentStatus;
        if (track && track !== 'All') query['paperDetails.track'] = track;
        if (category && category !== 'All') query['personalDetails.category'] = category;
        if (attended !== undefined && attended !== 'All') query.attended = attended === 'true';
        
        // Handle Internal/External filter
        if (authorType && authorType !== 'All') {
            const internalPattern = /(ciet|coimbatore institute of engineering and technology)/i;
            if (authorType === 'Internal') {
                query['personalDetails.institution'] = { $regex: internalPattern };
            } else if (authorType === 'External') {
                query['personalDetails.institution'] = { $not: internalPattern };
            }
        }

        const registrations = await Registration.find(query).populate('userId', 'name email phone delegateId');

        // Parse selected columns if provided
        const selectedColumns = columns ? columns.split(',') : null;

        const csvData = registrations.map(reg => {
            const fullData = {
                'Delegate ID': reg.userId?.delegateId || 'N/A',
                'Paper ID': reg.paperId || (reg.authorId || `#PAPER-${reg._id.toString().slice(-6).toUpperCase()}`),
                'Principal Author Name': reg.personalDetails?.name || reg.userId?.name,
                'Principal Email': reg.personalDetails?.email || reg.userId?.email,
                'Mobile Number': reg.personalDetails?.mobile || reg.userId?.phone || 'N/A',
                'Author Type': (reg.personalDetails?.institution?.toLowerCase().includes('ciet') || reg.personalDetails?.institution?.toLowerCase().includes('coimbatore institute of engineering and technology')) ? 'Internal' : 'External',
                'Author Category': reg.personalDetails?.category,
                'Affiliation (Institute/Industry)': reg.personalDetails?.institution,
                'Department': reg.personalDetails?.department,
                'Area of Specialization': reg.personalDetails?.areaOfSpecialization,
                'Paper Title': reg.paperDetails?.title,
                'Conference Track': reg.paperDetails?.track,
                'Submission Status': reg.status,
                'Payment Status': reg.paymentStatus,
                'Transaction ID': reg.transactionId || 'N/A',
                'Amount (INR)': reg.amount || 0,
                'Payment Date': reg.paymentStatus === 'Completed' ? new Date(reg.updatedAt).toLocaleDateString() : 'N/A'
            };

            // Flatten Co-Authors (Up to 4)
            for (let i = 0; i < 4; i++) {
                const member = reg.teamMembers && reg.teamMembers[i];
                const prefix = `Co-Author ${i + 1}`;
                fullData[`${prefix} Name`] = member?.name || '';
                fullData[`${prefix} Email`] = member?.email || '';
                fullData[`${prefix} Affiliation`] = member?.affiliation || '';
                fullData[`${prefix} Category`] = member?.category || '';
                fullData[`${prefix} Specialization`] = member?.areaOfSpecialization || '';
            }

            // If selective columns are requested, filter the object
            if (selectedColumns) {
                const filteredData = {};
                selectedColumns.forEach(col => {
                    if (fullData.hasOwnProperty(col)) {
                        filteredData[col] = fullData[col];
                    }
                });
                return filteredData;
            }

            return fullData;
        });

        res.json(csvData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Clear database (except admins)
// @route   DELETE /api/settings/cleanup/database
// @access  Admin
const cleanupDatabase = async (req, res) => {
    try {
        // Delete all registrations, notifications, and pending users
        await Registration.deleteMany({});
        await Notification.deleteMany({});
        await PendingUser.deleteMany({});

        // Delete all users except admins
        await User.deleteMany({ role: { $ne: 'admin' } });

        res.json({ message: 'Database cleaned up successfully (admin accounts preserved).' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Clear Cloudinary resources for the conference
// @route   DELETE /api/settings/cleanup/cloudinary
// @access  Admin
const cleanupCloudinary = async (req, res) => {
    try {
        // Find and delete all resources in the conference_papers folder
        // Papers are uploaded as 'raw' resources (DOCX)
        const rawResult = await cloudinary.api.delete_resources_by_prefix('conference_papers/', { resource_type: 'raw' });

        // Also delete any images that might accidentally be there
        const imgResult = await cloudinary.api.delete_resources_by_prefix('conference_papers/', { resource_type: 'image' });

        // Delete the folder itself, catch error if not empty or not found
        let folderResult = null;
        try {
            folderResult = await cloudinary.api.delete_folder('conference_papers');
        } catch (folderErr) {
            console.warn('Could not delete Cloudinary folder:', folderErr.message);
        }

        res.json({
            message: 'Cloudinary files cleaned up successfully.',
            details: { raw: rawResult, image: imgResult, folder: folderResult }
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to clean up Cloudinary' });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    broadcastNotification,
    exportRegistrations,
    cleanupDatabase,
    cleanupCloudinary
};
