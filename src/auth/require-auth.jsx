// src/auth/require-auth.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { isTokenExpired, removeAuth } from '@/auth/lib/helpers';

export const RequireAuth = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('userToken');

  if (!token || isTokenExpired(token)) {
    if (token) {
      removeAuth();
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};