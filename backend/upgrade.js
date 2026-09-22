const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const upgrade = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await User.updateMany({}, { isAdmin: true });
    console.log('Successfully upgraded all users to Admin!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

upgrade();
