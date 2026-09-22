const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const GroupActivity = require('../models/GroupActivity');
const Notification = require('../models/Notification');
const crypto = require('crypto');

// Helper to get fully populated conversation
const getFullConversation = async (convId) => {
  return await Conversation.findById(convId)
    .populate('participants', '-password')
    .populate('pendingParticipants', '-password')
    .populate('groupAdmin', '-password')
    .populate('groupAdmins', '-password');
};

// Helper to check admin status
const isAdmin = (conversation, userId) => {
  if (!conversation.isGroup) return false;
  const idStr = String(userId);
  if (conversation.groupAdmin && String(conversation.groupAdmin) === idStr) return true;
  if (conversation.groupAdmins && conversation.groupAdmins.some(id => String(id) === idStr)) return true;
  return false;
};

// Helper to log activity and emit system message
const logActivity = async (req, conversationId, action, targetUserId = null, details = '') => {
  try {
    const adminId = req.user._id;
    await GroupActivity.create({
      conversationId,
      adminId,
      action,
      targetUserId,
      details,
    });
    
    const senderName = req.user.name || 'Admin';
    let systemText = details;
    
    if (action === 'updated_settings') systemText = details ? `${senderName} ${details}` : `${senderName} updated group settings`;
    else if (action === 'added_member') {
      if (targetUserId) {
        const target = await User.findById(targetUserId);
        systemText = `${senderName} added ${target ? target.name : 'a member'}`;
      }
    } else if (action === 'removed_member') {
      if (targetUserId) {
        const target = await User.findById(targetUserId);
        systemText = `${senderName} removed ${target ? target.name : 'a member'}`;
      }
    } else if (action === 'left_group') {
      systemText = `${senderName} left the group`;
    } else if (action === 'promoted_admin') {
      if (targetUserId) {
        const target = await User.findById(targetUserId);
        systemText = `${senderName} promoted ${target ? target.name : 'a member'} to Admin`;
      }
    } else if (action === 'demoted_admin') {
      if (targetUserId) {
        const target = await User.findById(targetUserId);
        systemText = `${senderName} removed Admin rights from ${target ? target.name : 'a member'}`;
      }
    } else if (action === 'reset_invite_link') {
      systemText = `${senderName} reset the group invite link`;
    } else if (action === 'joined_via_invite') {
      systemText = `${senderName} joined via invite link`;
    } else if (action === 'deleted_message') {
      systemText = `${senderName} deleted a message`;
    }

    const sysMsg = await Message.create({
      conversationId,
      sender: adminId,
      text: systemText,
      messageType: 'system'
    });
    
    await Conversation.findByIdAndUpdate(conversationId, { latestMessage: sysMsg._id });
    
    const populatedMessage = await Message.findById(sysMsg._id).populate('sender', 'name profileImage');
    const io = req.app.get('io');
    if (io) {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.participants.forEach(pId => {
          io.to(pId.toString()).emit('message_received', populatedMessage);
        });
      }
    }
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};
exports.updateGroupSettings = async (req, res) => {
  try {
    console.log("UPDATE SETTINGS REQ.BODY:", req.body);
    console.log("UPDATE SETTINGS REQ.FILE:", req.file);
    const { groupName, groupDescription, announcementMode, permissions } = req.body;
    let groupImage = req.body.groupImage;
    
    if (req.file) {
      groupImage = req.file.path;
    }

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) return res.status(404).json({ message: 'Group not found' });
    if (!isAdmin(conversation, req.user._id)) return res.status(403).json({ message: 'Only admins can update settings' });

    const updates = [];
    if (groupName !== undefined && groupName !== conversation.groupName) {
      conversation.groupName = groupName;
      updates.push('group name');
    }
    if (groupDescription !== undefined && groupDescription !== conversation.groupDescription) {
      conversation.groupDescription = groupDescription;
      updates.push('group description');
    }
    if (groupImage !== undefined && groupImage !== conversation.groupImage) {
      conversation.groupImage = groupImage;
      updates.push('group profile photo');
    }
    if (announcementMode !== undefined) {
      const newMode = announcementMode === 'true' || announcementMode === true;
      if (conversation.announcementMode !== newMode) {
        conversation.announcementMode = newMode;
        updates.push(newMode ? 'announcement mode (enabled)' : 'announcement mode (disabled)');
      }
    }
    
    if (permissions) {
      let perms = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
      conversation.permissions = { ...conversation.permissions, ...perms };
      updates.push('group permissions');
    }

    await conversation.save();
    
    let detailsStr = 'updated group settings';
    if (updates.length > 0) {
      if (updates.length === 1) {
        detailsStr = `updated the ${updates[0]}`;
      } else if (updates.length === 2) {
        detailsStr = `updated the ${updates[0]} and ${updates[1]}`;
      } else {
        const last = updates.pop();
        detailsStr = `updated the ${updates.join(', ')}, and ${last}`;
      }
    }
    
    await logActivity(req, conversation._id, 'updated_settings', null, detailsStr);
    
    const updated = await getFullConversation(conversation._id);
    
    const io = req.app.get('io');
    if (io) {
      conversation.participants.forEach(pId => {
        io.to(pId.toString()).emit('conversation_updated', updated);
      });
    }
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addMembers = async (req, res) => {
  try {
    const { userIds } = req.body; // Array of user IDs
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) return res.status(404).json({ message: 'Group not found' });
    if (!isAdmin(conversation, req.user._id) && !conversation.permissions?.addMembers) {
      return res.status(403).json({ message: 'You do not have permission to add members' });
    }

    const addedUsers = [];
    for (const userId of userIds) {
      if (conversation.blockedUsers?.includes(userId)) continue; // skip blocked
      if (!conversation.participants.includes(userId)) {
        conversation.participants.push(userId);
        addedUsers.push(userId);
        await logActivity(req, conversation._id, 'added_member', userId, 'Added to group');
      }
    }

    await conversation.save();
    const updated = await getFullConversation(conversation._id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const { block } = req.query; // ?block=true
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) return res.status(404).json({ message: 'Group not found' });
    
    // User can leave on their own, or admin can remove them
    const isSelfLeave = String(req.user._id) === String(userId);
    if (!isSelfLeave && !isAdmin(conversation, req.user._id)) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    conversation.participants = conversation.participants.filter(p => String(p) !== String(userId));
    conversation.groupAdmins = conversation.groupAdmins?.filter(a => String(a) !== String(userId));
    if (String(conversation.groupAdmin) === String(userId)) conversation.groupAdmin = null;

    if (block === 'true' && !isSelfLeave && isAdmin(conversation, req.user._id)) {
      if (!conversation.blockedUsers) conversation.blockedUsers = [];
      conversation.blockedUsers.push(userId);
      await logActivity(req, conversation._id, 'blocked_member', userId, 'Blocked from group');
    } else {
      const action = isSelfLeave ? 'left_group' : 'removed_member';
      await logActivity(req, conversation._id, action, userId, isSelfLeave ? 'Left the group' : 'Removed from group');
    }

    await conversation.save();
    const updated = await getFullConversation(conversation._id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.promoteAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) return res.status(404).json({ message: 'Group not found' });
    if (!isAdmin(conversation, req.user._id)) return res.status(403).json({ message: 'Only admins can promote' });

    if (!conversation.groupAdmins) conversation.groupAdmins = [];
    if (!conversation.groupAdmins.includes(userId)) {
      conversation.groupAdmins.push(userId);
      await logActivity(req, conversation._id, 'promoted_admin', userId, 'Promoted to admin');
    }

    await conversation.save();
    const updated = await getFullConversation(conversation._id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.demoteAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) return res.status(404).json({ message: 'Group not found' });
    if (!isAdmin(conversation, req.user._id)) return res.status(403).json({ message: 'Only admins can demote' });

    if (conversation.groupAdmins) {
      conversation.groupAdmins = conversation.groupAdmins.filter(id => String(id) !== String(userId));
    }
    if (String(conversation.groupAdmin) === String(userId)) {
      conversation.groupAdmin = null;
    }

    await logActivity(req, conversation._id, 'demoted_admin', userId, 'Demoted from admin');
    
    await conversation.save();
    const updated = await getFullConversation(conversation._id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateInviteLink = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) return res.status(404).json({ message: 'Group not found' });
    if (!isAdmin(conversation, req.user._id)) return res.status(403).json({ message: 'Only admins can generate invite links' });

    // Generate a random 8-character hex string
    const code = crypto.randomBytes(4).toString('hex');
    conversation.inviteCode = code;
    
    await conversation.save();
    await logActivity(req, conversation._id, 'reset_invite_link', null, 'Reset group invite link');
    
    res.json({ inviteCode: code });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.joinViaInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const conversation = await Conversation.findOne({ inviteCode, isGroup: true });

    if (!conversation) return res.status(404).json({ message: 'Invalid or expired invite link' });
    
    if (conversation.blockedUsers?.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are blocked from joining this group' });
    }

    if (!conversation.participants.includes(req.user._id)) {
      conversation.participants.push(req.user._id);
      await logActivity(req, conversation._id, 'joined_via_invite', req.user._id, 'Joined via invite link');
      await conversation.save();
    }

    const updated = await getFullConversation(conversation._id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Group not found' });
    if (!isAdmin(conversation, req.user._id)) return res.status(403).json({ message: 'Only admins can view activity logs' });

    const logs = await GroupActivity.find({ conversationId: req.params.id })
      .populate('adminId', 'name profileImage')
      .populate('targetUserId', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reportMessage = async (req, res) => {
  try {
    const { msgId } = req.params;
    const { reason, description } = req.body;
    
    const message = await Message.findById(msgId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.sender.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot report your own message' });
    }

    const MessageReport = require('../models/MessageReport');
    
    const existingReport = await MessageReport.findOne({ messageId: msgId, reporterUserId: req.user._id });
    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this message' });
    }

    const report = await MessageReport.create({
      messageId: msgId,
      groupId: message.conversationId,
      reporterUserId: req.user._id,
      reportedUserId: message.sender,
      reason,
      description
    });

    // Create system notification for admins
    const notification = await Notification.create({
      type: 'REPORT',
      message: `${req.user.name} reported a message: "${reason}"`,
      relatedUser: req.user._id,
      relatedMessage: message._id
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('new_admin_notification', await notification.populate('relatedUser', 'name email profileImage'));
      io.emit('new_message_report', report);
    }

    res.json({ success: true, message: 'Message reported successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Group not found' });
    if (!isAdmin(conversation, req.user._id)) return res.status(403).json({ message: 'Only admins can view reports' });

    const reportedMessages = await Message.find({ 
      conversationId: req.params.id,
      'reports.0': { $exists: true } 
    }).populate('sender', 'name profileImage').populate('reports.reportedBy', 'name');

    res.json(reportedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminDeleteMessage = async (req, res) => {
  try {
    const { id: conversationId, msgId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) return res.status(404).json({ message: 'Group not found' });
    if (!isAdmin(conversation, req.user._id)) return res.status(403).json({ message: 'Only admins can moderate messages' });

    const message = await Message.findById(msgId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.isDeleted = true;
    message.text = 'This message was deleted by an admin.';
    message.file = '';
    message.attachments = [];
    message.deletedBy.push(req.user._id);

    await message.save();
    await logActivity(req, conversation._id, 'deleted_message', message.sender, 'Admin deleted a message');

    const io = req.app.get('io');
    if (io) {
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'name profileImage email')
        .populate('replyTo');
      conversation.participants.forEach(pId => {
        io.to(pId.toString()).emit('message_reaction_updated', populatedMessage);
      });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.togglePinMessage = async (req, res) => {
  try {
    const { id: conversationId, msgId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) return res.status(404).json({ message: 'Group not found' });
    if (!isAdmin(conversation, req.user._id)) return res.status(403).json({ message: 'Only admins can pin messages' });

    if (!conversation.pinnedMessages) conversation.pinnedMessages = [];

    const isPinned = conversation.pinnedMessages.includes(msgId);
    if (isPinned) {
      conversation.pinnedMessages = conversation.pinnedMessages.filter(id => String(id) !== String(msgId));
      await logActivity(req, conversation._id, 'unpinned_message', null, 'Unpinned a message');
    } else {
      conversation.pinnedMessages.push(msgId);
      await logActivity(req, conversation._id, 'pinned_message', null, 'Pinned a message');
    }

    await conversation.save();
    
    const io = req.app.get('io');
    if (io) {
      const updatedConv = await getFullConversation(conversation._id);
      conversation.participants.forEach(pId => {
        io.to(pId.toString()).emit('conversation_updated', updatedConv);
      });
    }

    res.json(conversation.pinnedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
