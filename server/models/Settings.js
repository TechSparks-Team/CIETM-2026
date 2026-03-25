const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    conferenceName: {
        type: String,
        default: 'CIETM 2026'
    },
    registrationOpen: {
        type: Boolean,
        default: true
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    onlinePaymentEnabled: {
        type: Boolean,
        default: true
    },
    autoAssignEnabled: {
        type: Boolean,
        default: true
    },
    certificatesIssued: {
        type: Boolean,
        default: false
    },
    deadlines: {
        abstractSubmission: Date,
        fullPaperSubmission: Date,
        registration: Date
    },
    fees: {
        'UG/PG STUDENTS': { type: Number, default: 500 },
        'FACULTY/RESEARCH SCHOLARS': { type: Number, default: 750 },
        'EXTERNAL / ONLINE PRESENTATION': { type: Number, default: 300 },
        'INDUSTRY PERSONNEL': { type: Number, default: 900 }
    },
    tracks: [String],
    announcements: [{
        title: String,
        message: String,
        date: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
