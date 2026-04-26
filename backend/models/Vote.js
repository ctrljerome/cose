const mongoose = require('mongoose');
const crypto = require('crypto');

// Individual ballot entry (one position = one entry)
const ballotEntrySchema = new mongoose.Schema({
  positionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  positionTitle: { type: String, required: true },
  // Candidate ID is encrypted at rest
  encryptedCandidateId: { type: String, required: true },
});

const voteSchema = new mongoose.Schema({
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
  },

  // Anonymous: voter identity stored as one-way hash
  // SHA-256(userId + electionId + salt) — cannot be reversed
  voterHash: {
    type: String,
    required: true,
    unique: true, // Prevents double voting at DB level
  },

  // Encrypted ballot entries
  ballot: [ballotEntrySchema],

  // Voting token hash (for validation, single-use)
  tokenHash: { type: String, required: true, select: false },

  // Metadata (no PII)
  submittedAt: { type: Date, default: Date.now },
  ipHash: { type: String }, // Hashed IP, not raw
  userAgent: { type: String },

  // Integrity check
  ballotHash: { type: String }, // SHA-256 of ballot contents for tamper detection
  isValid: { type: Boolean, default: true },

}, { timestamps: false });

// ─── INDEXES ──────────────────────────────────────────────────────
// Note: voterHash index is created automatically via `unique: true` on the field — no schema.index() needed.
voteSchema.index({ election: 1 });
voteSchema.index({ submittedAt: 1 });

// ─── STATIC: Generate voter hash ─────────────────────────────────
voteSchema.statics.generateVoterHash = function (userId, electionId, salt) {
  return crypto
    .createHash('sha256')
    .update(`${userId}:${electionId}:${salt}`)
    .digest('hex');
};

// ─── STATIC: Encrypt candidate ID ────────────────────────────────
voteSchema.statics.encryptCandidateId = function (candidateId) {
  const keyHex = process.env.VOTE_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('VOTE_ENCRYPTION_KEY is missing or invalid in .env (must be 64 hex chars)');
  }
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(candidateId.toString(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

// ─── STATIC: Decrypt candidate ID ────────────────────────────────
voteSchema.statics.decryptCandidateId = function (encryptedData) {
  const [ivHex, encrypted] = encryptedData.split(':');
  const key = Buffer.from(process.env.VOTE_ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// ─── STATIC: Generate ballot hash ────────────────────────────────
voteSchema.statics.generateBallotHash = function (ballot, voterHash) {
  const content = JSON.stringify(ballot) + voterHash;
  return crypto.createHash('sha256').update(content).digest('hex');
};

// ─── PRE-SAVE: Make immutable ─────────────────────────────────────
voteSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Votes are immutable and cannot be modified'));
  }
  next();
});

module.exports = mongoose.model('Vote', voteSchema);
