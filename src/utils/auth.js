import { jwtDecode } from 'jwt-decode';
import { getAuth } from '@/auth/lib/helpers';

export const getOrgIdFromToken = () => {
  try {
    const auth = getAuth();
    let token = auth?.token;
    if (!token && typeof window !== 'undefined') {
      token =
        localStorage.getItem('userToken') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('token');
    }
    if (!token) return null;
    const decoded = jwtDecode(token);
    return decoded?.organizationId ?? decoded?.orgId ?? null;
  } catch (err) {
    console.error('Failed to decode auth token', err);
    return null;
  }
};

export const getOutletIdFromToken = () => {
  try {
    const auth = getAuth();
    let token = auth?.token;
    if (!token && typeof window !== 'undefined') {
      token =
        localStorage.getItem('userToken') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('token');
    }
    if (!token) return null;
    const decoded = jwtDecode(token);
    return decoded?.outletId != null ? Number(decoded.outletId) : null;
  } catch (err) {
    console.error('Failed to decode outletId from token', err);
    return null;
  }
};

export const getActiveRoleLevel = () => {
  if (typeof window !== 'undefined') {
    const role = localStorage.getItem('activeScopeRole');
    if (role) return role;
    const unitId = localStorage.getItem('selectedUnitId');
    if (unitId && unitId !== 'null' && unitId !== 'undefined' && Number(unitId) > 0) {
      return 'OUTLET';
    }
  }
  const tokenOutlet = getOutletIdFromToken();
  if (tokenOutlet && Number(tokenOutlet) > 0) return 'OUTLET';
  return 'COMPANY';
};

export const getActiveUnitId = () => {
  if (typeof window !== 'undefined') {
    const unitId = localStorage.getItem('selectedUnitId');
    if (unitId && unitId !== 'null' && unitId !== 'undefined' && Number(unitId) > 0) {
      return Number(unitId);
    }
  }
  const tokenOutlet = getOutletIdFromToken();
  if (tokenOutlet && Number(tokenOutlet) > 0) return Number(tokenOutlet);

  const auth = getAuth();
  if (auth?.selectedScope?.outletId && Number(auth.selectedScope.outletId) > 0) {
    return Number(auth.selectedScope.outletId);
  }
  return null;
};

export const getSubOutletIdFromToken = () => {
  try {
    const auth = getAuth();
    let token = auth?.token;
    if (!token && typeof window !== 'undefined') {
      token =
        localStorage.getItem('userToken') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('token');
    }
    if (!token) return null;
    const decoded = jwtDecode(token);
    return decoded?.subOutletId != null ? Number(decoded.subOutletId) : null;
  } catch (err) {
    console.error('Failed to decode subOutletId from token', err);
    return null;
  }
};

export const getSubLocationIdFromToken = () => {
  try {
    const auth = getAuth();
    let token = auth?.token;
    if (!token && typeof window !== 'undefined') {
      token =
        localStorage.getItem('userToken') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('token');
    }
    if (!token) return null;
    const decoded = jwtDecode(token);
    return decoded?.subLocationId != null ? Number(decoded.subLocationId) : null;
  } catch (err) {
    console.error('Failed to decode subLocationId from token', err);
    return null;
  }
};

export const getUserIdFromToken = () => {
  try {
    const auth = getAuth();
    let token = auth?.token;
    if (!token && typeof window !== 'undefined') {
      token =
        localStorage.getItem('userToken') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('token');
    }
    if (token) {
      const decoded = jwtDecode(token);
      if (decoded?.userId != null) return Number(decoded.userId);
      if (decoded?.id != null) return Number(decoded.id);
      if (decoded?.sub != null && !isNaN(Number(decoded.sub))) return Number(decoded.sub);
    }
    const user = auth?.user || auth?.data || auth;
    const uid = user?.userId ?? user?.id ?? user?.sub;
    return uid != null ? Number(uid) : null;
  } catch (err) {
    console.error('Failed to decode auth token', err);
    const auth = getAuth();
    const user = auth?.user || auth?.data || auth;
    const uid = user?.userId ?? user?.id ?? user?.sub;
    return uid != null ? Number(uid) : null;
  }
};

export const getEmailFromToken = () => {
  const auth = getAuth();
  const user = auth?.user || auth?.data || auth;
  return user?.email ?? null;
};

// `name` comes from the login response body (payload.name or user.name),
// falling back to fullName, username, or userCode.
export const getUsernameFromToken = () => {
  const auth = getAuth();
  const user = auth?.user || auth?.data || auth;
  return (
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.userCode ||
    (user?.firstName ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '') ||
    user?.email ||
    ''
  );
};

export const getUserCodeFromToken = () => {
  const auth = getAuth();
  const user = auth?.user || auth?.data || auth;
  return user?.userCode ?? null;
};

export const getUserFromToken = () => {
  return getUserCodeFromToken() || getUsernameFromToken() || null;
};