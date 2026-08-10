'use client';

import React, { useState, useEffect } from 'react';
import { Tags, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createRawMaterialBrand, updateRawMaterialBrand } from '../../../services/apiServices';

const emptyForm = { name: '', description: '' };

const AddRawMaterialBrand = ({ isOpen, onClose, onSaved, initialData }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditMode = Boolean(initialData?.id);


  // Autofill fields when opening in edit mode, reset when opening in create mode
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [isOpen, initialData]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  if (!isOpen) return null;

  const handleClose = () => {
    setForm(emptyForm);
    setError(null);
    onClose?.();
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Brand name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        active: initialData?.active ?? true,
        createdBy: initialData?.createdBy ?? 0,
        description: form.description.trim(),
        name: form.name.trim(),
      };

      let response;

      if (isEditMode) {
        response = await updateRawMaterialBrand(
          initialData.id,
          payload
        );
      } else {
        response = await createRawMaterialBrand(payload);
      }

      await onSaved?.(response?.data || response);
      setForm(emptyForm);
      onClose?.();
    } catch (err) {
      console.error('Create Raw Material Brand Error:', err);

      setError(err?.response?.data?.message || err?.response?.data?.errorMessage || `Failed to ${isEditMode ? 'update' : 'create'} raw material brand.`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none">
                Raw Material Brand
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                Create or update a raw material brand.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
          >
            <X className="h-5 w-5 cursor-pointer" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">
              Name
            </label>
            <Input
              placeholder="Enter brand name"
              className="mt-1"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Description
            </label>
            <Input
              placeholder="e.g., 10"
              className="mt-1"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {
              isEditMode ? (saving ? 'Updating...' : 'Update') : (saving ? 'Saving...' : 'Save')
            }
          </Button>
        </div>
      </div>
    </div>
  );
};
export default AddRawMaterialBrand
