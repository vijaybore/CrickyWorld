const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'crickyworld_dev_secret';

// ── Auth middleware (inline for this file) ────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'No token' });
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// ── Step 1: Send OTP ──────────────────────────────────────────────────────────
// POST /api/auth/send-otp  { mobile: "9876543210" }
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: 'Enter a valid 10-digit mobile number' });
    }

    // Generate 6-digit OTP
    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user = await User.findOne({ mobile });
    const exists = !!user;

    if (user) {
      user.otp = otp;
      user.otpExpiry = otpExpiry;
    } else {
      user = new User({ mobile, otp, otpExpiry });
    }
    await user.save();

    // In production: integrate Twilio/MSG91 here to send real SMS
    // For now: log to console (visible in Render logs)
    console.log(`📱 OTP for ${mobile}: ${otp}`);

    res.json({ exists, name: user.name || '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Step 2: Verify OTP ────────────────────────────────────────────────────────
// POST /api/auth/verify-otp  { mobile, otp, name? }
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, otp, name } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) return res.status(400).json({ message: 'Mobile number not found. Please request OTP first.' });

    if (user.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP' });
    if (user.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    // Set name for new users
    if (name && name.trim() && !user.name) {
      user.name = name.trim();
    }
    // Clear OTP after use
    user.otp       = '';
    user.otpExpiry = null;
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, mobile: user.mobile, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get current user ──────────────────────────────────────────────────────────
// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-otp -otpExpiry');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user._id, name: user.name, mobile: user.mobile, email: user.email });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Update profile ────────────────────────────────────────────────────────────
// PATCH /api/auth/profile  { name?, email? }
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    const update = {};
    if (name  !== undefined) update.name  = name.trim();
    if (email !== undefined) update.email = email.trim();

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      update,
      { new: true }
    ).select('-otp -otpExpiry');

    res.json({ id: user._id, name: user.name, mobile: user.mobile, email: user.email });
  } catch {
    res.status(500).json({ message: 'Could not update profile' });
  }
});

// ── Legacy: Email/password register (kept for backwards compat) ───────────────
router.post('/register', async (req, res) => {
  try {
    const { name, mobile, password } = req.body;
    if (!mobile) return res.status(400).json({ message: 'Mobile number required' });

    const existing = await User.findOne({ mobile });
    if (existing) return res.status(400).json({ message: 'Mobile already registered' });

    const user = new User({ name: name || '', mobile });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, mobile: user.mobile }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Legacy: Login ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ $or: [{ mobile: email }, { email }] });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user._id, name: user.name, mobile: user.mobile }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;