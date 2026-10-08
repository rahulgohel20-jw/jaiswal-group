import React from 'react';
import {
  X,
  CheckCircle2,
  ExternalLink,
  Store,
  Package,
  Building2,
  Download,
  FileText,
  Eye,
  CornerDownRight,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router';
import { useExportReport } from '@/hooks/useExportReport';
import { toast } from 'sonner';

const InfoCard = ({ label, children, className = '' }) => (
  <div className={`border border-gray-200 rounded-lg px-3 py-2 bg-[#FDFDFE] shadow-2xs ${className}`}>
    <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">{label}</p>
    <div className="mt-0.5">{children}</div>
  </div>
);

const STATUS_STYLES = {
  OPEN: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Open: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CLOSED: 'bg-gray-100 text-gray-700 border border-gray-200',
  Closed: 'bg-gray-100 text-gray-700 border border-gray-200',
  VERIFIED: 'bg-blue-50 text-blue-700 border border-blue-200',
  Verified: 'bg-blue-50 text-blue-700 border border-blue-200',
};

const StatusPill = ({ status }) => {
  const display = status || 'CLOSED';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border border-gray-200'
      }`}
    >
      <CheckCircle2 size={13} />
      {display.toLowerCase().replace(/_/g, ' ')}
    </span>
  );
};

const getFileNameFromUrl = (url) => {
  if (!url) return 'invoice_document';
  try {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'invoice_document';
  } catch {
    return 'invoice_document';
  }
};

const formatDateShort = (val) => {
  if (!val) return '—';
  const slashMatch = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d.padStart(2, '0')} ${monthName} ${y}`;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateDDMMYYYY = (val) => {
  if (!val) return '—';
  const match = String(val).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    const [, d, m, y] = match;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const handleDownloadFile = (url, fileName) => {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = fileName || getFileNameFromUrl(url);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const GRNDetailsViewModal = ({ isOpen, onClose, grn, onPrint, onAcknowledge, acknowledging, loading, exporting: parentExporting }) => {
  if (!isOpen) return null;

  const { exporting: localExporting, exportReport } = useExportReport();
  const isExporting = parentExporting || localExporting;

  const items = grn?.items || [];
  const images = Array.isArray(grn?.images) ? grn.images : [];

  const handleClose = () => {
    if (acknowledging || isExporting) return;
    onClose?.();
  };

  const handlePrint = async () => {
    if (typeof onPrint === 'function') {
      onPrint(grn);
      return;
    }

    const grnId = grn?.id;
    if (!grnId) {
      toast.error('GRN ID not found.');
      return;
    }

    await exportReport(
      {
        type: 'GRN Type 1',
        id: Number(grnId),
      },
      {
        fileName: `GRN_Report_${grn?.grnCode || grnId}.pdf`,
        successMessage: 'GRN report downloaded successfully.',
        errorMessage: 'Failed to export GRN report.',
      }
    );
  };

  const raisedByInitials = (grn?.raisedBy || 'Admin')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const subLocationDisplay =
    (typeof grn?.subLocation === 'string' ? grn.subLocation : null) ||
    grn?.subLocationName ||
    grn?.subLocation?.subLocationName ||
    grn?.subLocation?.locationName ||
    grn?.subLocation?.name ||
    grn?.locationName ||
    (typeof grn?.items?.[0]?.subLocation === 'string' ? grn.items[0].subLocation : null) ||
    grn?.items?.[0]?.subLocationName ||
    grn?.items?.[0]?.subLocation?.subLocationName ||
    grn?.items?.[0]?.subLocation?.locationName ||
    grn?.items?.[0]?.subLocation?.name ||
    grn?.items?.[0]?.locationName ||
    (typeof grn?.details?.[0]?.subLocation === 'string' ? grn.details[0].subLocation : null) ||
    grn?.details?.[0]?.subLocationName ||
    grn?.details?.[0]?.subLocation?.subLocationName ||
    grn?.details?.[0]?.subLocation?.locationName ||
    grn?.details?.[0]?.subLocation?.name ||
    grn?.details?.[0]?.locationName ||
    null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-gray-100">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3.5 border-b border-gray-100 shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-gray-900">GRN Details View</h2>
              {grn?.status && <StatusPill status={grn?.status} />}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{grn?.grnCode}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (scrollable) */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <div className="w-6 h-6 border-2 border-[#084E92] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading GRN details...</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4 overflow-y-auto">
            {/* Top info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <InfoCard label="GRN Code">
                <p className="text-xs font-bold text-[#084E92] font-mono tracking-tight select-all truncate" title={grn?.grnCode}>
                  {grn?.grnCode || '—'}
                </p>
              </InfoCard>

              <InfoCard label="GRN Date">
                <p className="text-xs font-semibold text-gray-800">{grn?.date || '—'}</p>
              </InfoCard>

              <InfoCard label={grn?.poCodes && grn.poCodes.length > 1 ? "PO Codes" : "PO Code"}>
                {grn?.poCodes && grn.poCodes.length > 1 ? (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {grn.poCodes.map((code, idx) => {
                      const poId = grn.purchaseOrderIds?.[idx];
                      return poId ? (
                        <Link
                          key={idx}
                          to={`/purchase/purchase-order-detail/${poId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#084E92] bg-blue-50 border border-blue-200 hover:bg-blue-100 px-1.5 py-0.5 rounded transition"
                          title={`View PO ${code}`}
                        >
                          <span>{code}</span>
                          <ExternalLink size={10} />
                        </Link>
                      ) : (
                        <span
                          key={idx}
                          className="inline-block text-[11px] font-semibold text-gray-800 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded font-mono"
                        >
                          {code}
                        </span>
                      );
                    })}
                  </div>
                ) : grn?.purchaseOrderId ? (
                  <Link
                    to={`/purchase/purchase-order-detail/${grn.purchaseOrderId}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#084E92] hover:underline truncate"
                  >
                    <span className="truncate">{grn.poCode}</span>
                    <ExternalLink size={11} className="shrink-0" />
                  </Link>
                ) : (
                  <p className="text-xs font-bold text-gray-800 truncate">{grn?.poCode || '—'}</p>
                )}
              </InfoCard>

              <InfoCard label="Unit Name">
                <p className="text-xs font-semibold text-gray-800 truncate" title={grn?.outletName}>{grn?.outletName || '—'}</p>
              </InfoCard>

              {grn?.subOutletName ? (
                <InfoCard label="Sub-Unit">
                  <p className="text-xs font-semibold text-gray-800 truncate" title={grn.subOutletName}>{grn.subOutletName}</p>
                </InfoCard>
              ) : null}

              {subLocationDisplay ? (
                <InfoCard label="Sub-Location">
                  <p className="text-xs font-semibold text-gray-800 truncate" title={subLocationDisplay}>{subLocationDisplay}</p>
                </InfoCard>
              ) : null}

              <InfoCard label="Vendor Name">
                <p className="text-xs font-semibold text-gray-800 truncate" title={grn?.vendorName}>{grn?.vendorName || '—'}</p>
              </InfoCard>

              <InfoCard label="Raised By">
                <p className="text-xs font-semibold text-gray-800 truncate" title={grn?.raisedBy}>{grn?.raisedBy || '—'}</p>
              </InfoCard>

              {grn?.remarks ? (
                <InfoCard label="Remarks" className="col-span-2 sm:col-span-3">
                  <p className="text-xs text-gray-700 italic">{grn.remarks}</p>
                </InfoCard>
              ) : null}
            </div>

            {/* Attached Invoices & Documents */}
            {images.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-2xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <FileCheck size={14} className="text-[#084E92]" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      Attached Invoices &amp; Documents
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">
                    {images.length} {images.length === 1 ? 'file' : 'files'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {images.map((img, idx) => {
                    const fileName = getFileNameFromUrl(img.path || img.filePath);
                    return (
                      <div
                        key={img.id || idx}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-blue-100 text-[#084E92] flex items-center justify-center shrink-0">
                            <FileText size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate max-w-[160px]" title={fileName}>
                              {fileName}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {img.fileType || img.moduleName || 'Invoice Document'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {img.path && (
                            <a
                              href={img.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#084E92] hover:border-[#084E92] transition"
                              title="View document"
                            >
                              <Eye size={12} />
                            </a>
                          )}
                          {img.path && (
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(img.path, fileName)}
                              className="w-6 h-6 rounded-md bg-[#084E92] text-white flex items-center justify-center hover:bg-[#073e77] transition cursor-pointer shadow-2xs"
                              title="Download document"
                            >
                              <Download size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Received Items */}
            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50/80 border-b border-gray-200">
                <div className="flex items-center gap-1.5">
                  <Package size={14} className="text-[#084E92]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Received Items</h3>
                </div>
                <span className="text-[11px] font-semibold text-[#084E92] bg-blue-50 border border-blue-100 rounded-md px-2 py-0.5">
                  Total: {items.length} {items.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              <div>
                <table className="w-full table-fixed text-xs">
                  <thead className="bg-[#F8FAFC]">
                    <tr className="border-b border-gray-200 text-[10px] font-bold tracking-wider text-[#64748B] uppercase">
                      <th className="text-center px-2 py-2 w-8">#</th>
                      <th className="text-left px-2.5 py-2 w-[34%]">Items</th>
                      <th className="text-left px-2 py-2 w-[22%]">Batch / Expiry</th>
                      <th className="text-right px-2 py-2 w-[14%]">Appr. Qty</th>
                      <th className="text-right px-2 py-2 w-[16%]">Ret. Qty</th>
                      <th className="text-center px-2 py-2 w-[14%]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => {
                      const returnQty = Number(item.returnQuantity ?? item.rejectedQuantity ?? 0);
                      const returnStatus = item.returnReplacementStatus;

                      return (
                        <tr key={item.id ?? idx} className="hover:bg-[#F8FAFC]/60 transition">
                          <td className="px-2 py-2.5 text-center text-gray-400 font-medium text-[11px]">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="px-2.5 py-2.5 font-semibold text-gray-900 align-top">
                            <div className="pr-1">
                              <p className="text-xs text-gray-900 font-semibold leading-snug break-words">{item.name}</p>
                              {(item.poCode || item.prCode || item.subLocationName || item.subLocation) && (
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {item.poCode && (
                                    <span className="text-[9px] font-mono font-medium text-[#084E92] bg-blue-50 px-1 py-0.2 rounded border border-blue-100">
                                      {item.poCode}
                                    </span>
                                  )}
                                  {item.prCode && (
                                    <span className="text-[9px] font-mono font-medium text-gray-600 bg-gray-100 px-1 py-0.2 rounded border border-gray-200">
                                      {item.prCode}
                                    </span>
                                  )}
                                  {(item.subLocationName || (typeof item.subLocation === 'string' ? item.subLocation : null)) && (
                                    <span className="text-[9px] font-medium text-blue-700 bg-blue-50/60 px-1 py-0.2 rounded border border-blue-200" title="Received at Sub-Location">
                                      {item.subLocationName || item.subLocation}
                                    </span>
                                  )}
                                </div>
                              )}
                              {item.remarks && (
                                <p className="text-[10px] text-gray-500 italic mt-0.5 break-words">{item.remarks}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-left align-top">
                            {item.batchNo || item.batchNumber ? (
                              <span className="inline-block font-mono text-[10px] font-semibold text-[#084E92] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded select-all break-all">
                                {item.batchNo || item.batchNumber}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                            {item.useByDate || item.bestBeforeDate || item.expiryDate ? (
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                Exp: {formatDateDDMMYYYY(item.useByDate || item.bestBeforeDate || item.expiryDate)}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-2.5 text-right align-top whitespace-nowrap">
                            <span className="font-bold text-xs text-emerald-600">
                              {item.acceptedQuantity ?? '-'}
                            </span>
                            {item.unit && (
                              <span className="text-[10px] text-gray-500 font-medium ml-1">
                                {item.unit}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-right align-top">
                            <div className="whitespace-nowrap">
                              <span className={`font-bold text-xs ${returnQty > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                                {returnQty > 0 ? returnQty : '0'}
                              </span>
                              {returnQty > 0 && item.unit && (
                                <span className="text-[10px] text-gray-500 font-medium ml-1">
                                  {item.unit}
                                </span>
                              )}
                            </div>
                            {(returnQty > 0 || returnStatus) && (
                              <div className="mt-0.5">
                                <span className="inline-block text-[9px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded leading-tight">
                                  {returnStatus === 'RETURN_REQUESTED'
                                    ? 'Return'
                                    : returnStatus === 'RETURN_REPLACEMENT_REQUESTED' || returnStatus === 'RETURN_OR_REPLACEMENT'
                                      ? 'Ret. & Repl.'
                                      : returnStatus === 'RETURN_REPLACEMENT_COMPLETED'
                                        ? 'Completed'
                                        : returnStatus || 'Return'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-center align-top whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              <CheckCircle2 size={10} />
                              {item.status || 'Received'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">
                          No items found in this GRN
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-gray-100 shrink-0 bg-[#F9FAFC]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isExporting || acknowledging}
            className="px-4 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isExporting || acknowledging || loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#084E92] text-white text-xs font-semibold hover:bg-[#073e77] transition cursor-pointer shadow-2xs disabled:opacity-60"
          >
            {isExporting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={12} />
                <span>Print Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GRNDetailsViewModal;
