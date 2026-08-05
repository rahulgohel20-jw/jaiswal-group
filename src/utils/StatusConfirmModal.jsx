'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Generic confirm-before-toggle modal. Reusable across any master's status column.
 *
 * Props:
 * - isOpen, onClose, onConfirm, saving: standard modal controls
 * - itemLabel: the entity name to show, e.g. the row's name (was `targetName`)
 * - nextStatusLabel: what it will become, e.g. "Active" / "Inactive" (was derived from `targetStatus` boolean)
 * - title: optional override for the heading; defaults to "Change status to {nextStatusLabel}?"
 */
const StatusConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemLabel,
  nextStatusLabel,
  title,
  saving,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 flex flex-col">
        <div className="flex items-start justify-between gap-3 p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold leading-tight">
              {title || `Change status to ${nextStatusLabel}?`}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X className="h-5 w-5 cursor-pointer" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-600">
            {itemLabel ? (
              <>
                Are you sure you want to set <span className="font-medium">{itemLabel}</span> to{' '}
                <span className="font-medium">{nextStatusLabel}</span>?
              </>
            ) : (
              <>Are you sure you want to set this item to {nextStatusLabel}?</>
            )}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={saving}
            className="bg-primary hover:bg-[#073e77] text-white"
          >
            {saving ? 'Updating...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StatusConfirmModal;