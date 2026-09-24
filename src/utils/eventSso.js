import { getAuth } from '@/auth/lib/helpers';
import {
  getEmailFromToken,
  getUserIdFromToken,
  getUsernameFromToken,
} from '@/utils/auth';

/**
 * Returns the base URL of the standalone Event application.
 * Defaults to http://localhost:5174 if not defined in .env.
 */
export const getEventAppBaseUrl = () => {
  const url = import.meta.env.VITE_EVENT_APP_URL || 'http://localhost:5174';
  return url.replace(/\/+$/, '');
};

/**
 * Builds the full SSO redirect URL for event-app according to its SsoLogin requirements.
 *
 * @param {string} redirectTo - Path to navigate within event-app (e.g. '/events', '/events/add', '/events/calendar')
 * @param {Record<string, any>} additionalParams - Any query parameters (e.g. partyId, leadId, etc.)
 * @returns {string} Fully constructed SSO login URL
 */
export const buildEventSsoUrl = (redirectTo = '/events/calendar', additionalParams = {}) => {
  const baseUrl = getEventAppBaseUrl();
  const auth = getAuth();

  const token =
    auth?.token ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('userToken') ||
    '';

  const userId =
    getUserIdFromToken() ||
    auth?.userId ||
    auth?.user?.id ||
    auth?.user?.userId ||
    localStorage.getItem('userId') ||
    '';

  const fullName = getUsernameFromToken() || auth?.user?.name || auth?.name || '';
  let firstName = fullName;
  let lastName = '';
  if (fullName && fullName.includes(' ')) {
    const parts = fullName.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  const email = getEmailFromToken() || auth?.user?.email || auth?.email || '';
  const systemToken = localStorage.getItem('token') || '';
  const refreshToken =
    localStorage.getItem('refreshToken') || auth?.refreshToken || '';

  const params = new URLSearchParams();

  if (token) {
    params.set('token', token);
    params.set('userToken', token);
  }
  if (userId) {
    params.set('userId', String(userId));
    params.set('id', String(userId));
  }
  if (systemToken && systemToken !== token) {
    params.set('systemToken', systemToken);
  }
  if (refreshToken) {
    params.set('refreshToken', refreshToken);
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

  // Normalize redirectTo for SsoLogin in event-app
  if (redirectTo) {
    params.set('redirectTo', redirectTo);
  }

  // Merge any additional parameters (e.g. from lead conversion)
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
 * Directly redirects the current window to the Event SSO URL.
 */
export const redirectToEventApp = (redirectTo = '/events/calendar', additionalParams = {}) => {
  const url = buildEventSsoUrl(redirectTo, additionalParams);
  window.location.href = url;
};
