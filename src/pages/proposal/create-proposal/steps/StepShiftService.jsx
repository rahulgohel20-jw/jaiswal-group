import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Layers,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  Pencil,
  ExternalLink,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { AddShiftModal } from '../modals/AddShiftModal';
import { MealStructureItemSidePopup } from '../modals/MealStructureItemSidePopup';
import { BomInfoModal } from '../modals/BomInfoModal';
import { MealStructurePreviewModal } from '../modals/MealStructurePreviewModal';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
  saveProposal,
  getShiftsByProposalId,
  saveProposalShiftsBulk,
  getShiftMenuSlots,
  populateShiftSlots,
  getMealStructureById,
  getSlotMenuItems,
  saveProposalMenuItem,
  deleteProposalMenuItem,
  deleteProposalShift,
  recalculateProposalCost,
  getManpowerByProposalId,
} from '@/services/apiServices';
import { extractArray, calculateTotalCost, calculateProposedRate, buildShiftBulkItem, extractShiftRmCost } from '../types';

export const StepShiftService = ({
  data,
  proposalId,
  basicDetails = {},
  manpowerData = {},
  otherCostsData = [],
  assetsData = [],
  costSharePercentages = {},
  onChange,
  onUpdateSupplyDays,
  onSaveProposal,
  onSaveDraft,
  onSaveContinue,
  onNext,
  onPrevious,
  saving = false,
  isSentForApproval = false,
}) => {
  const statusStr = String(basicDetails?.status || '').toUpperCase().trim();
  const isSent = isSentForApproval || (Boolean(statusStr) && statusStr !== 'DRAFT');

  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [isSidePopupOpen, setIsSidePopupOpen] = useState(false);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);

  const [activeSlotForPopup, setActiveSlotForPopup] = useState(null);
  const [activeBomData, setActiveBomData] = useState(null);

  const [previewStructure, setPreviewStructure] = useState(null);
  const [loadingPreviewStructure, setLoadingPreviewStructure] = useState(false);
  const [isPreviewStructureOpen, setIsPreviewStructureOpen] = useState(false);

  // Delete confirmation modals
  const [deleteShiftTarget, setDeleteShiftTarget] = useState(null);
  const [deletingShift, setDeletingShift] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const [allMealStructures, setAllMealStructures] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');

  const [slotsByShiftId, setSlotsByShiftId] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [foodCostSummary, setFoodCostSummary] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [loadedManpowerRoles, setLoadedManpowerRoles] = useState([]);
  const [allMealTypes, setAllMealTypes] = useState([]);

  const activeSupplyDays = useMemo(() => {
    const val = Number(data.supplyDaysPerMonth);
    return !isNaN(val) && val > 0 ? val : 26;
  }, [data.supplyDaysPerMonth]);

  // Helper to call bulk save shift API
  const handleBulkSaveShifts = useCallback(
    async (customSupplyDays) => {
      if (!proposalId) return;
      try {
        const summaryShifts = foodCostSummary?.shifts || data?.foodCostSummary?.shifts || [];
        const daysToUse =
          customSupplyDays !== undefined && customSupplyDays !== null && customSupplyDays !== ''
            ? Number(customSupplyDays)
            : activeSupplyDays;

        const mappedShifts = (data.shifts || []).map((s) => {
          const matched = summaryShifts.find((sumS) => {
            const sId = sumS.shiftId ?? sumS.id;
            const tId = s.id ?? s.shiftId;
            if (sId && tId && Number(sId) === Number(tId)) return true;
            if (sumS.shiftName && s.shiftName && sumS.shiftName.trim().toLowerCase() === s.shiftName.trim().toLowerCase()) return true;
            return false;
          });
          return buildShiftBulkItem(s, matched, daysToUse, allMealTypes);
        });

        const payload = {
          proposalId: Number(proposalId),
          shifts: mappedShifts,
        };

        await saveProposalShiftsBulk(proposalId, payload);
      } catch (err) {
        console.warn('Bulk save shift api call error:', err);
      }
    },
    [proposalId, foodCostSummary, data?.foodCostSummary, data.shifts, activeSupplyDays, allMealTypes]
  );

  // Fetch proposal manpower if not already provided in props
  useEffect(() => {
    if (!proposalId) return;
    let isMounted = true;
    const fetchManpower = async () => {
      try {
        const res = await getManpowerByProposalId(proposalId);
        const list = extractArray(res);
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setLoadedManpowerRoles(list);
        }
      } catch (err) {
        console.warn('Failed to load manpower for shift summary:', err);
      }
    };
    fetchManpower();
    return () => {
      isMounted = false;
    };
  }, [proposalId]);

  // Aggregate total manpower from StepManpower
  const allManpowerRoles = useMemo(() => {
    if (Array.isArray(manpowerData?.roles) && manpowerData.roles.length > 0) {
      return manpowerData.roles;
    }
    return loadedManpowerRoles;
  }, [manpowerData?.roles, loadedManpowerRoles]);

  const grossManpowerCost = useMemo(() => {
    return allManpowerRoles.reduce((sum, r) => {
      const hc = Number(r.headcount ?? r.headCount ?? 1);
      const sal = Number(r.monthlySalary ?? r.basicSalary ?? 0);
      const cost = Number(r.totalCost ?? (hc * sal));
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);
  }, [allManpowerRoles]);

  const grossOverheadCost = useMemo(() => {
    if (!Array.isArray(otherCostsData)) return 0;
    return otherCostsData.reduce((sum, c) => {
      const cost = Number(c.totalCost ?? c.serviceProviderCost ?? c.amount ?? 0);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);
  }, [otherCostsData]);

  const grossAssetCost = useMemo(() => {
    if (!Array.isArray(assetsData)) return 0;
    return assetsData.reduce((sum, a) => {
      const qty = Number(a.quantity || 0);
      const pr = Number(a.price || 0);
      const cost = Number(a.totalCost ?? (qty * pr));
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);
  }, [assetsData]);

  const manpowerClientPct = Number(
    costSharePercentages?.manpower ?? manpowerData?.clientPercentage ?? 0
  ) || 0;
  const overheadClientPct = Number(
    costSharePercentages?.overhead ?? otherCostsData?.clientPercentage ?? 0
  ) || 0;
  const assetClientPct = Number(
    costSharePercentages?.assets ?? assetsData?.clientPercentage ?? 0
  ) || 0;

  // Reduced net costs allocated to proposal plates
  const totalManpowerCost = useMemo(() => {
    const reduced = grossManpowerCost * (1 - Math.min(100, Math.max(0, manpowerClientPct)) / 100);
    return Math.max(0, Number(reduced.toFixed(2)));
  }, [grossManpowerCost, manpowerClientPct]);

  const totalOverheadCost = useMemo(() => {
    const reduced = grossOverheadCost * (1 - Math.min(100, Math.max(0, overheadClientPct)) / 100);
    return Math.max(0, Number(reduced.toFixed(2)));
  }, [grossOverheadCost, overheadClientPct]);

  const totalAssetCost = useMemo(() => {
    const reduced = grossAssetCost * (1 - Math.min(100, Math.max(0, assetClientPct)) / 100);
    return Math.max(0, Number(reduced.toFixed(2)));
  }, [grossAssetCost, assetClientPct]);

  const shiftsCount = (data.shifts || []).length;

  // Proportional costs calculation engine for frontend (Manpower, Overhead, Asset)
  const calculateProportionalCosts = useCallback(
    (shiftsList, customDays) => {
      if (!Array.isArray(shiftsList) || shiftsList.length === 0) return shiftsList;
      const days = customDays !== undefined && customDays !== null && customDays !== ''
        ? Number(customDays)
        : Number(data.supplyDaysPerMonth);
      const safeDays = !isNaN(days) && days > 0 ? days : 26;

      const summaryShifts = foodCostSummary?.shifts || data.foodCostSummary?.shifts || [];

      // Step 1: Calculate total daily RM across shifts (RM cost is auto calculated from live recipes/BOM)
      const totalDailyRm = shiftsList.reduce((sum, s) => {
        const hc = Number(s.headCount ?? s.headcount ?? 0);
        const matched = summaryShifts.find((sumS) => {
          const sId = sumS.shiftId ?? sumS.id;
          const tId = s.id ?? s.shiftId;
          if (sId && tId && Number(sId) === Number(tId)) return true;
          if (sumS.shiftName && s.shiftName && sumS.shiftName.trim().toLowerCase() === s.shiftName.trim().toLowerCase()) return true;
          return false;
        });

        const rm = extractShiftRmCost(s, matched);

        return sum + (hc * rm);
      }, 0);

      const totalMonthlyRm = totalDailyRm * safeDays;

      // Step 2: Calculate allocation factors for each pool
      const mpFactor = totalMonthlyRm > 0 && totalManpowerCost > 0 ? totalManpowerCost / totalMonthlyRm : 0;
      const ovFactor = totalMonthlyRm > 0 && totalOverheadCost > 0 ? totalOverheadCost / totalMonthlyRm : 0;
      const astFactor = totalMonthlyRm > 0 && totalAssetCost > 0 ? totalAssetCost / totalMonthlyRm : 0;

      // Step 3: Compute per-plate costs & update shifts
      return shiftsList.map((s) => {
        const matched = summaryShifts.find((sumS) => {
          const sId = sumS.shiftId ?? sumS.id;
          const tId = s.id ?? s.shiftId;
          if (sId && tId && Number(sId) === Number(tId)) return true;
          if (sumS.shiftName && s.shiftName && sumS.shiftName.trim().toLowerCase() === s.shiftName.trim().toLowerCase()) return true;
          return false;
        });

        const rm = extractShiftRmCost(s, matched);

        // Proportional manpower unless manually overridden
        const mp =
          s.isManualManpower && s.manpowerCost !== undefined && s.manpowerCost !== ''
            ? Number(s.manpowerCost)
            : mpFactor > 0
              ? Number((rm * mpFactor).toFixed(3))
              : matched?.manpowerCostPerPlate != null && Number(matched.manpowerCostPerPlate) > 0
                ? Number(Number(matched.manpowerCostPerPlate).toFixed(3))
                : s.manpowerCost != null && Number(s.manpowerCost) > 0
                  ? Number(s.manpowerCost)
                  : 0;

        // Proportional overhead
        const ov =
          ovFactor > 0
            ? Number((rm * ovFactor).toFixed(3))
            : matched?.overheadCostPerPlate != null && Number(matched.overheadCostPerPlate) > 0
              ? Number(Number(matched.overheadCostPerPlate).toFixed(3))
              : s.overheadCost != null && Number(s.overheadCost) > 0
                ? Number(s.overheadCost)
                : 0;

        // Proportional asset
        const ast =
          astFactor > 0
            ? Number((rm * astFactor).toFixed(3))
            : matched?.dailyAssetCost != null && Number(matched.dailyAssetCost) > 0
              ? Number(Number(matched.dailyAssetCost).toFixed(3))
              : matched?.assetCostPerPlate != null && Number(matched.assetCostPerPlate) > 0
                ? Number(Number(matched.assetCostPerPlate).toFixed(3))
                : s.assetCost != null && Number(s.assetCost) > 0
                  ? Number(s.assetCost)
                  : s.dailyAssetCost != null && Number(s.dailyAssetCost) > 0
                    ? Number(s.dailyAssetCost)
                    : 0;

        const inf = Math.max(0, Number(s.inflationPercentage ?? s.inflation ?? 0));
        const pr = Math.max(0, Number(s.profitPercentage ?? s.profit ?? 0));

        const tc = calculateTotalCost(rm, inf, mp, ov, ast);
        const proposed = calculateProposedRate(tc, pr);

        return {
          ...s,
          rmCost: rm,
          rawMaterialCost: rm,
          rawMaterialCostPerPlate: rm,
          manpowerCost: mp,
          overheadCost: ov,
          assetCost: ast,
          dailyAssetCost: ast,
          totalCost: tc,
          proposedRate: proposed,
        };
      });
    },
    [data.supplyDaysPerMonth, foodCostSummary, data.foodCostSummary, totalManpowerCost, totalOverheadCost, totalAssetCost]
  );

  const supplyDaysSaveTimeoutRef = useRef(null);

  const handleSupplyDaysChange = useCallback(
    (daysVal) => {
      const raw = daysVal;
      if (raw === '') {
        onChange({ supplyDaysPerMonth: '' });
        onUpdateSupplyDays?.('');
        return;
      }
      const num = Math.min(31, Math.max(0, Number(raw) || 0));
      const recalculated = calculateProportionalCosts(data.shifts || [], num);
      onChange({ supplyDaysPerMonth: num, shifts: recalculated });
      onUpdateSupplyDays?.(num);

      if (supplyDaysSaveTimeoutRef.current) {
        clearTimeout(supplyDaysSaveTimeoutRef.current);
      }
      if (proposalId && num > 0 && num <= 31) {
        supplyDaysSaveTimeoutRef.current = setTimeout(async () => {
          await handleBulkSaveShifts(num);
        }, 500);
      }
    },
    [calculateProportionalCosts, data.shifts, onChange, onUpdateSupplyDays, proposalId, handleBulkSaveShifts]
  );

  const flushSupplyDaysSave = useCallback(
    async (daysVal) => {
      if (supplyDaysSaveTimeoutRef.current) {
        clearTimeout(supplyDaysSaveTimeoutRef.current);
        supplyDaysSaveTimeoutRef.current = null;
      }
      const num = Number(daysVal);
      if (proposalId && num > 0 && num <= 31) {
        await handleBulkSaveShifts(num);
      }
    },
    [proposalId, handleBulkSaveShifts]
  );

  // Totals for Shift Summary table
  const shiftSummaryTotals = useMemo(() => {
    const shifts = data.shifts || [];
    let totalHeadcount = 0;
    let totalRmCost = 0;
    let totalMp = 0;
    let totalOv = 0;
    let totalAsset = 0;
    let totalCost = 0;
    let totalProposed = 0;
    let totalQuoted = 0;

    shifts.forEach((shift) => {
      totalHeadcount += Number(shift.headCount || shift.headcount || 0);
      totalRmCost += extractShiftRmCost(shift);
      totalMp += Number(shift.manpowerCost ?? 0);
      totalOv += Number(shift.overheadCost ?? 0);
      totalAsset += Number(shift.dailyAssetCost ?? shift.assetCost ?? 0);
      totalCost += Number(shift.totalCost ?? 0);
      totalProposed += Number(shift.proposedRate ?? 0);
      totalQuoted += Number(shift.quotedRate || 0);
    });

    return {
      headcount: totalHeadcount,
      rmCost: totalRmCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      manpower: totalMp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      overhead: totalOv.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      asset: totalAsset.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalCost: totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      proposedRate: totalProposed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      quotedRate: totalQuoted.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
  }, [data.shifts]);

  // Organization ID selected in the basic step based on state
  const selectedOrganizationId =
    basicDetails?.organizationId ||
    data?.organizationId ||
    '';

  // Active shift - only set when a shift/meal slot is explicitly selected by user
  const activeShift = selectedShiftId
    ? (data.shifts || []).find((s) => s.id === Number(selectedShiftId)) || null
    : null;

  // Active slots for active shift
  const activeSlots = activeShift ? slotsByShiftId[activeShift.id] || [] : [];

  // Deduplicate activeSlots to prevent multiple duplicate rows
  const uniqueActiveSlots = useMemo(() => {
    const seen = new Set();
    const unique = [];
    (activeSlots || []).forEach((slot) => {
      const key = `${slot.slotId || slot.id}_${slot.slotName || ''}_${slot.kitchenMenuCategoryId || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(slot);
      }
    });
    return unique;
  }, [activeSlots]);

  // Handlers for global shift settings
  const handleGlobalChange = (field, value) => {
    onChange({ [field]: value });
  };

  const latestShiftsRef = useRef(data.shifts || []);

  useEffect(() => {
    latestShiftsRef.current = data.shifts || [];
  }, [data.shifts]);

  // Sync recalculated cost summary across all shifts using proportional allocation
  const applyRecalculatedSummary = useCallback(
    (sum) => {
      if (!sum) return;
      setFoodCostSummary(sum);
      const summaryShifts = sum?.shifts || [];
      const currentShifts = latestShiftsRef.current || [];
      const shiftsWithRm = currentShifts.map((shift) => {
        const matched = summaryShifts.find((s) => {
          const sId = s.shiftId ?? s.id;
          const tId = shift.id ?? shift.shiftId;
          if (sId && tId && Number(sId) === Number(tId)) return true;
          if (s.shiftName && shift.shiftName && s.shiftName.trim().toLowerCase() === shift.shiftName.trim().toLowerCase()) return true;
          return false;
        });

        const rm = extractShiftRmCost(shift, matched);

        return {
          ...shift,
          rmCost: rm,
          rawMaterialCost: rm,
          rawMaterialCostPerPlate: rm,
        };
      });

      const updated = calculateProportionalCosts(shiftsWithRm);
      onChange({ shifts: updated });
    },
    [calculateProportionalCosts, onChange]
  );

  useEffect(() => {
    const shifts = data.shifts || [];
    if (shifts.length === 0) return;
    if (totalManpowerCost > 0 || totalOverheadCost > 0 || totalAssetCost > 0) {
      const needsCalculation = shifts.some((s) => {
        const rm = extractShiftRmCost(s);
        return rm > 0 && (!s.manpowerCost || Number(s.manpowerCost) === 0);
      });
      if (needsCalculation) {
        const updated = calculateProportionalCosts(shifts);
        onChange({ shifts: updated });
      }
    }
  }, [data.shifts, totalManpowerCost, totalOverheadCost, totalAssetCost, calculateProportionalCosts, onChange]);

  const handleOpenStructurePreview = async (structureId) => {
    if (!structureId) return;
    setIsPreviewStructureOpen(true);
    setLoadingPreviewStructure(true);
    try {
      const res = await getMealStructureById(Number(structureId));
      const data = res?.data?.data ?? res?.data;
      if (data) {
        setPreviewStructure(data);
      } else {
        const match = allMealStructures.find((m) => m.id === Number(structureId));
        setPreviewStructure(match || null);
      }
    } catch (err) {
      console.warn('Failed to load structure preview:', err);
      const match = allMealStructures.find((m) => m.id === Number(structureId));
      setPreviewStructure(match || null);
    } finally {
      setLoadingPreviewStructure(false);
    }
  };

  const cleanSlotName = (rawName, catName) => {
    if (!rawName) return 'Meal Item';
    let name = String(rawName).trim();
    if (catName && name.toLowerCase().endsWith(`(${catName.toLowerCase()})`)) {
      name = name.replace(new RegExp(`\\s*\\(${catName}\\)$`, 'i'), '').trim();
    }
    return name;
  };

  // Helper to map raw structure details to slot model
  const mapStructureDetailsToSlots = (rawDetails) => {
    if (!Array.isArray(rawDetails)) return [];
    return rawDetails.map((d, idx) => {
      const catName = d.kitchenMenuCategoryName || d.categoryName || '';
      const rawSlotName = d.mealSlotName || d.slotName || d.name || `Slot ${idx + 1}`;
      const slotName = cleanSlotName(rawSlotName, catName);
      return {
        id: d.id || idx + 1,
        slotId: d.mealSlotId || d.slotId || d.id,
        mealStructureDetailId: d.id,
        structureDetailId: d.id,
        slotName,
        kitchenMenuCategoryId: d.kitchenMenuCategoryId || d.menuCategoryId || d.categoryId,
        kitchenMenuCategoryName: catName,
        minItems: d.minimumItems ?? d.minCount ?? 1,
        maxItems: d.maximumItems ?? d.maxCount ?? 1,
        required: d.isRequired !== false && d.required !== false,
        items: d.items || d.menuItems || [],
      };
    });
  };

  // 2. Load slots for a specific shift with fallback to meal structure
  const loadSlotsForShift = useCallback(
    async (shift, forceRefresh = false) => {
      if (!shift) return;
      const shiftId = Number(shift.id);
      if (!shiftId) return;

      if (!forceRefresh && slotsByShiftId[shiftId] && slotsByShiftId[shiftId].length > 0) {
        return;
      }

      setLoadingSlots(true);
      try {
        let slots = [];

        // Step A: If shift exists in backend, fetch proposal menu slots
        try {
          const res = await getShiftMenuSlots(shiftId);
          slots = extractArray(res);
        } catch (e) {
          console.warn(`getShiftMenuSlots error for shift ${shiftId}:`, e);
        }

        // Step B: If slots are empty, try populate-slots API
        if (slots.length === 0) {
          try {
            await populateShiftSlots(shiftId, 1);
            const res = await getShiftMenuSlots(shiftId);
            slots = extractArray(res);
          } catch (e) {
            console.warn(`populateShiftSlots error for shift ${shiftId}:`, e);
          }
        }

        // Step C: Fallback to load directly from the shift's selected Meal Structure
        if (slots.length === 0 && shift.mealStructureId) {
          try {
            const structRes = await getMealStructureById(Number(shift.mealStructureId));
            const structData = structRes?.data?.data ?? structRes?.data;
            const rawDetails =
              structData?.details || structData?.slots || structData?.mealStructureSlots || structData?.items || [];
            slots = mapStructureDetailsToSlots(rawDetails);
          } catch (e) {
            console.warn(`getMealStructureById error for structure ${shift.mealStructureId}:`, e);
          }
        }

        setSlotsByShiftId((prev) => ({ ...prev, [shiftId]: slots }));
      } finally {
        setLoadingSlots(false);
      }
    },
    [slotsByShiftId]
  );

  // 3. Initial Data Fetch: Shifts
  const loadAllShiftData = useCallback(async () => {
    if (!proposalId) return;
    try {
      // 1. Load shifts only
      const shiftsRes = await getShiftsByProposalId(proposalId);
      const shiftsList = extractArray(shiftsRes);

      if (shiftsList.length > 0) {
        const mergedShifts = shiftsList.map((shift) => {
          const rm = extractShiftRmCost(shift);
          const mp = Number(shift.manpowerCost ?? 0);
          const ov = Number(shift.overheadCost ?? 0);
          const ast = Number(shift.dailyAssetCost ?? shift.assetCost ?? 0);
          const inf = Number(shift.inflationPercentage ?? shift.inflation ?? 0);
          const pr = Number(shift.profitPercentage ?? shift.profit ?? 0);
          const tc = calculateTotalCost(rm, inf, mp, ov, ast);
          const proposed = calculateProposedRate(tc, pr);

          return {
            ...shift,
            rmCost: rm,
            rawMaterialCost: rm,
            rawMaterialCostPerPlate: rm,
            manpowerCost: mp,
            overheadCost: ov,
            assetCost: ast,
            dailyAssetCost: ast,
            totalCost: tc,
            proposedRate: proposed,
            fuelCostPerPlate: shift.fuelCost,
            totalShiftCost: shift.totalShiftCost ?? tc,
          };
        });

        const calculatedShifts = calculateProportionalCosts(mergedShifts);
        onChange({ shifts: calculatedShifts });
      }
    } catch (err) {
      console.warn('Initial shifts load error:', err);
    }
  }, [proposalId, calculateProportionalCosts, onChange]);

  useEffect(() => {
    loadAllShiftData();
  }, [proposalId]);

  // Ensure slots are loaded when a shift / meal slot is selected
  useEffect(() => {
    if (activeShift) {
      loadSlotsForShift(activeShift, true);
    }
  }, [activeShift?.id]);

  // 4. After AddShiftModal saves a shift
  const handleShiftSaved = async (newShift, slots = []) => {
    const exists = (data.shifts || []).some((s) => s.id === newShift.id);
    const updatedShifts = exists
      ? (data.shifts || []).map((s) => (s.id === newShift.id ? { ...s, ...newShift } : s))
      : [...(data.shifts || []), newShift];

    onChange({ shifts: updatedShifts });
    if (slots && slots.length > 0) {
      setSlotsByShiftId((prev) => ({ ...prev, [newShift.id]: slots }));
    }
    setSelectedShiftId(newShift.id);
    setEditingShift(null);
  };

  // 5. Delete shift
  const handleDeleteShift = (shift) => {
    setDeleteShiftTarget(shift);
  };

  const confirmDeleteShift = async () => {
    if (!deleteShiftTarget) return;
    const shiftId = deleteShiftTarget.id;
    setDeletingShift(true);

    try {
      if (proposalId) {
        await deleteProposalShift(proposalId, shiftId, 1);
      }
      const updated = (data.shifts || []).filter((s) => s.id !== shiftId);
      const recalculated = calculateProportionalCosts(updated);
      onChange({ shifts: recalculated });
      if (selectedShiftId === shiftId) {
        setSelectedShiftId(recalculated.length > 0 ? recalculated[0].id : '');
      }

      toast.success('Shift deleted successfully.');
      setDeleteShiftTarget(null);
    } catch (err) {
      console.error('Delete shift error:', err);
      toast.error('Failed to delete shift.');
    } finally {
      setDeletingShift(false);
    }
  };

  // 6. Update shift inline values (headcount, rate, manpower, overhead, inflation, profit, rates)
  const handleShiftFieldChange = (shiftId, field, rawValue) => {
    const value = rawValue === '' ? '' : Number(rawValue);

    if (field === 'headcount' || field === 'headCount') {
      const hcVal = rawValue === '' ? '' : Math.max(0, Number(rawValue) || 0);
      const updatedShifts = (data.shifts || []).map((s) => {
        if (s.id !== shiftId) return s;
        return { ...s, headcount: hcVal, headCount: hcVal };
      });
      // Headcount change affects total daily RM -> recalculate all shifts proportionally
      const recalculated = calculateProportionalCosts(updatedShifts);
      onChange({ shifts: recalculated });
      return;
    }

    const updated = (data.shifts || []).map((s) => {
      if (s.id !== shiftId) return s;
      const next = { ...s };

      if (field === 'manpowerCost' || field === 'manpower') {
        next.isManualManpower = true;
        next.manpowerCost = value;
      }
      if (field === 'overheadCost' || field === 'overheadExpense') {
        next.overheadCost = value;
      }
      if (field === 'dailyAssetCost' || field === 'assetCost' || field === 'asset') {
        next.dailyAssetCost = value;
        next.assetCost = value;
      }
      if (field === 'inflation' || field === 'inflationPercentage') {
        const positiveVal = rawValue === '' ? '' : (Number(rawValue) < 0 ? 0 : rawValue);
        next.inflation = positiveVal;
        next.inflationPercentage = positiveVal;
      }
      if (field === 'profit' || field === 'profitPercentage') {
        const positiveVal = rawValue === '' ? '' : (Number(rawValue) < 0 ? 0 : rawValue);
        next.profit = positiveVal;
        next.profitPercentage = positiveVal;
      }
      if (field === 'quotedRate') {
        next.quotedRate = rawValue;
      }

      const rm = extractShiftRmCost(next);
      const mp = Number(next.manpowerCost ?? 0);
      const ov = Number(next.overheadCost ?? 0);
      const ast = Number(next.dailyAssetCost ?? next.assetCost ?? 0);
      const inf = Math.max(0, Number(next.inflationPercentage ?? next.inflation ?? 0));
      const pr = Math.max(0, Number(next.profitPercentage ?? next.profit ?? 0));

      const tc = calculateTotalCost(rm, inf, mp, ov, ast);
      const proposed = calculateProposedRate(tc, pr);

      next.rmCost = rm;
      next.rawMaterialCost = rm;
      next.rawMaterialCostPerPlate = rm;
      next.manpowerCost = mp;
      next.overheadCost = ov;
      next.assetCost = ast;
      next.dailyAssetCost = ast;
      next.totalCost = tc;
      next.proposedRate = proposed;
      return next;
    });
    onChange({ shifts: updated });
  };

  const saveTimeoutRef = useRef({});
  const lastSavedShiftValuesRef = useRef({});

  // Sync initial shift values into lastSavedShiftValuesRef
  useEffect(() => {
    (data.shifts || []).forEach((s) => {
      const hc = Number(s.headCount ?? s.headcount ?? 0);
      const inf = Math.max(0, Number(s.inflationPercentage ?? s.inflation ?? 0));
      const pr = Math.max(0, Number(s.profitPercentage ?? s.profit ?? 0));
      if (hc > 0 && lastSavedShiftValuesRef.current[s.id] === undefined) {
        lastSavedShiftValuesRef.current[s.id] = `${s.id}_${hc}_${inf}_${pr}`;
      }
    });
  }, [data.shifts]);

  useEffect(() => {
    return () => {
      Object.values(saveTimeoutRef.current || {}).forEach((t) => clearTimeout(t));
      if (supplyDaysSaveTimeoutRef.current) clearTimeout(supplyDaysSaveTimeoutRef.current);
    };
  }, []);

  // 7. Open Side Popup for a meal structure item
  const handleOpenSidePopup = (slot) => {
    setActiveSlotForPopup(slot);
    setIsSidePopupOpen(true);
  };

  // Helper: Refresh shifts by proposal id and update stats (overhead, asset, manpower, RM, total cost)
  const refreshProposalShifts = useCallback(async () => {
    if (!proposalId) return;
    try {
      const shiftsRes = await getShiftsByProposalId(proposalId);
      const freshShifts = extractArray(shiftsRes);
      if (freshShifts.length > 0) {
        const merged = freshShifts.map((fresh) => {
          const existing = (data.shifts || []).find((s) => {
            const fId = fresh.id ?? fresh.shiftId ?? fresh.proposalShiftId;
            const eId = s.id ?? s.shiftId ?? s.proposalShiftId;
            return fId && eId && Number(fId) === Number(eId);
          });

          const rm = extractShiftRmCost(fresh) || extractShiftRmCost(existing);
          const mp = Number(
            fresh.manpowerCostPerPlate ?? fresh.manpowerCost ?? existing?.manpowerCost ?? 0
          );
          const ov = Number(
            fresh.overheadCostPerPlate ?? fresh.overheadCost ?? existing?.overheadCost ?? 0
          );
          const ast = Number(
            fresh.assetCostPerPlate ?? fresh.dailyAssetCost ?? fresh.assetCost ?? existing?.assetCost ?? 0
          );
          const inf = Number(
            fresh.inflationPercentage ?? fresh.inflation ?? existing?.inflationPercentage ?? 0
          );
          const pr = Number(
            fresh.profitPercentage ?? fresh.profit ?? existing?.profitPercentage ?? 0
          );
          const tc = Number(
            fresh.totalShiftCost ?? fresh.totalCost ?? calculateTotalCost(rm, inf, mp, ov, ast)
          );
          const proposed = Number(
            fresh.proposedRate ?? calculateProposedRate(tc, pr)
          );

          return {
            ...(existing || {}),
            ...fresh,
            id: fresh.id ?? fresh.shiftId ?? existing?.id,
            shiftId: fresh.id ?? fresh.shiftId ?? existing?.shiftId,
            rmCost: rm,
            rawMaterialCost: rm,
            rawMaterialCostPerPlate: rm,
            manpowerCost: mp,
            manpowerCostPerPlate: mp,
            overheadCost: ov,
            overheadCostPerPlate: ov,
            assetCost: ast,
            assetCostPerPlate: ast,
            dailyAssetCost: ast,
            totalCost: tc,
            totalShiftCost: tc,
            proposedRate: proposed,
          };
        });

        const recalculated = calculateProportionalCosts(merged);
        onChange({ shifts: recalculated });
      }
    } catch (err) {
      console.warn('Failed to refresh shifts by proposal id:', err);
    }
  }, [proposalId, data.shifts, calculateProportionalCosts, onChange]);

  // 8. Refresh after saving items from Side Popup
  const handleSidePopupSaveApply = async () => {
    if (activeShift?.id) {
      try {
        const slotsRes = await getShiftMenuSlots(activeShift.id);
        const slotsList = extractArray(slotsRes);
        if (slotsList.length > 0) {
          setSlotsByShiftId((prev) => ({ ...prev, [activeShift.id]: slotsList }));
        }
      } catch (err) {
        console.warn('Refresh slots error:', err);
      }
    }

    if (proposalId) {
      await refreshProposalShifts();
    }
  };

  // 9. Delete recipe from slot
  const handleDeleteItem = (item) => {
    setDeleteItemTarget(item);
  };

  const confirmDeleteItem = async () => {
    if (!deleteItemTarget) return;
    const itemId = deleteItemTarget.id;
    setDeletingItem(true);
    try {
      await deleteProposalMenuItem(itemId, 1);
      if (activeShift?.id) {
        const slotsRes = await getShiftMenuSlots(activeShift.id);
        setSlotsByShiftId((prev) => ({ ...prev, [activeShift.id]: extractArray(slotsRes) }));
      }
      if (proposalId) {
        await refreshProposalShifts();
      }
      toast.success('Recipe removed successfully.');
      setDeleteItemTarget(null);
    } catch (err) {
      console.error('Failed to delete menu item:', err);
      toast.error('Failed to remove recipe.');
    } finally {
      setDeletingItem(false);
    }
  };

  // 10. View BOM snapshot modal
  const handleViewItemBom = (item) => {
    setActiveBomData({
      recipeName: item.foodName || item.kitchenMenuItemName || item.itemName || 'Recipe BOM',
      slotName: item.slotName || 'Recipe Slot',
      materials: item.materials || [],
      rawMaterialCost: item.recipeMaterialCost || item.rawMaterialCost || item.rmcMonth || 0,
      fuelUtilityCost: item.fuelUtilityCost || item.lpgMonth || 0,
      totalPortionCost: item.totalPortionCost || item.totalCost || 0,
      isSnapshot: true,
    });
    setIsBomModalOpen(true);
  };

  // 11. Recalculate whole proposal food cost
  const handleRecalculate = async () => {
    if (!proposalId) return;
    setRecalculating(true);
    try {
      const res = await recalculateProposalCost(proposalId);
      const sum = res?.data?.data ?? res?.data;
      if (sum) {
        applyRecalculatedSummary(sum);
      }
      toast.success('Proposal food cost recalculated from live BOM.');
    } catch (err) {
      console.error('Recalculate cost error:', err);
      toast.error('Failed to recalculate food cost.');
    } finally {
      setRecalculating(false);
    }
  };

  // Aggregated meal structure items (with recipes if configured) for the active shift
  const allShiftItems = useMemo(() => {
    if (!activeShift) return [];
    const items = [];
    uniqueActiveSlots.forEach((slot) => {
      const slotItems = slot.items || slot.menuItems || [];
      if (slotItems.length > 0) {
        slotItems.forEach((it) => {
          const days = Number(it.supplyDays || data.supplyDaysPerMonth || 30);
          const avgRmcDay = Number(
            it.avgRmcPerDay ?? (days > 0 && it.monthlyRmcCost ? Number((Number(it.monthlyRmcCost) / days).toFixed(2)) : 0)
          );
          const rmcMonth = Number(
            it.monthlyRmcCost ?? it.rmcMonthCost ?? (avgRmcDay ? Number((avgRmcDay * days).toFixed(2)) : 0)
          );
          const lpgMonth = Number(it.monthlyLpgCost ?? it.lpgCost ?? 0);
          const avgLpgDay = Number(
            it.lpgCostPerDay ?? (days > 0 ? Number((lpgMonth / days).toFixed(2)) : 0)
          );
          const totalCost = Number((rmcMonth + lpgMonth).toFixed(2));

          items.push({
            ...it,
            slotId: slot.id,
            slotName: slot.slotName,
            kitchenMenuCategoryId: slot.kitchenMenuCategoryId,
            kitchenMenuCategoryName: slot.kitchenMenuCategoryName,
            structureDetailId: slot.structureDetailId || slot.mealStructureDetailId || slot.id,
            foodName: it.foodName || it.kitchenMenuItemName || it.itemName || cleanSlotName(slot.slotName, slot.kitchenMenuCategoryName) || slot.slotName,
            supplyDays: days,
            rmcMonth,
            avgRmcDay,
            lpgMonth,
            avgLpgDay,
            totalCost,
            slotRef: slot,
            isConfigured: true,
          });
        });
      } else {
        const days = Number(slot.supplyDays || data.supplyDaysPerMonth || 30);
        const rmcMonth = Number(slot.monthlyRmcCost ?? slot.rmcMonthCost ?? 0);
        const avgRmcDay = Number(
          slot.avgRmcPerDay ?? (days > 0 && rmcMonth ? Number((rmcMonth / days).toFixed(2)) : 0)
        );
        const lpgMonth = Number(slot.monthlyLpgCost ?? slot.lpgCost ?? 0);
        const avgLpgDay = Number(
          slot.lpgCostPerDay ?? (days > 0 && lpgMonth ? Number((lpgMonth / days).toFixed(2)) : 0)
        );
        const totalCost = slot.totalCost != null
          ? Number(slot.totalCost)
          : Number((rmcMonth + lpgMonth).toFixed(2));
        const isConfigured = Boolean(
          rmcMonth > 0 || avgRmcDay > 0 || lpgMonth > 0 || avgLpgDay > 0 || totalCost > 0 || (slot.itemCount && slot.itemCount > 0)
        );

        items.push({
          id: `slot_${slot.id}`,
          slotId: slot.id,
          slotName: slot.slotName,
          kitchenMenuCategoryId: slot.kitchenMenuCategoryId,
          kitchenMenuCategoryName: slot.kitchenMenuCategoryName,
          structureDetailId: slot.structureDetailId || slot.mealStructureDetailId || slot.id,
          foodName: cleanSlotName(slot.mealSlotName || slot.slotName, slot.kitchenMenuCategoryName) || slot.slotName || 'Meal Structure Item',
          supplyDays: days,
          rmcMonth,
          avgRmcDay,
          lpgMonth,
          avgLpgDay,
          totalCost,
          slotRef: slot,
          isConfigured,
        });
      }
    });
    return items;
  }, [uniqueActiveSlots, data.supplyDaysPerMonth, activeShift?.headCount, activeShift]);

  // Aggregated Table Totals for Photo 2 table
  const shiftItemTotals = useMemo(() => {
    const totalRmc = allShiftItems.reduce((acc, it) => acc + (it.rmcMonth || 0), 0);
    const totalAvgRmc = allShiftItems.reduce((acc, it) => acc + (it.avgRmcDay || 0), 0);
    const totalLpg = allShiftItems.reduce((acc, it) => acc + (it.lpgMonth || 0), 0);
    const totalAvgLpg = allShiftItems.reduce((acc, it) => acc + (it.avgLpgDay || 0), 0);
    const totalCost = allShiftItems.reduce((acc, it) => acc + (it.totalCost || 0), 0);

    return {
      totalRmc: `₹${totalRmc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalAvgRmc: `₹${totalAvgRmc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalLpg: `₹${totalLpg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalAvgLpg: `₹${totalAvgLpg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalCost: `₹${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    };
  }, [allShiftItems]);

  return (
    <div className="space-y-6">
      {/* 1. Header Bar: Title outside */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Shift &amp; Service Configuration</h2>
        </div>
      </div>

      {/* Global Operational Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
            Supply Days / Month <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="31"
            placeholder="e.g. 26 or 30"
            value={data.supplyDaysPerMonth === '' ? '' : data.supplyDaysPerMonth ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (Number(raw) > 31) {
                toast.error('Supply Days / Month cannot be more than 31.');
              }
              handleSupplyDaysChange(raw);
            }}
            onBlur={(e) => {
              flushSupplyDaysSave(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
            className={`w-full h-10 px-3.5 text-xs rounded-xl border ${Number(data.supplyDaysPerMonth) > 31
              ? 'border-red-500 ring-1 ring-red-500'
              : 'border-[#C3C6D1]'
              } bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 font-semibold text-gray-800`}
          />
          {Number(data.supplyDaysPerMonth) > 31 && (
            <p className="text-[10px] text-red-500 font-semibold mt-1">
              Cannot be more than 31 days
            </p>
          )}
        </div>

        {/* <div>
          <label className="block text-[11px] font-bold text-gray-700 tracking-wider uppercase mb-1.5">
            Pricing Method <span className="text-red-500">*</span>
          </label>
          <select
            value={data.pricingMethod || ''}
            onChange={(e) => handleGlobalChange('pricingMethod', e.target.value)}
            className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 font-semibold text-gray-800"
          >
            <option value="">Select Pricing Method</option>
            <option value="Per Meal">Per Meal</option>
            <option value="Per Head / Day">Per Head / Day</option>
            <option value="Monthly Fixed">Monthly Fixed</option>
          </select>
        </div> */}
      </div>

      {/* 2. Shift Summary Header Bar: Title on left, Action Buttons on right */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-bold text-gray-900">Shift Summary</h2>
        </div>

        <div className="flex items-center gap-2">
          {proposalId && (
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={recalculating}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={recalculating ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingShift(null);
              setIsAddShiftOpen(true);
            }}
            className="h-8 inline-flex items-center gap-1.5 px-3 bg-[#084E92] hover:bg-[#073e77] text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            Add Shift
          </button>
        </div>
      </div>

      {/* Shift Summary Table Card */}
      {/* Shift Summary Table Card - No Horizontal Scrolling with Total Row */}
      <div className="bg-white border border-[#E7EAF0] rounded-2xl overflow-hidden shadow-xs">
        <div className="w-full overflow-hidden">
          <table className="w-full text-left border-collapse text-[11px] table-fixed">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[7.5%]" />
              <col className="w-[7.5%]" />
              <col className="w-[7.5%]" />
              <col className="w-[7.5%]" />
              <col className="w-[7.5%]" />
              <col className="w-[7%]" />
              <col className="w-[8.5%]" />
              <col className="w-[7%]" />
              <col className="w-[8.5%]" />
              <col className="w-[7.5%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <th className="py-2.5 px-2 whitespace-nowrap">Meal / Shift</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">Headcount</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">R.M. Cost</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">Manpower</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">Overhead</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">Asset</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">Inflation (%)</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">Total Cost</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">Profit (%)</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">Proposed</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">Quoted</th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {(data.shifts || []).length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-[#084E92] flex items-center justify-center">
                        <UtensilsCrossed size={18} />
                      </div>
                      <p className="text-xs font-semibold text-gray-700">No meal shifts added yet</p>
                      <p className="text-[11px] text-gray-400 max-w-xs">
                        All fields are blank by default. Click &ldquo;+ Add Shift&rdquo; above to configure your first meal shift.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.shifts.map((shift) => {
                  const summaryShifts = (foodCostSummary?.shifts || data.foodCostSummary?.shifts || []);
                  const matchedSummary = summaryShifts.find((s) => {
                    const sShiftId = s.shiftId ?? s.id;
                    const targetId = shift.id ?? shift.shiftId;
                    if (sShiftId && targetId && Number(sShiftId) === Number(targetId)) return true;
                    if (s.shiftName && shift.shiftName && s.shiftName.trim().toLowerCase() === shift.shiftName.trim().toLowerCase()) return true;
                    return false;
                  });

                  const rm = extractShiftRmCost(shift, matchedSummary);
                  const shiftMp = Number(shift.manpowerCost ?? 0);
                  const ov = Number(shift.overheadCost ?? 0);
                  const ast = Number(shift.dailyAssetCost ?? shift.assetCost ?? 0);
                  const inf = Math.max(0, Number(shift.inflationPercentage ?? shift.inflation ?? 0));
                  const pr = Math.max(0, Number(shift.profitPercentage ?? shift.profit ?? 0));
                  const tc = Number(shift.totalCost ?? calculateTotalCost(rm, inf, shiftMp, ov, ast));
                  const proposed = Number(shift.proposedRate ?? calculateProposedRate(tc, pr));

                  return (
                    <tr
                      key={shift.id}
                      onClick={() => setSelectedShiftId(shift.id)}
                      className={`cursor-pointer transition ${selectedShiftId === shift.id ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'
                        }`}
                    >
                      <td className="py-2.5 px-2 truncate" title={shift.shiftName}>
                        <span className="font-bold text-gray-900 block truncate">{shift.shiftName}</span>
                        {(() => {
                          const struct = allMealStructures.find((s) => s.id === shift.mealStructureId);
                          const structName = shift.mealStructureName || struct?.structureName || struct?.name;
                          if (!structName) return null;
                          return (
                            <div className="flex items-center gap-1 mt-0.5 truncate text-[10px] text-gray-400">
                              <span className="truncate">{structName}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenStructurePreview(shift.mealStructureId);
                                }}
                                className="text-[10px] font-semibold text-[#084E92] hover:underline shrink-0"
                                title="See meal structure"
                              >
                                <Eye size={10} className="inline ml-0.5" />
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          min="1"
                          placeholder="0"
                          value={shift.headCount || shift.headcount || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleShiftFieldChange(shift.id, 'headcount', val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          className="w-full h-7 px-1 rounded border border-gray-200 text-[11px] text-gray-800 font-semibold text-center focus:outline-none focus:border-[#084E92] bg-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-2 px-1 font-semibold text-gray-800 text-center truncate" title="Auto-calculated from live recipes/BOM">
                        {rm.toFixed(2)}
                      </td>
                      <td className="py-2 px-1 font-semibold text-gray-800 text-center truncate" title={`Manpower: ₹${shiftMp.toFixed(3)}`}>
                        {shiftMp.toFixed(2)}
                      </td>
                      <td className="py-2 px-1 font-semibold text-gray-800 text-center truncate" title={`Overhead: ₹${ov.toFixed(3)}`}>
                        {ov.toFixed(2)}
                      </td>
                      <td className="py-2 px-1 font-semibold text-gray-800 text-center truncate" title={`Asset Cost: ₹${ast.toFixed(3)}`}>
                        {ast.toFixed(2)}
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={
                            shift.inflationPercentage !== undefined && shift.inflationPercentage !== null && shift.inflationPercentage !== ''
                              ? shift.inflationPercentage
                              : shift.inflation !== undefined && shift.inflation !== null && shift.inflation !== ''
                                ? shift.inflation
                                : (shift.inflationPercentage ?? shift.inflation ?? '')
                          }
                          onChange={(e) => {
                            if (saveTimeoutRef.current[`${shift.id}_inflation`]) {
                              clearTimeout(saveTimeoutRef.current[`${shift.id}_inflation`]);
                            }
                            const val = e.target.value;
                            const nextVal = val === '' ? '' : (Number(val) < 0 ? 0 : val);
                            handleShiftFieldChange(shift.id, 'inflation', nextVal);
                          }}
                          onBlur={() => {
                            if (saveTimeoutRef.current[`${shift.id}_inflation`]) {
                              clearTimeout(saveTimeoutRef.current[`${shift.id}_inflation`]);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          className="w-full h-7 px-1 rounded border border-gray-200 text-[11px] text-gray-800 font-semibold text-center focus:outline-none focus:border-[#084E92] bg-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-2 px-1 font-semibold text-gray-800 text-center truncate">
                        {tc.toFixed(2)}
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={
                            shift.profitPercentage !== undefined && shift.profitPercentage !== null && shift.profitPercentage !== ''
                              ? shift.profitPercentage
                              : shift.profit !== undefined && shift.profit !== null && shift.profit !== ''
                                ? shift.profit
                                : (shift.profitPercentage ?? shift.profit ?? '')
                          }
                          onChange={(e) => {
                            if (saveTimeoutRef.current[`${shift.id}_profit`]) {
                              clearTimeout(saveTimeoutRef.current[`${shift.id}_profit`]);
                            }
                            const val = e.target.value;
                            const nextVal = val === '' ? '' : (Number(val) < 0 ? 0 : val);
                            handleShiftFieldChange(shift.id, 'profit', nextVal);
                          }}
                          onBlur={() => {
                            if (saveTimeoutRef.current[`${shift.id}_profit`]) {
                              clearTimeout(saveTimeoutRef.current[`${shift.id}_profit`]);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          className="w-full h-7 px-1 rounded border border-gray-200 text-[11px] text-gray-800 font-semibold text-center focus:outline-none focus:border-[#084E92] bg-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-2 px-1 font-bold text-[#084E92] text-center truncate">
                        {proposed.toFixed(2)}
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={shift.quotedRate ?? ''}
                          onChange={(e) => handleShiftFieldChange(shift.id, 'quotedRate', e.target.value)}
                          className="w-full h-7 px-1 rounded border border-gray-200 text-[11px] text-gray-800 font-semibold text-center focus:outline-none focus:border-[#084E92] bg-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="py-2 px-1 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingShift(shift);
                              setIsAddShiftOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition cursor-pointer"
                            title="Edit shift"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteShift(shift);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition cursor-pointer"
                            title="Delete shift"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Shift Summary Totals Row */}
            {(data.shifts || []).length > 0 && (
              <tfoot>
                <tr className="bg-blue-50/50 border-t border-gray-200 font-bold text-[11px] text-[#084E92] whitespace-nowrap">
                  <td className="py-2.5 px-2 uppercase tracking-wide font-bold">TOTAL</td>
                  <td className="py-2.5 px-1 text-center font-bold">{shiftSummaryTotals.headcount}</td>
                  <td className="py-2.5 px-1 text-center font-bold">{shiftSummaryTotals.rmCost}</td>
                  <td className="py-2.5 px-1 text-center font-bold">{shiftSummaryTotals.manpower}</td>
                  <td className="py-2.5 px-1 text-center font-bold">{shiftSummaryTotals.overhead}</td>
                  <td className="py-2.5 px-1 text-center font-bold">{shiftSummaryTotals.asset}</td>
                  <td className="py-2.5 px-1 text-center font-bold">—</td>
                  <td className="py-2.5 px-1 text-center font-bold">{shiftSummaryTotals.totalCost}</td>
                  <td className="py-2.5 px-1 text-center font-bold">—</td>
                  <td className="py-2.5 px-1 text-center font-bold">{shiftSummaryTotals.proposedRate}</td>
                  <td className="py-2.5 px-1 text-center font-bold">{shiftSummaryTotals.quotedRate}</td>
                  <td className="py-2.5 px-1 text-center font-bold">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 3. Shift Item Details Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-900">
            {activeShift ? `${activeShift.shiftName} Menu Structure Details` : 'Shift Item Details'}
          </h2>
          {/* {activeShift && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#084E92] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
                <Layers size={11} />
                {(() => {
                  const struct = allMealStructures.find((s) => s.id === activeShift.mealStructureId);
                  const sName = struct?.structureName || struct?.name;
                  return sName ? `${sName} • ` : '';
                })()}
                {allShiftItems.length} Items ({uniqueActiveSlots.length} Structure Slots)
              </span>
            </div>
          )} */}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-600">Select Meal Type:</span>
          <select
            value={selectedShiftId || ''}
            onChange={(e) => {
              const val = e.target.value;
              const shiftId = val ? Number(val) : '';
              setSelectedShiftId(shiftId);
              if (shiftId) {
                const target = (data.shifts || []).find((s) => s.id === shiftId);
                if (target) loadSlotsForShift(target);
              }
            }}
            disabled={(data.shifts || []).length === 0}
            className="h-8 px-3 text-xs font-bold text-[#084E92] rounded-lg border border-[#C3C6D1] bg-white focus:outline-none focus:border-[#084E92] cursor-pointer"
          >
            {(data.shifts || []).length === 0 ? (
              <option value="">No shifts defined</option>
            ) : (
              <>
                <option value="">Select Meal Slot</option>
                {(data.shifts || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shiftName}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* 4. Shift Item Details Table Card */}
      {!activeShift ? (
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-12 text-center text-gray-400 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#084E92] flex items-center justify-center mx-auto">
            <UtensilsCrossed size={22} />
          </div>
          <p className="text-sm font-bold text-gray-800">No Meal Slot Selected</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Please select a meal slot from the dropdown above to view and configure its meal structure items.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          {/* Table directly inside, no header inside card */}

          {/* Table matching Photo 2 */}
          {loadingSlots ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 size={24} className="animate-spin text-[#084E92]" />
              <p className="text-xs font-medium">Loading meal structure items...</p>
            </div>
          ) : allShiftItems.length === 0 ? (
            <div className="py-14 text-center space-y-3 px-4">
              <p className="text-xs text-gray-500">
                No meal structure items found for {activeShift.shiftName}.
              </p>
              {activeSlots.length === 0 && (
                <button
                  type="button"
                  onClick={() => loadSlotsForShift(activeShift, true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#084E92] text-white text-xs font-semibold hover:bg-[#073e77] transition shadow-xs cursor-pointer"
                >
                  <Layers size={14} />
                  Load Structure Slots
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-3.5">SR. NO.</th>
                    <th className="py-3 px-3">MEAL SLOT</th>
                    <th className="py-3 px-3">SUPPLY DAYS</th>
                    <th className="py-3 px-3">RMC/MONTH COST</th>
                    <th className="py-3 px-3">AVG RMC/DAY</th>
                    <th className="py-3 px-3">LPG COST</th>
                    <th className="py-3 px-3">LPG COST PER DAY</th>
                    <th className="py-3 px-3">TOTAL COST</th>
                    <th className="py-3 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {allShiftItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 px-3.5 text-gray-500 font-medium">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            const targetSlot =
                              item.slotRef ||
                              activeSlots.find((s) => s.id === item.slotId) || {
                                id: item.slotId,
                                slotName: item.slotName,
                                kitchenMenuCategoryId: item.kitchenMenuCategoryId,
                                kitchenMenuCategoryName: item.kitchenMenuCategoryName,
                                structureDetailId: item.structureDetailId || item.mealStructureDetailId,
                              };
                            handleOpenSidePopup(targetSlot);
                          }}
                          className="inline-flex items-center gap-1.5 font-semibold text-[#084E92] hover:underline cursor-pointer group text-left"
                          title="Click to configure in side popup"
                        >
                          <span>{item.foodName}</span>
                          <ExternalLink size={12} className="text-gray-400 group-hover:text-[#084E92] transition shrink-0" />
                        </button>
                        {item.foodName && item.foodName !== cleanSlotName(item.slotName, item.kitchenMenuCategoryName) ? (
                          <div className="text-[10px] text-gray-500 font-normal">
                            {cleanSlotName(item.slotName, item.kitchenMenuCategoryName)}{item.kitchenMenuCategoryName ? ` (${item.kitchenMenuCategoryName})` : ''}
                          </div>
                        ) : item.isConfigured ? (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            {item.kitchenMenuCategoryName ? `${item.kitchenMenuCategoryName} • ` : ''}Recipe configured
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 font-normal">
                            {item.kitchenMenuCategoryName ? `${item.kitchenMenuCategoryName} • ` : ''}Click to configure recipe
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-700">
                        {item.supplyDays}
                      </td>
                      <td className="py-3 px-3 text-gray-900 font-medium whitespace-nowrap">
                        {item.rmcMonth.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-3 text-gray-700 whitespace-nowrap">
                        {item.avgRmcDay.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-3 text-gray-900 font-medium whitespace-nowrap">
                        {item.lpgMonth.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-3 text-gray-700 whitespace-nowrap">
                        {item.avgLpgDay.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">
                        {item.totalCost.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const targetSlot =
                                item.slotRef ||
                                activeSlots.find((s) => s.id === item.slotId) || {
                                  id: item.slotId,
                                  slotName: item.slotName,
                                  kitchenMenuCategoryId: item.kitchenMenuCategoryId,
                                  kitchenMenuCategoryName: item.kitchenMenuCategoryName,
                                  structureDetailId: item.structureDetailId || item.mealStructureDetailId,
                                };
                              handleOpenSidePopup(targetSlot);
                            }}
                            className="p-1 text-[#084E92] hover:text-[#073e77] rounded hover:bg-blue-50 transition cursor-pointer"
                            title="Edit in Side Popup"
                          >
                            <Pencil size={14} />
                          </button>
                          {item.isConfigured && !String(item.id).startsWith('slot_') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                              title="Delete Recipe"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer Total Row matching Photo 2 */}
                <tfoot>
                  <tr className="bg-blue-50/50 border-t border-gray-200 font-bold text-xs text-[#084E92]">
                    <td className="py-3 px-3.5 uppercase tracking-wide">TOTAL</td>
                    <td className="py-3 px-3">—</td>
                    <td className="py-3 px-3">—</td>
                    <td className="py-3 px-3">{shiftItemTotals.totalRmc}</td>
                    <td className="py-3 px-3">{shiftItemTotals.totalAvgRmc}</td>
                    <td className="py-3 px-3">{shiftItemTotals.totalLpg}</td>
                    <td className="py-3 px-3">{shiftItemTotals.totalAvgLpg}</td>
                    <td className="py-3 px-3">{shiftItemTotals.totalCost}</td>
                    <td className="py-3 px-3 text-right">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Per Head Grams Card matching Photo 2 */}
      {/* <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Per Head Grams</h4>
            <p className="text-xs text-gray-400">
              Standard reference weight per consumer portion for this shift configuration.
            </p>
          </div>
         </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.001"
            placeholder="1.798"
            value={data.perHeadGrams === '' ? '' : data.perHeadGrams ?? ''}
            onChange={(e) =>
              handleGlobalChange(
                'perHeadGrams',
                e.target.value === '' ? '' : Number(e.target.value)
              )
            }
            className="w-24 h-9 px-3 text-right text-xs font-bold text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:border-[#084E92]"
          />
          <span className="text-xs font-semibold text-gray-500">g/head</span>
        </div>
      </div> */}

      {/* 6. Step Action Buttons matching Photo 2 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onPrevious}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          Previous
        </button>

        <div className="flex items-center gap-3">
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              Next
              <ArrowRight size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (Number(data.supplyDaysPerMonth) > 30) {
                toast.error('Supply Days / Month cannot be more than 30.');
                return;
              }
              onSaveDraft?.();
            }}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSent ? 'Save' : 'Save as Draft'}
          </button>

          <button
            type="button"
            onClick={() => {
              if (Number(data.supplyDaysPerMonth) > 30) {
                toast.error('Supply Days / Month cannot be more than 30.');
                return;
              }
              onSaveContinue();
            }}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save & Continue
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modals */}
      <AddShiftModal
        isOpen={isAddShiftOpen}
        onClose={() => {
          setIsAddShiftOpen(false);
          setEditingShift(null);
        }}
        initialShift={editingShift}
        proposalId={proposalId}
        organizationId={selectedOrganizationId}
        subOutletId={basicDetails?.subOutletId || data?.subOutletId}
        effectiveDate={basicDetails?.serviceStartDate}
        existingShiftsCount={(data.shifts || []).length}
        defaultManpowerCost={0}
        onShiftSaved={handleShiftSaved}
        onMealTypesLoaded={setAllMealTypes}
        onMealStructuresLoaded={setAllMealStructures}
      />

      {isSidePopupOpen && activeSlotForPopup && (
        <MealStructureItemSidePopup
          isOpen={isSidePopupOpen}
          onClose={() => {
            setIsSidePopupOpen(false);
            setActiveSlotForPopup(null);
          }}
          slot={activeSlotForPopup}
          shift={activeShift}
          proposalId={proposalId}
          organizationId={selectedOrganizationId}
          subOutletId={basicDetails?.subOutletId || data?.subOutletId}
          effectiveDate={basicDetails?.serviceStartDate}
          defaultMaterialCenterId={basicDetails?.defaultMaterialCenterId}
          defaultSupplyDays={data.supplyDaysPerMonth || 30}
          onSaveApply={handleSidePopupSaveApply}
        />
      )}

      {isBomModalOpen && activeBomData && (
        <BomInfoModal
          isOpen={isBomModalOpen}
          onClose={() => {
            setIsBomModalOpen(false);
            setActiveBomData(null);
          }}
          recipeName={activeBomData.recipeName}
          slotName={activeBomData.slotName}
          materials={activeBomData.materials}
          rawMaterialCost={activeBomData.rawMaterialCost}
          fuelUtilityCost={activeBomData.fuelUtilityCost}
          totalPortionCost={activeBomData.totalPortionCost}
          isSnapshot={activeBomData.isSnapshot}
        />
      )}

      {isPreviewStructureOpen && (
        <MealStructurePreviewModal
          isOpen={isPreviewStructureOpen}
          onClose={() => {
            setIsPreviewStructureOpen(false);
            setPreviewStructure(null);
          }}
          structure={previewStructure}
          loading={loadingPreviewStructure}
          zIndex="z-50"
        />
      )}

      {/* Delete Meal Shift Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteShiftTarget}
        onClose={() => {
          if (!deletingShift) setDeleteShiftTarget(null);
        }}
        onConfirm={confirmDeleteShift}
        title="Delete Meal Shift"
        itemLabel={deleteShiftTarget?.shiftName}
        description={
          deleteShiftTarget?.shiftName
            ? `Are you sure you want to delete meal shift "${deleteShiftTarget.shiftName}" and its configured slots? This action cannot be undone.`
            : 'Are you sure you want to delete this meal shift and its configured slots? This action cannot be undone.'
        }
        saving={deletingShift}
      />

      {/* Delete Recipe Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteItemTarget}
        onClose={() => {
          if (!deletingItem) setDeleteItemTarget(null);
        }}
        onConfirm={confirmDeleteItem}
        title="Delete Recipe"
        itemLabel={deleteItemTarget?.itemName || deleteItemTarget?.name}
        description={
          deleteItemTarget?.itemName
            ? `Are you sure you want to remove "${deleteItemTarget.itemName}"? This action cannot be undone.`
            : 'Are you sure you want to remove this recipe? This action cannot be undone.'
        }
        saving={deletingItem}
      />
    </div>
  );
};

export default StepShiftService;
