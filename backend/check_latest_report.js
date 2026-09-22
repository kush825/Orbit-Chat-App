const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const MessageReport = require('./models/MessageReport');
const Message = require('./models/Message');

dotenv.config({ path: path.join(__dirname, '.env') });

const checkMsgs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const reports = await MessageReport.find().sort({ createdAt: -1 });
    console.log(`Total reports: ${reports.length}`);
    if (reports.length > 0) {
      const msg = await Message.findById(reports[0].messageId);
      console.log('LATEST REPORT:', reports[0]);
      console.log('LATEST REPORTED MESSAGE:', msg);
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};
checkMsgs();
