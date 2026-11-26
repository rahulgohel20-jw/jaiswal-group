import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  UtensilsCrossed,
  Scale,
  Save,
  CheckCircle2,
  Edit3,
  Check,
  Loader2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { KpiCard } from '@/components/production/KpiCard';
import { StatusBadge } from '@/components/production/StatusBadge';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { getUserIdFromToken } from '@/utils/auth';
import { notify } from '@/utils/toast';
import {
  getAllMealTypes,
  getProductionExecution,
  saveProductionExecutionItem,
  saveProductionExecutionDraft,
  completeProductionExecution,
} from '@/services/apiServices';

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

const TIME_FORMAT_REGEX = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '—';
  const str = String(dateStr).split('T')[0];
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return str;
};

const mapRecipeItem = (r) => ({
  ...r,
  itemId: Number(r.itemId ?? r.id),
  actualQuantity: r.actualQuantity ?? r.plannedQuantity ?? 0,
  batchNumber: r.batchNumber ?? '',
  preparationWaste: r.preparationWaste ?? 0,
  cookingLoss: r.cookingLoss ?? 0,
  qualityCheck: (r.qualityCheck || 'PASSED').toUpperCase(),
  completionTime: r.completionTime ?? '',
  remarks: r.remarks ?? '',
  plannedQuantity: Number(r.plannedQuantity ?? 0),
  yieldPct: r.yieldPct ?? 0,
  status: (r.status || 'NOT_STARTED').toUpperCase(),
  isStockCredited: Boolean(r.isStockCredited),
  isActualAdjusted: Boolean(r.isActualAdjusted),
  uomSymbol: r.uomSymbol || 'kg',
});

