const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const Vote = require('../models/Vote');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');
const { hashIP } = require('../middleware/auth');
const logger = require('../utils/logger');


// ─── PARAM VALIDATION HELPER ─────────────────────────────────────
const isValidMongoId = (id) => /^[a-f\d]{24}$/i.test(id);

// All admin routes require authentication + admin/superadmin role
router.use(protect);
router.use(authorize('admin', 'superadmin'));

// ─── ELECTIONS ────────────────────────────────────────────────────

// GET /admin/elections
router.get('/elections', async (req, res) => {
  try {
    const elections = await Election.find().populate('createdBy', 'fullName').sort('-createdAt');
    res.json({ success: true, count: elections.length, data: elections });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred. Check server logs.' });
  }
});

// POST /admin/elections
router.post('/elections', [
  body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Title required (max 200 chars)'),
  body('description').optional().isLength({ max: 1000 }).trim(),
  body('academicYear').notEmpty(),
  body('semester').isIn(['1st', '2nd', 'Summer']),
  body('startDate').notEmpty().withMessage('Start date required').custom(val => {
    if (isNaN(Date.parse(val))) throw new Error('Invalid start date');
    return true;
  }),
  body('endDate').notEmpty().withMessage('End date required').custom(val => {
    if (isNaN(Date.parse(val))) throw new Error('Invalid end date');
    return true;
  }),
  body('positions').isArray({ min: 1 }).withMessage('At least one position required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const election = await Election.create({ ...req.body, createdBy: req.user._id });

    await AuditLog.create({
      category: 'admin', action: 'election_created', severity: 'info',
      userId: req.user._id, userEmail: req.user.email,
      resourceType: 'Election', resourceId: election._id,
      details: { title: election.title }, ipHash: hashIP(req.ip), success: true,
    });

    res.status(201).json({ success: true, data: election });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Invalid request data.' });
  }
});

