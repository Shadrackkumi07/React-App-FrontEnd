// src/pages/Dashboard.jsx
import React from 'react';
import TournamentCalendar from '../TournamentCalendar';

export default function Dashboard() {
  // No more Navbar or darkMode here!
  return (
    <div className="p-4">
      <TournamentCalendar />
    </div>
  );
}
