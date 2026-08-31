import { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '@/auth/context/auth-context';
import * as authHelper from '@/auth/lib/helpers';

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(currentUser?.is_admin === true);
  }, [currentUser]);

  const enrichAuth = (nextAuth) => {
    if (!nextAuth?.token) return nextAuth;
    try {
      const decoded = jwtDecode(nextAuth.token);
      return {
        ...nextAuth,
        organizationId: decoded.organizationId,
        departmentId: decoded.departmentId,
        userType: decoded.userType,
      };
    } catch {
      return nextAuth;
    }
  };

  const saveAuth = (nextAuth) => {
    const enriched = enrichAuth(nextAuth);
    setAuth(enriched);
    if (enriched) {
      authHelper.setAuth(enriched);
    } else {
      authHelper.removeAuth();
    }
  };

  const verify = async () => {
    const storedAuth = authHelper.getAuth();
    setAuth(storedAuth);

    if (storedAuth) {
      const user = storedAuth?.user || storedAuth?.data || storedAuth;
      setCurrentUser(user || undefined);
      return user;
    }

    setCurrentUser(undefined);
    return null;
  };

  const login = async () => null;
  const register = async () => null;
  const requestPasswordReset = async () => {};
  const resetPassword = async () => {};
  const resendVerificationEmail = async () => {};

  const getUser = async () => {
    const storedAuth = authHelper.getAuth();
    const user = storedAuth?.user || storedAuth?.data || storedAuth;
    setCurrentUser(user || undefined);
    return user || null;
  };

  const updateProfile = async (userData) => {
    const storedAuth = authHelper.getAuth();
    const updatedAuth = {
      ...(storedAuth || {}),
      user: {
        ...(storedAuth?.user || {}),
        ...(userData || {}),
      },
    };

    saveAuth(updatedAuth);
    setCurrentUser(updatedAuth.user || undefined);
    return updatedAuth.user;
  };

  const logout = () => {
    saveAuth(undefined);
    setCurrentUser(undefined);
    authHelper.removeAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        setLoading,
        auth,
        saveAuth,
        user: currentUser,
        setUser: setCurrentUser,
        login,
        register,
        requestPasswordReset,
        resetPassword,
        resendVerificationEmail,
        getUser,
        updateProfile,
        logout,
        verify,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}