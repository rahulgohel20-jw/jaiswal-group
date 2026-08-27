'use client';

import React, { useState, useEffect } from 'react';
import { Package, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { notify, getApiErrorMessage } from "@/utils/toast";
import { getUserIdFromToken } from '@/utils/auth';
import { addRawMaterialCategoryType, updateRawMaterialCategoryType } from '../../../services/apiServices';

const emptyForm = { nameEnglish: '' };

const AddRawMaterialModal = ({ isOpen, onClose, onSaved, initialData }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditMode = Boolean(initialData?.id);

  // Sync form state whenever the modal opens or the target item changes
  useEffect(() => {
    if (isOpen) {
      setForm(
        initialData
          ? {
              nameEnglish: initialData.nameEnglish || initialData.name || '',
            }
          : emptyForm
      );
      setErrors({});
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!form.nameEnglish?.trim()) {
      errs.nameEnglish = 'Material type name is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleClose = () => {
    setForm(emptyForm);
    setError(null);
    onClose?.();
  };

  const save = async () => {
    const userId = getUserIdFromToken();
    const payload = {
      nameEnglish: form.nameEnglish.trim(),
      userId,
    };

    if (isEditMode) {
      await updateRawMaterialCategoryType(initialData.id, payload);
      notify.success("Material Type Updated Successfully")
    } else {
      const createPayload = {
        active: true,
        createdBy: userId,
        nameEnglish: form.nameEnglish.trim(),
      };
      await addRawMaterialCategoryType(createPayload);
      notify.success("Material Type Created Successfully")
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      await save();
      setForm(emptyForm);
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(
        err,
        `Failed to ${isEditMode ? 'update' : 'create'} material type. Please try again.`
      );
      setError(msg);
      notify.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // "Save & Add Another" only applies to create mode: saves, then clears
  // the form and keeps the modal open for the next entry.
  const handleSaveAndAddAnother = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      await save();
      setForm(emptyForm);
      onSaved?.();
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(err, 'Failed to create material type. Please try again.');
      setError(msg);
      notify.error(msg);
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