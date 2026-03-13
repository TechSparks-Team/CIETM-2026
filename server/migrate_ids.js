const mongoose = require('mongoose');
const User = require('./models/User');
const Registration = require('./models/Registration');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = 'mongodb+srv://admin:admin123@cietm.nvoipw2.mongodb.net/?appName=CIETM';

async function migrate() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        // 1. Fix Users
        const users = await User.find({ 
            $or: [
                { delegateId: { $exists: false } },
                { delegateId: null },
                { delegateId: "" }
            ]
        });
        console.log(`Fixing ${users.length} users...`);
        for (const user of users) {
             // Saving will trigger the pre-save hook we just added
             await user.save();
        }

        // 2. Fix Registrations
        const regs = await Registration.find({ 
            $or: [
                { paperId: { $exists: false } },
                { paperId: null },
                { paperId: "" }
            ]
        });
        console.log(`Fixing ${regs.length} registrations...`);
        for (const reg of regs) {
            let paperId;
            // Use existing authorId if available (even if field is missing from schema, it might be in raw doc)
            const rawDoc = reg.toObject();
            if (rawDoc.authorId) {
                paperId = rawDoc.authorId.replace('CIETM-', 'PAPER-');
            } else {
                let unique = false;
                while (!unique) {
                    paperId = `PAPER-${Math.floor(100000 + Math.random() * 900000)}`;
                    const existing = await Registration.findOne({ paperId });
                    if (!existing) unique = true;
                }
            }
            reg.paperId = paperId;
            // Also clean up authorId field if it still exists in the DB but not in our schema
            // Mongoose might not let us set it to undefined if it's not in schema, 
            // but we can use updateOne
            await Registration.updateOne({ _id: reg._id }, { $set: { paperId }, $unset: { authorId: 1 } });
        }

        console.log('Migration complete');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

migrate();
