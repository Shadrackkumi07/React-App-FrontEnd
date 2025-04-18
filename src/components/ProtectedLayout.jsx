// src/components/ProtectedLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';

export default function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    // optional: initialize from localStorage
    return localStorage.getItem('darkMode') === 'true';
  });

  // Whenever darkMode changes, update <html> class and persist
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    // You can also apply Tailwind dark:bg-* here if you want
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Pass the toggle state & setter into Navbar */}
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />

      {/* This will render Dashboard, Settings, etc. */}
      <Outlet />
    </div>
  );
}
