import React, { useState } from "react";
import { auth } from "../firebase";
import {
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [newUsername, setNewUsername] = useState(user.displayName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleUsernameChange = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await updateProfile(auth.currentUser, { displayName: newUsername });
      setSuccess("Username updated!");
    } catch (err) {
      setError("Could not update username.");
      console.error(err);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!currentPassword || !newPassword) {
      setError("Please fill both password fields.");
      return;
    }
    try {
      // Reauthenticate
      const cred = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, cred);
      // Update
      await updatePassword(auth.currentUser, newPassword);
      setSuccess("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        setError("Current password is incorrect.");
      } else if (err.code === "auth/weak-password") {
        setError("New password is too weak.");
      } else {
        setError("Could not update password.");
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      {error && <div className="text-red-600">{error}</div>}
      {success && <div className="text-green-600">{success}</div>}

      {/* Username form */}
      <form onSubmit={handleUsernameChange} className="space-y-2">
        <label className="block font-medium">Change Username</label>
        <input
          type="text"
          value={newUsername}
          onChange={e => setNewUsername(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          Update Username
        </button>
      </form>

      {/* Password form */}
      <form onSubmit={handlePasswordChange} className="space-y-2">
        <label className="block font-medium">Change Password</label>
        <input
          type="password"
          placeholder="Current Password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          Update Password
        </button>
      </form>

      <button
        onClick={() => navigate(-1)}
        className="mt-4 text-gray-600 hover:underline"
      >
        ← Back
      </button>
    </div>
  );
}
