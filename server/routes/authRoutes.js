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
      return res.status(400).json({ error: 'All fields (name, email, mobile, password, role) are required.' });
    }

    if (!['student', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student or owner.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const userId = `usr_${nanoid(10)}`;
    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO users (id, name, email, mobile, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, name.trim(), normalizedEmail, mobile.trim(), passwordHash, role);

    const user = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      mobile: mobile.trim(),
      role,
    };

    const token = generateToken(user);

    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to register account. Please try again.' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { emailOrMobile, password, role } = req.body;

    if (!emailOrMobile || !password) {
      return res.status(400).json({ error: 'Email/Mobile and password are required.' });
    }

    const identifier = emailOrMobile.trim().toLowerCase();
    
    // Query by email or mobile
    let query = 'SELECT * FROM users WHERE (LOWER(email) = ? OR mobile = ?)';
    let params = [identifier, emailOrMobile.trim()];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    const user = db.prepare(query).get(...params);

    if (!user || !comparePassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials or wrong portal selected.' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    };

    const token = generateToken(safeUser);

    return res.json({
      message: 'Logged in successfully!',
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
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
