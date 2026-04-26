const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  maxVotesPerVoter: { type: Number, default: 1, min: 1 },
  order: { type: Number, default: 0 },
});

const electionSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Election title is required'], trim: true },
  description: { type: String, trim: true },
  academicYear: { type: String, required: true },
  semester: { type: String, enum: ['1st', '2nd', 'Summer'], required: true },

  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'paused', 'closed', 'results_published'],
    default: 'draft',
  },

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  positions: [positionSchema],

  eligibleDepartments: [{ type: String }], // empty = all departments
  eligibleYearLevels: [{ type: Number }],  // empty = all years

  // Participation stats (not vote counts)
  totalEligibleVoters: { type: Number, default: 0 },
  totalVotesCast: { type: Number, default: 0 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: { type: Date },
  closedAt: { type: Date },

  // Immutable flag once votes are cast
  isLocked: { type: Boolean, default: false },

}, { timestamps: true });

// ─── INDEXES ──────────────────────────────────────────────────────
electionSchema.index({ status: 1 });
electionSchema.index({ startDate: 1, endDate: 1 });

// ─── VIRTUAL: isActive ────────────────────────────────────────────
// An election is considered active if an admin has explicitly set its status to 'active'.
// Date window is shown in the UI but does not gate voting — admin controls activation.
electionSchema.virtual('isCurrentlyActive').get(function () {
  return this.status === 'active';
});

// ─── PRE-SAVE VALIDATION ──────────────────────────────────────────
electionSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('Election', electionSchema);
