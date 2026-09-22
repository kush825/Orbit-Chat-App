const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Report = require('../models/Report');
const Notification = require('../models/Notification');

// @desc    Get total app statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAppStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalGroups = await Conversation.countDocuments({ isGroup: true });
    const totalMessages = await Message.countDocuments();

    // Calculate dates for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Aggregate User Signups per day
    const userGrowthRaw = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Aggregate Messages Sent per day
    const messageActivityRaw = await Message.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing days with 0
    const fillMissingDays = (data) => {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const existing = data.find(item => item._id === dateStr);
        // Format date nicely like 'Sep 15'
        const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        result.push({
          date: displayDate,
          fullDate: dateStr,
          count: existing ? existing.count : 0
        });
      }
      return result;
    };

    res.json({
      totalUsers,
      totalGroups,
      totalMessages,
      userGrowth: fillMissingDays(userGrowthRaw),
      messageActivity: fillMissingDays(messageActivityRaw)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get detailed user info, stats, conversations, and reports
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Stats
    const messagesSent = await Message.countDocuments({ sender: user._id });
    
    // Conversations (direct and group)
    const conversations = await Conversation.find({ users: user._id })
      .populate('users', 'name email profileImage')
      .populate('latestMessage');
      
    const groupsJoined = conversations.filter(c => c.isGroupChat).length;
    const directChats = conversations.filter(c => !c.isGroupChat).length;

    // Reports
    const reportsReceived = await Report.find({ reportedUser: user._id }).populate('reportedBy', 'name');
    const reportsSubmitted = await Report.countDocuments({ reportedBy: user._id });

    res.json({
      user,
      stats: {
        messagesSent,
        groupsJoined,
        totalConversations: conversations.length,
        reportsReceivedCount: reportsReceived.length,
        reportsSubmitted
      },
      conversations,
      reports: reportsReceived
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle Block User
// @route   PUT /api/admin/users/:id/block
// @access  Private/Admin
const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Soft Delete / Deactivate User
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   DELETE /api/admin/users/:id/hard
// @access  Private/Admin
const hardDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    // Note: To prevent dangling references, you might also want to delete messages
    // sent by this user, or conversations they are part of, but for now we just
    // delete the user record.
    
    res.json({ message: 'User permanently deleted successfully' });
  } catch (error) {
    console.error('Hard Delete User Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/admin/notifications
// @access  Private/Admin
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({})
      .populate('relatedUser', 'name email profileImage')
      .populate('relatedMessage', 'content')
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50 notifications
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/admin/notifications/read
// @access  Private/Admin
const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAppStats, getAllUsers, getUserDetails, toggleBlockUser, deleteUser, hardDeleteUser, getNotifications, markNotificationsRead };

