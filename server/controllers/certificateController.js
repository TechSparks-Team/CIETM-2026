const Registration = require('../models/Registration');

// @desc    Verify certificate by ID
// @route   GET /api/certificate/verify/:id
// @access  Public
exports.verifyCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Parse member index from the ID (e.g., ...-1, ...-2)
        const idParts = id.trim().split('-');
        const lastPart = idParts[idParts.length - 1];
        const memberIdx = /^\d+$/.test(lastPart) ? parseInt(idParts.pop()) : 0;
        const baseId = isNaN(memberIdx) || memberIdx === 0 ? id.trim() : idParts.join('-');

        const queryId = (baseId.includes('-') ? baseId : `CIETM-2026-CERT-${baseId}`).trim().toUpperCase();
        const rawId = baseId.trim();
        
        let registration;
        
        // 1. Primary Search: Match by stored certificateId or Paper ID
        registration = await Registration.findOne({
            $or: [
                { certificateId: queryId },
                { certificateId: `CIETM-2026-CERT-${rawId.toUpperCase()}` },
                { paperId: rawId.toUpperCase() }
            ]
        }).populate('userId', 'name').select('paperDetails personalDetails teamMembers status updatedAt paperId userId certificateId');

        // 2. Secondary Search: If search by explicit ID fails, fallback to aggregation for partial suffix matches
        if (!registration) {
            const results = await Registration.aggregate([
                { $addFields: { idStr: { $toString: "$_id" } } },
                {
                    $match: {
                        idStr: { $regex: rawId + "$", $options: "i" }
                    }
                },
                { $limit: 1 }
            ]);
            if (results && results.length > 0) registration = results[0];
        }

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Certificate record not found. Please verify the ID.'
            });
        }

        // Only verified if status is 'Accepted'
        const isValid = ['Accepted', 'Completed'].includes(registration.status) || registration.paperDetails?.reviewStatus === 'Accepted';

        // Extract correct participant name based on index
        let participantName = registration.personalDetails.name;
        if (memberIdx > 0 && registration.teamMembers && registration.teamMembers[memberIdx - 1]) {
            participantName = registration.teamMembers[memberIdx - 1].name;
        }

        res.status(200).json({
            success: true,
            isValid,
            data: {
                participantName: participantName,
                paperTitle: registration.paperDetails.title,
                paperId: registration.paperId,
                status: registration.status,
                issuedAt: registration.updatedAt,
                conference: "National Conference on Contemporary Innovations in Engineering, Technology & Management (CIETM-2026)"
            }
        });
    } catch (error) {
        console.error('Error verifying certificate:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during verification.'
        });
    }
};
