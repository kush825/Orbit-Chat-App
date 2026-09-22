const mongoose = require('mongoose');

const messageReportSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null, // Null if private chat
    },
    reporterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // The sender of the message being reported
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'Spam',
        'Harassment',
        'Bullying',
        'Hate Speech',
        'Violence',
        'Sexual Content',
        'Scam/Fraud',
        'Fake Information',
        'Inappropriate Content',
        'Other'
      ],
    },
    description: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'],
      default: 'PENDING',
    },
    actionTaken: {
      type: String,
      enum: [
        'NONE',
        'MESSAGE_DELETED',
        'USER_WARNED',
        'USER_RESTRICTED',
        'USER_REMOVED',
        'USER_BANNED'
      ],
      default: 'NONE',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin', // Using Admin model since SuperAdmins do the reviewing.
      default: null,
    },
    adminNote: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to prevent the same user from reporting the same message multiple times
messageReportSchema.index({ messageId: 1, reporterUserId: 1 }, { unique: true });

module.exports = mongoose.model('MessageReport', messageReportSchema);
