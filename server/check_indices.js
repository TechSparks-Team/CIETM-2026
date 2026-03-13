const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://admin:admin123@cietm.nvoipw2.mongodb.net/?appName=CIETM';

async function checkIndices() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');
    
    const indices = await mongoose.connection.db.collection('registrations').indexes();
    console.log('Indices on registrations collection:', JSON.stringify(indices, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkIndices();
