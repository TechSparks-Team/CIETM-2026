const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/authController');
const { protect, admin, authorize } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/users', protect, authorize('admin', 'chair'), getUsers);
router.put('/users/:id/role', protect, admin, updateUserRole);
router.put('/users/:id/tracks', protect, authorize('admin', 'chair'), updateReviewerTracks);
router.put('/update-password', protect, updatePassword);
router.post('/admin/create-user', protect, admin, adminCreateUser);

module.exports = router;
