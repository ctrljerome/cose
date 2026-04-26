const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const Candidate = require('../models/Candidate');

// Validate MongoDB ObjectId format
const isValidId = (id) => /^[a-f\d]{24}$/i.test(id);
const { protect, authorize } = require('../middleware/auth');

// GET /candidates/election/:electionId
router.get('/election/:electionId', protect, async (req, res) => {
  try {
    // Never expose voteCount to non-admins
    const candidates = await Candidate.find({
      election: req.params.electionId,
      isActive: true,
    }).sort('positionId order');
    res.json({ success: true, data: candidates });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }
});

// POST /candidates (admin only)
router.post('/', protect, authorize('admin', 'superadmin'), [
  body('election').isMongoId(),
  body('positionId').isMongoId(),
  body('positionTitle').notEmpty(),
  body('fullName').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const candidate = await Candidate.create(req.body);
    res.status(201).json({ success: true, data: candidate });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /candidates/:id/photo (admin only) — accepts base64 photo
// Uses a higher body size limit applied inline via express.json override
router.put('/:id/photo', protect, authorize('admin', 'superadmin'),
  express.json({ limit: '5mb' }),  // override for photo uploads only
  async (req, res) => {
    try {
      const { photoUrl } = req.body;
      if (!photoUrl) {
        return res.status(400).json({ success: false, message: 'photoUrl is required.' });
      }
      // Allow only data URIs (base64) or https URLs
      const isDataUri = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(photoUrl);
      const isHttpsUrl = /^https:\/\//.test(photoUrl);
      if (!isDataUri && !isHttpsUrl) {
        return res.status(400).json({ success: false, message: 'Photo must be a base64 data URI or an https URL.' });
      }

      if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        { photoUrl },
        { new: true }
      );
      if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });

      res.json({ success: true, data: candidate });
    } catch (err) {
      res.status(500).json({ success: false, message: 'An internal error occurred.' });
    }
  }
);

// DELETE /candidates/:id (admin only)
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    await Candidate.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Candidate removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }
});

module.exports = router;
