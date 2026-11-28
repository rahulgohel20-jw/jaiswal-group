import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  Printer,
  Save,
  Truck,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { StatusBadge } from '@/components/production/StatusBadge';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { getUserIdFromToken } from '@/utils/auth';
import { notify } from '@/utils/toast';
import {
  GetByIdDraftProductionPlanDispatch,
  SaveDraftProductionPlanDispatch,
  SaveProductionPlanDispatch,
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

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '—';
  const str = String(dateStr).split('T')[0];
  const parts = str.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return str;
};

const READ_ONLY_STATUSES = [
  'DISPATCHED',
  'COMPLETED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'CLOSED',
];

const mapDispatchItem = (it, idx, fallbackStatus = 'DRAFT') => ({
  ...it,
  localKey: `${it.transferItemId ?? it.id ?? idx}-${idx}`,
  transferItemId: Number(it.transferItemId ?? it.id ?? 0),
  itemName:
    it.itemName ||
    it.recipeName ||
    it.kitchenMenuItemName ||
    it.name ||
    `Item #${it.transferItemId ?? it.id ?? idx + 1}`,
  categoryName: it.categoryName || it.recipeCategoryName || '',
  batchNumber: it.batchNumber ?? it.batchNo ?? '',
  plannedQuantity:
    it.plannedQuantity ?? it.allocatedQuantity ?? it.requiredQuantity ?? null,
  transferQuantity:
    it.transferQuantity !== undefined && it.transferQuantity !== null
      ? it.transferQuantity
      : it.dispatchQuantity ?? it.plannedQuantity ?? 0,
  uomSymbol: it.uomSymbol || it.unitSymbol || it.unitName || 'kg',
  containerCount:
    it.containerCount !== undefined && it.containerCount !== null
      ? it.containerCount
      : 0,
  temperature:
    it.temperature !== undefined && it.temperature !== null
      ? String(it.temperature)
      : '',
  remarks: it.remarks ?? '',
  status: String(it.status || fallbackStatus || 'DRAFT').toUpperCase(),
});

