import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Scale,
  Trash2,
  Users,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { KpiCard } from '@/components/production/KpiCard';
import { StatusBadge } from '@/components/production/StatusBadge';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getUserIdFromToken } from '@/utils/auth';
import { notify } from '@/utils/toast';
import {
  fetchShiftClosing,
  postShiftClosingDraft,
  postShiftClosingSubmit,
} from './shiftClosingApi';
import {
  DISPOSITION_OPTIONS,
  buildShiftClosingPayload,
  calculateRowMetrics,
  calculateShiftClosingSummary,
  hasEnteredClosingQty,
  normalizeShiftClosingItem,
  validateShiftClosing,
} from './shiftClosingCalc';

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

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '—';
  const str = String(dateStr).split('T')[0];
  const parts = str.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return str;
};

export const ShiftClosingForm = ({ userId: propUserId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state || null;

  const hasRequiredContext = Boolean(
    routeState?.productionPlanId &&
      routeState?.mealTypeId &&
      routeState?.organizationId
  );

  // Redirect back to list if opened without router state
  useEffect(() => {
    if (!hasRequiredContext) {
      navigate('/production/shift-closing', { replace: true });
    }
  }, [hasRequiredContext, navigate]);

  const context = useMemo(
    () => ({
      productionPlanId: Number(routeState?.productionPlanId || 0),
      mealTypeId: Number(routeState?.mealTypeId || 0),
      organizationId: Number(routeState?.organizationId || 0),
      subOutletId:
        routeState?.subOutletId !== undefined &&
        routeState?.subOutletId !== null &&
        routeState?.subOutletId !== '' &&
        Number(routeState?.subOutletId) > 0
          ? Number(routeState.subOutletId)
          : null,
    }),
    [
      routeState?.productionPlanId,
      routeState?.mealTypeId,
      routeState?.organizationId,
      routeState?.subOutletId,
    ]
  );

  const effectiveUserId = Number(propUserId || getUserIdFromToken() || 1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitFailureNotice, setSubmitFailureNotice] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [headerInfo, setHeaderInfo] = useState({
    shiftClosingId: null,
    planCode: routeState?.planCode || '',
    mealTypeName: routeState?.mealTypeName || '',
    organizationName: routeState?.organizationName || '',
    subOutletName: routeState?.subOutletName || '',
    productionDate: '',
    expectedPlannedPax: null,
    status: 'DRAFT',
  });

  const [closingDate, setClosingDate] = useState(getTodayDateString());
  const [pax, setPax] = useState({ paidPax: '', unpaidPax: '', staffPax: '' });
  const [items, setItems] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [itemErrors, setItemErrors] = useState({});

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const initialSnapshotRef = useRef(null);
  const fetchSeqRef = useRef(0);

  const buildSnapshot = (snapDate, snapPax, snapItems, snapRemarks) => {
    return JSON.stringify({
      closingDate: snapDate,
      pax: snapPax,
      remarks: snapRemarks,
      items: snapItems.map((it) => ({
        localKey: it.localKey,
        closingQty: it.closingQty,
        disposition: it.disposition,
        remarks: it.remarks,
      })),
    });
  };

  const applyResponse = useCallback(
    (data) => {
      if (!data || typeof data !== 'object') return;
      const statusNorm = String(data.status || 'DRAFT').toUpperCase();
      const prodDate = data.productionDate || '';
      const resolvedClosingDate =
        data.closingDate || prodDate || getTodayDateString();
      const resolvedShiftClosingId = data.shiftClosingId ?? null;
      const isUnsavedRecord =
        resolvedShiftClosingId === null || resolvedShiftClosingId === undefined;

      const uPax = data.universalPax || {};
      const expectedPlannedPax =
        uPax.expectedPlannedPax ?? data.expectedPlannedPax ?? null;

      setHeaderInfo({
        shiftClosingId: resolvedShiftClosingId,
        planCode:
          data.planCode ||
          routeState?.planCode ||
          (context.productionPlanId ? `PP-${context.productionPlanId}` : ''),
        mealTypeName:
          data.mealTypeName ||
          routeState?.mealTypeName ||
          (context.mealTypeId ? `Meal #${context.mealTypeId}` : ''),
        organizationName:
          data.organizationName ||
          routeState?.organizationName ||
          `Org #${context.organizationId}`,
        subOutletName:
          data.subOutletName ||
          routeState?.subOutletName ||
          (context.subOutletId ? `Outlet #${context.subOutletId}` : ''),
        productionDate: prodDate,
        expectedPlannedPax,
        status: statusNorm,
      });

      const formatPaxInput = (val) => {
        if (val === undefined || val === null) return '';
        if (isUnsavedRecord && Number(val) === 0) return '';
        return String(val);
      };

      const nextPax = {
        paidPax: formatPaxInput(uPax.paidPax ?? data.paidPax),
        unpaidPax: formatPaxInput(uPax.unpaidPax ?? data.unpaidPax),
        staffPax: formatPaxInput(uPax.staffPax ?? data.staffPax),
      };

      const rawItems = Array.isArray(data.items) ? data.items : [];
      const mappedItems = rawItems.map((it, idx) =>
        normalizeShiftClosingItem(it, idx, { isUnsavedRecord })
      );
      const nextRemarks = data.remarks ?? '';

      setClosingDate(resolvedClosingDate);
      setPax(nextPax);
      setItems(mappedItems);
      setRemarks(nextRemarks);
      setItemErrors({});
      setSubmitFailureNotice(null);

      initialSnapshotRef.current = buildSnapshot(
        resolvedClosingDate,
        nextPax,
        mappedItems,
        nextRemarks
      );
    },
    [
      context.productionPlanId,
      context.mealTypeId,
      context.organizationId,
      context.subOutletId,
      routeState?.planCode,
      routeState?.mealTypeName,
      routeState?.organizationName,
      routeState?.subOutletName,
    ]
  );

  const loadShiftClosing = useCallback(async () => {
    if (!hasRequiredContext) return;
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchShiftClosing(context);
      if (seq !== fetchSeqRef.current) return;

      if (!isApiSuccess(res)) {
        setError(getApiMessage(res, null, 'Failed to load shift closing data.'));
        return;
      }

      const data = res?.data?.data ?? res?.data ?? {};
      applyResponse(data);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      console.error('Failed to fetch shift closing:', err);
      setError(getApiMessage(null, err, 'Failed to load shift closing data.'));
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [hasRequiredContext, context, applyResponse]);

  useEffect(() => {
    loadShiftClosing();
  }, [loadShiftClosing]);

  const isClosed = headerInfo.status === 'CLOSED';

  const isDirty = useMemo(() => {
    if (isClosed || !initialSnapshotRef.current) return false;
    return (
      initialSnapshotRef.current !==
      buildSnapshot(closingDate, pax, items, remarks)
    );
  }, [isClosed, closingDate, pax, items, remarks]);

  // Warn on browser refresh / tab close when unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const summary = useMemo(
    () => calculateShiftClosingSummary(items, pax),
    [items, pax]
  );

  const wastageWriteOffItems = useMemo(
    () =>
      items.filter(
        (it) =>
          hasEnteredClosingQty(it.closingQty) &&
          Number(it.closingQty) > 0 &&
          String(it.disposition || '').toUpperCase() === 'WASTAGE'
      ),
    [items]
  );

  const reuseItems = useMemo(
    () =>
      items.filter(
        (it) =>
          hasEnteredClosingQty(it.closingQty) &&
          Number(it.closingQty) > 0 &&
          String(it.disposition || '').toUpperCase() === 'REUSE'
      ),
    [items]
  );

  const handlePaxChange = (field, value) => {
    if (isClosed) return;
    if (value !== '' && !/^\d*$/.test(value)) return;
    setPax((prev) => ({ ...prev, [field]: value }));
  };

  const handleClosingQtyChange = (localKey, value) => {
    if (isClosed) return;
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

    setItems((prev) =>
      prev.map((row) => {
        if (row.localKey !== localKey) return row;
        const { consumedQty, consumptionPct } = calculateRowMetrics(row.actualQty, value);
        const clearDisposition = value === '' || Number(value) === 0;
        return {
          ...row,
          closingQty: value,
          consumedQty,
          consumptionPct,
          ...(clearDisposition ? { disposition: '' } : {}),
        };
      })
    );
    setItemErrors((prev) => {
      if (!prev[localKey]) return prev;
      const next = { ...prev };
      delete next[localKey];
      return next;
    });
  };

  const handleDispositionChange = (localKey, value) => {
    if (isClosed) return;
    setItems((prev) =>
      prev.map((row) =>
        row.localKey === localKey ? { ...row, disposition: value } : row
      )
    );
    setItemErrors((prev) => {
      if (!prev[localKey]) return prev;
      const next = { ...prev };
      delete next[localKey];
      return next;
    });
  };

  const handleItemRemarksChange = (localKey, value) => {
    if (isClosed) return;
    setItems((prev) =>
      prev.map((row) =>
        row.localKey === localKey ? { ...row, remarks: value } : row
      )
    );
  };

  const handleSaveDraft = async () => {
    if (isClosed || savingDraft || submitting || items.length === 0) return;

    const validation = validateShiftClosing(items, pax, false);
    setItemErrors(validation.itemErrors);
    if (!validation.valid) {
      notify.error(validation.errors[0]);
      return;
    }

    setSavingDraft(true);
    setSubmitFailureNotice(null);
    try {
      const payload = buildShiftClosingPayload({
        shiftClosingId: headerInfo.shiftClosingId,
        context,
        closingDate,
        userId: effectiveUserId,
        remarks,
        pax,
        items,
      });

      const res = await postShiftClosingDraft(payload);
      if (!isApiSuccess(res)) {
        notify.error(getApiMessage(res, null, 'Failed to save shift closing draft.'));
        return;
      }

      notify.success(getApiMessage(res, null, 'Shift closing draft saved.'));
      await loadShiftClosing();
    } catch (err) {
      console.error('Failed to save shift closing draft:', err);
      notify.error(getApiMessage(null, err, 'Failed to save shift closing draft.'));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleRequestCloseShift = () => {
    if (isClosed || savingDraft || submitting || items.length === 0) return;

    const validation = validateShiftClosing(items, pax, true);
    setItemErrors(validation.itemErrors);
    if (!validation.valid) {
      notify.error(validation.errors[0]);
      return;
    }

    setShowCloseConfirm(true);
  };

  const handleConfirmCloseShift = async () => {
    if (isClosed || submitting) return;

    setSubmitting(true);
    setSubmitFailureNotice(null);
    try {
      const payload = buildShiftClosingPayload({
        shiftClosingId: headerInfo.shiftClosingId,
        context,
        closingDate,
        userId: effectiveUserId,
        remarks,
        pax,
        items,
      });

      const res = await postShiftClosingSubmit(payload);
      if (!isApiSuccess(res)) {
        const msg = getApiMessage(res, null, 'Failed to close shift.');
        setShowCloseConfirm(false);
        setSubmitFailureNotice(
          `${msg} Please reload and check the current shift status before retrying.`
        );
        notify.error(msg);
        return;
      }

      setShowCloseConfirm(false);
      notify.success(getApiMessage(res, null, 'Shift closed successfully!'));
      await loadShiftClosing();
    } catch (err) {
      console.error('Failed to close shift:', err);
      const msg = getApiMessage(null, err, 'Failed to close shift.');
      setShowCloseConfirm(false);
      setSubmitFailureNotice(
        `${msg} Please reload and check the current shift status before retrying.`
      );
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackClick = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      return;
    }
    navigate('/production/shift-closing');
  };

  if (!hasRequiredContext) {
    return null;
  }

  const actionsDisabled = savingDraft || submitting || items.length === 0;

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        <PageHeader
          title={
            <div className="flex items-center gap-2.5 flex-wrap">
              <span>
                Shift Closing{headerInfo.planCode ? ` (${headerInfo.planCode})` : ''}
              </span>
              <StatusBadge status={headerInfo.status || 'DRAFT'} />
            </div>
          }
          description="Record leftover dish quantities, disposition (Wastage or Reuse), and actual pax served."
          actions={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadShiftClosing}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Reload
              </button>
              <button
                type="button"
                onClick={handleBackClick}
                className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </button>
            </div>
          }
        />

        <PageErrorAlert
          error={error}
          onRetry={loadShiftClosing}
          className="my-2"
        />

        {submitFailureNotice && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-rose-800 font-semibold">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} className="shrink-0 text-rose-600" />
              <span>{submitFailureNotice}</span>
            </div>
            <button
              type="button"
              onClick={loadShiftClosing}
              className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 transition cursor-pointer shrink-0"
            >
              Reload Status
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-[#E7EAF0] rounded-2xl py-20 flex items-center justify-center gap-2 text-slate-500 text-sm">
            <Loader2 size={18} className="animate-spin text-[#084E92]" />
            Loading shift closing details...
          </div>
        ) : (
          <>
            {isClosed && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
                <Lock size={15} className="shrink-0 text-emerald-600" />
                <span>
                  This shift closing record is CLOSED and locked in read-only mode.
                </span>
              </div>
            )}

            {/* Header Context & Closing Date */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Production Plan
                  </span>
                  <span className="text-xs font-bold text-[#084E92] mt-0.5 block truncate">
                    {headerInfo.planCode || '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Meal Type
                  </span>
                  <span className="text-xs font-bold text-gray-900 mt-0.5 block truncate">
                    {headerInfo.mealTypeName || '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Organization
                  </span>
                  <span className="text-xs font-bold text-gray-900 mt-0.5 block truncate">
                    {headerInfo.organizationName || '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Outlet
                  </span>
                  <span className="text-xs font-bold text-gray-900 mt-0.5 block truncate">
                    {headerInfo.subOutletName || '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Production Date
                  </span>
                  <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                    {formatDisplayDate(headerInfo.productionDate)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Closing Date
                  </label>
                  <input
                    type="date"
                    disabled={isClosed}
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="w-full text-xs font-bold text-gray-900 bg-transparent outline-none disabled:text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Universal Pax Card */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-[#084E92]" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Pax Breakdown
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 flex-wrap">
                  {headerInfo.expectedPlannedPax !== null &&
                    headerInfo.expectedPlannedPax !== undefined && (
                      <span>
                        Expected Planned Pax:{' '}
                        <strong className="text-slate-900">
                          {headerInfo.expectedPlannedPax}
                        </strong>
                      </span>
                    )}
                  <span>
                    Total Actual Pax:{' '}
                    <span className="text-sm font-black text-[#084E92]">
                      {summary.totalActualPax}
                    </span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Paid Pax
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={isClosed}
                    value={pax.paidPax}
                    onChange={(e) => handlePaxChange('paidPax', e.target.value)}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white disabled:bg-slate-50 disabled:text-slate-600 text-xs font-bold focus:border-[#084E92] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Unpaid Pax
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={isClosed}
                    value={pax.unpaidPax}
                    onChange={(e) => handlePaxChange('unpaidPax', e.target.value)}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white disabled:bg-slate-50 disabled:text-slate-600 text-xs font-bold focus:border-[#084E92] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Staff Pax
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={isClosed}
                    value={pax.staffPax}
                    onChange={(e) => handlePaxChange('staffPax', e.target.value)}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white disabled:bg-slate-50 disabled:text-slate-600 text-xs font-bold focus:border-[#084E92] focus:outline-none"
                  />
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase text-[#084E92]">
                    Total Actual Pax
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {summary.totalActualPax}
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={Scale}
                label="Consumed Qty"
                value={summary.totalConsumedQty.toFixed(3)}
                subtext={`of ${summary.totalActualQty.toFixed(3)} transferred`}
                tone="default"
              />
              <KpiCard
                icon={Trash2}
                label="Leftover Qty"
                value={summary.totalClosingQty.toFixed(3)}
                subtext={`Wastage: ${summary.totalWastedQty.toFixed(3)} | Reuse: ${summary.totalReusedQty.toFixed(3)}`}
                tone="amber"
              />
              <KpiCard
                icon={ClipboardCheck}
                label="Shift Consumption"
                value={`${summary.consumptionPct.toFixed(2)}%`}
                subtext="Consumed ÷ entered actual"
                tone="emerald"
              />
              <KpiCard
                icon={Users}
                label="Per Pax (kg)"
                value={summary.perPaxConsumptionKg.toFixed(3)}
                subtext="kg items ÷ total actual pax"
                tone="default"
              />
            </div>

            {summary.hasMixedUnits && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs text-amber-800 font-medium">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                <span>
                  Dishes use multiple units ({summary.unitsList.join(', ')}). Quantity totals add plain numbers across units; Per Pax (kg) only counts kg items.
                </span>
              </div>
            )}

            {/* Dish Leftover Table */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Transferred Dishes &amp; Leftovers
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#084E92] border border-blue-100">
                    {items.length} {items.length === 1 ? 'Dish' : 'Dishes'}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">
                  Leave leftover blank if not yet counted; blank rows are excluded from consumed totals
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Dish / Recipe</th>
                      <th className="py-3 px-4">Batch No.</th>
                      <th className="py-3 px-4 text-right">Transferred Qty</th>
                      <th className="py-3 px-4 text-right">Leftover Qty</th>
                      <th className="py-3 px-4 text-right">Consumed Qty</th>
                      <th className="py-3 px-4 text-right">Consumption %</th>
                      <th className="py-3 px-4">Disposition</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                          No transferred dishes found for this shift closing context.
                        </td>
                      </tr>
                    ) : (
                      items.map((row) => {
                        const rowErr = itemErrors[row.localKey];
                        const hasClosing = hasEnteredClosingQty(row.closingQty);
                        const closingNum = hasClosing ? Number(row.closingQty) : 0;

                        return (
                          <tr key={row.localKey} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-4 font-bold text-gray-900">
                              {row.recipeName}
                            </td>

                            <td className="py-3 px-4 text-gray-600 font-medium">
                              {row.batchNumber || '—'}
                            </td>

                            <td className="py-3 px-4 text-right font-semibold text-gray-800">
                              {Number(row.actualQty || 0).toFixed(3)} {row.uom}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex flex-col items-end">
                                <div className="inline-flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    disabled={isClosed}
                                    value={row.closingQty}
                                    onChange={(e) =>
                                      handleClosingQtyChange(row.localKey, e.target.value)
                                    }
                                    placeholder="0.000"
                                    className={`w-24 h-8 px-2 text-right rounded-lg border text-xs font-bold bg-white disabled:bg-slate-50 disabled:text-slate-600 focus:outline-none ${
                                      rowErr
                                        ? 'border-rose-400 focus:border-rose-500 text-rose-700'
                                        : 'border-slate-200 focus:border-[#084E92] text-gray-900'
                                    }`}
                                  />
                                  <span className="text-[11px] text-slate-500 font-semibold min-w-6 text-left">
                                    {row.uom}
                                  </span>
                                </div>
                                {rowErr && (
                                  <span className="text-[10px] text-rose-600 font-medium mt-0.5">
                                    {rowErr}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right font-bold text-emerald-700">
                              {row.consumedQty !== null
                                ? `${row.consumedQty.toFixed(3)} ${row.uom}`
                                : '—'}
                            </td>

                            <td className="py-3 px-4 text-right font-bold text-[#084E92]">
                              {row.consumptionPct !== null
                                ? `${row.consumptionPct.toFixed(2)}%`
                                : '—'}
                            </td>

                            <td className="py-3 px-4">
                              <Select
                                disabled={isClosed || (hasClosing && closingNum === 0)}
                                value={row.disposition || 'NONE'}
                                onValueChange={(val) =>
                                  handleDispositionChange(
                                    row.localKey,
                                    val === 'NONE' ? '' : val
                                  )
                                }
                              >
                                <SelectTrigger className="w-40 h-8 border-slate-200 rounded-lg bg-white text-xs">
                                  <SelectValue placeholder="Select disposition" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE" className="text-xs text-slate-400">
                                    None
                                  </SelectItem>
                                  {DISPOSITION_OPTIONS.map((opt) => (
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
                            </td>

                            <td className="py-3 px-4">
                              <input
                                type="text"
                                disabled={isClosed}
                                value={row.remarks}
                                onChange={(e) =>
                                  handleItemRemarksChange(row.localKey, e.target.value)
                                }
                                placeholder="Item remarks..."
                                className="w-40 h-8 px-2.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 text-xs text-gray-700 focus:border-[#084E92] focus:outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Shift Remarks & Action Footer */}
              <div className="p-5 bg-slate-50/70 border-t border-gray-100 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Shift Remarks
                  </label>
                  <textarea
                    rows={2}
                    disabled={isClosed}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter overall shift closing notes or handover observations..."
                    className="w-full p-3 text-xs rounded-xl border border-[#C3C6D1] bg-white disabled:bg-slate-50 disabled:text-slate-600 focus:outline-none focus:border-[#084E92] resize-none"
                  />
                </div>

                {!isClosed && (
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-gray-200/70">
                    <button
                      type="button"
                      disabled={actionsDisabled}
                      onClick={handleSaveDraft}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      {savingDraft ? (
                        <Loader2 size={14} className="animate-spin text-[#084E92]" />
                      ) : (
                        <Save size={14} />
                      )}
                      {savingDraft ? 'Saving Draft...' : 'Save Draft'}
                    </button>
                    <button
                      type="button"
                      disabled={actionsDisabled}
                      onClick={handleRequestCloseShift}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
                    >
                      {submitting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      {submitting ? 'Closing Shift...' : 'Close Shift'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Close Shift Confirmation Modal (Lists Stock to be Written Off) */}
        {showCloseConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-[#E5E7EB] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Confirm Close Shift</h3>
                  <p className="text-xs text-gray-500">
                    {headerInfo.planCode} • {headerInfo.mealTypeName} ({summary.totalActualPax} pax)
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4 text-xs text-gray-700 max-h-[60vh] overflow-y-auto">
                <p>
                  Closing this shift locks all entries permanently. Please review leftover stock effects:
                </p>

                {wastageWriteOffItems.length > 0 ? (
                  <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-3.5 space-y-2">
                    <span className="text-[11px] font-bold text-rose-800 uppercase block">
                      Stock to be Written Off (ADJUSTMENT_OUT — Reduces Outlet Stock)
                    </span>
                    <ul className="divide-y divide-rose-100">
                      {wastageWriteOffItems.map((it) => (
                        <li
                          key={it.localKey}
                          className="py-1.5 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-semibold text-gray-900 block">
                              {it.recipeName}
                            </span>
                            {it.batchNumber && (
                              <span className="text-[10px] text-gray-500">
                                Batch: {it.batchNumber}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-rose-700 shrink-0">
                            -{Number(it.closingQty).toFixed(3)} {it.uom}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 text-slate-600">
                    No items marked as <strong>WASTAGE</strong>. No outlet stock will be written off.
                  </div>
                )}

                {reuseItems.length > 0 && (
                  <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-3 text-blue-800">
                    <strong>{reuseItems.length}</strong> dish(es) totaling{' '}
                    <strong>{summary.totalReusedQty.toFixed(3)}</strong> will be flagged as reusable leftover batches.
                  </div>
                )}
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowCloseConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmCloseShift}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#084E92] hover:bg-[#063c70] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Closing Shift...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      Confirm &amp; Close Shift
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unsaved Changes Leave Confirmation Modal */}
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-[#E5E7EB] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Unsaved Changes</h3>
              </div>
              <div className="p-5 text-xs text-gray-600">
                You have unsaved leftover or pax edits. Leave without saving?
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/production/shift-closing')}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Discard &amp; Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

export default ShiftClosingForm;
