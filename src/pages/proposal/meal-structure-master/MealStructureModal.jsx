import React, { useEffect, useState } from 'react';
import { X, Loader2, Layers, Plus, Trash2 } from 'lucide-react';
import { notify } from '@/utils/toast';
import {
  getAllMealTypes,
  getAllMealSlots,
  getAllKitchenMenuCategory,
  saveOrUpdateMealStructure,
} from '../../../services/apiServices';
import { getOrgIdFromToken } from '@/utils/auth';
import { getAuth } from '@/auth/lib/helpers';

const extractArray = (res) => {
  if (!res) return [];
  const raw = res?.data?.data ?? res?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const getLoggedInOrgId = () => {
  const tokenOrgId = getOrgIdFromToken();
  if (tokenOrgId && !isNaN(Number(tokenOrgId)) && Number(tokenOrgId) > 0) {
    return Number(tokenOrgId);
  }
  const storedAuth = getAuth();
  const authOrg =
    storedAuth?.organizationId ||
    storedAuth?.data?.organizationId ||
    storedAuth?.accessibleScope?.assignments?.[0]?.organizationId;
  if (authOrg && !isNaN(Number(authOrg)) && Number(authOrg) > 0) {
    return Number(authOrg);
  }
  const local = localStorage.getItem('organizationId') || localStorage.getItem('selectedCompanyId');
  if (local && !isNaN(Number(local)) && Number(local) > 0) {
    return Number(local);
  }
  return 18;
};

export const MealStructureModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialMealTypeId = '',
  organizationId = null,
  zIndex = 'z-50',
}) => {
  const effectiveOrgId = organizationId || getLoggedInOrgId();

  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [mealTypes, setMealTypes] = useState([]);
  const [mealSlots, setMealSlots] = useState([]);
  const [kitchenCategories, setKitchenCategories] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    mealTypeId: '',
  });

  const [slots, setSlots] = useState([
    {
      id: 0,
      kitchenMenuCategoryId: '',
      mealSlotId: '',
      minimumItems: '1',
      maximumItems: '1',
    },
  ]);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      name: '',
      mealTypeId: initialMealTypeId ? String(initialMealTypeId) : '',
    });
    setSlots([
      {
        id: 0,
        kitchenMenuCategoryId: '',
        mealSlotId: '',
        minimumItems: '1',
        maximumItems: '1',
      },
    ]);
    setErrors({});

    const fetchDropdowns = async () => {
      setLoadingDropdowns(true);
      try {
        const [typesRes, slotsRes, catRes] = await Promise.all([
          getAllMealTypes(effectiveOrgId),
          getAllMealSlots(effectiveOrgId),
          getAllKitchenMenuCategory(),
        ]);

        setMealTypes(extractArray(typesRes));
        setMealSlots(extractArray(slotsRes));

        const catData =
          catRes?.data?.data?.['Menu Category Details'] ||
          catRes?.data?.data ||
          extractArray(catRes);
        setKitchenCategories(Array.isArray(catData) ? catData : []);
      } catch (err) {
        console.error('Failed to load dropdown records in MealStructureModal:', err);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchDropdowns();
  }, [isOpen, initialMealTypeId, effectiveOrgId]);

  if (!isOpen) return null;

  const handleAddSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        id: 0,
        kitchenMenuCategoryId: '',
        mealSlotId: '',
        minimumItems: '1',
        maximumItems: '1',
      },
    ]);
  };

  const handleRemoveSlot = (index) => {
    if (slots.length === 1) {
      notify.error('At least one slot is required in the structure.');
      return;
    }
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`category_${index}`];
      delete next[`slot_${index}`];
      delete next[`limit_${index}`];
      return next;
    });
  };

  const handleSlotChange = (index, field, value) => {
    setSlots((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`category_${index}`];
      delete next[`slot_${index}`];
      delete next[`limit_${index}`];
      return next;
    });
  };

  const validate = () => {
    const err = {};
    if (!formData.name.trim()) err.name = 'Structure name is required';
    if (!formData.mealTypeId) err.mealTypeId = 'Meal type is required';

    if (slots.length === 0) {
      err.slots = 'At least one slot is required';
    }

    slots.forEach((s, idx) => {
      if (!s.kitchenMenuCategoryId) {
        err[`category_${idx}`] = 'Required';
      }
      if (!s.mealSlotId) {
        err[`slot_${idx}`] = 'Required';
      }
      const minVal = s.minimumItems !== '' ? Number(s.minimumItems) : null;
      const maxVal = s.maximumItems !== '' ? Number(s.maximumItems) : null;
      if (minVal !== null && maxVal !== null && !isNaN(minVal) && !isNaN(maxVal)) {
        if (maxVal < minVal) {
          err[`limit_${idx}`] = 'Max < Min';
        }
      }
    });

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        id: 0,
        name: formData.name.trim(),
        mealTypeId: Number(formData.mealTypeId),
        isActive: true,
        details: slots.map((s, index) => ({
          id: 0,
          kitchenMenuCategoryId: Number(s.kitchenMenuCategoryId),
          mealSlotId: Number(s.mealSlotId),
          minimumItems: s.minimumItems !== '' && !isNaN(Number(s.minimumItems)) ? Number(s.minimumItems) : 1,
          maximumItems: s.maximumItems !== '' && !isNaN(Number(s.maximumItems)) ? Number(s.maximumItems) : 1,
          sequence: index + 1,
        })),
        ...(effectiveOrgId
          ? {
              organizationId: Number(effectiveOrgId),
              outletId: Number(effectiveOrgId),
            }
          : {}),
      };

      const res = await saveOrUpdateMealStructure(payload);
      const savedData = res?.data?.data ?? res?.data;
      notify.success('Meal structure created successfully');
      onSuccess?.(savedData || payload);
      onClose();
    } catch (err) {
      console.error('Failed to save meal structure:', err);
      notify.error(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to save meal structure');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in zoom-in-95 duration-150`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#00376C] flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Add Meal Structure</h3>
              <p className="text-xs text-gray-500">
                Configure structure name, meal type, and slot categories
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {loadingDropdowns ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-gray-400">
              <Loader2 size={20} className="animate-spin text-[#084E92]" />
              <span>Loading masters data...</span>
            </div>
          ) : (
            <>
              {/* Structure Name & Meal Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Structure Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Executive Lunch, Standard Dinner"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }));
                      if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    className={`w-full h-10 px-3 text-xs font-semibold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                      errors.name ? 'border-red-500' : 'border-[#C3C6D1]'
                    }`}
                  />
                  {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Meal Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.mealTypeId}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, mealTypeId: e.target.value }));
                      if (errors.mealTypeId) setErrors((prev) => ({ ...prev, mealTypeId: '' }));
                    }}
                    className={`w-full h-10 px-3 text-xs font-semibold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                      errors.mealTypeId ? 'border-red-500' : 'border-[#C3C6D1]'
                    }`}
                  >
                    <option value="">Select Meal Type</option>
                    {mealTypes.map((mt) => (
                      <option key={mt.id} value={mt.id}>
                        {mt.name || mt.mealTypeName}
                      </option>
                    ))}
                  </select>
                  {errors.mealTypeId && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.mealTypeId}</p>
                  )}
                </div>
              </div>

              {/* Slot Categories Configuration */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                      Structure Slots &amp; Categories <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Define the slots (courses) and kitchen categories included in this meal structure
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#084E92] text-xs font-semibold text-[#084E92] bg-blue-50/50 hover:bg-blue-100/50 transition cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Slot</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {slots.map((slot, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50/80 border border-gray-200 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                          Slot #{index + 1}
                        </span>
                        {slots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(index)}
                            className="text-gray-400 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50 cursor-pointer"
                            title="Remove Slot"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Kitchen Category */}
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                            Category *
                          </label>
                          <select
                            value={slot.kitchenMenuCategoryId}
                            onChange={(e) =>
                              handleSlotChange(index, 'kitchenMenuCategoryId', e.target.value)
                            }
                            className={`w-full h-8 px-2 text-xs rounded-lg border bg-white focus:outline-none focus:ring-1 focus:ring-[#084E92] ${
                              errors[`category_${index}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select Category</option>
                            {kitchenCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name || c.categoryName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Meal Slot */}
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                            Meal Slot *
                          </label>
                          <select
                            value={slot.mealSlotId}
                            onChange={(e) => handleSlotChange(index, 'mealSlotId', e.target.value)}
                            className={`w-full h-8 px-2 text-xs rounded-lg border bg-white focus:outline-none focus:ring-1 focus:ring-[#084E92] ${
                              errors[`slot_${index}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select Slot</option>
                            {mealSlots.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name || s.slotName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Min Items */}
                        <div className="sm:col-span-1.5 col-span-6">
                          <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                            Min
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={slot.minimumItems}
                            onChange={(e) =>
                              handleSlotChange(index, 'minimumItems', e.target.value)
                            }
                            className="w-full h-8 px-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#084E92]"
                          />
                        </div>

                        {/* Max Items */}
                        <div className="sm:col-span-1.5 col-span-6">
                          <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                            Max
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={slot.maximumItems}
                            onChange={(e) =>
                              handleSlotChange(index, 'maximumItems', e.target.value)
                            }
                            className={`w-full h-8 px-2 text-xs rounded-lg border bg-white focus:outline-none focus:ring-1 focus:ring-[#084E92] ${
                              errors[`limit_${index}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>

                      {errors[`limit_${index}`] && (
                        <p className="text-[10px] text-red-500 font-semibold">
                          Max items cannot be less than Min items.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loadingDropdowns}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
            <span>Save Meal Structure</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealStructureModal;
