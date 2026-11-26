import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    UtensilsCrossed,
    Sparkles,
    Plus,
    Pencil,
    Eye,
    Trash2,
    Calendar as CalendarIcon,
    RefreshCw,
    CheckCircle,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Loader2,
    RotateCw,
    X,
    AlertCircle,
    Send,
    CheckSquare,
    Square,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '@/utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import {
    getMenuPlanById,
    getMenuPlanDayById,
    saveShiftRecipes,
    getRecipeCosting,
    calculatePortion,
    updateMenuPlanStatus,
    updateMenuPlanDayStatus,
    updateMenuPlanShiftStatus,
    getAllRawMaterialUnits,
} from '@/services/apiServices';
import { notify } from '@/utils/toast';
import AddKitchenItemModal from './AddKitchenItemModal';
import RightDrawerRecipeSnapshot from './RightDrawerRecipeSnapshot';

const EMPTY_ARRAY = [];

const PRICING_BASIS_OPTIONS = [
    { value: 'LAST_PURCHASE', label: 'Last Purchase' },
    { value: 'WEIGHTED_AVERAGE', label: 'Weighted Average' },
    { value: 'HIGHEST_PRICE', label: 'Highest Price' },
    { value: 'LOWEST_PRICE', label: 'Lowest Price' },
];

const REQUIRES_DATE_BASIS = ['WEIGHTED_AVERAGE', 'HIGHEST_PRICE', 'LOWEST_PRICE'];

