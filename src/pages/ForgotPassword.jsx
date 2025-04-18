import React, { useState } from "react";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset link sent! Check your email.");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setError("No account found with that email.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError("Could not send reset email.");
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-bold">Forgot Password</h2>
      {message && <div className="text-green-600">{message}</div>}
      {error   && <div className="text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="email"
          placeholder="Your account email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          Send Reset Link
        </button>
      </form>
      <button onClick={() => navigate("/login")} className="text-gray-600 hover:underline">
        ← Back to Login
      </button>
    </div>
  );
}
