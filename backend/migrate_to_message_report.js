const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const MessageReport = require('./models/MessageReport');
const Message = require('./models/Message');
const User = require('./models/User');

dotenv.config({ path: path.join(__dirname, '.env') });

const VALID_REASONS = [
  'Spam', 'Harassment', 'Bullying', 'Hate Speech', 
  'Violence', 'Sexual Content', 'Scam/Fraud', 
  'Fake Information', 'Inappropriate Content', 'Other'
];

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const messages = await Message.find({ 'reports.0': { $exists: true } }).populate('reports.reportedBy');
    
    let count = 0;
    for (const msg of messages) {
      for (const report of msg.reports) {
        
        // Check if report already exists in MessageReport
        const exists = await MessageReport.findOne({
          messageId: msg._id,
          reporterUserId: report.reportedBy ? report.reportedBy._id : null
        });

        if (!exists) {
          let mappedReason = 'Other';
          if (VALID_REASONS.includes(report.reason)) {
            mappedReason = report.reason;
          }

          const newReport = new MessageReport({
            messageId: msg._id,
            reportedUserId: msg.sender,
            reporterUserId: report.reportedBy ? report.reportedBy._id : null,
            groupId: msg.chat,
            reason: mappedReason,
            description: 'Migrated from inline message reports',
            status: 'PENDING',
            createdAt: report.createdAt || new Date(),
            updatedAt: report.createdAt || new Date()
          });
          
          await newReport.save();
          count++;
          console.log(`Migrated report for message ${msg._id}`);
        }
      }
    }

    console.log(`Migration complete. Migrated ${count} reports to MessageReport collection.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

migrate();
