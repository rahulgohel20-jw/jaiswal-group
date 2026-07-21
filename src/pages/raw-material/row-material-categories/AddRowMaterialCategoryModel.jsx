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

const emptyForm = {
  categoryName: '',
  typeName: '',
  sequence: '',
  status: 'Active',
};

const AddRawMaterialCategoryModal = ({
  isOpen,
  onClose,
  onSaved,
  initialData,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditMode = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setForm({
        categoryName: initialData.categoryName || '',
        typeName: initialData.typeName || '',
        sequence: initialData.sequence || '',
        status: initialData.status || 'Active',
      });
    } else {
      setForm(emptyForm);
    }

    setError(null);
  }, [isOpen, initialData]);

  const set = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  if (!isOpen) return null;

  const handleClose = () => {
    setForm(emptyForm);
    setError(null);
    onClose?.();
  };

  const save = async () => {
    const payload = {
      categoryName: form.categoryName,
      typeName: form.typeName,
      sequence: Number(form.sequence),
      active: form.status === 'Active',
    };

    if (isEditMode) {
      await updateRawMaterialCategory({
        id: initialData.id,
        ...payload,
      });
    } else {
      await createRawMaterialCategory({
        ...payload,
        createdBy: 0,
      });
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

      setError(
        err?.response?.data?.message ||
          `Failed to ${
            isEditMode ? 'update' : 'create'
          } material category. Please try again.`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndAddAnother = async () => {
    setSaving(true);
    setError(null);

    try {
      await save();

      setForm(emptyForm);
      onSaved?.();
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          'Failed to create material category. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <Package className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-lg font-semibold leading-none">
                {isEditMode
                  ? 'Edit Raw Material Category'
                  : 'Add Raw Material Category'}
              </h3>

              <p className="text-xs text-gray-500 mt-2">
                {isEditMode
                  ? 'Update this Material Category.'
                  : 'Configure a new Material Category Type.'}
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

          <div className="grid grid-cols-2 gap-4">
            {/* Category Name */}
            <div>
              <label className="text-sm font-medium">
                Category Name
                <span className="text-red-500">*</span>
              </label>

              <Input
                placeholder="e.g. Grocery"
                className="mt-1"
                value={form.categoryName}
                onChange={(e) =>
                  set('categoryName', e.target.value)
                }
              />
            </div>

            {/* Type Name */}
            <div>
              <label className="text-sm font-medium">
                Type Name
                <span className="text-red-500">*</span>
              </label>

              <Input
                placeholder="e.g. Food Category"
                className="mt-1"
                value={form.typeName}
                onChange={(e) =>
                  set('typeName', e.target.value)
                }
              />
            </div>

            {/* Sequence */}
            <div>
              <label className="text-sm font-medium">
                Sequence
              </label>

              <Input
                type="number"
                placeholder="e.g. 10"
                className="mt-1"
                value={form.sequence}
                onChange={(e) =>
                  set('sequence', e.target.value)
                }
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium">
                Status
              </label>

              <Select
                value={form.status}
                onValueChange={(value) =>
                  set('status', value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Active">
                    Active
                  </SelectItem>

                  <SelectItem value="Inactive">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50 shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {!isEditMode && (
              <Button
                variant="outline"
                onClick={handleSaveAndAddAnother}
                disabled={
                  !form.categoryName.trim() ||
                  !form.typeName.trim() ||
                  saving
                }
              >
                Save & Add Another
              </Button>
            )}

            <Button
              onClick={handleSave}
              disabled={
                !form.categoryName.trim() ||
                !form.typeName.trim() ||
                saving
              }
              className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
            >
              <Save className="h-4 w-4" />

              {saving
                ? 'Saving...'
                : isEditMode
                ? 'Update Category'
                : 'Save Category'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRawMaterialCategoryModal;