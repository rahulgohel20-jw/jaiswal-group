// src/auth/guest-only.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { isTokenExpired, removeAuth } from '@/auth/lib/helpers';

export const GuestOnly = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('userToken');

  if (token && !isTokenExpired(token)) {
    return <Navigate to="/companies" replace />;
  }

  if (token && isTokenExpired(token)) {
    removeAuth();
  }

  return <Outlet />;
};