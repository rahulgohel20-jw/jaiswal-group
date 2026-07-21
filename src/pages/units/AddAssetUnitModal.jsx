'use client';

import React, { useState, useEffect } from 'react';
import { Ruler, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createAssetUnit, updateAssetUnit } from '@/services/apiServices';

const emptyForm = { name: '', symbol: '', description: '', status: 'Active' };

const AddAssetUnitModal = ({ isOpen, onClose, onSaved, initialData }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditMode = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        name: initialData.name || '',
        symbol: initialData.symbol || '',
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

  const isValid = form.name.trim() && form.symbol.trim();

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        symbol: form.symbol,
        description: form.description,
        active: form.status === 'Active',
      };

      if (isEditMode) {
        await updateAssetUnit({ id: initialData.id, ...payload });
      } else {
        await createAssetUnit({ ...payload, createdBy: 0 });
      }

      setForm(emptyForm);
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} unit. Please try again.`
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
              <Ruler className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none">
                {isEditMode ? 'Edit Unit' : 'Add Unit'}
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                {isEditMode
                  ? 'Update this measurement unit.'
                  : 'Configure measurement units for inventory tracking.'}
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
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Unit Name
              </label>
              <Input
                placeholder="e.g., Kilograms"
                className="mt-1.5"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Symbol
              </label>
              <Input
                placeholder="e.g., Kg"
                className="mt-1.5"
                value={form.symbol}
                onChange={(e) => set('symbol', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Description <span className="text-gray-400 normal-case font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="Describe this unit..."
              className="mt-1.5"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </label>
            <Select value={form.status} onValueChange={(value) => set('status', value)}>
              <SelectTrigger className="mt-1.5">
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
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : isEditMode ? 'Update Unit' : 'Save Unit'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddAssetUnitModal;