const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: 'Hey there! I am using ChatApp.',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      privacy: {
        lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'nobody' },
        profilePhoto: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
        about: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
        readReceipts: { type: Boolean, default: true },
        typingIndicator: { type: Boolean, default: true }
      },
      notifications: {
        messages: { type: Boolean, default: true },
        groups: { type: Boolean, default: true },
        sound: { type: Boolean, default: true },
        desktop: { type: Boolean, default: true },
        preview: { type: Boolean, default: true }
      },
      chat: {
        enterToSend: { type: Boolean, default: true },
        autoDownloadMedia: { type: Boolean, default: true },
        fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' }
      },
      appearance: {
        theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' }
      }
    },
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pinnedChats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }],
    archivedChats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }],
    dailyUsage: [
      {
        date: { type: String, required: true }, // Format: YYYY-MM-DD
        seconds: { type: Number, default: 0 }
      }
    ],
    role: {
      type: String,
      enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
      default: 'USER',
    },
    restrictionEnd: {
      type: Date,
      default: null,
    },
    restrictionReason: {
      type: String,
      default: '',
    },
    restrictedCapabilities: {
      type: [String],
      enum: [
        'Cannot Send Messages',
        'Cannot Send Media',
        'Cannot Send Files',
        'Cannot Start Calls',
        'Cannot Join Groups'
      ],
      default: [],
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    // Forgot Password OTP Fields
    resetPasswordOtpHash: {
      type: String,
      default: null,
    },
    resetPasswordOtpExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  // Check if it's already a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (/^\$2[aby]\$/.test(this.password)) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Exclude password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
