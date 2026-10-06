import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemLabel,
  saving = false,
  title = 'Delete Item',
  description,
}) => {
  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm p-0 overflow-hidden rounded-xl border border-gray-100 shadow-xl bg-white"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold leading-none text-gray-900">
                {title}
              </DialogTitle>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <DialogDescription className="text-sm text-gray-600">
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
          </DialogDescription>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmModal;
