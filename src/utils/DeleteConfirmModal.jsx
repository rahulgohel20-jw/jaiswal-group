import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemLabel,
  saving = false,
  title = 'Delete Item',
  description,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none">{title}</h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600">
            {description || (
              <>
                Are you sure you want to delete{' '}
                {itemLabel ? (
                  <span className="font-semibold text-gray-900">
                    "{itemLabel}"
                  </span>
                ) : (
                  'this item'
                )}
                ? This action cannot be undone.
              </>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
