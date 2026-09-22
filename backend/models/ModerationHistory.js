const mongoose = require('mongoose');

const moderationHistorySchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin', // Ensure this maps to the person doing the moderating
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'MESSAGE_DELETED',
        'USER_WARNED',
        'USER_RESTRICTED',
        'USER_REMOVED',
        'USER_BANNED',
        'REPORT_DISMISSED'
      ],
    },
    reason: {
      type: String,
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null, // Context of the moderation, if applicable
    },
    relatedMessageReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageReport',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ModerationHistory', moderationHistorySchema);
