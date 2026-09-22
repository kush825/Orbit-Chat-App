const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Message = require('./models/Message');

dotenv.config({ path: path.join(__dirname, '.env') });

const checkMsgs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const msgs = await Message.find({ _id: { $in: ['6a81e1aa62c4ad66f480ed15', '6a9f6cc7a52733ca3995669e'] } });
    console.log(JSON.stringify(msgs, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};
checkMsgs();
