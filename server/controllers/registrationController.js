const Registration = require('../models/Registration');
const sendEmail = require('../utils/sendEmail');
const { cloudinary } = require('../config/cloudinary');
const { createNotification } = require('./notificationController');
const archiver = require('archiver');
const axios = require('axios');
const User = require('../models/User');

// @desc    Create or Update a draft registration
// @route   POST /api/registrations/draft
// @access  Private
const saveDraft = async (req, res) => {
    const { personalDetails, teamMembers, paperDetails } = req.body;
    const userId = req.user._id;

    try {
        let registration = await Registration.findOne({ userId });

        // Ensure mobile is synced from User if not provided in personalDetails
        if (personalDetails && !personalDetails.mobile && req.user.phone) {
            personalDetails.mobile = req.user.phone;
        }

        if (registration) {
            // Prevent updates if already reviewed (Accepted/Rejected)
            if (['Accepted', 'Rejected'].includes(registration.status)) {
                return res.status(403).json({ message: `Cannot modify registration as it has already been ${registration.status.toLowerCase()}.` });
            }

            // Filter team members
            if (teamMembers) {
                registration.teamMembers = teamMembers.filter(m => m && m.name && m.name.trim() !== '');
            }

            // Update existing draft
            registration.personalDetails = personalDetails || registration.personalDetails;

            // Explicitly handle merging paperDetails to avoid overwriting nested fields if partial
            if (paperDetails) {
                registration.paperDetails = {
                    ...registration.paperDetails.toObject(),
                    ...paperDetails,
                    keywords: paperDetails.keywords || registration.paperDetails.keywords
                };
            }

            registration.updatedAt = Date.now();

            await registration.save();
        } else {
            // Filter team members
            const validTeamMembers = teamMembers ? teamMembers.filter(m => m.name && m.name.trim() !== '') : [];

            // Generate a unique author ID (e.g., CIETM-123456)
            const randomCode = Math.floor(100000 + Math.random() * 900000);
            const authorId = `CIETM-${randomCode}`;

            // Create new draft
            registration = await Registration.create({
                userId,
                authorId,
                personalDetails,
                teamMembers: validTeamMembers,
                paperDetails,
                status: 'Draft'
            });
        }

        res.status(200).json(registration);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Submit final registration
// @route   POST /api/registrations/submit
// @access  Private
const submitRegistration = async (req, res) => {
    try {
        const registration = await Registration.findOne({ userId: req.user._id });

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        registration.status = 'Submitted';
        registration.paperDetails.reviewStatus = 'Submitted';
        registration.submittedAt = Date.now();

        await registration.save();

        // Create notification
        await createNotification(
            req.user._id,
            'Submission Received',
            'Your conference registration and paper details have been successfully submitted.',
            'success',
            '/dashboard'
        );

        // Instantly attempt to auto-assign the paper to a reviewer behind the scenes
        await performAutoAssignment();

        res.status(200).json(registration);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get author registration
// @route   GET /api/registrations/my
// @access  Private
const getMyRegistration = async (req, res) => {
    try {
        const registration = await Registration.findOne({ userId: req.user._id })
            .populate('paperDetails.assignedReviewer', 'name email role')
            .populate('paperDetails.assignedChair', 'name email role');
        res.json(registration);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all registrations (Admin)
// @route   GET /api/registrations
// @access  Admin
const getAllRegistrations = async (req, res) => {
    try {
        let query = {};
        
        // Security: Filter papers for reviewers on the backend
        if (req.user.role === 'reviewer') {
            query = {
                $or: [
                    { 'paperDetails.assignedReviewer': req.user._id },
                    { 'paperDetails.assignedReviewer': req.user._id.toString() }
                ]
            };
        }

        let registrations = await Registration.find(query)
            .populate('userId', 'name email phone role')
            .populate('paperDetails.assignedReviewer', 'name email role')
            .populate('paperDetails.assignedChair', 'name email role');

        // Author Privacy for Reviewers
        if (req.user.role === 'reviewer') {
            registrations = registrations.map(reg => {
                const regObj = reg.toObject();
                // Mask personal details
                regObj.personalDetails = {
                    authorId: reg.authorId || `PN-${reg._id.toString().slice(-6).toUpperCase()}`
                };
                regObj.userId = {
                    role: reg.userId?.role
                };
                regObj.teamMembers = [];
                return regObj;
            });
        }

        res.json(registrations);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Review paper (Admin)
// @route   PUT /api/registrations/:id/review
// @access  Admin
const reviewPaper = async (req, res) => {
    const { status, remarks } = req.body;

    try {
        const registration = await Registration.findById(req.params.id).populate('userId', 'email name');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        if (status === 'Accepted' && !registration.paperDetails?.fileUrl) {
            return res.status(400).json({ message: 'Manuscript cannot be accepted without a file upload.' });
        }

        registration.status = status;
        registration.paperDetails.reviewStatus = status;
        registration.paperDetails.reviewerComments = remarks;

        await registration.save();

        // Create notification
        await createNotification(
            registration.userId._id,
            `Paper ${status}`,
            `Your paper titled "${registration.paperDetails.title}" has been ${status.toLowerCase()}.`,
            status === 'Accepted' ? 'success' : status === 'Rejected' ? 'error' : 'info',
            '/dashboard'
        );

        // Send Notification Email
        try {
            await sendEmail({
                email: registration.userId.email,
                subject: `Your Paper Status: ${status}`,
                message: `
          <h1>Hello ${registration.userId.name},</h1>
          <p>Your paper titled "<strong>${registration.paperDetails.title}</strong>" has been <strong>${status}</strong>.</p>
          <p><strong>Remarks:</strong> ${remarks || 'None'}</p>
          <p>Please log in to your dashboard for more details.</p>
        `
            });
        } catch (err) {
            console.error("Email failed to send", err);
        }

        res.json(registration);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const sanitizeFilename = (text) => {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/gi, '')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
};

const downloadPaper = async (req, res) => {
    try {
        const { id } = req.params;
        let registration;

        if (req.user.role === 'admin' || req.user.role === 'chair') {
            registration = await Registration.findById(id);
        } else if (req.user.role === 'reviewer') {
            registration = await Registration.findOne({ 
                _id: id, 
                $or: [
                    { 'paperDetails.assignedReviewer': req.user._id },
                    { 'paperDetails.assignedReviewer': req.user._id.toString() }
                ]
            });
        } else {
            registration = await Registration.findOne({ userId: req.user._id });
        }

        if (!registration || !registration.paperDetails.fileUrl) {
            return res.status(404).json({ message: 'Paper not found or unauthorized' });
        }

        // Construct dynamic filename - Privacy for reviewers
        const paperID = registration.authorId || `REF-${registration._id.toString().slice(-6).toUpperCase()}`;
        const fileNamePart = req.user.role === 'reviewer' ? `PAPER_${paperID}` : sanitizeFilename(registration.personalDetails.name || 'author');
        const paperTitle = sanitizeFilename(registration.paperDetails.title || '');
        const basename = req.user.role === 'reviewer' ? `PAPER_${paperID}` : (paperTitle ? `${fileNamePart}_${paperTitle}` : fileNamePart);

        // Get extension from originalName or default to docx
        const originalName = registration.paperDetails.originalName || '';
        const extension = originalName.split('.').pop() || 'docx';

        // Determine resource type - force 'raw' for word docs to be safe
        // Cloudinary private_download_url uses 'image' by default if not specified
        const isWordDoc = ['doc', 'docx'].includes(extension.toLowerCase());
        const resourceType = isWordDoc ? 'raw' : (registration.paperDetails.resourceType || 'raw');

        // For raw files, format should be empty if extension is in publicId
        const format = (resourceType === 'raw' && registration.paperDetails.publicId.endsWith(`.${extension}`)) ? '' : extension;

        const downloadUrl = cloudinary.utils.private_download_url(
            registration.paperDetails.publicId,
            format,
            {
                resource_type: resourceType,
                type: 'upload',
                attachment: `${basename}.${extension}`
            }
        );

        // Redirect to the generated Cloudinary download URL
        res.redirect(downloadUrl);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update/Upload full paper after submission
// @route   POST /api/registrations/upload-paper
// @access  Private
const updatePaper = async (req, res) => {
    const { fileUrl, publicId, resourceType, originalName } = req.body;
    try {
        const registration = await Registration.findOne({ userId: req.user._id });
        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        // Prevent updates if already reviewed (Accepted)
        if (registration.status === 'Accepted') {
            return res.status(403).json({ message: `Cannot update paper as it has already been ${registration.status.toLowerCase()}.` });
        }

        const wasRejected = registration.status === 'Rejected';

        // Enforce re-upload request workflow if rejected
        if (wasRejected && registration.paperDetails.reuploadRequestStatus !== 'Approved') {
            return res.status(403).json({ message: 'You must request and receive approval to re-upload a rejected manuscript.' });
        }

        // If there's an existing file, and the new file has a different public ID (e.g., different extension), delete the old one
        const oldPublicId = registration.paperDetails.publicId;
        if (oldPublicId && oldPublicId !== publicId) {
            try {
                const oldResourceType = registration.paperDetails.resourceType || 'raw';
                await cloudinary.uploader.destroy(oldPublicId, { resource_type: oldResourceType });
            } catch (err) {
                console.error("Failed to delete old paper from Cloudinary on update:", err);
            }
        }

        registration.paperDetails.fileUrl = fileUrl;
        registration.paperDetails.publicId = publicId;
        registration.paperDetails.resourceType = resourceType;
        registration.paperDetails.originalName = originalName;

        if (registration.paperDetails.reuploadRequestStatus === 'Approved') {
            registration.paperDetails.reuploadRequestStatus = 'None';
        }

        registration.updatedAt = Date.now();

        if (wasRejected) {
            registration.status = 'Submitted';
            registration.paperDetails.reviewStatus = 'Submitted';
        }

        await registration.save();

        if (wasRejected) {
            const admins = await User.find({ role: 'admin' });
            for (const admin of admins) {
                await createNotification(
                    admin._id,
                    'Revised Manuscript Upload',
                    `Author ${req.user.name} has uploaded a revised manuscript for "${registration.paperDetails.title}".`,
                    'info',
                    '/admin'
                );
            }
        }

        // Instantly trigger auto-assignment since the paper is now uploaded and ready for review
        await performAutoAssignment();

        res.json(registration);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getAdminAnalytics = async (req, res) => {
    try {
        const stats = await Registration.aggregate([
            {
                $group: {
                    _id: null,
                    totalRegistrations: { $sum: 1 },
                    totalAccepted: { $sum: { $cond: [{ $eq: ["$status", "Accepted"] }, 1, 0] } },
                    totalRejected: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
                    totalPending: { $sum: { $cond: [{ $in: ["$status", ["Submitted", "Under Review"]] }, 1, 0] } },
                    totalPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Completed"] }, "$amount", 0] } },
                    completedPaymentsCount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Completed"] }, 1, 0] } }
                }
            }
        ]);

        const trackStats = await Registration.aggregate([
            { $group: { _id: "$paperDetails.track", count: { $sum: 1 } } }
        ]);

        const recentSubmissions = await Registration.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'name email');

        res.json({
            overview: stats[0] || {},
            tracks: trackStats,
            recent: recentSubmissions
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Request paper re-upload after rejection
// @route   POST /api/registrations/:id/request-reupload
// @access  Private
const requestReupload = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id).populate('userId', 'name email');
        
        if (!registration || registration.userId._id.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        if (registration.status !== 'Rejected') {
            return res.status(400).json({ message: 'Only rejected papers can request re-upload.' });
        }

        registration.paperDetails.reuploadRequestStatus = 'Pending';
        registration.updatedAt = Date.now();
        await registration.save();

        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            await createNotification(
                admin._id,
                'Re-upload Request',
                `Author ${req.user.name} has requested to re-upload their rejected manuscript.`,
                'info',
                '/admin'
            );
        }

        res.json(registration);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Handle paper re-upload request (Admin)
// @route   POST /api/registrations/:id/handle-reupload-request
// @access  Admin
const handleReuploadRequest = async (req, res) => {
    const { action } = req.body; // 'Approve' or 'Reject'

    try {
        const registration = await Registration.findById(req.params.id).populate('userId', 'email name');
        
        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        if (registration.paperDetails.reuploadRequestStatus !== 'Pending') {
             return res.status(400).json({ message: 'No pending re-upload request.' });
        }

        registration.paperDetails.reuploadRequestStatus = action === 'Approve' ? 'Approved' : 'Rejected';
        registration.updatedAt = Date.now();
        await registration.save();

        await createNotification(
            registration.userId._id,
            `Re-upload Request ${action}d`,
            `Your request to re-upload the manuscript has been ${action.toLowerCase()} by an admin.`,
            action === 'Approve' ? 'success' : 'error',
            '/dashboard'
        );

         try {
            await sendEmail({
                email: registration.userId.email,
                subject: `Re-upload Request ${action}d`,
                message: `
          <h1>Hello ${registration.userId.name},</h1>
          <p>Your request to re-upload your rejected manuscript titled "<strong>${registration.paperDetails.title}</strong>" has been <strong>${action.toLowerCase()}</strong>.</p>
          ${action === 'Approve' ? '<p>You may now log in to your dashboard to upload the revised manuscript.</p>' : ''}
        `
            });
        } catch (err) {
            console.error("Email failed to send", err);
        }

        res.json(registration);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateRegistrationStatus = async (req, res) => {
    const { status, paymentStatus, transactionId, amount, attended } = req.body;
    try {
        const registration = await Registration.findById(req.params.id);
        if (!registration) return res.status(404).json({ message: 'Registration not found' });

        if (status) {
            registration.status = status;
            registration.paperDetails.reviewStatus = status;
        }
        if (paymentStatus) registration.paymentStatus = paymentStatus;
        if (transactionId) registration.transactionId = transactionId;
        if (amount) registration.amount = amount;
        if (attended !== undefined) {
            registration.attended = attended;
            if (attended && !registration.attendedAt) {
                registration.attendedAt = Date.now();
            }
        }

        await registration.save();
        res.json(registration);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Download all papers as ZIP (Admin)
// @route   GET /api/registrations/download-all
// @access  Admin
const downloadAllPapersZip = async (req, res) => {
    try {
        const registrations = await Registration.find({
            'paperDetails.fileUrl': { $exists: true, $ne: '' },
            'status': { $in: ['Submitted', 'Under Review', 'Accepted'] }
        });

        if (!registrations || registrations.length === 0) {
            return res.status(404).send('No papers found to download');
        }

        const archive = archiver('zip', { zlib: { level: 9 } });

        // Error handling for the archive
        archive.on('error', (err) => {
            throw err;
        });

        res.attachment(`CIETM_All_Manuscripts_${new Date().toISOString().split('T')[0]}.zip`);
        archive.pipe(res);

        for (const reg of registrations) {
            const originalName = reg.paperDetails?.originalName || '';
            const extension = originalName.split('.').pop() || 'docx';
            const authorId = reg.authorId ? reg.authorId : `anonymous_${Date.now()}`;
            const fileName = `${authorId}.${extension}`;

            try {
                const response = await axios({
                    method: 'get',
                    url: reg.paperDetails.fileUrl,
                    responseType: 'stream',
                    timeout: 30000
                });

                if (response.status === 200) {
                    archive.append(response.data, { name: fileName });
                }
            } catch (err) {
                console.error(`Skipping file due to error: ${fileName}`, err.message);
            }
        }

        await archive.finalize();
    } catch (error) {
        console.error('ZIP Error:', error);
        if (!res.headersSent) {
            res.status(500).send('Error creating workspace archive');
        }
    }
};

// @desc    Verify entry for participant at venue (Admin)
// @route   GET /api/registrations/verify/:id
// @access  Admin
const verifyEntry = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id).populate('userId', 'name email phone');

        if (!registration) {
            return res.status(404).json({ message: 'Invalid ID Card or Registration not found' });
        }

        if (registration.status !== 'Accepted') {
            return res.status(400).json({
                message: registration.status === 'Draft'
                    ? 'Submission Incomplete. Author must submit paper details.'
                    : `Manuscript status is ${registration.status}. It must be "Accepted" before verification.`,
                status: registration.status,
                personalDetails: registration.personalDetails,
                paperDetails: registration.paperDetails // Sending this so frontend can show file existence
            });
        }

        // Auto-mark as attended only if submission is complete
        registration.attended = true;
        registration.attendedAt = Date.now();
        await registration.save();

        res.json(registration);
    } catch (error) {
        res.status(400).json({ message: 'Invalid QR Code data' });
    }
};

// @desc    Update Profile Picture
// @route   PUT /api/registrations/profile-picture
// @access  Private
const updateProfilePicture = async (req, res) => {
    try {
        let registration = await Registration.findOne({ userId: req.user._id });

        if (!registration) {
            registration = new Registration({
                userId: req.user._id,
                personalDetails: {
                    name: req.user.name,
                    email: req.user.email,
                    mobile: req.user.phone || '',
                    profilePicture: req.body.profilePicture,
                    category: 'UG/PG STUDENTS',
                },
                status: 'Draft'
            });
        } else {
            registration.personalDetails.profilePicture = req.body.profilePicture;
        }

        await registration.save();

        res.json({ message: 'Profile picture updated successfully', profilePicture: req.body.profilePicture });
    } catch (error) {
        console.error('Update Profile Picture Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Assign reviewer to registration
// @route   PUT /api/registrations/:id/assign
// @access  Private/Chair/Admin
const assignReviewer = async (req, res) => {
    const { reviewerId } = req.body;
    try {
        const registration = await Registration.findById(req.params.id);
        if (!registration) return res.status(404).json({ message: 'Registration not found' });

        // Security check: If they chose to UN-assign (empty value)
        if (!reviewerId) {
            registration.paperDetails.assignedReviewer = undefined;
            await registration.save();
            return res.json({ message: 'Reviewer unassigned successfully', registration });
        }

        registration.paperDetails.assignedReviewer = reviewerId;
        await registration.save();

        const reviewer = await User.findById(reviewerId);
        if (reviewer) {
             await createNotification(
                reviewer._id,
                'New Paper Assigned',
                `A new paper titled "${registration.paperDetails.title}" has been assigned to you for review.`,
                'info',
                '/reviewer/dashboard'
            );
        }

        res.json({ message: 'Reviewer assigned successfully', registration });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

async function performAutoAssignment(allowFallback = false) {
    try {
        const Settings = require('../models/Settings');
        const settings = await Settings.findOne();
        
        // Abort if auto-assign is disabled globally by Admin
        if (settings && settings.autoAssignEnabled === false) {
            return { assignedCount: 0, results: [], error: null, disabled: true };
        }

        // Find registrations that are submitted, have a manuscript uploaded, and don't have a reviewer
        const registrations = await Registration.find({
            status: { $in: ['Submitted', 'Under Review'] },
            'paperDetails.fileUrl': { $exists: true, $ne: null },
            'paperDetails.assignedReviewer': { $exists: false }
        });

        const reviewers = await User.find({ role: 'reviewer' });

        if (reviewers.length === 0) return { assignedCount: 0, results: [], error: null };

        let assignedCount = 0;
        const results = [];

        // Fetch all current assignments to calculate current workload exactly
        const allRegistrations = await Registration.find({ 'paperDetails.assignedReviewer': { $exists: true, $ne: null } });
        
        // Map reviewerId to their current active load (number of papers assigned)
        const reviewerLoadMap = {};
        reviewers.forEach(r => reviewerLoadMap[r._id.toString()] = 0);
        allRegistrations.forEach(r => {
            const revId = r.paperDetails.assignedReviewer.toString();
            if (reviewerLoadMap[revId] !== undefined) {
                reviewerLoadMap[revId]++;
            }
        });

        for (const reg of registrations) {
            const paperTrack = reg.paperDetails.track;
            // Find reviewers who match track
            let matchingReviewers = reviewers.filter(r => 
                r.assignedTracks && 
                r.assignedTracks.includes(paperTrack)
            );
            
            // Fallback to any reviewer if no track match is available, but ONLY if we are allowing fallback (manual button click)
            if (allowFallback && matchingReviewers.length === 0) {
                matchingReviewers = [...reviewers];
            }

            if (matchingReviewers.length === 0) continue;

            // Find the MINIMUM load among all available matching reviewers
            const minLoad = Math.min(...matchingReviewers.map(r => reviewerLoadMap[r._id.toString()]));
            
            // Filter to only those with the minimum load
            const leastLoadedReviewers = matchingReviewers.filter(r => reviewerLoadMap[r._id.toString()] === minLoad);

            // Break ties randomly among the least loaded
            const selectedReviewer = leastLoadedReviewers[Math.floor(Math.random() * leastLoadedReviewers.length)];
            
            // Increment their recorded load so the next paper goes to someone else if possible
            reviewerLoadMap[selectedReviewer._id.toString()]++;

            reg.paperDetails.assignedReviewer = selectedReviewer._id;
            await reg.save();
            assignedCount++;

            await createNotification(
                selectedReviewer._id,
                'Auto Paper Assignment',
                `A new paper titled "${reg.paperDetails.title}" has been auto-assigned to you based on your track expertise.`,
                'info',
                '/reviewer/dashboard'
            );
            
            results.push({ paper: reg.paperDetails.title, reviewer: selectedReviewer.name });
        }

        return { assignedCount, results, error: null };
    } catch (error) {
        console.error("Auto-assign background error:", error);
        return { assignedCount: 0, results: [], error };
    }
};

// @desc    Auto assign reviewers to papers without one
// @route   POST /api/registrations/auto-assign
// @access  Private/Chair/Admin
const autoAssignReviewers = async (req, res) => {
    try {
        // True specifies passing allowFallback, meaning it can force papers to random reviewers if matching tracks don't exist
        const { assignedCount, results, error, disabled } = await performAutoAssignment(true);
        if (error) throw error;
        
        if (disabled) {
            return res.status(403).json({ message: 'Auto-Assignment Engine is currently disabled in System Settings.' });
        }

        if (assignedCount === 0 && results.length === 0) {
            return res.status(400).json({ message: 'No unassigned papers or available reviewers found' });
        }

        res.json({ message: `Successfully assigned ${assignedCount} papers`, results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    saveDraft,
    submitRegistration,
    getMyRegistration,
    getAllRegistrations,
    reviewPaper,
    downloadPaper,
    updatePaper,
    getAdminAnalytics,
    updateRegistrationStatus,
    downloadAllPapersZip,
    verifyEntry,
    updateProfilePicture,
    requestReupload,
    handleReuploadRequest,
    assignReviewer,
    autoAssignReviewers,
    performAutoAssignment
};
