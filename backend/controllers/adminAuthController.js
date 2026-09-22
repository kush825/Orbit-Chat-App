const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_jwt_key_chat_app_2026', {
    expiresIn: '30d',
  });
};

// @desc    Auth Admin & get token
// @route   POST /api/admin/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Auto-seed the super admin if it doesn't exist in the database yet
    let admin = await Admin.findOne({ email });
    if (!admin && email === 'admin@pulsechat.com' && password === 'admin123') {
        admin = await Admin.create({ email, password });
    }

    if (admin && (await admin.matchPassword(password))) {
      res.json({
        _id: admin._id,
        email: admin.email,
        token: generateToken(admin._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid Admin credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { loginAdmin };
