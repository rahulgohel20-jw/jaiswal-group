import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  Calendar,
  UtensilsCrossed,
  ArrowLeft,
  Building2,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Tag,
  Loader2,
  RotateCw,
  AlertCircle,
  Truck,
  Network,
  ChefHat,
  Scale,
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
import { useOrgScope } from '@/hooks/useOrgScope';
import { getMenuPlanById, getMenuPlanDayById } from '@/services/apiServices';
import { notify } from '@/utils/toast';

const STATUS_BADGE = {
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUBMITTED: 'bg-blue-50 text-[#084E92] border-blue-200',
  PARTIALLY_APPROVED: 'bg-amber-50 text-amber-700 border-amber-200',
  'PENDING APPROVAL': 'bg-amber-50 text-amber-700 border-amber-200',
  'Pending Approval': 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
};

const DAY_STATUS_CONFIG = {
  APPROVED: {
    label: 'Approved',
    light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    selected: 'bg-emerald-400/30 text-white border-emerald-300/40',
  },
  REJECTED: {
    label: 'Rejected',
    light: 'bg-rose-50 text-rose-700 border-rose-200',
    selected: 'bg-rose-400/30 text-white border-rose-300/40',
  },
  SUBMITTED: {
    label: 'Submitted',
    light: 'bg-blue-50 text-[#084E92] border-blue-200',
    selected: 'bg-white/20 text-white border-white/30',
  },
  PARTIALLY_APPROVED: {
    label: 'Partially Approved',
    light: 'bg-amber-50 text-amber-700 border-amber-200',
    selected: 'bg-amber-400/30 text-white border-amber-300/40',
  },
  DRAFT: {
    label: 'Draft',
    light: 'bg-slate-100 text-slate-600 border-slate-200',
    selected: 'bg-white/20 text-white border-white/30',
  },
};

const RATE_SOURCE_LABELS = {
  LAST_PURCHASE: 'Last Purchase',
  WEIGHTED_AVERAGE: 'Weighted Average',
  HIGHEST_PRICE: 'Highest Price',
  LOWEST_PRICE: 'Lowest Price',
  CURRENT_STOCK_LAST_PURCHASE: 'Current Stock (Last Purchase)',
  CURRENT_STOCK: 'Current Stock',
  UNRESOLVED: 'Unresolved',
};

const formatRateSource = (src) => {
  if (!src) return '—';
  const map = {
    CURRENT_STOCK_LAST_PURCHASE: 'Stock (Last Purchase)',
    CURRENT_STOCK: 'Current Stock',
    LAST_PURCHASE: 'Last Purchase',
    WEIGHTED_AVERAGE: 'Weighted Avg',
    HIGHEST_PRICE: 'Highest Price',
    LOWEST_PRICE: 'Lowest Price',
    UNRESOLVED: 'Unresolved',
  };
  return map[src] || RATE_SOURCE_LABELS[src] || src;
};

