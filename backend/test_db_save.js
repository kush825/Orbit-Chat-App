const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Message = require('./models/Message');

async function testDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Create a dummy user and conversation just to bypass any reference issues if they exist
    // But actually sender/conversationId are just ObjectIds, mongoose doesn't verify existence on save unless populated
    const senderId = new mongoose.Types.ObjectId();
    const conversationId = new mongoose.Types.ObjectId();

    const dummyMessage = await Message.create({
      conversationId: conversationId,
      sender: senderId,
      text: 'Testing attachments',
      attachments: [{
        url: '/uploads/test.jpg',
        name: 'test.jpg',
        type: 'image/jpeg'
      }],
      messageType: 'image'
    });

    const retrieved = await Message.findById(dummyMessage._id);
    console.log('Retrieved attachments:', JSON.stringify(retrieved.attachments));
    
    await Message.findByIdAndDelete(dummyMessage._id);
    process.exit(0);
  } catch (err) {
    console.error('Save failed:', err.message);
    process.exit(1);
  }
}

testDB();
