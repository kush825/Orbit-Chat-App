const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// @desc    Get all messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
const allMessages = async (req, res) => {
  try {
    const messages = await Message.find({ 
      conversationId: req.params.conversationId,
      deletedBy: { $ne: req.user._id }
    })
      .populate('sender', 'name profileImage email bio isOnline lastSeen')
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'name profileImage email' } })
      .populate('readBy.user', 'name profileImage')
      .populate('reactions.user', 'name profileImage')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message (HTTP route, works alongside Socket.IO)
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  const { text, conversationId, replyTo, replyToAttachmentUrl, isForwarded } = req.body;

  if (!conversationId) {
    return res.status(400).json({ message: 'Invalid data passed into request' });
  }

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    if (conversation.isGroup) {
      if (!conversation.participants.includes(req.user._id)) {
        return res.status(403).json({ message: 'You must accept the group invitation to send messages' });
      }
    } else {
      if (conversation.status && conversation.status !== 'accepted') {
        return res.status(403).json({ message: 'Conversation request must be accepted first' });
      }
    }
  } catch (err) {
    return res.status(500).json({ message: 'Error checking conversation status' });
  }

  let fileUrl = req.body.existingFileUrl || '';
  let fileName = req.body.existingFileName || '';
  let fileType = req.body.existingFileType || '';
  let messageType = req.body.existingMessageType || 'text';
  let attachments = [];

  if (req.body.existingAttachments) {
    try {
      attachments = JSON.parse(req.body.existingAttachments);
    } catch (e) {
      console.error('Failed to parse existingAttachments');
    }
  }

  if (req.files && req.files.length > 0) {
    attachments = req.files.map(f => ({
      url: `/uploads/${f.filename}`,
      name: f.originalname,
      type: f.mimetype,
    }));
    fileUrl = attachments[0].url;
    fileName = attachments[0].name;
    fileType = attachments[0].type;
    
    const isAudio = attachments[0].type.startsWith('audio/') || attachments[0].type === 'video/webm' || attachments[0].name.endsWith('.webm');
    messageType = attachments[0].type.startsWith('image/') ? 'image' : isAudio ? 'audio' : 'file';
  } else if (req.file) {
    fileUrl = `/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
    fileType = req.file.mimetype;

    const isAudio = req.file.mimetype.startsWith('audio/') || req.file.mimetype === 'video/webm' || req.file.originalname.endsWith('.webm');
    messageType = req.file.mimetype.startsWith('image/') ? 'image' : isAudio ? 'audio' : 'file';
  }

  if (!text && !fileUrl && attachments.length === 0) {
    return res.status(400).json({ message: 'Message text or attachment is required' });
  }

  try {
    const conversation = await Conversation.findById(conversationId);
    if (conversation && conversation.isGroup) {
      const idStr = String(req.user._id);
      const isGroupAdmin = (conversation.groupAdmin && String(conversation.groupAdmin) === idStr) || 
                           (conversation.groupAdmins && conversation.groupAdmins.some(id => String(id) === idStr));

      if (conversation.announcementMode && !isGroupAdmin) {
        return res.status(403).json({ message: 'This group is in announcement mode. Only admins can send messages.' });
      }

      if (!isGroupAdmin && conversation.permissions) {
        if (!conversation.permissions.sendMessages) {
          return res.status(403).json({ message: 'You do not have permission to send messages in this group.' });
        }
        if (messageType === 'image' && !conversation.permissions.sendMedia) {
          return res.status(403).json({ message: 'You do not have permission to send media.' });
        }
        if (messageType === 'file' && !conversation.permissions.sendFiles) {
          return res.status(403).json({ message: 'You do not have permission to send files.' });
        }
        // Additional checks like sendLinks can be implemented by regex checking the text
        if (text && !conversation.permissions.sendLinks) {
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          if (text.match(urlRegex)) {
            return res.status(403).json({ message: 'You do not have permission to send links.' });
          }
        }
      }
    }
  } catch (err) {
    return res.status(500).json({ message: 'Error verifying permissions' });
  }

  const newMessageData = {
    sender: req.user._id,
    text: text || '',
    conversationId,
    file: fileUrl,
    fileName,
    fileType,
    attachments,
    messageType,
    isForwarded: isForwarded === 'true' || isForwarded === true,
    replyTo: replyTo || null,
    replyToAttachmentUrl: replyToAttachmentUrl || null,
    readBy: [{ user: req.user._id, readAt: new Date() }],
  };

  try {
    const message = await Message.create(newMessageData);

    const populatedMessage = await Message.findById(message._id).populate([
      { path: 'sender', select: 'name profileImage email bio isOnline lastSeen' },
      { path: 'replyTo', populate: { path: 'sender', select: 'name profileImage email' } },
      { path: 'readBy.user', select: 'name profileImage' },
      { path: 'conversationId', select: 'participants isGroup groupName groupImage groupAdmin' }
    ]);

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: populatedMessage._id,
      deletedBy: [] // Revive the chat for everyone since a new message arrived
    });

    res.json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Edit a message
// @route   PUT /api/messages/:id
// @access  Private
const editMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    const updated = await Message.findById(message._id).populate([
      { path: 'sender', select: 'name profileImage email' },
      { path: 'replyTo', populate: { path: 'sender', select: 'name profileImage email' } }
    ]);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    const type = req.query.type || 'for_everyone';

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const isWithinTimeLimit = (Date.now() - new Date(message.createdAt).getTime()) < FORTY_EIGHT_HOURS;
    const isSender = message.sender.toString() === req.user._id.toString();

    // If they want to delete for everyone, verify they are the sender AND within time limit
    if (type === 'for_everyone') {
      if (!isSender) {
        return res.status(403).json({ message: 'Not authorized to delete this message for everyone' });
      }
      if (!isWithinTimeLimit) {
        return res.status(403).json({ message: 'Time limit for deleting this message for everyone has passed' });
      }

      message.isDeleted = true;
      message.text = 'This message was deleted';
      message.file = '';
      message.fileName = '';
      message.fileType = '';
      await message.save();

      const updated = await Message.findById(message._id)
        .populate('sender', 'name profileImage email')
        .populate('replyTo');

      return res.json(updated);
    } 
    
    // Fallback: Delete for Me
    if (!message.deletedBy.includes(req.user._id)) {
      message.deletedBy.push(req.user._id);
      await message.save();
    }
    return res.json({ _id: message._id, deletedForMe: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle emoji reaction on message
// @route   POST /api/messages/:id/react
// @access  Private
const reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        // Remove reaction if same emoji tapped again
        message.reactions.splice(existingIndex, 1);
      } else {
        // Update emoji
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      // Add reaction
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('sender', 'name profileImage email')
      .populate('reactions.user', 'name profileImage');

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clear all messages in a conversation
// @route   DELETE /api/messages/conversation/:conversationId
// @access  Private
const clearChatMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Check if user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to clear this chat' });
    }

    // Instead of hard-deleting, mark as deleted for the current user
    await Message.updateMany(
      { conversationId, deletedBy: { $ne: req.user._id } },
      { $push: { deletedBy: req.user._id } }
    );
    
    // Find if there is a remaining lastMessage that the user HAS NOT deleted
    const actualLastMsg = await Message.findOne({
      conversationId,
      deletedBy: { $ne: req.user._id }
    }).sort({ createdAt: -1 });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: actualLastMsg ? actualLastMsg._id : null,
    });

    res.json({ message: 'Chat cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  allMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  clearChatMessages,
};
