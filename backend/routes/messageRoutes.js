const express = require('express');
const {
  allMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  clearChatMessages,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/:conversationId', protect, allMessages);
router.post('/', protect, upload.array('files', 5), sendMessage);
router.put('/:id', protect, editMessage);
router.delete('/:id', protect, deleteMessage);
router.delete('/conversation/:conversationId', protect, clearChatMessages);
router.post('/:id/react', protect, reactToMessage);

module.exports = router;
