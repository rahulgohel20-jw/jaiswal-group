import { jwtDecode } from 'jwt-decode';
import { getAuth } from '@/auth/lib/helpers';
import {
  getEmailFromToken,
  getOrgIdFromToken,
  getUserCodeFromToken,
  getUserIdFromToken,
  getUsernameFromToken,
} from '@/utils/auth';

/**
 * Returns the base URL of the standalone POS application.
 * Defaults to http://localhost:5175 if not defined in .env.
 */
export const getPosAppBaseUrl = () => {
  const url = import.meta.env.VITE_POS_APP_URL || 'http://localhost:5175';
  return url.replace(/\/+$/, '');
};

/**
 * Builds the full SSO redirect URL for jaiswal-pos according to SSO requirements.
 *
 * @param {string} redirectTo - Target path within the POS application (e.g. '/', '/production', '/statistics')
 * @param {Record<string, any>} additionalParams - Additional parameters (outletId, shiftId, etc.)
 * @returns {string} Fully constructed SSO login URL
 */
export const buildPosSsoUrl = (redirectTo = '/', additionalParams = {}) => {
  const baseUrl = getPosAppBaseUrl();
  const auth = getAuth();

  const token =
    auth?.token ||
    localStorage.getItem('userToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    '';

  const systemToken = localStorage.getItem('token') || '';
  const userToken = localStorage.getItem('userToken') || token;

  const userId =
    getUserIdFromToken() ||
    auth?.userId ||
    auth?.user?.id ||
    auth?.user?.userId ||
    localStorage.getItem('userId') ||
    '';

  const orgId = getOrgIdFromToken() || auth?.organizationId || '';
  const userCode = getUserCodeFromToken() || auth?.userCode || '';

  const fullName = getUsernameFromToken() || auth?.user?.name || auth?.name || '';
  let firstName = fullName;
  let lastName = '';
  if (fullName && fullName.includes(' ')) {
    const parts = fullName.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  const email = getEmailFromToken() || auth?.user?.email || auth?.email || '';
  const refreshToken =
    localStorage.getItem('refreshToken') || auth?.refreshToken || '';

  const params = new URLSearchParams();

  if (token) {
    params.set('token', token);
  }
  if (userToken) {
    params.set('userToken', userToken);
  }
  if (systemToken && systemToken !== userToken) {
    params.set('systemToken', systemToken);
  }
  if (userId) {
    params.set('userId', String(userId));
    params.set('id', String(userId));
  }
  if (orgId) {
    params.set('organizationId', String(orgId));
  }
  if (userCode) {
    params.set('userCode', String(userCode));
  }
  if (firstName) {
    params.set('firstName', firstName);
  }
  if (lastName) {
    params.set('lastName', lastName);
  }
  if (email) {
    params.set('email', email);
  }
  if (refreshToken) {
    params.set('refreshToken', refreshToken);
  }

  // Extract custom claims from JWT token
  try {
    const rawToken = userToken || token;
    if (rawToken) {
      const decoded = jwtDecode(rawToken);
      if (decoded?.userType && !params.has('userType')) params.set('userType', decoded.userType);
      if (decoded?.outletId && !params.has('outletId')) params.set('outletId', String(decoded.outletId));
      if (decoded?.subOutletId && !params.has('subOutletId')) params.set('subOutletId', String(decoded.subOutletId));
      if (decoded?.role && !params.has('role')) params.set('role', decoded.role);
    }
  } catch (_) {}

  // User credentials for child application authentication
  const resolvedUserName =
    additionalParams.userName ||
    additionalParams.username ||
    userCode ||
    fullName ||
    email ||
    localStorage.getItem('userCode') ||
    localStorage.getItem('userName') ||
    '';

  const resolvedPassword =
    additionalParams.password ||
    auth?.user?.password ||
    auth?.password ||
    localStorage.getItem('userPassword') ||
    localStorage.getItem('password') ||
    '';

  if (resolvedUserName) {
    params.set('userName', resolvedUserName);
    params.set('username', resolvedUserName);
  }
  if (resolvedPassword) {
    params.set('password', resolvedPassword);
  }

  // Normalize target route for child POS app
  if (redirectTo) {
    // Strip redundant leading "/pos" if present so child app receives clean relative path
    const normalizedTarget = redirectTo.replace(/^\/pos(?:\/|$)/, '/');
    params.set('redirectTo', normalizedTarget || '/');
  }

  // Merge any additional params
  if (additionalParams && typeof additionalParams === 'object') {
    Object.entries(additionalParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val));
      }
    });
  }

  return `${baseUrl}/sso-login?${params.toString()}`;
};

/**
 * Directly redirects the current window to the POS SSO URL.
 */
export const redirectToPosApp = (redirectTo = '/', additionalParams = {}) => {
  const url = buildPosSsoUrl(redirectTo, additionalParams);
  window.location.href = url;
};
