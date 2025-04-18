// src/components/LikeButton.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/like-button.css';

export default function LikeButton({ tournamentId }) {
  const { user } = useAuth();
  const [count, setCount]   = useState(0);
  const [liked, setLiked]   = useState(false);
  const [loading, setLoading] = useState(false);
  const checkboxId = `heart-${tournamentId}`;
  const API = process.env.REACT_APP_API_URL;

  /* --- initial fetch --- */
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API}/api/likes?tournamentId=${tournamentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Fetch likes failed');
        const data = await res.json();
        if (mounted) {
          setCount(data.count ?? 0);
          setLiked(Boolean(data.liked));
        }
      } catch (err) {
        console.error(err);
      }
    };
    run();
    return () => { mounted = false; };
  }, [user, tournamentId, API]);

  /* --- toggle like --- */
  const toggle = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tournamentId }),
      });
      if (!res.ok) throw new Error('Toggle like failed');
      const data = await res.json();
      setCount(data.count ?? 0);   // ← authoritative value
      setLiked(Boolean(data.liked));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="like-button">
      <input
        id={checkboxId}
        type="checkbox"
        className="on"
        checked={liked}
        onChange={toggle}
        disabled={loading}
      />
      <label className="like" htmlFor={checkboxId}>
        <svg
          className="like-icon"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
        </svg>
      </label>

      {/*  single authoritative counter  */}
      <span className="like-count">{count}</span>
    </div>
  );
}
