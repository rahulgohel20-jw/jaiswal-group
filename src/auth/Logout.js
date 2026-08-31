// src/auth/Logout.js
import { removeAuth } from '@/auth/lib/helpers';

export function logout(navigate) {
  removeAuth();
  localStorage.removeItem('authToken');
  localStorage.removeItem('userToken');
  localStorage.removeItem('token');
  localStorage.removeItem('userData');
  localStorage.removeItem('userId');
  sessionStorage.clear();

  if (navigate) {
    navigate('/auth/login', { replace: true });
  } else {
    window.location.href = '/auth/login';
  }
}