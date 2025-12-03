const express = require('express');
const Message = require('../models/Message');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// GET messages for a room or direct conversation with pagination
router.get('/', authMiddleware, async (req, res) => {
  const { roomId, withUser, limit = 20, before } = req.query;
  const query = {};
  if (roomId) query.room = roomId;
  if (withUser) {
    const me = req.user.id;
    query.$or = [
      { from: me, to: withUser },
      { from: withUser, to: me }
    ];
  }
  if (before) query.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .populate('from', 'username')
    .populate('to', 'username');

  res.json(messages);
});

// search messages
router.get('/search', authMiddleware, async (req, res) => {
  const { q, roomId } = req.query;
  if (!q) return res.json([]);
  const query = { text: { $regex: q, $options: 'i' } };
  if (roomId) query.room = roomId;
  const results = await Message.find(query).sort({ createdAt: -1 }).limit(50);
  res.json(results);
});

// mark as read
router.post('/read', authMiddleware, async (req, res) => {
  const { messageIds } = req.body;
  if (!messageIds || !messageIds.length) return res.json({ ok: true });
  await Message.updateMany(
    { _id: { $in: messageIds } },
    { $addToSet: { readBy: req.user.id } }
  );
  res.json({ ok: true });
});

module.exports = router;