// PUT /admin/elections/:id/status
router.put('/elections/:id/status', [
  body('status').isIn(['draft', 'scheduled', 'active', 'paused', 'closed']),
], async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found.' });

    const newStatus = req.body.status;
    const current   = election.status;

    // Define allowed forward transitions only
    const allowed = {
      draft:             ['scheduled', 'active'],
      scheduled:         ['active', 'draft'],
      active:            ['paused', 'closed'],
      paused:            ['active', 'closed'],
      closed:            [],           // terminal — use publish-results route to advance
      results_published: [],           // terminal
    };

    if (!allowed[current]?.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from "${current}" to "${newStatus}".`,
      });
    }

    election.status = newStatus;
    if (newStatus === 'active' && !election.publishedAt) election.publishedAt = new Date();
    if (newStatus === 'closed') election.closedAt = new Date();
    await election.save();

    await AuditLog.create({
      category: 'admin', action: 'election_status_changed', severity: 'info',
      userId: req.user._id, userEmail: req.user.email,
      resourceType: 'Election', resourceId: election._id,
      details: { from: current, to: newStatus }, ipHash: hashIP(req.ip), success: true,
    });

    res.json({ success: true, data: election });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred. Check server logs.' });
  }
});

// ─── RESULTS ──────────────────────────────────────────────────────

// GET /admin/elections/:id/results
router.get('/elections/:id/results', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found.' });

    if (!['closed', 'results_published'].includes(election.status)) {
      return res.status(400).json({ success: false, message: 'Results are only available after the election closes.' });
    }

    // Get candidates with vote counts (admin only)
    const candidates = await Candidate.find({ election: req.params.id, isActive: true })
      .select('+voteCount')
      .sort({ positionId: 1, voteCount: -1 });

    // Group by position
    const resultsByPosition = {};
    for (const candidate of candidates) {
      const posId = candidate.positionId.toString();
      if (!resultsByPosition[posId]) {
        resultsByPosition[posId] = {
          positionId: posId,
          positionTitle: candidate.positionTitle,
          candidates: [],
          totalVotes: 0,
        };
      }
      resultsByPosition[posId].candidates.push({
        id: candidate._id,
        fullName: candidate.fullName,
        department: candidate.department,
        voteCount: candidate.voteCount,
      });
      resultsByPosition[posId].totalVotes += candidate.voteCount;
    }

    const totalVoters = await User.countDocuments({ role: 'student', isActive: true });
    const turnout = ((election.totalVotesCast / totalVoters) * 100).toFixed(1);

    await AuditLog.create({
      category: 'admin', action: 'results_viewed', severity: 'info',
      userId: req.user._id, userEmail: req.user.email,
      resourceType: 'Election', resourceId: election._id,
      ipHash: hashIP(req.ip), success: true,
    });

    res.json({
      success: true,
      data: {
        election: {
          id: election._id,
          title: election.title,
          status: election.status,
          totalVotesCast: election.totalVotesCast,
          totalEligibleVoters: totalVoters,
          turnout: `${turnout}%`,
        },
        results: Object.values(resultsByPosition),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred. Check server logs.' });
  }
});

// POST /admin/elections/:id/publish-results
router.post('/elections/:id/publish-results', async (req, res) => {
  try {
    const election = await Election.findByIdAndUpdate(
      req.params.id,
      { status: 'results_published' },
      { new: true }
    );
    await AuditLog.create({
      category: 'admin', action: 'results_published', severity: 'info',
      userId: req.user._id, userEmail: req.user.email,
      resourceType: 'Election', resourceId: election._id,
      ipHash: hashIP(req.ip), success: true,
    });
    res.json({ success: true, data: election });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred. Check server logs.' });
  }
});

// ─── USERS & FLAGGED ──────────────────────────────────────────────

// GET /admin/users
router.get('/users', async (req, res) => {
  try {
    const { flagged, page = 1, limit = 50 } = req.query;
    const query = { role: 'student' };
    if (flagged === 'true') query.isFlagged = true;

    const users = await User.find(query)
      .select('-__v')
      .sort('-riskScore')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);
    res.json({ success: true, count: users.length, total, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred. Check server logs.' });
  }
});

// PUT /admin/users/:id/flag
router.put('/users/:id/flag', [
  body('flagged').isBoolean().withMessage('flagged must be true or false'),
  body('reason').if(body('flagged').equals('true')).notEmpty().isLength({ max: 300 }).trim()
    .withMessage('Reason required when flagging (max 300 chars)'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  // Validate MongoDB ID manually since no param validator middleware here
  if (!req.params.id.match(/^[a-f\d]{24}$/i)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }

  try {
    const sanitizedReason = req.body.reason
      ? req.body.reason.replace(/[<>"'`]/g, '').substring(0, 300)
      : '';
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isFlagged: req.body.flagged, flagReason: sanitizedReason },
      { new: true, select: '-password -votingToken' }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    await AuditLog.create({
      category: 'admin', action: req.body.flagged ? 'user_flagged' : 'user_unflagged',
      severity: 'warning', userId: req.user._id, userEmail: req.user.email,
      resourceType: 'User', resourceId: user._id,
      details: { reason: sanitizedReason }, ipHash: hashIP(req.ip), success: true,
    });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user flag.' });
  }
});

// ─── STATS ────────────────────────────────────────────────────────

// GET /admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalStudents, totalVoted, totalElections, flaggedUsers, recentLogs] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'student', hasVoted: true }),
      Election.countDocuments(),
      User.countDocuments({ isFlagged: true }),
      AuditLog.find({ severity: { $in: ['warning', 'critical'] } }).sort('-timestamp').limit(10),
    ]);

    res.json({
      success: true,
      data: {
        totalStudents,
        totalVoted,
        turnoutPercent: totalStudents ? ((totalVoted / totalStudents) * 100).toFixed(1) : 0,
        totalElections,
        flaggedUsers,
        recentAlerts: recentLogs,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred. Check server logs.' });
  }
});

module.exports = router;
