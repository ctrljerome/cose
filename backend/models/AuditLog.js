const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Actor (may be null for system events)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: { type: String },
  userRole: { type: String },

  // Event classification
  category: {
    type: String,
    required: true,
    enum: [
      'auth',           // Login, logout, OTP, password reset
      'vote',           // Vote submission, token generation
      'admin',          // Election/candidate management
      'security',       // Suspicious behavior, rate limit, lockout
      'system',         // Server events
      'access',         // Unauthorized access attempts
    ],
  },
  action: { type: String, required: true },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
  },

  // Context
  details: { type: mongoose.Schema.Types.Mixed },
  ipHash: { type: String },
  userAgent: { type: String },
  sessionId: { type: String },

  // Resource reference
  resourceType: { type: String },
  resourceId: { type: mongoose.Schema.Types.ObjectId },

  // Outcome
  success: { type: Boolean, default: true },
  errorMessage: { type: String },

  timestamp: { type: Date, default: Date.now, immutable: true },

}, {
  // Immutable collection — no updates allowed
  timestamps: false,
  // Capped collection option (optional, for high-volume)
});

// ─── INDEXES ──────────────────────────────────────────────────────
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, severity: 1 });
auditLogSchema.index({ action: 1 });

// ─── PREVENT UPDATES ──────────────────────────────────────────────
auditLogSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function () {
  throw new Error('Audit logs are immutable');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
