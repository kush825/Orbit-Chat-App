const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const User = require('./models/User');

const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const migrateReports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const messages = await Message.find({ 'reports.0': { $exists: true } }).populate('reports.reportedBy');
    
    let count = 0;
    for (const msg of messages) {
      for (const report of msg.reports) {
        // Check if notification already exists
        const exists = await Notification.findOne({
          type: 'REPORT',
          relatedMessage: msg._id,
          relatedUser: report.reportedBy ? report.reportedBy._id : null
        });

        if (!exists) {
          await Notification.create({
            type: 'REPORT',
            message: `${report.reportedBy ? report.reportedBy.name : 'A user'} reported a message: "${report.reason}"`,
            relatedUser: report.reportedBy ? report.reportedBy._id : null,
            relatedMessage: msg._id,
            isRead: false,
            createdAt: report.createdAt || new Date()
          });
          count++;
        }
      }
    }
    console.log(`Migrated ${count} existing reports into notifications.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrateReports();
