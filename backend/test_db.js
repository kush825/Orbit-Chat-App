const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Message = require('./models/Message');

async function testDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const dummyMessage = new Message({
      conversationId: new mongoose.Types.ObjectId(),
      sender: new mongoose.Types.ObjectId(),
      text: '',
      file: '/uploads/test.jpg',
      fileName: 'test.jpg',
      fileType: 'image/jpeg',
      attachments: [{
        url: '/uploads/test.jpg',
        name: 'test.jpg',
        type: 'image/jpeg'
      }],
      messageType: 'image'
    });

    await dummyMessage.validate();
    console.log('Validation passed!');
    
    // We don't save to avoid garbage data, just validation is enough
    process.exit(0);
  } catch (err) {
    console.error('Validation failed:', err.message);
    process.exit(1);
  }
}

testDB();
