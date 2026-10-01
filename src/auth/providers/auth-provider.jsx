import { useEffect, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '@/auth/context/auth-context';
import * as authHelper from '@/auth/lib/helpers';
import { useIdleTimer } from '@/auth/hooks/use-idle-timer';

function AuthSessionWatcher() {
  useIdleTimer();
  return null;
}

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

  const logout = useCallback(() => {
    saveAuth(undefined);
    setCurrentUser(undefined);
    authHelper.removeAuth();
  }, []);

  const verify = async () => {
    const storedAuth = authHelper.getAuth();
    if (storedAuth?.token && authHelper.isTokenExpired(storedAuth.token)) {
      logout();
      return null;
    }

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
    if (storedAuth?.token && authHelper.isTokenExpired(storedAuth.token)) {
      logout();
      return null;
    }
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
      <AuthSessionWatcher />
      {children}
    </AuthContext.Provider>
  );
}