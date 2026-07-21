'use client';

import React, { useState } from 'react';
import { Building2, Info, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * "Add Department" modal.
 * Mirrors the visual language of AddCategoryModal but adds a
 * real-time preview card that reflects the form state as the
 * user types, matching the department-master design reference.
 *
 * onSave(form, { addAnother }) is called with the current form
 * values. `addAnother` is true when the user clicks
 * "Save & Add Another" so the caller can decide whether to keep
 * the modal open.
 */
const AddDepartmentModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: '',
    status: 'Active',
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  if (!isOpen) return null;

  const resetForm = () => setForm({ name: '', status: 'Active' });

  const handleSave = () => {
    onSave?.(form, { addAnother: false });
    resetForm();
  };

  const handleSaveAndAddAnother = () => {
    onSave?.(form, { addAnother: true });
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const previewName = form.name.trim() || 'New Department';
  const previewInitial = previewName.charAt(0).toUpperCase();
  const isActive = form.status === 'Active';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none text-primary">Add Department</h3>
              <p className="text-xs text-gray-500 mt-2">Configure organization structure</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5 cursor-pointer" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#737781] uppercase tracking-wide">
              Department Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Sales & Marketing"
              className="mt-1.5"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#737781] uppercase tracking-wide">
              Status
            </label>
            <Select value={form.status} onValueChange={(value) => set('status', value)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info note */}
          <div className="bg-[#EFF4FF] border border-[#DDE7FF] rounded-lg p-3 flex gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-[#43474F] leading-relaxed">
              Departments are linked to employee roles and resource allocation. Deactivating a
              department may affect active workflows.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save Department
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDepartmentModal;