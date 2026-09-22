const User = require('../models/User');

// @desc    Get all users (excluding current user) or search users
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find({ ...keyword, _id: { $ne: req.user._id } }).select(
      '-password'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      user.profileImage = req.body.profileImage || user.profileImage;

      if (req.file) {
        user.profileImage = `/uploads/${req.file.filename}`;
      }

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        profileImage: updatedUser.profileImage,
        bio: updatedUser.bio,
        isOnline: updatedUser.isOnline,
        lastSeen: updatedUser.lastSeen,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Daily Usage Time
// @route   PUT /api/users/usage-ping
// @access  Private
const updateUsageTime = async (req, res) => {
  try {
    const { durationSeconds } = req.body;
    if (!durationSeconds || typeof durationSeconds !== 'number') {
      return res.status(400).json({ message: 'Invalid durationSeconds' });
    }

    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find if we already have an entry for today
    const usageIndex = user.dailyUsage.findIndex(usage => usage.date === today);
    
    if (usageIndex > -1) {
      user.dailyUsage[usageIndex].seconds += durationSeconds;
    } else {
      user.dailyUsage.push({ date: today, seconds: durationSeconds });
    }

    // Keep array size manageable (e.g., last 30 days)
    if (user.dailyUsage.length > 30) {
      user.dailyUsage.shift();
    }

    await user.save();
    res.json({ message: 'Usage updated', today: user.dailyUsage.find(u => u.date === today) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user settings
// @route   PUT /api/users/settings
// @access  Private
const updateUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.settings = { ...user.settings, ...req.body.settings };
    await user.save();
    res.json({ settings: user.settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle contact (add/remove)
// @route   PUT /api/users/:id/contact
// @access  Private
const toggleContact = async (req, res) => {
  try {
    const { action } = req.body; // 'add' or 'remove'
    const targetUserId = req.params.id;
    const user = await User.findById(req.user._id);

    if (action === 'add' && !user.contacts.includes(targetUserId)) {
      user.contacts.push(targetUserId);
    } else if (action === 'remove') {
      user.contacts = user.contacts.filter(id => id.toString() !== targetUserId);
    }
    await user.save();
    res.json({ contacts: user.contacts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle block user (block/unblock)
// @route   PUT /api/users/:id/block
// @access  Private
const toggleBlock = async (req, res) => {
  try {
    const { action } = req.body; // 'block' or 'unblock'
    const targetUserId = req.params.id;
    const user = await User.findById(req.user._id);

    if (action === 'block' && !user.blockedUsers.includes(targetUserId)) {
      user.blockedUsers.push(targetUserId);
      // Optional: remove from contacts if blocked
      user.contacts = user.contacts.filter(id => id.toString() !== targetUserId);
    } else if (action === 'unblock') {
      user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== targetUserId);
    }
    await user.save();
    res.json({ blockedUsers: user.blockedUsers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get blocked users list
// @route   GET /api/users/blocked
// @access  Private
const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('blockedUsers', 'name profileImage email bio');
    res.json(user.blockedUsers || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete own account
// @route   DELETE /api/users/me
// @access  Private
const deleteMyAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide both current and new passwords' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the current password' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ message: 'Password must contain uppercase, lowercase, number, and special character' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  getUserProfile,
  updateUserProfile,
  updateUsageTime,
  updateUserSettings,
  toggleContact,
  toggleBlock,
  getBlockedUsers,
  deleteMyAccount,
  changePassword,
};
