import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { setAuthToken } from '../api/api';

export const SocketContext = createContext(null);

export default function SocketProvider({ token, children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) return setSocket(null);
    setAuthToken(token);

    const s = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelayMax: 5000,
      transports: ['websocket']
    });

    s.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
    });

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
