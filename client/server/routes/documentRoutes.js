const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db, aadhaarDir, faceDir } = require('../db');
const { requireAuth } = require('../auth');

// Secure document serving endpoint
// GET /api/documents/:profileId/:type (type: 'face' | 'aadhaar')
router.get('/:profileId/:type', requireAuth, (req, res) => {
  try {
    const { profileId, type } = req.params;

    if (!['face', 'aadhaar'].includes(type)) {
      return res.status(400).json({ error: 'Invalid document type. Allowed: face, aadhaar.' });
    }

    const studentProfile = db.prepare(`
      SELECT sp.*, p.owner_id
      FROM student_profiles sp
      JOIN properties p ON sp.property_id = p.id
      WHERE sp.id = ?
    `).get(profileId);

    if (!studentProfile) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Authorization check:
    // 1. If requester is a student, they can ONLY view their own document
    // 2. If requester is an owner, they can ONLY view documents of students belonging to their property
    const isOwnerOfProperty = req.user.role === 'owner' && studentProfile.owner_id === req.user.id;
    const isStudentSelf = req.user.role === 'student' && studentProfile.user_id === req.user.id;

    if (!isOwnerOfProperty && !isStudentSelf) {
      return res.status(403).json({
        error: 'Access Denied: You are not authorized to view this document.',
      });
    }

    const filename = type === 'face' ? studentProfile.face_photo : studentProfile.aadhaar_document;
    const baseDir = type === 'face' ? faceDir : aadhaarDir;
    const filePath = path.join(baseDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document file not found on server.' });
    }

    // Set caching and content-disposition
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.png') res.setHeader('Content-Type', 'image/png');
    else if (ext === '.jpg' || ext === '.jpeg') res.setHeader('Content-Type', 'image/jpeg');
    else if (ext === '.webp') res.setHeader('Content-Type', 'image/webp');
    else if (ext === '.pdf') res.setHeader('Content-Type', 'application/pdf');

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Secure document serving error:', error);
    return res.status(500).json({ error: 'Failed to retrieve document.' });
  }
});

module.exports = router;
