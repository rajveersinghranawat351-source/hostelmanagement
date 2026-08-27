const express = require('express');
const router = express.Router();
const { nanoid } = require('../utils');
const { db } = require('../db');
const { hashPassword, comparePassword, generateToken, requireAuth } = require('../auth');

// Register
router.post('/register', (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;

    if (!name || !email || !mobile || !password || !role) {
      return res.status(400).json({
        error: 'All fields (name, email, mobile, password, role) are required.',
        code: 'MISSING_FIELDS',
      });
    }

    if (!['student', 'owner'].includes(role)) {
      return res.status(400).json({
        error: 'Role must be student or owner.',
        code: 'INVALID_ROLE',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile.trim();

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? OR mobile = ?').get(normalizedEmail, normalizedMobile);
    if (existing) {
      console.warn(`[Auth Register Failure]: Account already exists with email ${normalizedEmail} or mobile ${normalizedMobile}`);
      return res.status(409).json({
        error: 'An account with this email or mobile number already exists. Please log in.',
        code: 'USER_ALREADY_EXISTS',
      });
    }

    const userId = `usr_${nanoid(10)}`;
    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO users (id, name, email, mobile, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, name.trim(), normalizedEmail, normalizedMobile, passwordHash, role);

    // If an owner signs up, initialize property and payment settings automatically
    if (role === 'owner') {
      const propId = `prop_${nanoid(10)}`;
      const qrIdentifier = `QR_${nanoid(8).toUpperCase()}`;
      db.prepare(`
        INSERT INTO properties (id, owner_id, property_name, property_type, address, contact, city, image_url, qr_identifier, qr_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        propId, userId, `${name.trim()}'s PG / Hostel`, 'Co-Living / PG',
        'Main Road, City Center', normalizedMobile, 'Jaipur, Rajasthan', null, qrIdentifier, 'active'
      );

      const settingsId = `pay_set_${nanoid(10)}`;
      db.prepare(`
        INSERT OR REPLACE INTO owner_payment_settings (id, owner_id, upi_id, account_holder_name)
        VALUES (?, ?, ?, ?)
      `).run(settingsId, userId, '', name.trim());
    }

    const user = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      role,
    };

    const token = generateToken(user);
    console.log(`[Auth Register Success]: Created ${role} account for ${normalizedEmail} (${userId})`);

    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to register account. Please try again.', code: 'SERVER_ERROR' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { emailOrMobile, password, role } = req.body;

    if (!emailOrMobile || !password) {
      return res.status(400).json({ error: 'Email/Mobile and password are required.', code: 'MISSING_FIELDS' });
    }

    const rawId = emailOrMobile.trim();
    const cleanEmail = rawId.toLowerCase();
    const cleanDigits = rawId.replace(/\D/g, '');

    // 1. First look up user by email or mobile (regardless of role to detect wrong portal)
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ? OR mobile = ?').get(cleanEmail, rawId);

    if (!user) {
      console.warn(`[Auth Login Failure - USER_NOT_FOUND]: No account found for identifier "${cleanEmail}" (Role attempt: ${role || 'any'})`);
      return res.status(401).json({
        error: 'No account found with this email or mobile number. Please check your credentials or create an account.',
        code: 'USER_NOT_FOUND',
      });
    }

    // 2. Check if the portal role matches the user's role
    if (role && user.role !== role) {
      const correctPortal = user.role === 'owner' ? 'Owner' : 'Student';
      console.warn(`[Auth Login Failure - WRONG_ROLE]: User ${user.email} is a ${user.role} but attempted login to ${role} portal`);
      return res.status(403).json({
        error: `This account is registered as a ${user.role}. Please log in through the ${correctPortal} Portal.`,
        code: 'WRONG_ROLE',
        actualRole: user.role,
        correctPortal,
      });
    }

    // 3. Compare password
    const isPasswordValid = comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      console.warn(`[Auth Login Failure - INVALID_PASSWORD]: Incorrect password attempt for user ${user.email}`);
      return res.status(401).json({
        error: 'Incorrect password. Please check your password and try again.',
        code: 'INVALID_PASSWORD',
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    };

    const token = generateToken(safeUser);
    console.log(`[Auth Login Success]: ${user.role} logged in: ${user.email} (${user.id})`);

    return res.json({
      message: 'Logged in successfully!',
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed due to a server error. Please try again.', code: 'SERVER_ERROR' });
  }
});

// Get Current User Profile
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, mobile, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user });
  } catch (error) {
    console.error('Auth /me error:', error);
    return res.status(500).json({ error: 'Failed to fetch user data.' });
  }
});

module.exports = router;
