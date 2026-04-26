const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { hashIP } = require('../middleware/auth');
const logger = require('../utils/logger');

// ─── HELPERS ──────────────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const sessionId = uuidv4();
  const jti = require('crypto').randomBytes(16).toString('hex');
  const token = jwt.sign(
    { id: user._id, role: user.role, sessionId, jti },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '2h', issuer: 'chcci-cose', audience: 'chcci-evoting' }
  );

  const csrfToken = crypto.randomBytes(32).toString('hex');

  const cookieOptions = {
    expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 2) * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .cookie('csrf-token', csrfToken, { ...cookieOptions, httpOnly: false })
    .json({
      success: true,
      csrfToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        hasVoted: user.hasVoted,
      },
    });
};

// ─── POST /login ──────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().toLowerCase().trim().withMessage('Valid CHCCI institutional email required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;
  const ipHash = hashIP(req.ip);
  const userAgent = req.headers['user-agent'];

  try {
    const user = await User.findOne({ email }).select('+password +votingToken');

    if (!user) {
      await AuditLog.create({ category: 'auth', action: 'login_failed', severity: 'warning',
        details: { reason: 'user_not_found', email }, ipHash, userAgent, success: false });
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to multiple failed attempts. Try again in 30 minutes.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      await AuditLog.create({ category: 'auth', action: 'login_failed', severity: 'warning',
        userId: user._id, userEmail: email, details: { reason: 'wrong_password' }, ipHash, userAgent, success: false });
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    await user.updateOne({
      $set: { loginAttempts: 0, lastLogin: new Date(), lastLoginIP: hashIP(req.ip) },
      $unset: { lockUntil: 1 },
    });

    await AuditLog.create({ category: 'auth', action: 'login_success', severity: 'info',
      userId: user._id, userEmail: email, ipHash, userAgent, success: true });

    sendTokenResponse(user, 200, res);

  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// ─── POST /change-password ────────────────────────────────────────
router.post('/change-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must have uppercase, lowercase, number, and special character'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    user.password = req.body.newPassword;
    user.mustChangePassword = false;
    await user.save();

    await AuditLog.create({ category: 'auth', action: 'password_changed', severity: 'info',
      userId: user._id, userEmail: user.email, ipHash: hashIP(req.ip), success: true });

    // Expire the current session — user must log in again with their new password
    res
      .cookie('token', 'none', { expires: new Date(Date.now() + 5 * 1000), httpOnly: true })
      .cookie('csrf-token', 'none', { expires: new Date(Date.now() + 5 * 1000) })
      .json({ success: true, message: 'Password changed successfully. Please log in again.' });

  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }
});

// ─── POST /logout ─────────────────────────────────────────────────
router.post('/logout', protect, async (req, res) => {
  await AuditLog.create({ category: 'auth', action: 'logout', severity: 'info',
    userId: req.user._id, userEmail: req.user.email, ipHash: hashIP(req.ip), success: true });

  res.cookie('token', 'none', { expires: new Date(Date.now() + 5 * 1000), httpOnly: true })
     .cookie('csrf-token', 'none', { expires: new Date(Date.now() + 5 * 1000) })
     .json({ success: true, message: 'Logged out successfully.' });
});

// ─── GET /me ──────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  // Re-fetch to ensure votedAt and all current fields are fresh
  const user = await User.findById(req.user._id).select('-password -votingToken -passwordResetToken -passwordResetExpires -suspiciousEvents');
  res.json({ success: true, user });
});

// ─── POST /log-suspicious ─────────────────────────────────────────
router.post('/log-suspicious', protect, async (req, res) => {
  const { event } = req.body;
  // Sanitize details — never trust user input going into the DB
  const rawDetails = req.body.details;
  const details = typeof rawDetails === 'string'
    ? rawDetails.replace(/[<>"'`]/g, '').substring(0, 200)
    : undefined;
  const allowedEvents = ['devtools_opened', 'print_attempted', 'tab_switch', 'right_click', 'screenshot_attempt', 'copy_attempt'];

  if (!allowedEvents.includes(event)) {
    return res.status(400).json({ success: false, message: 'Unknown event type.' });
  }

  const riskMap = { devtools_opened: 15, print_attempted: 5, tab_switch: 3, right_click: 2, screenshot_attempt: 10, copy_attempt: 5 };
  const riskPoints = riskMap[event] || 5;

  try {
    await req.user.addSuspiciousEvent(event, details, riskPoints);
    await AuditLog.create({
      category: 'security',
      action: event,
      severity: riskPoints >= 10 ? 'warning' : 'info',
      userId: req.user._id,
      userEmail: req.user.email,
      details: { event, details, riskPoints, newRiskScore: req.user.riskScore },
      ipHash: hashIP(req.ip),
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, riskScore: req.user.riskScore });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }
});

module.exports = router;