const getStatusBadgeClasses = (status, isSelectedCard = false) => {
    const s = (status || '').toUpperCase();
    if (isSelectedCard) {
        if (s === 'APPROVED') return 'bg-emerald-400/30 text-white border-emerald-300/40';
        if (s === 'REJECTED') return 'bg-rose-400/30 text-white border-rose-300/40';
        if (s === 'PARTIALLY_APPROVED') return 'bg-amber-400/30 text-white border-amber-300/40';
        return 'bg-white/20 text-white border-white/30';
    }
    if (s === 'APPROVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'REJECTED') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s === 'PARTIALLY_APPROVED') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'SUBMITTED') return 'bg-blue-50 text-[#084E92] border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
};

const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const normalizeToIsoDate = (dateStr) => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [day, month, year] = str.split('/');
        return `${year}-${month}-${day}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }
    return str;
};

const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (str.includes('/')) return str;
    const parts = str.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return str;
};

const formatForBackend = (dateStr) => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [year, month, day] = str.split('-');
        return `${day}/${month}/${year}`;
    }
    return str;
};

const UNIT_SHORT_FORMS = {
    kilogram: 'kg',
    kilograms: 'kg',
    kg: 'kg',
    gram: 'g',
    grams: 'g',
    g: 'g',
    milligram: 'mg',
    milligrams: 'mg',
    mg: 'mg',
    liter: 'L',
    litre: 'L',
    liters: 'L',
    litres: 'L',
    l: 'L',
    milliliter: 'ml',
    millilitre: 'ml',
    milliliters: 'ml',
    millilitres: 'ml',
    ml: 'ml',
    numbers: 'nos',
    number: 'nos',
    nos: 'nos',
    pieces: 'pcs',
    piece: 'pcs',
    pcs: 'pcs',
    packet: 'pkt',
    packets: 'pkt',
    pkt: 'pkt',
};

const getShortUnit = (unit) => {
    if (!unit) return '';
    const cleaned = String(unit).trim().toLowerCase();
    return UNIT_SHORT_FORMS[cleaned] || unit;
};

const extractPortionUnitId = (obj) => {
    if (!obj) return null;
    const candidate =
        obj.perPersonConsumptionUnitId ??
        obj.perPersonPortionUnitId ??
        obj.portionUnitId ??
        obj.consumptionUnitId ??
        obj.uomId ??
        obj.baseRecipeUnitId ??
        obj.recipeCostingData?.perPersonConsumptionUnitId ??
        obj.recipeCostingData?.perPersonPortionUnitId ??
        obj.recipeCostingData?.portionUnitId ??
        obj.recipeCostingData?.uomId ??
        obj.recipeCostingData?.baseRecipeUnitId ??
        null;

    return candidate !== null && candidate !== undefined && !isNaN(Number(candidate)) && Number(candidate) > 0
        ? Number(candidate)
        : null;
};

const extractWeightUnitSymbol = (obj) => {
    if (!obj) return 'kg';
    const raw =
        obj.recipeCostingData?.scaledWeightUnitSymbol ||
        obj.recipeCostingData?.displayScaledWeightUnitSymbol ||
        obj.recipeCostingData?.uomSymbol ||
        obj.recipeCostingData?.baseRecipeUnitSymbol ||
        obj.recipeCostingData?.unitSymbol ||
        obj.recipeCostingData?.unitName ||
        obj.scaledWeightUnitSymbol ||
        obj.displayScaledWeightUnitSymbol ||
        obj.uomSymbol ||
        obj.unitSymbol ||
        obj.unitName ||
        obj.baseRecipeUnitSymbol ||
        'kg';
    return getShortUnit(raw) || 'kg';
};

// unit used for scaledWeight / targetWeight (not the per-person portion unit)
const extractWeightUnitId = (obj) => {
    if (!obj) return null;
    const candidate =
        obj.displayScaledWeightUnitId ??
        obj.scaledWeightUnitId ??
        obj.plannedQtyUnitId ??
        obj.qtyUnitId ??
        obj.uomId ??
        obj.baseRecipeUnitId ??
        obj.unit?.id ??
        obj.recipeCostingData?.displayScaledWeightUnitId ??
        obj.recipeCostingData?.scaledWeightUnitId ??
        obj.recipeCostingData?.plannedQtyUnitId ??
        obj.recipeCostingData?.qtyUnitId ??
        obj.recipeCostingData?.uomId ??
        obj.recipeCostingData?.baseRecipeUnitId ??
        obj.recipeCostingData?.unitId ??
        obj.recipeCostingData?.unit?.id ??
        null;
    return candidate !== null && !isNaN(Number(candidate)) && Number(candidate) > 0
        ? Number(candidate)
        : null;
};

const parsePortion = (portionStr, fallbackUnit = 'g') => {
    if (!portionStr && portionStr !== 0) {
        return { quantity: '', unit: getShortUnit(fallbackUnit) };
    }

    const str = String(portionStr)
        .replace(/1\s*portion/gi, '')
        .replace(/portion/gi, '')
        .trim();

    const match = str.match(/^([\d.]+)\s*(.*)$/);
    if (match) {
        return {
            quantity: match[1] || '',
            unit: getShortUnit(match[2]?.trim() || fallbackUnit),
        };
    }
    return { quantity: str, unit: getShortUnit(fallbackUnit) };
};

const resolveItemImage = (item) => {
    if (Array.isArray(item?.files) && item.files.length > 0) {
        const validFiles = item.files.filter((f) => f && f.path);
        if (validFiles.length > 0) {
            return validFiles[validFiles.length - 1].path;
        }
    }
    return item?.recipeImageUrl || item?.imageUrl || item?.image || '';
};

const MenuItemThumbnail = ({ src, alt = '' }) => {
    const [hasError, setHasError] = useState(false);

    return (
        <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200/60">
            {src && !hasError && (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={() => setHasError(true)}
                />
            )}
        </div>
    );
};

const MenuRecipeCosting = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentOrgId = Number(localStorage.getItem('organizationId') || 18);
    const currentUserId = Number(localStorage.getItem('userId') || 1);

    const {
        units: scopeUnits,
        outlets: scopeOutlets,
        subOutlets: scopeSubOutlets,
        effectiveOutletId,
    } = useOrgScope();

    const passedPlanId = location.state?.menuPlanId || location.state?.planId || null;
    const approvalMode = location.state?.approvalMode || null; // 'APPROVED' | 'REJECTED' | null
    const isApprovalFlow = Boolean(approvalMode || location.state?.fromApproval);

    const units = useMemo(() => {
        return scopeOutlets && scopeOutlets.length > 0 ? scopeOutlets : scopeUnits || EMPTY_ARRAY;
    }, [scopeOutlets, scopeUnits]);

    // Base destination outlets passed from previous screen
    const routeDestinationTemplates = useMemo(() => {
        const rawList =
            location.state?.destinationRows ||
            location.state?.selectedDestinations ||
            EMPTY_ARRAY;
        if (!Array.isArray(rawList)) return EMPTY_ARRAY;
        return rawList.map((d, i) => ({
            destKey: `${d.organizationId || d.unitId}-${d.subOutletId || d.subUnitId || 'none'}-${i}`,
            id: 0,
            destinationOutletId: Number(d.organizationId || d.unitId),
            unitName: d.unitName || `Unit #${d.organizationId || d.unitId}`,
            destinationSubOutletId:
                d.subOutletId || d.subUnitId ? Number(d.subOutletId || d.subUnitId) : null,
            subUnitName: d.subUnitName || '',
            plannedPax:
                d.plannedPax !== undefined && d.plannedPax !== null && d.plannedPax !== ''
                    ? String(d.plannedPax)
                    : '',
            plannedQty: '',
            weightUnitId: null,
            selected: true,
            loadingCost: false,
            remarks: d.notes || d.remarks || '',
        }));
    }, [location.state]);

    // Plan Hierarchy State
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [loadingDaySchedule, setLoadingDaySchedule] = useState(false);
    const [planData, setPlanData] = useState(null);

    // Scope IDs
    const [selectedOrgUnitId, setSelectedOrgUnitId] = useState(
        String(location.state?.unitId || effectiveOutletId || currentOrgId)
    );
    const [subUnitId, setSubUnitId] = useState(String(location.state?.subUnitId || ''));

    // Day, Week Cycle & Shift selection state
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [selectedDayId, setSelectedDayId] = useState(null);
    const [selectedDayIdsForApproval, setSelectedDayIdsForApproval] = useState([]);
    const [activeDayData, setActiveDayData] = useState(null);
    const [selectedMealTypeId, setSelectedMealTypeId] = useState('');

    // Local recipes mapped by slot detail ID
    const [slotRecipes, setSlotRecipes] = useState({});
    const [savingShift, setSavingShift] = useState(false);

    // Expanded destination collapsible state per item rowKey
    const [expandedItems, setExpandedItems] = useState({});

    // Decision / Submit Confirmation Modal State
    const [decisionModal, setDecisionModal] = useState({
        isOpen: false,
        scope: 'PLAN', // 'PLAN' | 'DAYS' | 'SHIFT'
        action: 'SUBMITTED', // 'SUBMITTED' | 'APPROVED' | 'REJECTED'
        title: '',
        subtitle: '',
        remarks: '',
        rejectionReason: '',
        submitting: false,
    });

    // Modal / Drawer state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalPreselectedSlotId, setModalPreselectedSlotId] = useState(null);
    const [modalInitialItemIds, setModalInitialItemIds] = useState([]);
    const [selectedSnapshotItem, setSelectedSnapshotItem] = useState(null);

    // Centered Rate Date Picker Modal State
    const [rateDateModal, setRateDateModal] = useState({
        isOpen: false,
        slotKey: null,
        targetRowKey: null,
        item: null,
        newSource: 'LAST_PURCHASE',
        fromDate: '',
        toDate: '',
    });

    const portionTimersRef = useRef({});
    const destPaxTimersRef = useRef({});
    const lastLoadedShiftKeyRef = useRef('');
    const unitMasterListRef = useRef(null);

    useEffect(() => {
        return () => {
            Object.values(portionTimersRef.current).forEach((t) => clearTimeout(t));
            Object.values(destPaxTimersRef.current).forEach((t) => clearTimeout(t));
        };
    }, []);

    // Build destination list for an item merging saved backend destinations + route destinations
    const buildDestinationsForItem = useCallback(
        (rawDestinations = []) => {
            const savedList = Array.isArray(rawDestinations) ? rawDestinations : [];

            // If the recipe already has destinations configured/saved, return ONLY those destinations.
            // Do NOT re-inject deleted destinations!
            if (savedList.length > 0) {
                return savedList.map((sd, idx) => {
                    const outId = Number(sd.destinationOutletId ?? sd.organizationId ?? 0);
                    const subId =
                        sd.destinationSubOutletId ?? sd.subOutletId
                            ? Number(sd.destinationSubOutletId ?? sd.subOutletId)
                            : null;
                    const unitObj = units.find((u) => String(u.id) === String(outId));
                    const subObj = (scopeSubOutlets || []).find((su) => String(su.id) === String(subId));
                    return {
                        destKey: `${outId}-${subId || 'none'}-${idx}`,
                        id: Number(sd.id) || 0,
                        destinationOutletId: outId,
                        unitName:
                            sd.destinationOutletName ||
                            sd.unitName ||
                            unitObj?.name ||
                            unitObj?.companyName ||
                            `Unit #${outId}`,
                        destinationSubOutletId: subId,
                        subUnitName:
                            sd.destinationSubOutletName ||
                            sd.subUnitName ||
                            subObj?.name ||
                            subObj?.subOutletName ||
                            '',
                        plannedPax:
                            sd.plannedPax !== undefined && sd.plannedPax !== null ? String(sd.plannedPax) : '',
                        plannedQty:
                            sd.plannedQty !== undefined && sd.plannedQty !== null ? String(sd.plannedQty) : '',
                        weightUnitId: null,
                        loadingCost: false,
                        remarks: sd.remarks || '',
                    };
                });
            }

            // Only if brand new recipe with no destinations, initialize from plan / route templates
            const planLevelDests = Array.isArray(planData?.destinations)
                ? planData.destinations
                : Array.isArray(planData?.destinationOutlets)
                    ? planData.destinationOutlets
                    : [];
            const baseTemplates =
                routeDestinationTemplates.length > 0
                    ? routeDestinationTemplates
                    : planLevelDests.map((d, i) => {
                        const outId = Number(d.destinationOutletId ?? d.organizationId ?? d.unitId ?? 0);
                        const subId =
                            d.destinationSubOutletId ?? d.subOutletId ?? d.subUnitId
                                ? Number(d.destinationSubOutletId ?? d.subOutletId ?? d.subUnitId)
                                : null;
                        const unitObj = units.find((u) => String(u.id) === String(outId));
                        const subObj = (scopeSubOutlets || []).find((su) => String(su.id) === String(subId));
                        return {
                            destKey: `${outId}-${subId || 'none'}-${i}`,
                            id: 0,
                            destinationOutletId: outId,
                            unitName:
                                d.destinationOutletName ||
                                d.unitName ||
                                d.organizationName ||
                                unitObj?.name ||
                                unitObj?.companyName ||
                                `Unit #${outId}`,
                            destinationSubOutletId: subId,
                            subUnitName:
                                d.destinationSubOutletName ||
                                d.subUnitName ||
                                d.subOutletName ||
                                subObj?.name ||
                                subObj?.subOutletName ||
                                '',
                            plannedPax:
                                d.plannedPax !== undefined && d.plannedPax !== null ? String(d.plannedPax) : '',
                            plannedQty: '',
                            weightUnitId: null,
                            loadingCost: false,
                            remarks: d.notes || d.remarks || '',
                        };
                    });

            return baseTemplates.map((tpl) => ({ ...tpl }));
        },
        [planData?.destinations, planData?.destinationOutlets, routeDestinationTemplates, units, scopeSubOutlets]
    );

    // 1. Fetch Plan Details
    const fetchPlanDetails = async (id, preserveSelectedDayId = null) => {
        if (!id) return;
        setLoadingPlan(true);
        try {
            const res = await getMenuPlanById(id);
            const data = res?.data?.data ?? res?.data;

            if (data) {
                setPlanData(data);
                setSelectedOrgUnitId(String(data.organizationId || ''));
                setSubUnitId(data.subOutletId ? String(data.subOutletId) : '');

                if (Array.isArray(data.days) && data.days.length > 0) {
                    const targetDay =
                        data.days.find((d) => Number(d.id) === Number(preserveSelectedDayId)) || data.days[0];
                    setSelectedDayId(targetDay.id);
                    await loadDayData(targetDay.id);
                }
            }
        } catch (err) {
            console.error('Failed to load menu plan:', err);
        } finally {
            setLoadingPlan(false);
        }
    };

    // 2. Fetch specific day
    const loadDayData = async (dayId) => {
        if (!dayId) return;
        setLoadingDaySchedule(true);
        try {
            const res = await getMenuPlanDayById(dayId);
            const dayData = res?.data?.data ?? res?.data;

            if (dayData) {
                setActiveDayData(dayData);
                if (Array.isArray(dayData.shifts) && dayData.shifts.length > 0) {
                    setSelectedMealTypeId((prev) => {
                        const exists = dayData.shifts.some((s) => String(s.mealTypeId) === String(prev));
                        return exists ? prev : String(dayData.shifts[0].mealTypeId);
                    });
                } else {
                    setSelectedMealTypeId('');
                }
            }
        } catch (err) {
            console.error('Failed to load day schedule:', err);
        } finally {
            setLoadingDaySchedule(false);
        }
    };

    useEffect(() => {
        fetchPlanDetails(passedPlanId);
    }, [passedPlanId]);

    const handleSelectDay = (dayId) => {
        setSelectedDayId(dayId);
        lastLoadedShiftKeyRef.current = '';
        loadDayData(dayId);
    };

    // Multi-select checkbox toggle for SUBMITTED days in Approval Flow
    const toggleDayCheckbox = (e, dayId) => {
        e.stopPropagation();
        const numericId = Number(dayId);
        setSelectedDayIdsForApproval((prev) =>
            prev.includes(numericId) ? prev.filter((id) => id !== numericId) : [...prev, numericId]
        );
    };

    const filteredSubUnits = useMemo(() => {
        if (!selectedOrgUnitId) return EMPTY_ARRAY;
        return (scopeSubOutlets || []).filter(
            (su) => String(su.organizationId ?? su.orgId ?? su.outletId) === String(selectedOrgUnitId)
        );
    }, [scopeSubOutlets, selectedOrgUnitId]);

    const currentUnitName = useMemo(() => {
        return (
            planData?.organizationName ||
            units.find((u) => String(u.id) === String(selectedOrgUnitId))?.name ||
            units.find((u) => String(u.id) === String(selectedOrgUnitId))?.companyName ||
            ''
        );
    }, [planData, units, selectedOrgUnitId]);

    const currentSubUnitName = useMemo(() => {
        return (
            planData?.subOutletName ||
            filteredSubUnits.find((su) => String(su.id) === String(subUnitId))?.name ||
            filteredSubUnits.find((su) => String(su.id) === String(subUnitId))?.subOutletName ||
            ''
        );
    }, [planData, filteredSubUnits, subUnitId]);

    const allDaysList = useMemo(() => {
        return Array.isArray(planData?.days) ? planData.days : EMPTY_ARRAY;
    }, [planData]);

    const totalDaysCount = useMemo(() => {
        if (planData?.totalDays) return Number(planData.totalDays);
        if (allDaysList.length > 0) return allDaysList.length;
        if (planData?.fromDate && planData?.toDate) {
            const diff = new Date(planData.toDate).getTime() - new Date(planData.fromDate).getTime();
            return Math.ceil(diff / (1000 * 3600 * 24)) + 1;
        }
        return 0;
    }, [planData, allDaysList]);

    const isMultiWeek = totalDaysCount > 7;

    const totalWeeksCount = useMemo(() => {
        return Math.max(1, Math.ceil(totalDaysCount / 7));
    }, [totalDaysCount]);

    const visibleDays = useMemo(() => {
        if (!isMultiWeek) return allDaysList;
        const startIndex = (selectedWeek - 1) * 7;
        return allDaysList.slice(startIndex, startIndex + 7);
    }, [allDaysList, isMultiWeek, selectedWeek]);

    // Only days with SUBMITTED status can be multi-selected for batch approval/rejection
    const submittedDayIds = useMemo(() => {
        return allDaysList
            .filter((d) => (d.status || '').toUpperCase() === 'SUBMITTED')
            .map((d) => Number(d.id));
    }, [allDaysList]);

    const handleToggleSelectAllDays = () => {
        if (
            submittedDayIds.length > 0 &&
            selectedDayIdsForApproval.length === submittedDayIds.length
        ) {
            setSelectedDayIdsForApproval([]);
        } else {
            setSelectedDayIdsForApproval(submittedDayIds);
        }
    };

    // Merge day-level & shift-level statuses from planData.days so shift/day statuses stay in sync
    const activeDay = useMemo(() => {
        const planDay =
            allDaysList.find((d) => Number(d.id) === Number(selectedDayId)) || allDaysList[0] || null;
        if (!activeDayData) return planDay;
        if (!planDay) return activeDayData;

        const mergedShifts = (
            Array.isArray(activeDayData.shifts) ? activeDayData.shifts : planDay.shifts || []
        ).map((s) => {
            const planShift = (planDay.shifts || []).find(
                (ps) => Number(ps.mealTypeId) === Number(s.mealTypeId)
            );
            return {
                ...planShift,
                ...s,
                id: s.id ?? planShift?.id ?? null,
                status: s.status || planShift?.status || planDay.status || 'DRAFT',
            };
        });

        return {
            ...planDay,
            ...activeDayData,
            status: activeDayData.status || planDay.status || 'DRAFT',
            shifts: mergedShifts,
        };
    }, [activeDayData, allDaysList, selectedDayId]);

    const activeDayShifts = useMemo(() => {
        return Array.isArray(activeDay?.shifts) ? activeDay.shifts : EMPTY_ARRAY;
    }, [activeDay]);

    const activeShift = useMemo(() => {
        return (
            activeDayShifts.find((s) => String(s.mealTypeId) === String(selectedMealTypeId)) ||
            activeDayShifts[0] ||
            null
        );
    }, [activeDayShifts, selectedMealTypeId]);

    const activeShiftSlots = useMemo(() => {
        return Array.isArray(activeShift?.slots) ? activeShift.slots : EMPTY_ARRAY;
    }, [activeShift?.slots]);

    // Load recipes for active shift
    useEffect(() => {
        if (!activeShift) {
            setSlotRecipes({});
            lastLoadedShiftKeyRef.current = '';
            return;
        }

        const currentShiftMealTypeId = Number(activeShift.mealTypeId);
        const shiftKey = `${activeDay?.id || 0}-${currentShiftMealTypeId}`;
        if (lastLoadedShiftKeyRef.current === shiftKey) {
            return;
        }
        lastLoadedShiftKeyRef.current = shiftKey;

        const dayItems = Array.isArray(activeDay?.items) ? activeDay.items : [];

        const currentShiftDayItems = dayItems.filter(
            (item) => Number(item.mealTypeId) === currentShiftMealTypeId
        );

        const initialMap = {};

        activeShiftSlots.forEach((slot) => {
            const detailId = slot.mealStructureDetailId || slot.daySlotId;
            const slotDetailNum = Number(detailId);

            const matchingFromDayItems = currentShiftDayItems.filter(
                (it) => Number(it.mealStructureDetailId) === slotDetailNum
            );
            const matchingFromSlotRecipes = Array.isArray(slot.recipes) ? slot.recipes : [];

            const rawList =
                matchingFromDayItems.length > 0 ? matchingFromDayItems : matchingFromSlotRecipes;

            const seen = new Set();
            const uniqueList = rawList.filter((r) => {
                const kId = Number(r.kitchenMenuItemId || r.id);
                if (seen.has(kId)) return false;
                seen.add(kId);
                return true;
            });

            initialMap[detailId] = uniqueList.map((r, idx) => {
                const displayName =
                    r.recipeName ||
                    r.itemName ||
                    r.kitchenMenuItemName ||
                    `Item #${r.kitchenMenuItemId || r.id}`;
                const displayCategory =
                    r.recipeCategoryName || slot.kitchenMenuCategoryName || r.categoryName || 'General';

                const rawUnit =
                    r.perPersonConsumptionUnitSymbol ||
                    r.portionUnitSymbol ||
                    r.portionUnitName ||
                    r.uomSymbol ||
                    r.baseRecipeUnitSymbol ||
                    r.unitName ||
                    'g';
                const rawPortion =
                    r.perPersonConsumptionQuantity || r.portionSize
                        ? `${r.perPersonConsumptionQuantity || r.portionSize} ${rawUnit}`
                        : r.portion;
                const { quantity, unit } = parsePortion(rawPortion, rawUnit);

                const isRealDbRecord =
                    r.menuPlanDayId && r.id && Number(r.id) !== Number(r.kitchenMenuItemId);
                const resolvedUnitId = extractPortionUnitId(r);
                const shortUnit = getShortUnit(unit);
                const resolvedImg = resolveItemImage(r);
                const resolvedWeightUnitId =
                    extractWeightUnitId(r) ||
                    (r.unitName && r.unitId && Number(r.unitId) > 0 ? Number(r.unitId) : null);
                const resolvedWeightUnitSym = getShortUnit(
                    r.scaledWeightUnitSymbol ||
                    r.displayScaledWeightUnitSymbol ||
                    r.uomSymbol ||
                    r.unitSymbol ||
                    r.unitName ||
                    ''
                );

                const normalizedFromDate = normalizeToIsoDate(r.fromDate || r.rateFromDate || '');
                const normalizedToDate = normalizeToIsoDate(r.toDate || r.rateToDate || '');

                const builtDestinations = buildDestinationsForItem(r.destinations);

                return {
                    ...r,
                    dayItemId: isRealDbRecord ? Number(r.id) : 0,
                    id: isRealDbRecord ? Number(r.id) : 0,
                    kitchenMenuItemId: Number(r.kitchenMenuItemId || r.id),
                    itemName: displayName,
                    categoryName: displayCategory,
                    imageUrl: resolvedImg,
                    files: r.files || [],
                    rowKey: `${r.kitchenMenuItemId || r.id}-${detailId}-${idx}`,
                    rateSource: r.rateSource || 'LAST_PURCHASE',
                    costPerPortion:
                        r.costPerPortion !== undefined && r.costPerPortion !== null ? r.costPerPortion : 0,
                    totalPlannedQty:
                        r.plannedQty !== undefined && r.plannedQty !== null ? String(r.plannedQty) : '',
                    actualPax: String(r.actualPax ?? r.plannedPax ?? activeShift.plannedPax ?? ''),
                    plannedQty: r.plannedQty !== undefined && r.plannedQty !== null ? r.plannedQty : 0,
                    portionQuantity: quantity,
                    perPersonConsumptionUnitSymbol: shortUnit,
                    portionUnitSymbol: shortUnit,
                    portionUnitName: shortUnit,
                    perPersonConsumptionUnitId: resolvedUnitId,
                    perPersonPortionUnitId: resolvedUnitId,
                    portionUnitId: resolvedUnitId,
                    ...(resolvedWeightUnitId ? { scaledWeightUnitId: resolvedWeightUnitId } : {}),
                    ...(resolvedWeightUnitSym ? { uomSymbol: resolvedWeightUnitSym } : {}),
                    portion: quantity ? `${quantity} ${shortUnit}`.trim() : shortUnit ? `1 ${shortUnit}` : '',
                    rateFromDate: normalizedFromDate,
                    rateToDate: normalizedToDate,
                    fromDate: normalizedFromDate,
                    toDate: normalizedToDate,
                    destinations: builtDestinations,
                    rawMaterials: r.rawMaterials || [],
                    captainRecipes: r.captainRecipes || r.captainReceipes || [],
                };
            });
        });

        setSlotRecipes(initialMap);
    }, [activeDay, activeShift, activeShiftSlots, buildDestinationsForItem]);

    const allActiveItems = useMemo(() => {
        return Object.values(slotRecipes).flat();
    }, [slotRecipes]);

    const totalMealCost = useMemo(() => {
        return allActiveItems.reduce((acc, i) => acc + (Number(i.costPerPortion) || 0), 0);
    }, [allActiveItems]);

    // Synchronize snapshot item with the latest slotRecipes state
    const activeSnapshotItem = useMemo(() => {
        if (!selectedSnapshotItem) return null;
        return allActiveItems.find((it) => it.rowKey === selectedSnapshotItem.rowKey) || selectedSnapshotItem;
    }, [selectedSnapshotItem, allActiveItems]);

    const handleCostingCalculatedFromSidebar = useCallback((item, costingData) => {
        if (!item || !costingData) return;
        setSlotRecipes((prev) => {
            let changed = false;
            const updated = {};
            for (const [sKey, list] of Object.entries(prev)) {
                updated[sKey] = list.map((it) => {
                    if (it.rowKey === item.rowKey || it.kitchenMenuItemId === item.kitchenMenuItemId) {
                        if (it.recipeCostingData === costingData) return it;
                        changed = true;
                        return {
                            ...it,
                            recipeCostingData: costingData,
                            captainRecipes: costingData.captainRecipes || costingData.captainReceipes || it.captainRecipes || [],
                            costPerPortion: costingData.costPerPerson != null ? costingData.costPerPerson : it.costPerPortion,
                            totalPlannedQty: costingData.scaledWeight != null ? String(costingData.scaledWeight) : it.totalPlannedQty,
                            plannedQty: costingData.scaledWeight != null ? Number(costingData.scaledWeight) || 0 : it.plannedQty,
                        };
                    }
                    return it;
                });
            }
            return changed ? updated : prev;
        });
    }, []);

    // Fetch recipe costing per destination outlet / subOutlet / targetPax
    const fetchDestinationRecipeCost = useCallback(async (slotKey, targetRowKey, item, dest) => {
        const targetPaxNum = Number(dest.plannedPax) || 0;
        if (!dest.destinationOutletId || targetPaxNum <= 0) return;

        setSlotRecipes((prev) => ({
            ...prev,
            [slotKey]: (prev[slotKey] || []).map((it) => {
                if (it.rowKey !== targetRowKey) return it;
                return {
                    ...it,
                    destinations: (it.destinations || []).map((d) =>
                        d.destKey === dest.destKey ? { ...d, loadingCost: true } : d
                    ),
                };
            }),
        }));

        try {
            const queryParams = {
                isLpgRequired: false,
                isOtherCostRequired: false,
                isPerPersonConsumptionBasedCalculate: true,
                materialCenterOrgId: Number(dest.destinationOutletId),
                organizationId: Number(dest.destinationOutletId),
                targetPax: targetPaxNum,
                ...(dest.destinationSubOutletId && Number(dest.destinationSubOutletId) > 0
                    ? { subOutletId: Number(dest.destinationSubOutletId) }
                    : {}),
            };

            const res = await getRecipeCosting(item.kitchenMenuItemId, queryParams);
            const cData = res?.data?.data ?? res?.data;

            if (cData) {
                const fetchedPortionSize =
                    cData.portionSize !== undefined && cData.portionSize !== null
                        ? String(cData.portionSize)
                        : cData.perPersonConsumptionQuantity !== undefined &&
                            cData.perPersonConsumptionQuantity !== null
                            ? String(cData.perPersonConsumptionQuantity)
                            : '';
                const fetchedUnitSymbol = getShortUnit(
                    cData.perPersonConsumptionUnitSymbol ||
                    cData.uomSymbol ||
                    cData.baseRecipeUnitSymbol ||
                    item.portionUnitSymbol ||
                    'g'
                );
                const fetchedUnitId =
                    extractPortionUnitId(cData) || extractPortionUnitId(item) || null;
                const fetchedScaledWeight =
                    cData.scaledWeight !== undefined && cData.scaledWeight !== null
                        ? String(cData.scaledWeight)
                        : '';

                setSlotRecipes((prev) => ({
                    ...prev,
                    [slotKey]: (prev[slotKey] || []).map((it) => {
                        if (it.rowKey !== targetRowKey) return it;
                        return {
                            ...it,
                            destinations: (it.destinations || []).map((d) => {
                                if (d.destKey !== dest.destKey) return d;
                                return {
                                    ...d,
                                    loadingCost: false,
                                    portionSize: fetchedPortionSize || d.portionSize,
                                    portionUnitId: fetchedUnitId,
                                    portionUnitSymbol: fetchedUnitSymbol,
                                    plannedQty:
                                        d.plannedQty !== '' && d.plannedQty !== undefined
                                            ? d.plannedQty
                                            : fetchedScaledWeight,
                                };
                            }),
                        };
                    }),
                }));
            } else {
                setSlotRecipes((prev) => ({
                    ...prev,
                    [slotKey]: (prev[slotKey] || []).map((it) => {
                        if (it.rowKey !== targetRowKey) return it;
                        return {
                            ...it,
                            destinations: (it.destinations || []).map((d) =>
                                d.destKey === dest.destKey ? { ...d, loadingCost: false } : d
                            ),
                        };
                    }),
                }));
            }
        } catch (err) {
            console.error('Failed to fetch destination recipe costing:', err);
            setSlotRecipes((prev) => ({
                ...prev,
                [slotKey]: (prev[slotKey] || []).map((it) => {
                    if (it.rowKey !== targetRowKey) return it;
                    return {
                        ...it,
                        destinations: (it.destinations || []).map((d) =>
                            d.destKey === dest.destKey ? { ...d, loadingCost: false } : d
                        ),
                    };
                }),
            }));
        }
    }, []);


    const fetchDestinationPortion = useCallback(
        async (slotKey, targetRowKey, item, dest, source) => {
            const paxNum = Number(dest.plannedPax) || 0;
            const qtyNum = Number(dest.plannedQty) || 0;
            if (!dest.destinationOutletId) return;
            if (source === 'plannedQty' ? qtyNum <= 0 : paxNum <= 0) return;

            const weightUnitId = extractWeightUnitId(item);
            const weightUnitSymbol = extractWeightUnitSymbol(item);
            const portionQty = Number(item.portionQuantity) || Number(item.portionSize) || 0;
            const portionUnitId = extractPortionUnitId(item);
            const portionUnitSymbol = getShortUnit(
                item.perPersonConsumptionUnitSymbol ||
                item.portionUnitSymbol ||
                item.portionUnitName ||
                'g'
            );

            const payload = {
                kitchenMenuItemId: Number(item.kitchenMenuItemId),
                organizationId: Number(dest.destinationOutletId),
                ...(dest.destinationSubOutletId && Number(dest.destinationSubOutletId) > 0
                    ? { subOutletId: Number(dest.destinationSubOutletId) }
                    : {}),
                ...(portionQty > 0
                    ? {
                        portionQuantity: portionQty,
                        ...(portionUnitId ? { portionUnitId } : {}),
                        portionUnitSymbol,
                    }
                    : {}),
                ...(source === 'plannedQty'
                    ? {
                        totalWeight: qtyNum,
                        ...(weightUnitId
                            ? { totalWeightUnitId: weightUnitId, targetWeightUnitId: weightUnitId }
                            : {}),
                        totalWeightUnitSymbol: weightUnitSymbol,
                        targetWeightUnitSymbol: weightUnitSymbol,
                    }
                    : { pax: paxNum }),
            };

            const patchDest = (patch) =>
                setSlotRecipes((prev) => ({
                    ...prev,
                    [slotKey]: (prev[slotKey] || []).map((it) =>
                        it.rowKey !== targetRowKey
                            ? it
                            : {
                                ...it,
                                destinations: (it.destinations || []).map((d) =>
                                    d.destKey === dest.destKey ? { ...d, ...patch } : d
                                ),
                            }
                    ),
                }));

            patchDest({ loadingCost: true });
            try {
                const res = await calculatePortion(payload);
                const r = res?.data?.data ?? res?.data;
                if (!r) return patchDest({ loadingCost: false });

                // Response: { pax, perPersonPortion: {quantity, unitId, unitSymbol},
                //             totalWeight: {quantity, unitId, unitSymbol} }
                const respPax = r.pax;
                const respQty = r.totalWeight?.quantity;

                const patch = { loadingCost: false };

                // Pax: only overwrite when the user did NOT type it (i.e. qty was the source)
                if (source === 'plannedQty' && respPax != null) {
                    const itemTotalPax = Number(item.actualPax) || Number(item.plannedPax) || 0;
                    const isDestActive = (d) => d.selected !== false;
                    const otherPaxSum = (item.destinations || [])
                        .filter((d) => d.destKey !== dest.destKey && isDestActive(d))
                        .reduce((sum, d) => sum + (Number(d.plannedPax) || 0), 0);
                    const maxAllowedPax = itemTotalPax > 0 ? Math.max(0, itemTotalPax - otherPaxSum) : null;
                    const finalPax =
                        maxAllowedPax != null && Number(respPax) > maxAllowedPax
                            ? maxAllowedPax
                            : Number(respPax);
                    patch.plannedPax = String(finalPax);
                }

                // Qty: only overwrite when the user did NOT type it
                if (source !== 'plannedQty' && respQty != null) {
                    const itemTotalQty = Number(item.totalPlannedQty) || Number(item.plannedQty) || 0;
                    const isDestActive = (d) => d.selected !== false;
                    const otherQtySum = (item.destinations || [])
                        .filter((d) => d.destKey !== dest.destKey && isDestActive(d))
                        .reduce((sum, d) => sum + (Number(d.plannedQty) || 0), 0);
                    const maxAllowedQty =
                        itemTotalQty > 0 ? Math.max(0, Number((itemTotalQty - otherQtySum).toFixed(3))) : null;
                    const finalQty =
                        maxAllowedQty != null && Number(respQty) > maxAllowedQty
                            ? maxAllowedQty
                            : Number(respQty);
                    patch.plannedQty = String(finalQty);
                }

                patchDest(patch);
            } catch (err) {
                console.error('Failed to calculate portion:', err);
                patchDest({ loadingCost: false });
            }
        },
        []
    );

    // Toggle collapse section when clicking menu item and trigger getRecipeCosting for destinations
    const handleToggleItemExpand = (slotKey, item) => {
        const isCurrentlyOpen = Boolean(expandedItems[item.rowKey]);
        const nextOpen = !isCurrentlyOpen;

        setExpandedItems((prev) => ({
            ...prev,
            [item.rowKey]: nextOpen,
        }));

        if (nextOpen && Array.isArray(item.destinations) && item.destinations.length > 0) {
            item.destinations.forEach((dest) => {
                if (Number(dest.plannedPax) > 0) {
                    // was: fetchDestinationRecipeCost(slotKey, item.rowKey, item, dest);
                    fetchDestinationPortion(slotKey, item.rowKey, item, dest, 'plannedPax');
                }
            });
        }
    };

    // Destination Row Handlers
    const handleToggleAllItemDestinations = (slotKey, targetRowKey, checked) => {
        setSlotRecipes((prev) => ({
            ...prev,
            [slotKey]: (prev[slotKey] || []).map((it) => {
                if (it.rowKey !== targetRowKey) return it;
                return {
                    ...it,
                    destinations: (it.destinations || []).map((d) => ({
                        ...d,
                        selected: checked,
                    })),
                };
            }),
        }));
    };

    const handleToggleSingleItemDestination = (slotKey, targetRowKey, destKey, checked) => {
        setSlotRecipes((prev) => ({
            ...prev,
            [slotKey]: (prev[slotKey] || []).map((it) => {
                if (it.rowKey !== targetRowKey) return it;
                return {
                    ...it,
                    destinations: (it.destinations || []).map((d) =>
                        d.destKey === destKey ? { ...d, selected: checked } : d
                    ),
                };
            }),
        }));
    };

    const handleRemoveDestination = (slotKey, targetRowKey, destKey) => {
        setSlotRecipes((prev) => ({
            ...prev,
            [slotKey]: (prev[slotKey] || []).map((it) => {
                if (it.rowKey !== targetRowKey) return it;
                return {
                    ...it,
                    destinations: (it.destinations || []).filter((d) => d.destKey !== destKey),
                };
            }),
        }));
        notify.success('Destination allocation removed.');
    };

    const DEST_CALC_FIELDS = ['plannedPax', 'plannedQty'];

    const handleDestinationInputChange = (slotKey, targetRowKey, item, dest, field, value) => {
        if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

        // Validation for Destination Allocation: PAX and QTY
        if (value !== '' && Number(value) > 0) {
            const valNum = Number(value);
            const isDestActive = (d) => d.selected !== false;
            const currentSlotItem = (slotRecipes[slotKey] || []).find((it) => it.rowKey === targetRowKey) || item;
            const currentDests = currentSlotItem.destinations || item.destinations || [];

            if (field === 'plannedPax') {
                const itemTotalPax =
                    Number(currentSlotItem.actualPax) ||
                    Number(currentSlotItem.plannedPax) ||
                    Number(activeShift?.plannedPax) ||
                    Number(activeShift?.expectedPax) ||
                    0;

                if (itemTotalPax <= 0) {
                    notify.error('Please enter Actual PAX for the recipe before allocating destination PAX.');
                    return;
                }

                const otherPaxSum = currentDests
                    .filter((d) => d.destKey !== dest.destKey && isDestActive(d))
                    .reduce((sum, d) => sum + (Number(d.plannedPax) || 0), 0);

                const maxAllowedPax = Math.max(0, itemTotalPax - otherPaxSum);

                if (valNum > maxAllowedPax) {
                    if (otherPaxSum > 0) {
                        notify.error(
                            `Remaining PAX is ${maxAllowedPax}. ${value} is not valid (Actual PAX: ${itemTotalPax}).`
                        );
                    } else {
                        notify.error(
                            `Entered destination PAX (${value}) exceeds Actual PAX (${itemTotalPax}). Remaining PAX is ${maxAllowedPax}.`
                        );
                    }
                    return;
                }
            } else if (field === 'plannedQty') {
                const itemTotalQty = Number(currentSlotItem.totalPlannedQty) || Number(currentSlotItem.plannedQty) || 0;
                const qtyUnit = extractWeightUnitSymbol(currentSlotItem);

                if (itemTotalQty <= 0) {
                    notify.error('Please enter Total Planned Quantity for the recipe before allocating destination quantity.');
                    return;
                }

                const otherQtySum = currentDests
                    .filter((d) => d.destKey !== dest.destKey && isDestActive(d))
                    .reduce((sum, d) => sum + (Number(d.plannedQty) || 0), 0);

                const maxAllowedQty = Math.max(0, Number((itemTotalQty - otherQtySum).toFixed(3)));

                if (valNum > maxAllowedQty) {
                    if (otherQtySum > 0) {
                        notify.error(
                            `Remaining quantity is ${maxAllowedQty} ${qtyUnit}. ${value} is not valid (Total Planned Quantity: ${itemTotalQty} ${qtyUnit}).`
                        );
                    } else {
                        notify.error(
                            `Entered destination quantity (${value} ${qtyUnit}) exceeds Total Planned Quantity (${itemTotalQty} ${qtyUnit}). Remaining quantity is ${maxAllowedQty} ${qtyUnit}.`
                        );
                    }
                    return;
                }
            }
        }

        setSlotRecipes((prev) => ({
            ...prev,
            [slotKey]: (prev[slotKey] || []).map((it) =>
                it.rowKey !== targetRowKey
                    ? it
                    : {
                        ...it,
                        destinations: (it.destinations || []).map((d) =>
                            d.destKey === dest.destKey ? { ...d, [field]: value } : d
                        ),
                    }
            ),
        }));

        if (!DEST_CALC_FIELDS.includes(field)) return;

        const timerKey = `${targetRowKey}-${dest.destKey}`;
        if (destPaxTimersRef.current[timerKey]) clearTimeout(destPaxTimersRef.current[timerKey]);

        if (value && Number(value) > 0) {
            destPaxTimersRef.current[timerKey] = setTimeout(() => {
                fetchDestinationPortion(slotKey, targetRowKey, item, { ...dest, [field]: value }, field);
            }, 500);
        }
    };

    const handleTotalPlannedQtyChange = (slotKey, targetRowKey, value, item) => {
        if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

        setSlotRecipes((prev) => ({
            ...prev,
            [slotKey]: (prev[slotKey] || []).map((it) =>
                it.rowKey === targetRowKey
                    ? { ...it, totalPlannedQty: value, plannedQty: value !== '' ? Number(value) : 0 }
                    : it
            ),
        }));

        const timerKey = `${targetRowKey}-qty`;
        if (portionTimersRef.current[timerKey]) clearTimeout(portionTimersRef.current[timerKey]);
        if (value && Number(value) > 0) {
            portionTimersRef.current[timerKey] = setTimeout(() => {
                fetchItemScaling(slotKey, targetRowKey, item, { source: 'weight', value });
            }, 500);
        }
    };

    const handleActualPaxChange = (slotKey, targetRowKey, value, item) => {
        if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

        // Validation: Actual PAX cannot be less than already allocated destination PAX
        if (value !== '' && Number(value) >= 0) {
            const valNum = Number(value);
            const currentSlotItem = (slotRecipes[slotKey] || []).find((it) => it.rowKey === targetRowKey) || item;
            const currentDests = currentSlotItem.destinations || item.destinations || [];
            const isDestActive = (d) => d.selected !== false;
            const allocatedPaxSum = currentDests
                .filter(isDestActive)
                .reduce((sum, d) => sum + (Number(d.plannedPax) || 0), 0);

            if (allocatedPaxSum > 0 && valNum < allocatedPaxSum) {
                notify.error(
                    `Actual PAX (${value}) cannot be less than total allocated destination PAX (${allocatedPaxSum}).`
                );
                return;
            }
        }

        setSlotRecipes((prev) => ({
            ...prev,
            [slotKey]: (prev[slotKey] || []).map((it) =>
                it.rowKey === targetRowKey ? { ...it, actualPax: value } : it
            ),
        }));

        const timerKey = `${targetRowKey}-pax`;
        if (portionTimersRef.current[timerKey]) clearTimeout(portionTimersRef.current[timerKey]);
        if (value && Number(value) > 0) {
            portionTimersRef.current[timerKey] = setTimeout(() => {
                fetchItemScaling(slotKey, targetRowKey, item, { source: 'pax', value });
            }, 500);
        }
    };

    // Recalculate Recipe Cost API Call
    const recalculateRecipeCost = useCallback(
        async (slotKey, targetRowKey, newQty, item, updatedRateSource = null, customDates = null) => {
            const portionVal = newQty !== undefined && newQty !== null ? newQty : item.portionQuantity;
            if (!portionVal || isNaN(Number(portionVal)) || Number(portionVal) <= 0) return;

            try {
                const targetPaxVal =
                    Number(item.actualPax) ||
                    Number(activeShift?.plannedPax) ||
                    Number(activeShift?.expectedPax) ||
                    1;
                const unitIdParam = extractPortionUnitId(item);
                const pricingBasisParam = updatedRateSource || item.rateSource || 'LAST_PURCHASE';

                const effectiveFromDate = customDates ? customDates.fromDate : item.rateFromDate || '';
                let effectiveToDate = customDates ? customDates.toDate : item.rateToDate || '';

                if (REQUIRES_DATE_BASIS.includes(pricingBasisParam) && effectiveFromDate && !effectiveToDate) {
                    effectiveToDate = getTodayDateString();
                }

                const queryParams = {
                    isLpgRequired: false,
                    isOtherCostRequired: false,
                    isPerPersonConsumptionBasedCalculate: true,
                    materialCenterOrgId: Number(selectedOrgUnitId),
                    organizationId: Number(selectedOrgUnitId),
                    perPersonPortionQuantity: Number(portionVal),
                    portionSize: 1,
                    pricingBasis: pricingBasisParam,
                    targetPax: targetPaxVal,
                    ...(subUnitId && Number(subUnitId) > 0
                        ? {
                            subOutletId: Number(subUnitId),
                            materialCenterSubOutletId: Number(subUnitId),
                        }
                        : {}),
                    ...(unitIdParam ? { perPersonPortionUnitId: Number(unitIdParam) } : {}),
                    ...(REQUIRES_DATE_BASIS.includes(pricingBasisParam) && effectiveFromDate
                        ? {
                            fromDate: formatForBackend(effectiveFromDate),
                            toDate: formatForBackend(effectiveToDate || getTodayDateString()),
                        }
                        : {}),
                };

                const res = await getRecipeCosting(item.kitchenMenuItemId, queryParams);
                const cData = res?.data?.data ?? res?.data;

                if (cData && cData.costPerPerson !== undefined && cData.costPerPerson !== null) {
                    const updatedUnit = getShortUnit(
                        cData.perPersonConsumptionUnitSymbol ||
                        cData.uomSymbol ||
                        cData.baseRecipeUnitSymbol ||
                        item.perPersonConsumptionUnitSymbol ||
                        'g'
                    );
                    const updatedUnitId = extractPortionUnitId(cData) || unitIdParam;
                    const updatedWeightUnitId = extractWeightUnitId(cData) || extractWeightUnitId(item);
                    const updatedWeightSymbol =
                        cData.scaledWeightUnitSymbol ||
                        cData.displayScaledWeightUnitSymbol ||
                        cData.uomSymbol ||
                        item.uomSymbol;

                    setSlotRecipes((prev) => ({
                        ...prev,
                        [slotKey]: (prev[slotKey] || []).map((it) =>
                            it.rowKey === targetRowKey
                                ? {
                                    ...it,
                                    costPerPortion: cData.costPerPerson,
                                    totalPlannedQty:
                                        cData.scaledWeight != null ? String(cData.scaledWeight) : it.totalPlannedQty,
                                    plannedQty:
                                        cData.scaledWeight != null ? Number(cData.scaledWeight) || 0 : it.plannedQty,

                                    rateSource: pricingBasisParam,
                                    perPersonConsumptionUnitSymbol: updatedUnit,
                                    portionUnitSymbol: updatedUnit,
                                    portionUnitName: updatedUnit,
                                    perPersonConsumptionUnitId: updatedUnitId,
                                    perPersonPortionUnitId: updatedUnitId,
                                    portionUnitId: updatedUnitId,
                                    ...(updatedWeightUnitId ? { scaledWeightUnitId: updatedWeightUnitId } : {}),
                                    ...(updatedWeightSymbol ? { uomSymbol: updatedWeightSymbol } : {}),
                                    rateFromDate: effectiveFromDate,
                                    rateToDate: effectiveToDate,
                                    fromDate: effectiveFromDate,
                                    toDate: effectiveToDate,
                                    recipeCostingData: cData,
                                    captainRecipes: cData.captainRecipes || cData.captainReceipes || it.captainRecipes || [],
                                }
                                : it
                        ),
                    }));

                    // Recalculate destination plannedQty using the updated header portion
                    if (Array.isArray(item.destinations) && item.destinations.length > 0) {
                        const updatedItemForDest = {
                            ...item,
                            costPerPortion: cData.costPerPerson,
                            totalPlannedQty:
                                cData.scaledWeight != null ? String(cData.scaledWeight) : item.totalPlannedQty,
                            plannedQty:
                                cData.scaledWeight != null ? Number(cData.scaledWeight) || 0 : item.plannedQty,
                            portionQuantity: String(portionVal),
                            portionSize: Number(portionVal) || item.portionSize,
                            perPersonConsumptionUnitSymbol: updatedUnit,
                            portionUnitSymbol: updatedUnit,
                            portionUnitName: updatedUnit,
                            perPersonConsumptionUnitId: updatedUnitId,
                            perPersonPortionUnitId: updatedUnitId,
                            portionUnitId: updatedUnitId,
                            ...(updatedWeightUnitId ? { scaledWeightUnitId: updatedWeightUnitId } : {}),
                            ...(updatedWeightSymbol ? { uomSymbol: updatedWeightSymbol } : {}),
                            recipeCostingData: cData,
                        };
                        item.destinations.forEach((dest) => {
                            if (Number(dest.plannedPax) > 0) {
                                fetchDestinationPortion(slotKey, targetRowKey, updatedItemForDest, dest, 'plannedPax');
                            }
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to recalculate costing for recipe:', err);
            }
        },
        [activeShift, selectedOrgUnitId, subUnitId, fetchDestinationPortion]
    );

    const fetchItemScaling = useCallback(
        async (slotKey, targetRowKey, item, { source, value }) => {
            const num = Number(value);
            if (!num || num <= 0) return;

            try {
                const pricingBasisParam = item.rateSource || 'LAST_PURCHASE';
                const fromDate = item.rateFromDate || '';
                const toDate = item.rateToDate || (fromDate ? getTodayDateString() : '');
                const portionVal = Number(item.portionQuantity) || 0;
                const unitIdParam = extractPortionUnitId(item);
                const weightUnitId = extractWeightUnitId(item);

                const queryParams = {
                    isLpgRequired: false,
                    isOtherCostRequired: false,
                    isPerPersonConsumptionBasedCalculate: true,
                    materialCenterOrgId: Number(selectedOrgUnitId),
                    organizationId: Number(selectedOrgUnitId),
                    pricingBasis: pricingBasisParam,
                    ...(portionVal > 0
                        ? { perPersonPortionQuantity: portionVal, portionSize: 1 }
                        : {}),
                    ...(unitIdParam ? { perPersonPortionUnitId: Number(unitIdParam) } : {}),
                    ...(source === 'pax'
                        ? { targetPax: num }
                        : {
                            targetWeight: num,
                            ...(weightUnitId ? { targetWeightUnitId: weightUnitId } : {}),
                        }),
                    ...(subUnitId && Number(subUnitId) > 0
                        ? {
                            subOutletId: Number(subUnitId),
                            materialCenterSubOutletId: Number(subUnitId),
                        }
                        : {}),
                    ...(REQUIRES_DATE_BASIS.includes(pricingBasisParam) && fromDate
                        ? { fromDate: formatForBackend(fromDate), toDate: formatForBackend(toDate) }
                        : {}),
                };

                const res = await getRecipeCosting(item.kitchenMenuItemId, queryParams);
                const cData = res?.data?.data ?? res?.data;
                if (!cData) return;

                setSlotRecipes((prev) => ({
                    ...prev,
                    [slotKey]: (prev[slotKey] || []).map((it) => {
                        if (it.rowKey !== targetRowKey) return it;
                        const updatedWeightUnitId = extractWeightUnitId(cData) || extractWeightUnitId(it);
                        const updatedWeightSymbol =
                            cData.scaledWeightUnitSymbol ||
                            cData.displayScaledWeightUnitSymbol ||
                            cData.uomSymbol ||
                            it.uomSymbol;
                        const patch = {
                            recipeCostingData: cData,
                            captainRecipes: cData.captainRecipes || cData.captainReceipes || it.captainRecipes || [],
                            ...(updatedWeightUnitId ? { scaledWeightUnitId: updatedWeightUnitId } : {}),
                            ...(updatedWeightSymbol ? { uomSymbol: updatedWeightSymbol } : {}),
                        };

                        if (cData.costPerPerson !== undefined && cData.costPerPerson !== null) {
                            patch.costPerPortion = cData.costPerPerson;
                        }

                        // don't overwrite the field the user is typing in
                        if (source === 'pax' && cData.scaledWeight != null) {
                            patch.totalPlannedQty = String(cData.scaledWeight);
                            patch.plannedQty = Number(cData.scaledWeight) || 0;
                        }
                        if (source === 'weight' && cData.scaledPax != null) {
                            patch.actualPax = String(cData.scaledPax);
                        }
                        return { ...it, ...patch };
                    }),
                }));
            } catch (err) {
                console.error('Failed to scale recipe costing:', err);
            }
        },
        [selectedOrgUnitId, subUnitId]
    );

    const handlePortionQuantityChange = (slotKey, targetRowKey, newQty, item) => {
        if (newQty !== '' && !/^\d*\.?\d*$/.test(newQty)) return;

        setSlotRecipes((prev) => ({
            ...prev,
            [slotKey]: (prev[slotKey] || []).map((it) => {
                if (it.rowKey !== targetRowKey) return it;
                const currentUnit = getShortUnit(
                    it.perPersonConsumptionUnitSymbol || it.portionUnitSymbol || 'g'
                );
                return {
                    ...it,
                    portionQuantity: newQty,
                    portion: newQty ? `${newQty} ${currentUnit}`.trim() : '',
                };
            }),
        }));

        if (portionTimersRef.current[targetRowKey]) {
            clearTimeout(portionTimersRef.current[targetRowKey]);
        }

        if (newQty && Number(newQty) > 0) {
            portionTimersRef.current[targetRowKey] = setTimeout(() => {
                recalculateRecipeCost(slotKey, targetRowKey, newQty, item);
            }, 500);
        }
    };

    const handleRateSourceChange = (slotKey, targetRowKey, newSource, item) => {
        const requiresDate = REQUIRES_DATE_BASIS.includes(newSource);

        if (requiresDate) {
            setRateDateModal({
                isOpen: true,
                slotKey,
                targetRowKey,
                item: { ...item, rateSource: newSource },
                newSource,
                fromDate: item.rateFromDate || '',
                toDate: item.rateToDate || getTodayDateString(),
            });
        } else {
            setSlotRecipes((prev) => ({
                ...prev,
                [slotKey]: (prev[slotKey] || []).map((it) =>
                    it.rowKey === targetRowKey
                        ? {
                            ...it,
                            rateSource: newSource,
                            rateFromDate: '',
                            rateToDate: '',
                            fromDate: '',
                            toDate: '',
                        }
                        : it
                ),
            }));
            recalculateRecipeCost(slotKey, targetRowKey, item.portionQuantity, item, newSource);
        }
    };

    const handleOpenRateDateModal = (slotKey, item) => {
        setRateDateModal({
            isOpen: true,
            slotKey,
            targetRowKey: item.rowKey,
            item,
            newSource: item.rateSource,
            fromDate: item.rateFromDate || '',
            toDate: item.rateToDate || getTodayDateString(),
        });
    };

    const handleConfirmRateDates = () => {
        const { slotKey, targetRowKey, item, newSource, fromDate, toDate } = rateDateModal;

        if (!fromDate) {
            notify.error('From Date is required.');
            return;
        }

        const finalToDate = toDate || getTodayDateString();

        if (new Date(fromDate) > new Date(finalToDate)) {
            notify.error('To Date cannot be earlier than From Date.');
            return;
        }

        setSlotRecipes((prev) => ({
            ...prev,
            [slotKey]: (prev[slotKey] || []).map((it) =>
                it.rowKey === targetRowKey
                    ? {
                        ...it,
                        rateSource: newSource,
                        rateFromDate: fromDate,
                        rateToDate: finalToDate,
                        fromDate,
                        toDate: finalToDate,
                    }
                    : it
            ),
        }));

        recalculateRecipeCost(slotKey, targetRowKey, item.portionQuantity, item, newSource, {
            fromDate,
            toDate: finalToDate,
        });

        setRateDateModal({
            isOpen: false,
            slotKey: null,
            targetRowKey: null,
            item: null,
            newSource: 'LAST_PURCHASE',
            fromDate: '',
            toDate: '',
        });
        notify.success('Rate recalculated for selected date range.');
    };

    const handleCancelRateDates = () => {
        const { slotKey, targetRowKey, item } = rateDateModal;
        if (item && !item.rateFromDate) {
            setSlotRecipes((prev) => ({
                ...prev,
                [slotKey]: (prev[slotKey] || []).map((it) =>
                    it.rowKey === targetRowKey ? { ...it, rateSource: 'LAST_PURCHASE' } : it
                ),
            }));
        }
        setRateDateModal({
            isOpen: false,
            slotKey: null,
            targetRowKey: null,
            item: null,
            newSource: 'LAST_PURCHASE',
            fromDate: '',
            toDate: '',
        });
    };

    const handleRemoveItem = (slotKey, targetRowKey) => {
        setSlotRecipes((prev) => ({
            ...prev,
            [slotKey]: (prev[slotKey] || []).filter((i) => i.rowKey !== targetRowKey),
        }));
    };

    const handleOpenAddForSlot = (slotDetailId) => {
        setModalPreselectedSlotId(slotDetailId);
        setModalInitialItemIds([]);
        setIsAddModalOpen(true);
    };

    const handleOpenEditForSlot = (slotDetailId, item) => {
        setModalPreselectedSlotId(slotDetailId);
        setModalInitialItemIds([item.kitchenMenuItemId]);
        setIsAddModalOpen(true);
    };

    const handleSaveSlotRecipes = ({ slotDetailId, chosenItems }) => {
        if (!activeDay || !activeShift) return;

        const newRecipeObjects = chosenItems.map((item, idx) => {
            const displayName = item.recipeName || item.itemName || item.nameEnglish || item.name;

            const unitSym = getShortUnit(
                item.perPersonConsumptionUnitSymbol ||
                item.recipeCostingData?.perPersonConsumptionUnitSymbol ||
                item.recipeCostingData?.uomSymbol ||
                item.recipeCostingData?.baseRecipeUnitSymbol ||
                item.portionUnitSymbol ||
                item.portionUnitName ||
                item.uomSymbol ||
                'g'
            );

            const unitIdVal = extractPortionUnitId(item);
            const portionQty =
                item.portionQuantity ||
                (item.recipeCostingData?.perPersonConsumptionQuantity
                    ? String(item.recipeCostingData.perPersonConsumptionQuantity)
                    : '150');
            const resolvedImg = resolveItemImage(item);
            const normalizedFromDate = normalizeToIsoDate(item.fromDate || item.rateFromDate || '');
            const normalizedToDate = normalizeToIsoDate(item.toDate || item.rateToDate || '');
            const builtDestinations = buildDestinationsForItem(item.destinations);

            return {
                costPerPortion: Number(item.costPerPortion ?? item.price ?? 0),
                dayItemId: item.dayItemId || 0,
                id: item.dayItemId || 0,
                rowKey: `${item.kitchenMenuItemId || item.id}-${slotDetailId}-${Date.now()}-${idx}`,
                kitchenMenuItemId: Number(item.kitchenMenuItemId || item.id),
                mealStructureDetailId: Number(slotDetailId),
                mealStructureId: Number(activeShift.mealStructureId),
                mealTypeId: Number(activeShift.mealTypeId),
                plannedPax: Number(activeShift.plannedPax) || 0,
                actualPax: String(activeShift.plannedPax ?? ''),
                totalPlannedQty: item.plannedQty
                    ? String(item.plannedQty)
                    : item.recipeCostingData?.scaledWeight != null
                        ? String(item.recipeCostingData.scaledWeight)
                        : '',
                plannedQty:
                    Number(item.plannedQty ?? item.recipeCostingData?.scaledWeight) || 0,


                portionSize: Number(portionQty) || 150,
                portionUnitId: unitIdVal,
                perPersonConsumptionUnitId: unitIdVal,
                perPersonPortionUnitId: unitIdVal,
                perPersonConsumptionUnitSymbol: unitSym,
                portionUnitSymbol: unitSym,
                portionUnitName: unitSym,
                rateSource: item.pricingBasis || item.rateSource || 'LAST_PURCHASE',
                rateFromDate: normalizedFromDate,
                rateToDate: normalizedToDate,
                fromDate: normalizedFromDate,
                toDate: normalizedToDate,
                remarks: item.remarks || '',
                sequenceOrder: idx + 1,
                categoryName: item.categoryName,
                itemName: displayName,
                imageUrl: resolvedImg,
                files: item.files || [],
                portionQuantity: portionQty,
                portion: portionQty ? `${portionQty} ${unitSym}` : '',
                recipeCostingData: item.recipeCostingData,
                destinations: builtDestinations,
                captainRecipes:
                    item.recipeCostingData?.captainRecipes ||
                    item.recipeCostingData?.captainReceipes ||
                    item.captainRecipes ||
                    [],
            };
        });

        setSlotRecipes((prev) => ({
            ...prev,
            [slotDetailId]: newRecipeObjects,
        }));

        notify.success('Recipe updated in slot. Click "Save Shift (Draft)" to persist.');
    };

    const mapRawMaterials = (ingredients, rateSource, targetPax) => {
        if (!Array.isArray(ingredients)) return [];
        const pax = Number(targetPax) || 1;

        return ingredients.map((ing) => {
            const requiredQty =
                Number(ing.convertedIngredientWeight ?? ing.baseIngredientWeight ?? ing.displayQty ?? 0) || 0;

            return {
                id: Number(ing.id) || 0,
                rawMaterialId: Number(ing.rawMaterialId) || 0,
                uomId: Number(ing.uomId ?? ing.baseUomId ?? ing.displayUomId ?? 0) || 0,
                // use API value if present, else derive from total / pax
                quantityPerPortion:
                    Number(ing.quantityPerPortion) || (pax > 0 ? requiredQty / pax : 0),
                requiredQty,
                unitRate: Number(ing.baseUomRate ?? ing.unitRate ?? ing.displayUnitRate ?? ing.stockUnitRate ?? 0) || 0,
                totalMaterialCost: Number(ing.amount ?? ing.totalIngredientCost ?? 0) || 0,
                rateSource: ing.rateSource || rateSource || 'LAST_PURCHASE',
                remarks: ing.remarks || '',
            };
        });
    };

    const mapCaptainRecipes = (captainRecipes, rateSource, targetPax) => {
        if (!Array.isArray(captainRecipes)) return [];
        const pax = Number(targetPax) || 1;

        return captainRecipes.map((cr, crIdx) => {
            const crScaledWeight =
                Number(cr.scaledWeight ?? cr.displayQty ?? cr.baseWeight ?? 0) || 0;
            const crRate =
                Number(cr.currentStockCostPerUnit ?? cr.baseUomRate ?? cr.displayUnitRate ?? 0) || 0;
            const crTotalCost =
                Number(cr.totalCost ?? cr.currentStockBatchCost ?? 0) || 0;
            const crRateSource = cr.rateSource || rateSource || 'LAST_PURCHASE';
            const crUomId = Number(cr.uomId ?? cr.displayUomId ?? 0) || 0;

            return {
                id: Number(cr.id) || 0,
                captainRecipeId: Number(cr.captainRecipeId || cr.id) || 0,
                captainRecipeName: cr.captainRecipeName || cr.name || '',
                uomId: crUomId,
                uomSymbol: cr.uomSymbol || cr.displayUomSymbol || '',
                plannedPax: pax,
                plannedQty: crScaledWeight,
                scaledWeight: crScaledWeight,
                portionSize: Number(cr.portionQuantity || cr.displayQty || cr.baseWeight || 0),
                portionUnitId: Number(cr.portionUnitId || cr.displayUomId || cr.uomId || 0),
                unitRate: crRate,
                costPerPortion: crRate,
                totalCost: crTotalCost,
                rateSource: crRateSource,
                rawMaterials: mapRawMaterials(cr.ingredients || cr.rawMaterials, crRateSource, pax),
                remarks: cr.remarks || '',
                sequenceOrder: crIdx + 1,
            };
        });
    };

    // Reusable validation for destination PAX and Quantity across active shift recipes
    const validateShiftDestinationAllocations = () => {
        for (const slot of activeShiftSlots) {
            const slotKey = slot.mealStructureDetailId || slot.daySlotId;
            const slotRecipesList = slotRecipes[slotKey] || [];

            for (const r of slotRecipesList) {
                const itemTotalPax = Number(r.actualPax) || Number(r.plannedPax) || Number(activeShift?.plannedPax) || 0;
                const itemTotalQty = Number(r.totalPlannedQty) || Number(r.plannedQty) || 0;
                const selectedDests = (r.destinations || []).filter((d) => d.selected !== false);

                const destPaxSum = selectedDests.reduce((sum, d) => sum + (Number(d.plannedPax) || 0), 0);
                if (destPaxSum > itemTotalPax && itemTotalPax > 0) {
                    const diff = destPaxSum - itemTotalPax;
                    notify.error(
                        `For "${r.itemName || 'Recipe'}", total destination PAX (${destPaxSum}) exceeds Actual PAX (${itemTotalPax}) by ${diff}. Remaining allowed PAX is exceeded.`
                    );
                    return false;
                }

                const destQtySum = selectedDests.reduce((sum, d) => sum + (Number(d.plannedQty) || 0), 0);
                if (destQtySum > itemTotalQty && itemTotalQty > 0) {
                    notify.error(
                        `For "${r.itemName || 'Recipe'}", total destination quantity (${destQtySum.toFixed(2)}) exceeds Total Planned Quantity (${itemTotalQty.toFixed(2)}).`
                    );
                    return false;
                }
            }
        }
        return true;
    };

    const resolveUnitIdFromSymbol = async (symbol) => {
        const target = getShortUnit(symbol).toLowerCase();
        if (!target) return null;

        if (!Array.isArray(unitMasterListRef.current)) {
            try {
                const res = await getAllRawMaterialUnits();
                const list = res?.data?.data?.['Unit Details'] ?? res?.data?.data ?? [];
                unitMasterListRef.current = Array.isArray(list) ? list : [];
            } catch (err) {
                console.error('Failed to fetch unit master list:', err);
                unitMasterListRef.current = [];
            }
        }

        const matched = (unitMasterListRef.current || []).find((u) => {
            const sym = getShortUnit(u.symbolEnglish || u.unitSymbol || '').toLowerCase();
            const name = getShortUnit(u.nameEnglish || u.unitName || '').toLowerCase();
            return sym === target || name === target;
        });

        return matched?.id && Number(matched.id) > 0 ? Number(matched.id) : null;
    };

    // Internal helper to build shift payload and persist to backend
    const saveShiftRecipesInternal = async () => {
        const slotGroups = [];

        for (const slot of activeShiftSlots) {
            const slotKey = slot.mealStructureDetailId || slot.daySlotId;
            const slotRecipesList = slotRecipes[slotKey] || [];
            const mappedSlotRecipes = [];

            for (let idx = 0; idx < slotRecipesList.length; idx++) {
                const r = slotRecipesList[idx];

                const resolvedPortionUnitId = extractPortionUnitId(r);
                const pax = Number(r.actualPax) || Number(activeShift.plannedPax) || 0;
                const rateSource = r.rateSource || 'LAST_PURCHASE';

                // Use existing costing data; fetch it if this item doesn't have it yet
                let costingData = r.recipeCostingData;
                if (
                    (!Array.isArray(costingData?.ingredients) || costingData.ingredients.length === 0) &&
                    (!Array.isArray(costingData?.captainRecipes) || costingData.captainRecipes.length === 0)
                ) {
                    try {
                        const portionVal = Number(r.portionQuantity) || Number(r.portionSize) || 0;
                        const fromDate = r.rateFromDate || '';
                        const toDate = r.rateToDate || (fromDate ? getTodayDateString() : '');

                        const res = await getRecipeCosting(r.kitchenMenuItemId, {
                            isLpgRequired: false,
                            isOtherCostRequired: false,
                            isPerPersonConsumptionBasedCalculate: true,
                            materialCenterOrgId: Number(selectedOrgUnitId),
                            organizationId: Number(selectedOrgUnitId),
                            pricingBasis: rateSource,
                            targetPax: pax || 1,
                            ...(portionVal > 0
                                ? { perPersonPortionQuantity: portionVal, portionSize: 1 }
                                : {}),
                            ...(resolvedPortionUnitId
                                ? { perPersonPortionUnitId: resolvedPortionUnitId }
                                : {}),
                            ...(subUnitId && Number(subUnitId) > 0
                                ? {
                                    subOutletId: Number(subUnitId),
                                    materialCenterSubOutletId: Number(subUnitId),
                                }
                                : {}),
                            ...(REQUIRES_DATE_BASIS.includes(rateSource) && fromDate
                                ? {
                                    fromDate: formatForBackend(fromDate),
                                    toDate: formatForBackend(toDate),
                                }
                                : {}),
                        });
                        costingData = res?.data?.data ?? res?.data;
                    } catch (err) {
                        console.error('Failed to fetch raw materials for recipe:', err);
                    }
                }

                const costingWeightUnitId =
                    extractWeightUnitId(costingData) ||
                    (costingData?.unitId && !isNaN(Number(costingData.unitId)) && Number(costingData.unitId) > 0
                        ? Number(costingData.unitId)
                        : null);
                let resolvedItemUnitId =
                    costingWeightUnitId ||
                    extractWeightUnitId(r);

                if (!resolvedItemUnitId) {
                    const weightSym =
                        costingData?.scaledWeightUnitSymbol ||
                        costingData?.displayScaledWeightUnitSymbol ||
                        costingData?.uomSymbol ||
                        costingData?.baseRecipeUnitSymbol ||
                        r.recipeCostingData?.scaledWeightUnitSymbol ||
                        r.recipeCostingData?.displayScaledWeightUnitSymbol ||
                        r.recipeCostingData?.uomSymbol ||
                        r.scaledWeightUnitSymbol ||
                        r.uomSymbol ||
                        '';
                    if (weightSym) {
                        resolvedItemUnitId = await resolveUnitIdFromSymbol(weightSym);
                    }
                }
                if (!resolvedItemUnitId) {
                    resolvedItemUnitId = resolvedPortionUnitId || 0;
                }

                const headerPortionSize = Number(r.portionQuantity || r.portionSize) || 0;

                const mappedDestinations = (r.destinations || []).map((d) => {
                    const qtyNum = Number(d.plannedQty) || 0;
                    return {
                        destinationOutletId: Number(d.destinationOutletId) || 0,
                        destinationSubOutletId: Number(d.destinationSubOutletId) || 0,
                        id: Number(d.id) || 0,
                        plannedPax: Number(d.plannedPax) || 0,
                        plannedQty: qtyNum,
                        portionSize: headerPortionSize,
                        portionUnitId: Number(resolvedPortionUnitId) || 0,
                        remarks: d.remarks || '',
                        transferQty: qtyNum,
                        unitId: resolvedItemUnitId || 0,
                    };
                });

                const captainRecipesList = Array.isArray(costingData?.captainRecipes)
                    ? costingData.captainRecipes
                    : Array.isArray(costingData?.captainReceipes)
                        ? costingData.captainReceipes
                        : Array.isArray(r.captainRecipes)
                            ? r.captainRecipes
                            : [];

                mappedSlotRecipes.push({
                    costPerPortion: Number(r.costPerPortion) || 0,
                    destinations: mappedDestinations,
                    kitchenMenuItemId: Number(r.kitchenMenuItemId),
                    plannedPax: pax,
                    plannedQty: Number(r.totalPlannedQty || r.plannedQty) || 0,
                    portionSize: headerPortionSize || 150,
                    portionUnitId: resolvedPortionUnitId || 0,
                    rateSource,
                    rawMaterials: mapRawMaterials(costingData?.ingredients, rateSource, pax),
                    captainRecipes: mapCaptainRecipes(captainRecipesList, rateSource, pax),
                    remarks: r.remarks || '',
                    sequenceOrder: idx + 1,
                    unitId: resolvedItemUnitId || 0,
                });
            }

            if (mappedSlotRecipes.length > 0) {
                slotGroups.push({
                    daySlotId: Number(slot.daySlotId) || 0,
                    mealStructureDetailId: Number(slot.mealStructureDetailId || slotKey),
                    recipes: mappedSlotRecipes,
                });
            }
        }

        if (slotGroups.length === 0) {
            notify.error('Please add at least one recipe before saving the shift.');
            return false;
        }

        const payload = {
            mealTypeId: Number(activeShift.mealTypeId),
            menuPlanDayId: Number(activeDay.id),
            remarks: 'Shift Recipes Saved as Draft',
            slots: slotGroups,
            userId: currentUserId,
        };

        await saveShiftRecipes(payload);
        lastLoadedShiftKeyRef.current = '';
        await loadDayData(activeDay.id);
        return true;
    };

    // SAVE SHIFT RECIPES AS DRAFT (Creator Flow & Approver Edit)
    const handleSaveShiftDraft = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        if (e?.stopPropagation) e.stopPropagation();

        if (!activeDay || !activeShift) {
            notify.error('No active day or shift selected.');
            return;
        }

        // Validate destination allocations across all slots before saving
        if (!validateShiftDestinationAllocations()) {
            return;
        }

        setSavingShift(true);
        try {
            await saveShiftRecipesInternal();
            notify.success('Shift saved successfully.');
        } catch (err) {
            console.error('Failed to save shift recipes:', err);
        } finally {
            setSavingShift(false);
        }
    };

    // Open Confirmation Modal (Submit / Approve / Reject across Shift, Multi-Day, or Whole Plan)
    const openDecisionModal = (scope, action) => {
        const planLabel = planData?.planCode || `Plan #${passedPlanId}`;
        const dayLabel = activeDay?.dayOfWeekName || 'Day';
        const shiftLabel = activeShift?.mealTypeName || 'Shift';

        if (scope === 'DAYS' && selectedDayIdsForApproval.length === 0) {
            notify.error('Please select at least one submitted day checkbox on the left.');
            return;
        }

        // At Approval Time, calculate & validate destination allocations before allowing approval
        if (action === 'APPROVED') {
            if (!validateShiftDestinationAllocations()) {
                return;
            }
        }

        let title = '';
        let subtitle = '';

        if (action === 'SUBMITTED') {
            title = 'Send Menuplan for Approval';
            subtitle = planLabel;
        } else if (action === 'APPROVED') {
            if (scope === 'SHIFT') {
                title = `Approve Shift (${shiftLabel})`;
                subtitle = `${planLabel} • ${dayLabel} (${shiftLabel})`;
            } else if (scope === 'DAYS') {
                title = `Approve Selected Days (${selectedDayIdsForApproval.length})`;
                subtitle = `${planLabel} • ${selectedDayIdsForApproval.length} day(s) selected`;
            } else {
                title = 'Approve Whole Menu Plan';
                subtitle = `${planLabel} — All Days & Shifts`;
            }
        } else if (action === 'REJECTED') {
            if (scope === 'SHIFT') {
                title = `Reject Shift (${shiftLabel})`;
                subtitle = `${planLabel} • ${dayLabel} (${shiftLabel})`;
            } else if (scope === 'DAYS') {
                title = `Reject Selected Days (${selectedDayIdsForApproval.length})`;
                subtitle = `${planLabel} • ${selectedDayIdsForApproval.length} day(s) selected`;
            } else {
                title = 'Reject Whole Menu Plan';
                subtitle = `${planLabel} — All Days & Shifts`;
            }
        }

        setDecisionModal({
            isOpen: true,
            scope,
            action,
            title,
            subtitle,
            remarks: '',
            rejectionReason: '',
            submitting: false,
        });
    };

    // Execute API Call Only When OK / Confirm is Clicked
    const handleConfirmDecision = async () => {
        const { scope, action, remarks, rejectionReason } = decisionModal;
        const planIdNum = Number(planData?.id || passedPlanId);

        // Mandatory reason check when rejecting
        if (action === 'REJECTED' && !rejectionReason.trim()) {
            notify.error('Rejection reason is mandatory.');
            return;
        }

        // Validate destination allocations at confirm time as well for approval
        if (action === 'APPROVED') {
            if (!validateShiftDestinationAllocations()) {
                setDecisionModal((prev) => ({ ...prev, submitting: false }));
                return;
            }
        }

        setDecisionModal((prev) => ({ ...prev, submitting: true }));

        try {
            if (scope === 'SHIFT') {
                // If approving shift and recipes are edited, auto-save draft first
                if (action === 'APPROVED') {
                    try {
                        await saveShiftRecipesInternal();
                    } catch (saveErr) {
                        console.warn('Auto-save shift before approval encountered notice:', saveErr);
                    }
                }

                const res = await updateMenuPlanShiftStatus({
                    mealTypeId: [Number(activeShift.mealTypeId)],
                    menuPlanDayId: Number(activeDay.id),
                    menuPlanShiftId: [Number(activeShift.id ?? activeShift.menuPlanShiftId ?? 0)],
                    rejectionReason: action === 'REJECTED' ? rejectionReason.trim() : '',
                    remarks:
                        remarks.trim() || (action === 'APPROVED' ? 'Shift Approved' : 'Shift Rejected'),
                    status: action,
                    userId: currentUserId,
                });

                const updatedPlan = res?.data?.data ?? res?.data;
                if (updatedPlan && updatedPlan.id) {
                    setPlanData(updatedPlan);
                    if (Array.isArray(updatedPlan.days)) {
                        setSelectedDayIdsForApproval((prev) =>
                            prev.filter((id) =>
                                updatedPlan.days.some(
                                    (d) => Number(d.id) === id && (d.status || '').toUpperCase() === 'SUBMITTED'
                                )
                            )
                        );
                    }
                    await loadDayData(activeDay.id);
                } else {
                    await fetchPlanDetails(planIdNum, activeDay.id);
                }

                setDecisionModal((prev) => ({ ...prev, isOpen: false, submitting: false }));
            } else if (scope === 'DAYS') {
                const res = await updateMenuPlanDayStatus({
                    menuPlanDayIds: selectedDayIdsForApproval,
                    rejectionReason: action === 'REJECTED' ? rejectionReason.trim() : '',
                    remarks:
                        remarks.trim() ||
                        (action === 'APPROVED'
                            ? `${selectedDayIdsForApproval.length} Day(s) Approved`
                            : `${selectedDayIdsForApproval.length} Day(s) Rejected`),
                    status: action,
                    userId: currentUserId,
                });

                setSelectedDayIdsForApproval([]);
                const updatedPlan = res?.data?.data ?? res?.data;
                if (updatedPlan && updatedPlan.id) {
                    setPlanData(updatedPlan);
                    if (activeDay?.id) {
                        await loadDayData(activeDay.id);
                    }
                } else {
                    await fetchPlanDetails(planIdNum, activeDay?.id);
                }

                setDecisionModal((prev) => ({ ...prev, isOpen: false, submitting: false }));
            } else {
                await updateMenuPlanStatus({
                    menuPlanId: planIdNum,
                    rejectionReason: action === 'REJECTED' ? rejectionReason.trim() : '',
                    remarks:
                        remarks.trim() ||
                        (action === 'SUBMITTED'
                            ? 'Submitted Menu Plan for Approval'
                            : action === 'APPROVED'
                                ? 'Menu Plan Approved'
                                : 'Menu Plan Rejected'),
                    status: action,
                    userId: currentUserId,
                });

                setDecisionModal((prev) => ({ ...prev, isOpen: false, submitting: false }));
                if (action === 'SUBMITTED') {
                    navigate('/production/menu-planning');
                } else {
                    navigate('/production/approve-menu-plan');
                }
            }
        } catch (err) {
            console.error('Failed to update menu plan status:', err);
            setDecisionModal((prev) => ({ ...prev, submitting: false }));
        }
    };

    const planStatusLabel = (planData?.status || 'DRAFT').toUpperCase();
    const isPlanSubmitted = ['SUBMITTED', 'APPROVED'].includes(planStatusLabel);

    const activeDayStatusLabel = (activeDay?.status || 'DRAFT').toUpperCase();
    const activeShiftStatusLabel = (
        activeShift?.status ||
        activeDayStatusLabel ||
        'DRAFT'
    ).toUpperCase();
    const canActionActiveShift = ['SUBMITTED', 'DRAFT'].includes(activeShiftStatusLabel);

    return (
        <Container>
            <div className="pt-2 pb-12 space-y-4">
                {/* Page Header */}
                <PageHeader
                    title={
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span>
                                {approvalMode === 'APPROVED'
                                    ? `Approve Menu Plan${planData?.planCode ? ` (${planData.planCode})` : ''}`
                                    : approvalMode === 'REJECTED'
                                        ? `Reject Menu Plan${planData?.planCode ? ` (${planData.planCode})` : ''}`
                                        : planData?.planCode
                                            ? `Menu & Recipe Costing (${planData.planCode})`
                                            : 'Menu & Recipe Costing'}
                            </span>
                            <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeClasses(
                                    planStatusLabel
                                )}`}
                            >
                                {planStatusLabel}
                            </span>
                        </div>
                    }
                    description={
                        isApprovalFlow
                            ? 'Approve or reject shift-wise, multi-day, or the entire menu plan.'
                            : 'Calculate recipe costs and allocate kitchen menu items across scheduled shift slots.'
                    }
                    actions={
                        <button
                            type="button"
                            onClick={() => {
                                if (passedPlanId) {
                                    navigate('/production/menu-planning/create', {
                                        state: {
                                            planId: passedPlanId,
                                            approvalMode,
                                            fromApproval: isApprovalFlow,
                                        },
                                    });
                                } else {
                                    navigate(-1);
                                }
                            }}
                            className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                    }
                />

                {loadingPlan ? (
                    <div className="flex items-center justify-center gap-2 py-20 bg-white border border-[#E7EAF0] rounded-2xl text-slate-500 text-sm">
                        <Loader2 size={18} className="animate-spin text-[#084E92]" />
                        Loading plan schedule and shifts…
                    </div>
                ) : (
                    <>
                        {/* Filter / Parameters Bar */}
                        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs">
                            <div
                                className={`grid grid-cols-1 sm:grid-cols-2 ${isMultiWeek ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
                                    } gap-3.5 items-end`}
                            >
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                        Unit
                                    </label>
                                    <SearchableSelect
                                        name="unit"
                                        value={selectedOrgUnitId}
                                        onChange={(e) => setSelectedOrgUnitId(e.target.value)}
                                        options={units.map((u) => ({
                                            value: String(u.id),
                                            label: u.name || u.companyName,
                                        }))}
                                        placeholder="Select Unit"
                                        disabled={true}
                                        isClearable={false}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                        Sub-Unit
                                    </label>
                                    <SearchableSelect
                                        name="subUnit"
                                        value={subUnitId}
                                        onChange={(e) => setSubUnitId(e.target.value)}
                                        options={filteredSubUnits.map((su) => ({
                                            value: String(su.id),
                                            label: su.name || su.subOutletName,
                                        }))}
                                        placeholder="Select Sub-Unit"
                                        disabled={true}
                                        isClearable={false}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                        Shift / Meal Type
                                    </label>
                                    <Select
                                        value={selectedMealTypeId}
                                        onValueChange={setSelectedMealTypeId}
                                        disabled={activeDayShifts.length === 0}
                                    >
                                        <SelectTrigger className="h-10 w-full rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium">
                                            <SelectValue placeholder="Select Shift" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activeDayShifts.map((s) => {
                                                const sStatus = (s.status || '').toUpperCase();
                                                return (
                                                    <SelectItem key={s.mealTypeId} value={String(s.mealTypeId)} className="text-xs">
                                                        <span>
                                                            {s.mealTypeName}
                                                            {sStatus && sStatus !== 'DRAFT' ? ` (${sStatus})` : ''}
                                                        </span>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                        Meal Structure
                                    </label>
                                    <div className="h-10 w-full px-3 bg-slate-50 border border-[#C3C6D1] rounded-xl flex items-center text-xs font-semibold text-slate-700 truncate">
                                        {activeShift?.mealStructureName || 'No structure mapped'}
                                    </div>
                                </div>

                                {isMultiWeek && (
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                            Menu Cycle
                                        </label>
                                        <Select
                                            value={String(selectedWeek)}
                                            onValueChange={(val) => {
                                                const wNum = Number(val);
                                                setSelectedWeek(wNum);
                                                const newWeekFirstDay = allDaysList[(wNum - 1) * 7];
                                                if (newWeekFirstDay) {
                                                    handleSelectDay(newWeekFirstDay.id);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="h-10 w-full rounded-xl border border-[#C3C6D1] bg-white text-xs font-semibold text-[#084E92]">
                                                <div className="flex items-center gap-1.5">
                                                    <RotateCw size={13} className="text-[#084E92]" />
                                                    <SelectValue placeholder="Select Cycle" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: totalWeeksCount }, (_, i) => i + 1).map((w) => (
                                                    <SelectItem key={w} value={String(w)} className="text-xs font-medium">
                                                        Week {w}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main Body — Equal Height Columns */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-max">
                            {/* Left Days Sidebar (with Day Statuses & Checkboxes only for SUBMITTED days in Approval Mode) */}
                            <div className="lg:col-span-3 flex flex-col lg:h-[67vh] max-h-[75vh]">
                                {isApprovalFlow && submittedDayIds.length > 0 && (
                                    <div className="flex items-center justify-between px-2 pb-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleToggleSelectAllDays}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#084E92] hover:underline cursor-pointer bg-transparent border-0 p-0"
                                        >
                                            {selectedDayIdsForApproval.length === submittedDayIds.length ? (
                                                <CheckSquare size={14} />
                                            ) : (
                                                <Square size={14} />
                                            )}
                                            <span>
                                                {selectedDayIdsForApproval.length === submittedDayIds.length
                                                    ? 'Deselect All'
                                                    : 'Select All Submitted'}
                                            </span>
                                        </button>
                                        {selectedDayIdsForApproval.length > 0 && (
                                            <span className="text-[11px] font-bold text-[#084E92] bg-blue-50 px-2 py-0.5 rounded-full">
                                                {selectedDayIdsForApproval.length} selected
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                                    {visibleDays.map((day) => {
                                        const isSelected = day.id === selectedDayId;
                                        const dayStatus = (day.status || '').toUpperCase();
                                        const isDaySubmitted = dayStatus === 'SUBMITTED';
                                        const isChecked = selectedDayIdsForApproval.includes(Number(day.id));
                                        const dateObj = new Date(day.planDate);
                                        const formattedDisplay = !isNaN(dateObj.getTime())
                                            ? dateObj.toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })
                                            : day.planDate;

                                        return (
                                            <div
                                                key={day.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => handleSelectDay(day.id)}
                                                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer shadow-xs ${isSelected
                                                    ? 'bg-[#084E92] text-white border-[#084E92]'
                                                    : 'bg-white text-slate-700 border-[#E7EAF0] hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {isApprovalFlow && isDaySubmitted && (
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => toggleDayCheckbox(e, day.id)}
                                                            className="w-3.5 h-3.5 rounded border-slate-300 accent-[#084E92] cursor-pointer shrink-0"
                                                            title="Select submitted day for batch approval/rejection"
                                                        />
                                                    )}

                                                    <div
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                                            }`}
                                                    >
                                                        <CalendarIcon size={16} />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <span className="font-bold text-xs block leading-tight truncate">
                                                            {day.dayOfWeekName || day.dayOfWeek}
                                                        </span>
                                                        <span
                                                            className={`text-[11px] font-medium block truncate ${isSelected ? 'text-white/80' : 'text-slate-400'
                                                                }`}
                                                        >
                                                            {formattedDisplay}
                                                        </span>
                                                    </div>
                                                </div>

                                                {dayStatus && (
                                                    <span
                                                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusBadgeClasses(
                                                            dayStatus,
                                                            isSelected
                                                        )}`}
                                                    >
                                                        {dayStatus}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right Table Container — Equal Height, Sticky Header, Pinned Bottom Footer, No Horizontal Scroll */}
                            <div className="lg:col-span-9 bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs flex flex-col lg:h-[67vh] min-h-62.5 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
                                            <UtensilsCrossed size={16} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-sm font-bold text-slate-900">
                                                    {activeDay?.dayOfWeekName || 'Day'} – {activeShift?.mealTypeName || 'Shift'} Recipes
                                                </h3>
                                                {activeShiftStatusLabel && (
                                                    <span
                                                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClasses(
                                                            activeShiftStatusLabel
                                                        )}`}
                                                    >
                                                        {activeShiftStatusLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                Structure:{' '}
                                                <strong className="text-slate-700">
                                                    {activeShift?.mealStructureName || '—'}
                                                </strong>
                                                {' | '}
                                                Planned PAX:{' '}
                                                <strong className="text-[#084E92]">{activeShift?.plannedPax || 0}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={() => { }}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                        >
                                            <Sparkles size={14} className="text-[#084E92]" />
                                            AI Recipe
                                        </button>
                                    </div>
                                </div>

                                {/* Day / Shift Rejection Reason Banner if Rejected */}
                                {(activeShiftStatusLabel === 'REJECTED' || activeDayStatusLabel === 'REJECTED') &&
                                    (activeShift?.rejectionReason || activeDay?.rejectionReason) && (
                                        <div className="mb-3 shrink-0 flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                                            <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                                            <div>
                                                <span className="font-bold">Rejection Reason: </span>
                                                <span>{activeShift?.rejectionReason || activeDay?.rejectionReason}</span>
                                            </div>
                                        </div>
                                    )}

                                {/* Vertical-Only Scrollable Recipe Table (No Horizontal Scroll Needed) */}
                                <div className="flex-1 min-h-0 border border-slate-100 rounded-xl overflow-y-auto overflow-x-hidden w-full">
                                    {loadingDaySchedule ? (
                                        <div className="flex items-center justify-center gap-2 h-full py-12 text-slate-400 text-xs">
                                            <Loader2 size={16} className="animate-spin text-[#084E92]" />
                                            Loading day schedule…
                                        </div>
                                    ) : (
                                        <table className="w-full text-xs table-fixed">
                                            <thead className="sticky top-0 z-10">
                                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] leading-tight">
                                                    <th className="py-2.5 px-2.5 text-left w-[10%]">Category</th>
                                                    <th className="py-2.5 px-2.5 text-left w-[19%]">Kitchen Menu Item</th>
                                                    <th className="py-2.5 px-2 text-left w-[9%]">Actual<span className="block">Pax</span></th>
                                                    <th className="py-2.5 px-2 text-left w-[12%]">
                                                        Total Planned
                                                        <span className="block">Qty</span>
                                                    </th>

                                                    <th className="py-2.5 px-2 text-left w-[10%]">
                                                        Allocated
                                                        <span className="block">Qty</span>
                                                    </th>
                                                    <th className="py-2.5 px-2 text-left w-[10%]">Portion</th>
                                                    <th className="py-2.5 px-2 text-left w-[9%]">
                                                        Cost /
                                                        <span className="block">Portion (₹)</span>
                                                    </th>
                                                    <th className="py-2.5 px-2 text-left w-[14%]">Rate Source</th>
                                                    <th className="py-2.5 px-2.5 w-[7%]">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activeShiftSlots.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                                                            No slots configured for this shift.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    activeShiftSlots.map((slot) => {
                                                        const slotKey = slot.mealStructureDetailId || slot.daySlotId;
                                                        const recipes = slotRecipes[slotKey] || EMPTY_ARRAY;
                                                        const categoryLabel =
                                                            slot.kitchenMenuCategoryName || slot.mealSlotName || 'Category';

                                                        if (recipes.length === 0) {
                                                            return (
                                                                <tr
                                                                    key={`empty-slot-${slotKey}`}
                                                                    className="hover:bg-slate-50/50 bg-slate-50/20"
                                                                >
                                                                    <td className="py-3 px-2.5">
                                                                        <span className="inline-block max-w-full truncate px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-[#084E92] border-blue-200">
                                                                            {categoryLabel}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 px-2.5 text-slate-400 italic">Not Added</td>
                                                                    <td className="py-3 px-2 text-slate-400">-</td>
                                                                    <td className="py-3 px-2 text-slate-400">-</td>
                                                                    <td className="py-3 px-2 text-slate-400">-</td>
                                                                    <td className="py-3 px-2 text-slate-400">-</td>
                                                                    <td className="py-3 px-2 text-slate-400">-</td>
                                                                    <td className="py-3 px-2 text-slate-400">-</td>
                                                                    <td className="py-3 px-2.5 text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenAddForSlot(slotKey)}
                                                                            className="p-1.5 text-[#084E92] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                                                            title={`Add recipe for ${categoryLabel}`}
                                                                        >
                                                                            <Plus size={15} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }

                                                        return recipes.map((item) => {
                                                            const isDateSource = REQUIRES_DATE_BASIS.includes(item.rateSource);
                                                            const isExpanded = Boolean(expandedItems[item.rowKey]);
                                                            const itemDestinations = Array.isArray(item.destinations)
                                                                ? item.destinations
                                                                : EMPTY_ARRAY;
                                                            const hasDestinations = itemDestinations.length > 0;
                                                            const allocatedQtySum = itemDestinations.reduce(
                                                                (sum, d) => sum + (Number(d.plannedQty) || 0),
                                                                0
                                                            );

                                                            const itemTotalPax =
                                                                Number(item.actualPax) ||
                                                                Number(item.plannedPax) ||
                                                                Number(activeShift?.plannedPax) ||
                                                                Number(activeShift?.expectedPax) ||
                                                                0;
                                                            const allocatedPaxSum = itemDestinations.reduce(
                                                                (sum, d) => sum + (Number(d.plannedPax) || 0),
                                                                0
                                                            );
                                                            const remainingPax = Math.max(0, itemTotalPax - allocatedPaxSum);

                                                            const itemTotalQty =
                                                                Number(item.totalPlannedQty) || Number(item.plannedQty) || 0;
                                                            const remainingQty = Math.max(
                                                                0,
                                                                Number((itemTotalQty - allocatedQtySum).toFixed(3))
                                                            );

                                                            const itemQtyUnit = extractWeightUnitSymbol(item);

                                                            return (
                                                                <React.Fragment key={item.rowKey}>
                                                                    <tr className="hover:bg-slate-50/50">
                                                                        <td className="py-3 px-2.5">
                                                                            <span
                                                                                title={item.categoryName || categoryLabel}
                                                                                className="inline-block max-w-full truncate px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-[#084E92] border-blue-200"
                                                                            >
                                                                                {item.categoryName || categoryLabel}
                                                                            </span>
                                                                        </td>

                                                                        <td className="py-3 px-2.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleToggleItemExpand(slotKey, item)}
                                                                                className="group flex items-center gap-2 text-left w-full bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
                                                                                title="Click to toggle Destination Allocation"
                                                                            >
                                                                                <MenuItemThumbnail
                                                                                    src={item.imageUrl}
                                                                                    alt={item.itemName}
                                                                                />
                                                                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                                                                    <span className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 group-hover:text-[#084E92] transition-colors">
                                                                                        {item.itemName}
                                                                                    </span>
                                                                                    <span className="text-slate-400 group-hover:text-[#084E92] transition-colors shrink-0">
                                                                                        {isExpanded ? (
                                                                                            <ChevronUp size={13} />
                                                                                        ) : (
                                                                                            <ChevronDown size={13} />
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            </button>
                                                                        </td>

                                                                        <td className="py-3 px-2">
                                                                            <input
                                                                                type="text"
                                                                                inputMode="decimal"
                                                                                value={item.actualPax ?? ''}
                                                                                onChange={(e) =>
                                                                                    handleActualPaxChange(slotKey, item.rowKey, e.target.value, item)
                                                                                }
                                                                                placeholder="0"
                                                                                className="w-14 h-7 px-1.5 text-xs font-semibold text-slate-800 text-center bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#084E92]"
                                                                            />
                                                                        </td>

                                                                        {/* Total Planned Quantity (Editable) */}
                                                                        <td className="py-3 px-2">
                                                                            <div className="flex items-center gap-1">
                                                                                <input
                                                                                    type="text"
                                                                                    inputMode="decimal"
                                                                                    value={item.totalPlannedQty ?? ''}
                                                                                    onChange={(e) =>
                                                                                        handleTotalPlannedQtyChange(
                                                                                            slotKey,
                                                                                            item.rowKey,
                                                                                            e.target.value,
                                                                                            item
                                                                                        )
                                                                                    }
                                                                                    placeholder="0"
                                                                                    className="w-12 h-7 px-1.5 text-xs font-semibold text-slate-800 text-center bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#084E92]"
                                                                                />
                                                                                <span className="text-[11px] font-medium text-slate-600 shrink-0">
                                                                                    {itemQtyUnit}
                                                                                </span>
                                                                            </div>
                                                                        </td>



                                                                        {/* Allocated Quantity (Sum of selected destinations' plannedQty) */}
                                                                        <td className="py-3 px-2">
                                                                            <span className="text-xs font-bold text-slate-800">
                                                                                {Number.isInteger(allocatedQtySum)
                                                                                    ? allocatedQtySum
                                                                                    : allocatedQtySum.toFixed(2)}{' '}
                                                                                {itemQtyUnit}
                                                                            </span>
                                                                        </td>

                                                                        <td className="py-3 px-2">
                                                                            <div className="flex items-center gap-1">
                                                                                <input
                                                                                    type="text"
                                                                                    inputMode="decimal"
                                                                                    value={item.portionQuantity ?? ''}
                                                                                    onChange={(e) =>
                                                                                        handlePortionQuantityChange(
                                                                                            slotKey,
                                                                                            item.rowKey,
                                                                                            e.target.value,
                                                                                            item
                                                                                        )
                                                                                    }
                                                                                    placeholder="0"
                                                                                    className="w-12 h-7 px-1.5 text-xs font-semibold text-slate-800 text-center bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#084E92]"
                                                                                />
                                                                                <span className="text-[11px] font-medium text-slate-600 shrink-0">
                                                                                    {getShortUnit(
                                                                                        item.perPersonConsumptionUnitSymbol ||
                                                                                        item.portionUnitSymbol ||
                                                                                        item.portionUnitName ||
                                                                                        'g'
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        </td>

                                                                        <td className="py-3 px-2">
                                                                            <span className="inline-block px-2 py-1 text-[11px] font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg">
                                                                                ₹{Number(item.costPerPortion || 0).toFixed(2)}
                                                                            </span>
                                                                        </td>

                                                                        <td className="py-3 px-2">
                                                                            <div className="flex flex-col gap-1 w-full">
                                                                                <Select
                                                                                    value={item.rateSource || 'LAST_PURCHASE'}
                                                                                    onValueChange={(val) =>
                                                                                        handleRateSourceChange(slotKey, item.rowKey, val, item)
                                                                                    }
                                                                                >
                                                                                    <SelectTrigger className="h-7 w-full px-2 text-[11px] rounded-lg border-slate-200 bg-white">
                                                                                        <SelectValue placeholder="Source" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {PRICING_BASIS_OPTIONS.map((opt) => (
                                                                                            <SelectItem
                                                                                                key={opt.value}
                                                                                                value={opt.value}
                                                                                                className="text-xs"
                                                                                            >
                                                                                                {opt.label}
                                                                                            </SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>

                                                                                {isDateSource && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleOpenRateDateModal(slotKey, item)}
                                                                                        className={`inline-flex items-center justify-between gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition text-left w-full cursor-pointer ${item.rateFromDate
                                                                                            ? 'bg-blue-50 text-[#084E92] border-blue-200'
                                                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                                            }`}
                                                                                    >
                                                                                        <div className="flex items-center gap-1 truncate min-w-0">
                                                                                            <CalendarIcon size={10} className="shrink-0" />
                                                                                            <span className="truncate">
                                                                                                {item.rateFromDate
                                                                                                    ? `${formatDateDisplay(
                                                                                                        item.rateFromDate
                                                                                                    )} - ${formatDateDisplay(item.rateToDate) || 'Today'
                                                                                                    }`
                                                                                                    : 'Set Dates *'}
                                                                                            </span>
                                                                                        </div>
                                                                                        <Pencil size={9} className="shrink-0 opacity-70" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </td>

                                                                        <td className="py-3 px-2.5">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleOpenEditForSlot(slotKey, item)}
                                                                                    className="text-gray-500 hover:text-blue-800 cursor-pointer"
                                                                                    title="Edit Recipe in Slot"
                                                                                >
                                                                                    <Pencil size={14} />
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setSelectedSnapshotItem(item)}
                                                                                    className="text-gray-500 hover:text-blue-800 cursor-pointer"
                                                                                    title="View Recipe Snapshot"
                                                                                >
                                                                                    <Eye size={14} />
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveItem(slotKey, item.rowKey)}
                                                                                    className="text-red-300 hover:text-red-700 cursor-pointer"
                                                                                    title="Delete Item"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>

                                                                    {/* Collapsible Destination Allocation Section */}
                                                                    {isExpanded && (
                                                                        <tr className="bg-slate-50/40">
                                                                            <td colSpan={9} className="px-3 py-2.5">
                                                                                <div className="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-2xs">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleToggleItemExpand(slotKey, item)}
                                                                                        className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-50/70 border-b border-slate-100 text-left cursor-pointer"
                                                                                    >
                                                                                        <div className="flex items-center gap-3 flex-wrap">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="w-2 h-2 rounded-full bg-[#084E92]" />
                                                                                                <span className="text-xs font-bold text-slate-800">
                                                                                                    Destination Allocation
                                                                                                </span>
                                                                                            </div>

                                                                                            {hasDestinations && (
                                                                                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium flex-wrap">
                                                                                                    <span
                                                                                                        className={`px-2 py-0.5 rounded-md bg-white border ${
                                                                                                            allocatedPaxSum > itemTotalPax && itemTotalPax > 0
                                                                                                                ? 'border-rose-300 text-rose-600 bg-rose-50'
                                                                                                                : 'border-slate-200'
                                                                                                        }`}
                                                                                                    >
                                                                                                        PAX:{' '}
                                                                                                        <strong
                                                                                                            className={
                                                                                                                allocatedPaxSum > itemTotalPax && itemTotalPax > 0
                                                                                                                    ? 'text-rose-700 font-bold'
                                                                                                                    : 'text-slate-800'
                                                                                                            }
                                                                                                        >
                                                                                                            {allocatedPaxSum}
                                                                                                        </strong>{' '}
                                                                                                        / {itemTotalPax || 0}
                                                                                                        <span
                                                                                                            className={`ml-1 font-semibold ${
                                                                                                                allocatedPaxSum > itemTotalPax && itemTotalPax > 0
                                                                                                                    ? 'text-rose-600 font-bold'
                                                                                                                    : 'text-[#084E92]'
                                                                                                            }`}
                                                                                                        >
                                                                                                            (Rem: {remainingPax})
                                                                                                        </span>
                                                                                                    </span>
                                                                                                    <span
                                                                                                        className={`px-2 py-0.5 rounded-md bg-white border ${
                                                                                                            allocatedQtySum > itemTotalQty && itemTotalQty > 0
                                                                                                                ? 'border-rose-300 text-rose-600 bg-rose-50'
                                                                                                                : 'border-slate-200'
                                                                                                        }`}
                                                                                                    >
                                                                                                        Qty:{' '}
                                                                                                        <strong
                                                                                                            className={
                                                                                                                allocatedQtySum > itemTotalQty && itemTotalQty > 0
                                                                                                                    ? 'text-rose-700 font-bold'
                                                                                                                    : 'text-slate-800'
                                                                                                            }
                                                                                                        >
                                                                                                            {Number.isInteger(allocatedQtySum)
                                                                                                                ? allocatedQtySum
                                                                                                                : allocatedQtySum.toFixed(2)}
                                                                                                        </strong>{' '}
                                                                                                        / {itemTotalQty || 0} {itemQtyUnit}
                                                                                                        <span
                                                                                                            className={`ml-1 font-semibold ${
                                                                                                                allocatedQtySum > itemTotalQty && itemTotalQty > 0
                                                                                                                    ? 'text-rose-600 font-bold'
                                                                                                                    : 'text-[#084E92]'
                                                                                                            }`}
                                                                                                        >
                                                                                                            (Rem: {remainingQty} {itemQtyUnit})
                                                                                                        </span>
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        <ChevronUp size={14} className="text-slate-500" />
                                                                                    </button>

                                                                                    {!hasDestinations ? (
                                                                                        <div className="p-4 text-center text-xs text-slate-400">
                                                                                            No destination allocations for this item.
                                                                                        </div>
                                                                                    ) : (
                                                                                        <table className="w-full text-xs table-fixed">
                                                                                            <thead>
                                                                                                <tr className="bg-slate-50/40 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                                                                                                    <th className="py-2 px-3 text-left w-[30%]">
                                                                                                        DESTINATION OUTLET
                                                                                                    </th>
                                                                                                    <th className="py-2 px-3 text-left w-[22%]">
                                                                                                        SUB-LOCATION
                                                                                                    </th>
                                                                                                    <th className="py-2 px-3 text-left w-[18%]">
                                                                                                        PLANNED PAX
                                                                                                    </th>
                                                                                                    <th className="py-2 px-3 text-left w-[22%]">
                                                                                                        PLANNED QUANTITY
                                                                                                    </th>
                                                                                                    <th className="py-2 px-3 text-center w-[8%]">
                                                                                                        ACTION
                                                                                                    </th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="divide-y divide-slate-100">
                                                                                                {itemDestinations.map((dest) => (
                                                                                                    <tr
                                                                                                        key={dest.destKey}
                                                                                                        className="transition-colors hover:bg-slate-50/50 bg-white"
                                                                                                    >
                                                                                                        <td className="py-2 px-3 font-bold text-slate-900 truncate">
                                                                                                            {dest.unitName}
                                                                                                        </td>

                                                                                                        <td className="py-2 px-3 text-slate-500 truncate">
                                                                                                            {dest.subUnitName || '—'}
                                                                                                        </td>

                                                                                                        <td className="py-2 px-3">
                                                                                                            <input
                                                                                                                type="text"
                                                                                                                inputMode="numeric"
                                                                                                                value={dest.plannedPax}
                                                                                                                onChange={(e) =>
                                                                                                                    handleDestinationInputChange(
                                                                                                                        slotKey,
                                                                                                                        item.rowKey,
                                                                                                                        item,
                                                                                                                        dest,
                                                                                                                        'plannedPax',
                                                                                                                        e.target.value
                                                                                                                    )
                                                                                                                }
                                                                                                                placeholder="0"
                                                                                                                className="w-20 h-7 px-2 text-xs font-semibold text-slate-800 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 focus:outline-none focus:border-[#084E92]"
                                                                                                            />
                                                                                                        </td>

                                                                                                        <td className="py-2 px-3">
                                                                                                            <div className="flex items-center gap-1.5">
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    inputMode="decimal"
                                                                                                                    value={dest.plannedQty}
                                                                                                                    onChange={(e) =>
                                                                                                                        handleDestinationInputChange(
                                                                                                                            slotKey,
                                                                                                                            item.rowKey,
                                                                                                                            item,
                                                                                                                            dest,
                                                                                                                            'plannedQty',
                                                                                                                            e.target.value
                                                                                                                        )
                                                                                                                    }
                                                                                                                    placeholder="0"
                                                                                                                    className="w-16 h-7 px-2 text-xs font-bold text-slate-900 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 focus:outline-none focus:border-[#084E92]"
                                                                                                                />
                                                                                                                <span className="text-xs font-medium text-slate-600">
                                                                                                                    {itemQtyUnit}
                                                                                                                </span>
                                                                                                                {dest.loadingCost && (
                                                                                                                    <Loader2
                                                                                                                        size={12}
                                                                                                                        className="animate-spin text-[#084E92]"
                                                                                                                    />
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </td>

                                                                                                        <td className="py-2 px-3 text-center">
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() =>
                                                                                                                    handleRemoveDestination(
                                                                                                                        slotKey,
                                                                                                                        item.rowKey,
                                                                                                                        dest.destKey
                                                                                                                    )
                                                                                                                }
                                                                                                                className="text-red-300 hover:text-red-700 cursor-pointer p-1 rounded-md transition hover:bg-rose-50"
                                                                                                                title="Delete Destination"
                                                                                                            >
                                                                                                                <Trash2 size={13} />
                                                                                                            </button>
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        });
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Shift Card Footer — Pinned to Bottom */}
                                <div className="mt-auto shrink-0 flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                                    <button
                                        type="button"
                                        disabled={savingShift || loadingDaySchedule}
                                        onClick={handleSaveShiftDraft}
                                        className="px-5 py-2 text-xs font-semibold cursor-pointer rounded-xl border border-[#C3C6D1] bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 justify-center shadow-2xs"
                                    >
                                        {savingShift ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin text-[#084E92]" />
                                                Saving Shift...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw size={14} className="text-[#084E92]" />
                                                Save Shift (Draft)
                                            </>
                                        )}
                                    </button>

                                    {isApprovalFlow && (
                                        canActionActiveShift ? (
                                            approvalMode === 'REJECTED' ? (
                                                <button
                                                    type="button"
                                                    disabled={!activeShift || loadingDaySchedule}
                                                    onClick={() => openDecisionModal('SHIFT', 'REJECTED')}
                                                    className="px-5 py-2 text-xs font-semibold cursor-pointer rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 transition disabled:opacity-60 flex items-center gap-1.5"
                                                >
                                                    <XCircle size={14} />
                                                    Reject {activeShift?.mealTypeName || 'Shift'}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={!activeShift || loadingDaySchedule}
                                                    onClick={() => openDecisionModal('SHIFT', 'APPROVED')}
                                                    className="px-5 py-2 text-xs font-semibold cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-60 flex items-center gap-1.5"
                                                >
                                                    <CheckCircle2 size={14} />
                                                    Approve {activeShift?.mealTypeName || ''} Shift
                                                </button>
                                            )
                                        ) : (
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${getStatusBadgeClasses(
                                                    activeShiftStatusLabel
                                                )}`}
                                            >
                                                {activeShiftStatusLabel === 'APPROVED' ? (
                                                    <CheckCircle2 size={14} />
                                                ) : activeShiftStatusLabel === 'REJECTED' ? (
                                                    <XCircle size={14} />
                                                ) : null}
                                                {activeShift?.mealTypeName || 'Shift'} is {activeShiftStatusLabel}
                                            </span>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Summary Bar */}
                        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                            <div className="flex flex-wrap items-center gap-6">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                        Costing Summary
                                    </span>
                                    <div className="flex items-baseline gap-1.5 mt-0.5">
                                        <span className="text-xs text-slate-600 font-medium">Food Cost / Meal:</span>
                                        <span className="text-xl font-black text-slate-900">
                                            ₹{totalMealCost.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                                    <CheckCircle size={14} className="text-emerald-600" />
                                    All menu items have valid rates.
                                </div>
                            </div>

                            {/* Action Buttons on Bottom Right */}
                            <div className="flex flex-wrap items-center gap-2.5 justify-end">
                                {isApprovalFlow ? (
                                    approvalMode === 'REJECTED' ? (
                                        <>
                                            {selectedDayIdsForApproval.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => openDecisionModal('DAYS', 'REJECTED')}
                                                    className="px-4 py-2.5 text-xs font-semibold cursor-pointer rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 transition flex items-center gap-1.5"
                                                >
                                                    <XCircle size={14} />
                                                    Reject Selected Days ({selectedDayIdsForApproval.length})
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => openDecisionModal('PLAN', 'REJECTED')}
                                                className="px-6 py-2.5 text-xs font-semibold cursor-pointer rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition flex items-center gap-1.5 shadow-xs"
                                            >
                                                <XCircle size={14} />
                                                Reject Menuplan
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {selectedDayIdsForApproval.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => openDecisionModal('DAYS', 'APPROVED')}
                                                    className="px-4 py-2.5 text-xs font-semibold cursor-pointer rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition flex items-center gap-1.5"
                                                >
                                                    <CheckCircle2 size={14} />
                                                    Approve Selected Days ({selectedDayIdsForApproval.length})
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => openDecisionModal('PLAN', 'APPROVED')}
                                                className="px-6 py-2.5 text-xs font-semibold cursor-pointer rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
                                            >
                                                <CheckCircle2 size={14} />
                                                Approve Menuplan
                                            </button>
                                        </>
                                    )
                                ) : (
                                    <button
                                        type="button"
                                        disabled={isPlanSubmitted}
                                        onClick={() => openDecisionModal('PLAN', 'SUBMITTED')}
                                        className="px-6 py-2.5 text-xs font-semibold cursor-pointer rounded-xl bg-[#084E92] text-white hover:bg-[#063c70] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 justify-center shadow-xs"
                                    >
                                        <Send size={14} />
                                        {isPlanSubmitted ? 'Sent for Approval' : 'Send Menuplan for Approval'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Decision / Send for Approval Confirmation Modal */}
                {decisionModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${decisionModal.action === 'REJECTED'
                                            ? 'bg-rose-50 text-rose-600'
                                            : decisionModal.action === 'APPROVED'
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'bg-blue-50 text-[#084E92]'
                                            }`}
                                    >
                                        {decisionModal.action === 'REJECTED' ? (
                                            <XCircle size={16} />
                                        ) : decisionModal.action === 'APPROVED' ? (
                                            <CheckCircle2 size={16} />
                                        ) : (
                                            <Send size={16} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">{decisionModal.title}</h3>
                                        <p className="text-[11px] text-slate-400">{decisionModal.subtitle}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={decisionModal.submitting}
                                    onClick={() =>
                                        setDecisionModal((prev) => ({ ...prev, isOpen: false, submitting: false }))
                                    }
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-5 space-y-3.5">
                                {decisionModal.action === 'REJECTED' ? (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                                            Rejection Reason <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={decisionModal.rejectionReason}
                                            onChange={(e) =>
                                                setDecisionModal((prev) => ({
                                                    ...prev,
                                                    rejectionReason: e.target.value,
                                                }))
                                            }
                                            placeholder="Enter mandatory reason for rejection..."
                                            className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-rose-500 resize-none"
                                            autoFocus
                                        />
                                    </div>
                                ) : decisionModal.action === 'SUBMITTED' ? (
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Whole plan{' '}
                                        <strong className="text-slate-900">
                                            {planData?.planCode || `#${passedPlanId}`}
                                        </strong>{' '}
                                        will be sent for approval. Once submitted, you will not be able to edit recipes
                                        unless it is rejected. Do you want to continue?
                                    </p>
                                ) : (
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Are you sure you want to approve{' '}
                                        <strong className="text-slate-900">{decisionModal.subtitle}</strong>?
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
                                <button
                                    type="button"
                                    disabled={decisionModal.submitting}
                                    onClick={() =>
                                        setDecisionModal((prev) => ({ ...prev, isOpen: false, submitting: false }))
                                    }
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={decisionModal.submitting}
                                    onClick={handleConfirmDecision}
                                    className={`px-5 py-2 text-xs font-semibold text-white rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60 ${decisionModal.action === 'REJECTED'
                                        ? 'bg-rose-600 hover:bg-rose-700'
                                        : decisionModal.action === 'APPROVED'
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : 'bg-[#084E92] hover:bg-[#063c70]'
                                        }`}
                                >
                                    {decisionModal.submitting ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : decisionModal.action === 'REJECTED' ? (
                                        <>
                                            <XCircle size={13} />
                                            Confirm Reject
                                        </>
                                    ) : decisionModal.action === 'APPROVED' ? (
                                        <>
                                            <CheckCircle2 size={13} />
                                            Confirm Approve
                                        </>
                                    ) : (
                                        <>
                                            <Send size={13} />
                                            OK
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rate Date Range Centered Modal */}
                {rateDateModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                                        <CalendarIcon size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Rate Calculation Range</h3>
                                        <p className="text-[11px] text-slate-400 truncate max-w-55">
                                            {rateDateModal.item?.itemName || 'Item'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCancelRateDates}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-5 space-y-3.5">
                                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-[#084E92]">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                    <span>
                                        Selected basis:{' '}
                                        <strong>
                                            {PRICING_BASIS_OPTIONS.find((o) => o.value === rateDateModal.newSource)?.label}
                                        </strong>
                                        . Provide dates to fetch rates.
                                    </span>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                                        From Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={rateDateModal.fromDate}
                                        onChange={(e) =>
                                            setRateDateModal((prev) => ({ ...prev, fromDate: e.target.value }))
                                        }
                                        className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#084E92]"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-semibold text-slate-700">To Date</label>
                                        <span className="text-[10px] text-slate-400">Defaults to today</span>
                                    </div>
                                    <input
                                        type="date"
                                        value={rateDateModal.toDate}
                                        onChange={(e) =>
                                            setRateDateModal((prev) => ({ ...prev, toDate: e.target.value }))
                                        }
                                        className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#084E92]"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleCancelRateDates}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmRateDates}
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063d73] rounded-xl transition shadow-xs cursor-pointer"
                                >
                                    Apply & Recalculate
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <AddKitchenItemModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSaveSlotRecipes={handleSaveSlotRecipes}
                    slots={activeShiftSlots}
                    unitId={selectedOrgUnitId}
                    subUnitId={subUnitId}
                    activeShift={activeShift}
                    activeDay={activeDay}
                    preselectedSlotDetailId={modalPreselectedSlotId}
                    initialSelectedMenuItemIds={modalInitialItemIds}
                />

                <RightDrawerRecipeSnapshot
                    isOpen={Boolean(selectedSnapshotItem)}
                    onClose={() => setSelectedSnapshotItem(null)}
                    item={activeSnapshotItem}
                    unitId={selectedOrgUnitId}
                    subUnitId={subUnitId}
                    unitName={currentUnitName}
                    subUnitName={currentSubUnitName}
                    targetPax={
                        Number(activeSnapshotItem?.actualPax) ||
                        Number(activeSnapshotItem?.plannedPax) ||
                        Number(activeShift?.plannedPax) ||
                        Number(activeShift?.expectedPax) ||
                        1
                    }
                    onCostingCalculated={handleCostingCalculatedFromSidebar}
                />
            </div>
        </Container>
    );
};

export default MenuRecipeCosting;