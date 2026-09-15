import { useState, useCallback } from 'react';
import { exportAndDownloadReport } from '@/utils/reportExport';

/**
 * Custom React hook for exporting and downloading reports with managed loading state.
 *
 * @returns {{
 *   exporting: boolean,
 *   exportReport: (payload: Object, options?: Object) => Promise<{ success: boolean, url?: string, response?: any, error?: any }>
 * }}
 */
export const useExportReport = () => {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async (payload, options = {}) => {
    setExporting(true);
    try {
      return await exportAndDownloadReport(payload, options);
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    exporting,
    exportReport: handleExport,
  };
};

export default useExportReport;
