'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Info, Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const AddDepartmentModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  saving = false,
}) => {
  const isEditMode = Boolean(initialData);

  const [form, setForm] = useState({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: initialData?.name || '',
        description: initialData?.description || '',
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  if (!isOpen) return null;

  const resetForm = () => setForm({ name: '', description: '' });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Department name is required';
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Role Master only accepts { name, description } — no status,
    // company, or unit fields.
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
    };

    onSave?.(payload, { addAnother: false });
  };

  const handleClose = () => {
    if (saving) return;
    resetForm();
    setErrors({});
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none text-primary">
                {isEditMode ? 'Edit Department' : 'Add Department'}
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                {isEditMode
                  ? 'Update department details'
                  : 'Configure a new department'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0 disabled:opacity-60"
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
              disabled={saving}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#737781] uppercase tracking-wide">
              Description
            </label>
            <Textarea
              placeholder="Brief description of this department's function..."
              className="mt-1.5 resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="bg-[#EFF4FF] border border-[#DDE7FF] rounded-lg p-3 flex gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-[#43474F] leading-relaxed">
              Departments are linked to employee roles and resource allocation.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving
              ? 'Saving...'
              : isEditMode
                ? 'Update Department'
                : 'Save Department'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddDepartmentModal;
