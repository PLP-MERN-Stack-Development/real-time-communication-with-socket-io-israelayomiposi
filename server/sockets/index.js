const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Room = require('../models/Room');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function (io) {
  const onlineUsers = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = payload;
      return next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    if (!onlineUsers.has(user.id)) onlineUsers.set(user.id, new Set());
    onlineUsers.get(user.id).add(socket.id);

    User.findByIdAndUpdate(user.id, { online: true, lastSeen: new Date() }).exec();
    io.emit('user:online', { userId: user.id, username: user.username });

    socket.join('global');

    socket.on('joinRoom', async ({ roomId }) => {
      socket.join(roomId);
      io.to(roomId).emit('notification', { type: 'join', userId: user.id, username: user.username, roomId });
    });

    socket.on('leaveRoom', ({ roomId }) => {
      socket.leave(roomId);
      io.to(roomId).emit('notification', { type: 'leave', userId: user.id, username: user.username, roomId });
    });

    socket.on('typing', ({ roomId, isTyping }) => {
      if (!roomId) return;
      socket.to(roomId).emit('typing', { roomId, userId: user.id, username: user.username, isTyping });
    });

    socket.on('message', async (payload, ack) => {
      const { roomId, to, text, fileUrl } = payload;
      const messageDoc = await Message.create({
        room: roomId || null,
        from: user.id,
        to: to || null,
        text: text || '',
        fileUrl: fileUrl || null
      });
      try { await messageDoc.populate('from', 'username'); } catch(e) {}

      if (roomId) {
        io.to(roomId).emit('message', messageDoc);
      } else if (to) {
        io.to(socket.id).emit('message', messageDoc);
        const socketsOfRecipient = onlineUsers.get(to);
        if (socketsOfRecipient) {
          socketsOfRecipient.forEach(sid => io.to(sid).emit('message', messageDoc));
        }
      }
      if (ack) ack({ status: 'sent', id: messageDoc._id, time: messageDoc.createdAt });
    });

    socket.on('react', async ({ messageId, emoji }) => {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      const existing = msg.reactions.find(r => r.emoji === emoji);
      if (existing) {
        const idx = existing.users.findIndex(u => u.toString() === user.id);
        if (idx >= 0) existing.users.splice(idx, 1);
        else existing.users.push(user.id);
      } else {
        msg.reactions.push({ emoji, users: [user.id] });
      }
      await msg.save();
      io.emit('reaction', { messageId, reactions: msg.reactions });
    });

    socket.on('markRead', async ({ messageIds }) => {
      await Message.updateMany({ _id: { $in: messageIds } }, { $addToSet: { readBy: user.id } });
      io.emit('read', { messageIds, userId: user.id });
    });

    socket.on('getUnreadCount', async ({ roomId }) => {
      const count = await Message.countDocuments({ room: roomId, readBy: { $ne: user.id } });
      socket.emit('unreadCount', { roomId, count });
    });

    socket.on('searchMessages', async ({ q, roomId }) => {
      const filter = { text: { $regex: q, $options: 'i' } };
      if (roomId) filter.room = roomId;
      const results = await Message.find(filter).sort({ createdAt: -1 }).limit(50);
      socket.emit('searchResults', results);
    });

    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(user.id);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(user.id);
          User.findByIdAndUpdate(user.id, { online: false, lastSeen: new Date() }).exec();
          io.emit('user:offline', { userId: user.id, username: user.username, lastSeen: new Date() });
        } else {
          onlineUsers.set(user.id, sockets);
        }
      }
    });
  });
};
