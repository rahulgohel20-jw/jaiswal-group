'use client';

import React, { useState } from 'react';
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

const EMPTY_FORM = { name: '', symbol: '', status: 'Active' };

const AddAssetUnitModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  if (!isOpen) return null;

  const resetForm = () => setForm(EMPTY_FORM);

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSave = (addAnother) => {
    onSave?.(form);
    if (addAnother) {
      setForm(EMPTY_FORM);
    } else {
      resetForm();
      onClose?.();
    }
  };

  const isValid = form.name.trim() && form.symbol.trim();

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
              <h3 className="text-lg font-semibold leading-none">Add Unit</h3>
              <p className="text-xs text-gray-500 mt-2">
                Configure measurement units for inventory tracking.
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
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">

            <Button
              onClick={() => handleSave(false)}
              disabled={!isValid}
              className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save Unit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAssetUnitModal;