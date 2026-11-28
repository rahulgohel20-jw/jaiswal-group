import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChefHat,
  Download,
  Eye,
  FileText,
  Info,
  Layers,
  Leaf,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ProductionCosting as fetchProductionCostingApi,
  getAllMealTypes,
  getAllProductionExecutions,
} from '@/services/apiServices';
import { notify } from '@/utils/toast';
import {
  aggregateCostingSummaries,
  extractPlanCatalog,
  formatINR,
  formatQty,
  normalizeCostingSummaryResponse,
} from './productionCostingData';

const WHOLE_DAY_KEY = 'WHOLE_DAY';

const isApiSuccess = (res) => {
  const body = res?.data;
  if (!body) return false;
  if (body.status !== undefined) {
    return String(body.status).toUpperCase() === 'SUCCESS';
  }
  if (body.success !== undefined) {
    return Boolean(body.success);
  }
  return res.status >= 200 && res.status < 300;
};

const getApiMessage = (res, err, fallback) => {
  return (
    res?.data?.message ||
    res?.data?.msg ||
    err?.response?.data?.message ||
    err?.response?.data?.msg ||
    err?.message ||
    fallback
  );
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const VarianceBadge = ({ pct, diff }) => {
  const numericPct = Number(pct) || 0;
  const isFavorable = numericPct <= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
        isFavorable
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-rose-50 text-rose-700 border-rose-200'
      }`}
    >
      {isFavorable ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
      <span>
        {numericPct > 0 ? `+${numericPct.toFixed(2)}%` : `${numericPct.toFixed(2)}%`}
        {diff !== undefined ? ` (${diff > 0 ? '+' : ''}${formatINR(diff)})` : ''}
      </span>
    </span>
  );
};

export const ProductionCosting = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const routePlanId = Number(
    params.planId || params.productionPlanId || location.state?.productionPlanId || 0
  );
  const routeMealId = Number(
    searchParams.get('mealTypeId') || location.state?.mealTypeId || 0
  );

  // Catalog state: all production plans + their associated meal types
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState(null);

  const [selectedPlanId, setSelectedPlanId] = useState(
    routePlanId > 0 ? String(routePlanId) : ''
  );
  const [selectedMealKey, setSelectedMealKey] = useState(
    routeMealId > 0 ? String(routeMealId) : WHOLE_DAY_KEY
  );

  // Active costing summary & per-shift breakdowns
  const [costingData, setCostingData] = useState(null);
  const [shiftBreakdowns, setShiftBreakdowns] = useState([]);
  const [loadingCosting, setLoadingCosting] = useState(false);
  const [costingError, setCostingError] = useState(null);

  // Alternative display mode & modal state
  const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'analytics'
  const [detailModal, setDetailModal] = useState(null); // null | 'recipes' | 'materials'
  const [modalSearch, setModalSearch] = useState('');

  const catalogSeqRef = useRef(0);
  const costingSeqRef = useRef(0);

  // 1. Load all Production Plans + Master Meal Types on mount
  const loadPlansAndMeals = useCallback(async () => {
    const seq = ++catalogSeqRef.current;
    setLoadingPlans(true);
    setPlansError(null);

    try {
      const [execRes, mtRes] = await Promise.all([
        getAllProductionExecutions({
          page: 0,
          size: 100,
          sortBy: 'createdAt',
          sortDirection: 'DESC',
        }),
        getAllMealTypes().catch(() => null),
      ]);

      if (seq !== catalogSeqRef.current) return;

      if (!isApiSuccess(execRes)) {
        setPlans([]);
        setPlansError(getApiMessage(execRes, null, 'Failed to load production plans.'));
        return;
      }

      const execData = execRes?.data?.data ?? execRes?.data ?? {};
      const execRows = Array.isArray(execData.content)
        ? execData.content
        : Array.isArray(execData.items)
          ? execData.items
          : Array.isArray(execData)
            ? execData
            : [];

      const mtData = mtRes?.data?.data ?? mtRes?.data ?? [];
      const mtList = Array.isArray(mtData) ? mtData : mtData?.items || [];

      const catalog = extractPlanCatalog(execRows, mtList);

      // Preserve explicitly navigated planId even if not within first page
      if (routePlanId > 0 && !catalog.some((p) => Number(p.id) === routePlanId)) {
        const navSummary = location.state?.executionSummary || {};
        catalog.unshift({
          id: routePlanId,
          planCode: navSummary.planCode || location.state?.planCode || `PP-${routePlanId}`,
          productionDate: navSummary.productionDate || location.state?.productionDate || '',
          kitchenName:
            navSummary.kitchenName ||
            navSummary.kitchenLocationName ||
            location.state?.kitchenName ||
            '—',
          organizationName: navSummary.organizationName || '',
          status: navSummary.status || '',
          meals: mtList
            .map((mt) => ({
              mealTypeId: Number(mt.id ?? mt.mealTypeId ?? 0),
              mealTypeName: mt.name || mt.mealTypeName || `Meal #${mt.id}`,
            }))
            .filter((m) => m.mealTypeId > 0),
          hasSpecificMeals: false,
        });
      }

      setPlans(catalog);

      setSelectedPlanId((prev) => {
        if (prev && catalog.some((p) => String(p.id) === String(prev))) {
          return prev;
        }
        if (routePlanId > 0 && catalog.some((p) => Number(p.id) === routePlanId)) {
          return String(routePlanId);
        }
        return catalog[0]?.id ? String(catalog[0].id) : '';
      });
    } catch (err) {
      if (seq !== catalogSeqRef.current) return;
      console.error('Failed to load production plans:', err);
      setPlans([]);
      setPlansError(getApiMessage(null, err, 'Network error while loading production plans.'));
    } finally {
      if (seq === catalogSeqRef.current) {
        setLoadingPlans(false);
      }
    }
  }, [routePlanId, location.state]);

  useEffect(() => {
    loadPlansAndMeals();
  }, [loadPlansAndMeals]);

  const activePlan = useMemo(
    () => plans.find((p) => String(p.id) === String(selectedPlanId)) || null,
    [plans, selectedPlanId]
  );

  // Build tabs: Whole Day + meals belonging to selected Production Plan
  const mealTabs = useMemo(() => {
    const planMeals = activePlan?.meals || [];
    return [
      { key: WHOLE_DAY_KEY, mealTypeId: null, label: 'Whole Day' },
      ...planMeals.map((m) => ({
        key: String(m.mealTypeId),
        mealTypeId: Number(m.mealTypeId),
        label: m.mealTypeName,
      })),
    ];
  }, [activePlan]);

  // Keep selectedMealKey valid when switching between plans with different meals
  const effectiveMealKey = useMemo(() => {
    if (mealTabs.some((t) => t.key === selectedMealKey)) {
      return selectedMealKey;
    }
    return mealTabs[0]?.key || WHOLE_DAY_KEY;
  }, [mealTabs, selectedMealKey]);

  const activeMealTab = useMemo(
    () => mealTabs.find((t) => t.key === effectiveMealKey) || mealTabs[0],
    [mealTabs, effectiveMealKey]
  );

  // Helper to fetch one meal costing summary cleanly
  const requestSingleCosting = useCallback(async (plan, mealTypeId, mealLabel) => {
    const payload = {
      productionPlanId: Number(plan.id),
      mealTypeId: mealTypeId ? Number(mealTypeId) : null,
    };
    const res = await fetchProductionCostingApi(payload);
    if (!isApiSuccess(res)) {
      const err = new Error(
        getApiMessage(res, null, 'Failed to load production costing summary.')
      );
      err.apiResponse = res;
      throw err;
    }
    return normalizeCostingSummaryResponse(res, {
      productionPlanId: Number(plan.id),
      planCode: plan.planCode,
      productionDate: plan.productionDate,
      kitchenName: plan.kitchenName,
      mealTypeId: mealTypeId ? Number(mealTypeId) : null,
      mealTypeName: mealLabel || (mealTypeId ? `Meal #${mealTypeId}` : 'Whole Day'),
    });
  }, []);

  // Merge newly discovered meals from costing response into the active plan's meal tabs
  const mergeDiscoveredMealsIntoPlan = useCallback((planId, discoveredMeals = []) => {
    if (!planId || !Array.isArray(discoveredMeals) || discoveredMeals.length === 0) return;
    setPlans((prev) => {
      let didChange = false;
      const next = prev.map((p) => {
        if (Number(p.id) !== Number(planId)) return p;
        const baseMeals = p.hasSpecificMeals ? p.meals : [];
        const map = new Map(baseMeals.map((m) => [m.mealTypeId, m]));
        let addedNew = false;
        discoveredMeals.forEach((m) => {
          if (m.mealTypeId > 0 && !map.has(m.mealTypeId)) {
            map.set(m.mealTypeId, m);
            addedNew = true;
          }
        });
        if (!addedNew) return p;
        didChange = true;
        return { ...p, meals: Array.from(map.values()), hasSpecificMeals: true };
      });
      return didChange ? next : prev;
    });
  }, []);

  const activePlanMealsRef = useRef([]);
  useEffect(() => {
    activePlanMealsRef.current = activePlan?.meals || [];
  }, [activePlan]);

  // 2. Call POST /production-plan/analytics/costing-summary whenever plan or meal changes
  const fetchCostingSummary = useCallback(async () => {
    if (!selectedPlanId) {
      setCostingData(null);
      setShiftBreakdowns([]);
      return;
    }

    const planForReq =
      plans.find((p) => String(p.id) === String(selectedPlanId)) || {
        id: Number(selectedPlanId),
        planCode: `PP-${selectedPlanId}`,
        productionDate: '',
        kitchenName: '—',
        meals: activePlanMealsRef.current,
      };
    const planMeals = planForReq.meals || [];

    const seq = ++costingSeqRef.current;
    setLoadingCosting(true);
    setCostingError(null);

    const isWholeDay = effectiveMealKey === WHOLE_DAY_KEY;
    const requestedMealId = isWholeDay ? null : Number(effectiveMealKey);
    const requestedMealLabel = activeMealTab?.label || 'Whole Day';

    try {
      let normalized = null;

      try {
        normalized = await requestSingleCosting(
          planForReq,
          requestedMealId,
          requestedMealLabel
        );
      } catch (primaryErr) {
        // Fallback if backend requires mealTypeId > 0 when requesting Whole Day
        if (isWholeDay && planMeals.length > 0) {
          const perMealResults = await Promise.all(
            planMeals.map((m) =>
              requestSingleCosting(planForReq, m.mealTypeId, m.mealTypeName).catch(
                () => null
              )
            )
          );
          const validMeals = perMealResults.filter(Boolean);
          if (validMeals.length > 0) {
            normalized = aggregateCostingSummaries(validMeals, {
              productionPlanId: Number(planForReq.id),
              planCode: planForReq.planCode,
              productionDate: planForReq.productionDate,
              kitchenName: planForReq.kitchenName,
            });
          } else {
            throw primaryErr;
          }
        } else {
          throw primaryErr;
        }
      }

      if (seq !== costingSeqRef.current) return;

      setCostingData(normalized);

      if (normalized?.availableMeals?.length > 0) {
        mergeDiscoveredMealsIntoPlan(planForReq.id, normalized.availableMeals);
      }

      if (normalized?.shiftBreakdowns?.length > 0) {
        setShiftBreakdowns(normalized.shiftBreakdowns);
      } else {
        setShiftBreakdowns([]);
      }
    } catch (err) {
      if (seq !== costingSeqRef.current) return;
      console.error('Failed to load production costing summary:', err);
      setCostingData(null);
      setShiftBreakdowns([]);
      setCostingError(
        getApiMessage(
          err?.apiResponse,
          err,
          'Failed to load production costing summary.'
        )
      );
    } finally {
      if (seq === costingSeqRef.current) {
        setLoadingCosting(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanId, effectiveMealKey, requestSingleCosting, mergeDiscoveredMealsIntoPlan]);

  useEffect(() => {
    if (!loadingPlans && selectedPlanId) {
      fetchCostingSummary();
    }
  }, [loadingPlans, selectedPlanId, fetchCostingSummary]);

  // Populate shift-by-shift comparison in Analytics view if Whole Day response didn't embed shifts
  useEffect(() => {
    if (
      viewMode !== 'analytics' ||
      !activePlan?.id ||
      shiftBreakdowns.length > 0 ||
      !activePlan.meals?.length
    ) {
      return;
    }
    let cancelled = false;
    const loadShiftMatrix = async () => {
      const results = await Promise.all(
        activePlan.meals.map((m) =>
          Number(m.mealTypeId) === Number(effectiveMealKey) && costingData
            ? Promise.resolve(costingData)
            : requestSingleCosting(activePlan, m.mealTypeId, m.mealTypeName).catch(
                () => null
              )
        )
      );
      if (!cancelled) {
        setShiftBreakdowns(results.filter(Boolean));
      }
    };
    loadShiftMatrix();
    return () => {
      cancelled = true;
    };
  }, [
    viewMode,
    activePlan,
    shiftBreakdowns.length,
    effectiveMealKey,
    costingData,
    requestSingleCosting,
  ]);

  const handlePlanChange = (nextPlanId) => {
    setSelectedPlanId(nextPlanId);
    const nextPlan = plans.find((p) => String(p.id) === String(nextPlanId));
    if (selectedMealKey !== WHOLE_DAY_KEY && nextPlan?.meals?.length > 0) {
      const stillExists = nextPlan.meals.some(
        (m) => String(m.mealTypeId) === String(selectedMealKey)
      );
      if (!stillExists) {
        setSelectedMealKey(WHOLE_DAY_KEY);
      }
    }
  };

  const displayPlanCode =
    costingData?.planCode || activePlan?.planCode || (selectedPlanId ? `PP-${selectedPlanId}` : '—');
  const displayDate = formatDateDisplay(
    costingData?.productionDate || activePlan?.productionDate
  );
  const displayKitchen =
    costingData?.kitchenName || activePlan?.kitchenName || '—';
  const isWholeDay = effectiveMealKey === WHOLE_DAY_KEY;
  const activeShiftLabel = activeMealTab?.label || costingData?.mealTypeName || 'Whole Day';

  const wholeDayComparisonTotal = useMemo(() => {
    if (isWholeDay && costingData) return costingData;
    if (shiftBreakdowns.length === 0 || !activePlan) return null;
    return aggregateCostingSummaries(shiftBreakdowns, {
      productionPlanId: Number(activePlan.id),
      planCode: displayPlanCode,
      productionDate: costingData?.productionDate || activePlan.productionDate,
      kitchenName: displayKitchen,
    });
  }, [isWholeDay, costingData, shiftBreakdowns, activePlan, displayPlanCode, displayKitchen]);

  const handleExportCSV = () => {
    if (!costingData) return;
    const rows = [
      ['Plan Code', displayPlanCode],
      ['Production Date', displayDate],
      ['Kitchen', displayKitchen],
      ['Meal / Shift', activeShiftLabel],
      ['Planned Pax', costingData.plannedPax],
      ['Actual Pax', costingData.actualPax],
      ['Planned Cost / Pax (INR)', costingData.plannedCostPerPax.toFixed(2)],
      ['Actual Cost / Pax (INR)', costingData.actualCostPerPax.toFixed(2)],
      ['Gross Production Cost (INR)', costingData.grossProductionCost.toFixed(2)],
      ['Net Meal Consumption Cost (INR)', costingData.netMealConsumptionCost.toFixed(2)],
      [],
      ['RECIPE COSTING BREAKDOWN'],
      ['Recipe Name', 'Planned Qty', 'Actual Cooked Qty', 'Unit', 'Rate (INR)', 'Total Recipe Cost (INR)', 'Portion Cost (INR)'],
      ...costingData.recipes.map((r) => [
        `"${r.recipeName}"`,
        r.plannedQty.toFixed(2),
        r.actualCookedQty.toFixed(2),
        r.uom,
        r.ratePerUnit.toFixed(2),
        r.totalRecipeCost.toFixed(2),
        r.portionCost.toFixed(2),
      ]),
      [],
      ['RAW MATERIAL CONSUMPTION'],
      ['Material Name', 'Required Qty', 'Actual Used Qty', 'Prep Waste Qty', 'Unit', 'Unit Rate (INR)', 'Total Cost (INR)'],
      ...costingData.rawMaterials.map((m) => [
        `"${m.materialName}"`,
        m.requiredQty.toFixed(2),
        m.actualUsedQty.toFixed(2),
        m.prepWasteQty.toFixed(2),
        m.uom,
        m.unitRate.toFixed(2),
        m.totalCost.toFixed(2),
      ]),
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Production_Costing_${displayPlanCode}_${activeShiftLabel.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify.success('Production costing report exported.');
  };

  const filteredModalRecipes = useMemo(() => {
    const list = costingData?.recipes || [];
    const term = modalSearch.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (r) =>
        r.recipeName.toLowerCase().includes(term) ||
        (r.category || '').toLowerCase().includes(term)
    );
  }, [costingData?.recipes, modalSearch]);

  const filteredModalMaterials = useMemo(() => {
    const list = costingData?.rawMaterials || [];
    const term = modalSearch.trim().toLowerCase();
    if (!term) return list;
    return list.filter((m) => m.materialName.toLowerCase().includes(term));
  }, [costingData?.rawMaterials, modalSearch]);

  const costCompositionPcts = useMemo(() => {
    if (!costingData || costingData.grossProductionCost <= 0) {
      return { rmPct: 0, prepPct: 0, dispPct: 0 };
    }
    const g = costingData.grossProductionCost;
    return {
      rmPct: Number(((costingData.rawMaterialCost / g) * 100).toFixed(1)),
      prepPct: Number(((costingData.prepWasteCost / g) * 100).toFixed(1)),
      dispPct: Number(((costingData.disposablesCost / g) * 100).toFixed(1)),
    };
  }, [costingData]);

  return (
    <Container>
      <div className="space-y-4 pb-14 pt-2">
        {/* Header Bar */}
        <PageHeader
          title={
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center border border-blue-100">
                <ChefHat size={18} />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Production Costing
                </h1>
                <p className="text-xs text-slate-500 font-normal">
                  Analyze production cost, consumption and efficiency for selected production plan.
                </p>
              </div>
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Plan Selector Pill */}
              <div className="flex items-center gap-2 bg-white border border-[#E7EAF0] rounded-xl px-2.5 py-1.5 shadow-2xs">
                <FileText size={14} className="text-[#084E92] shrink-0" />
                <div className="min-w-36">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none">
                    Plan Code
                  </span>
                  <Select
                    value={selectedPlanId}
                    onValueChange={handlePlanChange}
                    disabled={loadingPlans || plans.length === 0}
                  >
                    <SelectTrigger className="h-5 border-0 p-0 text-xs font-bold text-slate-900 shadow-none focus:ring-0">
                      <SelectValue
                        placeholder={loadingPlans ? 'Loading plans...' : 'Select Plan'}
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {plans.map((plan) => (
                        <SelectItem
                          key={plan.id}
                          value={String(plan.id)}
                          className="text-xs"
                        >
                          {plan.planCode}
                          {plan.productionDate ? ` (${formatDateDisplay(plan.productionDate)})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Production Date Pill */}
              <div className="flex items-center gap-2 bg-white border border-[#E7EAF0] rounded-xl px-3 py-1.5 shadow-2xs">
                <Calendar size={14} className="text-[#084E92] shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none">
                    Production Date
                  </span>
                  <span className="text-xs font-bold text-slate-900">{displayDate}</span>
                </div>
              </div>

              {/* Kitchen Pill */}
              <div className="flex items-center gap-2 bg-white border border-[#E7EAF0] rounded-xl px-3 py-1.5 shadow-2xs">
                <Building2 size={14} className="text-[#084E92] shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none">
                    Kitchen
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate max-w-44 block">
                    {displayKitchen}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchCostingSummary}
                disabled={loadingCosting || !activePlan}
                title="Refresh Costing Data"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={loadingCosting ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={!costingData}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                <Download size={13} />
                Export
              </button>

              <button
                type="button"
                onClick={() => navigate('/production/plans')}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <ArrowLeft size={13} />
                Back to List
              </button>
            </div>
          }
        />

        <PageErrorAlert error={plansError} onRetry={loadPlansAndMeals} className="mb-2" />
        <PageErrorAlert error={costingError} onRetry={fetchCostingSummary} className="mb-2" />

        {/* Meal Tabs + Display Mode Switcher */}
        {activePlan && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Meal Tabs according to Selected Production Plan */}
            <div className="flex flex-wrap items-center gap-2">
              {mealTabs.map((tab) => {
                const isActive = effectiveMealKey === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    disabled={loadingCosting}
                    onClick={() => setSelectedMealKey(tab.key)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border disabled:opacity-60 ${
                      isActive
                        ? 'bg-[#084E92] text-white border-[#084E92] shadow-xs'
                        : 'bg-white text-slate-600 border-[#E7EAF0] hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Alternative View Switcher */}
            <div className="p-1 bg-slate-100 rounded-xl inline-flex items-center border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('summary')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'summary'
                    ? 'bg-white text-[#084E92] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid size={13} />
                Summary &amp; Cost Flow
              </button>
              <button
                type="button"
                onClick={() => setViewMode('analytics')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'analytics'
                    ? 'bg-white text-[#084E92] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <BarChart3 size={13} />
                Analytics &amp; Comparison
              </button>
            </div>
          </div>
        )}

        {/* Loading / Empty States */}
        {(loadingPlans || (loadingCosting && !costingData)) && (
          <div className="bg-white border border-[#E7EAF0] rounded-2xl py-20 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
            <Loader2 size={24} className="animate-spin text-[#084E92]" />
            <span>
              {loadingPlans
                ? 'Loading production plans and meal types...'
                : `Loading ${activeShiftLabel} costing summary...`}
            </span>
          </div>
        )}

        {!loadingPlans && plans.length === 0 && !plansError && (
          <div className="bg-white border border-[#E7EAF0] rounded-2xl py-16 px-6 text-center space-y-2">
            <ChefHat size={28} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No Production Plans Available</h3>
            <p className="text-xs text-slate-500">
              Create or execute a production plan to view production costing analytics.
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1: SUMMARY & COST FLOW (Cards, Equation, Tables, Insights) */}
        {/* ============================================================ */}
        {costingData && viewMode === 'summary' && (
          <div className={`space-y-4 transition-opacity ${loadingCosting ? 'opacity-60' : ''}`}>
            {/* Top 4 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Card 1: Planned & Actual Pax */}
              <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
                    <Users size={16} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {costingData.plannedPax > 0
                      ? `${Math.round((costingData.actualPax / costingData.plannedPax) * 100)}% Attendance`
                      : 'Attendance'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Planned Pax</span>
                    <span className="text-xl font-black text-slate-900">
                      {costingData.plannedPax.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Actual Pax</span>
                    <span className="text-xl font-black text-slate-900">
                      {costingData.actualPax.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Cost per Pax */}
              <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
                    <Scale size={14} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Cost per Pax</span>
                </div>
                <div className="flex items-end justify-between gap-2 flex-wrap">
                  <div className="flex items-baseline gap-4">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Planned</span>
                      <span className="text-base font-extrabold text-slate-900">
                        {formatINR(costingData.plannedCostPerPax)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Actual</span>
                      <span className="text-base font-extrabold text-slate-900">
                        {formatINR(costingData.actualCostPerPax)}
                      </span>
                    </div>
                  </div>
                  <VarianceBadge
                    pct={costingData.costVariancePct}
                    diff={costingData.costDiffPerPax}
                  />
                </div>
              </div>

              {/* Card 3: Food Production & Consumption */}
              <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
                    <Utensils size={14} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Food Production &amp; Consumption
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Produced</span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {formatQty(costingData.producedKg)} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Leftover</span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {formatQty(costingData.leftoverKg)} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Plate Waste</span>
                    <span className="text-xs font-extrabold text-rose-600">
                      {formatQty(costingData.plateWasteKg)} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Consumed</span>
                    <span className="text-xs font-extrabold text-emerald-700">
                      {formatQty(costingData.consumedKg)} kg
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Per Person Intake */}
              <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
                    <Layers size={14} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Per Person Intake</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Food</span>
                    <span className="text-lg font-black text-slate-900">
                      {formatQty(costingData.perPersonFoodG)} g
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Waste</span>
                    <span className="text-lg font-black text-slate-900">
                      {formatQty(costingData.perPersonWasteG)} g
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Breakdown Equation Strip */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#084E92]" />
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                    Cost Breakdown
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {activeShiftLabel} • Formula: Gross − Leftover Credit + Wastage Loss = Net Meal Cost
                </span>
              </div>

              <div className="flex flex-wrap xl:flex-nowrap items-center gap-2">
                <div className="flex-1 min-w-28 bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-center">
                  <span className="text-sm font-extrabold text-slate-900 block">
                    {formatINR(costingData.rawMaterialCost)}
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    Raw Material Cost
                  </span>
                </div>

                <span className="text-base font-bold text-slate-400 px-0.5">+</span>

                <div className="flex-1 min-w-28 bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-center">
                  <span className="text-sm font-extrabold text-slate-900 block">
                    {formatINR(costingData.prepWasteCost)}
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    Prep Waste Cost
                  </span>
                </div>

                <span className="text-base font-bold text-slate-400 px-0.5">+</span>

                <div className="flex-1 min-w-28 bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-center">
                  <span className="text-sm font-extrabold text-slate-900 block">
                    {formatINR(costingData.disposablesCost)}
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    Disposables Cost
                  </span>
                </div>

                <span className="text-base font-bold text-slate-400 px-0.5">=</span>

                <div className="flex-1 min-w-36 bg-[#084E92] text-white rounded-xl p-3 text-center shadow-xs">
                  <span className="text-sm sm:text-base font-black block">
                    {formatINR(costingData.grossProductionCost)}
                  </span>
                  <span className="text-[11px] text-blue-100 font-medium">
                    Gross Production Cost
                  </span>
                </div>

                <span className="text-base font-bold text-slate-400 px-0.5">−</span>

                <div className="flex-1 min-w-28 bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-center">
                  <span className="text-sm font-extrabold text-emerald-700 block">
                    {formatINR(costingData.leftoverReusedCredit)}
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    Leftover Reused Credit
                  </span>
                </div>

                <span className="text-base font-bold text-slate-400 px-0.5">+</span>

                <div className="flex-1 min-w-28 bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-center">
                  <span className="text-sm font-extrabold text-rose-600 block">
                    {formatINR(costingData.leftoverWastageLoss)}
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    Leftover Wastage Loss
                  </span>
                </div>

                <span className="text-base font-bold text-slate-400 px-0.5">=</span>

                <div className="flex-1 min-w-40 bg-[#084E92] text-white rounded-xl p-3 text-center shadow-xs">
                  <span className="text-sm sm:text-base font-black block">
                    {formatINR(costingData.netMealConsumptionCost)}
                  </span>
                  <span className="text-[11px] text-blue-100 font-medium">
                    Net Meal Consumption Cost
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Split Tables: Recipe Costing Breakdown + Raw Material Consumption */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Recipe Costing Breakdown */}
              <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-2xs flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <Utensils size={15} className="text-[#084E92]" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Recipe Costing Breakdown
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={costingData.recipes.length === 0}
                    onClick={() => {
                      setModalSearch('');
                      setDetailModal('recipes');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <Eye size={12} className="text-[#084E92]" />
                    View Details
                  </button>
                </div>

                <div className="border border-slate-200/80 rounded-xl overflow-x-auto flex-1">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                        <th className="py-2.5 px-3">Recipe Name</th>
                        <th className="py-2.5 px-3 text-right">Planned Qty</th>
                        <th className="py-2.5 px-3 text-right">Actual Cooked Qty</th>
                        <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total Recipe Cost (₹)</th>
                        <th className="py-2.5 px-3 text-right">Portion Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {costingData.recipes.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No recipe costing entries recorded for {activeShiftLabel}.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {costingData.recipes.map((r, idx) => (
                            <tr key={`${r.id}-${idx}`} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                <span>{r.recipeName}</span>
                                {isWholeDay && r.shiftName && (
                                  <span className="block text-[10px] text-slate-400 font-medium">
                                    {r.shiftName}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                {formatQty(r.plannedQty)} {r.uom}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                {formatQty(r.actualCookedQty)} {r.uom}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-500 whitespace-nowrap">
                                {formatQty(r.ratePerUnit)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                                {r.totalRecipeCost.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                                {formatQty(r.portionCost)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-blue-50/60 font-bold text-slate-900 border-t border-slate-200">
                            <td className="py-2.5 px-3">Total</td>
                            <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                            <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                            <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                            <td className="py-2.5 px-3 text-right text-[#084E92] whitespace-nowrap">
                              {formatINR(costingData.totalRecipeCostSum)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#084E92] whitespace-nowrap">
                              {formatINR(costingData.totalPortionCostSum)}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Raw Material Consumption */}
              <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-2xs flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <Leaf size={15} className="text-emerald-600" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Raw Material Consumption
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={costingData.rawMaterials.length === 0}
                    onClick={() => {
                      setModalSearch('');
                      setDetailModal('materials');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <Eye size={12} className="text-[#084E92]" />
                    View Details
                  </button>
                </div>

                <div className="border border-slate-200/80 rounded-xl overflow-x-auto flex-1">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                        <th className="py-2.5 px-3">Material Name</th>
                        <th className="py-2.5 px-3 text-right">Required Qty</th>
                        <th className="py-2.5 px-3 text-right">Actual Used Qty</th>
                        <th className="py-2.5 px-3 text-right">Prep Waste Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {costingData.rawMaterials.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No raw material consumption entries recorded for {activeShiftLabel}.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {costingData.rawMaterials.map((m, idx) => (
                            <tr key={`${m.id}-${idx}`} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {m.materialName}{' '}
                                <span className="text-[10px] font-normal text-slate-400">
                                  ({m.uom})
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">{formatQty(m.requiredQty)}</td>
                              <td className="py-2.5 px-3 text-right">{formatQty(m.actualUsedQty)}</td>
                              <td className="py-2.5 px-3 text-right">{formatQty(m.prepWasteQty)}</td>
                              <td className="py-2.5 px-3 text-right">{formatQty(m.unitRate)}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                {m.totalCost.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-blue-50/60 font-bold text-slate-900 border-t border-slate-200">
                            <td colSpan={5} className="py-2.5 px-3">
                              Total
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#084E92] whitespace-nowrap">
                              {formatINR(costingData.totalRawMaterialCostSum)}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Key Insights Footer */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-[#084E92]" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Key Insights</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      costingData.costVariancePct <= 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Cost Variance
                    </span>
                    <span
                      className={`text-sm font-black block ${
                        costingData.costVariancePct <= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {costingData.costVariancePct > 0 ? '+' : ''}
                      {costingData.costVariancePct.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({costingData.costDiffPerPax > 0 ? '+' : ''}
                      {formatINR(costingData.costDiffPerPax)} per pax)
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                    <Utensils size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Food Consumption
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {formatQty(costingData.perPersonFoodG)} g{' '}
                      <span className="text-xs font-medium text-slate-500">per person</span>
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                    <Trash2 size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Plate Waste
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {formatQty(costingData.perPersonWasteG)} g{' '}
                      <span className="text-xs font-medium text-slate-500">per person</span>
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                    <Info size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Net Meal Cost
                    </span>
                    <span className="text-base font-black text-[#084E92]">
                      {formatINR(costingData.netMealConsumptionCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: ANALYTICS & COMPARISON (Alternative Display Mode) */}
        {/* ============================================================ */}
        {costingData && viewMode === 'analytics' && (
          <div className={`space-y-4 transition-opacity ${loadingCosting ? 'opacity-60' : ''}`}>
            {/* Cost Composition Bar */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Gross Cost Composition ({activeShiftLabel})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Proportional share of raw materials, prep waste, and disposables against gross cost ({formatINR(costingData.grossProductionCost)}).
                  </p>
                </div>
                <VarianceBadge
                  pct={costingData.costVariancePct}
                  diff={costingData.costDiffPerPax}
                />
              </div>

              <div className="w-full h-5 rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
                <div
                  className="bg-[#084E92] h-full transition-all"
                  style={{ width: `${costCompositionPcts.rmPct}%` }}
                  title={`Raw Material: ${costCompositionPcts.rmPct}%`}
                />
                <div
                  className="bg-amber-500 h-full transition-all"
                  style={{ width: `${costCompositionPcts.prepPct}%` }}
                  title={`Prep Waste: ${costCompositionPcts.prepPct}%`}
                />
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${costCompositionPcts.dispPct}%` }}
                  title={`Disposables: ${costCompositionPcts.dispPct}%`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                  <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#084E92]" />
                    Raw Materials ({costCompositionPcts.rmPct}%)
                  </span>
                  <span className="text-sm font-black text-slate-900 mt-1 block">
                    {formatINR(costingData.rawMaterialCost)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                  <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Prep Waste ({costCompositionPcts.prepPct}%)
                  </span>
                  <span className="text-sm font-black text-slate-900 mt-1 block">
                    {formatINR(costingData.prepWasteCost)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Disposables ({costCompositionPcts.dispPct}%)
                  </span>
                  <span className="text-sm font-black text-slate-900 mt-1 block">
                    {formatINR(costingData.disposablesCost)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block">
                    Leftover Reused Credit (−)
                  </span>
                  <span className="text-sm font-black text-emerald-700 mt-1 block">
                    −{formatINR(costingData.leftoverReusedCredit)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block">
                    Leftover Wastage Loss (+)
                  </span>
                  <span className="text-sm font-black text-rose-600 mt-1 block">
                    +{formatINR(costingData.leftoverWastageLoss)}
                  </span>
                </div>
              </div>
            </div>

            {/* Shift-by-Shift Comparison Matrix */}
            {shiftBreakdowns.length > 0 && (
              <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-2xs space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Shift-by-Shift Cost &amp; Efficiency Comparison
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click any meal row to inspect its Summary &amp; Cost Flow breakdown.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                        <th className="py-2.5 px-3">Meal Shift</th>
                        <th className="py-2.5 px-3 text-right">Planned / Actual Pax</th>
                        <th className="py-2.5 px-3 text-right">Produced (kg)</th>
                        <th className="py-2.5 px-3 text-right">Consumed (kg)</th>
                        <th className="py-2.5 px-3 text-right">Gross Cost</th>
                        <th className="py-2.5 px-3 text-right">Net Meal Cost</th>
                        <th className="py-2.5 px-3 text-right">Planned / Actual / Pax</th>
                        <th className="py-2.5 px-3 text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shiftBreakdowns.map((sh, idx) => {
                        const rowKey = sh.mealTypeId ? String(sh.mealTypeId) : sh.mealTypeName;
                        const isCurrent =
                          (sh.mealTypeId && String(sh.mealTypeId) === String(effectiveMealKey)) ||
                          activeShiftLabel === sh.mealTypeName;
                        return (
                          <tr
                            key={`${rowKey}-${idx}`}
                            onClick={() => {
                              if (sh.mealTypeId) {
                                setSelectedMealKey(String(sh.mealTypeId));
                              }
                            }}
                            className={`cursor-pointer transition ${
                              isCurrent ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-bold text-[#084E92]">
                              {sh.mealTypeName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold">
                              {sh.plannedPax} / {sh.actualPax}
                            </td>
                            <td className="py-2.5 px-3 text-right">{formatQty(sh.producedKg)}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                              {formatQty(sh.consumedKg)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold">
                              {formatINR(sh.grossProductionCost)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatINR(sh.netMealConsumptionCost)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {formatINR(sh.plannedCostPerPax)} /{' '}
                              <strong>{formatINR(sh.actualCostPerPax)}</strong>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <VarianceBadge pct={sh.costVariancePct} />
                            </td>
                          </tr>
                        );
                      })}
                      {wholeDayComparisonTotal && (
                        <tr
                          onClick={() => setSelectedMealKey(WHOLE_DAY_KEY)}
                          className="bg-blue-50/80 font-bold text-slate-900 border-t border-slate-200 cursor-pointer"
                        >
                          <td className="py-2.5 px-3 text-[#084E92]">Whole Day Total</td>
                          <td className="py-2.5 px-3 text-right">
                            {wholeDayComparisonTotal.plannedPax} / {wholeDayComparisonTotal.actualPax}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatQty(wholeDayComparisonTotal.producedKg)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-700">
                            {formatQty(wholeDayComparisonTotal.consumedKg)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatINR(wholeDayComparisonTotal.grossProductionCost)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#084E92]">
                            {formatINR(wholeDayComparisonTotal.netMealConsumptionCost)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatINR(wholeDayComparisonTotal.plannedCostPerPax)} /{' '}
                            {formatINR(wholeDayComparisonTotal.actualCostPerPax)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <VarianceBadge pct={wholeDayComparisonTotal.costVariancePct} />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Cost Drivers: Top Recipes & Top Raw Materials Share Bars */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Recipe Cost Drivers ({activeShiftLabel})
                </h3>
                {costingData.recipes.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No recipe cost drivers for {activeShiftLabel}.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[...costingData.recipes]
                      .sort((a, b) => b.totalRecipeCost - a.totalRecipeCost)
                      .map((r, idx) => (
                        <div key={`${r.id}-${idx}`} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">
                              {r.recipeName}
                              {isWholeDay && r.shiftName ? ` (${r.shiftName})` : ''}
                            </span>
                            <span className="font-bold text-slate-900">
                              {formatINR(r.totalRecipeCost)}{' '}
                              <span className="text-[11px] font-medium text-[#084E92]">
                                ({r.costSharePct}%)
                              </span>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#084E92] rounded-full"
                              style={{ width: `${Math.min(100, r.costSharePct)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Raw Material Cost Drivers ({activeShiftLabel})
                </h3>
                {costingData.rawMaterials.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No raw material cost drivers for {activeShiftLabel}.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[...costingData.rawMaterials]
                      .sort((a, b) => b.totalCost - a.totalCost)
                      .map((m, idx) => (
                        <div key={`${m.id}-${idx}`} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">
                              {m.materialName}{' '}
                              <span className="text-[11px] text-slate-400">
                                ({formatQty(m.actualUsedQty)} {m.uom})
                              </span>
                            </span>
                            <span className="font-bold text-slate-900">
                              {formatINR(m.totalCost)}{' '}
                              <span className="text-[11px] font-medium text-emerald-700">
                                ({m.costSharePct}%)
                              </span>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${Math.min(100, m.costSharePct)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* DETAILS MODAL (Recipe Breakdown or Raw Material Consumption) */}
        {/* ============================================================ */}
        {detailModal && costingData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {detailModal === 'recipes'
                      ? `Recipe Costing Breakdown — ${activeShiftLabel}`
                      : `Raw Material Consumption Details — ${activeShiftLabel}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {displayPlanCode} • {displayDate} • {displayKitchen}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                <div className="relative w-full max-w-xs">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder={
                      detailModal === 'recipes'
                        ? 'Search recipe or category...'
                        : 'Search raw material...'
                    }
                    className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#C3C6D1] bg-white text-xs focus:outline-none focus:border-[#084E92]"
                  />
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {detailModal === 'recipes'
                    ? `${filteredModalRecipes.length} Recipes`
                    : `${filteredModalMaterials.length} Materials`}
                </span>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {detailModal === 'recipes' ? (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                          <th className="py-2.5 px-3">Recipe</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-right">Planned</th>
                          <th className="py-2.5 px-3 text-right">Actual</th>
                          <th className="py-2.5 px-3 text-right">Variance</th>
                          <th className="py-2.5 px-3 text-right">Rate</th>
                          <th className="py-2.5 px-3 text-right">Total Cost</th>
                          <th className="py-2.5 px-3 text-right">Cost / Pax</th>
                          <th className="py-2.5 px-3 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredModalRecipes.map((r, idx) => (
                          <tr key={`${r.id}-${idx}`} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {r.recipeName}
                              {isWholeDay && r.shiftName ? ` (${r.shiftName})` : ''}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{r.category || '—'}</td>
                            <td className="py-2.5 px-3 text-right">
                              {formatQty(r.plannedQty)} {r.uom}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold">
                              {formatQty(r.actualCookedQty)} {r.uom}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-semibold ${
                                r.qtyVariance > 0
                                  ? 'text-amber-600'
                                  : r.qtyVariance < 0
                                    ? 'text-emerald-700'
                                    : 'text-slate-400'
                              }`}
                            >
                              {r.qtyVariance > 0 ? `+${formatQty(r.qtyVariance)}` : formatQty(r.qtyVariance)}{' '}
                              {r.uom}
                            </td>
                            <td className="py-2.5 px-3 text-right">{formatINR(r.ratePerUnit)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatINR(r.totalRecipeCost)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-[#084E92]">
                              {formatINR(r.portionCost)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600">
                              {r.costSharePct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                          <th className="py-2.5 px-3">Raw Material</th>
                          <th className="py-2.5 px-3 text-right">Required</th>
                          <th className="py-2.5 px-3 text-right">Actual Used</th>
                          <th className="py-2.5 px-3 text-right">Variance</th>
                          <th className="py-2.5 px-3 text-right">Prep Waste</th>
                          <th className="py-2.5 px-3 text-right">Waste Cost</th>
                          <th className="py-2.5 px-3 text-right">Unit Rate</th>
                          <th className="py-2.5 px-3 text-right">Total Cost</th>
                          <th className="py-2.5 px-3 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredModalMaterials.map((m, idx) => (
                          <tr key={`${m.id}-${idx}`} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {m.materialName} ({m.uom})
                            </td>
                            <td className="py-2.5 px-3 text-right">{formatQty(m.requiredQty)}</td>
                            <td className="py-2.5 px-3 text-right font-semibold">
                              {formatQty(m.actualUsedQty)}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-semibold ${
                                m.qtyVariance > 0
                                  ? 'text-rose-600'
                                  : m.qtyVariance < 0
                                    ? 'text-emerald-700'
                                    : 'text-slate-400'
                              }`}
                            >
                              {m.qtyVariance > 0 ? `+${formatQty(m.qtyVariance)}` : formatQty(m.qtyVariance)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-amber-700">
                              {formatQty(m.prepWasteQty)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-rose-600">
                              {formatINR(m.prepWasteCost)}
                            </td>
                            <td className="py-2.5 px-3 text-right">{formatINR(m.unitRate)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatINR(m.totalCost)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600">
                              {m.costSharePct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

export default ProductionCosting;
