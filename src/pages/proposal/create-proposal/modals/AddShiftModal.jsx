import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, CheckCircle2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllMealTypes,
  getAllMealStructures,
  getMealStructureById,
  saveProposalShift,
  populateShiftSlots,
  getShiftMenuSlots,
} from '@/services/apiServices';
import { extractArray, calculateTotalCost, calculateProposedRate } from '../types';
import MealTypeModal from '@/pages/proposal/meal-type-master/MealTypeModal';
import { MealStructurePreviewModal } from './MealStructurePreviewModal';

export const AddShiftModal = ({
  isOpen,
  onClose,
  proposalId,
  organizationId = null,
  existingShiftsCount = 0,
  initialShift = null,
  defaultManpowerCost = 0,
  onShiftSaved,
  onMealTypesLoaded,
  onMealStructuresLoaded,
}) => {
  const [mealTypes, setMealTypes] = useState([]);
  const [mealStructures, setMealStructures] = useState([]);
  const [loadingMealTypes, setLoadingMealTypes] = useState(false);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [saving, setSaving] = useState(false);

  // Quick Master Modal State
  const [isAddMealTypeOpen, setIsAddMealTypeOpen] = useState(false);

  // Selected Meal Structure Details Preview State
  const [selectedStructureDetails, setSelectedStructureDetails] = useState(null);
  const [loadingStructureDetails, setLoadingStructureDetails] = useState(false);
  const [isStructurePreviewOpen, setIsStructurePreviewOpen] = useState(false);

  // Form Fields
  const [mealTypeId, setMealTypeId] = useState('');
  const [mealStructureId, setMealStructureId] = useState('');
  const [shiftName, setShiftName] = useState('');
  const [headcount, setHeadcount] = useState('');
  const [guaranteedPax, setGuaranteedPax] = useState('');
  const [ratePerPlate, setRatePerPlate] = useState(''); // Optional RM Cost
  const [manpowerCost, setManpowerCost] = useState('');
  const [overheadCost, setOverheadCost] = useState('');
  const [assetCost, setAssetCost] = useState('');
  const [inflation, setInflation] = useState('');
  const [profit, setProfit] = useState('');
  const [quotedRate, setQuotedRate] = useState('');
  const [sequence, setSequence] = useState(1);

  const [errors, setErrors] = useState({});

  // 1. Fetch Meal Types
  const fetchMealTypes = useCallback(async () => {
    setLoadingMealTypes(true);
    try {
      const res = await getAllMealTypes({ page: 0, size: 100 });
      const list = extractArray(res);
      setMealTypes(list);
      onMealTypesLoaded?.(list);
      return list;
    } catch (err) {
      console.error('Failed to load meal types:', err);
      const fallback = [
        { id: 1, name: 'Breakfast' },
        { id: 2, name: 'Lunch' },
        { id: 3, name: 'Dinner' },
        { id: 4, name: 'Hi-Tea' },
        { id: 5, name: 'Midnight Snacks' },
      ];
      setMealTypes(fallback);
      onMealTypesLoaded?.(fallback);
      return fallback;
    } finally {
      setLoadingMealTypes(false);
    }
  }, [onMealTypesLoaded]);

  // 2. Fetch ALL Meal Structures regardless of organization or date
  const fetchStructures = useCallback(async () => {
    setLoadingStructures(true);
    try {
      const res = await getAllMealStructures({ page: 0, size: 100 });
      const list = extractArray(res);
      setMealStructures(list);
      onMealStructuresLoaded?.(list);
      return list;
    } catch (err) {
      console.error('Failed to load meal structures:', err);
      setMealStructures([]);
      return [];
    } finally {
      setLoadingStructures(false);
    }
  }, [onMealStructuresLoaded]);

  useEffect(() => {
    if (!isOpen) return;

    // Reset or populate fields
    if (initialShift) {
      setMealTypeId(initialShift.mealTypeId ? String(initialShift.mealTypeId) : '');
      setMealStructureId(initialShift.mealStructureId ? String(initialShift.mealStructureId) : '');
      setShiftName(initialShift.shiftName || '');
      setHeadcount(initialShift.headCount || initialShift.headcount || '');
      setGuaranteedPax(initialShift.guaranteedPax || '');
      setRatePerPlate(
        initialShift.ratePerPlate !== undefined && initialShift.ratePerPlate !== null
          ? String(initialShift.ratePerPlate)
          : initialShift.rmCost !== undefined && initialShift.rmCost !== null
          ? String(initialShift.rmCost)
          : ''
      );
      setManpowerCost(
        initialShift.manpowerCost !== undefined && initialShift.manpowerCost !== null && initialShift.manpowerCost !== ''
          ? String(initialShift.manpowerCost)
          : initialShift.manpower !== undefined && initialShift.manpower !== null && initialShift.manpower !== ''
          ? String(initialShift.manpower)
          : defaultManpowerCost > 0 ? String(defaultManpowerCost) : ''
      );
      setOverheadCost(
        initialShift.overheadCost !== undefined && initialShift.overheadCost !== null
          ? String(initialShift.overheadCost)
          : initialShift.overheadExpense !== undefined && initialShift.overheadExpense !== null
          ? String(initialShift.overheadExpense)
          : ''
      );
      setAssetCost(
        initialShift.assetCost !== undefined && initialShift.assetCost !== null
          ? String(initialShift.assetCost)
          : ''
      );
      setInflation(initialShift.inflationPercentage || initialShift.inflation || '');
      setProfit(initialShift.profitPercentage || initialShift.profit || '');
      setQuotedRate(initialShift.quotedRate || '');
      setSequence(initialShift.sequence || 1);
    } else {
      setMealTypeId('');
      setMealStructureId('');
      setShiftName('');
      setHeadcount('');
      setGuaranteedPax('');
      setRatePerPlate('');
      setManpowerCost(defaultManpowerCost > 0 ? String(defaultManpowerCost) : '');
      setOverheadCost('');
      setAssetCost('');
      setInflation('');
      setProfit('');
      setQuotedRate('');
      setSequence(existingShiftsCount + 1);
    }
    setErrors({});
    setSelectedStructureDetails(null);

    fetchMealTypes();
    fetchStructures();
  }, [isOpen, initialShift, existingShiftsCount, fetchMealTypes, fetchStructures]);

  // Load structure preview details whenever mealStructureId changes
  useEffect(() => {
    if (!mealStructureId) {
      setSelectedStructureDetails(null);
      return;
    }

    let isMounted = true;
    const loadStructureDetails = async () => {
      setLoadingStructureDetails(true);
      try {
        const res = await getMealStructureById(Number(mealStructureId));
        if (!isMounted) return;
        const data = res?.data?.data ?? res?.data;
        if (data) {
          setSelectedStructureDetails(data);
        } else {
          const match = mealStructures.find((m) => String(m.id) === String(mealStructureId));
          setSelectedStructureDetails(match || null);
        }
      } catch (err) {
        console.warn('Failed to load structure preview details:', err);
        if (isMounted) {
          const match = mealStructures.find((m) => String(m.id) === String(mealStructureId));
          setSelectedStructureDetails(match || null);
        }
      } finally {
        if (isMounted) setLoadingStructureDetails(false);
      }
    };

    loadStructureDetails();
    return () => {
      isMounted = false;
    };
  }, [mealStructureId, mealStructures]);

  if (!isOpen) return null;

  // Auto Calculations (RM Cost is optional)
  const tc =
    (ratePerPlate !== '' && Number(ratePerPlate) > 0) ||
    (manpowerCost !== '' && Number(manpowerCost) > 0) ||
    (overheadCost !== '' && Number(overheadCost) > 0) ||
    (assetCost !== '' && Number(assetCost) > 0)
      ? calculateTotalCost(ratePerPlate || 0, inflation || 0, manpowerCost || 0, overheadCost || 0, assetCost || 0)
      : 0;
  const proposed = tc > 0 ? calculateProposedRate(tc, profit || 0) : 0;

  const handleMealTypeSelect = (e) => {
    const selectedId = e.target.value;
    setMealTypeId(selectedId);
    const found = mealTypes.find((m) => String(m.id) === String(selectedId));
    if (found) {
      const name = found.name || found.mealTypeName || '';
      setShiftName(name);
    }
    if (errors.mealTypeId) setErrors((prev) => ({ ...prev, mealTypeId: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!mealTypeId) err.mealTypeId = 'Please select a meal type';
    if (!mealStructureId) err.mealStructureId = 'Please select a meal structure';
    if (!shiftName.trim()) err.shiftName = 'Shift name is required';
    if (!headcount || Number(headcount) <= 0) err.headcount = 'Valid headcount is required';
    if (ratePerPlate !== '' && Number(ratePerPlate) < 0) {
      err.ratePerPlate = 'RM Cost cannot be negative';
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    setSaving(true);
    try {
      const parsedRate = ratePerPlate !== '' ? Number(ratePerPlate) : 0;
      const parsedQuoted = quotedRate !== '' ? Number(quotedRate) : proposed;
      const effectiveProposalId = Number(proposalId || initialShift?.proposalId || 0);

      // Note: startTime and endTime are intentionally omitted from payload per requirements
      const payload = {
        proposalId: effectiveProposalId || undefined,
        mealTypeId: Number(mealTypeId),
        mealStructureId: Number(mealStructureId),
        shiftName: shiftName.trim(),
        headCount: Number(headcount) || 0,
        headcount: Number(headcount) || 0,
        guaranteedPax: guaranteedPax ? Number(guaranteedPax) : null,
        ratePerPlate: parsedRate,
        rmCost: parsedRate,
        manpowerCost: Number(manpowerCost) || 0,
        overheadCost: Number(overheadCost) || 0,
        assetCost: Number(assetCost) || 0,
        inflationPercentage: Number(inflation) || 0,
        profitPercentage: Number(profit) || 0,
        quotedRate: parsedQuoted,
        sequence: Number(sequence) || 1,
        userId: 1,
        ...(initialShift?.id ? { id: initialShift.id } : {}),
      };

      // Call single shift API so that the shift is created in backend and has a real proposal shift ID
      let savedShiftData = null;
      let savedShiftId = initialShift?.id || initialShift?.shiftId;

      if (effectiveProposalId) {
        try {
          const shiftRes = await saveProposalShift(effectiveProposalId, payload);
          savedShiftData = shiftRes?.data?.data ?? shiftRes?.data;
          if (savedShiftData) {
            const returnedId = savedShiftData.id ?? savedShiftData.shiftId ?? savedShiftData.proposalShiftId;
            if (returnedId) {
              savedShiftId = Number(returnedId);
            }
          }
        } catch (shiftErr) {
          console.warn('Single saveProposalShift error, falling back:', shiftErr);
        }
      }

      if (!savedShiftId) {
        savedShiftId = Date.now();
      }

      // Populate & load slots for the shift
      let slots = [];
      const isRealShiftId = typeof savedShiftId === 'number' && savedShiftId > 0 && savedShiftId < 1000000000000;

      if (isRealShiftId) {
        try {
          await populateShiftSlots(savedShiftId, 1);
        } catch (popErr) {
          console.warn('populateShiftSlots error:', popErr);
        }

        try {
          const slotRes = await getShiftMenuSlots(savedShiftId);
          const rawSlots = extractArray(slotRes);
          if (Array.isArray(rawSlots) && rawSlots.length > 0) {
            slots = rawSlots.map((s, idx) => ({
              ...s,
              id: s.id || s.slotId || s.mealSlotId,
              slotId: s.id || s.slotId || s.mealSlotId,
              proposalShiftId: savedShiftId,
              shiftId: savedShiftId,
              slotName: s.slotName || s.mealSlotName || `Slot ${idx + 1}`,
              items: s.items || [],
            }));
          }
        } catch (slotErr) {
          console.warn('getShiftMenuSlots error:', slotErr);
        }
      }

      // Fallback: If slots not returned from backend, load directly from selected Meal Structure
      if (slots.length === 0 && mealStructureId) {
        try {
          const structRes = await getMealStructureById(Number(mealStructureId));
          const structData = structRes?.data?.data ?? structRes?.data;
          const rawDetails =
            structData?.details || structData?.slots || structData?.mealStructureSlots || structData?.items || [];
          if (Array.isArray(rawDetails) && rawDetails.length > 0) {
            slots = rawDetails.map((d, idx) => ({
              id: d.id || idx + 1,
              slotId: d.mealSlotId || d.slotId || d.id,
              mealStructureDetailId: d.id,
              structureDetailId: d.id,
              slotName: d.mealSlotName || d.slotName || d.name || `Slot ${idx + 1}`,
              kitchenMenuCategoryId: d.kitchenMenuCategoryId || d.menuCategoryId || d.categoryId,
              kitchenMenuCategoryName: d.kitchenMenuCategoryName || d.categoryName || '',
              minItems: d.minimumItems ?? d.minCount ?? 1,
              maxItems: d.maximumItems ?? d.maxCount ?? 1,
              required: d.isRequired !== false && d.required !== false,
              proposalShiftId: savedShiftId,
              shiftId: savedShiftId,
              items: [],
            }));
          }
        } catch (structErr) {
          console.warn('Loading structure details error:', structErr);
        }
      }

      const selectedType = mealTypes.find((t) => Number(t.id ?? t.mealTypeId) === Number(mealTypeId));
      const selectedStruct = mealStructures.find((s) => Number(s.id ?? s.structureId) === Number(mealStructureId));

      const combinedShift = {
        ...(savedShiftData || {}),
        id: savedShiftId,
        shiftId: savedShiftId,
        proposalShiftId: savedShiftId,
        proposalId: effectiveProposalId,
        mealTypeId: Number(mealTypeId),
        mealTypeName: selectedType?.mealTypeName || selectedType?.name || '',
        mealStructureId: Number(mealStructureId),
        mealStructureName: selectedStruct?.structureName || selectedStruct?.name || '',
        shiftName: shiftName.trim(),
        headCount: Number(headcount) || 0,
        headcount: Number(headcount) || 0,
        guaranteedPax: guaranteedPax ? Number(guaranteedPax) : null,
        ratePerPlate: parsedRate,
        rmCost: parsedRate,
        manpowerCost: Number(manpowerCost) || 0,
        overheadCost: Number(overheadCost) || 0,
        assetCost: Number(assetCost) || 0,
        inflationPercentage: Number(inflation) || 0,
        inflation: Number(inflation) || 0,
        totalCost: tc,
        profitPercentage: Number(profit) || 0,
        profit: Number(profit) || 0,
        proposedRate: proposed,
        quotedRate: parsedQuoted,
        contractedRate: parsedQuoted,
        sequence: Number(sequence) || 1,
        slots: slots || [],
      };

      toast.success(
        initialShift
          ? `Shift "${shiftName}" updated successfully.`
          : `Shift "${shiftName}" saved and structure slots loaded.`
      );
      if (onShiftSaved) {
        await onShiftSaved(combinedShift, slots);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save proposal shift:', err);
      toast.error('Failed to save meal shift. Please check input parameters.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {initialShift ? 'Edit Meal Shift' : 'Add Meal Shift'}
            </h2>
            <p className="text-xs text-gray-400">
              Configure shift parameters, meal structure, headcount, and rates
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {/* Meal Type Selection with Quick Add */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Meal Type <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {loadingMealTypes ? (
                <div className="flex-1 h-10 px-3 flex items-center gap-2 border border-gray-200 rounded-xl text-xs text-gray-400 bg-gray-50">
                  <Loader2 size={14} className="animate-spin text-[#084E92]" />
                  Loading meal types...
                </div>
              ) : (
                <select
                  value={mealTypeId}
                  onChange={handleMealTypeSelect}
                  className={`flex-1 h-10 px-3 text-xs font-semibold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
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
              )}
              <button
                type="button"
                onClick={() => setIsAddMealTypeOpen(true)}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-[#084E92] hover:bg-[#073e77] text-white transition cursor-pointer shadow-xs"
                title="Add Meal Type"
              >
                <Plus size={18} />
              </button>
            </div>
            {errors.mealTypeId && <p className="text-[11px] text-red-500 mt-1">{errors.mealTypeId}</p>}
          </div>

          {/* Meal Structure Selection with Details Preview Modal */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Meal Structure <span className="text-red-500">*</span>
              </label>
              {mealStructureId && (
                <button
                  type="button"
                  onClick={() => setIsStructurePreviewOpen(true)}
                  className="text-xs font-semibold text-[#084E92] hover:text-[#063b6d] hover:underline cursor-pointer transition"
                >
                  See meal structure
                </button>
              )}
            </div>
            {loadingStructures ? (
              <div className="h-10 px-3 flex items-center gap-2 border border-gray-200 rounded-xl text-xs text-gray-400 bg-gray-50">
                <Loader2 size={14} className="animate-spin text-[#084E92]" />
                Loading meal structures...
              </div>
            ) : mealStructures.length === 0 ? (
              <div className="p-3 border border-amber-200 bg-amber-50 rounded-xl text-xs text-amber-800">
                No meal structures found in the system.
              </div>
            ) : (
              <select
                value={mealStructureId}
                onChange={(e) => {
                  setMealStructureId(e.target.value);
                  if (errors.mealStructureId) setErrors((prev) => ({ ...prev, mealStructureId: '' }));
                }}
                className={`w-full h-10 px-3 text-xs font-semibold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                  errors.mealStructureId ? 'border-red-500' : 'border-[#C3C6D1]'
                }`}
              >
                <option value="">Select Meal Structure</option>
                {mealStructures.map((ms) => (
                  <option key={ms.id} value={ms.id}>
                    {ms.structureName || ms.name || `Structure #${ms.id}`}
                  </option>
                ))}
              </select>
            )}
            {errors.mealStructureId && (
              <p className="text-[11px] text-red-500 mt-1">{errors.mealStructureId}</p>
            )}
          </div>

          {/* Shift Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Shift Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={shiftName}
              onChange={(e) => {
                setShiftName(e.target.value);
                if (errors.shiftName) setErrors((prev) => ({ ...prev, shiftName: '' }));
              }}
              placeholder="e.g. Morning Breakfast, Executive Lunch"
              className={`w-full h-10 px-3 text-xs font-semibold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                errors.shiftName ? 'border-red-500' : 'border-[#C3C6D1]'
              }`}
            />
            {errors.shiftName && <p className="text-[11px] text-red-500 mt-1">{errors.shiftName}</p>}
          </div>

          {/* Headcount & Guaranteed Pax */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Headcount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 500"
                value={headcount}
                onChange={(e) => {
                  setHeadcount(e.target.value);
                  if (errors.headcount) setErrors((prev) => ({ ...prev, headcount: '' }));
                }}
                className={`w-full h-10 px-3 text-xs font-semibold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                  errors.headcount ? 'border-red-500' : 'border-[#C3C6D1]'
                }`}
              />
              {errors.headcount && <p className="text-[11px] text-red-500 mt-1">{errors.headcount}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Guaranteed Pax
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 450"
                value={guaranteedPax}
                onChange={(e) => setGuaranteedPax(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20"
              />
            </div>
          </div>

          {/* Section: Cost Breakdown (Per Plate) */}
          <div className="pt-2 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              {/* RM Cost */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  RM Cost / Plate
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold select-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={ratePerPlate}
                    onChange={(e) => {
                      setRatePerPlate(e.target.value);
                      if (errors.ratePerPlate) setErrors((prev) => ({ ...prev, ratePerPlate: '' }));
                    }}
                    className={`w-full h-10 pl-7 pr-3 text-xs font-semibold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition ${
                      errors.ratePerPlate ? 'border-red-500' : 'border-[#C3C6D1]'
                    }`}
                  />
                </div>
                {errors.ratePerPlate && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.ratePerPlate}</p>
                )}
              </div>

              {/* Manpower Cost */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Manpower Cost
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold select-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={manpowerCost}
                    onChange={(e) => setManpowerCost(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 text-xs font-semibold rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition"
                  />
                </div>
              </div>

              {/* Overhead Expense */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Overhead Expense
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold select-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={overheadCost}
                    onChange={(e) => setOverheadCost(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 text-xs font-semibold rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition"
                  />
                </div>
              </div>

              {/* Asset Allocation */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Asset Allocation
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold select-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={assetCost}
                    onChange={(e) => setAssetCost(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 text-xs font-semibold rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Commercials & Margins */}
          <div className="pt-2 border-t border-gray-100">

            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Inflation */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Inflation Rate
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0.0"
                    value={inflation}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setInflation('');
                      } else {
                        const num = Number(val);
                        setInflation(num < 0 ? 0 : val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                      }
                    }}
                    className="w-full h-10 pl-3 pr-7 text-xs font-semibold rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold select-none">
                    %
                  </span>
                </div>
              </div>

              {/* Profit Margin */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Profit Margin
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0.0"
                    value={profit}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setProfit('');
                      } else {
                        const num = Number(val);
                        setProfit(num < 0 ? 0 : val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                      }
                    }}
                    className="w-full h-10 pl-3 pr-7 text-xs font-semibold rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold select-none">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Quoted Rate */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Quoted Rate
                </label>
                <span className="text-[10px] text-gray-400 font-medium">
                  Defaults to proposed rate
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold select-none">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={proposed > 0 ? Number(proposed).toFixed(2) : '0.00'}
                  value={quotedRate}
                  onChange={(e) => setQuotedRate(e.target.value)}
                  className="w-full h-10 pl-7 pr-3 text-xs font-semibold rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition"
                />
              </div>
            </div>
          </div>

          {/* Auto calculated rates display card */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-3.5 shadow-xs">
            <div className="grid grid-cols-2 gap-4 divide-x divide-gray-200">
              <div className="text-center pr-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Total Cost / Plate
                </span>
                <span className="text-base font-bold text-gray-900 block mt-1">
                  {tc > 0 ? `₹${Number(tc).toFixed(2)}` : '₹0.00'}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  RM + Manpower + Overhead + Asset
                </span>
              </div>

              <div className="text-center pl-2">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#084E92] uppercase tracking-wider">
                    Proposed Rate
                  </span>
                  {Number(profit) > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-bold leading-none">
                      +{profit}%
                    </span>
                  )}
                </div>
                <span className="text-base font-extrabold text-[#084E92] block mt-1">
                  {proposed > 0 ? `₹${Number(proposed).toFixed(2)}` : '₹0.00'}
                </span>
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  {quotedRate !== '' && Number(quotedRate) > 0 ? (
                    <span className="text-amber-700 font-semibold">
                      Quoted: ₹{Number(quotedRate).toFixed(2)}
                    </span>
                  ) : (
                    'Per plate selling price'
                  )}
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {initialShift ? 'Update Shift' : 'Save Shift & Populate Slots'}
          </button>
        </div>
      </div>

      {/* Quick Add Meal Type Master Modal */}
      {isAddMealTypeOpen && (
        <MealTypeModal
          isOpen={isAddMealTypeOpen}
          onClose={() => setIsAddMealTypeOpen(false)}
          zIndex="z-[60]"
          onSuccess={async (createdType) => {
            const types = await fetchMealTypes();
            if (createdType?.id) {
              setMealTypeId(String(createdType.id));
              const name = createdType.name || createdType.mealTypeName;
              if (name) setShiftName(name);
            } else if (createdType?.name) {
              const match = types.find((t) => (t.name || t.mealTypeName) === createdType.name);
              if (match) {
                setMealTypeId(String(match.id));
                setShiftName(match.name || match.mealTypeName);
              }
            }
          }}
        />
      )}

      {/* Structure Preview Modal */}
      <MealStructurePreviewModal
        isOpen={isStructurePreviewOpen}
        onClose={() => setIsStructurePreviewOpen(false)}
        structure={selectedStructureDetails}
        loading={loadingStructureDetails}
        zIndex="z-[65]"
      />
    </div>
  );
};

export default AddShiftModal;
