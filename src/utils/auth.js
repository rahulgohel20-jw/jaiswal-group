import { jwtDecode } from 'jwt-decode';

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

  export const getUserIdFromToken = () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return null;

      const payload = JSON.parse(atob(token.split(".")[1]));

      return payload.userId ?? payload.id ?? payload.sub ?? null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };