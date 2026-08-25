const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/database');
const { authenticate, requireManager, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
// Strictly Username & Password based (no email required)
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide both username and password.' });
    }

    const trimmedUsername = username.trim();

    // Query user case-insensitively
    const user = db.prepare(`
      SELECT u.id, u.username, u.password_hash, u.role, u.employee_id, u.avatar_url,
             e.first_name, e.last_name, e.job_title, e.department, e.employee_code, e.employment_status
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE LOWER(u.username) = LOWER(?)
    `).get(trimmedUsername);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.employment_status && user.employment_status === 'terminated') {
      return res.status(403).json({ error: 'This account has been deactivated. Contact your HR administrator.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Sign JWT token valid for 7 days
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        employee_id: user.employee_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      employee_id: user.employee_id,
      avatar_url: user.avatar_url,
      first_name: user.first_name,
      last_name: user.last_name,
      job_title: user.job_title,
      department: user.department,
      employee_code: user.employee_code
    };

    res.json({
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.user.id);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// POST /api/auth/reset-password/:id (Manager only)
router.post('/reset-password/:id', authenticate, requireManager, (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, userId);

    res.json({ message: `Password for @${targetUser.username} has been reset successfully.` });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset user password.' });
  }
});

module.exports = router;
