import React, { useState, useEffect } from 'react';
import { Download, Calendar, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useExportReport } from '@/hooks/useExportReport';

/**
 * Modal component for exporting PO Reports (Short Items in PO & Pending GRN)
 * Allows past dates for both From Date and To Date.
 * Date rule: Both dates are optional; if one is provided, the other is mandatory.
 */
export const ExportReportModal = ({
  isOpen,
  onClose,
  reportType = 'short items in PO',
  selectedPoId = '',
  selectedPoObject = null,
  onClearPoSelection,
}) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateError, setDateError] = useState('');

  const { exporting, exportReport: runExportReport } = useExportReport();

  const isShortItems = reportType === 'short items in PO' || reportType === 'Short Item Received';

  // Reset state whenever modal opens or report type changes
  useEffect(() => {
    if (isOpen) {
      setFromDate('');
      setToDate('');
      setDateError('');
    }
  }, [isOpen, reportType]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (exporting) return;
    setDateError('');
    onClose();
  };

  const handleSubmit = async () => {
    setDateError('');

    // Date validation: if from date is added, to date is mandatory; alone from and to date are not allowed.
    if (fromDate && !toDate) {
      const err = 'To Date is mandatory when From Date is provided.';
      setDateError(err);
      toast.error(err);
      return;
    }
    if (!fromDate && toDate) {
      const err = 'From Date is mandatory when To Date is provided.';
      setDateError(err);
      toast.error(err);
      return;
    }
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      const err = 'From Date cannot be after To Date.';
      setDateError(err);
      toast.error(err);
      return;
    }

    const payload = {
      type: reportType,
      id: isShortItems && selectedPoId ? Number(selectedPoId) : 0,
      fromDate: fromDate || '',
      toDate: toDate || '',
    };

    const fileName = isShortItems
      ? `Short_Items_in_PO_${selectedPoId ? `PO_${selectedPoId}_` : ''}${Date.now()}.pdf`
      : `Pending_GRN_of_POs_${Date.now()}.pdf`;

    const res = await runExportReport(payload, {
      fileName,
      successMessage: 'Report exported successfully.',
      errorMessage: 'Failed to export report.',
    });

    if (res?.success) {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#E7EAF0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FE] flex items-center justify-center text-[#2952E3] shrink-0">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#101828]">
                {isShortItems
                  ? 'Export Short Item Received Report'
                  : 'Export Pending GRN Report'}
              </h3>
              <p className="text-xs text-[#667085] mt-0.5">
                {isShortItems
                  ? 'Short items in purchase order report'
                  : "Pending GRN of PO's (Item-wise) report"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={exporting}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* PO Scope info for Short Items report */}
          {isShortItems && (
            <div>
              {selectedPoId ? (
                <div className="bg-[#EEF2FE] border border-[#C7D7FE] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[#2952E3]">
                    <CheckCircle2 size={15} className="text-[#2952E3] shrink-0" />
                    <span>
                      Selected PO:{' '}
                      <strong className="font-mono">
                        {selectedPoObject?.poCode || `PO #${selectedPoId}`}
                      </strong>{' '}
                      {selectedPoObject?.outlet ? `(${selectedPoObject.outlet})` : ''}
                    </span>
                  </div>
                  {onClearPoSelection && (
                    <button
                      type="button"
                      onClick={onClearPoSelection}
                      className="text-[11px] text-[#C0293D] hover:underline cursor-pointer font-semibold shrink-0"
                      title="Clear PO selection to export all POs"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-[#F9FAFC] border border-[#E7EAF0] rounded-xl p-3 text-xs text-[#667085]">
                  <span>* No specific PO checked on table. Report will be exported across all purchase orders.</span>
                </div>
              )}
            </div>
          )}

          {!isShortItems && (
            <div className="bg-[#F9FAFC] border border-[#E7EAF0] rounded-xl p-3 text-xs text-[#667085]">
              <span>* Pending GRN report will be exported item-wise across all purchase orders.</span>
            </div>
          )}

          {/* Date Filters (Past dates explicitly allowed, paired validation) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#344054]">
                Date Range
              </label>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                    setDateError('');
                  }}
                  className="text-[11px] text-[#2952E3] hover:underline cursor-pointer"
                >
                  Clear Dates
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">From Date</label>
                <div className="relative">
                  <Calendar
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      if (dateError) setDateError('');
                    }}
                    className="w-full h-10 border border-[#E7EAF0] rounded-xl pl-9 pr-3 text-xs text-[#101828] bg-white outline-none focus:border-[#2952E3] focus:ring-1 focus:ring-[#2952E3]/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-500 block mb-1">To Date</label>
                <div className="relative">
                  <Calendar
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      if (dateError) setDateError('');
                    }}
                    className="w-full h-10 border border-[#E7EAF0] rounded-xl pl-9 pr-3 text-xs text-[#101828] bg-white outline-none focus:border-[#2952E3] focus:ring-1 focus:ring-[#2952E3]/20"
                  />
                </div>
              </div>
            </div>

            {dateError && (
              <p className="text-xs text-[#C0293D] mt-1.5 flex items-center gap-1">
                <AlertTriangle size={12} />
                {dateError}
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E7EAF0] bg-[#F9FAFC]">
          <button
            type="button"
            onClick={handleClose}
            disabled={exporting}
            className="px-4 py-2 rounded-xl border border-[#E7EAF0] text-xs font-semibold text-[#344054] hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#084E92] text-white text-xs font-semibold hover:bg-[#073e77] transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {exporting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={13} />
                Download Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportReportModal;
