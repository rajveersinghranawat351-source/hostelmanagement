const express = require('express');
const router = express.Router();
const { nanoid } = require('../utils');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../auth');

// Lookup property by QR identifier / invitation token (public / student lookup)
router.get('/qr/:qrIdentifier', (req, res) => {
  try {
    const { qrIdentifier } = req.params;
    if (!qrIdentifier) {
      return res.status(400).json({
        error: 'Invalid QR Code',
        message: 'This QR code is not linked to a valid hostel account.',
        status: 'invalid',
      });
    }

    const cleanIdentifier = qrIdentifier.trim();

    const property = db.prepare(`
      SELECT p.id, p.owner_id, p.property_name, p.property_type, p.address, p.contact, p.city,
             p.qr_identifier, p.qr_status, p.default_room, p.default_bed, p.created_at,
             u.name AS owner_name
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE p.qr_identifier = ?
    `).get(cleanIdentifier);

    if (!property) {
      return res.status(404).json({
        error: 'Invalid QR Code',
        message: 'This QR code is not linked to a valid hostel account.',
        status: 'invalid',
      });
    }

    // Check QR status
    if (property.qr_status === 'expired') {
      return res.status(410).json({
        error: 'QR Expired',
        message: 'Please ask the hostel owner for a new QR code.',
        status: 'expired',
      });
    }

    if (property.qr_status === 'revoked') {
      return res.status(403).json({
        error: 'QR No Longer Active',
        message: 'Please contact your hostel owner.',
        status: 'revoked',
      });
    }

    return res.json({
      property: {
        id: property.id,
        ownerId: property.owner_id,
        propertyName: property.property_name,
        propertyType: property.property_type,
        address: property.address,
        location: property.city || 'Jaipur, Rajasthan',
        contact: property.contact,
        ownerName: property.owner_name,
        qrIdentifier: property.qr_identifier,
        qrStatus: property.qr_status || 'active',
        room: property.default_room || '204',
        bed: property.default_bed || 'B',
      },
    });
  } catch (error) {
    console.error('Property QR lookup error:', error);
    return res.status(500).json({
      error: 'Invalid QR Code',
      message: 'Failed to look up hostel account. Please try again.',
      status: 'error',
    });
  }
});

// Get current owner's property
router.get('/mine', requireAuth, requireRole('owner'), (req, res) => {
  try {
    const property = db.prepare(`
      SELECT * FROM properties WHERE owner_id = ?
    `).get(req.user.id);

    return res.json({ property: property || null });
  } catch (error) {
    console.error('Get my property error:', error);
    return res.status(500).json({ error: 'Failed to fetch property details.' });
  }
});

// Create property & generate permanent QR for owner (1 owner = 1 property rule)
router.post('/', requireAuth, requireRole('owner'), (req, res) => {
  try {
    const { propertyName, propertyType, address, contact, city, defaultRoom, defaultBed } = req.body;

    if (!propertyName || !propertyType || !address || !contact) {
      return res.status(400).json({ error: 'All fields (name, type, address, contact) are required.' });
    }

    const existing = db.prepare('SELECT id, qr_identifier FROM properties WHERE owner_id = ?').get(req.user.id);
    if (existing) {
      return res.status(400).json({
        error: 'You already have a registered property. Each owner has one permanent property QR.',
        propertyId: existing.id,
        qrIdentifier: existing.qr_identifier,
      });
    }

    const propertyId = `prop_${nanoid(10)}`;
    const slug = propertyName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15);
    const qrIdentifier = `pg_${slug}_${nanoid(8)}`;

    db.prepare(`
      INSERT INTO properties (
        id, owner_id, property_name, property_type, address, contact, city,
        qr_identifier, qr_status, default_room, default_bed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(
      propertyId,
      req.user.id,
      propertyName.trim(),
      propertyType.trim(),
      address.trim(),
      contact.trim(),
      city ? city.trim() : 'Jaipur, Rajasthan',
      qrIdentifier,
      defaultRoom ? defaultRoom.trim() : '204',
      defaultBed ? defaultBed.trim() : 'B'
    );

    const created = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);

    return res.status(201).json({
      message: 'Hostel/PG created and permanent QR generated successfully!',
      property: created,
    });
  } catch (error) {
    console.error('Create property error:', error);
    return res.status(500).json({ error: 'Failed to create property. Please try again.' });
  }
});

// Regenerate QR Invitation Token for Owner
router.post('/qr/regenerate', requireAuth, requireRole('owner'), (req, res) => {
  try {
    const property = db.prepare('SELECT * FROM properties WHERE owner_id = ?').get(req.user.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    const slug = property.property_name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15);
    const newQrIdentifier = `pg_${slug}_${nanoid(8)}`;

    db.prepare(`
      UPDATE properties
      SET qr_identifier = ?, qr_status = 'active', qr_created_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newQrIdentifier, property.id);

    const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(property.id);

    return res.json({
      message: 'New QR code generated successfully!',
      property: updated,
    });
  } catch (error) {
    console.error('Regenerate QR error:', error);
    return res.status(500).json({ error: 'Failed to regenerate QR code.' });
  }
});

// Toggle QR Status (active / revoked / expired)
router.patch('/qr/status', requireAuth, requireRole('owner'), (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'revoked', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be active, revoked, or expired.' });
    }

    const property = db.prepare('SELECT id FROM properties WHERE owner_id = ?').get(req.user.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    db.prepare('UPDATE properties SET qr_status = ? WHERE id = ?').run(status, property.id);
    const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(property.id);

    return res.json({
      message: `QR status updated to ${status}.`,
      property: updated,
    });
  } catch (error) {
    console.error('Update QR status error:', error);
    return res.status(500).json({ error: 'Failed to update QR status.' });
  }
});

module.exports = router;
