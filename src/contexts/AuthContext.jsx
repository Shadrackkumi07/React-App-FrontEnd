// src/contexts/AuthContext.jsx
import React, { createContext, useContext } from 'react';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

const AuthContext = createContext({ user: null, loading: true });
export function AuthProvider({ children }) {
  const [user, loading, error] = useAuthState(auth);
  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  return useContext(AuthContext);
}