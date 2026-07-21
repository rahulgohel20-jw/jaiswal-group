// src/auth/guest-only.jsx
import { Navigate, Outlet } from 'react-router-dom';

export const GuestOnly = () => {
  const token = localStorage.getItem('authToken');

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};