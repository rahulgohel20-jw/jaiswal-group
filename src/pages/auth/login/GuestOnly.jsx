// src/auth/guest-only.jsx
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isTokenExpired, removeAuth } from '@/auth/lib/helpers';
import { logout } from '@/auth/Logout';
import { isPosUser } from '@/utils/posSso';

export const GuestOnly = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isLogoutRequested =
    searchParams.get('logout') === 'true' ||
    searchParams.has('logout') ||
    location.pathname.toLowerCase().includes('logout');

  if (isLogoutRequested) {
    logout();
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return <Outlet />;
  }

  const token = localStorage.getItem('authToken') || localStorage.getItem('userToken');

  if (token && !isTokenExpired(token)) {
    if (isPosUser()) {
      return <Navigate to="/pos" replace />;
    }
    return <Navigate to="/companies" replace />;
  }

  if (token && isTokenExpired(token)) {
    removeAuth();
  }

  return <Outlet />;
};

