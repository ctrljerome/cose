// routes/elections.js
const express = require('express');
const router = express.Router();
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');

// Validate MongoDB ObjectId format
const isValidId = (id) => /^[a-f\d]{24}$/i.test(id);
const { protect } = require('../middleware/auth');

// GET /elections/active
// Returns all elections with status 'active' (admin controls activation manually).
// Date window is enforced at vote submission, not at display time.
router.get('/active', protect, async (req, res) => {
  try {
    const elections = await Election.find({ status: 'active' }).select('-__v');
    res.json({ success: true, data: elections });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }
});

// GET /elections/published
router.get('/published', protect, async (req, res) => {
  try {
    const elections = await Election.find({ status: 'results_published' }).select('-__v');
    res.json({ success: true, data: elections });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }
});

// GET /elections/:id/results — public results for a published election
router.get('/:id/results', protect, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found.' });
    if (election.status !== 'results_published') {
      return res.status(403).json({ success: false, message: 'Results have not been published yet.' });
    }

    const candidates = await Candidate.find({ election: req.params.id, isActive: true })
      .select('+voteCount');

    const resultsByPosition = {};
    for (const pos of election.positions) {
      const posId = pos._id.toString();
      resultsByPosition[posId] = {
        positionId: posId,
        positionTitle: pos.title,
        candidates: [],
        totalVotes: 0,
      };
    }

    for (const c of candidates) {
      const posId = c.positionId?.toString();
      if (resultsByPosition[posId]) {
        resultsByPosition[posId].candidates.push({
          id: c._id,
          fullName: c.fullName,
          department: c.department,
          yearLevel: c.yearLevel,
          photoUrl: c.photoUrl || null,
          platform: c.platform,
          voteCount: c.voteCount || 0,
        });
        resultsByPosition[posId].totalVotes += c.voteCount || 0;
      }
    }

    // Sort each position's candidates by votes descending
    for (const pos of Object.values(resultsByPosition)) {
      pos.candidates.sort((a, b) => b.voteCount - a.voteCount);
    }

    res.json({
      success: true,
      data: {
        election: {
          _id: election._id,
          title: election.title,
          academicYear: election.academicYear,
          semester: election.semester,
          totalVotesCast: election.totalVotesCast,
        },
        results: Object.values(resultsByPosition),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }
});

// GET /elections/:id
router.get('/:id', protect, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: election });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }
});

module.exports = router;
