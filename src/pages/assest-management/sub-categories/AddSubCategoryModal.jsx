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

const PARENT_CATEGORIES = ['Kitchen Equipment', 'IT Equipment', 'Office Furniture', 'Vehicles'];

const AddSubCategoryModal = ({ isOpen, onClose, onSave, defaultParentCategory }) => {
  const [form, setForm] = useState({
    parentCategory: defaultParentCategory || 'Kitchen Equipment',
    name: '',
    description: '',
    status: 'Active',
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  if (!isOpen) return null;

  const resetForm = () =>
    setForm({
      parentCategory: defaultParentCategory || 'Kitchen Equipment',
      name: '',
      description: '',
      status: 'Active',
    });

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSave = (addAnother) => {
    onSave?.(form);
    if (addAnother) {
      setForm((f) => ({ ...f, name: '', description: '' }));
    } else {
      resetForm();
    }
  };

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
              <h3 className="text-lg font-semibold leading-none">Add New Sub Category</h3>
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
          <span>{form.parentCategory}</span>
          <ChevronRight size={12} />
          <span className="text-primary font-semibold">New Sub Category</span>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Info className="h-4 w-4" />
            <h4 className="text-sm font-semibold">Sub-Category Information</h4>
          </div>

          <div>
            <label className="text-sm font-medium">
              Parent Category <span className="text-red-500">*</span>
            </label>
            <Select value={form.parentCategory} onValueChange={(value) => set('parentCategory', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
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

        {/* Footer - Fixed */}
        <div className="flex items-center justify-between gap-2 p-4 border-t bg-gray-50 flex-shrink-0 flex-wrap">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleSave(false)}
              disabled={!form.name.trim()}
              className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Sub Category
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSubCategoryModal;