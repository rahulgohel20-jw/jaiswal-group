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
} from 'lucide-react';
import { Link } from 'react-router';

const InfoCard = ({ label, children, className = '' }) => (
  <div className={`border border-gray-200 rounded-xl px-4 py-3 bg-[#FDFDFE] shadow-2xs ${className}`}>
    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">{label}</p>
    <div className="mt-1">{children}</div>
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

const GRNDetailsViewModal = ({ isOpen, onClose, grn, onPrint, onAcknowledge, acknowledging, loading }) => {
  if (!isOpen) return null;

  const items = grn?.items || [];
  const images = Array.isArray(grn?.images) ? grn.images : [];

  const handleClose = () => {
    if (acknowledging) return;
    onClose?.();
  };

  const raisedByInitials = (grn?.raisedBy || 'Admin')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-gray-100">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4.5 border-b border-gray-100 shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">GRN Details View</h2>
              {grn?.status && <StatusPill status={grn?.status} />}
            </div>
            <p className="text-xs text-gray-500 mt-1 font-mono">{grn?.grnCode}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (scrollable) */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
            <div className="w-6 h-6 border-2 border-[#084E92] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading GRN details...</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5 overflow-y-auto">
            {/* Top info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {/* GRN Code spans 2 columns for clear visibility */}
              <InfoCard label="GRN Code" className="sm:col-span-2">
                <p className="text-sm font-bold text-[#084E92] font-mono tracking-tight select-all">
                  {grn?.grnCode || '—'}
                </p>
              </InfoCard>

              <InfoCard label="GRN Date">
                <p className="text-sm font-medium text-gray-800">{grn?.date || '—'}</p>
              </InfoCard>

              <InfoCard label="PO Code">
                {grn?.purchaseOrderId ? (
                  <Link
                    to={`/purchase/purchase-order-detail/${grn.purchaseOrderId}`}
                    className="flex items-center gap-1.5 text-sm font-bold text-[#084E92] hover:underline"
                  >
                    <span>{grn.poCode}</span>
                    <ExternalLink size={13} />
                  </Link>
                ) : (
                  <p className="text-sm font-bold text-gray-800">{grn?.poCode || '—'}</p>
                )}
              </InfoCard>

              <InfoCard label="Outlet Name">
                <div className="flex items-center gap-2">
                  <Store size={15} className="text-[#084E92] shrink-0" />
                  <p className="text-sm font-semibold text-gray-800 truncate">{grn?.outletName || '—'}</p>
                </div>
              </InfoCard>

              {grn?.subOutletName ? (
                <InfoCard label="Sub-outlet (Sublet)">
                  <div className="flex items-center gap-2">
                    <CornerDownRight size={15} className="text-[#084E92] shrink-0" />
                    <p className="text-sm font-semibold text-gray-800 truncate">{grn.subOutletName}</p>
                  </div>
                </InfoCard>
              ) : null}

              <InfoCard label="Vendor Name">
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-[#084E92] shrink-0" />
                  <p className="text-sm font-semibold text-gray-800 truncate">{grn?.vendorName || '—'}</p>
                </div>
              </InfoCard>

              <InfoCard label="Raised By">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-[#084E92] text-[10px] font-bold flex items-center justify-center shrink-0">
                    {raisedByInitials}
                  </span>
                  <p className="text-sm font-semibold text-gray-800 truncate">{grn?.raisedBy || '—'}</p>
                </div>
              </InfoCard>

              {grn?.remarks ? (
                <InfoCard label="Remarks" className="sm:col-span-2 md:col-span-3">
                  <p className="text-xs text-gray-700 italic">{grn.remarks}</p>
                </InfoCard>
              ) : null}
            </div>

            {/* Attached Invoices & Documents */}
            {images.length > 0 && (
              <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <FileCheck size={16} className="text-[#084E92]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Attached Invoices &amp; Documents
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-500">
                    {images.length} {images.length === 1 ? 'file' : 'files'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {images.map((img, idx) => {
                    const fileName = getFileNameFromUrl(img.path || img.filePath);
                    return (
                      <div
                        key={img.id || idx}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#084E92] flex items-center justify-center shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate max-w-[180px]" title={fileName}>
                              {fileName}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {img.fileType || img.moduleName || 'Invoice Document'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {img.path && (
                            <a
                              href={img.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#084E92] hover:border-[#084E92] transition"
                              title="View document"
                            >
                              <Eye size={13} />
                            </a>
                          )}
                          {img.path && (
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(img.path, fileName)}
                              className="w-7 h-7 rounded-lg bg-[#084E92] text-white flex items-center justify-center hover:bg-[#073e77] transition cursor-pointer shadow-2xs"
                              title="Download document"
                            >
                              <Download size={13} />
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
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-[#084E92]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Received Items</h3>
                </div>
                <span className="text-xs font-semibold text-[#084E92] bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-0.5">
                  Total: {items.length} {items.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-140 text-xs">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-bold tracking-wider text-gray-500 uppercase border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 w-12">#</th>
                      <th className="text-left px-4 py-2.5">Item Name</th>
                      <th className="text-left px-4 py-2.5 w-24">Unit</th>
                      <th className="text-right px-4 py-2.5 w-24">Appr. Qty</th>
                      <th className="text-right px-4 py-2.5 w-24">Ret. Qty</th>
                      <th className="text-center px-4 py-2.5 w-36">Return Status</th>
                      <th className="text-center px-4 py-2.5 w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const returnQty = Number(item.returnQuantity ?? item.rejectedQuantity ?? 0);
                      const returnStatus = item.returnReplacementStatus;

                      return (
                        <tr key={item.id ?? idx} className="border-t border-gray-100 hover:bg-gray-50/50 transition">
                          <td className="px-4 py-3 text-gray-400 font-medium">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            <div>
                              <p>{item.name}</p>
                              {item.remarks && (
                                <p className="text-[10px] text-gray-500 italic mt-0.5">{item.remarks}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-[11px] font-medium">
                              {item.unit || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                            {item.acceptedQuantity ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-amber-700">
                            {returnQty > 0 ? returnQty : '0'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {returnQty > 0 || returnStatus ? (
                              <span className="inline-block text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded">
                                {returnStatus === 'RETURN_REQUESTED'
                                  ? 'Return'
                                  : returnStatus === 'RETURN_REPLACEMENT_REQUESTED' || returnStatus === 'RETURN_OR_REPLACEMENT'
                                    ? 'Return & Replacement'
                                    : returnStatus === 'RETURN_REPLACEMENT_COMPLETED'
                                      ? 'Completed'
                                      : returnStatus || 'Return'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <CheckCircle2 size={11} />
                              {item.status || 'Received'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {items.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">
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
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-gray-100 shrink-0 bg-[#F9FAFC]">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="px-5 py-2 rounded-lg bg-[#084E92] text-white text-xs font-semibold hover:bg-[#073e77] transition cursor-pointer shadow-2xs"
          >
            Print GRN
          </button>
        </div>
      </div>
    </div>
  );
};

export default GRNDetailsViewModal;
