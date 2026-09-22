const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_jwt_key_chat_app_2026', {
    expiresIn: '30d',
  });
};

const generateOTP = () => {
  // Generate 6 digit secure random OTP
  return Math.floor(100000 + crypto.randomInt(900000)).toString();
};

// @desc    Initiate Registration & Send OTP
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, bio, profileImage } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ message: 'Password must contain uppercase, lowercase, number, and special character' });
    }

    // Check if user already exists and is verified
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Check if they already have a pending registration, delete it to start fresh or just overwrite
    await PendingRegistration.deleteMany({ email });

    const otp = generateOTP();
    
    // Hash password and OTP
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const otpHash = await bcrypt.hash(otp, salt);

    // Save to pending registrations
    await PendingRegistration.create({
      name,
      email,
      passwordHash,
      bio: bio || 'Hey there! I am using ChatApp.',
      profileImage: profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      otpHash,
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      lastOtpSentAt: new Date(),
    });

    // Send email asynchronously (don't wait)
    sendVerificationEmail(email, name, otp).catch(err => console.error('Background email error:', err));

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and Create Account
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const pendingReg = await PendingRegistration.findOne({ email });
    
    if (!pendingReg) {
      // It might be already verified or expired
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'This email has already been verified.' });
      }
      return res.status(400).json({ message: 'Registration session expired. Please register again.' });
    }

    if (pendingReg.otpAttempts >= 5) {
      await PendingRegistration.deleteOne({ email });
      return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new OTP by registering again.' });
    }

    if (new Date() > pendingReg.otpExpiresAt) {
      return res.status(400).json({ message: 'This OTP has expired. Please request a new OTP.' });
    }

    const isMatch = await bcrypt.compare(otp, pendingReg.otpHash);

    if (!isMatch) {
      pendingReg.otpAttempts += 1;
      await pendingReg.save();
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // OTP is valid! Create the actual User
    const user = await User.create({
      name: pendingReg.name,
      email: pendingReg.email,
      password: pendingReg.passwordHash, // We'll need to modify User model to accept pre-hashed password or bypass hooks
      bio: pendingReg.bio,
      profileImage: pendingReg.profileImage,
      emailVerified: true,
      isOnline: true,
      lastSeen: new Date(),
    });

    // Delete the pending registration
    await PendingRegistration.deleteOne({ email });

    // Send the beautiful welcome email asynchronously completely in the background
    setTimeout(() => {
      sendWelcomeEmail(user.email, user.name).catch(err => console.error('Welcome email error:', err));
    }, 0);

    res.status(201).json({
      success: true,
      message: 'Email verified and account created successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        bio: user.bio,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
        token: generateToken(user._id),
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const pendingReg = await PendingRegistration.findOne({ email });

    if (!pendingReg) {
      return res.status(400).json({ message: 'Registration session expired. Please register again.' });
    }

    // Check cooldown (60 seconds)
    const timeSinceLastOtp = Date.now() - new Date(pendingReg.lastOtpSentAt).getTime();
    if (timeSinceLastOtp < 60000) {
      const waitTime = Math.ceil((60000 - timeSinceLastOtp) / 1000);
      return res.status(429).json({ message: `Please wait ${waitTime} seconds before requesting a new OTP.` });
    }

    const otp = generateOTP();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    pendingReg.otpHash = otpHash;
    pendingReg.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    pendingReg.lastOtpSentAt = new Date();
    pendingReg.otpAttempts = 0; // Reset attempts on resend
    await pendingReg.save();

    sendVerificationEmail(pendingReg.email, pendingReg.name, otp).catch(err => console.error('Background email error:', err));

    res.status(200).json({
      success: true,
      message: 'A new OTP has been sent'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      if (user.isBlocked) {
        return res.status(403).json({ message: 'Your account has been blocked by an administrator.' });
      }
      if (!user.isActive) {
        return res.status(403).json({ message: 'Your account has been deactivated.' });
      }

      user.isOnline = true;
      await user.save();

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        bio: user.bio,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        isAdmin: user.isAdmin,
        blockedUsers: user.blockedUsers || [],
        emailVerified: user.emailVerified,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Seed test users (Kush, Rahul, Priya, Amit) if DB is empty
// @route   POST /api/auth/seed
// @access  Public
const seedUsers = async (req, res) => {
  try {
    const testUsers = [
      { name: 'Kush', email: 'kush@example.com', password: 'password123', bio: 'Building awesome apps 🚀', profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kush', emailVerified: true },
      { name: 'Rahul', email: 'rahul@example.com', password: 'password123', bio: 'Design & Code Enthusiast 🎨', profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul', emailVerified: true },
      { name: 'Priya', email: 'priya@example.com', password: 'password123', bio: 'Full-stack developer 💻', profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya', emailVerified: true },
      { name: 'Amit', email: 'amit@example.com', password: 'password123', bio: 'Coffee & Algorithms ☕', profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit', emailVerified: true },
    ];

    const createdUsers = [];
    for (const u of testUsers) {
      let existing = await User.findOne({ email: u.email });
      if (!existing) {
        const salt = await bcrypt.genSalt(10);
        u.password = await bcrypt.hash(u.password, salt);
        existing = await User.create(u);
      }
      createdUsers.push(existing);
    }

    res.json({ message: 'Seed accounts ready', users: createdUsers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change registration email
// @route   POST /api/auth/change-registration-email
// @access  Public
const changeRegistrationEmail = async (req, res) => {
  try {
    const { oldEmail, newEmail } = req.body;
    if (!oldEmail || !newEmail) {
      return res.status(400).json({ message: 'Both old and new email are required' });
    }

    const pendingReg = await PendingRegistration.findOne({ email: oldEmail });
    if (!pendingReg) {
      return res.status(400).json({ message: 'Registration session expired. Please register again.' });
    }

    const userExists = await User.findOne({ email: newEmail });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this new email already exists.' });
    }

    const otp = generateOTP();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    pendingReg.email = newEmail;
    pendingReg.otpHash = otpHash;
    pendingReg.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    pendingReg.lastOtpSentAt = new Date();
    pendingReg.otpAttempts = 0;
    await pendingReg.save();

    sendVerificationEmail(newEmail, pendingReg.name, otp).catch(err => console.error('Background email error:', err));

    res.status(200).json({
      success: true,
      message: 'Email updated and new OTP sent.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request Password Reset (Generates OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if user exists, just return success
      return res.status(200).json({ success: true, message: 'If an account exists, a reset email has been sent.' });
    }

    const otp = generateOTP();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    user.resetPasswordOtpHash = otpHash;
    user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    sendPasswordResetEmail(user.email, user.name, otp).catch(err => console.error('Background email error:', err));

    res.status(200).json({ success: true, message: 'Password reset email sent.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check expiration
    if (new Date() > user.resetPasswordOtpExpires) {
      user.resetPasswordOtpHash = null;
      user.resetPasswordOtpExpires = null;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    const isMatch = await bcrypt.compare(otp.toString(), user.resetPasswordOtpHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ message: 'Password must contain uppercase, lowercase, number, and special character' });
    }

    // Hash new password and save
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    
    // Clear OTP fields
    user.resetPasswordOtpHash = null;
    user.resetPasswordOtpExpires = null;
    await user.save();

    res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  verifyOtp,
  resendOtp,
  changeRegistrationEmail,
  loginUser,
  logoutUser,
  seedUsers,
  forgotPassword,
  resetPassword,
};
