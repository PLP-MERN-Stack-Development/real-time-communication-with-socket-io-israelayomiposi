import React, { useContext, useEffect, useState } from 'react';
import { SocketContext } from '../context/SocketProvider';
import API from '../api/api';
import RoomList from './RoomList';
import MessageItem from './MessageItem';

export default function ChatWindow({ user, onLogout }) {
  const socket = useContext(SocketContext);
  const [roomId, setRoomId] = useState('global');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const me = { id: user.id || user._id, username: user.username || user.name };

  async function loadMessages(before) {
    const res = await API.get('/messages', { params: { roomId, limit: 30, before } });
    return res.data;
  }

  useEffect(() => {
    if (!socket) return;
    socket.emit('joinRoom', { roomId });

    (async () => {
      const msgs = await loadMessages();
      setMessages(msgs.reverse());
    })();

    socket.on('message', (msg) => {
      setMessages(prev => [...prev, msg]);
      if (Notification && document.hidden) {
        try { new Notification(`New message from ${msg.from?.username}`, { body: msg.text || 'file' }); } catch(e) {}
      }
    });

    socket.on('typing', ({ userId, username, isTyping }) => {
      setTypingUsers(prev => {
        const copy = { ...prev };
        if (isTyping) copy[userId] = username;
        else delete copy[userId];
        return copy;
      });
    });

    socket.on('reaction', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    });

    socket.on('unreadCount', ({ roomId: r, count }) => {
      if (r === roomId) setUnreadCount(count);
    });

    return () => {
      socket.emit('leaveRoom', { roomId });
      socket.off('message');
      socket.off('typing');
      socket.off('reaction');
      socket.off('unreadCount');
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) return;
    const timeout = setTimeout(() => socket.emit('typing', { roomId, isTyping: false }), 1500);
    if (text) socket.emit('typing', { roomId, isTyping: true });
    return () => clearTimeout(timeout);
  }, [text, socket, roomId]);

  async function sendMessage(e) {
    e?.preventDefault();
    if (!socket || (!text.trim())) return;
    const payload = { roomId, text };
    socket.emit('message', payload, (ack) => {
      // handle ack if needed
    });
    setText('');
  }

  async function loadOlder() {
    if (!messages.length) return;
    const before = messages[0].createdAt;
    const older = await loadMessages(before);
    setMessages(prev => [...older.reverse(), ...prev]);
  }

  function react(messageId, emoji) {
    socket.emit('react', { messageId, emoji });
  }

  useEffect(() => { if (Notification && Notification.permission === 'default') Notification.requestPermission(); }, []);

  return (
    <div className="chat-layout">
      <aside className="side">
        <div className="profile">Logged in as {me.username} <button onClick={onLogout}>Logout</button></div>
        <RoomList onSelectRoom={setRoomId} current={roomId} />
      </aside>

      <main className="main">
        <div className="header">Room: {roomId} • Unread: {unreadCount}</div>
        <button onClick={loadOlder}>Load older</button>
        <div className="messages">
          {messages.map(m => <MessageItem key={m._id} m={m} me={me} onReact={react} />)}
        </div>
        <div className="typing">{Object.values(typingUsers).length ? `${Object.values(typingUsers).join(', ')} typing...` : ''}</div>

        <form onSubmit={sendMessage} className="composer">
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." />
          <button type="submit">Send</button>
        </form>
      </main>

      <aside className="right">Users / profile</aside>
    </div>
  );
}