export const FoodTransferTracker = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const resolvedStockTransferId = Number(
    params.stockTransferId || location.state?.stockTransferId || 0
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [showDispatchConfirm, setShowDispatchConfirm] = useState(false);

  const [headerInfo, setHeaderInfo] = useState(() => {
    const s = location.state?.dispatchSummary || {};
    return {
      stockTransferId: resolvedStockTransferId,
      transferNumber:
        s.transferCode ||
        s.transferNumber ||
        s.transferNo ||
        s.dispatchNumber ||
        (resolvedStockTransferId ? `STR-${resolvedStockTransferId}` : ''),
      planCode:
        s.planCode ||
        s.productionPlanCode ||
        (s.productionPlanId ? `PP-${s.productionPlanId}` : ''),
      mealTypeName: s.mealTypeName || '',
      dispatchDate: s.transferDate || s.dispatchDate || s.productionDate || '',
      scheduledDispatch: s.scheduledDispatchTime || s.scheduledDispatch || '',
      sourceName:
        s.sourceLocationName ||
        s.sourceKitchenName ||
        s.sourceKitchenLocationName ||
        s.fromKitchen ||
        '',
      destinationName:
        s.destinationName ||
        [
          s.destinationOrganizationName || s.destinationOutletName || s.toOutlet,
          s.destinationSubOutletName || s.destinationLocationName,
        ]
          .filter(Boolean)
          .join(' • ') ||
        '',
      status: String(s.status || 'DRAFT').toUpperCase(),
    };
  });

  const [form, setForm] = useState({
    vehicleNumber: '',
    dispatchTemperature: '',
    driverName: '',
    driverMobile: '',
    sealNumber: '',
    notes: '',
  });

  const [dispatchItems, setDispatchItems] = useState([]);

  const fetchSeqRef = useRef(0);

  const applyDispatchResponse = useCallback(
    (raw) => {
      if (!raw || typeof raw !== 'object') return;
      const summary = raw.transferSummary || raw.dispatch || raw.stockTransfer || raw;
      const details = raw.dispatchDetails || raw.dispatch || raw;
      const statusNorm = String(summary.status || raw.status || 'DRAFT').toUpperCase();
      const rawItems = Array.isArray(raw.items)
        ? raw.items
        : Array.isArray(summary.items)
          ? summary.items
          : Array.isArray(summary.transferItems)
            ? summary.transferItems
            : [];

      const destLabel =
        summary.destinationName ||
        [
          summary.destinationOrganizationName ||
            summary.destinationOutletName ||
            summary.toOutlet,
          summary.destinationSubOutletName ||
            summary.destinationLocationName ||
            summary.subLocationName,
        ]
          .filter(Boolean)
          .join(' • ');

      setHeaderInfo({
        stockTransferId: Number(
          summary.stockTransferId ?? summary.id ?? resolvedStockTransferId
        ),
        transferNumber:
          summary.transferCode ||
          summary.transferNumber ||
          summary.transferNo ||
          summary.dispatchNumber ||
          summary.dispatchCode ||
          `STR-${summary.stockTransferId ?? summary.id ?? resolvedStockTransferId}`,
        planCode:
          summary.planCode ||
          summary.productionPlanCode ||
          (summary.productionPlanId ? `PP-${summary.productionPlanId}` : '—'),
        mealTypeName:
          summary.mealTypeName || (summary.mealTypeId ? `Meal #${summary.mealTypeId}` : ''),
        dispatchDate:
          summary.transferDate || summary.dispatchDate || summary.productionDate || '',
        scheduledDispatch:
          summary.scheduledDispatch || summary.scheduledDispatchTime || summary.dispatchTime || '',
        sourceName:
          summary.sourceLocationName ||
          summary.sourceKitchenName ||
          summary.sourceKitchenLocationName ||
          summary.fromKitchen ||
          summary.sourceStoreName ||
          '—',
        destinationName: destLabel || '—',
        status: statusNorm,
      });

      const defaultTemp =
        details.dispatchTemperature !== undefined && details.dispatchTemperature !== null
          ? String(details.dispatchTemperature)
          : details.temperature !== undefined && details.temperature !== null
            ? String(details.temperature)
            : '';

      setForm({
        vehicleNumber: details.vehicleNumber ?? details.vehicleNo ?? '',
        dispatchTemperature: defaultTemp,
        driverName: details.driverName ?? '',
        driverMobile: details.driverMobile ?? details.driverPhone ?? '',
        sealNumber: details.sealNumber ?? details.sealNo ?? '',
        notes: details.notes ?? details.remarks ?? '',
      });

      setDispatchItems(rawItems.map((it, idx) => mapDispatchItem(it, idx, statusNorm)));
    },
    [resolvedStockTransferId]
  );

  const fetchDispatchDetails = useCallback(async () => {
    if (!resolvedStockTransferId || resolvedStockTransferId <= 0) return;

    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await GetByIdDraftProductionPlanDispatch({
        stockTransferId: Number(resolvedStockTransferId),
      });
      if (seq !== fetchSeqRef.current) return;

      if (!isApiSuccess(res)) {
        const msg = getApiMessage(res, null, 'Failed to load dispatch details.');
        setError(msg);
        return;
      }

      const data = res?.data?.data ?? res?.data ?? {};
      applyDispatchResponse(data);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      console.error('Failed to fetch dispatch details:', err);
      setError(getApiMessage(null, err, 'Failed to load dispatch details.'));
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [resolvedStockTransferId, applyDispatchResponse]);

  useEffect(() => {
    fetchDispatchDetails();
  }, [fetchDispatchDetails]);

  const isReadOnly = READ_ONLY_STATUSES.includes(headerInfo.status);

  const handleFormChange = (field, value) => {
    if (isReadOnly) return;
    if (field === 'dispatchTemperature' && value !== '' && !/^-?\d*\.?\d*$/.test(value)) {
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (localKey, field, value) => {
    if (isReadOnly) return;
    if (
      (field === 'transferQuantity' || field === 'temperature') &&
      value !== '' &&
      !/^-?\d*\.?\d*$/.test(value)
    ) {
      return;
    }
    if (field === 'containerCount' && value !== '' && !/^\d*$/.test(value)) {
      return;
    }

    setDispatchItems((prev) =>
      prev.map((it) => (it.localKey === localKey ? { ...it, [field]: value } : it))
    );
  };

  const summaryStats = useMemo(() => {
    const qtyByUnit = {};
    let totalContainers = 0;

    dispatchItems.forEach((it) => {
      const qty = Number(it.transferQuantity) || 0;
      const unit = it.uomSymbol || 'kg';
      qtyByUnit[unit] = (qtyByUnit[unit] || 0) + qty;
      totalContainers += Number(it.containerCount) || 0;
    });

    const qtySummary = Object.entries(qtyByUnit)
      .map(([unit, total]) => `${Number.isInteger(total) ? total : total.toFixed(2)} ${unit}`)
      .join(' • ');

    return {
      qtySummary: qtySummary || '0 kg',
      totalContainers,
    };
  }, [dispatchItems]);

  const buildPayload = () => {
    const parsedTemp =
      form.dispatchTemperature === '' || form.dispatchTemperature === '-'
        ? 0
        : Number(form.dispatchTemperature) || 0;

    return {
      dispatchTemperature: parsedTemp,
      driverMobile: form.driverMobile.trim(),
      driverName: form.driverName.trim(),
      items: dispatchItems.map((it) => ({
        batchNumber: (it.batchNumber || '').trim(),
        containerCount: it.containerCount === '' ? 0 : Number(it.containerCount) || 0,
        remarks: (it.remarks || '').trim(),
        temperature:
          it.temperature === '' || it.temperature === '-'
            ? 0
            : Number(it.temperature) || 0,
        transferItemId: Number(it.transferItemId) || 0,
        transferQuantity:
          it.transferQuantity === '' ? 0 : Number(it.transferQuantity) || 0,
      })),
      notes: form.notes.trim(),
      sealNumber: form.sealNumber.trim(),
      stockTransferId: Number(headerInfo.stockTransferId || resolvedStockTransferId),
      userId: Number(getUserIdFromToken()) || 1,
      vehicleNumber: form.vehicleNumber.trim(),
    };
  };

  const validateForAction = (isFinalDispatch) => {
    if (!resolvedStockTransferId || resolvedStockTransferId <= 0) {
      notify.error('Invalid Stock Transfer ID.');
      return false;
    }

    if (dispatchItems.length === 0) {
      notify.error('No dispatch items found to save.');
      return false;
    }

    for (const it of dispatchItems) {
      const qty = Number(it.transferQuantity);
      const containers = Number(it.containerCount);
      if (Number.isNaN(qty) || qty < 0) {
        notify.error(`Transfer quantity cannot be negative for "${it.itemName}".`);
        return false;
      }
      if (Number.isNaN(containers) || containers < 0) {
        notify.error(`Container count cannot be negative for "${it.itemName}".`);
        return false;
      }
    }

    if (isFinalDispatch) {
      const hasAnyPositiveQty = dispatchItems.some(
        (it) => Number(it.transferQuantity) > 0
      );
      if (!hasAnyPositiveQty) {
        notify.error('At least one item must have a transfer quantity greater than 0.');
        return false;
      }
    }

    return true;
  };

  const handleSaveDraft = async () => {
    if (isReadOnly || savingDraft || dispatching) return;
    if (!validateForAction(false)) return;

    setSavingDraft(true);
    try {
      const payload = buildPayload();
      const res = await SaveDraftProductionPlanDispatch(payload);

      if (!isApiSuccess(res)) {
        notify.error(getApiMessage(res, null, 'Failed to save dispatch draft.'));
        return;
      }

      notify.success(getApiMessage(res, null, 'Dispatch draft saved successfully.'));
      const data = res?.data?.data;
      if (
        data &&
        typeof data === 'object' &&
        (data.transferSummary || data.dispatchDetails || data.stockTransferId || data.items)
      ) {
        applyDispatchResponse(data);
      } else {
        await fetchDispatchDetails();
      }
    } catch (err) {
      console.error('Failed to save dispatch draft:', err);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleOpenDispatchConfirm = () => {
    if (isReadOnly || savingDraft || dispatching) return;
    if (!validateForAction(true)) return;
    setShowDispatchConfirm(true);
  };

  const handleConfirmDispatch = async () => {
    if (isReadOnly || dispatching) return;

    setDispatching(true);
    try {
      const payload = buildPayload();
      const res = await SaveProductionPlanDispatch(payload);

      if (!isApiSuccess(res)) {
        notify.error(getApiMessage(res, null, 'Failed to dispatch food transfer.'));
        return;
      }

      setShowDispatchConfirm(false);
      notify.success(getApiMessage(res, null, 'Food transfer dispatched successfully!'));
      const data = res?.data?.data;
      if (
        data &&
        typeof data === 'object' &&
        (data.transferSummary || data.dispatchDetails || data.stockTransferId || data.items)
      ) {
        applyDispatchResponse(data);
      } else {
        await fetchDispatchDetails();
      }
    } catch (err) {
      console.error('Failed to dispatch transfer:', err);
    } finally {
      setDispatching(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        <PageHeader
          title={
            <div className="flex items-center gap-2.5 flex-wrap">
              <span>
                Food Dispatch{headerInfo.transferNumber ? ` (${headerInfo.transferNumber})` : ''}
              </span>
              {headerInfo.status && <StatusBadge status={headerInfo.status} />}
            </div>
          }
          description="Verify dispatch manifest, assign vehicle & driver credentials, and dispatch food transfers."
          actions={
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/production/transfers')}
                className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </button>

              <HeaderActionButton
                onClick={handlePrint}
                icon={Printer}
                label="Print Dispatch Details"
                variant="outline"
              />
            </div>
          }
        />

        <PageErrorAlert
          error={error}
          onRetry={fetchDispatchDetails}
          className="my-2"
        />

        {!resolvedStockTransferId || resolvedStockTransferId <= 0 ? (
          <div className="bg-white border border-[#E7EAF0] rounded-2xl p-12 text-center space-y-3">
            <Truck size={36} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No Transfer Selected</h3>
            <p className="text-xs text-slate-500">
              Select a food transfer from the dispatch list to view or dispatch items.
            </p>
            <button
              type="button"
              onClick={() => navigate('/production/transfers')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#084E92] hover:bg-[#063c70] text-white text-xs font-semibold transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              Go to Dispatch List
            </button>
          </div>
        ) : loading ? (
          <div className="bg-white border border-[#E7EAF0] rounded-2xl py-20 flex items-center justify-center gap-2 text-slate-500 text-sm">
            <Loader2 size={18} className="animate-spin text-[#084E92]" />
            Loading dispatch details...
          </div>
        ) : (
          <div className="space-y-6">
            {isReadOnly && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
                <Lock size={15} className="shrink-0 text-emerald-600" />
                <span>
                  This transfer has status {headerInfo.status.replace(/_/g, ' ')} and is locked in read-only mode.
                </span>
              </div>
            )}

            {/* Transfer Summary & Dispatch Credentials Card */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Transfer and Dispatch Details
                  </h3>
                  <p className="text-xs text-gray-500">
                    Assign destination credentials, seal number, and thermal conditions before dispatch.
                  </p>
                </div>
                {headerInfo.mealTypeName && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#084E92] border border-blue-100">
                    {headerInfo.mealTypeName}
                  </span>
                )}
              </div>

              {/* Transfer Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Source
                  </span>
                  <span className="text-xs font-bold text-gray-900 mt-0.5 block truncate">
                    {headerInfo.sourceName || '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Destination
                  </span>
                  <span className="text-xs font-bold text-gray-900 mt-0.5 block truncate">
                    {headerInfo.destinationName || '—'}
                  </span>
                </div>
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
                    Scheduled Dispatch
                  </span>
                  <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                    {headerInfo.scheduledDispatch ||
                      (headerInfo.dispatchDate ? formatDisplayDate(headerInfo.dispatchDate) : '—')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Status
                  </span>
                  <div className="mt-1">
                    <StatusBadge status={headerInfo.status} />
                  </div>
                </div>
              </div>

              {/* Dispatch Credentials Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={form.vehicleNumber}
                    onChange={(e) => handleFormChange('vehicleNumber', e.target.value)}
                    placeholder="e.g. GJ-01-AB-2845"
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white disabled:bg-slate-50 disabled:text-slate-600 text-xs font-semibold focus:border-[#084E92] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Dispatch Temperature (°C)
                  </label>
                  <div className="flex items-center h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white">
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={isReadOnly}
                      value={form.dispatchTemperature}
                      onChange={(e) =>
                        handleFormChange('dispatchTemperature', e.target.value)
                      }
                      placeholder="0"
                      className="w-full bg-transparent outline-none text-xs font-bold text-gray-800 disabled:text-slate-600"
                    />
                    <span className="text-xs font-bold text-emerald-600">°C</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={form.driverName}
                    onChange={(e) => handleFormChange('driverName', e.target.value)}
                    placeholder="Enter driver name"
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white disabled:bg-slate-50 disabled:text-slate-600 text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Driver Mobile
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={form.driverMobile}
                    onChange={(e) => handleFormChange('driverMobile', e.target.value)}
                    placeholder="Enter mobile number"
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white disabled:bg-slate-50 disabled:text-slate-600 text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Seal Number
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={form.sealNumber}
                    onChange={(e) => handleFormChange('sealNumber', e.target.value)}
                    placeholder="e.g. SEAL-001"
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white disabled:bg-slate-50 disabled:text-slate-600 text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="Enter any additional notes about the dispatch..."
                    value={form.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white disabled:bg-slate-50 disabled:text-slate-600 text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Items to Dispatch Table */}
            <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Items to Dispatch
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {dispatchItems.length} {dispatchItems.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">
                  Itemized recipes, container count &amp; thermal conditions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Item / Recipe</th>
                      <th className="py-3 px-4">Batch Number</th>
                      <th className="py-3 px-4 text-right">Transfer Quantity</th>
                      <th className="py-3 px-4 text-center">Container Count</th>
                      <th className="py-3 px-4 text-center">Temperature (°C)</th>
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dispatchItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-xs text-slate-400">
                          No dispatch items available for this transfer.
                        </td>
                      </tr>
                    ) : (
                      dispatchItems.map((item) => (
                        <tr key={item.localKey} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-900 block">
                              {item.itemName}
                            </span>
                            {item.categoryName && (
                              <span className="text-[11px] text-slate-400 block">
                                {item.categoryName}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={item.batchNumber}
                              onChange={(e) =>
                                handleItemChange(item.localKey, 'batchNumber', e.target.value)
                              }
                              placeholder="Batch no."
                              className="w-32 h-8 px-2.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 text-xs font-medium text-gray-700 focus:border-[#084E92] focus:outline-none"
                            />
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={isReadOnly}
                                value={item.transferQuantity}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.localKey,
                                    'transferQuantity',
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className="w-20 h-8 px-2 text-right rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 text-xs font-bold text-gray-900 focus:border-[#084E92] focus:outline-none"
                              />
                              <span className="text-[11px] font-semibold text-slate-500 min-w-6 text-left">
                                {item.uomSymbol}
                              </span>
                            </div>
                            {item.plannedQuantity !== null &&
                              item.plannedQuantity !== undefined && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Planned: {item.plannedQuantity} {item.uomSymbol}
                                </span>
                              )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={isReadOnly}
                              value={item.containerCount}
                              onChange={(e) =>
                                handleItemChange(item.localKey, 'containerCount', e.target.value)
                              }
                              placeholder="0"
                              className="w-16 h-8 px-2 text-center rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 text-xs font-semibold text-gray-800 focus:border-[#084E92] focus:outline-none"
                            />
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={isReadOnly}
                                value={item.temperature}
                                onChange={(e) =>
                                  handleItemChange(item.localKey, 'temperature', e.target.value)
                                }
                                placeholder="0"
                                className="w-16 h-8 px-2 text-center rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 text-xs font-semibold text-amber-700 focus:border-[#084E92] focus:outline-none"
                              />
                              <span className="text-[11px] font-semibold text-slate-500">°C</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={item.remarks}
                              onChange={(e) =>
                                handleItemChange(item.localKey, 'remarks', e.target.value)
                              }
                              placeholder="Remarks..."
                              className="w-40 h-8 px-2.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-50 text-xs text-gray-700 focus:border-[#084E92] focus:outline-none"
                            />
                          </td>

                          <td className="py-3 px-4">
                            <StatusBadge status={item.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Workspace Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-xs font-bold text-gray-700">
                  <span className="text-[#084E92] text-sm">{summaryStats.qtySummary}</span>
                  <span>
                    Total Container Count:{' '}
                    <strong className="text-gray-900">{summaryStats.totalContainers}</strong>
                  </span>
                </div>

                {!isReadOnly && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={savingDraft || dispatching}
                      onClick={handleSaveDraft}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition cursor-pointer"
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
                      disabled={savingDraft || dispatching}
                      onClick={handleOpenDispatchConfirm}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] disabled:opacity-50 transition shadow-xs cursor-pointer"
                    >
                      {dispatching ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Truck size={14} />
                      )}
                      {dispatching ? 'Dispatching...' : 'Dispatch Now'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dispatch Confirmation Modal */}
        {showDispatchConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#E5E7EB] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Confirm Dispatch</h3>
                  <p className="text-xs text-gray-500">
                    {headerInfo.transferNumber || `Transfer #${resolvedStockTransferId}`}
                  </p>
                </div>
              </div>

              <div className="p-6 text-xs text-gray-600 space-y-2">
                <p>
                  You are about to dispatch{' '}
                  <strong className="text-gray-900">{summaryStats.qtySummary}</strong> across{' '}
                  <strong className="text-gray-900">{summaryStats.totalContainers}</strong>{' '}
                  container(s) to{' '}
                  <strong className="text-gray-900">
                    {headerInfo.destinationName || 'destination'}
                  </strong>
                  .
                </p>
                <p className="text-slate-500">
                  Once dispatched, the transfer record will be locked and cannot be edited.
                </p>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={dispatching}
                  onClick={() => setShowDispatchConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={dispatching}
                  onClick={handleConfirmDispatch}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#084E92] hover:bg-[#063c70] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
                >
                  {dispatching ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Truck size={13} />
                      Confirm Dispatch
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

export default FoodTransferTracker;
