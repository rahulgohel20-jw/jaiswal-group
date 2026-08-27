'use client';

import React, { useEffect, useState } from 'react';
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
import {
  addRawMaterialCategory,
  updateRawMaterialCategory,
  getAllRawMaterialCategoryType,
} from '@/services/apiServices';
import { getUserIdFromToken } from '@/utils/auth';

const emptyForm = {
  nameEnglish: '',
  rawMaterialCatTypeId: undefined,
  sequence: '',
  isDirect: false,
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
  const [typeOptions, setTypeOptions] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditMode = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) return;
    const fetchTypes = async () => {
      setLoadingTypes(true);
      try {
        const res = await getAllRawMaterialCategoryType();
        const raw =
          res.data?.data?.['Raw Material Category Type Details'] ?? [];
        setTypeOptions(
          raw
            .filter(
              (t) =>
                t.nameEnglish &&
                t.isActive === true
            )
            .map((t) => ({
              value: String(t.id),
              label: t.nameEnglish,
            })),
        );
      } catch (err) {
        console.error('Failed to fetch category types:', err);
        setTypeOptions([]);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchTypes();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setForm({
        nameEnglish: initialData.nameEnglish || '',
        // initialData comes from mapCategory() in the listing table, where
        // rawMaterialCatTypeId is a number (or null) pulled out of the
        // nested rawMaterialCatType object. Coerce to string so it matches
        // the string values Select uses internally.
        rawMaterialCatTypeId:
          initialData.rawMaterialCatTypeId != null
            ? String(initialData.rawMaterialCatTypeId)
            : undefined,
        sequence: initialData.sequence ?? '',
        isDirect: Boolean(initialData.isDirect),
      });
    } else {
      setForm(emptyForm);
    }

    setError(null);
  }, [isOpen, initialData]);

  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setErrors((prev) => ({
    ...prev,
    [key]: '',
  }));
  }
  if (!isOpen) return null;

  const handleClose = () => {
    setForm(emptyForm);
    setError(null);
    onClose?.();
  };

  const save = async () => {
    if (isEditMode) {
      const payload = {
        nameEnglish: form.nameEnglish,
        rawMaterialCatTypeId: form.rawMaterialCatTypeId,
        sequence: Number(form.sequence),
        isDirect: form.isDirect,
      };
      await updateRawMaterialCategory(initialData.id, payload);
    } else {
      const payload = {
        nameEnglish: form.nameEnglish,
        rawMaterialCatTypeId: form.rawMaterialCatTypeId,
        sequence: Number(form.sequence),
        createdBy: getUserIdFromToken(),
        isDirect: form.isDirect || false,
      };
      await addRawMaterialCategory(payload);
    }
  };

  const validate = () => {
    const newErrors = {};

    // Category Name required
    if (!form.nameEnglish.trim()) {
      newErrors.nameEnglish = 'Category name is required';
    }

    // Type required
    if (!form.rawMaterialCatTypeId) {
      newErrors.rawMaterialCatTypeId = 'Type name is required';
    }

    // Sequence positive
    if (form.sequence && (isNaN(Number(form.sequence)) ||Number(form.sequence) <= 0)) {
      newErrors.sequence = 'Sequence must be Positive';
    } 
    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };


  const handleSave = async () => {
    if (!validate()) {
      return;
    }
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
        `Failed to ${isEditMode ? 'update' : 'create'} material category. Please try again.`
      );
      setError(msg);
      notify.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndAddAnother = async () => {
    if (!validate()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await save();
      setForm(emptyForm);
      onSaved?.();
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(err, 'Failed to create material category. Please try again.');
      setError(msg);
      notify.error(msg);
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
                  : 'Configure a new Material Category.'}
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
                Category Name <span className="text-red-500">*</span>
              </label>

              <Input
                placeholder="e.g. Grocery"
                className="mt-1"
                value={form.nameEnglish}
                onChange={(e) => set('nameEnglish', e.target.value)}
              />
              {errors.nameEnglish && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.nameEnglish}
                </p>
              )}
            </div>

            {/* Type Name — live dropdown sourced from Raw Material Category Type master */}
            <div>
              <label className="text-sm font-medium">
                Type Name <span className="text-red-500">*</span>
              </label>

              <Select
                value={form.rawMaterialCatTypeId}
                onValueChange={(value) => set('rawMaterialCatTypeId', value)}
                disabled={loadingTypes}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={loadingTypes ? 'Loading...' : 'Select Type'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.rawMaterialCatTypeId && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.rawMaterialCatTypeId}
                </p>
              )}
            </div>

            {/* Sequence */}
            <div>
              <label className="text-sm font-medium">Sequence</label>

              <Input
                type="number"
                placeholder="e.g. 10"
                className="mt-1"
                value={form.sequence}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => set('sequence', e.target.value)}
              />
              {errors.sequence && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.sequence}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
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
