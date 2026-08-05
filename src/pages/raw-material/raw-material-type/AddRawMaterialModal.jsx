'use client';

import React, { useState, useEffect } from 'react';
import { Package, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  addRawMaterialCategoryType,
  updateRawMaterialCategoryType,
} from '@/services/apiServices';
import { getUserIdFromToken } from '@/utils/auth';

const emptyForm = { nameEnglish: '' };

const AddRawMaterialModal = ({ isOpen, onClose, onSaved, initialData }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditMode = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        nameEnglish: initialData.nameEnglish || '',
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

  const save = async () => {
    if (isEditMode) {
      // Edit mode only updates the name — status is changed separately via the toggle + confirm flow
      const payload = {
        nameEnglish: form.nameEnglish,
      };
      await updateRawMaterialCategoryType(initialData.id, payload);
    } else {
      const payload = {
        active: true, // new records default to Active; status is changed afterward via the toggle
        createdBy: getUserIdFromToken(),
        nameEnglish: form.nameEnglish,
      };
      await addRawMaterialCategoryType(payload);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await save();
      setForm(emptyForm);
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      const backendMsg = err?.response?.data?.msg || err?.response?.data?.message;
      setError(
        backendMsg ||
          `Failed to ${isEditMode ? 'update' : 'create'} material type. Please try again.`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none">
                {isEditMode ? 'Edit Raw Material Type' : 'Add Raw Material Type'}
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                {isEditMode
                  ? 'Update the name of this Material Type.'
                  : 'Configure a new Material Type.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
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
              Type Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Food Category"
              className="mt-1"
              value={form.nameEnglish}
              onChange={(e) => set('nameEnglish', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!form.nameEnglish.trim() || saving}
              className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : isEditMode ? 'Update Type' : 'Save Type'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRawMaterialModal;