const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const MessageReport = require('./models/MessageReport');
const Message = require('./models/Message');

dotenv.config({ path: path.join(__dirname, '.env') });

const checkDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const reports = await MessageReport.find();
    for (const r of reports) {
      const msg = await Message.findById(r.messageId);
      console.log('Reported Message for ID:', r._id, '->', msg);
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};
checkDb();
