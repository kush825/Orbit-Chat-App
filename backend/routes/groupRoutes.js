const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const groupController = require('../controllers/groupController');

const upload = require('../middleware/uploadMiddleware');

// All group routes require authentication
router.use(protect);

// Group Settings & Management
router.put('/:id/settings', upload.single('groupImage'), groupController.updateGroupSettings);

// Member Management
router.post('/:id/members', groupController.addMembers);
router.delete('/:id/members/:userId', groupController.removeMember);

// Admin Management
router.put('/:id/admins/:userId', groupController.promoteAdmin);
router.delete('/:id/admins/:userId', groupController.demoteAdmin);

// Invite Links
router.post('/:id/invite', groupController.generateInviteLink);
router.post('/join/:inviteCode', groupController.joinViaInvite);

// Activity Logs & Reports
router.get('/:id/activity', groupController.getActivityLogs);
router.get('/:id/reports', groupController.getReports);
router.post('/:id/messages/:msgId/report', groupController.reportMessage);

// Message Moderation
router.delete('/:id/messages/:msgId', groupController.adminDeleteMessage);
router.put('/:id/messages/:msgId/pin', groupController.togglePinMessage);

module.exports = router;
