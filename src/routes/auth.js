const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();

// POST /api/login  -> verify admin credentials, return a JWT.
router.post('/', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server auth is not configured (missing JWT_SECRET).' });
    }

    const expectedUser = process.env.ADMIN_USERNAME;
    const hash = process.env.ADMIN_PASSWORD_HASH;
    const plain = process.env.ADMIN_PASSWORD; // optional local-only fallback

    if (!expectedUser || (!hash && !plain)) {
      return res.status(500).json({ error: 'Admin account is not configured.' });
    }

    const userOk = username === expectedUser;
    let passOk = false;
    if (hash) {
      passOk = await bcrypt.compare(password, hash);
    } else if (plain) {
      passOk = password === plain;
    }

    if (!userOk || !passOk) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ sub: expectedUser, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({ token, username: expectedUser });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
