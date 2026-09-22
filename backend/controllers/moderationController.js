const MessageReport = require('../models/MessageReport');
const ModerationHistory = require('../models/ModerationHistory');
const Message = require('../models/Message');
const User = require('../models/User');

// GET /api/reports
exports.getReports = async (req, res) => {
  try {
    const { status, reason, sort = '-createdAt', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (reason) filter.reason = reason;

    const reports = await MessageReport.find(filter)
      .populate('reporterUserId', 'name profileImage')
      .populate('reportedUserId', 'name profileImage')
      .populate('messageId', 'text file messageType isDeleted')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await MessageReport.countDocuments(filter);

    res.json({
      reports,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reports/stats
exports.getReportStats = async (req, res) => {
  try {
    const total = await MessageReport.countDocuments();
    const pending = await MessageReport.countDocuments({ status: 'PENDING' });
    const underReview = await MessageReport.countDocuments({ status: 'UNDER_REVIEW' });
    const resolved = await MessageReport.countDocuments({ status: 'RESOLVED' });
    const dismissed = await MessageReport.countDocuments({ status: 'DISMISSED' });

    res.json({
      total,
      pending,
      underReview,
      resolved,
      dismissed
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/reports/:id
exports.getReportById = async (req, res) => {
  try {
    const report = await MessageReport.findById(req.params.id)
      .populate('reporterUserId', 'name profileImage email')
      .populate('reportedUserId', 'name profileImage email')
      .populate('groupId', 'name isGroup')
      .populate('reviewedBy', 'name');

    if (!report) return res.status(404).json({ message: 'Report not found' });

    // Fetch context messages (10 before, 10 after)
    const reportedMessage = await Message.findById(report.messageId).populate('sender', 'name profileImage');
    
    let contextMessages = [];
    if (reportedMessage) {
      const before = await Message.find({
        conversationId: reportedMessage.conversationId,
        createdAt: { $lt: reportedMessage.createdAt }
      }).sort({ createdAt: -1 }).limit(10).populate('sender', 'name profileImage');
      
      const after = await Message.find({
        conversationId: reportedMessage.conversationId,
        createdAt: { $gt: reportedMessage.createdAt }
      }).sort({ createdAt: 1 }).limit(10).populate('sender', 'name profileImage');

      contextMessages = [...before.reverse(), reportedMessage, ...after];
    }

    res.json({ report, reportedMessage, contextMessages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/reports/:id/status
exports.updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const report = await MessageReport.findByIdAndUpdate(
      req.params.id,
      { status, reviewedBy: req.admin._id, reviewedAt: new Date() },
      { new: true }
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper for logging history
const logModeration = async (adminId, targetUserId, action, reason, groupId, reportId) => {
  await ModerationHistory.create({
    adminId,
    targetUserId,
    action,
    reason,
    groupId,
    relatedMessageReportId: reportId
  });
};

// POST /api/reports/:id/dismiss
exports.dismissReport = async (req, res) => {
  try {
    const { adminNote } = req.body;
    const report = await MessageReport.findByIdAndUpdate(
      req.params.id,
      { status: 'DISMISSED', adminNote, reviewedBy: req.admin._id, reviewedAt: new Date() },
      { new: true }
    );
    await logModeration(req.admin._id, report.reportedUserId, 'REPORT_DISMISSED', adminNote || 'No violation found', report.groupId, report._id);
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/reports/:id/delete-message
exports.deleteMessage = async (req, res) => {
  try {
    const { adminNote } = req.body;
    const report = await MessageReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    // Actually delete or tombstone the message
    await Message.findByIdAndUpdate(report.messageId, {
      text: 'This message was removed by an administrator.',
      file: '',
      fileName: '',
      fileType: '',
      isDeleted: true
    });

    report.status = 'RESOLVED';
    report.actionTaken = 'MESSAGE_DELETED';
    report.adminNote = adminNote;
    report.reviewedBy = req.admin._id;
    report.reviewedAt = new Date();
    await report.save();

    await logModeration(req.admin._id, report.reportedUserId, 'MESSAGE_DELETED', adminNote || 'Violates community guidelines', report.groupId, report._id);

    // Notify clients to update message
    const io = req.app.get('io');
    if (io) {
      io.to(report.groupId.toString()).emit('message_deleted_admin', report.messageId);
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/reports/:id/warn-user
exports.warnUser = async (req, res) => {
  try {
    const { adminNote } = req.body;
    const report = await MessageReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = 'RESOLVED';
    report.actionTaken = 'USER_WARNED';
    report.adminNote = adminNote;
    report.reviewedBy = req.admin._id;
    report.reviewedAt = new Date();
    await report.save();

    await logModeration(req.admin._id, report.reportedUserId, 'USER_WARNED', adminNote, report.groupId, report._id);

    // You might also create a Notification in the DB for the user here
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/reports/:id/restrict-user
exports.restrictUser = async (req, res) => {
  try {
    const { adminNote, durationHours, restrictions } = req.body;
    const report = await MessageReport.findById(req.params.id);
    
    const restrictionEnd = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    
    await User.findByIdAndUpdate(report.reportedUserId, {
      restrictionEnd,
      restrictionReason: adminNote,
      restrictedCapabilities: restrictions
    });

    report.status = 'RESOLVED';
    report.actionTaken = 'USER_RESTRICTED';
    report.adminNote = adminNote;
    report.reviewedBy = req.admin._id;
    report.reviewedAt = new Date();
    await report.save();

    await logModeration(req.admin._id, report.reportedUserId, 'USER_RESTRICTED', adminNote, report.groupId, report._id);

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/moderation/history
exports.getModerationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const history = await ModerationHistory.find()
      .populate('adminId', 'name profileImage email')
      .populate('targetUserId', 'name profileImage email')
      .populate('groupId', 'name isGroup')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ModerationHistory.countDocuments();

    res.json({ history, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
