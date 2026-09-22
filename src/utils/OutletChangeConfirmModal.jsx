import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OutletChangeConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  outletName = 'selected outlet',
  itemCount = 0,
  loading = false,
  title = 'Change Outlet & Update Stock?',
  description,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 [backdrop-filter:blur(2px)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">{title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Recalculate stock for added items</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-xs text-gray-600 leading-relaxed">
            {description || (
              <>
                Changing the outlet to <strong className="text-gray-900">{outletName}</strong> will recalculate and update the available stock for the <strong className="text-gray-900">{itemCount} item{itemCount !== 1 ? 's' : ''}</strong> currently in your list. Do you want to proceed?
              </>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="text-xs font-semibold rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="bg-[#084E92] hover:bg-[#073e77] text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            {loading ? 'Updating...' : 'Proceed & Update Stock'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OutletChangeConfirmModal;
