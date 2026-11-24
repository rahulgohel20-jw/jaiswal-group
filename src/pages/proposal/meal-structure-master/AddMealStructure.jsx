import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import {
  ArrowLeft,
  Loader2,
  GripVertical,
  Plus,
  Trash2,
  Save,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { AccessDenied } from '@/components/common/AccessDenied';
import { usePagePermissions } from '@/utils/permissions';
import SearchableSelect from '../../../utils/SearchableSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrgScope } from '@/hooks/useOrgScope';
import { notify } from '@/utils/toast';
import {
  getAllMealTypes,
  getAllMealSlots,
  getAllKitchenMenuCategory,
  getAllSubLocationsByOrganizationId,
  getMealStructureById,
  saveOrUpdateMealStructure,
} from '../../../services/apiServices';

const extractArray = (res) => {
  if (!res) return [];
  const raw = res?.data?.data ?? res?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const AddMealStructure = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { canAdd, canEdit, canView } = usePagePermissions([
    'Meal Structure Master',
    'Meal Structure',
    'Meal Structures',
  ]);

  const {
    loading: orgScopeLoading,
    showUnitDropdown,
    effectiveOutletId,
    isOutletUser,
    units: scopeUnits,
    selfOrg,
  } = useOrgScope();

  // Screen states
  const [pageLoading, setPageLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState(null);

  // Dropdown list states
  const [subLocations, setSubLocations] = useState([]);
  const [mealTypes, setMealTypes] = useState([]);
  const [mealSlots, setMealSlots] = useState([]);
  const [kitchenCategories, setKitchenCategories] = useState([]);

  // Drag and Drop tracking
  const [draggedRowIndex, setDraggedRowIndex] = useState(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState(null);

  // Form Header State
  const [formData, setFormData] = useState({
    outletId: '',
    subLocationId: '',
    name: '',
    mealTypeId: '',
    status: 'Active',
  });

  // Dynamic Category Slots Table State
  const [slots, setSlots] = useState([
    {
      id: 0,
      kitchenMenuCategoryId: '',
      mealSlotId: '',
      minimumItems: '',
      maximumItems: '',
    },
  ]);

  const [errors, setErrors] = useState({});

  // Formatted outlet units options
  const outletOptions = useMemo(() => {
    let list = Array.isArray(scopeUnits) ? scopeUnits : [];
    list = list.filter((u) => u?.id != null && String(u.id).toUpperCase() !== 'ALL');

    if (list.length === 0 && selfOrg?.id) {
      list = [selfOrg];
    }

    return list.map((unit) => {
      const name =
        unit.companyNameEnglish ||
        unit.companyName ||
        unit.name ||
        `Outlet #${unit.id}`;
      const code = unit.companyCode || unit.code || '';
      return {
        value: String(unit.id),
        label: code ? `${name} (${code})` : name,
      };
    });
  }, [scopeUnits, selfOrg]);

  // Initial Scope Setup
  useEffect(() => {
    if (orgScopeLoading || isEdit) return;

    if (isOutletUser && !showUnitDropdown && effectiveOutletId) {
      setFormData((prev) => ({ ...prev, outletId: String(effectiveOutletId) }));
    }
  }, [orgScopeLoading, isOutletUser, showUnitDropdown, effectiveOutletId, isEdit]);

  // Load Sub Locations when outlet changes
  useEffect(() => {
    const activeOutlet = formData.outletId;
    if (!activeOutlet || activeOutlet === '0') {
      setSubLocations([]);
      return;
    }

    let isMounted = true;
    const fetchSubLocations = async () => {
      try {
        const res = await getAllSubLocationsByOrganizationId(activeOutlet);
        if (isMounted) setSubLocations(extractArray(res));
      } catch (err) {
        console.error('Failed to load sub-locations:', err);
        if (isMounted) setSubLocations([]);
      }
    };
    fetchSubLocations();

    return () => {
      isMounted = false;
    };
  }, [formData.outletId]);

  // Load Meal Types, Meal Slots, and Kitchen Categories
  useEffect(() => {
    const activeOrg = formData.outletId || effectiveOutletId || 18;

    const fetchDropdowns = async () => {
      try {
        const [typesRes, slotsRes, catRes] = await Promise.all([
          getAllMealTypes(activeOrg),
          getAllMealSlots(activeOrg),
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
        console.error('Failed to load dropdown records:', err);
      }
    };

    fetchDropdowns();
  }, [formData.outletId, effectiveOutletId]);

  // Load Existing Data on Edit
  useEffect(() => {
    if (!isEdit) return;

    const loadRecord = async () => {
      setPageLoading(true);
      setPageError(null);
      try {
        const res = await getMealStructureById(id);
        const data = res?.data?.data ?? res?.data;

        if (data) {
          const matchedOutlet = data.outletId || data.organizationId;
          const matchedSubLocation = data.subOutletId || data.subLocationId;

          setFormData({
            outletId: matchedOutlet ? String(matchedOutlet) : '',
            subLocationId: matchedSubLocation ? String(matchedSubLocation) : '',
            name: data.name || '',
            mealTypeId: data.mealTypeId ? String(data.mealTypeId) : '',
            status: data.isActive !== false ? 'Active' : 'Inactive',
          });

          const rawSlots =
            data.details || data.slots || data.mealStructureSlots || data.items || [];
          if (Array.isArray(rawSlots) && rawSlots.length > 0) {
            setSlots(
              rawSlots.map((s, idx) => ({
                id: s.id || 0,
                kitchenMenuCategoryId: String(
                  s.kitchenMenuCategoryId || s.menuCategoryId || s.categoryId || ''
                ),
                mealSlotId: String(s.mealSlotId || s.slotId || ''),
                minimumItems: s.minimumItems != null ? String(s.minimumItems) : '',
                maximumItems: s.maximumItems != null ? String(s.maximumItems) : '',
              }))
            );
          }
        }
      } catch (err) {
        console.error('Failed to load meal structure details:', err);
        setPageError('Failed to load meal structure details.');
      } finally {
        setPageLoading(false);
      }
    };

    loadRecord();
  }, [id, isEdit]);

  // Row Operations
  const handleAddSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        id: 0,
        kitchenMenuCategoryId: '',
        mealSlotId: '',
        minimumItems: '',
        maximumItems: '',
      },
    ]);
  };

  const handleRemoveSlot = (index) => {
    if (slots.length === 1) {
      notify.error('At least one Category Slot is required.');
      return;
    }
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`kitchenMenuCategoryId_${index}`];
      delete next[`mealSlotId_${index}`];
      delete next[`maximumItems_${index}`];
      return next;
    });
  };

  const handleSlotChange = (index, field, value) => {
    setSlots((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Drag and drop row reordering handlers
  const handleDragStart = (e, index) => {
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverRowIndex !== index) {
      setDragOverRowIndex(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedRowIndex === null || draggedRowIndex === targetIndex) {
      setDraggedRowIndex(null);
      setDragOverRowIndex(null);
      return;
    }

    setSlots((prev) => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedRowIndex, 1);
      updated.splice(targetIndex, 0, draggedItem);
      return updated;
    });

    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
    setErrors({}); // reset indices errors after reorder
  };

  const handleDragEnd = () => {
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Structure Name is required';
    }
    if (!formData.mealTypeId) {
      newErrors.mealTypeId = 'Meal Type is required';
    }

    const seenPairs = new Set();

    slots.forEach((slot, index) => {
      if (!slot.kitchenMenuCategoryId) {
        newErrors[`kitchenMenuCategoryId_${index}`] = 'Category is required';
      }
      if (!slot.mealSlotId) {
        newErrors[`mealSlotId_${index}`] = 'Slot is required';
      }

      // Check duplicate category + mealSlot pair
      if (slot.kitchenMenuCategoryId && slot.mealSlotId) {
        const key = `${slot.kitchenMenuCategoryId}-${slot.mealSlotId}`;
        if (seenPairs.has(key)) {
          newErrors[`duplicate_${index}`] = 'Duplicate Category and Slot combination';
        } else {
          seenPairs.add(key);
        }
      }

      // Optional limits check: only validate if values are entered
      const minVal = slot.minimumItems !== '' ? Number(slot.minimumItems) : null;
      const maxVal = slot.maximumItems !== '' ? Number(slot.maximumItems) : null;

      if (minVal !== null && maxVal !== null && !isNaN(minVal) && !isNaN(maxVal)) {
        if (maxVal < minVal) {
          newErrors[`maximumItems_${index}`] = 'Max cannot be less than Min';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Direct Save Operation
  const handleSave = async () => {
    if (!validate()) {
      notify.error('Please resolve all validation errors before saving.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        id: isEdit ? Number(id) : 0,
        name: formData.name.trim(),
        mealTypeId: Number(formData.mealTypeId),
        isActive: formData.status === 'Active',
        details: slots.map((s, index) => ({
          id: Number(s.id) || 0,
          kitchenMenuCategoryId: Number(s.kitchenMenuCategoryId),
          mealSlotId: Number(s.mealSlotId),
          minimumItems: s.minimumItems !== '' && !isNaN(Number(s.minimumItems)) ? Number(s.minimumItems) : 0,
          maximumItems: s.maximumItems !== '' && !isNaN(Number(s.maximumItems)) ? Number(s.maximumItems) : 0,
          sequence: index + 1,
        })),
        ...(formData.outletId && formData.outletId !== '0'
          ? {
            organizationId: Number(formData.outletId),
            outletId: Number(formData.outletId),
          }
          : {}),
        ...(formData.subLocationId && formData.subLocationId !== '0'
          ? {
            subOutletId: Number(formData.subLocationId),
          }
          : {}),
      };

      await saveOrUpdateMealStructure(payload);
      navigate('/proposal/meal-structure-master');
    } catch (err) {
      console.error('Failed to save meal structure:', err);
      notify.error(err?.response?.data?.msg || 'Failed to save meal structure');
    } finally {
      setSubmitting(false);
    }
  };

  if (canView === false || (!isEdit && canAdd === false) || (isEdit && canEdit === false)) {
    return <AccessDenied pageTitle="Meal Structure Master" />;
  }

  if (pageLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-100 text-[#98A2B3] text-sm gap-2">
          <Loader2 size={18} className="animate-spin text-[#084E92]" />
          Loading Meal Structure details...
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mx-auto pt-2 pb-8 space-y-4">
        <PageErrorAlert error={pageError} onRetry={() => navigate(0)} />

        {/* Standard Page Header */}
        <PageHeader
          title={isEdit ? 'Edit Meal Structure' : 'Create Meal Structure'}
          description="Configure meal structure with outlet details, meal type, limits and category slots"
          actions={
            <div className="flex items-center gap-2">
              <HeaderActionButton
                variant="outline"
                to="/proposal/meal-structure-master"
                icon={ArrowLeft}
                label="Back to Listing"
              />
              <HeaderActionButton
                onClick={handleSave}
                disabled={submitting}
                icon={submitting ? Loader2 : Save}
                label={submitting ? 'Saving...' : 'Save Structure'}
              />
            </div>
          }
        />

        {/* Unified Main Form Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
          {/* Section 1: Meal Structure Details */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Meal Structure Details</h2>
            {/* <p className="text-xs text-gray-400 mt-0.5">Define location, naming, and serving parameters</p> */}
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Unit */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Unit
                </label>
                <SearchableSelect
                  name="outletId"
                  value={formData.outletId}
                  disabled={!showUnitDropdown || orgScopeLoading}
                  onChange={(e) => {
                    const val = e?.target?.value ?? e?.value ?? '';
                    setFormData((prev) => ({ ...prev, outletId: val, subLocationId: '' }));
                    if (errors.outletId) setErrors((prev) => ({ ...prev, outletId: '' }));
                  }}
                  options={outletOptions}
                  placeholder="Select Unit"
                  isClearable={true}
                />
                {errors.outletId && (
                  <p className="text-xs text-red-500 mt-1">{errors.outletId}</p>
                )}
              </div>

              {/* Sub-Location */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Sub-Location
                </label>
                <SearchableSelect
                  name="subLocationId"
                  value={formData.subLocationId}
                  disabled={!formData.outletId}
                  onChange={(e) => {
                    const val = e?.target?.value ?? e?.value ?? '';
                    setFormData((prev) => ({ ...prev, subLocationId: val }));
                  }}
                  options={subLocations.map((sl) => ({
                    value: String(sl.id),
                    label: sl.locationName || sl.name || `Sub Location #${sl.id}`,
                  }))}
                  placeholder="Select Sub-Location"
                  isClearable={true}
                />
              </div>

              {/* Structure Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Structure Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Enter structure name"
                  className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${errors.name
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[#C3C6D1] focus:border-[#084E92]'
                    }`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Meal Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Meal Type <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  name="mealTypeId"
                  value={formData.mealTypeId}
                  onChange={(e) => {
                    const val = e?.target?.value ?? e?.value ?? '';
                    setFormData((prev) => ({ ...prev, mealTypeId: val }));
                    if (errors.mealTypeId) setErrors((prev) => ({ ...prev, mealTypeId: '' }));
                  }}
                  options={mealTypes.map((t) => ({
                    value: String(t.id),
                    label: t.name || t.mealTypeName || `Meal Type #${t.id}`,
                  }))}
                  placeholder="Select Meal Type"
                  isClearable={false}
                />
                {errors.mealTypeId && (
                  <p className="text-xs text-red-500 mt-1">{errors.mealTypeId}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Status <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl bg-white text-xs">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: Category Slots */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Category Slots</h2>
              {/* <p className="text-xs text-gray-400 mt-0.5">Drag rows by the handle to reorder. Serial numbers adjust automatically.</p> */}
            </div>

            <HeaderActionButton
              onClick={handleAddSlot}
              icon={Plus}
              label="Add Category Slot"
            />
          </div>

          {/* Slots Table */}
          <div className="px-6 pb-6">
            <div className="rounded-xl border border-gray-200/80 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3 px-3.5 text-left w-20">Seq</th>
                    <th className="py-3 px-3.5 text-left">Kitchen Category <span className="text-red-500">*</span></th>
                    <th className="py-3 px-3.5 text-left">Slot Label <span className="text-red-500">*</span></th>
                    <th className="py-3 px-3.5 text-left w-28">Min Items</th>
                    <th className="py-3 px-3.5 text-left w-28">Max Items</th>
                    <th className="py-3 px-3.5 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white font-medium">
                  {slots.map((slot, index) => {
                    const catErr = errors[`kitchenMenuCategoryId_${index}`];
                    const slotErr = errors[`mealSlotId_${index}`];
                    const maxErr = errors[`maximumItems_${index}`];
                    const dupErr = errors[`duplicate_${index}`];
                    const isDragging = draggedRowIndex === index;
                    const isDragOver = dragOverRowIndex === index;

                    return (
                      <React.Fragment key={slot.id ? `slot-${slot.id}` : `slot-index-${index}`}>
                        <tr
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`transition ${isDragging
                            ? 'opacity-40 bg-blue-50/50'
                            : isDragOver
                              ? 'bg-blue-50/70 border-t-2 border-t-[#084E92]'
                              : 'hover:bg-gray-50/60'
                            }`}
                        >
                          {/* Sequence & Drag Handle */}
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 p-0.5 rounded"
                                title="Drag to reorder"
                              >
                                <GripVertical size={16} />
                              </span>
                              <span className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-gray-700 text-xs select-none">
                                {index + 1}
                              </span>
                            </div>
                          </td>

                          {/* Kitchen Category */}
                          <td className="py-2.5 px-3.5">
                            <SearchableSelect
                              name={`cat_${index}`}
                              value={slot.kitchenMenuCategoryId}
                              onChange={(e) => {
                                const val = e?.target?.value ?? e?.value ?? '';
                                handleSlotChange(index, 'kitchenMenuCategoryId', val);
                                if (catErr || dupErr) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    [`kitchenMenuCategoryId_${index}`]: '',
                                    [`duplicate_${index}`]: '',
                                  }));
                                }
                              }}
                              options={kitchenCategories.map((c) => ({
                                value: String(c.id),
                                label: c.nameEnglish || c.name || `Category #${c.id}`,
                              }))}
                              placeholder="Select Category"
                              isClearable={false}
                            />
                            {catErr && (
                              <p className="text-[11px] text-red-500 mt-0.5">{catErr}</p>
                            )}
                          </td>

                          {/* Slot Label */}
                          <td className="py-2.5 px-3.5">
                            <SearchableSelect
                              name={`slot_${index}`}
                              value={slot.mealSlotId}
                              onChange={(e) => {
                                const val = e?.target?.value ?? e?.value ?? '';
                                handleSlotChange(index, 'mealSlotId', val);
                                if (slotErr || dupErr) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    [`mealSlotId_${index}`]: '',
                                    [`duplicate_${index}`]: '',
                                  }));
                                }
                              }}
                              options={mealSlots.map((s) => ({
                                value: String(s.id),
                                label: s.name || s.slotName || `Slot #${s.id}`,
                              }))}
                              placeholder="Select Slot Label"
                              isClearable={false}
                            />
                            {slotErr && (
                              <p className="text-[11px] text-red-500 mt-0.5">{slotErr}</p>
                            )}
                          </td>

                          {/* Minimum Items (Optional) */}
                          <td className="py-2.5 px-3.5">
                            <input
                              type="number"
                              min="0"
                              placeholder="Optional"
                              value={slot.minimumItems}
                              onChange={(e) => {
                                handleSlotChange(index, 'minimumItems', e.target.value);
                                if (maxErr) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    [`maximumItems_${index}`]: '',
                                  }));
                                }
                              }}
                              className="w-full h-9 px-3 text-xs rounded-lg border border-[#C3C6D1] bg-white focus:outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20 transition"
                            />
                          </td>

                          {/* Maximum Items (Optional) */}
                          <td className="py-2.5 px-3.5">
                            <input
                              type="number"
                              min="0"
                              placeholder="Optional"
                              value={slot.maximumItems}
                              onChange={(e) => {
                                handleSlotChange(index, 'maximumItems', e.target.value);
                                if (maxErr) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    [`maximumItems_${index}`]: '',
                                  }));
                                }
                              }}
                              className={`w-full h-9 px-3 text-xs rounded-lg border bg-white focus:outline-none focus:ring-1 transition ${maxErr
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-[#C3C6D1] focus:border-[#084E92] focus:ring-[#084E92]/20'
                                }`}
                            />
                            {maxErr && (
                              <p className="text-[11px] text-red-500 mt-0.5">{maxErr}</p>
                            )}
                          </td>

                          {/* Delete Action */}
                          <td className="py-2.5 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(index)}
                              className="w-8 h-8 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center mx-auto transition cursor-pointer"
                              title="Delete Slot"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>

                        {/* Duplicate Combination Notice */}
                        {dupErr && (
                          <tr className="bg-red-50/60">
                            <td colSpan={6} className="py-1 px-3.5 text-left text-[11px] text-red-600 font-medium">
                              Row {index + 1}: {dupErr}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Integrated Footer Actions */}
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-3">
            <Link
              to="/proposal/meal-structure-master"
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-[#C3C6D1] rounded-lg hover:bg-gray-50 transition shadow-2xs"
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] rounded-lg transition shadow-2xs disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Saving...' : 'Save Structure'}
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default AddMealStructure;