export const ProductionExecution = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const resolvedPlanId = Number(
    params.productionPlanId || params.planId || location.state?.productionPlanId || 1
  );

  const initialMealTypeParam = searchParams.get('mealTypeId');
  const [selectedMealTypeId, setSelectedMealTypeId] = useState(() => {
    if (initialMealTypeParam !== null && initialMealTypeParam !== '') {
      return String(initialMealTypeParam);
    }
    if (location.state?.mealTypeId) {
      return String(location.state.mealTypeId);
    }
    return '';
  });

  const [mealTypes, setMealTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Server data
  const [productionContext, setProductionContext] = useState({});
  const [progressSummary, setProgressSummary] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [productionNotes, setProductionNotes] = useState('');
  const [planStatus, setPlanStatus] = useState('NOT_STARTED');

  // Local editing state
  const [expandedId, setExpandedId] = useState(null);
  const [changedItemIds, setChangedItemIds] = useState(new Set());
  const [notesDirty, setNotesDirty] = useState(false);

  // Per-action loading flags (prevent double clicks)
  const [savingItemIds, setSavingItemIds] = useState(new Set());
  const [savingDraft, setSavingDraft] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Confirmation modals
  const [pendingMealTypeSwitch, setPendingMealTypeSwitch] = useState(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const fetchSeqRef = useRef(0);

  // Load Meal Types lookup
  useEffect(() => {
    let isMounted = true;
    const loadMealTypes = async () => {
      try {
        const res = await getAllMealTypes();
        const data = res?.data?.data ?? res?.data ?? [];
        const list = Array.isArray(data) ? data : data?.items || [];
        if (isMounted) setMealTypes(list);
      } catch (err) {
        console.error('Failed to load meal types:', err);
      }
    };
    loadMealTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch execution payload (4.1)
  const fetchExecution = useCallback(
    async (mealTypeOverride = selectedMealTypeId) => {
      if (!resolvedPlanId) return;
      const seq = ++fetchSeqRef.current;
      setLoading(true);
      setError(null);

      try {
        const payload = {
          productionPlanId: Number(resolvedPlanId),
          mealTypeId: mealTypeOverride ? Number(mealTypeOverride) : null,
        };
        const res = await getProductionExecution(payload);
        if (seq !== fetchSeqRef.current) return;

        if (!isApiSuccess(res)) {
          const msg = getApiMessage(res, null, 'Failed to load production execution.');
          setError(msg);
          return;
        }

        const data = res?.data?.data ?? res?.data ?? {};
        const ctx = data.productionContext || {};
        const summary = data.progressSummary || {};
        const rawRecipes = Array.isArray(data.recipes) ? data.recipes : [];
        const mapped = rawRecipes.map(mapRecipeItem);

        setProductionContext(ctx);
        setProgressSummary(summary);
        setRecipes(mapped);
        setProductionNotes(data.productionNotes ?? '');
        setPlanStatus(String(data.status || ctx.status || 'NOT_STARTED').toUpperCase());
        setChangedItemIds(new Set());
        setNotesDirty(false);
        setExpandedId((prev) =>
          mapped.some((m) => m.itemId === prev) ? prev : mapped[0]?.itemId ?? null
        );
      } catch (err) {
        if (seq !== fetchSeqRef.current) return;
        console.error('Failed to fetch production execution:', err);
        setError(getApiMessage(null, err, 'Network error while loading production execution.'));
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [resolvedPlanId, selectedMealTypeId]
  );

  useEffect(() => {
    fetchExecution(selectedMealTypeId);
  }, [fetchExecution, selectedMealTypeId]);

  const isPlanCompleted = planStatus === 'COMPLETED';
  const isAllDayView = !selectedMealTypeId;

  const isRecipeReadOnly = (row) => {
    if (isPlanCompleted) return true;
    if (row.status === 'COMPLETED' && row.isActualAdjusted !== false) {
      return true;
    }
    return false;
  };

  const toggleExpand = (itemId) => {
    setExpandedId((prev) => (prev === itemId ? null : itemId));
  };

  const updateRecipeField = (itemId, field, value) => {
    setRecipes((prev) =>
      prev.map((r) => (r.itemId === itemId ? { ...r, [field]: value } : r))
    );
    setChangedItemIds((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  };

  // Switch Meal Type (warn if unsaved changes)
  const applyMealTypeSwitch = (nextMealTypeId) => {
    setSelectedMealTypeId(nextMealTypeId);
    const nextParams = new URLSearchParams(searchParams);
    if (nextMealTypeId) {
      nextParams.set('mealTypeId', nextMealTypeId);
    } else {
      nextParams.delete('mealTypeId');
    }
    setSearchParams(nextParams, { replace: true });
    setPendingMealTypeSwitch(null);
  };

  const handleMealTypeChange = (nextVal) => {
    if (nextVal === selectedMealTypeId) return;
    if (changedItemIds.size > 0 || notesDirty) {
      setPendingMealTypeSwitch(nextVal);
      return;
    }
    applyMealTypeSwitch(nextVal);
  };

  // Client-side validation for recipe save / mark complete
  const validateRecipeRow = (row, markComplete) => {
    const actual = Number(row.actualQuantity);
    const prepWaste = Number(row.preparationWaste);
    const cookLoss = Number(row.cookingLoss);

    if (row.actualQuantity === '' || Number.isNaN(actual) || actual < 0) {
      notify.error(`Actual quantity must be 0 or greater (${row.recipeName}).`);
      return false;
    }
    if (Number.isNaN(prepWaste) || prepWaste < 0) {
      notify.error(`Preparation waste must be 0 or greater (${row.recipeName}).`);
      return false;
    }
    if (Number.isNaN(cookLoss) || cookLoss < 0) {
      notify.error(`Cooking loss must be 0 or greater (${row.recipeName}).`);
      return false;
    }
    if (markComplete) {
      if (!String(row.batchNumber || '').trim()) {
        notify.error(`Batch number is required to mark "${row.recipeName}" complete.`);
        return false;
      }
      const timeStr = String(row.completionTime || '').trim();
      if (!timeStr) {
        notify.error(`Completion time is required to mark "${row.recipeName}" complete.`);
        return false;
      }
      if (!TIME_FORMAT_REGEX.test(timeStr)) {
        notify.error(
          `Completion time must be in hh:mm AM/PM format (e.g., 11:05 AM) for "${row.recipeName}".`
        );
        return false;
      }
    }
    return true;
  };

  // 4.2 Save single recipe (markComplete: true | false)
  const handleSaveItem = async (row, markComplete) => {
    if (isRecipeReadOnly(row)) return;
    if (savingItemIds.has(row.itemId)) return;
    if (!validateRecipeRow(row, markComplete)) return;

    setSavingItemIds((prev) => {
      const next = new Set(prev);
      next.add(row.itemId);
      return next;
    });

    try {
      const payload = {
        productionPlanId: Number(resolvedPlanId),
        itemId: Number(row.itemId),
        batchNumber: String(row.batchNumber || '').trim(),
        actualQuantity: Number(row.actualQuantity),
        preparationWaste: Number(row.preparationWaste) || 0,
        cookingLoss: Number(row.cookingLoss) || 0,
        qualityCheck: row.qualityCheck || 'PASSED',
        completionTime: String(row.completionTime || '').trim(),
        markComplete: Boolean(markComplete),
        remarks: String(row.remarks || '').trim(),
        userId: Number(getUserIdFromToken()) || 1,
      };

      const res = await saveProductionExecutionItem(payload);
      if (!isApiSuccess(res)) {
        notify.error(getApiMessage(res, null, 'Failed to save recipe batch.'));
        return;
      }

      notify.success(
        markComplete
          ? `${row.recipeName} marked as complete!`
          : `${row.recipeName} saved.`
      );

      setChangedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(row.itemId);
        return next;
      });

      // Refetch to get backend-computed yieldPct, actualUnitRate, status, and summary
      await fetchExecution(selectedMealTypeId);
    } catch (err) {
      console.error('Failed to save recipe batch:', err);
      notify.error(getApiMessage(null, err, 'Failed to save recipe batch.'));
    } finally {
      setSavingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(row.itemId);
        return next;
      });
    }
  };

  // 4.3 Save Draft (only changed items + notes)
  const handleSaveDraft = async () => {
    if (isPlanCompleted || savingDraft) return;
    if (changedItemIds.size === 0 && !notesDirty) {
      notify.info('No unsaved changes to save.');
      return;
    }

    const changedRows = recipes.filter((r) => changedItemIds.has(r.itemId) && !isRecipeReadOnly(r));
    for (const r of changedRows) {
      if (!validateRecipeRow(r, false)) return;
    }

    setSavingDraft(true);
    try {
      const payload = {
        productionPlanId: Number(resolvedPlanId),
        mealTypeId: selectedMealTypeId ? Number(selectedMealTypeId) : null,
        productionNotes: String(productionNotes || ''),
        userId: Number(getUserIdFromToken()) || 1,
        items: changedRows.map((r) => ({
          itemId: Number(r.itemId),
          batchNumber: String(r.batchNumber || '').trim(),
          actualQuantity: Number(r.actualQuantity) || 0,
          preparationWaste: Number(r.preparationWaste) || 0,
          cookingLoss: Number(r.cookingLoss) || 0,
          qualityCheck: r.qualityCheck || 'PASSED',
          completionTime: String(r.completionTime || '').trim(),
          // Preserve current recipe status; never mark COMPLETED via draft
          status: r.status === 'COMPLETED' ? 'COMPLETED' : r.status || 'IN_PROGRESS',
          remarks: String(r.remarks || '').trim(),
        })),
      };

      const res = await saveProductionExecutionDraft(payload);
      if (!isApiSuccess(res)) {
        notify.error(getApiMessage(res, null, 'Failed to save execution draft.'));
        return;
      }

      notify.success('Execution progress saved as draft.');
      setChangedItemIds(new Set());
      setNotesDirty(false);
      await fetchExecution(selectedMealTypeId);
    } catch (err) {
      console.error('Failed to save execution draft:', err);
      notify.error(getApiMessage(null, err, 'Failed to save execution draft.'));
    } finally {
      setSavingDraft(false);
    }
  };

  // 4.4 Complete Production
  const handleRequestComplete = () => {
    if (isPlanCompleted || completing) return;
    if (changedItemIds.size > 0 || notesDirty) {
      notify.error('Please save your unsaved changes before completing production.');
      return;
    }
    setShowCompleteConfirm(true);
  };

  const handleConfirmComplete = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      const payload = {
        productionPlanId: Number(resolvedPlanId),
        userId: Number(getUserIdFromToken()) || 1,
      };
      const res = await completeProductionExecution(payload);
      if (!isApiSuccess(res)) {
        notify.error(getApiMessage(res, null, 'Failed to complete production.'));
        return;
      }

      setShowCompleteConfirm(false);
      notify.success('Production completed and logged successfully!');
      await fetchExecution(selectedMealTypeId);
    } catch (err) {
      console.error('Failed to complete production:', err);
      notify.error(getApiMessage(null, err, 'Failed to complete production.'));
    } finally {
      setCompleting(false);
    }
  };

  // Summary metrics from backend (no client recalculation of yieldPct/rates)
  const recipesCount = progressSummary.recipesCount ?? recipes.length;
  const uomUnit = progressSummary.uomSymbol || 'kg';
  const plannedOutputQty = Number(progressSummary.plannedOutputQty ?? 0);
  const actualOutputQty = Number(progressSummary.actualOutputQty ?? 0);
  const overallProgress = Math.min(100, Math.max(0, Number(progressSummary.progressPct ?? 0)));
  const completedCount =
    progressSummary.completedCount ??
    progressSummary.completed ??
    recipes.filter((r) => r.status === 'COMPLETED').length;
  const inProgressCount =
    progressSummary.inProgressCount ??
    progressSummary.inProgress ??
    recipes.filter((r) => r.status === 'IN_PROGRESS').length;
  const notStartedCount =
    progressSummary.notStartedCount ??
    progressSummary.notStarted ??
    recipes.filter((r) => r.status === 'NOT_STARTED').length;

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        <PageHeader
          title="Production Execution"
          description="Record actual production quantity and complete kitchen batches."
          backTo="/production/execution"
          badge={
            <div className="flex items-center gap-2">
              <StatusBadge status={planStatus} />
              {isPlanCompleted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <Lock size={11} />
                  Read-Only
                </span>
              )}
            </div>
          }
          actions={
            !isPlanCompleted && (
              <div className="flex items-center gap-2">
                <HeaderActionButton
                  onClick={handleSaveDraft}
                  icon={savingDraft ? Loader2 : Save}
                  label={savingDraft ? 'Saving...' : 'Save Draft'}
                  variant="outline"
                  disabled={savingDraft || completing || loading}
                />
                <HeaderActionButton
                  onClick={handleRequestComplete}
                  icon={completing ? Loader2 : Check}
                  label={completing ? 'Completing...' : 'Complete Production'}
                  disabled={savingDraft || completing || loading}
                />
              </div>
            )
          }
        />

        <PageErrorAlert
          error={error}
          onRetry={() => fetchExecution(selectedMealTypeId)}
          className="my-2"
        />

        {loading && recipes.length === 0 ? (
          <div className="bg-white border border-[#E7EAF0] rounded-2xl py-20 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm">
            <Loader2 size={22} className="animate-spin text-[#084E92]" />
            <span>Loading production execution...</span>
          </div>
        ) : (
          <>
            {/* Plan Strip */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Plan Code
                  </span>
                  <span className="text-xs font-bold text-[#084E92] mt-0.5 block">
                    {productionContext.planCode || `PP-${resolvedPlanId}`}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Production Date
                  </span>
                  <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                    {formatDisplayDate(productionContext.productionDate)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Meal Type
                  </span>
                  <select
                    value={selectedMealTypeId}
                    onChange={(e) => handleMealTypeChange(e.target.value)}
                    disabled={loading}
                    className="w-full text-xs font-bold text-gray-900 bg-transparent outline-none cursor-pointer mt-0.5"
                  >
                    <option value="">All Day</option>
                    {mealTypes.map((mt) => (
                      <option key={mt.id} value={String(mt.id)}>
                        {mt.name || mt.mealTypeName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Kitchen
                  </span>
                  <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                    {productionContext.kitchenName || productionContext.kitchen || '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Supervisor
                  </span>
                  <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                    {productionContext.supervisorName || productionContext.supervisor || '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Start Time
                  </span>
                  <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                    {productionContext.startTime || '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Planned Completion
                  </span>
                  <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                    {productionContext.plannedCompletionTime || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Production Progress KPIs */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#084E92]" />
                Production Progress
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={UtensilsCrossed} label="Recipes" value={recipesCount} tone="default" />
                <KpiCard
                  icon={Scale}
                  label="Planned Output"
                  value={`${plannedOutputQty.toFixed(1)} ${uomUnit}`}
                  tone="default"
                />
                <KpiCard
                  icon={CheckCircle2}
                  label="Actual Output"
                  value={`${actualOutputQty.toFixed(1)} ${uomUnit}`}
                  tone="emerald"
                />
                <div className="p-4 rounded-2xl border border-[#E7EAF0] bg-white shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Progress</span>
                    <span className="text-xl font-bold text-[#084E92]">{overallProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className="bg-[#084E92] h-full rounded-full transition-all"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recipe Execution Table */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-gray-900">Recipe Execution</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#084E92] border border-blue-200">
                      {recipes.length} Recipes
                    </span>
                    {changedItemIds.size > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {changedItemIds.size} Unsaved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Record actual quantities for each recipe and track production progress.
                  </p>
                </div>

                {/* Counters pill */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    • {completedCount} Completed
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#084E92] border border-blue-200">
                    • {inProgressCount} In Progress
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                    • {notStartedCount} Not Started
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Recipe</th>
                      {isAllDayView && <th className="py-3 px-4">Meal Type</th>}
                      <th className="py-3 px-4">Planned Qty</th>
                      <th className="py-3 px-4">Actual Qty</th>
                      <th className="py-3 px-4">Variance</th>
                      <th className="py-3 px-4">Yield %</th>
                      <th className="py-3 px-4">Actual Rate</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recipes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isAllDayView ? 8 : 7}
                          className="py-12 text-center text-xs text-slate-400"
                        >
                          No recipes found for this production plan / meal type.
                        </td>
                      </tr>
                    ) : (
                      recipes.map((row) => {
                        const isExpanded = expandedId === row.itemId;
                        const rowReadOnly = isRecipeReadOnly(row);
                        const isSavingThis = savingItemIds.has(row.itemId);
                        const isDirty = changedItemIds.has(row.itemId);
                        const variance = Number(
                          ((Number(row.actualQuantity) || 0) - row.plannedQuantity).toFixed(2)
                        );
                        const unitLabel = row.uomSymbol || 'kg';

                        return (
                          <React.Fragment key={row.itemId}>
                            <tr
                              className={`hover:bg-slate-50/50 transition ${
                                isDirty ? 'bg-amber-50/20' : ''
                              }`}
                            >
                              <td className="py-3.5 px-4 font-bold text-gray-900">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(row.itemId)}
                                  className="inline-flex items-center gap-2 hover:text-[#084E92] cursor-pointer text-left"
                                >
                                  <span>{row.recipeName}</span>
                                  <span className="text-[10px] font-normal text-gray-400">
                                    {isExpanded ? '[-] Hide' : '[+] View'}
                                  </span>
                                </button>
                                {row.recipeCategoryName && (
                                  <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                                    {row.recipeCategoryName}
                                  </span>
                                )}
                              </td>
                              {isAllDayView && (
                                <td className="py-3.5 px-4">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-[#084E92] border border-blue-100">
                                    {row.mealTypeName || row.mealType || '—'}
                                  </span>
                                </td>
                              )}
                              <td className="py-3.5 px-4 font-semibold text-gray-700">
                                {row.plannedQuantity.toFixed(1)} {unitLabel}
                              </td>
                              <td className="py-3.5 px-4">
                                <div
                                  className={`inline-flex items-center h-8 px-2 rounded-lg border text-xs ${
                                    rowReadOnly
                                      ? 'bg-slate-100 border-slate-200 text-slate-600'
                                      : 'bg-white border-[#C3C6D1]'
                                  }`}
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    disabled={rowReadOnly}
                                    value={row.actualQuantity}
                                    onChange={(e) =>
                                      updateRecipeField(
                                        row.itemId,
                                        'actualQuantity',
                                        e.target.value === '' ? '' : Number(e.target.value)
                                      )
                                    }
                                    className="w-16 bg-transparent outline-none text-right font-bold text-gray-800 disabled:cursor-not-allowed"
                                  />
                                  <span className="ml-1 text-[11px] text-gray-400">{unitLabel}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-semibold">
                                <span
                                  className={
                                    variance < 0
                                      ? 'text-rose-600'
                                      : variance > 0
                                        ? 'text-emerald-700'
                                        : 'text-slate-500'
                                  }
                                >
                                  {variance > 0 ? `+${variance}` : variance} {unitLabel}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-gray-900">
                                {Number(row.yieldPct ?? 0).toFixed(1)}%
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-700">
                                ₹{Number(row.actualUnitRate ?? row.estimatedUnitRate ?? 0).toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <StatusBadge status={row.status} />
                                  {row.isStockCredited && (
                                    <span
                                      title="Stock adjusted"
                                      className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"
                                    >
                                      Stock Synced
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Update Recipe Batch Panel */}
                            {isExpanded && (
                              <tr className="bg-blue-50/30">
                                <td
                                  colSpan={isAllDayView ? 8 : 7}
                                  className="p-4 border-b border-blue-100"
                                >
                                  <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-2xs space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                                      <div className="flex items-center gap-2">
                                        <Edit3 size={15} className="text-[#084E92]" />
                                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                          Update Recipe Batch
                                        </h4>
                                        <span className="text-[11px] text-gray-400">
                                          {rowReadOnly
                                            ? 'Read-only (stock already adjusted)'
                                            : 'Record exact kitchen measurements and waste'}
                                        </span>
                                      </div>
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#084E92] border border-blue-200">
                                        {row.recipeName}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                      <div>
                                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                                          Batch Number <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                          type="text"
                                          disabled={rowReadOnly}
                                          value={row.batchNumber}
                                          onChange={(e) =>
                                            updateRecipeField(
                                              row.itemId,
                                              'batchNumber',
                                              e.target.value
                                            )
                                          }
                                          placeholder="e.g. BATCH-PP007-03"
                                          className="w-full h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-bold text-gray-700 disabled:bg-gray-50 disabled:cursor-not-allowed focus:border-[#084E92] focus:outline-none"
                                        />
                                      </div>

                                      <div>
                                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                                          Planned Quantity
                                        </label>
                                        <input
                                          type="text"
                                          readOnly
                                          value={`${row.plannedQuantity.toFixed(1)} ${unitLabel}`}
                                          className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 cursor-not-allowed"
                                        />
                                      </div>

                                      <div>
                                        <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                                          Actual Quantity <span className="text-rose-500">*</span>
                                        </label>
                                        <div
                                          className={`flex items-center h-9 px-3 rounded-xl border ${
                                            rowReadOnly
                                              ? 'bg-gray-50 border-gray-200'
                                              : 'bg-white border-[#084E92] ring-1 ring-[#084E92]'
                                          }`}
                                        >
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            disabled={rowReadOnly}
                                            value={row.actualQuantity}
                                            onChange={(e) =>
                                              updateRecipeField(
                                                row.itemId,
                                                'actualQuantity',
                                                e.target.value === '' ? '' : Number(e.target.value)
                                              )
                                            }
                                            className="w-full bg-transparent outline-none text-xs font-bold text-gray-900 disabled:cursor-not-allowed"
                                          />
                                          <span className="text-xs text-gray-400">{unitLabel}</span>
                                        </div>
                                      </div>

                                      <div>
                                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                                          Preparation Waste
                                        </label>
                                        <div className="flex items-center h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            disabled={rowReadOnly}
                                            value={row.preparationWaste}
                                            onChange={(e) =>
                                              updateRecipeField(
                                                row.itemId,
                                                'preparationWaste',
                                                e.target.value === '' ? '' : Number(e.target.value)
                                              )
                                            }
                                            className="w-full bg-transparent outline-none text-xs font-medium text-gray-800 disabled:cursor-not-allowed"
                                          />
                                          <span className="text-xs text-gray-400">{unitLabel}</span>
                                        </div>
                                      </div>

                                      <div>
                                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                                          Cooking Loss
                                        </label>
                                        <div className="flex items-center h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            disabled={rowReadOnly}
                                            value={row.cookingLoss}
                                            onChange={(e) =>
                                              updateRecipeField(
                                                row.itemId,
                                                'cookingLoss',
                                                e.target.value === '' ? '' : Number(e.target.value)
                                              )
                                            }
                                            className="w-full bg-transparent outline-none text-xs font-medium text-gray-800 disabled:cursor-not-allowed"
                                          />
                                          <span className="text-xs text-gray-400">{unitLabel}</span>
                                        </div>
                                      </div>

                                      <div>
                                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                                          Quality Check
                                        </label>
                                        <select
                                          disabled={rowReadOnly}
                                          value={row.qualityCheck}
                                          onChange={(e) =>
                                            updateRecipeField(
                                              row.itemId,
                                              'qualityCheck',
                                              e.target.value
                                            )
                                          }
                                          className="w-full h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#084E92] disabled:bg-gray-50 disabled:cursor-not-allowed"
                                        >
                                          <option value="PASSED">PASSED</option>
                                          <option value="PENDING">PENDING</option>
                                          <option value="REJECTED">REJECTED</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                                          Completion Time <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                          type="text"
                                          disabled={rowReadOnly}
                                          placeholder="e.g. 11:05 AM"
                                          value={row.completionTime}
                                          onChange={(e) =>
                                            updateRecipeField(
                                              row.itemId,
                                              'completionTime',
                                              e.target.value
                                            )
                                          }
                                          className="w-full h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium text-gray-800 disabled:bg-gray-50 disabled:cursor-not-allowed focus:border-[#084E92] focus:outline-none"
                                        />
                                      </div>

                                      <div>
                                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                                          Remarks
                                        </label>
                                        <input
                                          type="text"
                                          disabled={rowReadOnly}
                                          placeholder="Enter any remarks about this batch..."
                                          value={row.remarks}
                                          onChange={(e) =>
                                            updateRecipeField(row.itemId, 'remarks', e.target.value)
                                          }
                                          className="w-full h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs font-medium text-gray-800 disabled:bg-gray-50 disabled:cursor-not-allowed focus:border-[#084E92] focus:outline-none"
                                        />
                                      </div>
                                    </div>

                                    {!rowReadOnly && (
                                      <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                                        <button
                                          type="button"
                                          disabled={isSavingThis}
                                          onClick={() => handleSaveItem(row, false)}
                                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#084E92] bg-white border border-[#084E92] hover:bg-blue-50/60 transition cursor-pointer disabled:opacity-50"
                                        >
                                          {isSavingThis ? (
                                            <Loader2 size={14} className="animate-spin" />
                                          ) : (
                                            <Save size={14} />
                                          )}
                                          Save Recipe
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isSavingThis}
                                          onClick={() => handleSaveItem(row, true)}
                                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer disabled:opacity-50"
                                        >
                                          {isSavingThis ? (
                                            <Loader2 size={14} className="animate-spin" />
                                          ) : (
                                            <Check size={14} />
                                          )}
                                          Mark Recipe Complete
                                        </button>
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
              </div>
            </div>

            {/* Production Notes */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-2">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#084E92]" />
                Production Notes
              </span>
              <p className="text-xs text-gray-400">
                Add any notes about production, issues or special observations.
              </p>
              <div className="relative pt-1">
                <textarea
                  rows={3}
                  maxLength={500}
                  disabled={isPlanCompleted}
                  value={productionNotes}
                  onChange={(e) => {
                    setProductionNotes(e.target.value);
                    setNotesDirty(true);
                  }}
                  placeholder="Enter production notes..."
                  className="w-full p-3 rounded-xl border border-[#C3C6D1] text-xs font-medium focus:border-[#084E92] focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <span className="absolute right-3 bottom-2.5 text-[10px] text-gray-400 font-medium">
                  {productionNotes.length}/500
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/production/execution')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back to Execution Listing
              </button>
              {!isPlanCompleted && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={savingDraft || completing}
                    onClick={handleSaveDraft}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer disabled:opacity-50"
                  >
                    {savingDraft ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save Draft
                  </button>
                  <button
                    type="button"
                    disabled={savingDraft || completing}
                    onClick={handleRequestComplete}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {completing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Complete Production
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Unsaved Changes Warning on Meal Type Switch */}
        {pendingMealTypeSwitch !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Unsaved Changes</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    You have unsaved recipe or note changes. Switching meal type will discard them. Continue?
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingMealTypeSwitch(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Stay & Save
                </button>
                <button
                  type="button"
                  onClick={() => applyMealTypeSwitch(pendingMealTypeSwitch)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Discard & Switch
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Production Confirmation Modal */}
        {showCompleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Complete Production?</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    This will finalize all batches, adjust inventory to actual yields, and make this execution plan read-only.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={completing}
                  onClick={() => setShowCompleteConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={completing}
                  onClick={handleConfirmComplete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#084E92] hover:bg-[#00376C] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {completing && <Loader2 size={14} className="animate-spin" />}
                  Confirm & Complete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

export default ProductionExecution;
