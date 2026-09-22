const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    pendingParticipants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isGroup: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'accepted',
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    groupName: {
      type: String,
      default: '',
    },
    groupImage: {
      type: String,
      default: '',
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    groupAdmins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    groupDescription: {
      type: String,
      default: '',
    },
    inviteCode: {
      type: String,
      sparse: true,
      unique: true
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    announcementMode: {
      type: Boolean,
      default: false,
    },
    permissions: {
      sendMessages: { type: Boolean, default: true },
      sendMedia: { type: Boolean, default: true },
      sendFiles: { type: Boolean, default: true },
      sendVoice: { type: Boolean, default: true },
      sendLinks: { type: Boolean, default: true },
      editGroupInfo: { type: Boolean, default: false },
      addMembers: { type: Boolean, default: false },
      createPolls: { type: Boolean, default: true },
    },
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    mutedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        until: { type: Date }
      }
    ],
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
