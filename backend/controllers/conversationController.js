const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Message = require('../models/Message');

// @desc    Access or create a 1-to-1 conversation
// @route   POST /api/conversations
// @access  Private
const accessConversation = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'UserId param not sent with request' });
  }

  try {
    let isConversation = await Conversation.find({
      isGroup: false,
      $and: [
        { participants: { $elemMatch: { $eq: req.user._id } } },
        { participants: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('participants', '-password')
      .populate('lastMessage');

    isConversation = await User.populate(isConversation, {
      path: 'lastMessage.sender',
      select: 'name profileImage email',
    });

    if (isConversation.length > 0) {
      const conv = isConversation[0];
      if (conv.deletedBy && conv.deletedBy.some(id => id.toString() === req.user._id.toString())) {
        conv.deletedBy = conv.deletedBy.filter(id => id.toString() !== req.user._id.toString());
        await conv.save();
      }
      res.send(conv);
    } else {
      const conversationData = {
        groupName: 'sender',
        isGroup: false,
        participants: [req.user._id, userId],
        status: 'pending',
        initiatedBy: req.user._id
      };

      const createdConversation = await Conversation.create(conversationData);
      const fullConversation = await Conversation.findOne({
        _id: createdConversation._id,
      }).populate('participants', '-password');

      res.status(200).send(fullConversation);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch all conversations for a user
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    let conversations = await Conversation.find({
      $and: [
        { deletedBy: { $ne: req.user._id } },
        {
          $or: [
            { participants: { $elemMatch: { $eq: req.user._id } } },
            { pendingParticipants: { $elemMatch: { $eq: req.user._id } } }
          ]
        }
      ]
    })
      .populate('participants', '-password')
      .populate('pendingParticipants', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    conversations = await User.populate(conversations, {
      path: 'lastMessage.sender',
      select: 'name profileImage email',
    });

    // Convert to plain objects to allow modifying lastMessage safely
    let plainConversations = conversations.map(c => c.toObject());

    // Fix for "Delete for Me": If the current lastMessage is deleted by the user, find the true last message
    const processedConversations = await Promise.all(
      plainConversations.map(async (c) => {
        if (
          c.lastMessage && 
          c.lastMessage.deletedBy && 
          c.lastMessage.deletedBy.some(id => id.toString() === req.user._id.toString())
        ) {
          const actualLastMsg = await Message.findOne({
            conversationId: c._id,
            deletedBy: { $ne: req.user._id }
          })
            .sort({ createdAt: -1 })
            .populate('sender', 'name profileImage email')
            .lean();
          
          c.lastMessage = actualLastMsg;
        }
        return c;
      })
    );

    res.status(200).send(processedConversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new Group Conversation
// @route   POST /api/conversations/group
// @access  Private
const createGroupConversation = async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: 'Please fill all the fields' });
  }

  let users = typeof req.body.users === 'string' ? JSON.parse(req.body.users) : req.body.users;

  if (users.length < 1) {
    return res
      .status(400)
      .send({ message: 'More than 1 user is required to form a group chat' });
  }

  // Remove admin from invite list if they accidentally included themselves
  users = users.filter(u => u !== req.user._id.toString());

  try {
    let groupImage = req.body.groupImage || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=300&q=80';
    if (req.file) {
      groupImage = `/uploads/${req.file.filename}`;
    }

    const groupChat = await Conversation.create({
      groupName: req.body.name,
      groupImage,
      participants: [req.user._id],
      pendingParticipants: users,
      isGroup: true,
      groupAdmin: req.user._id,
      groupAdmins: [req.user._id],
    });

    const fullGroupChat = await Conversation.findOne({ _id: groupChat._id })
      .populate('participants', '-password')
      .populate('pendingParticipants', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password');

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to group
// @route   PUT /api/conversations/groupadd
// @access  Private
const addToGroup = async (req, res) => {
  const { conversationId, userId } = req.body;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Conversation Not Found' });

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admins can add users to this group' });
    }

    const added = await Conversation.findByIdAndUpdate(
      conversationId,
      { $addToSet: { pendingParticipants: userId } },
      { new: true }
    )
      .populate('participants', '-password')
      .populate('pendingParticipants', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password');

    res.json(added);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove member from group or leave group
// @route   PUT /api/conversations/groupremove
// @access  Private
const removeFromGroup = async (req, res) => {
  const { conversationId, userId } = req.body;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Conversation Not Found' });

    if (conversation.groupAdmin.toString() !== req.user._id.toString() && req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Only admins can remove users, or you can leave the group yourself' });
    }

    const removed = await Conversation.findByIdAndUpdate(
      conversationId,
      { 
        $pull: { participants: userId, pendingParticipants: userId } 
      },
      { new: true }
    )
      .populate('participants', '-password')
      .populate('pendingParticipants', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password');

    res.json(removed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept contact request
// @route   PUT /api/conversations/:id/accept
// @access  Private
const acceptRequest = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    
    if (conversation.isGroup) {
      if (!conversation.pendingParticipants.includes(req.user._id)) {
        return res.status(403).json({ message: 'You do not have a pending invitation for this group' });
      }
      conversation.pendingParticipants = conversation.pendingParticipants.filter(id => id.toString() !== req.user._id.toString());
      if (!conversation.participants.includes(req.user._id)) {
        conversation.participants.push(req.user._id);
      }
    } else {
      if (conversation.initiatedBy.toString() === req.user._id.toString()) {
        return res.status(403).json({ message: 'You cannot accept a request you initiated' });
      }
      if (!conversation.participants.includes(req.user._id)) {
        return res.status(403).json({ message: 'You are not a participant' });
      }
      conversation.status = 'accepted';
    }

    const updated = await conversation.save();
    
    const fullConv = await Conversation.findOne({ _id: updated._id })
      .populate('participants', '-password')
      .populate('pendingParticipants', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password');

    res.json(fullConv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject contact request
// @route   PUT /api/conversations/:id/reject
// @access  Private
const rejectRequest = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    
    if (conversation.isGroup) {
      if (!conversation.pendingParticipants.includes(req.user._id)) {
        return res.status(403).json({ message: 'You do not have a pending invitation for this group' });
      }
      conversation.pendingParticipants = conversation.pendingParticipants.filter(id => id.toString() !== req.user._id.toString());
    } else {
      if (conversation.initiatedBy.toString() === req.user._id.toString()) {
        return res.status(403).json({ message: 'You cannot reject a request you initiated' });
      }
      if (!conversation.participants.includes(req.user._id)) {
        return res.status(403).json({ message: 'You are not a participant' });
      }
      conversation.status = 'rejected';
    }

    const updated = await conversation.save();
    
    const fullConv = await Conversation.findOne({ _id: updated._id })
      .populate('participants', '-password')
      .populate('pendingParticipants', '-password')
      .populate('groupAdmin', '-password')
      .populate('groupAdmins', '-password');

    res.json(fullConv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mute multiple conversations
// @route   PUT /api/conversations/mute
// @access  Private
const muteConversations = async (req, res) => {
  const { conversationIds, duration } = req.body;
  // duration: '8_hours', '1_week', 'always', or 'unmute'

  try {
    let until = null;
    if (duration === '8_hours') until = new Date(Date.now() + 8 * 60 * 60 * 1000);
    else if (duration === '1_week') until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    else if (duration === 'always') until = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // ~100 years

    for (const convId of conversationIds) {
      const conv = await Conversation.findById(convId);
      if (!conv) continue;

      if (!conv.mutedBy) {
        conv.mutedBy = [];
      }

      // Remove existing mute for this user
      conv.mutedBy = conv.mutedBy.filter(m => m.user.toString() !== req.user._id.toString());

      if (duration !== 'unmute') {
        conv.mutedBy.push({ user: req.user._id, until });
      }

      await conv.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete multiple conversations for current user
// @route   PUT /api/conversations/delete
// @access  Private
const deleteConversations = async (req, res) => {
  const { conversationIds } = req.body;

  try {
    for (const convId of conversationIds) {
      const conv = await Conversation.findById(convId);
      if (!conv) continue;

      if (!conv.deletedBy) {
        conv.deletedBy = [];
      }

      const isAlreadyDeleted = conv.deletedBy.some(id => id.toString() === req.user._id.toString());
      if (!isAlreadyDeleted) {
        conv.deletedBy.push(req.user._id);
        await conv.save();
      }
      
      // Always hide all existing messages in this conversation for this user
      // This fixes cases where the conversation was marked deleted but messages weren't wiped
      const Message = require('../models/Message');
      await Message.updateMany(
        { conversationId: convId, deletedBy: { $ne: req.user._id } },
        { $push: { deletedBy: req.user._id } }
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pin/Unpin multiple conversations for current user
// @route   PUT /api/conversations/pin
// @access  Private
const pinConversations = async (req, res) => {
  const { conversationIds } = req.body;

  try {
    for (const convId of conversationIds) {
      const conv = await Conversation.findById(convId);
      if (!conv) continue;

      if (!conv.pinnedBy) {
        conv.pinnedBy = [];
      }

      if (conv.pinnedBy.includes(req.user._id)) {
        conv.pinnedBy = conv.pinnedBy.filter(id => id.toString() !== req.user._id.toString());
      } else {
        conv.pinnedBy.push(req.user._id);
      }
      await conv.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Pin or unpin a message in a conversation
// @route   PUT /api/conversations/:id/messages/:msgId/pin
// @access  Private
const togglePinMessage = async (req, res) => {
  try {
    const { id: conversationId, msgId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    
    // Allow any participant to pin a message
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a participant of this chat' });
    }

    if (!conversation.pinnedMessages) conversation.pinnedMessages = [];

    const isPinned = conversation.pinnedMessages.includes(msgId);
    if (isPinned) {
      conversation.pinnedMessages = conversation.pinnedMessages.filter(id => String(id) !== String(msgId));
    } else {
      conversation.pinnedMessages.push(msgId);
    }

    await conversation.save();
    
    const io = req.app.get('io');
    if (io) {
      const getFullConversation = async (convId) => {
        return await Conversation.findById(convId)
          .populate('participants', '-password')
          .populate('pendingParticipants', '-password')
          .populate('groupAdmin', '-password')
          .populate('groupAdmins', '-password')
          .populate('pinnedMessages');
      };
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

module.exports = {
  accessConversation,
  getConversations,
  createGroupConversation,
  addToGroup,
  removeFromGroup,
  acceptRequest,
  rejectRequest,
  muteConversations,
  deleteConversations,
  pinConversations,
  togglePinMessage
};
