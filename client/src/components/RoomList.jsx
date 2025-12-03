import React from 'react';

export default function RoomList({ rooms = [{ id: 'global', name: 'Global' }], onSelectRoom, current }) {
  return (
    <div className="rooms">
      {rooms.map(r => (
        <div key={r.id} onClick={() => onSelectRoom(r.id)} className={`room-item ${current === r.id ? 'active' : ''}`}>{r.name}</div>
      ))}
    </div>
  );
}
