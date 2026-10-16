// src/auth/Logout.js
import { removeAuth } from '@/auth/lib/helpers';

export function logout(navigate) {
  removeAuth();
  localStorage.removeItem('authToken');
  localStorage.removeItem('userToken');
  localStorage.removeItem('token');
  localStorage.removeItem('userData');
  localStorage.removeItem('userId');
  localStorage.removeItem('userCode');
  localStorage.removeItem('selectedCompanyId');
  localStorage.removeItem('selectedUnitId');
  localStorage.removeItem('selectedSubOutletId');
  localStorage.removeItem('selectedSubLocationId');
  localStorage.removeItem('activeScopeRole');
  sessionStorage.clear();

  if (navigate) {
    navigate('/auth/login', { replace: true });
  } else {
    window.location.href = '/auth/login';
  }
}