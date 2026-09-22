const express = require('express');
const router = express.Router();
const {
  getReports,
  getReportStats,
  getReportById,
  updateReportStatus,
  dismissReport,
  deleteMessage,
  warnUser,
  restrictUser,
  getModerationHistory
} = require('../controllers/moderationController');

// Since this is moderation, we need an adminAuth middleware
const { protectAdmin } = require('../middleware/adminMiddleware');

router.use(protectAdmin);

router.get('/reports', getReports);
router.get('/reports/stats', getReportStats);
router.get('/reports/:id', getReportById);
router.patch('/reports/:id/status', updateReportStatus);

router.post('/reports/:id/dismiss', dismissReport);
router.post('/reports/:id/delete-message', deleteMessage);
router.post('/reports/:id/warn-user', warnUser);
router.post('/reports/:id/restrict-user', restrictUser);

router.get('/history', getModerationHistory);

module.exports = router;
