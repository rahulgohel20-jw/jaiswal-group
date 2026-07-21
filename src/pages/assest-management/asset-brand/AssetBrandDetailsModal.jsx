'use client';

import React from 'react';
import { Award, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StatusBadge = ({ status }) => {
  const styles = {
    Active: 'bg-green-100 text-green-700',
    Inactive: 'bg-gray-200 text-gray-600',
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${styles[status]}`}>
      {status}
    </span>
  );
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
    <div className="mt-1 text-sm text-gray-800">{children}</div>
  </div>
);

const AssetBrandDetailsModal = ({ isOpen, onClose, brand }) => {
  if (!isOpen || !brand) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none">{brand.name}</h3>
              <p className="text-xs text-gray-500 mt-2">Brand details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5 cursor-pointer" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <Field label="Brand Name">{brand.name || '—'}</Field>

          <Field label="Description">
            {brand.description || <span className="text-gray-400">No description provided.</span>}
          </Field>

          <Field label="Status">
            <StatusBadge status={brand.status} />
          </Field>

          {brand.totalAssets !== undefined && (
            <Field label="Assets Using This Brand">{brand.totalAssets}</Field>
          )}

          {brand.createdDate && <Field label="Created">{brand.createdDate}</Field>}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssetBrandDetailsModal;