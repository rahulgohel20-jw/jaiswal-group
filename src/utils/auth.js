import { jwtDecode } from 'jwt-decode';
import { getAuth } from '@/auth/lib/helpers';

export const getOrgIdFromToken = () => {
  try {
    const auth = getAuth();
    if (!auth?.token) return null;
    const decoded = jwtDecode(auth.token);
    return decoded?.organizationId ?? null;
  } catch (err) {
    console.error('Failed to decode auth token', err);
    return null;
  }
};

export const getUserIdFromToken = () => {
  try {
    const auth = getAuth();
    if (!auth?.token) return null;
    const decoded = jwtDecode(auth.token);
    return decoded?.userId ?? null;
  } catch (err) {
    console.error('Failed to decode auth token', err);
    return null;
  }
};

export const getEmailFromToken = () => {
  const auth = getAuth();
  const user = auth?.user || auth?.data || auth;
  return user?.email ?? null;
};

// `name` comes from the login response body (payload.name), not the JWT —
// the token itself only has organizationId/departmentId/userType/userId/sub.
// saveAuth(payload) stores the whole login payload, so it's read the same
// way getEmailFromToken reads `email` off that stored object.
export const getUsernameFromToken = () => {
  const auth = getAuth();
  const user = auth?.user || auth?.data || auth;
  return user?.name ?? null;
};

export const getUserCodeFromToken = () => {
  const auth = getAuth();
  const user = auth?.user || auth?.data || auth;
  return user?.userCode ?? null;
}