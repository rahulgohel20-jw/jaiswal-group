'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, Info, Layers, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAssetCategories, createSubCategory, updateSubCategory } from '@/services/apiServices';
import { notify } from "@/utils/toast";

const emptyForm = {
  categoryId: '',
  name: '',
  description: '',
  status: 'Active',
};

const AddSubCategoryModal = ({ isOpen, onClose, onSaved, initialData, defaultCategoryId }) => {
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditMode = Boolean(initialData?.id);

  // Load parent categories for the dropdown whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await getAssetCategories();
        const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];
        setCategories(Array.isArray(raw) ? raw : []);
      } catch (err) {
        console.error(err);
        setCategories([]);
      }
    })();
  }, [isOpen]);

  // Populate form for edit, or reset for create
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        categoryId: initialData.categoryId ?? '',
        name: initialData.name || '',
        description: initialData.description || '',
        status: initialData.status || 'Active',
      });
    } else {
      setForm({ ...emptyForm, categoryId: defaultCategoryId ?? '' });
    }
    setError(null);
  }, [isOpen, initialData, defaultCategoryId]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  if (!isOpen) return null;

  const handleClose = () => {
    setForm(emptyForm);
    setError(null);
    onClose?.();
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        categoryId: Number(form.categoryId),
        name: form.name,
        description: form.description,
        active: form.status === 'Active',
      };

      if (isEditMode) {
        await updateSubCategory({ id: initialData.id, ...payload });
         notify.success("Subcategory Updated successfully");

      } else {
        await createSubCategory({ ...payload, createdBy: 0 });
         notify.success("Subcategory Created successfully");
      }

      setForm(emptyForm);
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} sub category. Please try again.`
      );
      notify.error(`Failed to ${isEditMode ? 'update' : 'create'} sub category. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const selectedCategoryName =
    categories.find((c) => String(c.id) === String(form.categoryId))?.name || '—';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none">
                {isEditMode ? 'Edit Sub Category' : 'Add New Sub Category'}
              </h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5 cursor-pointer" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 px-4 pt-3 pb-1 flex-shrink-0 flex-wrap">
          <span>Asset Management</span>
          <ChevronRight size={12} />
          <span>{selectedCategoryName}</span>
          <ChevronRight size={12} />
          <span className="text-primary font-semibold">
            {isEditMode ? 'Edit Sub Category' : 'New Sub Category'}
          </span>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Info className="h-4 w-4" />
            <h4 className="text-sm font-semibold">Sub-Category Information</h4>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">
              Parent Category <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.categoryId ? String(form.categoryId) : ''}
              onValueChange={(value) => set('categoryId', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Sub Category Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Enter sub-category name"
              className="mt-1"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Provide a detailed description of the sub-category..."
              className="mt-1"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={form.status} onValueChange={(value) => set('status', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t bg-gray-50 flex-shrink-0 flex-wrap">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || !form.categoryId || saving}
            className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : isEditMode ? 'Update Sub Category' : 'Save Sub Category'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddSubCategoryModal;