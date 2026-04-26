const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

// ─── PROTECT ROUTE ────────────────────────────────────────────────
exports.protect = async (req, res, next) => {
  let token;

  // Support both cookie and Authorization header
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'chcci-cose',
      audience: 'chcci-evoting',
    });
    const user = await User.findById(decoded.id).select('+otpCode +otpExpires');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated.' });
    }

    if (user.isLocked) {
      return res.status(423).json({ success: false, message: 'Account is temporarily locked.' });
    }

    // MFA check: if MFA session not yet verified, require it
    if (user.mfaEnabled && !decoded.mfaVerified) {
      return res.status(403).json({
        success: false,
        message: 'MFA verification required.',
        requiresMFA: true,
      });
    }

    // Force password change check
    if (user.mustChangePassword && req.path !== '/change-password') {
      return res.status(403).json({
        success: false,
        message: 'Password change required before proceeding.',
        mustChangePassword: true,
      });
    }

    req.user = user;
    req.sessionId = decoded.sessionId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ─── ROLE-BASED ACCESS ────────────────────────────────────────────
exports.authorize = (...roles) => {
  return async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        category: 'access',
        action: 'unauthorized_access_attempt',
        severity: 'warning',
        details: { attemptedRoute: req.originalUrl, requiredRoles: roles },
        ipHash: hashIP(req.ip),
        userAgent: req.headers['user-agent'],
        success: false,
      });
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

// ─── VOTING ELIGIBILITY CHECK ─────────────────────────────────────
// hasVoted is a global flag — but we need per-election checking.
// We check the Vote collection for a voterHash specific to this election.
exports.checkVotingEligibility = async (req, res, next) => {
  // Get electionId from body (submit) or params (token request)
  const electionId = req.body?.electionId || req.params?.electionId;

  if (electionId && req.user.hasVoted) {
    // Double-check at DB level: has this user voted in THIS specific election?
    const Vote = require('../models/Vote');
    const salt = process.env.JWT_SECRET;
    const voterHash = Vote.generateVoterHash(req.user._id.toString(), electionId, salt);
    const existing = await Vote.findOne({ voterHash }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already cast your vote in this election.',
      });
    }
  } else if (!electionId && req.user.hasVoted) {
    // No electionId context — fall back to global flag
    return res.status(409).json({
      success: false,
      message: 'You have already cast your vote.',
    });
  }

  if (req.user.isFlagged && req.user.riskScore >= 80) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been flagged for suspicious activity. Please contact the COSE.',
    });
  }

  next();
};

// ─── CSRF PROTECTION ──────────────────────────────────────────────
exports.csrfProtection = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfToken = req.headers['x-csrf-token'];
    const sessionCsrf = req.cookies['csrf-token'];

    if (!csrfToken || !sessionCsrf || csrfToken !== sessionCsrf) {
      return res.status(403).json({ success: false, message: 'CSRF validation failed.' });
    }
  }
  next();
};

// ─── HELPER ───────────────────────────────────────────────────────
function hashIP(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + (process.env.JWT_SECRET || 'salt')).digest('hex').substring(0, 16);
}

exports.hashIP = hashIP;

// ─── SANITIZE QUERY PARAMS ────────────────────────────────────────
// mongoSanitize covers body/params but not query strings on GET routes.
exports.sanitizeQuery = (req, res, next) => {
  if (req.query && typeof req.query === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(req.query)) {
      // Strip MongoDB operators from query string values
      const clean = typeof val === 'string'
        ? val.replace(/\$|\./g, '').substring(0, 200)
        : val;
      sanitized[key.replace(/\$|\./g, '')] = clean;
    }
    req.query = sanitized;
  }
  next();
};
