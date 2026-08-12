'use client';

import React, { useState, useEffect } from 'react';
import { Award, Info, Save, X } from 'lucide-react';
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
import { createAssetBrand, updateAssetBrand } from '@/services/apiServices';
import { notify } from "@/utils/toast";

const emptyForm = { name: '', description: '', status: 'Active' };

const AddAssetBrandModal = ({ isOpen, onClose, onSaved, initialData }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditMode = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
        status: initialData.status || 'Active',
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
    setSaving(true);
    setError(null);
    try {
      if (isEditMode) {
        await updateAssetBrand({
          id: initialData.id,
          name: form.name,
          description: form.description,
          active: form.status === 'Active',
        });
      } else {
        // Matches the create endpoint's request schema exactly:
        // { active, createdBy, description, name }
        await createAssetBrand({
          active: form.status === 'Active',
          createdBy: 0,
          description: form.description,
          name: form.name,
        });
      }

      setForm(emptyForm);
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} brand. Please try again.`
      );
      notify.error(`Failed to ${isEditMode ? 'update' : 'create'} brand. Please try again.`);
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
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none">
                {isEditMode ? 'Edit Brand' : 'Add New Brand'}
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                {isEditMode
                  ? 'Update this asset brand.'
                  : 'Create a brand to organize and classify organizational assets efficiently.'}
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

        {/* Content - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Info className="h-4 w-4" />
            <h4 className="text-sm font-semibold">Brand Information</h4>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Enter brand name"
              className="mt-1"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Brand Description</label>
            <Textarea
              placeholder="Describe this brand..."
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

        <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : isEditMode ? 'Update Brand' : 'Save Brand'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddAssetBrandModal;