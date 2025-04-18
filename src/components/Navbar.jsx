// src/components/Navbar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import '../styles/theme-toggle.css';

export default function Navbar({ darkMode, setDarkMode }) {
  const { user, loading, error } = useAuth();
  const navigate = useNavigate();

  if (loading) return <span>Loading…</span>;
  if (error)   return <span>Error: {error.message}</span>;

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login', { replace: true });
  };

  const displayName = user?.displayName ? user.displayName : user?.email;

  return (
    <nav className="p-4 bg-white flex justify-between items-center shadow">
      {/* ─── Left : logo + settings */}
      <div className="flex items-center space-x-2">
        <h1 className="font-bold text-lg text-gray-800">Tournament App</h1>
        {user && (
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded hover:bg-gray-100"
            title="Settings"
          >
            ⚙️
          </button>
        )}
      </div>

      {/* ─── Right : welcome + theme toggle + auth button */}
      <div className="flex items-center space-x-4">
        {user && (
          <span className="text-sm text-gray-700">
            Welcome, {displayName}
          </span>
        )}

        {/* Theme toggle */}
        <div>
          <input
            type="checkbox"
            id="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode((v) => !v)}
          />
          <label htmlFor="checkbox" className="label" />
        </div>

        {user ? (
          <button
            onClick={handleSignOut}
            className="py-1 px-3 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Log Out
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Log In
          </button>
        )}
      </div>
    </nav>
  );
}
