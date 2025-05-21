import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';

interface RegisterProps {
  onRegister: (token: string, isAdmin: boolean) => void;
  backendUrl: string;
}

function Register({ onRegister}: RegisterProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`https://music-player-a8lg.onrender.com/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      onRegister(data.token, data.user.isAdmin);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-8 rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-rose-600 to-pink-600 text-transparent bg-clip-text">Register</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-rose-700 text-sm font-semibold mb-2" htmlFor="username">
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-rose-400" />
            </div>
            <input
              type="text"
              id="username"
              className="pl-10 block w-full rounded-xl border-rose-200 shadow-sm focus:border-rose-300 focus:ring focus:ring-rose-200 focus:ring-opacity-50 bg-white/90"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-rose-700 text-sm font-semibold mb-2" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-rose-400" />
            </div>
            <input
              type="password"
              id="password"
              className="pl-10 block w-full rounded-xl border-rose-200 shadow-sm focus:border-rose-300 focus:ring focus:ring-rose-200 focus:ring-opacity-50 bg-white/90"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 px-4 rounded-xl hover:from-rose-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-opacity-50 transform hover:scale-[1.02] transition-all duration-300 font-semibold shadow-lg"
        >
          Register
        </button>
      </form>
    </div>
  );
}

export default Register;