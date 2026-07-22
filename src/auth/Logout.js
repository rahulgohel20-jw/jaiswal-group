// src/auth/logout.js
export function logout(navigate) {
  localStorage.removeItem('authToken');
  navigate('/', { replace: true });
}