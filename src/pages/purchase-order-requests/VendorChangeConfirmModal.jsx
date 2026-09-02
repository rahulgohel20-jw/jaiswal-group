import React, { useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

const VendorChangeConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  vendorName = 'Selected Vendor',
  loading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2">Change Purchase Order Vendor?</h3>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          Changing vendor to{' '}
          <strong className="text-gray-900 font-semibold">{vendorName}</strong>{' '}
          will affect the following configurations:
        </p>

        <ul className="space-y-2 mb-5 text-xs text-gray-600 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#084E92] mt-1 shrink-0" />
            <span>
              <strong>Item Prices:</strong> Rates will be updated according to the new vendor's configured price list (and set to 0 for unconfigured items).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#084E92] mt-1 shrink-0" />
            <span>
              <strong>Bill To Address:</strong> Vendor registered address, GSTIN, and PAN will be changed to the new vendor's details.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#084E92] mt-1 shrink-0" />
            <span>
              <strong>Tax Rates:</strong> Taxes (CGST/SGST vs IGST) and Total Amount will be recalculated based on the new vendor's state.
            </span>
          </li>
        </ul>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063d73] rounded-lg transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Confirm & Switch Vendor</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorChangeConfirmModal;
