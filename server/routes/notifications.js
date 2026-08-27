const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications (List unread and recent notifications)
router.get('/', authenticate, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id IS NULL OR user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(req.user.id);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE (user_id IS NULL OR user_id = ?) AND is_read = 0
    `).get(req.user.id).count;

    res.json({ notifications, unread_count: unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// PUT /api/notifications/read-all (Mark all as read)
router.put('/read-all', authenticate, (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id IS NULL OR user_id = ?
    `).run(req.user.id);

    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

module.exports = router;
