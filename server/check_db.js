const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    for (let col of collections) {
      const name = col.name;
      const count = await db.collection(name).countDocuments();
      console.log(`Collection [${name}]: ${count} documents`);
      if (count > 0) {
        const docs = await db.collection(name).find({}).limit(2).toArray();
        console.log(`Sample from ${name}:`, JSON.stringify(docs, null, 2));
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('DB Error:', err);
    process.exit(1);
  }
}
checkDB();
