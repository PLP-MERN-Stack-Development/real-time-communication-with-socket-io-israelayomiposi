import React, { useState } from 'react';
import API from '../api/api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      const url = isRegister ? '/auth/register' : '/auth/login';
      const res = await API.post(url, { username, password });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  return (
    <div className="login-card">
      <h2>{isRegister ? 'Register' : 'Login'}</h2>
      <form onSubmit={submit}>
        <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">{isRegister ? 'Register' : 'Login'}</button>
      </form>
      <button onClick={() => setIsRegister(p => !p)} className="link">{isRegister ? 'Have an account? Login' : "Don't have an account? Register"}</button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
