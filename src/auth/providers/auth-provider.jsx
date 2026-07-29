import { useEffect, useState } from 'react';
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

  const saveAuth = (nextAuth) => {
    setAuth(nextAuth);
    if (nextAuth) {
      authHelper.setAuth(nextAuth);
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
