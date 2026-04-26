const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const Vote = require('../models/Vote');
const User = require('../models/User');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const AuditLog = require('../models/AuditLog');
const { protect, checkVotingEligibility } = require('../middleware/auth');
const { hashIP } = require('../middleware/auth');
const logger = require('../utils/logger');

// ─── POST /submit ─────────────────────────────────────────────────
// The most critical endpoint — hardened with multiple layers
router.post('/submit', protect, checkVotingEligibility, [
  body('electionId').isMongoId().withMessage('Invalid election ID'),
  body('votingToken').notEmpty().withMessage('Voting token required'),
  body('ballot').isArray({ min: 1 }).withMessage('Ballot must contain at least one vote'),
  body('ballot.*.positionId').isMongoId(),
  body('ballot.*.candidateId').isMongoId(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { electionId, votingToken, ballot } = req.body;
  const userId = req.user._id;
  const ipHash = hashIP(req.ip);

  // Start session for atomic operation
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    // 1. Validate election is active
    const election = await Election.findById(electionId).session(session);
    if (!election || !election.isCurrentlyActive) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Election is not currently active.' });
    }

    // 2. Validate voting token
    const user = await User.findById(userId).select('+votingToken').session(session);
    const tokenHash = crypto.createHash('sha256').update(votingToken).digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const storedHash = user.votingToken || '';
    const tokensMatch = storedHash.length === tokenHash.length &&
      crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(tokenHash));
    if (!storedHash || !tokensMatch) {
      await session.abortTransaction();
      await AuditLog.create({
        category: 'security', action: 'invalid_voting_token', severity: 'critical',
        userId, userEmail: user.email, details: { electionId }, ipHash, success: false,
      });
      return res.status(403).json({ success: false, message: 'Invalid voting token. Session invalidated.' });
    }

    // 3. Check for double vote (database-level)
    const salt = process.env.JWT_SECRET;
    const voterHash = Vote.generateVoterHash(userId.toString(), electionId, salt);
    const existingVote = await Vote.findOne({ voterHash }).session(session);

    if (existingVote) {
      await session.abortTransaction();
      await AuditLog.create({
        category: 'security', action: 'double_vote_attempt', severity: 'critical',
        userId, userEmail: user.email, details: { electionId }, ipHash, success: false,
      });
      return res.status(409).json({ success: false, message: 'You have already voted in this election.' });
    }

    // 4. Validate ballot completeness — all positions must be voted on
    const validPositionIds = election.positions.map(p => p._id.toString());
    const submittedPositionIds = ballot.map(e => e.positionId.toString());
    const missingPositions = validPositionIds.filter(id => !submittedPositionIds.includes(id));
    if (missingPositions.length > 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: `Incomplete ballot: ${missingPositions.length} position(s) not voted on.` });
    }
    const duplicatePositions = submittedPositionIds.filter((id, i) => submittedPositionIds.indexOf(id) !== i);
    if (duplicatePositions.length > 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Duplicate votes for the same position are not allowed.' });
    }
    const encryptedBallot = [];

    for (const entry of ballot) {
      const { positionId, candidateId } = entry;

      // Validate position belongs to election
      if (!validPositionIds.includes(positionId)) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Invalid position: ${positionId}` });
      }

      // Validate candidate belongs to this position in this election
      const candidate = await Candidate.findOne({
        _id: candidateId,
        election: electionId,
        positionId,
        isActive: true,
      }).session(session);

      if (!candidate) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Invalid candidate for position ${positionId}` });
      }

      encryptedBallot.push({
        positionId,
        positionTitle: candidate.positionTitle,
        encryptedCandidateId: Vote.encryptCandidateId(candidateId),
      });
    }

    // 5. Create immutable vote
    const ballotHash = Vote.generateBallotHash(encryptedBallot, voterHash);

    await Vote.create([{
      election: electionId,
      voterHash,
      ballot: encryptedBallot,
      tokenHash,
      ipHash,
      userAgent: req.headers['user-agent'],
      submittedAt: new Date(),
      ballotHash,
    }], { session });

    // 6. Mark user as voted + clear voting token
    await User.findByIdAndUpdate(userId, {
      hasVoted: true,
      votedAt: new Date(),
      $unset: { votingToken: 1 },
    }, { session });

    // 7. Increment vote counter on candidates (encrypted, async)
    await Election.findByIdAndUpdate(electionId, { $inc: { totalVotesCast: 1 } }, { session });

    // 8. Increment candidate vote counts
    for (const entry of ballot) {
      await Candidate.findByIdAndUpdate(entry.candidateId, { $inc: { voteCount: 1 } }, { session });
    }

    await session.commitTransaction();

    await AuditLog.create({
      category: 'vote', action: 'vote_submitted', severity: 'info',
      userId, userEmail: user.email,
      details: { electionId, positionCount: ballot.length, ballotHash },
      ipHash, success: true,
    });

    logger.info(`Vote submitted: user=${userId} election=${electionId}`);

    res.status(201).json({
      success: true,
      message: 'Your vote has been securely recorded.',
      receiptHash: ballotHash,
    });

  } catch (err) {
    await session.abortTransaction();
    logger.error(`Vote submission error: ${err.message} | Stack: ${err.stack}`);
    res.status(500).json({ success: false, message: err.message || 'Vote submission failed. Please try again.' });
  } finally {
    session.endSession();
  }
});

// ─── GET /token/:electionId ───────────────────────────────────────
// Generate single-use voting token for a session
router.get('/token/:electionId', protect, checkVotingEligibility, async (req, res) => {
  try {
    const election = await Election.findById(req.params.electionId);
    if (!election || !election.isCurrentlyActive) {
      return res.status(400).json({ success: false, message: 'Election is not active.' });
    }

    // Invalidate any previously issued voting token before issuing a new one
    // This prevents token accumulation if the ballot page is reopened
    const token = req.user.generateVotingToken();
    req.user.votingTokenIssuedAt = new Date();
    req.user.votingTokenElection = req.params.electionId;
    await req.user.save({ validateBeforeSave: false });

    await AuditLog.create({
      category: 'vote', action: 'voting_token_issued', severity: 'info',
      userId: req.user._id, userEmail: req.user.email,
      details: { electionId: req.params.electionId },
      ipHash: hashIP(req.ip), success: true,
    });

    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }
});

// ─── GET /status/:electionId ──────────────────────────────────────
router.get('/status/:electionId', protect, async (req, res) => {
  res.json({
    success: true,
    hasVoted: req.user.hasVoted,
    votedAt: req.user.votedAt,
  });
});

module.exports = router;
