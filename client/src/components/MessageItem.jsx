import React from 'react';

export default function MessageItem({ m, me, onReact }) {
  const isMine = m.from && (m.from._id === me.id || m.from._id === me._id || m.from._id === me.id);
  return (
    <div className={`message ${isMine ? 'mine' : 'their'}`}>
      <div className="meta">{m.from?.username} • {new Date(m.createdAt).toLocaleTimeString()}</div>
      {m.text && <div className="text">{m.text}</div>}
      {m.fileUrl && <div className="file"><a href={m.fileUrl} target="_blank">Open file</a></div>}
      <div className="reactions">
        {(m.reactions || []).map(r => (
          <button key={r.emoji} onClick={() => onReact(m._id, r.emoji)}>{r.emoji} {r.users.length}</button>
        ))}
        <button onClick={() => onReact(m._id, '👍')}>👍</button>
      </div>
    </div>
  );
}
