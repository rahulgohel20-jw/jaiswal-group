'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Info, Layers, Save, X } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const isEditMode = Boolean(initialData?.id);

  // Load parent categories for the dropdown whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await getAssetCategories();
        const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];
        console.log(raw)
        const activeCategories = Array.isArray(raw)
          ? raw.filter((category) => category.active === true)
          : [];

        setCategories(activeCategories);
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
    setCategorySearch("");
    setCategoryOpen(false);
    setError(null);
  }, [isOpen, initialData, defaultCategoryId]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!isOpen || categories.length === 0 || !form.categoryId) return;

    const selectedCategory = categories.find(
      (category) =>
        String(category.id) === String(form.categoryId)
    );

    if (selectedCategory) {
      setCategorySearch(selectedCategory.name || "");
    }
  }, [isOpen, form.categoryId, categories]);


  const selectedCategoryName =
    categories.find((c) => String(c.id) === String(form.categoryId))?.name || '—';

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

      } else {
        await createSubCategory({ ...payload, createdBy: 0 });
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
            className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
          >
            <X className="h-5 w-5 cursor-pointer" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 px-4 pt-3 pb-1 shrink-0 flex-wrap">
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
            <Popover
              open={categoryOpen}
              onOpenChange={setCategoryOpen}
              modal={false}
            >
              <PopoverTrigger asChild>
                <div className="relative w-full mt-1">
                  <Input
                    type="text"
                    value={categorySearch}
                    placeholder="Select a category"
                    onClick={() => setCategoryOpen(true)}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      setCategoryOpen(true);
                      set("categoryId", "");
                    }}
                    className="w-full h-10 pr-10"
                  />

                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </PopoverTrigger>

              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="p-0 w-(--radix-popover-trigger-width) overflow-hidden z-100"
              >
                <div className="max-h-52 overflow-y-auto">
                  {categories
                    .filter((category) =>
                      category.name
                        ?.toLowerCase()
                        .includes(categorySearch.trim().toLowerCase())
                    )
                    .map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          set("categoryId", String(category.id));

                          setCategorySearch(category.name || "");

                          setCategoryOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 ${String(form.categoryId) === String(category.id)
                            ? "bg-blue-50 text-primary font-medium"
                            : "text-gray-700"
                          }`}
                      >
                        {category.name}
                      </button>
                    ))}

                  {categories.filter((category) =>
                    category.name
                      ?.toLowerCase()
                      .includes(categorySearch.trim().toLowerCase())
                  ).length === 0 && (
                      <div className="px-3 py-3 text-sm text-gray-500">
                        No category found
                      </div>
                    )}
                </div>
              </PopoverContent>
            </Popover>
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
        <div className="flex items-center justify-between gap-2 p-4 border-t bg-gray-50 shrink-0 flex-wrap">
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