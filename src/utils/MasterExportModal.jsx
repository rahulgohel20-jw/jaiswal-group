import React, { useState, useMemo } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { exportMasterTableReport } from '@/services/apiServices';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Recursively scans storage data to locate userOrg (id and name).
 */
const findUserOrgRecursive = (data) => {
  if (!data || typeof data !== 'object') return null;

  if (data.userOrg && typeof data.userOrg === 'object' && data.userOrg.id) {
    return {
      id: Number(data.userOrg.id),
      name: data.userOrg.name || data.userOrg.companyNameEnglish || '',
    };
  }

  if (data.id && (data.level || data.organizationType || data.orgType) && data.name) {
    return {
      id: Number(data.id),
      name: data.name || data.companyNameEnglish || '',
    };
  }

  for (const key of Object.keys(data)) {
    if (data[key] && typeof data[key] === 'object') {
      const match = findUserOrgRecursive(data[key]);
      if (match) return match;
    }
  }

  return null;
};

const getLoggedInOrgFromStorage = () => {
  const storages = [
    typeof sessionStorage !== 'undefined' ? sessionStorage : null,
    typeof localStorage !== 'undefined' ? localStorage : null,
  ].filter(Boolean);

  for (const storage of storages) {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      const raw = storage.getItem(key);

      if (!raw || (!raw.trim().startsWith('{') && !raw.trim().startsWith('['))) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);
        const org = findUserOrgRecursive(parsed);
        if (org && org.id) return org;
      } catch {
        // Skip unparseable keys
      }
    }
  }

  return { id: 0, name: '' };
};

/**
 * Extracts direct URL string from JSON response or text-wrapped Blob.
 */
const resolveFileUrl = async (res) => {
  let data = res?.data ?? res;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      data = JSON.parse(text);
    } catch {
      return null;
    }
  }

  if (typeof data?.data === 'string' && (data.data.startsWith('http://') || data.data.startsWith('https://'))) {
    return data.data;
  }

  if (typeof data?.url === 'string') {
    return data.url;
  }

  if (typeof data === 'string' && (data.startsWith('http://') || data.startsWith('https://'))) {
    return data;
  }

  return null;
};

/**
 * Directly downloads the file without opening any new browser tab.
 */
const triggerDirectDownload = async (fileUrl, fileName) => {
  try {
    // Fetch binary content directly to force browser save dialog
    const res = await fetch(fileUrl);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || 'report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
  } catch {
    // Fallback anchor trigger if CORS restricts fetch
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const MasterExportModal = ({
  isOpen,
  onClose,
  tableName,
  title = 'Export Report',
  companyId,
  companyName,
  organizationType,
}) => {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState('PDF');
  const [showCompanyName, setShowCompanyName] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false);

  const activeOrg = useMemo(() => {
    if (companyId) {
      return { id: Number(companyId), name: companyName || '' };
    }
    return getLoggedInOrgFromStorage();
  }, [companyId, companyName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tableName) {
      toast.error('Table name is required for export.');
      return;
    }

    const payload = {
      companyId: showCompanyName ? Number(activeOrg.id) || 0 : 0,
      companyName: showCompanyName ? activeOrg.name || '' : '',
      format: format.toUpperCase(),
      showCompanyName,
      tableName,
      type: 'MASTER_TABLE_REPORT',
      isDeleted,
      ...(organizationType ? { organizationType } : {}),
    };

    const extension = format.toLowerCase();
    const fileName = `${tableName}_report_${Date.now()}.${extension}`;

    setExporting(true);
    try {
      const response = await exportMasterTableReport(payload);

      const directUrl = await resolveFileUrl(response);

      if (directUrl) {
        // Direct download only — no new tabs opened
        await triggerDirectDownload(directUrl, fileName);
        toast.success(response?.data?.msg || `${title} exported successfully.`);
        onClose();
      } else {
        toast.error('Failed to extract download URL from response.');
      }
    } catch (err) {
      console.error('[MasterExportModal] Export failed:', err);
      toast.error(err?.response?.data?.message || err?.message || `Failed to export ${title}.`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          </div>
          <button
            type="button"
            disabled={exporting}
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Export File Type
            </label>
            <Select value={format} onValueChange={setFormat} disabled={exporting}>
              <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF (.pdf)</SelectItem>
                <SelectItem value="CSV">CSV (.csv)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCompanyName}
                onChange={(e) => setShowCompanyName(e.target.checked)}
                disabled={exporting}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-gray-700">
                Show Company Name in Report {activeOrg.name ? `(${activeOrg.name})` : ''}
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDeleted}
                onChange={(e) => setIsDeleted(e.target.checked)}
                disabled={exporting}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-gray-700">
                Include Deleted Records
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                'Export'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MasterExportModal;