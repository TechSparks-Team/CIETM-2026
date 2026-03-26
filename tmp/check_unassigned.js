const mongoose = require('mongoose');
const Registration = require('../server/models/Registration'); // Assuming run from /tmp
const User = require('../server/models/User');

const MONGO_URI = 'mongodb://127.0.0.1:27017/cietm';

async function checkUnassigned() {
  try {
    await mongoose.connect(MONGO_URI);
    
    // Check all registrations that are not drafts but have no reviewer assigned
    const unassigned = await Registration.find({
      status: { $ne: 'Draft' },
      $or: [
        { 'paperDetails.assignedReviewer': { $exists: false } },
        { 'paperDetails.assignedReviewer': null }
      ]
    }).populate('userId', 'name role');

    console.log(`\nFound ${unassigned.length} unassigned (non-draft) papers:`);
    const results = unassigned.map(r => ({
      id: r._id,
      paperId: r.paperId,
      status: r.status,
      track: r.paperDetails?.track,
      user: r.userId?.name,
      role: r.userId?.role
    }));
    console.log(JSON.stringify(results, null, 2));

    const reviewers = await User.find({ role: 'reviewer' });
    console.log(`\nFound ${reviewers.length} active reviewers in system.`);
    reviewers.forEach(r => {
        console.log(`- ${r.name} (${r.assignedTracks?.join(', ') || 'no tracks'})`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUnassigned();
