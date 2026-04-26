const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email format'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'superadmin'],
    default: 'student',
  },
  studentId: {
    type: String,
    trim: true,
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  department: {
    type: String,
    trim: true,
  },
  yearLevel: {
    type: Number,
    min: 1,
    max: 5,
  },

  // Account state
  isActive: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: true },

  // Password reset
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },

  // Login tracking
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: { type: Date },
  lastLoginIPHash: { type: String }, // Hashed — never store raw IP

  // Voting
  hasVoted: { type: Boolean, default: false },
  votedAt: { type: Date },
  votingToken: { type: String, select: false },

  // Security flags
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String },
  suspiciousEvents: [{
    event: String,
    timestamp: { type: Date, default: Date.now },
    details: String,
  }],

}, { timestamps: true });

// ─── INDEXES ──────────────────────────────────────────────────────
// Note: email index is already created by unique:true on the field definition
userSchema.index({ studentId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ hasVoted: 1 });
userSchema.index({ isFlagged: 1 });

// ─── VIRTUAL: isLocked ────────────────────────────────────────────
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ─── PRE-SAVE: Hash password ──────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const salt = await bcrypt.genSalt(rounds);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── METHOD: Match password ───────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── METHOD: Increment login attempts ─────────────────────────────
userSchema.methods.incrementLoginAttempts = async function () {
  // If lock has expired, reset
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) }; // 30 min
  }
  return this.updateOne(updates);
};

// ─── METHOD: Generate password reset token ────────────────────────
userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  return token;
};

// ─── METHOD: Generate voting token ───────────────────────────────
userSchema.methods.generateVotingToken = function () {
  const { v4: uuidv4 } = require('uuid');
  const token = uuidv4();
  this.votingToken = crypto.createHash('sha256').update(token).digest('hex');
  return token;
};

// ─── METHOD: Add suspicious event ────────────────────────────────
userSchema.methods.addSuspiciousEvent = async function (event, details, riskPoints = 5) {
  this.suspiciousEvents.push({ event, details });
  this.riskScore = Math.min(100, this.riskScore + riskPoints);
  if (this.riskScore >= 50) {
    this.isFlagged = true;
    this.flagReason = `Auto-flagged: Risk score ${this.riskScore}`;
  }
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
