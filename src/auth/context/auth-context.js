import { createContext, useContext } from 'react';

// Create AuthContext with types
export const AuthContext = createContext({
  loading: false,
  setLoading: () => {},
  saveAuth: () => {},
  setUser: () => {},
  login: async () => {},
  register: async () => {},
  requestPasswordReset: async () => {},
  resetPassword: async () => {},
  resendVerificationEmail: async () => {},
  getUser: async () => null,
  updateProfile: async () => ({}),
  logout: () => {},
  verify: async () => {},
  isAdmin: false,
});

// Hook definition
export function useAuth() {
  return useContext(AuthContext);
}
