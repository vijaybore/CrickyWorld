const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'crickyworld_secret_key_2024';

// ── Helpers ──────────────────────────────────────────────────────────────────
const genOTP  = () => String(Math.floor(100000 + Math.random() * 900000));
const OTP_TTL = 10 * 60 * 1000; // 10 minutes

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
// Accepts { mobile }  →  creates user if new, stores OTP, returns { exists, name }
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !/^\d{10}$/.test(mobile))
      return res.status(400).json({ message: 'Enter a valid 10-digit mobile number' });

    const otp    = genOTP();
    const expiry = new Date(Date.now() + OTP_TTL);

    let user = await User.findOne({ mobile });
    const isNew = !user;

    if (isNew) {
      user = new User({ mobile, otp, otpExpiry: expiry });
    } else {
      user.otp      = otp;
      user.otpExpiry = expiry;
    }
    await user.save();

    // ── In production replace this log with an SMS gateway call ──
    console.log(`\n📲 OTP for +91${mobile} → ${otp}  (valid 10 min)\n`);

    res.json({ exists: !isNew, name: user.name || '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
// Accepts { mobile, otp, name? }  →  returns { token, user }
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, otp, name } = req.body;
    if (!mobile || !otp)
      return res.status(400).json({ message: 'Mobile and OTP are required' });

    const user = await User.findOne({ mobile });
    if (!user)
      return res.status(404).json({ message: 'Mobile number not found. Please request OTP first.' });

    if (user.otp !== otp)
      return res.status(400).json({ message: 'Incorrect OTP' });

    if (!user.otpExpiry || new Date() > user.otpExpiry)
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    // Clear OTP after successful verification
    user.otp       = '';
    user.otpExpiry = null;
    if (name && !user.name) user.name = name.trim();
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, mobile: user.mobile, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = await User.findById(decoded.userId).select('-otp -otpExpiry');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// ── PATCH /api/auth/profile ───────────────────────────────────────────────────
router.patch('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const allowed = ['name', 'email'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(decoded.userId, update, { new: true }).select('-otp -otpExpiry');
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;