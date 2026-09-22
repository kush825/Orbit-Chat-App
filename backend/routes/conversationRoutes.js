const express = require('express');
const {
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
} = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protect, accessConversation);
router.get('/', protect, getConversations);
router.put('/mute', protect, muteConversations);
router.put('/delete', protect, deleteConversations);
router.put('/pin', protect, pinConversations);
router.post('/group', protect, upload.single('groupImage'), createGroupConversation);
router.put('/groupadd', protect, addToGroup);
router.put('/groupremove', protect, removeFromGroup);
router.put('/:id/accept', protect, acceptRequest);
router.put('/:id/reject', protect, rejectRequest);
router.put('/:id/messages/:msgId/pin', protect, togglePinMessage);

module.exports = router;
