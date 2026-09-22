import React, { useEffect, useState } from 'react';
import { Layers, ArrowRight, X, Loader2, CheckCircle2, Calendar } from 'lucide-react';
import { getBatchFlow } from '@/services/apiServices';

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    if (dateStr.includes('T')) {
      const [d, t] = dateStr.split('T');
      const parts = d.split('-');
      if (parts.length === 3) {
        const timePart = t && t !== '00:00' && t !== '00:00:00' ? ` ${t.slice(0, 5)}` : '';
        return `${parts[2]}/${parts[1]}/${parts[0]}${timePart}`;
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

const getStatusBadgeStyle = (type, isConsumed) => {
  const t = String(type || '').toUpperCase();
  if (t.includes('FULL')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (t.includes('PARTIAL')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (isConsumed) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

const FifoBatchVisualizerModal = ({
  isOpen,
  onClose,
  itemId,
  itemType = 'RAW_MATERIAL',
  unitId,
  fromOrganizationId,
  fromSubOutletId,
  toOrganizationId,
  toSubOutletId,
  itemName = 'Item',
  fromOutletName = 'Source Outlet',
  toOutletName = 'Destination Outlet',
  transferQty = 0,
  unit = 'kg',
}) => {
  const [editableQuantity, setEditableQuantity] = useState(transferQty || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batchData, setBatchData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setEditableQuantity(transferQty != null && transferQty !== '' ? transferQty : 0);
    }
  }, [isOpen, transferQty]);

  useEffect(() => {
    if (!isOpen) {
      setBatchData(null);
      setError(null);
      return;
    }

    const handler = setTimeout(() => {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          const safeQty =
            editableQuantity !== null && editableQuantity !== undefined && editableQuantity !== ''
              ? Number(editableQuantity)
              : 0;
          const requestedQuantity = isNaN(safeQty) ? 0 : safeQty;

          if (requestedQuantity <= 0) {
            setBatchData(null);
            setLoading(false);
            return;
          }

          const safeUnitId =
            unitId != null && unitId !== ''
              ? Number(unitId)
              : Number(batchData?.unitId || 0);

          const params = {
            fromOrganizationId: Number(fromOrganizationId),
            itemId: Number(itemId),
            itemType: itemType || 'RAW_MATERIAL',
            requestedQuantity,
            unitId: safeUnitId,
            toOrganizationId: Number(toOrganizationId),
            ...(fromSubOutletId != null && fromSubOutletId !== '' ? { fromSubOutletId: Number(fromSubOutletId) } : {}),
            ...(toSubOutletId != null && toSubOutletId !== '' ? { toSubOutletId: Number(toSubOutletId) } : {}),
          };

          const res = await getBatchFlow(params);
          const data = res?.data?.data ?? res?.data ?? res;
          setBatchData(data);
        } catch (err) {
          console.warn('Could not fetch batch flow from getBatchFlow API:', err);
          setError('Failed to fetch batch flow');
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }, 300);

    return () => clearTimeout(handler);
  }, [
    isOpen,
    editableQuantity,
    itemId,
    itemType,
    unitId,
    fromOrganizationId,
    fromSubOutletId,
    toOrganizationId,
    toSubOutletId,
  ]);

  if (!isOpen) return null;

  // Extract keys from backend response with fallbacks to props
  const effectiveItemName = batchData?.itemName || itemName || 'Item';
  const effectiveUnit = batchData?.unitSymbol || batchData?.unitName || unit || 'kg';

  const sourceLocationTitle =
    batchData?.sourceLocationTitle ||
    (batchData?.fromOrganizationName
      ? `${batchData.fromOrganizationName}${batchData.fromSubOutletName ? ` (${batchData.fromSubOutletName})` : ''}`
      : fromOutletName || 'Source Outlet');

  const destinationLocationTitle =
    batchData?.destinationLocationTitle ||
    (batchData?.toOrganizationName
      ? `${batchData.toOrganizationName}${batchData.toSubOutletName ? ` (${batchData.toSubOutletName})` : ''}`
      : toOutletName || 'Destination Outlet');

  const sourceTotalAvailable =
    batchData?.sourceTotalAvailableQuantity !== undefined && batchData?.sourceTotalAvailableQuantity !== null
      ? Number(batchData.sourceTotalAvailableQuantity)
      : null;

  // Source batches from getBatchFlow response
  const sourceBatches = Array.isArray(batchData?.sourceBatches)
    ? batchData.sourceBatches
    : Array.isArray(batchData?.sourceLayers)
    ? batchData.sourceLayers
    : [];

  // Destination layers from getBatchFlow response
  const destinationLayers = Array.isArray(batchData?.destinationLayers)
    ? batchData.destinationLayers
    : Array.isArray(batchData?.createdLayers)
    ? batchData.createdLayers
    : [];

  // Summary statistics
  const totalReceivedQuantity =
    batchData?.totalReceivedQuantity !== undefined && batchData?.totalReceivedQuantity !== null
      ? Number(batchData.totalReceivedQuantity)
      : destinationLayers.reduce((acc, l) => acc + Number(l.quantity || l.qty || 0), 0);

  const totalReceivedValuation =
    batchData?.totalReceivedValuation !== undefined && batchData?.totalReceivedValuation !== null
      ? Number(batchData.totalReceivedValuation)
      : destinationLayers.reduce(
          (acc, l) =>
            acc +
            (Number(l.totalAmount) ||
              Number(l.totalValuation) ||
              Number(l.quantity || 0) * Number(l.unitRate || 0)),
          0
        );

  const averageEffectiveRate =
    batchData?.averageEffectiveRate !== undefined && batchData?.averageEffectiveRate !== null
      ? Number(batchData.averageEffectiveRate)
      : totalReceivedQuantity > 0
      ? totalReceivedValuation / totalReceivedQuantity
      : 0;

  const calculatedAvailableStock =
    sourceTotalAvailable !== null
      ? sourceTotalAvailable
      : sourceBatches.reduce((acc, b) => acc + Number(b.initialAvailableQuantity || b.qty || 0), 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF2FF] flex items-center justify-center text-[#2952E3] shrink-0 mt-0.5 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-[#101828] truncate">
                  FIFO Rate-Wise Batch Flow
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#084E92] border border-blue-200">
                  {effectiveItemName} ({effectiveUnit})
                </span>
              </div>
              <p className="text-xs text-[#667085] mt-1 line-clamp-2 leading-relaxed">
                Stock is consumed from <strong className="text-gray-900">{sourceLocationTitle}</strong> in First-In-First-Out (FIFO) chronological order and recreated at <strong className="text-gray-900">{destinationLocationTitle}</strong> preserving exact historical unit valuations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer shrink-0 ml-2"
            title="Close Visualizer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 bg-[#F8FAFC] space-y-4">
          {/* Transfer Movement Header Bar with Editable Quantity */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-gray-900 truncate" title={sourceLocationTitle}>
                Source: {sourceLocationTitle}
              </span>
            </div>

            <div className="flex items-center justify-center shrink-0">
              <div className="flex items-center gap-1.5 bg-[#EEF2FF] border border-[#C7D7FE] rounded-xl px-2.5 py-1 shadow-2xs">
                <span className="text-[11px] font-bold text-[#084E92] uppercase">Requested Qty:</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editableQuantity}
                  onChange={(e) => setEditableQuantity(e.target.value)}
                  className="w-20 font-extrabold text-xs text-[#084E92] bg-white border border-[#C7D7FE] rounded-md px-1.5 py-0.5 outline-none text-center focus:ring-1 focus:ring-[#084E92]"
                  placeholder="0"
                  title="Change requested quantity to dynamically preview FIFO batch flow"
                />
                <span className="text-xs font-bold text-[#084E92]">{effectiveUnit}</span>
                <ArrowRight size={13} className="text-[#084E92] ml-1" />
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-0 sm:justify-end">
              <div className="w-2.5 h-2.5 rounded-full bg-[#2952E3] shrink-0" />
              <span className="text-xs font-bold text-gray-900 truncate" title={destinationLocationTitle}>
                Destination: {destinationLocationTitle}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#2952E3]" />
              <p className="text-sm font-medium">Calculating FIFO batch flow...</p>
            </div>
          ) : Number(editableQuantity || 0) <= 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              <Layers className="w-8 h-8 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">Requested Quantity Required</p>
              <p className="text-xs text-gray-400">Please enter a requested quantity greater than 0 above to view FIFO batch flow layers.</p>
            </div>
          ) : (
            <>
              {/* Dual Panels Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {/* Source Column */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-sm space-y-3 min-w-0">
                  <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 gap-2">
                    <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wide">
                      Source Batches Breakdown
                    </span>
                    <span className="text-xs font-semibold text-[#64748B] shrink-0">
                      Available: <strong className="text-[#0F172A]">{Number(calculatedAvailableStock).toFixed(2)} {effectiveUnit}</strong>
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto overflow-x-hidden pr-1">
                    {sourceBatches.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400">No source batch data available</div>
                    ) : (
                      sourceBatches.map((batch, idx) => {
                        const isConsumed =
                          batch.isConsumed ||
                          batch.consumptionStatusType === 'PARTIAL_CONSUMED' ||
                          batch.consumptionStatusType === 'FULL_CONSUMED' ||
                          Number(batch.consumedQuantity) > 0;

                        const batchTitle =
                          batch.referenceCode ||
                          batch.batchCode ||
                          batch.batchNumber ||
                          batch.name ||
                          `Batch #${batch.batchId || idx + 1}`;

                        const postingDateStr = formatDate(batch.postingDate || batch.date);
                        const initialQty = Number(batch.initialAvailableQuantity ?? batch.qty ?? 0);
                        const consumedQty = Number(batch.consumedQuantity ?? batch.consumed ?? 0);
                        const remainingQty = Number(batch.remainingQuantity ?? initialQty - consumedQty);
                        const rate = Number(batch.unitRate ?? batch.rate ?? 0);

                        return (
                          <div
                            key={batch.batchId || batch.id || idx}
                            className={`p-3 rounded-xl border transition-all space-y-2 ${
                              isConsumed
                                ? 'border-emerald-200 bg-emerald-50/30'
                                : 'border-gray-200 bg-gray-50/60 opacity-80'
                            }`}
                          >
                            {/* Top row: Reference Badge + Status */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-[#084E92] border border-blue-100 shrink-0">
                                  {batch.referenceType ? batch.referenceType.replace(/_/g, ' ') : 'BATCH'}
                                </span>
                                <span className="text-xs font-bold text-gray-900 truncate" title={batchTitle}>
                                  {batchTitle}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border shrink-0 ${getStatusBadgeStyle(
                                  batch.consumptionStatusType,
                                  isConsumed
                                )}`}
                              >
                                {batch.consumptionStatusText ||
                                  (isConsumed ? `CONSUMED ${consumedQty} ${effectiveUnit}` : 'Untouched')}
                              </span>
                            </div>

                            {/* Middle row: Code & Posting Date */}
                            <div className="flex items-center justify-between text-[11px] text-gray-500 gap-2">
                              {batch.batchCode && batch.batchCode !== batchTitle ? (
                                <span className="font-mono text-[10px] text-gray-600 truncate">{batch.batchCode}</span>
                              ) : (
                                <span />
                              )}
                              {postingDateStr && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
                                  <Calendar size={11} /> {postingDateStr}
                                </span>
                              )}
                            </div>

                            {/* Bottom row: Breakdown metrics */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/60 text-[11px] gap-2 flex-wrap">
                              <div className="flex items-center gap-2 text-gray-600 flex-wrap">
                                <span>Initial: <strong>{initialQty}</strong></span>
                                {consumedQty > 0 && (
                                  <span className="text-emerald-700 font-bold">
                                    Consumed: {consumedQty}
                                  </span>
                                )}
                                <span>Remaining: <strong>{remainingQty}</strong></span>
                              </div>
                              <span className="font-bold text-[#084E92] shrink-0">
                                @ ₹{rate.toFixed(2)} / {effectiveUnit}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Destination Column */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-sm space-y-3 min-w-0">
                  <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 gap-2">
                    <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wide">
                      Destination Recreated Layers
                    </span>
                    <span className="text-xs font-bold text-emerald-600 shrink-0">
                      Valuation: ₹{totalReceivedValuation.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto overflow-x-hidden pr-1">
                    {destinationLayers.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400">No destination layer data available</div>
                    ) : (
                      destinationLayers.map((layer, idx) => {
                        const layerQty = Number(layer.quantity ?? layer.qty ?? 0);
                        const layerRate = Number(layer.unitRate ?? layer.rate ?? 0);
                        const layerAmount = Number(
                          layer.totalAmount ?? layer.totalValuation ?? layerQty * layerRate
                        );
                        const postingDate = formatDate(layer.sourcePostingDate || layer.postingDate);

                        return (
                          <div
                            key={layer.layerIndex || layer.id || idx}
                            className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-5 h-5 rounded-full bg-[#2952E3] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {layer.layerIndex || idx + 1}
                                </div>
                                <span className="text-xs font-bold text-gray-900 truncate" title={layer.layerTitle}>
                                  {layer.layerTitle || `Layer ${idx + 1}`}
                                </span>
                              </div>
                              <span className="text-xs font-extrabold text-[#0F172A] shrink-0">
                                ₹{layerAmount.toFixed(2)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 text-[11px] text-gray-600 pl-7 gap-2">
                              <span className="truncate">
                                {layer.rateCalculationText ||
                                  `${layerQty} ${effectiveUnit} @ ₹${layerRate.toFixed(2)} / ${effectiveUnit}`}
                              </span>
                              {postingDate && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
                                  <Calendar size={11} /> {postingDate}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Summary Bar */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Exact rate-layer FIFO symmetry preserved across stock transfer.</span>
                </div>
                <div className="text-left sm:text-right space-y-0.5">
                  <p className="text-xs text-gray-500 font-medium">
                    Total Received Stock:{' '}
                    <strong className="text-gray-900 font-bold">
                      {totalReceivedQuantity.toFixed(2)} {effectiveUnit}
                    </strong>
                  </p>
                  <p className="text-sm font-bold text-[#084E92]">
                    Total Stock Valuation: ₹{totalReceivedValuation.toFixed(2)}{' '}
                    <span className="text-xs text-gray-500 font-normal">
                      (Avg Rate: ₹{Number(averageEffectiveRate).toFixed(2)}/{effectiveUnit})
                    </span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FifoBatchVisualizerModal;
