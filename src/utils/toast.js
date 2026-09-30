import { toast } from "sonner";

export const getApiErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (typeof err === 'string') return err;
  const isNetworkError =
    err?.code === 'ERR_NETWORK' ||
    (err?.name === 'AxiosError' && !err?.response) ||
    err?.message === 'Network Error' ||
    (typeof err?.message === 'string' && err.message.toLowerCase().includes('network error'));
  if (isNetworkError) return 'Network Error';

  const data = err?.response?.data;
  if (data) {
    if (data.errorMessage) return data.errorMessage;
    if (data.message) return data.message;
    if (data.error) return typeof data.error === 'string' ? data.error : (data.error.message || data.error.errorMessage);
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      return typeof first === 'string' ? first : (first?.message || first?.errorMessage);
    }
    if (data.msg && data.msg !== 'FAILED' && data.msg !== 'ERROR') return data.msg;
    if (typeof data === 'string') return data;
  }
  return err?.errorMessage || err?.message || fallback;
};

export const notify = {
  success: (message, options = {}) => {
    const id = options?.id || (typeof message === 'string' ? `success-${message}` : undefined);
    return toast.success(message, id ? { id, ...options } : options);
  },
  error: (errOrMessage, fallback, options = {}) => {
    let msg;
    let isNetErr = false;
    if (typeof errOrMessage === 'string') {
      msg = errOrMessage;
      if (msg.toLowerCase().includes('network error')) isNetErr = true;
    } else {
      isNetErr =
        errOrMessage?.code === 'ERR_NETWORK' ||
        (errOrMessage?.name === 'AxiosError' && !errOrMessage?.response) ||
        errOrMessage?.message === 'Network Error' ||
        (typeof errOrMessage?.message === 'string' && errOrMessage.message.toLowerCase().includes('network error'));
      msg = getApiErrorMessage(errOrMessage, fallback);
    }
    const toastId = options?.id || (isNetErr ? 'network-error' : (typeof msg === 'string' ? `error-${msg}` : undefined));
    return toast.error(msg, toastId ? { id: toastId, ...options } : options);
  },
  warning: (message, options = {}) => {
    const id = options?.id || (typeof message === 'string' ? `warning-${message}` : undefined);
    return toast.warning(message, id ? { id, ...options } : options);
  },
  info: (message, options = {}) => {
    const id = options?.id || (typeof message === 'string' ? `info-${message}` : undefined);
    return toast.info(message, id ? { id, ...options } : options);
  },
};