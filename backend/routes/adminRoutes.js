const express = require('express');
const { getAppStats, getAllUsers, deleteUser, hardDeleteUser, getUserDetails, toggleBlockUser, getNotifications, markNotificationsRead } = require('../controllers/adminController');
const { loginAdmin } = require('../controllers/adminAuthController');
const { protectAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

router.post('/login', loginAdmin);

router.route('/stats').get(protectAdmin, getAppStats);
router.route('/users').get(protectAdmin, getAllUsers);
router.route('/users/:id').get(protectAdmin, getUserDetails).delete(protectAdmin, deleteUser);
router.route('/users/:id/block').put(protectAdmin, toggleBlockUser);
router.route('/users/:id/hard').delete(protectAdmin, hardDeleteUser);
router.route('/notifications').get(protectAdmin, getNotifications);
router.route('/notifications/read').put(protectAdmin, markNotificationsRead);

module.exports = router;
