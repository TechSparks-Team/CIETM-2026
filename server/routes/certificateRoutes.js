const express = require('express');
const router = express.Router();
const { verifyCertificate } = require('../controllers/certificateController');

// Public route for verification (accessed via QR code or manual entry)
router.get('/verify/:id', verifyCertificate);

module.exports = router;
