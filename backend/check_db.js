const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const MessageReport = require('./models/MessageReport');
const Notification = require('./models/Notification');
const Report = require('./models/Report');

dotenv.config({ path: path.join(__dirname, '.env') });

const check = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const totalMessageReports = await MessageReport.countDocuments();
    console.log(`Total MessageReports: ${totalMessageReports}`);
    
    const messageReports = await MessageReport.find();
    console.log('MessageReports:', JSON.stringify(messageReports, null, 2));

    const oldReports = await Report.countDocuments();
    console.log(`Total old Reports: ${oldReports}`);

    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

check();