const getRateSourceBadgeClass = (src) => {
  switch (src) {
    case 'CURRENT_STOCK':
    case 'CURRENT_STOCK_LAST_PURCHASE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'LAST_PURCHASE':
    case 'WEIGHTED_AVERAGE':
      return 'bg-blue-50 text-[#084E92] border-blue-200';
    case 'UNRESOLVED':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const REQUIRES_DATE_BASIS = ['WEIGHTED_AVERAGE', 'HIGHEST_PRICE', 'LOWEST_PRICE'];

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

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—';
  const str = String(dateStr).trim();
  if (str.includes('/')) return str;
  const parts = str.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDisplayTime = (time24) => {
  if (!time24) return '—';
  const [hStr, mStr] = String(time24).split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${mStr || '00'} ${ampm}`;
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

const EMPTY_ARRAY = [];

const MenuPlanDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const planId = params.id || location.state?.planId || null;
  const fromApproval = Boolean(location.state?.fromApproval);

  const {
    units: scopeUnits,
    outlets: scopeOutlets,
    subOutlets: scopeSubOutlets,
  } = useOrgScope();

  const units = useMemo(() => {
    return scopeOutlets && scopeOutlets.length > 0 ? scopeOutlets : scopeUnits || EMPTY_ARRAY;
  }, [scopeOutlets, scopeUnits]);

  const [loading, setLoading] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [planData, setPlanData] = useState(null);

  // Day & Shift View state
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [activeDayData, setActiveDayData] = useState(null);
  const [selectedMealTypeId, setSelectedMealTypeId] = useState('');

  // Collapsible state for each menu item row
  const [expandedItems, setExpandedItems] = useState({});
  const [subTabs, setSubTabs] = useState({});

  const toggleItemExpand = (rowKey) => {
    setExpandedItems((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  const handleSubTabChange = (rowKey, tabKey) => {
    setSubTabs((prev) => ({
      ...prev,
      [rowKey]: tabKey,
    }));
  };

  // 1. Fetch complete Menu Plan
  useEffect(() => {
    if (!planId) return;

    const loadPlan = async () => {
      setLoading(true);
      try {
        const res = await getMenuPlanById(planId);
        const data = res?.data?.data ?? res?.data;

        if (data) {
          setPlanData(data);
          if (Array.isArray(data.days) && data.days.length > 0) {
            const firstDay = data.days[0];
            setSelectedDayId(firstDay.id);
            await fetchDayDetails(firstDay.id);
          }
        }
      } catch (err) {
        console.error('Failed to load menu plan view:', err);
        notify.error('Failed to load menu plan details.');
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [planId]);

  // 2. Fetch specific Day details via /menu-plan/day/get/{dayId}
  const fetchDayDetails = async (dayId) => {
    if (!dayId) return;
    setLoadingDay(true);
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
      setLoadingDay(false);
    }
  };

  const handleSelectDay = (dayId) => {
    setSelectedDayId(dayId);
    fetchDayDetails(dayId);
  };

  // Plan-level configured destinations
  const planDestinations = useMemo(() => {
    const rawList = Array.isArray(planData?.destinationOutlets)
      ? planData.destinationOutlets
      : Array.isArray(planData?.destinations)
      ? planData.destinations
      : EMPTY_ARRAY;
    return rawList.map((d, idx) => {
      const orgId = Number(d.organizationId ?? d.destinationOutletId ?? 0);
      const subId =
        d.subOutletId ?? d.destinationSubOutletId
          ? Number(d.subOutletId ?? d.destinationSubOutletId)
          : null;
      const unitObj = units.find((u) => String(u.id) === String(orgId));
      const subObj = (scopeSubOutlets || []).find((su) => String(su.id) === String(subId));

      return {
        id: d.id || idx,
        organizationId: orgId,
        unitName:
          d.unitName ||
          d.organizationName ||
          d.destinationOutletName ||
          unitObj?.name ||
          unitObj?.companyName ||
          `Unit #${orgId}`,
        subOutletId: subId,
        subUnitName:
          d.subUnitName ||
          d.subOutletName ||
          d.destinationSubOutletName ||
          subObj?.name ||
          subObj?.subOutletName ||
          '—',
        plannedPax: d.plannedPax ?? 0,
        deliveryTime: d.formattedDeliveryTime || d.deliveryTime || '',
        transferRequired: Boolean(d.isTransferRequired ?? d.transferRequired),
        notes: d.notes || d.remarks || '—',
      };
    });
  }, [planData?.destinationOutlets, planData?.destinations, units, scopeSubOutlets]);

  const totalPlanDestinationPax = useMemo(() => {
    return planDestinations.reduce((sum, d) => sum + (Number(d.plannedPax) || 0), 0);
  }, [planDestinations]);

  // Week Cycle Calculation
  const allDaysList = useMemo(() => {
    return Array.isArray(planData?.days) ? planData.days : EMPTY_ARRAY;
  }, [planData]);

  const totalDaysCount = useMemo(() => {
    if (planData?.totalDays) return Number(planData.totalDays);
    return allDaysList.length;
  }, [planData, allDaysList]);

  const isMultiWeek = totalDaysCount > 7;
  const totalWeeksCount = Math.max(1, Math.ceil(totalDaysCount / 7));

  const visibleDays = useMemo(() => {
    if (!isMultiWeek) return allDaysList;
    const startIndex = (selectedWeek - 1) * 7;
    return allDaysList.slice(startIndex, startIndex + 7);
  }, [allDaysList, isMultiWeek, selectedWeek]);

  // Active Day / Shift resolution
  const activeDay = useMemo(() => {
    return activeDayData || allDaysList.find((d) => d.id === selectedDayId) || allDaysList[0] || null;
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

  // Combined and deduplicated recipes for display
  const activeRecipes = useMemo(() => {
    if (!activeShift) return EMPTY_ARRAY;

    const currentShiftMealTypeId = Number(activeShift.mealTypeId);
    const dayItems = Array.isArray(activeDay?.items) ? activeDay.items : [];

    const shiftDayItems = dayItems.filter((i) => Number(i.mealTypeId) === currentShiftMealTypeId);

    const slotRecipes = (activeShift.slots || []).flatMap((s) =>
      (s.recipes || []).map((r) => ({
        ...r,
        mealSlotName: s.mealSlotName || r.mealSlotName,
        kitchenMenuCategoryName:
          s.kitchenMenuCategoryName || r.kitchenMenuCategoryName || r.recipeCategoryName,
        categoryName:
          s.kitchenMenuCategoryName || s.mealSlotName || r.recipeCategoryName || 'General',
      }))
    );

    // Prefer slotRecipes if present as it includes full slots, rawMaterials, and captainRecipes
    const rawList = slotRecipes.length > 0 ? slotRecipes : shiftDayItems;

    // Strict deduplication by kitchenMenuItemId
    const seen = new Set();
    return rawList.filter((r) => {
      const kId = Number(r.kitchenMenuItemId || r.id);
      if (seen.has(kId)) return false;
      seen.add(kId);
      return true;
    });
  }, [activeShift, activeDay]);

  // Total Shift Cost
  const totalShiftCost = useMemo(() => {
    return activeRecipes.reduce((acc, r) => acc + (Number(r.costPerPortion) || 0), 0);
  }, [activeRecipes]);

  const totalShiftMaterialCost = useMemo(() => {
    return activeRecipes.reduce((acc, r) => acc + (Number(r.totalItemCost) || 0), 0);
  }, [activeRecipes]);

  const planStatusUpper = (planData?.status || 'DRAFT').toUpperCase();
  const statusBadgeClass =
    STATUS_BADGE[planStatusUpper] ||
    STATUS_BADGE[planData?.status] ||
    'bg-slate-100 text-slate-700 border-slate-200';

  const canEditPlan = ['DRAFT', 'REJECTED'].includes(planStatusUpper) && !fromApproval;

  const activeDayStatusUpper = (activeDay?.status || 'DRAFT').toUpperCase();
  const activeDayStatusMeta = DAY_STATUS_CONFIG[activeDayStatusUpper] || {
    label: activeDay?.status || 'Draft',
    light: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <Container>
      <div className="pt-2 pb-12 space-y-4">
        {/* Page Header */}
        <PageHeader
          title="Menu Plan Details"
          description="View schedule timeline, shift allocations, demand targets, and recipe portions."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    fromApproval ? '/production/approve-menu-plan' : '/production/menu-planning'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer bg-white shadow-2xs"
              >
                <ArrowLeft size={14} className="text-slate-500" />
                {fromApproval ? 'Back to Approvals' : 'Back to Listing'}
              </button>

              {canEditPlan && (
                <button
                  type="button"
                  onClick={() =>
                    navigate('/production/menu-planning/create', {
                      state: { planId },
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#084E92] hover:bg-[#063d73] text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  Edit Plan
                </button>
              )}
            </div>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 bg-white border border-[#E7EAF0] rounded-2xl text-slate-500 text-sm shadow-xs">
            <Loader2 size={18} className="animate-spin text-[#084E92]" />
            Loading menu plan details…
          </div>
        ) : (
          <>
            {/* Header KPI Overview Card */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900">{planData?.planCode}</h2>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeClass}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {planData?.status || 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {planData?.remarks || 'Menu Planning Schedule'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Total Days
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {planData?.totalDays || totalDaysCount} Days
                    </span>
                  </div>
                  <div className="h-7 w-px bg-slate-200" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Avg Food Cost / Meal
                    </span>
                    <span className="text-sm font-black text-emerald-600">
                      ₹{Number(planData?.avgFoodCostPerMeal || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid Metadata Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <div className="flex items-center gap-3 bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-[#084E92] flex items-center justify-center shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Unit
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {planData?.organizationName || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-[#084E92] flex items-center justify-center shrink-0">
                    <Layers size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Sub-Unit
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {planData?.subOutletName || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-[#084E92] flex items-center justify-center shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Date Range
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {formatDateDisplay(planData?.fromDate)} – {formatDateDisplay(planData?.toDate)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-[#084E92] flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Created Date
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {formatDateDisplay(planData?.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Planned Meal Structures Demand Summary */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#084E92]" />
                <h3 className="text-sm font-bold text-slate-900">Configured Meal Structures</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(planData?.mealStructures || []).map((ms) => (
                  <div
                    key={ms.id || ms.mealTypeId}
                    className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block uppercase">
                        {ms.mealTypeName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {ms.mealStructureName}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-[#084E92] block">
                        {ms.plannedPax} PAX
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {ms.expectedPax} + {ms.bufferPercentage}% buf
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configured Destination Outlets Summary (if configured on plan) */}
            {planDestinations.length > 0 && (
              <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-[#084E92]" />
                    <h3 className="text-sm font-bold text-slate-900">Destination Outlets</h3>
                  </div>

                  <div className="inline-flex items-center gap-3 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-xs self-start sm:self-auto">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Network size={13} className="text-[#084E92]" />
                      <span>Total Destinations:</span>
                      <span className="font-bold text-slate-900">{planDestinations.length}</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="text-slate-600 font-medium">
                      <span>Total Planned Pax: </span>
                      <span className="font-extrabold text-[#084E92]">
                        {totalPlanDestinationPax}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs table-fixed">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-4 text-left w-[24%]">Destination Outlet</th>
                        <th className="py-2.5 px-4 text-left w-[20%]">Sub-Location</th>
                        <th className="py-2.5 px-4 text-center w-[14%]">Planned PAX</th>
                        <th className="py-2.5 px-4 text-center w-[14%]">Delivery Time</th>
                        <th className="py-2.5 px-4 text-center w-[14%]">Transfer Req.</th>
                        <th className="py-2.5 px-4 text-left w-[14%]">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {planDestinations.map((dest) => (
                        <tr key={dest.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-bold text-slate-900 truncate">
                            {dest.unitName}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 truncate">
                            {dest.subUnitName}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-800">
                            {dest.plannedPax || 0}
                          </td>
                          <td className="py-2.5 px-4 text-center text-slate-600">
                            {dest.deliveryTime ? formatDisplayTime(dest.deliveryTime) : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                dest.transferRequired
                                  ? 'bg-blue-50 text-[#084E92] border-blue-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {dest.transferRequired ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 truncate" title={dest.notes}>
                            {dest.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Shift Filter & Multi-Week Selector */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700">Select Shift:</label>
                <div className="w-56">
                  <Select value={selectedMealTypeId} onValueChange={setSelectedMealTypeId}>
                    <SelectTrigger className="h-9 w-full rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium">
                      <SelectValue placeholder="Select Shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDayShifts.map((s) => (
                        <SelectItem key={s.mealTypeId} value={String(s.mealTypeId)} className="text-xs">
                          {s.mealTypeName} ({s.plannedPax} PAX)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isMultiWeek && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">Menu Cycle:</label>
                  <div className="w-40">
                    <Select
                      value={String(selectedWeek)}
                      onValueChange={(val) => {
                        const wNum = Number(val);
                        setSelectedWeek(wNum);
                        const newFirstDay = allDaysList[(wNum - 1) * 7];
                        if (newFirstDay) handleSelectDay(newFirstDay.id);
                      }}
                    >
                      <SelectTrigger className="h-9 w-full rounded-xl border border-[#C3C6D1] bg-white text-xs font-bold text-[#084E92]">
                        <div className="flex items-center gap-1.5">
                          <RotateCw size={13} />
                          <SelectValue placeholder="Select Cycle" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: totalWeeksCount }, (_, i) => i + 1).map((w) => (
                          <SelectItem key={w} value={String(w)} className="text-xs">
                            Week {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Split Schedule Explorer: Left Days, Right Recipe Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left: Days list with Day Status Badges */}
              <div className="lg:col-span-3 space-y-2 max-h-[75vh] overflow-y-auto pr-1">
                {visibleDays.map((day) => {
                  const isSelected = day.id === selectedDayId;
                  const dayStatusUpper = (day.status || 'DRAFT').toUpperCase();
                  const dayStatusMeta = DAY_STATUS_CONFIG[dayStatusUpper] || {
                    label: day.status || 'Draft',
                    light: 'bg-slate-100 text-slate-600 border-slate-200',
                    selected: 'bg-white/20 text-white border-white/30',
                  };

                  const dateObj = new Date(day.planDate);
                  const formattedDisplay = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : day.planDate;

                  return (
                    <button
                      type="button"
                      key={day.id}
                      onClick={() => handleSelectDay(day.id)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'bg-[#084E92] text-white border-[#084E92]'
                          : 'bg-white text-slate-700 border-[#E7EAF0] hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Calendar size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-xs block leading-tight truncate">
                          {day.dayOfWeekName || day.dayOfWeek}
                        </span>
                        <span
                          className={`text-[11px] font-medium block truncate ${
                            isSelected ? 'text-white/80' : 'text-slate-400'
                          }`}
                        >
                          {formattedDisplay}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${
                          isSelected ? dayStatusMeta.selected : dayStatusMeta.light
                        }`}
                      >
                        {dayStatusMeta.label}
                      </span>

                      <ChevronRight
                        size={14}
                        className={`shrink-0 ${isSelected ? 'text-white' : 'text-slate-300'}`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Right: Recipe allocations for selected Day & Shift */}
              <div className="lg:col-span-9 bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                      <UtensilsCrossed size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">
                          {activeDay?.dayOfWeekName || 'Day'} – {activeShift?.mealTypeName || 'Shift'}{' '}
                          Menu
                        </h3>
                        {activeDay && (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${activeDayStatusMeta.light}`}
                          >
                            Day: {activeDayStatusMeta.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Structure:{' '}
                        <strong className="text-slate-700">
                          {activeShift?.mealStructureName || '—'}
                        </strong>
                        {' | '}
                        Planned Demand:{' '}
                        <strong className="text-[#084E92]">{activeShift?.plannedPax || 0} PAX</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Shift Food Cost
                    </span>
                    <span className="text-base font-black text-slate-900">
                      ₹{totalShiftCost.toFixed(2)}{' '}
                      <span className="text-[11px] font-normal text-slate-400">/ portion</span>
                    </span>
                    {totalShiftMaterialCost > 0 && (
                      <span className="text-[11px] font-bold text-slate-500 block">
                        Total: ₹
                        {totalShiftMaterialCost.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Day Rejection Reason Banner (if selected day was rejected) */}
                {activeDayStatusUpper === 'REJECTED' && activeDay?.rejectionReason && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <span className="font-bold">Day Rejection Reason: </span>
                      <span>{activeDay.rejectionReason}</span>
                    </div>
                  </div>
                )}

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  {loadingDay ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-xs">
                      <Loader2 size={16} className="animate-spin text-[#084E92]" />
                      Loading day menu…
                    </div>
                  ) : (
                    <table className="w-full text-xs table-fixed">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] leading-tight">
                          <th className="py-3 px-3 text-left w-[12%]">Category</th>
                          <th className="py-3 px-3 text-left w-[25%]">Kitchen Menu Item</th>
                          <th className="py-3 px-2.5 text-left w-[13%]">
                            Total Planned
                            <span className="block">Quantity</span>
                          </th>
                          <th className="py-3 px-2.5 text-left w-[12%]">
                            Allocated
                            <span className="block">Quantity</span>
                          </th>
                          <th className="py-3 px-2.5 text-left w-[11%]">Portion</th>
                          <th className="py-3 px-2.5 text-left w-[11%]">
                            Cost /
                            <span className="block">Portion</span>
                          </th>
                          <th className="py-3 px-3 text-left w-[16%]">Rate Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeRecipes.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                              No recipes configured for this shift.
                            </td>
                          </tr>
                        ) : (
                          activeRecipes.map((item, idx) => {
                            const rowKey = `${item.kitchenMenuItemId || item.id}-${idx}`;
                            const isExpanded = Boolean(expandedItems[rowKey]);
                            const displayName =
                              item.recipeName ||
                              item.itemName ||
                              item.kitchenMenuItemName ||
                              `Item #${item.kitchenMenuItemId || item.id}`;
                            const displayCat =
                              item.recipeCategoryName || item.categoryName || 'General';
                            const portionUnitSym = getShortUnit(
                              item.portionUnitSymbol || item.portionUnitName || 'g'
                            );
                            const displayPortion = item.portionSize
                              ? `${item.portionSize} ${portionUnitSym}`
                              : item.portion || '—';

                            const qtyUnitSym = getShortUnit(
                              item.scaledWeightUnitSymbol ||
                                item.displayScaledWeightUnitSymbol ||
                                item.uomSymbol ||
                                item.unitSymbol ||
                                item.unitName ||
                                'kg'
                            );
                            const totalPlannedQty = Number(item.plannedQty) || 0;

                            const itemDestinations = Array.isArray(item.destinations)
                              ? item.destinations
                              : EMPTY_ARRAY;
                            const itemRawMaterials = Array.isArray(item.rawMaterials)
                              ? item.rawMaterials
                              : Array.isArray(item.ingredients)
                              ? item.ingredients
                              : EMPTY_ARRAY;
                            const itemCaptainRecipes = Array.isArray(item.captainRecipes)
                              ? item.captainRecipes
                              : EMPTY_ARRAY;

                            const allocatedQtySum = itemDestinations.reduce(
                              (sum, d) => sum + (Number(d.plannedQty) || 0),
                              0
                            );

                            const rateSourceKey = item.rateSource || 'LAST_PURCHASE';
                            const isDateSource = REQUIRES_DATE_BASIS.includes(rateSourceKey);
                            const rawFrom = item.fromDate || item.rateFromDate;
                            const rawTo = item.toDate || item.rateToDate;
                            const itemImg = resolveItemImage(item);

                            const activeSubTab =
                              subTabs[rowKey] ||
                              (itemDestinations.length > 0
                                ? 'destinations'
                                : itemRawMaterials.length > 0
                                ? 'rawMaterials'
                                : itemCaptainRecipes.length > 0
                                ? 'captainRecipes'
                                : 'destinations');

                            return (
                              <React.Fragment key={rowKey}>
                                <tr className="hover:bg-slate-50/50">
                                  <td className="py-3 px-3">
                                    <div className="flex flex-col gap-1 items-start">
                                      <span
                                        title={displayCat}
                                        className="inline-block max-w-full truncate px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-[#084E92] border-blue-200"
                                      >
                                        {displayCat}
                                      </span>
                                      {item.mealSlotName && item.mealSlotName !== displayCat && (
                                        <span
                                          className="text-[10px] text-slate-400 font-medium truncate max-w-full"
                                          title={`Slot: ${item.mealSlotName}`}
                                        >
                                          Slot: {item.mealSlotName}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleItemExpand(rowKey)}
                                      className="group flex items-center gap-2 text-left w-full bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
                                      title="Click to view breakdown and allocations"
                                    >
                                      <MenuItemThumbnail src={itemImg} alt={displayName} />
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 group-hover:text-[#084E92] transition-colors">
                                            {displayName}
                                          </span>
                                          <span className="text-slate-400 group-hover:text-[#084E92] transition-colors shrink-0">
                                            {isExpanded ? (
                                              <ChevronUp size={13} />
                                            ) : (
                                              <ChevronDown size={13} />
                                            )}
                                          </span>
                                        </div>
                                        {itemCaptainRecipes.length > 0 && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md mt-1 w-fit">
                                            <ChefHat size={10} className="text-amber-600 shrink-0" />
                                            +{itemCaptainRecipes.length} Captain Sub-Recipe
                                            {itemCaptainRecipes.length > 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  </td>

                                  <td className="py-3 px-2.5 text-slate-800 font-semibold">
                                    <div>
                                      <span>
                                        {totalPlannedQty > 0
                                          ? `${totalPlannedQty} ${qtyUnitSym}`
                                          : '—'}
                                      </span>
                                      {item.plannedPax ? (
                                        <span className="block text-[10px] font-normal text-slate-400">
                                          {item.plannedPax} PAX
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>

                                  <td className="py-3 px-2.5 text-slate-800 font-bold">
                                    {allocatedQtySum > 0
                                      ? `${
                                          Number.isInteger(allocatedQtySum)
                                            ? allocatedQtySum
                                            : allocatedQtySum.toFixed(2)
                                        } ${qtyUnitSym}`
                                      : `0 ${qtyUnitSym}`}
                                  </td>

                                  <td className="py-3 px-2.5 text-slate-700 font-medium">
                                    {displayPortion}
                                  </td>

                                  <td className="py-3 px-2.5 font-bold text-slate-900">
                                    <div>
                                      <span>₹{Number(item.costPerPortion || 0).toFixed(2)}</span>
                                      {item.totalItemCost != null && Number(item.totalItemCost) > 0 && (
                                        <span className="block text-[10px] font-semibold text-slate-500">
                                          Total: ₹{Number(item.totalItemCost).toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-3">
                                    <div className="flex flex-col gap-1 items-start">
                                      <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md max-w-full truncate border ${getRateSourceBadgeClass(
                                          rateSourceKey
                                        )}`}
                                      >
                                        <Tag size={10} className="shrink-0" />
                                        <span className="truncate">
                                          {formatRateSource(rateSourceKey)}
                                        </span>
                                      </span>

                                      {isDateSource && (
                                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#084E92] bg-blue-50/80 border border-blue-100 px-2 py-0.5 rounded-md max-w-full">
                                          <Calendar size={10} className="shrink-0 text-[#084E92]" />
                                          <span className="truncate">
                                            {rawFrom
                                              ? `${formatDateDisplay(rawFrom)} – ${
                                                  formatDateDisplay(rawTo) || 'Today'
                                                }`
                                              : 'No date range'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>

                                {/* Collapsible Tabs Breakdown Section */}
                                {isExpanded && (
                                  <tr className="bg-slate-50/40">
                                    <td colSpan={7} className="px-3.5 py-2.5">
                                      <div className="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-2xs">
                                        {/* Sub-header Navigation Tabs */}
                                        <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleSubTabChange(rowKey, 'destinations')
                                              }
                                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                                activeSubTab === 'destinations'
                                                  ? 'bg-[#084E92] text-white border-[#084E92] shadow-2xs'
                                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                              }`}
                                            >
                                              <Truck size={12} />
                                              <span>Destinations</span>
                                              <span
                                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                                  activeSubTab === 'destinations'
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-slate-100 text-slate-600'
                                                }`}
                                              >
                                                {itemDestinations.length}
                                              </span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleSubTabChange(rowKey, 'rawMaterials')
                                              }
                                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                                activeSubTab === 'rawMaterials'
                                                  ? 'bg-[#084E92] text-white border-[#084E92] shadow-2xs'
                                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                              }`}
                                            >
                                              <Scale size={12} />
                                              <span>Raw Materials</span>
                                              <span
                                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                                  activeSubTab === 'rawMaterials'
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-slate-100 text-slate-600'
                                                }`}
                                              >
                                                {itemRawMaterials.length}
                                              </span>
                                            </button>

                                            {itemCaptainRecipes.length > 0 && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleSubTabChange(rowKey, 'captainRecipes')
                                                }
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                                  activeSubTab === 'captainRecipes'
                                                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                                    : 'bg-amber-50/80 text-amber-800 border-amber-200 hover:bg-amber-100/60'
                                                }`}
                                              >
                                                <ChefHat size={12} />
                                                <span>Captain Sub-Recipes</span>
                                                <span
                                                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                                    activeSubTab === 'captainRecipes'
                                                      ? 'bg-white/20 text-white'
                                                      : 'bg-amber-100 text-amber-800'
                                                  }`}
                                                >
                                                  {itemCaptainRecipes.length}
                                                </span>
                                              </button>
                                            )}
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => toggleItemExpand(rowKey)}
                                            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
                                            title="Collapse details"
                                          >
                                            <ChevronUp size={15} />
                                          </button>
                                        </div>

                                        {/* Tab 1: Destination Allocations */}
                                        {activeSubTab === 'destinations' && (
                                          <div>
                                            {itemDestinations.length === 0 ? (
                                              <div className="p-4 text-center text-xs text-slate-400">
                                                No destination allocations recorded for this item.
                                              </div>
                                            ) : (
                                              <table className="w-full text-xs table-fixed">
                                                <thead>
                                                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                                                    <th className="py-2 px-4 text-left w-[26%]">
                                                      Destination Outlet
                                                    </th>
                                                    <th className="py-2 px-4 text-left w-[22%]">
                                                      Sub-Location
                                                    </th>
                                                    <th className="py-2 px-4 text-center w-[14%]">
                                                      Planned PAX
                                                    </th>
                                                    <th className="py-2 px-4 text-center w-[18%]">
                                                      Planned Quantity
                                                    </th>
                                                    <th className="py-2 px-4 text-center w-[20%]">
                                                      Portion Size
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                  {itemDestinations.map((dest, dIdx) => {
                                                    const outId = Number(
                                                      dest.destinationOutletId ??
                                                        dest.organizationId ??
                                                        0
                                                    );
                                                    const subId =
                                                      dest.destinationSubOutletId ?? dest.subOutletId
                                                        ? Number(
                                                            dest.destinationSubOutletId ??
                                                              dest.subOutletId
                                                          )
                                                        : null;
                                                    const unitObj = units.find(
                                                      (u) => String(u.id) === String(outId)
                                                    );
                                                    const subObj = (scopeSubOutlets || []).find(
                                                      (su) => String(su.id) === String(subId)
                                                    );

                                                    const destUnitName =
                                                      dest.destinationOutletName ||
                                                      dest.unitName ||
                                                      unitObj?.name ||
                                                      unitObj?.companyName ||
                                                      (outId > 0 ? `Unit #${outId}` : '—');
                                                    const destSubName =
                                                      dest.destinationSubOutletName ||
                                                      dest.subUnitName ||
                                                      subObj?.name ||
                                                      subObj?.subOutletName ||
                                                      '—';
                                                    const destPortionUnit = getShortUnit(
                                                      dest.portionUnitSymbol ||
                                                        dest.portionUnitName ||
                                                        portionUnitSym
                                                    );

                                                    return (
                                                      <tr
                                                        key={
                                                          dest.id ||
                                                          `${outId}-${subId || 'none'}-${dIdx}`
                                                        }
                                                        className="hover:bg-slate-50/50"
                                                      >
                                                        <td className="py-2.5 px-4 font-bold text-slate-900 truncate">
                                                          {destUnitName}
                                                        </td>
                                                        <td className="py-2.5 px-4 text-slate-500 truncate">
                                                          {destSubName}
                                                        </td>
                                                        <td className="py-2.5 px-4 text-center font-semibold text-slate-800">
                                                          {dest.plannedPax ?? 0}
                                                        </td>
                                                        <td className="py-2.5 px-4 text-center font-bold text-slate-900">
                                                          {dest.plannedQty ?? 0} {qtyUnitSym}
                                                        </td>
                                                        <td className="py-2.5 px-4 text-center text-slate-600 font-medium">
                                                          {dest.portionSize
                                                            ? `${dest.portionSize} ${destPortionUnit}`
                                                            : displayPortion}
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            )}
                                          </div>
                                        )}

                                        {/* Tab 2: Raw Materials / Ingredients */}
                                        {activeSubTab === 'rawMaterials' && (
                                          <div>
                                            {itemRawMaterials.length === 0 ? (
                                              <div className="p-4 text-center text-xs text-slate-400">
                                                No direct raw material ingredients listed for this
                                                item.
                                              </div>
                                            ) : (
                                              <div>
                                                <table className="w-full text-xs table-fixed">
                                                  <thead>
                                                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                                                      <th className="py-2.5 px-3 text-center w-[5%]">
                                                        #
                                                      </th>
                                                      <th className="py-2.5 px-3 text-left w-[27%]">
                                                        Raw Material
                                                      </th>
                                                      <th className="py-2.5 px-3 text-center w-[18%]">
                                                        Rate Source
                                                      </th>
                                                      <th className="py-2.5 px-3 text-right w-[12%]">
                                                        Required Qty
                                                      </th>
                                                      <th className="py-2.5 px-3 text-right w-[12%]">
                                                        Qty / Portion
                                                      </th>
                                                      <th className="py-2.5 px-3 text-right w-[13%]">
                                                        Unit Rate
                                                      </th>
                                                      <th className="py-2.5 px-3 text-right w-[13%]">
                                                        Total Cost
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100">
                                                    {itemRawMaterials.map((rm, rmIdx) => {
                                                      const rmUom = getShortUnit(
                                                        rm.uomSymbol || rm.uomName || 'KG'
                                                      );
                                                      const rateSrc =
                                                        rm.rateSource || 'UNRESOLVED';
                                                      const badgeClass =
                                                        getRateSourceBadgeClass(rateSrc);
                                                      const label = formatRateSource(rateSrc);

                                                      return (
                                                        <tr
                                                          key={
                                                            rm.id ||
                                                            rm.rawMaterialId ||
                                                            rmIdx
                                                          }
                                                          className="hover:bg-slate-50/50"
                                                        >
                                                          <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                                                            {rmIdx + 1}
                                                          </td>
                                                          <td className="py-2.5 px-3 font-semibold text-slate-900 truncate">
                                                            <div className="flex flex-col">
                                                              <span className="truncate">
                                                                {rm.rawMaterialName}
                                                              </span>
                                                              {rm.rawMaterialCode && (
                                                                <span className="text-[10px] text-slate-400 font-normal">
                                                                  {rm.rawMaterialCode}
                                                                </span>
                                                              )}
                                                            </div>
                                                          </td>
                                                          <td className="py-2.5 px-3 text-center">
                                                            <span
                                                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}`}
                                                            >
                                                              {label}
                                                            </span>
                                                          </td>
                                                          <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                                                            {rm.requiredQty != null
                                                              ? `${rm.requiredQty} ${rmUom}`
                                                              : '—'}
                                                          </td>
                                                          <td className="py-2.5 px-3 text-right text-slate-600">
                                                            {rm.quantityPerPortion != null
                                                              ? `${rm.quantityPerPortion} ${rmUom}`
                                                              : '—'}
                                                          </td>
                                                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                                            ₹{Number(rm.unitRate || 0).toFixed(2)}
                                                          </td>
                                                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                                            ₹
                                                            {Number(
                                                              rm.totalMaterialCost || 0
                                                            ).toFixed(2)}
                                                          </td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                  <tfoot>
                                                    <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                                                      <td
                                                        colSpan={6}
                                                        className="py-2.5 px-3 text-right text-slate-700 uppercase text-[10px]"
                                                      >
                                                        Total Direct Raw Material Cost:
                                                      </td>
                                                      <td className="py-2.5 px-3 text-right text-xs font-black text-[#084E92]">
                                                        ₹
                                                        {itemRawMaterials
                                                          .reduce(
                                                            (sum, r) =>
                                                              sum +
                                                              (Number(r.totalMaterialCost) || 0),
                                                            0
                                                          )
                                                          .toFixed(2)}
                                                      </td>
                                                    </tr>
                                                  </tfoot>
                                                </table>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Tab 3: Captain Sub-Recipes */}
                                        {activeSubTab === 'captainRecipes' && (
                                          <div className="p-3.5 space-y-3.5">
                                            {itemCaptainRecipes.length === 0 ? (
                                              <div className="p-4 text-center text-xs text-slate-400">
                                                No captain sub-recipes configured for this item.
                                              </div>
                                            ) : (
                                              itemCaptainRecipes.map((cr, cIdx) => {
                                                const crUom = getShortUnit(
                                                  cr.unitSymbol ||
                                                    cr.unitName ||
                                                    cr.uomSymbol ||
                                                    'KG'
                                                );
                                                const crMaterials = Array.isArray(cr.rawMaterials)
                                                  ? cr.rawMaterials
                                                  : Array.isArray(cr.ingredients)
                                                  ? cr.ingredients
                                                  : EMPTY_ARRAY;
                                                const crRateSrc =
                                                  cr.rateSource || 'CURRENT_STOCK';
                                                const badgeClass =
                                                  getRateSourceBadgeClass(crRateSrc);
                                                const crLabel = formatRateSource(crRateSrc);

                                                return (
                                                  <div
                                                    key={cr.captainRecipeId || cr.id || cIdx}
                                                    className="border border-amber-200/80 rounded-xl bg-amber-50/20 overflow-hidden"
                                                  >
                                                    {/* Header info */}
                                                    <div className="p-3 bg-amber-50/60 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2">
                                                      <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                                                          <ChefHat size={14} />
                                                        </div>
                                                        <div>
                                                          <div className="flex items-center gap-2">
                                                            <span className="font-bold text-xs text-slate-900">
                                                              {cr.captainRecipeName}
                                                            </span>
                                                            {cr.captainRecipeCode && (
                                                              <span className="text-[10px] text-slate-400 font-medium">
                                                                ({cr.captainRecipeCode})
                                                              </span>
                                                            )}
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                                              Captain Sub-Recipe
                                                            </span>
                                                          </div>
                                                        </div>
                                                      </div>

                                                      <div className="flex items-center gap-3 text-xs flex-wrap">
                                                        <span
                                                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}`}
                                                        >
                                                          {crLabel}
                                                        </span>
                                                        <span className="text-slate-600 font-medium">
                                                          Scaled Wt:{' '}
                                                          <strong className="text-slate-900">
                                                            {cr.scaledWeight ??
                                                              cr.displayQty ??
                                                              0}{' '}
                                                            {crUom}
                                                          </strong>
                                                        </span>
                                                        <span className="text-slate-600 font-medium">
                                                          Rate:{' '}
                                                          <strong className="text-slate-900">
                                                            ₹
                                                            {Number(
                                                              cr.costPerUnit ||
                                                                cr.currentStockCostPerUnit ||
                                                                0
                                                            ).toFixed(2)}{' '}
                                                            / {crUom}
                                                          </strong>
                                                        </span>
                                                        <span className="text-slate-600 font-medium">
                                                          Total Cost:{' '}
                                                          <strong className="text-[#084E92] font-black">
                                                            ₹
                                                            {Number(cr.totalCost || 0).toFixed(2)}
                                                          </strong>
                                                        </span>
                                                      </div>
                                                    </div>

                                                    {/* Nested raw materials */}
                                                    <div className="p-2">
                                                      <div className="text-[11px] font-bold text-slate-700 px-2 py-1 flex items-center gap-1.5">
                                                        <Scale
                                                          size={12}
                                                          className="text-slate-400"
                                                        />
                                                        <span>
                                                          Constituent Ingredients (
                                                          {crMaterials.length})
                                                        </span>
                                                      </div>

                                                      {crMaterials.length === 0 ? (
                                                        <div className="py-2 px-3 text-xs text-slate-400 italic">
                                                          No constituent ingredients available.
                                                        </div>
                                                      ) : (
                                                        <div className="border border-slate-100 rounded-lg overflow-hidden bg-white">
                                                          <table className="w-full text-xs table-fixed">
                                                            <thead>
                                                              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px]">
                                                                <th className="py-2 px-3 text-left w-[35%]">
                                                                  Ingredient
                                                                </th>
                                                                <th className="py-2 px-3 text-center w-[20%]">
                                                                  Rate Source
                                                                </th>
                                                                <th className="py-2 px-3 text-right w-[15%]">
                                                                  Qty
                                                                </th>
                                                                <th className="py-2 px-3 text-right w-[15%]">
                                                                  Unit Rate
                                                                </th>
                                                                <th className="py-2 px-3 text-right w-[15%]">
                                                                  Total Cost
                                                                </th>
                                                              </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                              {crMaterials.map((ing, ingIdx) => {
                                                                const ingUom = getShortUnit(
                                                                  ing.uomSymbol ||
                                                                    ing.uomName ||
                                                                    'KG'
                                                                );
                                                                const ingRateSrc =
                                                                  ing.rateSource || 'UNRESOLVED';
                                                                const ingBadgeClass =
                                                                  getRateSourceBadgeClass(
                                                                    ingRateSrc
                                                                  );
                                                                const ingLabel =
                                                                  formatRateSource(ingRateSrc);

                                                                return (
                                                                  <tr
                                                                    key={
                                                                      ing.id ||
                                                                      ing.rawMaterialId ||
                                                                      ingIdx
                                                                    }
                                                                    className="hover:bg-slate-50/50"
                                                                  >
                                                                    <td className="py-2 px-3 font-medium text-slate-800 truncate">
                                                                      {ing.rawMaterialName}
                                                                      {ing.rawMaterialCode && (
                                                                        <span className="text-[10px] text-slate-400 ml-1">
                                                                          ({ing.rawMaterialCode})
                                                                        </span>
                                                                      )}
                                                                    </td>
                                                                    <td className="py-2 px-3 text-center">
                                                                      <span
                                                                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${ingBadgeClass}`}
                                                                      >
                                                                        {ingLabel}
                                                                      </span>
                                                                    </td>
                                                                    <td className="py-2 px-3 text-right text-slate-700">
                                                                      {ing.requiredQty ??
                                                                        ing.convertedIngredientWeight ??
                                                                        ing.displayQty ??
                                                                        0}{' '}
                                                                      {ingUom}
                                                                    </td>
                                                                    <td className="py-2 px-3 text-right text-slate-700">
                                                                      ₹
                                                                      {Number(
                                                                        ing.unitRate ??
                                                                          ing.effectiveUnitRate ??
                                                                          ing.displayUnitRate ??
                                                                          0
                                                                      ).toFixed(2)}
                                                                    </td>
                                                                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                                                                      ₹
                                                                      {Number(
                                                                        ing.totalMaterialCost ??
                                                                          ing.amount ??
                                                                          0
                                                                      ).toFixed(2)}
                                                                    </td>
                                                                  </tr>
                                                                );
                                                              })}
                                                            </tbody>
                                                          </table>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Container>
  );
};

export default MenuPlanDetails;