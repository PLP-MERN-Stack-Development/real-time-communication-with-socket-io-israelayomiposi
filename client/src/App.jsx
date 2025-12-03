import React, { useState, useEffect } from 'react';
import SocketProvider from './context/SocketProvider';
import Login from './components/Login';
import ChatWindow from './components/ChatWindow';
import { setAuthToken } from './api/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  useEffect(() => {
    if (token) setAuthToken(token);
  }, [token]);

  const handleLogin = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) return <Login onLogin={handleLogin} />;

  return (
    <SocketProvider token={token}>
      <ChatWindow user={user} onLogout={handleLogout} />
    </SocketProvider>
  );
}
