const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
  },
  positionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  positionTitle: { type: String, required: true },

  fullName: { type: String, required: true, trim: true },
  studentId: { type: String, trim: true },
  department: { type: String, trim: true },
  yearLevel: { type: Number },
  platform: { type: String, trim: true, maxlength: 2000 },
  photoUrl: { type: String },

  // Vote count — only accessible to admin after election closes
  voteCount: { type: Number, default: 0, select: false },

  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },

}, { timestamps: true });

// ─── INDEXES ──────────────────────────────────────────────────────
candidateSchema.index({ election: 1, positionId: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
