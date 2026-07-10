import { getData, setData } from '@/lib/storage';

const AUTH_LOCAL_STORAGE_KEY = `${import.meta.env.VITE_APP_NAME}-auth-v${
  import.meta.env.VITE_APP_VERSION || '1.0'
}`;

/**
 * Get stored auth information from local storage
 */
const getAuth = () => {
  try {
    const auth = getData(AUTH_LOCAL_STORAGE_KEY);
    return auth;
  } catch (error) {
    console.error('AUTH LOCAL STORAGE PARSE ERROR', error);
  }
};

/**
 * Save auth information to local storage
 */
const setAuth = (auth) => {
  setData(AUTH_LOCAL_STORAGE_KEY, auth);
};

/**
 * Remove auth information from local storage
 */
const removeAuth = () => {
  if (!localStorage) {
    return;
  }

  try {
    localStorage.removeItem(AUTH_LOCAL_STORAGE_KEY);
  } catch (error) {
    console.error('AUTH LOCAL STORAGE REMOVE ERROR', error);
  }
};

export { AUTH_LOCAL_STORAGE_KEY, getAuth, removeAuth, setAuth };
