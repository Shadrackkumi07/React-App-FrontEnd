// src/components/CommentList.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function CommentList({ tournamentId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetch(`/api/comments?tournamentId=${tournamentId}`)
      .then(res => res.json())
      .then(setComments);
  }, [tournamentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const token = await user.getIdToken();
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tournamentId, content: newComment }),
    });
    const saved = await res.json();
    setComments(prev => [...prev, saved]);
    setNewComment('');
  };

  return (
    <div>
      <h4 className="font-semibold">Comments</h4>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {comments.map(c => (
          <p key={c._id} className="text-sm">
            <strong>{c.userId.slice(-6)}:</strong> {c.content}
          </p>
        ))}
      </div>
      {user && (
        <form onSubmit={handleSubmit} className="mt-2 flex">
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="flex-1 border rounded p-1"
            placeholder="Leave a comment…"
          />
          <button type="submit" className="ml-2 px-3 bg-blue-600 text-white rounded">
            Post
          </button>
        </form>
      )}
    </div>
  );
}
