'use client';

import React, { useState, useEffect } from 'react';
import { Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createAssetType, updateAssetType } from '@/services/apiServices';

const emptyForm = { assetsTypeName: '', description: '', status: 'Active' };

const ASSET_TYPE_OPTIONS = ['Fixed', 'Unit-to-Unit', 'Movable'];

const AddAssetTypeModal = ({ isOpen, onClose, onSaved, initialData }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditMode = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        assetsTypeName: initialData.assetTypeName || '',
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
      const payload = {
        name: form.name,
        description: form.description,
        active: form.status === 'Active',
      };

      if (isEditMode) {
        await updateAssetType({ id: initialData.id, ...payload });
      } else {
        await createAssetType({ ...payload, createdBy: 0 });
      }

      setForm(emptyForm);
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.msg ||
          err?.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} asset type. Please try again.`
      );
    } finally {
      setSaving(false);
    }
};

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[10px] z-40"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-190"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#DCEBFF] flex items-center justify-center">
                <Package size={18} className="text-[#084E92]" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-[#1F2937]">
                  {isEditMode ? 'Edit Asset Type' : 'Add Asset Type'}
                </h2>
                <p className="text-sm text-[#6B7280]">
                  Configure how assets are assigned, transferred, and managed.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-black text-xl cursor-pointer"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="p-5">
            <h3 className="text-[#084E92] font-semibold text-sm mb-4">
              01 Asset Type Information
            </h3>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">
                  Asset Type Name*
                </label>
                 <Input
                              placeholder="Enter Asset Type"
                              className="mt-1"
                              value={form.assetType}
                              onChange={(e) => set('assetType', e.target.value)}
                  />
              </div>

              <div>
                <label className="block text-sm mb-2">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className="w-full border border-[#D6DCE5] rounded-lg px-3 py-3 outline-none bg-[#F5F8FF]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm mb-2">Description</label>
              <textarea
                rows={4}
                placeholder="Enter purpose of this asset category..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full border border-[#D6DCE5] rounded-lg px-3 py-3 outline-none resize-none bg-[#F5F8FF]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-5 flex justify-between">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-5 py-2 border border-red-200 text-red-500 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!form.assetType || saving}
                className="px-5 py-2 bg-[#084E92] text-white rounded-lg font-medium cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : isEditMode ? 'Update Asset Type' : 'Save Asset Type'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddAssetTypeModal;