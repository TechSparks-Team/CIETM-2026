const express = require('express');
const router = express.Router();
const {
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
    handleReuploadRequest
} = require('../controllers/registrationController');
const { protect, admin } = require('../middleware/authMiddleware');
const { upload, uploadProfilePic } = require('../config/cloudinary');

router.get('/download/:id', protect, downloadPaper);
router.get('/download-all', protect, admin, downloadAllPapersZip);
router.get('/verify/:id', protect, admin, verifyEntry);
router.post('/draft', protect, saveDraft);
router.post('/submit', protect, submitRegistration);
router.get('/my', protect, getMyRegistration);
router.get('/', protect, admin, getAllRegistrations);
router.get('/analytics', protect, admin, getAdminAnalytics);
router.put('/:id/review', protect, admin, reviewPaper);
router.put('/:id/status', protect, admin, updateRegistrationStatus);
router.post('/update-paper', protect, updatePaper);
router.put('/profile-picture', protect, updateProfilePicture);
router.post('/:id/request-reupload', protect, requestReupload);
router.post('/:id/handle-reupload-request', protect, admin, handleReuploadRequest);

// File upload route
router.post('/upload', protect, upload.single('paper'), (req, res) => {
    if (req.file) {
        const extension = req.file.originalname.split('.').pop().toLowerCase();
        const isWordDoc = ['doc', 'docx'].includes(extension);
        const resourceType = isWordDoc ? 'raw' : (req.file.resource_type || 'image');

        res.json({
            url: req.file.path,
            publicId: req.file.filename,
            originalName: req.file.originalname,
            resourceType: resourceType
        });
    } else {
        res.status(400).json({ message: 'File upload failed' });
    }
});

// Profile Picture upload route
router.post('/upload-profile-picture', protect, uploadProfilePic.single('image'), (req, res) => {
    if (req.file) {
        res.json({
            url: req.file.path,
            publicId: req.file.filename
        });
    } else {
        res.status(400).json({ message: 'Profile picture upload failed' });
    }
});

module.exports = router;
