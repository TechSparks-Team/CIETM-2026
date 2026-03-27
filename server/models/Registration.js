const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    paperId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    personalDetails: {
        name: String,
        email: String,
        mobile: String,
        institution: String,
        department: String,
        designation: String,
        areaOfSpecialization: String,
        yearOfStudy: String,
        profilePicture: String,
        category: {
            type: String,
            enum: ['UG/PG STUDENTS', 'FACULTY/RESEARCH SCHOLARS', 'EXTERNAL / ONLINE PRESENTATION', 'INDUSTRY PERSONNEL', 'Inter-college Student', 'External Student', 'Industrial Delegate', 'Research Scholar']
        }
    },
    teamMembers: [{
        name: String,
        email: String,
        affiliation: String,
        department: String,
        designation: String,
        areaOfSpecialization: String,
        yearOfStudy: String,
        mobile: String,
        category: {
            type: String,
            enum: ['UG/PG STUDENTS', 'FACULTY/RESEARCH SCHOLARS', 'EXTERNAL / ONLINE PRESENTATION', 'INDUSTRY PERSONNEL', 'Inter-college Student', 'External Student', 'Industrial Delegate', 'Research Scholar']
        }
    }],
    paperDetails: {
        title: String,
        abstract: String,
        keywords: [String],
        track: String,
        fileUrl: String,
        publicId: String, // For Cloudinary
        resourceType: String, // 'image' or 'raw' - critical for correct download links
        originalName: String, // To preserve filename on download
        reviewStatus: {
            type: String,
            enum: ['Draft', 'Submitted', 'Under Review', 'Accepted', 'Rejected'],
            default: 'Draft'
        },
        reviewerComments: String,
        assignedReviewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        assignedChair: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reuploadRequestStatus: {
            type: String,
            enum: ['None', 'Pending', 'Approved', 'Rejected'],
            default: 'None'
        }
    },
    status: {
        type: String,
        enum: ['Draft', 'Submitted', 'Under Review', 'Accepted', 'Rejected'],
        default: 'Draft'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    transactionId: String,
    amount: Number,
    attended: {
        type: Boolean,
        default: false
    },
    attendedAt: Date,
    submittedAt: Date,
    updatedAt: {
        type: Date,
        default: Date.now
    },
    certificateId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    certificateGeneratedAt: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Registration', registrationSchema);
