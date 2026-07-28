import { jwtDecode } from 'jwt-decode';

// Reads organizationId out of the stored auth token.
export const getOrgIdFromToken = () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    const decoded = jwtDecode(token);
    return decoded?.organizationId ?? null;
  } catch (err) {
    console.error('Failed to decode auth token', err);
    return null;
  }
};