const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./config/db');
const User = require('./models/User');

const seed = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('Connected!');

    // Check if PMS Admin user exists
    let pmsUser = await User.findOne({ username: 'pms' });
    if (!pmsUser) {
      pmsUser = new User({
        username: 'pms',
        email: 'pms@poultry.com',
        fullName: 'PMS Admin',
        role: 'Admin'
      });
      pmsUser.setPassword('26082006');
      await pmsUser.save();
      console.log('Created default user: pms');
    } else {
      console.log('User "pms" already exists.');
    }

    // Check if Pradeep user exists
    let pradeepUser = await User.findOne({ username: 'pradeep' });
    if (!pradeepUser) {
      pradeepUser = new User({
        username: 'pradeep',
        email: 'pradeep@poultry.com',
        fullName: 'Pradeep',
        role: 'Admin'
      });
      pradeepUser.setPassword('2006');
      await pradeepUser.save();
      console.log('Created default user: pradeep');
    } else {
      console.log('User "pradeep" already exists.');
    }

    const totalUsers = await User.countDocuments();
    console.log(`Success! "users" collection created and populated in MongoDB. Total users: ${totalUsers}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seed();
