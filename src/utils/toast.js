import { toast } from "sonner";

export const getApiErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
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
  success: (message) => toast.success(message),
  error: (errOrMessage, fallback) => {
    if (typeof errOrMessage === 'string') {
      return toast.error(errOrMessage);
    }
    return toast.error(getApiErrorMessage(errOrMessage, fallback));
  },
  warning: (message) => toast.warning(message),
  info: (message) => toast.info(message),
};