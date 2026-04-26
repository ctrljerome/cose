const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin', 'superadmin'));

// GET /audit/logs
router.get('/logs', async (req, res) => {
  try {
    const { category, severity, page = 1, limit = 100, userId } = req.query;
    const query = {};
    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (userId) query.userId = userId;

    const logs = await AuditLog.find(query)
      .sort('-timestamp')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await AuditLog.countDocuments(query);
    res.json({ success: true, count: logs.length, total, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /audit/security-alerts
router.get('/security-alerts', async (req, res) => {
  try {
    const alerts = await AuditLog.find({
      severity: { $in: ['warning', 'critical'] },
      category: { $in: ['security', 'access'] },
    }).sort('-timestamp').limit(200);
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
