import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export const ClosePurchaseOrderModal = ({
  isOpen,
  onClose,
  po = null,
  reason = '',
  onReasonChange,
  error = '',
  loading = false,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#E7EAF0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FBEAEC] flex items-center justify-center text-[#C0293D] shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#101828]">Close Purchase Order</h3>
              <p className="text-xs text-[#667085] mt-0.5">
                PO: <span className="font-semibold text-[#2952E3] font-mono">{po?.poCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {po?.outlet && (
            <div className="bg-[#F9FAFC] border border-[#E7EAF0] rounded-xl px-3.5 py-2.5 text-xs text-[#475467]">
              <span className="text-[#98A2B3] font-medium">Outlet: </span>
              <span className="font-semibold text-[#101828]">{po.outlet}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1.5">
              Reason for Closing <span className="text-[#C0293D]">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Enter reason for closing this PO manually..."
              className="w-full px-3.5 py-2.5 text-sm border border-[#E7EAF0] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#C0293D]/20 focus:border-[#C0293D] resize-none placeholder:text-[#98A2B3]"
            />
            {error && (
              <p className="text-xs text-[#C0293D] mt-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E7EAF0] bg-[#F9FAFC]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-[#E7EAF0] text-xs font-semibold text-[#344054] hover:bg-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !reason.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C0293D] text-white text-xs font-semibold hover:bg-[#a62334] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Closing...
              </>
            ) : (
              'Confirm Close'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClosePurchaseOrderModal;
