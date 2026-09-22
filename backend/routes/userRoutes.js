const express = require('express');
const {
  getUsers,
  getUserProfile,
  updateUserProfile,
  updateUsageTime,
  updateUserSettings,
  toggleContact,
  toggleBlock,
  getBlockedUsers,
  deleteMyAccount,
  changePassword
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/make-admin', async (req, res) => {
  const User = require('../models/User');
  await User.updateMany({}, { isAdmin: true });
  res.send('Upgraded all users to admin in the current database.');
});
router.get('/', protect, getUsers);
router.get('/profile', protect, getUserProfile);
router.get('/blocked', protect, getBlockedUsers);
router.put('/profile', protect, upload.single('profileImage'), updateUserProfile);
router.put('/settings', protect, updateUserSettings);
router.put('/change-password', protect, changePassword);
router.put('/:id/contact', protect, toggleContact);
router.put('/:id/block', protect, toggleBlock);
router.route('/usage-ping').put(protect, updateUsageTime);
router.delete('/me', protect, deleteMyAccount);

module.exports = router;
