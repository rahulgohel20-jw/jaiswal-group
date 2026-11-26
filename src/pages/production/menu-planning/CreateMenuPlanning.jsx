import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Plus,
  ArrowRight,
  ArrowLeft,
  Utensils,
  Trash2,
  FileText,
  Loader2,
  Coffee,
  Eye,
  Pencil,
  Truck,
  Clock,
  X,
  Network,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { useOrgScope } from '@/hooks/useOrgScope';
import SearchableSelect from '@/utils/SearchableSelect';
import { notify } from '@/utils/toast';
import {
  saveOrUpdateMenuPlan,
  getMenuPlanById,
  getMealStructureById,
} from '@/services/apiServices';
import AddShiftModal from './AddShiftModal';
import MealStructurePreviewModal from './MealStructurePreviewModal';
import MenuPlanConfirmModal from './MenuPlanConfirmModal';

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayTime = (time24) => {
  if (!time24) return '—';
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr || '00'} ${ampm}`;
};

const AddDestinationModal = ({
  isOpen,
  onClose,
  onConfirm,
  units,
  subUnits,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedSubUnitId, setSelectedSubUnitId] = useState('');
  const [plannedPax, setPlannedPax] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [isTransferRequired, setIsTransferRequired] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedUnitId('');
      setSelectedSubUnitId('');
      setPlannedPax('');
      setDeliveryTime('');
      setIsTransferRequired(true);
      setNotes('');
    }
  }, [isOpen]);

  const unitOptions = useMemo(() => {
    return (units || []).map((unit) => ({
      value: String(unit.id),
      label:
        unit.name ||
        unit.companyNameEnglish ||
        unit.companyName ||
        `Unit #${unit.id}`,
    }));
  }, [units]);

  const subUnitOptions = useMemo(() => {
    if (!selectedUnitId) return [];
    const matched = (subUnits || []).filter((su) => {
      const parentId = su.organizationId ?? su.orgId ?? su.outletId;
      return String(parentId) === String(selectedUnitId);
    });
    return matched.map((su) => ({
      value: String(su.id),
      label: su.subOutletName || su.name || su.locationName || `Sub-Unit #${su.id}`,
    }));
  }, [subUnits, selectedUnitId]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUnitId) {
      notify.error('Please select a Unit.');
      return;
    }

    const foundUnit = (units || []).find((u) => String(u.id) === String(selectedUnitId));
    const unitName =
      foundUnit?.name ||
      foundUnit?.companyNameEnglish ||
      foundUnit?.companyName ||
      `Unit #${selectedUnitId}`;

    const foundSubUnit = (subUnits || []).find(
      (su) => String(su.id) === String(selectedSubUnitId)
    );
    const subUnitName = foundSubUnit
      ? foundSubUnit.subOutletName ||
      foundSubUnit.name ||
      foundSubUnit.locationName ||
      `Sub-Unit #${foundSubUnit.id}`
      : '';

    onConfirm({
      destinationOutletId: Number(selectedUnitId),
      unitName,
      destinationSubOutletId: selectedSubUnitId ? Number(selectedSubUnitId) : 0,
      destinationSubLocationId: 0,
      subUnitName,
      plannedPax: plannedPax !== '' ? String(Number(plannedPax) || 0) : '',
      deliveryTime: deliveryTime || '',
      isTransferRequired,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4">
      <div className="bg-white border border-[#E7EAF0] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
              <Truck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Destination</h3>
              <p className="text-[11px] text-slate-400">
                Select destination unit and optional distribution details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Unit <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                name="destinationUnit"
                value={selectedUnitId}
                onChange={(e) => {
                  setSelectedUnitId(e.target.value);
                  setSelectedSubUnitId('');
                }}
                options={unitOptions}
                placeholder="Select Unit"
                isClearable={false}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Sub-Unit <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <SearchableSelect
                name="destinationSubUnit"
                value={selectedSubUnitId}
                onChange={(e) => setSelectedSubUnitId(e.target.value)}
                options={subUnitOptions}
                placeholder={
                  !selectedUnitId
                    ? 'Select Unit First'
                    : subUnitOptions.length === 0
                      ? 'No Sub-Units Found'
                      : 'Select Sub-Unit'
                }
                disabled={!selectedUnitId || subUnitOptions.length === 0}
                isClearable={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Planned PAX (Per Day){' '}
                <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={plannedPax}
                onChange={(e) => {
                  if (e.target.value === '' || /^\d*$/.test(e.target.value)) {
                    setPlannedPax(e.target.value);
                  }
                }}
                placeholder="e.g. 250"
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:border-[#084E92]"
              />
            </div> */}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Delivery Time{' '}
                <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:border-[#084E92]"
              />
            </div>



            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Notes <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Veg meals only"
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:border-[#084E92]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">


            <div className="flex items-center justify-between sm:justify-start gap-3 pt-4 sm:pt-5">
              <button
                type="button"
                role="switch"
                aria-checked={isTransferRequired}
                onClick={() => setIsTransferRequired((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isTransferRequired ? 'bg-[#084E92]' : 'bg-slate-200'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isTransferRequired ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
              <div>
                <span className="text-xs font-semibold text-slate-700 block">
                  Transfer Required
                </span>
                <span className="text-[10px] text-slate-400">Optional dispatch flag</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#084E92] hover:bg-[#063d73] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Add Destination
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateMenuPlanning = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const passedPlanId = location.state?.planId || location.state?.menuPlanId || null;
  const approvalMode = location.state?.approvalMode || null; // 'APPROVED' | 'REJECTED' | null
  const isApprovalFlow = Boolean(approvalMode || location.state?.fromApproval);

  const currentOrgId = Number(localStorage.getItem('organizationId') || 18);
  const currentUserId = Number(localStorage.getItem('userId') || 1);

  const {
    showUnitDropdown,
    effectiveOutletId,
    units: scopeUnits,
    outlets: scopeOutlets,
    subOutlets: scopeSubOutlets,
  } = useOrgScope();

  const units = useMemo(() => {
    return scopeOutlets && scopeOutlets.length > 0 ? scopeOutlets : scopeUnits || [];
  }, [scopeOutlets, scopeUnits]);

  const subUnits = useMemo(() => {
    return scopeSubOutlets || [];
  }, [scopeSubOutlets]);

  // Form State
  const [menuPlanId, setMenuPlanId] = useState(passedPlanId ? Number(passedPlanId) : 0);
  const [unitFilter, setUnitFilter] = useState('');
  const [subUnitFilter, setSubUnitFilter] = useState('');
  const [fromDate, setFromDate] = useState(getTodayDateString());
  const [toDate, setToDate] = useState('');
  const [planCode, setPlanCode] = useState('');
  const [remarks, setRemarks] = useState('');

  // UI Loaders & calculation toggle
  const [fetchingPlan, setFetchingPlan] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);

  // Shifts / Demand Rows
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [mealDemandRows, setMealDemandRows] = useState([]);

  // Destination Outlets State
  const [destinationRows, setDestinationRows] = useState([]);
  const [isDestinationModalOpen, setIsDestinationModalOpen] = useState(false);

  // Snapshot of loaded initial state to track modifications in Edit mode
  const initialDemandSnapshot = useRef(null);

  // Structure Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [previewStructureData, setPreviewStructureData] = useState(null);

  // Backend Regeneration Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);

  // Fetch existing plan details when planId exists
  useEffect(() => {
    if (!passedPlanId) return;

    const loadPlanDetails = async () => {
      setFetchingPlan(true);
      try {
        const res = await getMenuPlanById(passedPlanId);
        const data = res?.data?.data ?? res?.data;

        if (data) {
          const currentId = Number(data.id || passedPlanId);
          setMenuPlanId(currentId);
          setPlanCode(data.planCode || '');
          setUnitFilter(String(data.organizationId || ''));
          setSubUnitFilter(data.subOutletId ? String(data.subOutletId) : '');
          setFromDate(data.fromDate || getTodayDateString());
          setToDate(data.toDate || '');
          setRemarks(data.remarks || '');

          let mappedStructures = [];
          if (Array.isArray(data.mealStructures)) {
            mappedStructures = data.mealStructures.map((ms) => {
              const expected = Number(ms.expectedPax) || 0;
              const planned = Number(ms.plannedPax) || 0;

              let derivedBufferPax = 0;
              if (ms.bufferPax !== undefined && ms.bufferPax !== null) {
                derivedBufferPax = Number(ms.bufferPax) || 0;
              } else if (ms.bufferPercentage !== undefined && ms.bufferPercentage !== null) {
                derivedBufferPax = Math.round((expected * Number(ms.bufferPercentage)) / 100);
              } else if (planned > expected) {
                derivedBufferPax = planned - expected;
              }

              return {
                id: ms.id || 0,
                mealTypeId: Number(ms.mealTypeId),
                mealTypeName: ms.mealTypeName || `Meal Type #${ms.mealTypeId}`,
                mealStructureId: Number(ms.mealStructureId),
                mealStructureName: ms.mealStructureName || `Structure #${ms.mealStructureId}`,
                expectedPax:
                  ms.expectedPax !== undefined && ms.expectedPax !== null
                    ? String(ms.expectedPax)
                    : '',
                bufferPax: String(derivedBufferPax),
                plannedPax:
                  ms.plannedPax !== undefined && ms.plannedPax !== null
                    ? String(ms.plannedPax)
                    : String(expected + derivedBufferPax),
              };
            });
            setMealDemandRows(mappedStructures);
          }

          let mappedDestinations = [];
          const rawDestList = Array.isArray(data.destinationOutlets)
            ? data.destinationOutlets
            : Array.isArray(data.destinations)
              ? data.destinations
              : [];

          if (rawDestList.length > 0) {
            mappedDestinations = rawDestList.map((dest) => {
              const outletId = Number(dest.destinationOutletId ?? dest.organizationId ?? 0);
              const subOutletIdVal = Number(dest.destinationSubOutletId ?? dest.subOutletId ?? 0);
              const subLocIdVal = Number(dest.destinationSubLocationId ?? 0);

              const foundUnit = units.find((u) => String(u.id) === String(outletId));
              const foundSubUnit = subUnits.find((su) => String(su.id) === String(subOutletIdVal));

              return {
                ...(Number(dest.id) > 0 && { id: Number(dest.id) }),
                destinationOutletId: outletId,
                unitName:
                  dest.destinationOutletName ||
                  dest.unitName ||
                  dest.organizationName ||
                  foundUnit?.name ||
                  foundUnit?.companyName ||
                  `Unit #${outletId}`,
                destinationSubOutletId: subOutletIdVal,
                destinationSubLocationId: subLocIdVal,
                subUnitName:
                  dest.destinationSubOutletName ||
                  dest.subUnitName ||
                  dest.subOutletName ||
                  foundSubUnit?.subOutletName ||
                  foundSubUnit?.name ||
                  '',
                plannedPax:
                  dest.plannedPax !== undefined && dest.plannedPax !== null
                    ? String(dest.plannedPax)
                    : '',
                deliveryTime: dest.deliveryTime || '',
                isTransferRequired: Boolean(
                  dest.isTransferRequired !== undefined
                    ? dest.isTransferRequired
                    : dest.transferRequired
                ),
                notes: dest.notes || dest.remarks || '',
              };
            });
            setDestinationRows(mappedDestinations);
          }

          initialDemandSnapshot.current = {
            unitFilter: String(data.organizationId || ''),
            subUnitFilter: data.subOutletId ? String(data.subOutletId) : '',
            fromDate: data.fromDate || getTodayDateString(),
            toDate: data.toDate || '',
            remarks: data.remarks || '',
            mealDemandRows: JSON.stringify(mappedStructures),
            destinationRows: JSON.stringify(mappedDestinations),
          };
        }
      } catch (err) {
        console.error('Failed to load menu plan details:', err);
        notify.error('Failed to load menu plan details.');
      } finally {
        setFetchingPlan(false);
      }
    };

    loadPlanDetails();
  }, [passedPlanId, units, subUnits]);

  const filteredSubUnitOptions = useMemo(() => {
    const activeUnitId = unitFilter || (showUnitDropdown ? '' : String(effectiveOutletId || ''));
    if (!activeUnitId) return [];

    const matched = subUnits.filter((su) => {
      const parentId = su.organizationId ?? su.orgId ?? su.outletId;
      return String(parentId) === String(activeUnitId);
    });

    return matched.map((su) => ({
      value: String(su.id),
      label: su.subOutletName || su.name || su.locationName || `Sub-Unit #${su.id}`,
    }));
  }, [subUnits, unitFilter, showUnitDropdown, effectiveOutletId]);

  const handleUnitChange = (val) => {
    setUnitFilter(val);
    setSubUnitFilter('');
  };

  const totalExpected = useMemo(() => {
    return mealDemandRows.reduce((acc, r) => acc + (Number(r.expectedPax) || 0), 0);
  }, [mealDemandRows]);

  const totalPlanned = useMemo(() => {
    return mealDemandRows.reduce((acc, r) => acc + (Number(r.plannedPax) || 0), 0);
  }, [mealDemandRows]);

  const totalDestinationPlannedPax = useMemo(() => {
    return destinationRows.reduce((acc, d) => acc + (Number(d.plannedPax) || 0), 0);
  }, [destinationRows]);

  const handleOpenStructurePreview = async (mealStructureId, fallbackName, fallbackShift) => {
    if (!mealStructureId) {
      notify.error('Structure ID not found.');
      return;
    }

    setIsPreviewModalOpen(true);
    setLoadingStructure(true);
    setPreviewStructureData({
      name: fallbackName,
      mealTypeName: fallbackShift,
      details: [],
    });

    try {
      const res = await getMealStructureById(mealStructureId);
      const data = res?.data?.data ?? res?.data;
      if (data) {
        setPreviewStructureData(data);
      }
    } catch (err) {
      console.error('Failed to fetch meal structure details:', err);
      notify.error('Failed to load structure preview.');
    } finally {
      setLoadingStructure(false);
    }
  };

  const handleOpenAddShift = () => {
    if (showUnitDropdown && !unitFilter) {
      notify.error('Please select a Unit first before adding a shift.');
      return;
    }
    setEditingIndex(null);
    setIsModalOpen(true);
  };

  const handleOpenEditShift = (index) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleModalConfirm = (shiftData) => {
    const isDuplicate = mealDemandRows.some(
      (r, idx) =>
        idx !== editingIndex &&
        Number(r.mealTypeId) === Number(shiftData.mealTypeId) &&
        Number(r.mealStructureId) === Number(shiftData.mealStructureId)
    );

    if (isDuplicate) {
      notify.error('This meal shift and structure combination is already added.');
      return;
    }

    const expected = Number(shiftData.expectedPax) || 0;
    const bufferPax =
      shiftData.bufferPax !== undefined && shiftData.bufferPax !== ''
        ? Number(shiftData.bufferPax) || 0
        : shiftData.bufferPercentage !== undefined && shiftData.bufferPercentage !== ''
          ? Math.round((expected * (Number(shiftData.bufferPercentage) || 0)) / 100)
          : 0;

    const normalizedShiftData = {
      ...shiftData,
      expectedPax: shiftData.expectedPax !== undefined ? String(shiftData.expectedPax) : '',
      bufferPax: String(bufferPax),
      plannedPax: expected > 0 ? String(expected + bufferPax) : '',
    };

    if (editingIndex !== null) {
      setMealDemandRows((prev) => {
        const updated = [...prev];
        const existing = updated[editingIndex];
        updated[editingIndex] = {
          ...existing,
          ...normalizedShiftData,
          id: existing.id || normalizedShiftData.id || 0,
        };
        return updated;
      });
      notify.success('Shift updated successfully.');
    } else {
      setMealDemandRows((prev) => [...prev, normalizedShiftData]);
    }

    setIsModalOpen(false);
    setEditingIndex(null);
  };

  const handleRowDemandChange = (index, field, value) => {
    if (value !== '' && !/^\d*$/.test(value)) return;

    setMealDemandRows((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };

      target[field] = value;

      const expectedStr = field === 'expectedPax' ? value : target.expectedPax;
      const bufferStr = field === 'bufferPax' ? value : target.bufferPax;

      if (expectedStr === '') {
        target.plannedPax = '';
      } else {
        const expected = Number(expectedStr) || 0;
        const buffer = bufferStr === '' ? 0 : Number(bufferStr) || 0;
        target.plannedPax = String(expected + buffer);
      }

      updated[index] = target;
      return updated;
    });
  };

  const handleRemoveRow = (index) => {
    setMealDemandRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Destination Handlers
  const handleAddDestinationConfirm = (destData) => {
    const isDuplicate = destinationRows.some(
      (d) =>
        Number(d.destinationOutletId) === Number(destData.destinationOutletId) &&
        Number(d.destinationSubOutletId || 0) === Number(destData.destinationSubOutletId || 0)
    );

    if (isDuplicate) {
      notify.error('This destination unit and sub-unit combination is already added.');
      return;
    }

    setDestinationRows((prev) => [...prev, destData]);
    setIsDestinationModalOpen(false);
    notify.success('Destination added.');
  };

  const handleDestinationFieldChange = (index, field, value) => {
    if (field === 'plannedPax' && value !== '' && !/^\d*$/.test(value)) return;

    setDestinationRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleRemoveDestination = (index) => {
    setDestinationRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const hasDemandChanged = useMemo(() => {
    if (!menuPlanId || !initialDemandSnapshot.current) return true;

    const snapshot = initialDemandSnapshot.current;
    if (snapshot.unitFilter !== unitFilter) return true;
    if (snapshot.subUnitFilter !== subUnitFilter) return true;
    if (snapshot.fromDate !== fromDate) return true;
    if (snapshot.toDate !== toDate) return true;
    if (snapshot.remarks !== (remarks || '')) return true;
    if (snapshot.destinationRows !== JSON.stringify(destinationRows)) return true;

    const currentRowsJson = JSON.stringify(mealDemandRows);
    return snapshot.mealDemandRows !== currentRowsJson;
  }, [
    menuPlanId,
    unitFilter,
    subUnitFilter,
    fromDate,
    toDate,
    remarks,
    mealDemandRows,
    destinationRows,
  ]);

  const navigateToCosting = (targetId, savedPlan = null) => {
    const effectiveUnitId =
      unitFilter || (effectiveOutletId ? String(effectiveOutletId) : String(currentOrgId));

    const selectedDestinationUnits = destinationRows.map((d) => ({
      ...(Number(d.id) > 0 && { id: Number(d.id) }),
      destinationOutletId: Number(d.destinationOutletId),
      organizationId: Number(d.destinationOutletId),
      unitId: Number(d.destinationOutletId),
      unitName: d.unitName,
      destinationSubOutletId: d.destinationSubOutletId ? Number(d.destinationSubOutletId) : null,
      destinationSubLocationId: Number(d.destinationSubLocationId) || 0,
      subOutletId: d.destinationSubOutletId ? Number(d.destinationSubOutletId) : null,
      subUnitId: d.destinationSubOutletId ? Number(d.destinationSubOutletId) : null,
      subUnitName: d.subUnitName || '',
      plannedPax: d.plannedPax !== '' ? Number(d.plannedPax) : 0,
      deliveryTime: d.deliveryTime || '',
      isTransferRequired: Boolean(d.isTransferRequired),
      notes: d.notes || '',
    }));

    navigate('/production/menu-planning/costing', {
      state: {
        menuPlanId: targetId,
        planId: targetId,
        planCode: savedPlan?.planCode || planCode,
        unitId: effectiveUnitId,
        outletId: effectiveUnitId,
        subUnitId: subUnitFilter || '',
        subOutletId: subUnitFilter || '',
        fromDate,
        toDate,
        mealDemandRows,
        destinationRows: selectedDestinationUnits,
        selectedDestinations: selectedDestinationUnits,
        destinationUnitIds: [...new Set(selectedDestinationUnits.map((d) => d.destinationOutletId))],
        isLockedScope: true,
        approvalMode,
        fromApproval: isApprovalFlow,
      },
    });
  };

  const buildPayload = (confirmRegenerate = false) => {
    const effectiveUnitId =
      unitFilter || (effectiveOutletId ? String(effectiveOutletId) : String(currentOrgId));

    return {
      confirmRegenerate,
      destinationOutlets: destinationRows.map((d) => ({
        ...(Number(d.id) > 0 && { id: Number(d.id) }),
        deliveryTime: d.deliveryTime || '',
        destinationOutletId: Number(d.destinationOutletId) || 0,
        destinationSubLocationId: Number(d.destinationSubLocationId) || 0,
        destinationSubOutletId: Number(d.destinationSubOutletId) || 0,
        isTransferRequired: Boolean(d.isTransferRequired),
        notes: d.notes || '',
        plannedPax: d.plannedPax !== '' ? Number(d.plannedPax) : 0,
      })),
      fromDate,
      ...(Number(menuPlanId) > 0 && { id: Number(menuPlanId) }),
      mealStructures: mealDemandRows.map((row) => {
        const expected = Number(row.expectedPax) || 0;
        const bufferPax = row.bufferPax === '' ? 0 : Number(row.bufferPax) || 0;
        const computedBufferPercentage =
          expected > 0 ? Number(((bufferPax / expected) * 100).toFixed(2)) : 0;

        return {
          ...(Number(row.id) > 0 && { id: Number(row.id) }),
          bufferPercentage: computedBufferPercentage,
          expectedPax: expected,
          mealStructureId: Number(row.mealStructureId),
          mealTypeId: Number(row.mealTypeId),
          plannedPax: Number(row.plannedPax) || expected + bufferPax,
        };
      }),
      organizationId: Number(effectiveUnitId) || 0,
      remarks: remarks || '',
      subOutletId: subUnitFilter ? Number(subUnitFilter) : 0,
      toDate,
      userId: currentUserId,
    };
  };

  const handleSaveMenuPlan = async (confirmRegenerate = false) => {
    // In Approval Flow, bypass save and proceed straight to Costing & Approval screen
    if (isApprovalFlow && menuPlanId > 0) {
      navigateToCosting(menuPlanId);
      return menuPlanId;
    }

    const effectiveUnitId =
      unitFilter || (effectiveOutletId ? String(effectiveOutletId) : String(currentOrgId));

    if (showUnitDropdown && !effectiveUnitId) {
      notify.error('Please select a Unit before proceeding.');
      return false;
    }
    if (!fromDate) {
      notify.error('Please select a From Date.');
      return false;
    }
    if (!toDate) {
      notify.error('Please select a To Date.');
      return false;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      notify.error('To Date cannot be earlier than From Date.');
      return false;
    }
    if (mealDemandRows.length === 0) {
      notify.error('Please add at least one Shift before proceeding.');
      return false;
    }

    const hasEmptyDemand = mealDemandRows.some(
      (r) => r.expectedPax === '' || r.expectedPax === undefined || Number(r.expectedPax) <= 0
    );
    if (hasEmptyDemand) {
      notify.error('Please fill in Expected Demand (PAX) for all configured shifts.');
      return false;
    }

    if (!confirmRegenerate && menuPlanId > 0 && !hasDemandChanged) {
      navigateToCosting(menuPlanId);
      return menuPlanId;
    }

    const payload = buildPayload(confirmRegenerate);

    if (confirmRegenerate) {
      setIsConfirmSubmitting(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      const res = await saveOrUpdateMenuPlan(payload);
      const resData = res?.data;

      if (
        resData?.msg === 'CONFIRMATION_REQUIRED' ||
        resData?.requiresConfirmation === true ||
        resData?.data?.requiresConfirmation === true
      ) {
        setConfirmData(resData?.data || resData);
        setIsConfirmModalOpen(true);
        return false;
      }

      const savedPlan = resData?.data ?? resData;
      const targetId = savedPlan?.id || menuPlanId;

      setMenuPlanId(targetId);

      initialDemandSnapshot.current = {
        unitFilter,
        subUnitFilter,
        fromDate,
        toDate,
        remarks: remarks || '',
        mealDemandRows: JSON.stringify(mealDemandRows),
        destinationRows: JSON.stringify(destinationRows),
      };

      setIsConfirmModalOpen(false);
      navigateToCosting(targetId, savedPlan);
      return targetId;
    } catch (err) {
      console.error('Failed to save menu plan:', err);

      const errData = err?.response?.data;

      if (
        errData?.msg === 'CONFIRMATION_REQUIRED' ||
        errData?.requiresConfirmation === true
      ) {
        setConfirmData(errData);
        setIsConfirmModalOpen(true);
        return false;
      }

      notify.error(
        errData?.errorMessage || errData?.message || err?.message || 'Failed to save menu plan'
      );
      return false;
    } finally {
      setIsSubmitting(false);
      setIsConfirmSubmitting(false);
    }
  };

  const handleConfirmRegenerate = async () => {
    await handleSaveMenuPlan(true);
  };

  const isEditMode = Boolean(menuPlanId && menuPlanId > 0);

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        {/* Page Header */}
        <PageHeader
          title={
            <div className="flex items-center gap-2.5 flex-wrap">
              <span>
                {approvalMode === 'APPROVED'
                  ? `Approve Menu Plan (${planCode || `#${menuPlanId}`})`
                  : approvalMode === 'REJECTED'
                    ? `Reject Menu Plan (${planCode || `#${menuPlanId}`})`
                    : isEditMode
                      ? `Continue Menu Planning (${planCode || `#${menuPlanId}`})`
                      : 'Create Menu Planning'}
              </span>
            </div>
          }
          description={
            isApprovalFlow
              ? 'Review meal demand and shift capacities before approving or rejecting recipes in the next step.'
              : 'Set basic details and review demand from approved proposal before creating the weekly menu.'
          }
          actions={
            <button
              type="button"
              onClick={() =>
                navigate(
                  isApprovalFlow ? '/production/approve-menu-plan' : '/production/menu-planning'
                )
              }
              className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
              {isApprovalFlow ? 'Back to Approvals' : 'Back to List'}
            </button>
          }
        />

        {fetchingPlan ? (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-500 text-sm bg-white border border-[#E2E8F0] rounded-2xl shadow-xs">
            <Loader2 size={20} className="animate-spin text-[#084E92]" />
            Loading menu plan details…
          </div>
        ) : (
          <>
            {/* Plan Details Card */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Plan Details</h3>
                  <p className="text-[11px] text-slate-400">
                    Configure schedule timeline and serving facility parameters
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Unit <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    name="unit"
                    value={unitFilter}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    options={units.map((unit) => ({
                      value: String(unit.id),
                      label:
                        unit.name ||
                        unit.companyNameEnglish ||
                        unit.companyName ||
                        `Unit #${unit.id}`,
                    }))}
                    placeholder="Select Unit"
                    disabled={isEditMode || isApprovalFlow}
                    isClearable={false}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Sub-Unit
                  </label>
                  <SearchableSelect
                    name="subUnit"
                    value={subUnitFilter}
                    onChange={(e) => setSubUnitFilter(e.target.value)}
                    options={filteredSubUnitOptions}
                    placeholder={
                      !unitFilter && showUnitDropdown
                        ? 'Select Unit First'
                        : filteredSubUnitOptions.length === 0
                          ? 'No Sub-Units Found'
                          : 'Select Sub-Unit'
                    }
                    disabled={isEditMode || isApprovalFlow || (showUnitDropdown && !unitFilter)}
                    isClearable={false}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    From Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    disabled={isApprovalFlow}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white disabled:bg-slate-50 disabled:text-slate-600 focus:outline-none focus:border-[#084E92]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    To Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    disabled={isApprovalFlow}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white disabled:bg-slate-50 disabled:text-slate-600 focus:outline-none focus:border-[#084E92]"
                  />
                </div>
              </div>
            </div>

            {/* Meal Demand & Summary Split Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left: Shifts Breakdown */}
              <div className="lg:col-span-8 bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
                      <Coffee size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Meal Demand (Daily Basis)
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Review and configure demand breakdown per operational shift
                      </p>
                    </div>
                  </div>

                  {!isApprovalFlow && (
                    <button
                      type="button"
                      onClick={handleOpenAddShift}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#084E92] hover:bg-[#063d73] text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
                    >
                      <Plus size={14} />
                      Add Shift
                    </button>
                  )}
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden flex-1 flex flex-col">
                  {mealDemandRows.length === 0 ? (
                    <div className="p-8 text-center flex-1 flex flex-col items-center justify-center bg-slate-50/50">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-[#084E92] flex items-center justify-center mb-2.5">
                        <Utensils size={20} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">
                        No Shifts Configured
                      </h4>
                      <p className="text-[11px] text-slate-400 max-w-sm mt-0.5">
                        Click &quot;Add Shift&quot; above to assign meal shifts and set
                        expected PAX with buffer allowances.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-y-auto max-h-[275px] custom-scrollbar">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#f1f5f9]">
                          <tr className="text-slate-400 font-bold uppercase text-[10px]">
                            <th className="py-3 px-4 text-left">MEAL / SHIFT</th>
                            <th className="py-3 px-4 text-left w-36">
                              EXPECTED DEMAND{' '}
                              <span className="text-[9px] font-normal normal-case block text-slate-400">
                                Required PAX
                              </span>
                            </th>
                            <th className="py-3 px-4 text-left w-28">BUFFER PAX</th>
                            <th className="py-3 px-4 text-left w-32">PLANNED DEMAND</th>
                            {!isApprovalFlow && (
                              <th className="py-3 px-3 text-right w-20">ACTIONS</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {mealDemandRows.map((row, idx) => (
                            <tr
                              key={`${row.mealTypeId}-${row.mealStructureId}-${idx}`}
                              className="hover:bg-slate-50/50"
                            >
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenStructurePreview(
                                      row.mealStructureId,
                                      row.mealStructureName,
                                      row.mealTypeName
                                    )
                                  }
                                  className="group flex flex-col items-start text-left cursor-pointer transition-colors bg-transparent border-0 p-0 focus:outline-none"
                                  title="Click to view structure preview"
                                >
                                  <span className="font-bold text-slate-900 text-xs uppercase tracking-tight group-hover:text-[#084E92] transition-colors">
                                    {row.mealTypeName}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-slate-500 group-hover:text-[#084E92] transition-colors">
                                    <span className="text-[11px] font-normal leading-tight">
                                      {row.mealStructureName}
                                    </span>
                                    <Eye
                                      size={13}
                                      className="text-slate-400 group-hover:text-[#084E92] transition-colors shrink-0"
                                    />
                                  </div>
                                </button>
                              </td>

                              <td className="py-3.5 px-4">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  disabled={isApprovalFlow}
                                  value={row.expectedPax}
                                  onChange={(e) =>
                                    handleRowDemandChange(idx, 'expectedPax', e.target.value)
                                  }
                                  className="w-full h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 focus:outline-none focus:border-[#084E92]"
                                  placeholder="e.g. 150"
                                />
                              </td>

                              <td className="py-3.5 px-4">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  disabled={isApprovalFlow}
                                  value={row.bufferPax}
                                  onChange={(e) =>
                                    handleRowDemandChange(idx, 'bufferPax', e.target.value)
                                  }
                                  className="w-full h-8 px-2.5 text-xs text-center rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 focus:outline-none focus:border-[#084E92]"
                                  placeholder="0"
                                />
                              </td>

                              <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm">
                                {row.plannedPax !== '' ? row.plannedPax : '0'}
                              </td>

                              {!isApprovalFlow && (
                                <td className="py-3.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditShift(idx)}
                                      className="p-1 text-slate-400 hover:text-[#084E92] hover:bg-blue-50 rounded transition cursor-pointer"
                                      title="Edit shift & structure"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRow(idx)}
                                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
                                      title="Delete shift"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Demand Summary */}
              <div className="lg:col-span-4 bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-[#084E92]" />
                      <h3 className="text-sm font-bold text-slate-900">Demand Summary</h3>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Auto-calculated
                    </span>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Total Expected Demand
                        </span>
                        <span className="text-[10px] text-slate-400">(per day)</span>
                      </div>
                      <span className="text-[10px] font-bold bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded">
                        Base
                      </span>
                    </div>

                    <div className="text-3xl font-black text-slate-900 mt-2">
                      {totalExpected}
                    </div>

                    {showCalculationDetails && (
                      <div className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                        {mealDemandRows.length > 0
                          ? `${mealDemandRows.map((r) => r.expectedPax || 0).join(' + ')} = ${totalExpected}`
                          : '0'}
                      </div>
                    )}
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Total Planned Demand
                        </span>
                        <span className="text-[10px] text-slate-400">(per day)</span>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        Buffer
                      </span>
                    </div>

                    <div className="text-3xl font-black text-emerald-600 mt-2">
                      {totalPlanned}
                    </div>

                    {showCalculationDetails && (
                      <div className="text-[11px] text-emerald-700/80 font-medium mt-1 truncate">
                        {mealDemandRows.length > 0
                          ? `${mealDemandRows.map((r) => r.plannedPax || 0).join(' + ')} = ${totalPlanned}`
                          : '0'}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCalculationDetails((prev) => !prev)}
                  className="w-full py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <FileText size={14} />
                  {showCalculationDetails ? 'Hide Calculation' : 'View Calculation'}
                </button>
              </div>
            </div>

            {/* Destination Section */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
                    <Truck size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Destination</h3>
                    <p className="text-[11px] text-slate-400">
                      Configure destination distribution quotas and timings.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {destinationRows.length > 0 && (
                    <span className="text-xs text-slate-400 font-medium">
                      Showing {destinationRows.length}{' '}
                      {destinationRows.length === 1 ? 'active location' : 'active locations'}
                    </span>
                  )}
                  {!isApprovalFlow && (
                    <button
                      type="button"
                      onClick={() => setIsDestinationModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#084E92] hover:bg-[#063d73] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Plus size={14} />
                      Add Destination
                    </button>
                  )}
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-x-auto">
                {destinationRows.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center bg-slate-50/50">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-[#084E92] flex items-center justify-center mb-2.5">
                      <Truck size={20} />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800">
                      No Destinations Added
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-sm mt-0.5">
                      Click &quot;Add Destination&quot; on the top right to select destination units
                      and optionally set PAX, delivery time, and notes.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-xs min-w-[720px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4 text-left">DESTINATION OUTLET</th>
                        <th className="py-3 px-4 text-left">SUB-LOCATION</th>
                        {/* <th className="py-3 px-4 text-center w-36">
                          PLANNED PAX
                          <span className="block text-[9px] font-semibold text-slate-400">
                            (PER DAY)
                          </span>
                        </th> */}
                        <th className="py-3 px-4 text-center w-40">DELIVERY TIME</th>
                        <th className="py-3 px-4 text-center w-32">
                          TRANSFER
                          <span className="block text-[9px] font-semibold text-slate-400">
                            REQUIRED
                          </span>
                        </th>
                        <th className="py-3 px-4 text-left w-44">NOTES</th>
                        {!isApprovalFlow && (
                          <th className="py-3 px-4 text-center w-20">ACTION</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {destinationRows.map((dest, idx) => (
                        <tr
                          key={`${dest.destinationOutletId}-${dest.destinationSubOutletId || 'none'}-${idx}`}
                          className="hover:bg-slate-50/50"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {dest.unitName}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {dest.subUnitName || '—'}
                          </td>

                          {/* <td className="py-3.5 px-4 text-center">
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={isApprovalFlow}
                              value={dest.plannedPax}
                              onChange={(e) =>
                                handleDestinationFieldChange(idx, 'plannedPax', e.target.value)
                              }
                              placeholder="0"
                              className="w-24 h-8 px-2.5 text-xs font-bold text-center rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 focus:outline-none focus:border-[#084E92]"
                            />
                          </td> */}

                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center justify-center relative">
                              <input
                                type="time"
                                disabled={isApprovalFlow}
                                value={dest.deliveryTime}
                                onChange={(e) =>
                                  handleDestinationFieldChange(idx, 'deliveryTime', e.target.value)
                                }
                                title={
                                  dest.deliveryTime
                                    ? formatDisplayTime(dest.deliveryTime)
                                    : 'Optional delivery time'
                                }
                                className="w-32 h-8 pl-7 pr-2 text-xs font-medium text-slate-700 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 focus:outline-none focus:border-[#084E92]"
                              />
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={Boolean(dest.isTransferRequired)}
                              disabled={isApprovalFlow}
                              onClick={() =>
                                handleDestinationFieldChange(
                                  idx,
                                  'isTransferRequired',
                                  !dest.isTransferRequired
                                )
                              }
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${dest.isTransferRequired ? 'bg-[#084E92]' : 'bg-slate-200'
                                }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${dest.isTransferRequired ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                              />
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              disabled={isApprovalFlow}
                              value={dest.notes}
                              onChange={(e) =>
                                handleDestinationFieldChange(idx, 'notes', e.target.value)
                              }
                              placeholder="-"
                              className="w-full h-8 px-2.5 text-xs text-slate-700 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 focus:outline-none focus:border-[#084E92]"
                            />
                          </td>

                          {!isApprovalFlow && (
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveDestination(idx)}
                                className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete destination"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {destinationRows.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Network size={14} className="text-[#084E92]" />
                      <span>Total Destinations:</span>
                      <span className="font-bold text-slate-900">{destinationRows.length}</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="text-slate-600 font-medium">
                      <span>Total Planned Pax: </span>
                      <span className="font-extrabold text-[#084E92]">
                        {totalDestinationPlannedPax}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="border-t p-5 flex justify-end border-[#C3C6D1] flex-col sm:flex-row gap-4">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveMenuPlan(false)}
                className="px-10 py-2 cursor-pointer rounded-lg bg-[#084E92] text-white hover:bg-[#063c70] transition disabled:opacity-60 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {isApprovalFlow
                      ? 'Continue to Recipe Review'
                      : isEditMode
                        ? 'Continue'
                        : 'Build Weekly Menu'}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </>
        )}

        <AddShiftModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingIndex(null);
          }}
          onConfirm={handleModalConfirm}
          organizationId={
            unitFilter ||
            (effectiveOutletId ? String(effectiveOutletId) : String(currentOrgId))
          }
          subOutletId={subUnitFilter}
          initialData={editingIndex !== null ? mealDemandRows[editingIndex] : null}
        />

        <AddDestinationModal
          isOpen={isDestinationModalOpen}
          onClose={() => setIsDestinationModalOpen(false)}
          onConfirm={handleAddDestinationConfirm}
          units={units}
          subUnits={subUnits}
        />

        <MealStructurePreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          loading={loadingStructure}
          structure={previewStructureData}
        />

        <MenuPlanConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmRegenerate}
          loading={isConfirmSubmitting}
          confirmationData={confirmData}
        />
      </div>
    </Container>
  );
};

export default CreateMenuPlanning;