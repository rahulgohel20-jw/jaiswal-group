'use client';

import React, { useState } from 'react';
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
import { notify } from "@/utils/toast";

export const CATEGORIES = ['Kitchen Equipment', 'IT Equipment', 'Office Furniture', 'Vehicles'];

// Sub categories scoped per category so the dropdown stays relevant to what's selected
export const SUBCATEGORIES_BY_CATEGORY = {
  'Kitchen Equipment': ['Induction Hob', 'Refrigerator', 'Oven', 'Mixer'],
  'IT Equipment': ['Laptop', 'Keyboard', 'Mouse', 'Printer', 'Monitor'],
  'Office Furniture': ['Desk', 'Chair', 'Cabinet', 'Shelving'],
  Vehicles: ['Sedan', 'Van', 'Forklift', 'Motorbike'],
};

const EMPTY_FORM = (defaultCategory) => ({
  category: defaultCategory || 'Kitchen Equipment',
  subCategory: '',
  name: '',
  description: '',
  status: 'Active',
});

/**
 * Add / Edit Asset Item modal.
 * Pass `editingItem` to switch it into edit mode (pre-fills the form,
 * hides "Save & Add Another", and changes labels/button text).
 */
const AddAssetItemModal = ({ isOpen, onClose, onSave, defaultCategory, editingItem, readOnly }) => {
  const [form, setForm] = useState(() =>
    editingItem ? { ...editingItem } : EMPTY_FORM(defaultCategory)
  );

  // Keep the form in sync whenever the modal is (re)opened for a different item
  React.useEffect(() => {
    if (isOpen) {
      setForm(editingItem ? { ...editingItem } : EMPTY_FORM(defaultCategory));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingItem]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const setCategory = (value) => {
    // Changing category invalidates whatever sub category was picked before
    setForm((f) => ({ ...f, category: value, subCategory: '' }));
  };

  if (!isOpen) return null;

  const resetForm = () => setForm(EMPTY_FORM(defaultCategory));

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSave = (addAnother) => {
    onSave?.(form);
    if (addAnother) {
      setForm((f) => ({ ...f, subCategory: '', name: '', description: '' }));
    } else {
      resetForm();
    }
  };

  const subCategoryOptions = SUBCATEGORIES_BY_CATEGORY[form.category] || [];

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
                {readOnly ? 'Asset Item Details' : editingItem ? 'Edit Asset Item' : 'Add New Asset Item'}
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
          <span>{form.category}</span>
          <ChevronRight size={12} />
          <span className="text-primary font-semibold">
            {readOnly ? 'View Asset Item' : editingItem ? 'Edit Asset Item' : 'New Asset Item'}
          </span>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Info className="h-4 w-4" />
            <h4 className="text-sm font-semibold">Asset Item Information</h4>
          </div>

          <div>
            <label className="text-sm font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <Select value={form.category} onValueChange={setCategory} disabled={readOnly}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Sub Category <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.subCategory}
              onValueChange={(value) => set('subCategory', value)}
              disabled={readOnly}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a sub category" />
              </SelectTrigger>
              <SelectContent>
                {subCategoryOptions.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Asset Item Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Enter Asset Item name"
              className="mt-1"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Provide a detailed description of the asset item..."
              className="mt-1"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={form.status} onValueChange={(value) => set('status', value)} disabled={readOnly}>
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

        {/* Footer - Fixed */}
        <div className="flex items-center justify-between gap-2 p-4 border-t bg-gray-50 flex-shrink-0 flex-wrap">
          {readOnly ? (
            <Button
              onClick={handleClose}
              className="bg-primary hover:bg-[#073e77] text-white ml-auto"
            >
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleSave(false)}
                  disabled={!form.name.trim() || !form.subCategory}
                  className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingItem ? 'Save Changes' : 'Save Asset Item'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddAssetItemModal;