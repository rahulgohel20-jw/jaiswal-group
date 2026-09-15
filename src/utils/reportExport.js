import { exportReport } from '@/services/apiServices';
import { toast } from 'sonner';

/**
 * Triggers a browser download for a given URL.
 *
 * @param {string} url - The URL of the file to download.
 * @param {string} [fileName] - Optional filename for the downloaded file.
 * @param {boolean} [openInNewTab=true] - Whether to also open in a new tab if direct download isn't supported.
 */
export const downloadFileFromUrl = (url, fileName = '', openInNewTab = false) => {
  if (!url) return;

  const link = document.createElement('a');
  link.href = url;
  if (openInNewTab) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  if (fileName) {
    link.setAttribute('download', fileName);
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Triggers a browser download for a Blob object.
 *
 * @param {Blob} blob - The Blob binary data.
 * @param {string} [fileName='report.pdf'] - Filename for the downloaded file.
 */
export const downloadFileFromBlob = (blob, fileName = 'report.pdf') => {
  if (!blob) return;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Extracts a download URL from various API response shapes.
 *
 * @param {any} response - The API response object.
 * @returns {string|null} The resolved URL or null.
 */
export const extractReportUrl = (response) => {
  if (!response) return null;

  // Check response.data.data (Standard API response format: { data: "https://..." })
  const resData = response?.data?.data ?? response?.data ?? response;

  if (
    typeof resData === 'string' &&
    (resData.startsWith('http://') || resData.startsWith('https://') || resData.startsWith('/'))
  ) {
    return resData;
  }

  if (typeof response?.data?.url === 'string') {
    return response.data.url;
  }

  if (typeof response?.url === 'string') {
    return response.url;
  }

  return null;
};

/**
 * Universal reusable report export and download function.
 *
 * @param {Object} payload - The payload to send to the export API (e.g., { id: 1, type: "purchase type 1" }).
 * @param {Object} [options] - Configuration options.
 * @param {string} [options.fileName] - Filename for the downloaded report (e.g. 'PO_Report_101.pdf').
 * @param {string} [options.successMessage] - Custom success toast message.
 * @param {string} [options.errorMessage] - Custom error toast message fallback.
 * @param {boolean} [options.showToast=true] - Whether to show toast notifications.
 * @param {boolean} [options.openInNewTab=true] - Whether to open URL in a new tab.
 * @param {Function} [options.apiCaller=exportReport] - Custom API caller function (defaults to exportReport).
 * @param {Function} [options.onSuccess] - Callback executed on success with (downloadUrl, response).
 * @param {Function} [options.onError] - Callback executed on failure with (error).
 *
 * @returns {Promise<{ success: boolean, url?: string, response?: any, error?: any }>}
 */
export const exportAndDownloadReport = async (payload, options = {}) => {
  const {
    fileName = `Report_${Date.now()}.pdf`,
    successMessage,
    errorMessage = 'Failed to export report.',
    showToast = true,
    openInNewTab = true,
    apiCaller = exportReport,
    onSuccess,
    onError,
  } = options;

  try {
    const response = await apiCaller(payload);

    // 1. Check if the response contains a downloadable URL string
    const downloadUrl = extractReportUrl(response);

    if (downloadUrl) {
      downloadFileFromUrl(downloadUrl, fileName, openInNewTab);
      const msg = successMessage || response?.data?.msg || 'Report generated successfully.';
      if (showToast) toast.success(msg);
      if (typeof onSuccess === 'function') onSuccess(downloadUrl, response);
      return { success: true, url: downloadUrl, response };
    }

    // 2. Check if the response is a binary Blob
    if (response?.data instanceof Blob || response instanceof Blob) {
      const blob = response?.data instanceof Blob ? response.data : response;
      downloadFileFromBlob(blob, fileName);
      const msg = successMessage || 'Report downloaded successfully.';
      if (showToast) toast.success(msg);
      if (typeof onSuccess === 'function') onSuccess(null, response);
      return { success: true, response };
    }

    // 3. Fallback: URL could not be determined
    const failMsg = response?.data?.msg || errorMessage;
    if (showToast) toast.error(failMsg);
    if (typeof onError === 'function') onError(new Error(failMsg));
    return { success: false, error: new Error(failMsg) };
  } catch (err) {
    console.error('[exportAndDownloadReport] Error:', err);
    const resolvedErrorMsg =
      err?.response?.data?.message ||
      err?.response?.data?.msg ||
      err?.message ||
      errorMessage;

    if (showToast) toast.error(resolvedErrorMsg);
    if (typeof onError === 'function') onError(err);
    return { success: false, error: err };
  }
};
