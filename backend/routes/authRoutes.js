const express = require('express');
const {
  registerUser,
  verifyOtp,
  resendOtp,
  changeRegistrationEmail,
  loginUser,
  logoutUser,
  seedUsers,
  forgotPassword,
  resetPassword,
  testEmailConfig,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/change-registration-email', changeRegistrationEmail);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.post('/seed', seedUsers);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/test-email', testEmailConfig);

module.exports = router;
