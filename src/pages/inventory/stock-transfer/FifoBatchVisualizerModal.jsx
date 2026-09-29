import React, { useEffect, useMemo, useState } from 'react';
import {
  Layers,
  ArrowRight,
  X,
  Loader2,
  CheckCircle2,
  Calendar,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Info,
  PackageCheck,
  Check,
  Clock,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { getBatchFlow } from '@/services/apiServices';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    if (dateStr.includes('T')) {
      const [d] = dateStr.split('T');
      const parts = d.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

const getBatchAvailableQty = (b) => {
  if (b.initialAvailableQuantity !== undefined && b.initialAvailableQuantity !== null) {
    return Number(b.initialAvailableQuantity);
  }
  const rem = Number(b.remainingQuantity ?? 0);
  const cons = Number(b.consumedQuantity ?? 0);
  return rem + cons > 0 ? rem + cons : rem;
};

const FifoBatchVisualizerModal = ({
  isOpen,
  onClose,
  item,
  transferItemId,
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
  onSaveBatches,
  isSelectionMode = false,
}) => {
  const allowBatchSelection = Boolean(onSaveBatches || isSelectionMode);
  const effectiveItemId = item?.itemId || itemId;
  const initialQty = Number(
    item?.transferQty !== undefined && item?.transferQty !== ''
      ? item.transferQty
      : item?.requestedQuantity !== undefined && item?.requestedQuantity !== ''
      ? item.requestedQuantity
      : item?.orderQty || transferQty || 0
  );

  const [editableQuantity, setEditableQuantity] = useState(initialQty || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batchData, setBatchData] = useState(null);
  const [allocatedMap, setAllocatedMap] = useState({}); // { [batchId]: quantity }

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
      const q = initialQty > 0 ? initialQty : 0;
      setEditableQuantity(q);

      // Pre-populate selections from item.selectedBatches if provided
      const initialMap = {};
      const batchList = Array.isArray(item?.selectedBatches)
        ? item.selectedBatches
        : Array.isArray(item?.batchBreakdown)
        ? item.batchBreakdown
        : [];

      if (batchList.length > 0) {
        batchList.forEach((sb) => {
          const bId = Number(sb.sourceStockBatchId || sb.batchId || sb.id);
          if (bId && Number(sb.quantity) > 0) {
            initialMap[bId] = Number(sb.quantity);
          }
        });
      }
      setAllocatedMap(initialMap);
    }
  }, [isOpen, initialQty, item?.selectedBatches, item?.batchBreakdown]);

  // Fetch batches when parameters change
  useEffect(() => {
    if (!isOpen) {
      setBatchData(null);
      setError(null);
      setAllocatedMap({});
      return;
    }

    const handler = setTimeout(() => {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          const safeQty = allowBatchSelection
            ? editableQuantity !== null && editableQuantity !== undefined && editableQuantity !== ''
              ? Number(editableQuantity)
              : 0
            : initialQty || 0;
          const requestedQuantity = isNaN(safeQty) ? 0 : safeQty;

          if (requestedQuantity <= 0 || !effectiveItemId) {
            setBatchData(null);
            setLoading(false);
            return;
          }

          const safeUnitId =
            item?.unitId != null && item?.unitId !== ''
              ? Number(item.unitId)
              : unitId != null && unitId !== ''
              ? Number(unitId)
              : Number(batchData?.unitId || 0);

          const params = {
            fromOrganizationId: Number(fromOrganizationId),
            itemId: Number(effectiveItemId),
            itemType: item?.itemType || itemType || 'RAW_MATERIAL',
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
          setError('Failed to fetch batch flow for this item.');
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }, 300);

    return () => clearTimeout(handler);
  }, [
    isOpen,
    allowBatchSelection,
    editableQuantity,
    initialQty,
    effectiveItemId,
    item?.itemType,
    item?.unitId,
    itemType,
    unitId,
    fromOrganizationId,
    fromSubOutletId,
    toOrganizationId,
    toSubOutletId,
  ]);

  const targetRequiredQty = useMemo(() => {
    if (!allowBatchSelection) return initialQty || 0;
    const q = Number(editableQuantity);
    return isNaN(q) || q < 0 ? 0 : q;
  }, [allowBatchSelection, initialQty, editableQuantity]);

  // Source batches from getBatchFlow response sorted chronologically by Expiry Date (FEFO)
  const sourceBatches = useMemo(() => {
    const list = Array.isArray(batchData?.sourceBatches)
      ? batchData.sourceBatches
      : Array.isArray(batchData?.sourceLayers)
      ? batchData.sourceLayers
      : [];

    return [...list].sort((a, b) => {
      const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [batchData]);

  const sourceTotalAvailable =
    batchData?.sourceTotalAvailableQuantity !== undefined && batchData?.sourceTotalAvailableQuantity !== null
      ? Number(batchData.sourceTotalAvailableQuantity)
      : null;

  const calculatedAvailableStock = useMemo(() => {
    return sourceTotalAvailable !== null
      ? sourceTotalAvailable
      : sourceBatches.reduce((acc, b) => acc + getBatchAvailableQty(b), 0);
  }, [sourceTotalAvailable, sourceBatches]);

  // Sanitize editableQuantity if it exceeds total calculated available stock (when stock is known and > 0)
  const handleTransferQtyChange = (valStr) => {
    if (valStr === '') {
      setEditableQuantity('');
      return;
    }
    let num = Number(valStr);
    if (isNaN(num) || num < 0) {
      num = 0;
    }
    if (calculatedAvailableStock > 0 && num > calculatedAvailableStock) {
      num = calculatedAvailableStock;
      toast.error(`Transfer quantity cannot exceed available stock (${calculatedAvailableStock} ${effectiveUnit})`);
    }
    setEditableQuantity(num);
  };

  // Sanitize allocatedMap: whenever sourceBatches change, prune any batch IDs that don't exist in current sourceBatches (in selection mode)
  useEffect(() => {
    if (!batchData || !allowBatchSelection) return;
    const validBatchIds = new Set(sourceBatches.map((b) => Number(b.batchId)));
    setAllocatedMap((prev) => {
      const updated = {};
      let changed = false;
      Object.entries(prev).forEach(([bId, qty]) => {
        const numId = Number(bId);
        if (validBatchIds.has(numId) && Number(qty) > 0) {
          const batchObj = sourceBatches.find((b) => Number(b.batchId) === numId);
          const maxAvail = batchObj ? getBatchAvailableQty(batchObj) : 0;
          const safeQty = Math.min(Number(qty), maxAvail);
          if (safeQty > 0) {
            updated[numId] = safeQty;
          } else {
            changed = true;
          }
          if (safeQty !== Number(qty)) changed = true;
        } else {
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [sourceBatches, batchData, allowBatchSelection]);

  // Allocation metrics strictly restricted to valid batches currently available in sourceBatches
  const totalAllocated = useMemo(() => {
    if (!allowBatchSelection) {
      return targetRequiredQty;
    }
    const validBatchIds = new Set(sourceBatches.map((b) => Number(b.batchId)));
    return Object.entries(allocatedMap).reduce((sum, [id, qty]) => {
      if (validBatchIds.has(Number(id))) {
        return sum + (Number(qty) || 0);
      }
      return sum;
    }, 0);
  }, [allowBatchSelection, targetRequiredQty, allocatedMap, sourceBatches]);

  const activeAllocatedCount = useMemo(() => {
    const validBatchIds = new Set(sourceBatches.map((b) => Number(b.batchId)));
    return Object.entries(allocatedMap).filter(
      ([id, qty]) => validBatchIds.has(Number(id)) && Number(qty) > 0
    ).length;
  }, [allocatedMap, sourceBatches]);

  const remainingNeeded = useMemo(() => {
    return Math.max(0, +(targetRequiredQty - totalAllocated).toFixed(4));
  }, [targetRequiredQty, totalAllocated]);

  const isExactFulfillment = useMemo(() => {
    return Math.abs(totalAllocated - targetRequiredQty) < 0.0001 && targetRequiredQty > 0 && activeAllocatedCount > 0;
  }, [totalAllocated, targetRequiredQty, activeAllocatedCount]);

  // Earliest expiring batch ID
  const earliestExpiringBatchId = useMemo(() => {
    const withExpiry = sourceBatches.filter((b) => b.expiryDate && getBatchAvailableQty(b) > 0);
    return withExpiry.length > 0 ? withExpiry[0].batchId : null;
  }, [sourceBatches]);

  // View-mode specific source batches (transferred batches)
  const viewTransferredBatches = useMemo(() => {
    const explicitBatches = Array.isArray(item?.selectedBatches) && item.selectedBatches.length > 0
      ? item.selectedBatches
      : Array.isArray(item?.batchBreakdown) && item.batchBreakdown.length > 0
      ? item.batchBreakdown
      : null;

    if (explicitBatches) {
      return explicitBatches.map((b, idx) => ({
        batchId: b.sourceStockBatchId || b.batchId || b.id || idx + 1,
        batchNumber: b.batchNumber || b.batchCode || b.referenceCode || `Batch #${b.sourceStockBatchId || idx + 1}`,
        batchCode: b.batchCode || b.batchNumber || b.referenceCode || `Batch #${b.sourceStockBatchId || idx + 1}`,
        referenceCode: b.referenceCode || '',
        quantity: Number(b.quantity || b.transferredQty || 0),
        unitRate: Number(b.unitRate || b.rate || 0),
        expiryDate: b.expiryDate || '',
      }));
    }

    if (sourceBatches.length > 0) {
      return sourceBatches;
    }

    return [];
  }, [item?.selectedBatches, item?.batchBreakdown, sourceBatches]);

  // Destination recreated layers:
  // - In batch selection mode: dynamically created strictly from the currently selected source batches.
  // - In view-only mode: reflects batchData.destinationLayers or recreated from viewTransferredBatches.
  const destinationLayers = useMemo(() => {
    if (!allowBatchSelection) {
      if (Array.isArray(batchData?.destinationLayers) && batchData.destinationLayers.length > 0) {
        return batchData.destinationLayers;
      }
      if (Array.isArray(batchData?.createdLayers) && batchData.createdLayers.length > 0) {
        return batchData.createdLayers;
      }
      // Recreate destination layers from viewTransferredBatches
      return viewTransferredBatches.map((b, idx) => {
        const rate = Number(b.unitRate || 0);
        const qty = Number(b.quantity || 0);
        const batchLabel = b.batchNumber || b.batchCode || b.referenceCode || `Batch #${b.batchId}`;
        return {
          layerIndex: idx + 1,
          id: b.batchId,
          layerTitle: `Layer ${idx + 1} (From ${batchLabel})`,
          quantity: qty,
          qty: qty,
          unitRate: rate,
          rate: rate,
          totalAmount: qty * rate,
          sourcePostingDate: b.expiryDate,
        };
      });
    }

    if (totalAllocated === 0 || activeAllocatedCount === 0) {
      return [];
    }

    const layers = [];
    let layerIdx = 1;

    for (const batch of sourceBatches) {
      const bId = Number(batch.batchId);
      const allocatedQty = Number(allocatedMap[bId] || 0);
      if (allocatedQty > 0) {
        const rate = Number(batch.unitRate ?? batch.rate ?? 0);
        const batchLabel = batch.batchNumber || batch.batchCode || batch.referenceCode || `Batch #${bId}`;
        layers.push({
          layerIndex: layerIdx,
          id: bId,
          layerTitle: `Layer ${layerIdx} (From ${batchLabel})`,
          quantity: allocatedQty,
          qty: allocatedQty,
          unitRate: rate,
          rate: rate,
          totalAmount: allocatedQty * rate,
          sourcePostingDate: batch.expiryDate || batch.postingDate,
        });
        layerIdx++;
      }
    }

    return layers;
  }, [allowBatchSelection, batchData, viewTransferredBatches, totalAllocated, activeAllocatedCount, sourceBatches, allocatedMap]);

  /**
   * Robust Auto-Allocate (FIFO / FEFO)
   */
  const handleAutoFifoAllocate = () => {
    if (targetRequiredQty <= 0) {
      toast.info('Please enter a requested quantity greater than 0.');
      return;
    }

    let toAllocate = targetRequiredQty;
    const newMap = {};

    for (const b of sourceBatches) {
      const avail = getBatchAvailableQty(b);
      if (avail <= 0) continue;

      const take = Math.min(avail, toAllocate);
      newMap[b.batchId] = take;
      toAllocate -= take;

      if (toAllocate <= 0) break;
    }

    setAllocatedMap(newMap);

    if (toAllocate > 0) {
      toast.warning(
        `Only ${targetRequiredQty - toAllocate} ${effectiveUnit} available across all batches. Requested is ${targetRequiredQty} ${effectiveUnit}.`
      );
    } else {
      toast.success(`Auto-allocated ${targetRequiredQty} ${effectiveUnit} via FIFO.`);
    }
  };

  const handleClearAllocation = () => {
    setAllocatedMap({});
  };

  /**
   * Checkbox Toggle Handler with Case 1, 2, 3 Logic
   */
  const handleCheckboxToggle = (batch) => {
    const bId = batch.batchId;
    const available = getBatchAvailableQty(batch);

    if (available <= 0) {
      toast.error('This batch has 0 available stock.');
      return;
    }

    const currentAllocated = allocatedMap[bId] || 0;

    // UNCHECK if already selected
    if (currentAllocated > 0) {
      const updated = { ...allocatedMap };
      delete updated[bId];
      setAllocatedMap(updated);
      return;
    }

    // Case 2: Batch alone fulfills entire target quantity
    if (available >= targetRequiredQty) {
      setAllocatedMap({ [bId]: targetRequiredQty });
      const bLabel = batch.batchNumber || batch.batchCode || batch.referenceCode || bId;
      toast.success(
        `Selected full ${targetRequiredQty} ${effectiveUnit} from Batch ${bLabel}`
      );
      return;
    }

    // Already 100% full
    if (remainingNeeded <= 0) {
      toast.info(
        `Required quantity (${targetRequiredQty} ${effectiveUnit}) is already fulfilled. Uncheck a batch first or select a batch with sufficient quantity.`
      );
      return;
    }

    // Case 1 & 3: Allocate from this batch
    const take = Math.min(available, remainingNeeded);
    setAllocatedMap((prev) => ({
      ...prev,
      [bId]: take,
    }));
  };

  const handleQuantityInputChange = (batchId, valStr, available) => {
    if (valStr === '') {
      const updated = { ...allocatedMap };
      delete updated[batchId];
      setAllocatedMap(updated);
      return;
    }

    let num = Number(valStr);
    if (isNaN(num) || num < 0) return;

    if (num > available) {
      num = available;
      toast.error(`Cannot allocate more than batch available stock (${available} ${effectiveUnit})`);
    }

    const currentOthersTotal = Object.entries(allocatedMap).reduce((sum, [id, q]) => {
      return Number(id) === Number(batchId) ? sum : sum + (Number(q) || 0);
    }, 0);

    if (currentOthersTotal + num > targetRequiredQty) {
      const maxAllowed = Math.max(0, targetRequiredQty - currentOthersTotal);
      num = maxAllowed;
      toast.error(
        `Total allocation cannot exceed requested quantity (${targetRequiredQty} ${effectiveUnit}). Max allowed here is ${maxAllowed}.`
      );
    }

    setAllocatedMap((prev) => ({
      ...prev,
      [batchId]: num,
    }));
  };

  const handleConfirmSave = () => {
    if (!isExactFulfillment) {
      toast.error(
        `Total allocated quantity (${totalAllocated} ${effectiveUnit}) must exactly match requested quantity (${targetRequiredQty} ${effectiveUnit}).`
      );
      return;
    }

    const selectedBatchesList = Object.entries(allocatedMap)
      .filter(([bId, qty]) => {
        const numId = Number(bId);
        const batchObj = sourceBatches.find((b) => Number(b.batchId) === numId);
        return Boolean(batchObj && Number(qty) > 0);
      })
      .map(([bId, qty]) => {
        const batchObj = sourceBatches.find((b) => Number(b.batchId) === Number(bId));
        return {
          sourceStockBatchId: Number(bId),
          batchId: Number(bId),
          batchNumber: batchObj?.batchNumber || batchObj?.batchCode || batchObj?.referenceCode || '',
          batchCode: batchObj?.batchCode || '',
          referenceCode: batchObj?.referenceCode || '',
          referenceType: batchObj?.referenceType || '',
          expiryDate: batchObj?.expiryDate || '',
          quantity: Number(qty),
          unitRate: Number(batchObj?.unitRate || 0),
        };
      });

    if (onSaveBatches) {
      onSaveBatches(selectedBatchesList, targetRequiredQty);
    }
    toast.success(`Batches applied successfully for ${item?.itemName || itemName}`);
    onClose();
  };

  if (!isOpen) return null;

  const effectiveItemName = batchData?.itemName || item?.itemName || itemName || 'Item';
  const effectiveUnit = batchData?.unitSymbol || batchData?.unitName || item?.unit || unit || 'kg';

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

  const totalReceivedQuantity = useMemo(() => {
    if (allowBatchSelection) {
      return totalAllocated;
    }
    return destinationLayers.reduce((acc, l) => acc + Number(l.quantity || l.qty || 0), 0) || initialQty || 0;
  }, [allowBatchSelection, totalAllocated, destinationLayers, initialQty]);

  const totalReceivedValuation = useMemo(() => {
    return destinationLayers.reduce(
      (acc, l) =>
        acc +
        (Number(l.totalAmount) ||
          Number(l.totalValuation) ||
          Number(l.quantity || 0) * Number(l.unitRate || 0)),
      0
    );
  }, [destinationLayers]);

  const averageEffectiveRate = useMemo(() => {
    return totalReceivedQuantity > 0 ? totalReceivedValuation / totalReceivedQuantity : 0;
  }, [totalReceivedQuantity, totalReceivedValuation]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-gray-900">
                  {allowBatchSelection ? 'Batch Allocation & FIFO Flow' : 'FIFO Transferred Batch Flow & Recreation'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#084E92] border border-blue-200">
                  {effectiveItemName}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                From <strong className="text-gray-700 font-semibold">{sourceLocationTitle}</strong> &rarr; To <strong className="text-gray-700 font-semibold">{destinationLocationTitle}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
          {/* Top Bar: Live Editable in Selection Mode, or Static Badge in View Purpose */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              {allowBatchSelection ? (
                <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200 rounded-xl px-3 py-1.5 shadow-2xs">
                  <span className="text-xs font-bold text-[#084E92] uppercase tracking-wide">
                    Transfer Qty:
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={calculatedAvailableStock > 0 ? calculatedAvailableStock : undefined}
                    step="any"
                    value={editableQuantity}
                    onChange={(e) => handleTransferQtyChange(e.target.value)}
                    className="w-20 font-bold text-xs text-[#084E92] bg-white border border-blue-300 rounded-lg px-2 py-1 outline-none text-center focus:ring-2 focus:ring-[#084E92]/20"
                    placeholder="0"
                    title="Change quantity to preview and select batches"
                  />
                  <span className="text-xs font-bold text-[#084E92]">{effectiveUnit}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 bg-blue-50/70 border border-blue-200 rounded-xl px-4 py-2 shadow-2xs">
                  <Boxes size={16} className="text-[#084E92]" />
                  <span className="text-xs font-bold text-[#084E92] uppercase tracking-wide">
                    Transferred Qty:
                  </span>
                  <span className="font-bold text-xs text-[#084E92]">
                    {initialQty} {effectiveUnit}
                  </span>
                </div>
              )}

              {allowBatchSelection && (
                <div className="flex items-center gap-3 text-xs pl-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Allocated</span>
                    <span
                      className={`font-bold ${
                        isExactFulfillment
                          ? 'text-emerald-600'
                          : totalAllocated > targetRequiredQty
                          ? 'text-rose-600'
                          : 'text-[#084E92]'
                      }`}
                    >
                      {totalAllocated} / {targetRequiredQty} {effectiveUnit}
                    </span>
                  </div>

                  <div className="h-6 w-[1px] bg-gray-200" />

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Remaining</span>
                    <span
                      className={`font-bold ${
                        remainingNeeded === 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {remainingNeeded === 0 ? '0 (Fulfilled ✓)' : `${remainingNeeded} ${effectiveUnit}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {allowBatchSelection ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAutoFifoAllocate}
                  disabled={loading || sourceBatches.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] transition shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Auto-select batches by earliest expiry date (FEFO)"
                >
                  Auto-Allocate (FEFO)
                </button>
                <button
                  type="button"
                  onClick={handleClearAllocation}
                  disabled={loading || totalAllocated === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition disabled:opacity-40 cursor-pointer"
                  title="Reset batch selections"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              </div>
            ) : (
              <div>
            
              </div>
            )}
          </div>

          {/* Loading or Empty State */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-gray-400 bg-white rounded-xl border border-gray-200">
              <Loader2 className="w-8 h-8 animate-spin text-[#084E92]" />
              <p className="text-xs font-semibold text-gray-700">Loading batch details & FIFO rate layers...</p>
            </div>
          ) : targetRequiredQty <= 0 && allowBatchSelection ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
              <PackageCheck className="w-8 h-8 text-gray-300" />
              <p className="text-xs font-semibold text-gray-700">Please enter a transfer quantity above 0</p>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-amber-600 bg-amber-50/50 rounded-xl border border-amber-200">
              <AlertTriangle className="w-7 h-7 text-amber-500" />
              <p className="text-xs font-semibold text-gray-800">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Left Panel: Source Batches */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3 min-w-0">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 gap-2">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    {allowBatchSelection
                      ? `Available Source Batches (${sourceBatches.length})`
                      : `Source Transferred Batches (${viewTransferredBatches.length})`}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    Total: <strong className="text-gray-900">
                      {allowBatchSelection
                        ? `${Number(calculatedAvailableStock).toFixed(2)} ${effectiveUnit}`
                        : `${Number(totalReceivedQuantity).toFixed(2)} ${effectiveUnit}`}
                    </strong>
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {allowBatchSelection ? (
                    sourceBatches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400 border border-dashed rounded-lg">
                        No stock batches available for this item in source outlet.
                      </div>
                    ) : (
                      sourceBatches.map((batch, idx) => {
                        const bId = batch.batchId || batch.id || idx;
                        const available = getBatchAvailableQty(batch);
                        const isSelected = Boolean(allocatedMap[bId] && allocatedMap[bId] > 0);
                        const allocatedQty = allocatedMap[bId] || 0;
                        const isEarliestExpiry = bId === earliestExpiringBatchId;
                        const expiryDateStr = formatDate(batch.expiryDate);
                        const rate = Number(batch.unitRate ?? batch.rate ?? 0);

                        const batchLabel = batch.batchNumber || batch.batchCode || batch.referenceCode || `Batch #${bId}`;
                        const canFulfillEntirely = available >= targetRequiredQty;

                        return (
                          <div
                            key={bId}
                            onClick={() => handleCheckboxToggle(batch)}
                            className={`p-3 rounded-xl border transition flex flex-col gap-2 cursor-pointer ${
                              isSelected
                                ? 'border-[#084E92] bg-blue-50/40 shadow-xs ring-1 ring-[#084E92]/20'
                                : available <= 0
                                ? 'border-gray-200 bg-gray-50/60 opacity-50 cursor-not-allowed'
                                : 'border-gray-200 bg-white hover:border-blue-300'
                            }`}
                          >
                            {/* Top Row: Checkbox + Batch Number on Left; Right-Aligned Expires First / Full Qty on Right */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    disabled={available <= 0}
                                    onClick={() => handleCheckboxToggle(batch)}
                                    className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition border cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#084E92] border-[#084E92] text-white'
                                        : 'bg-white border-gray-300 hover:border-gray-400 text-transparent'
                                    }`}
                                  >
                                    <Check size={12} strokeWidth={3} />
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs font-bold text-gray-900 truncate font-mono">
                                    {batchLabel}
                                  </span>
                                  {batch.referenceCode && (
                                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded font-mono shrink-0 border border-gray-200">
                                      {batch.referenceCode}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right-aligned tags */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                {canFulfillEntirely && !isSelected && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Full Qty
                                  </span>
                                )}
                                {isEarliestExpiry && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-[#084E92] border border-blue-200">
                                    <Clock size={10} className="text-[#084E92]" />
                                    Expires First
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Bottom Row: Expiry, Available & Rate on Left; Allocated Input on Right */}
                            <div className="flex items-center justify-between gap-2 text-[10.5px] text-gray-500 pl-7">
                              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                <span className="flex items-center gap-0.5 shrink-0">
                                  <Calendar size={11} className="text-gray-400" />
                                  Expiry: <strong className="text-gray-800 font-semibold ml-0.5">{expiryDateStr}</strong>
                                </span>

                                <span className="text-gray-300">·</span>

                                <span className="shrink-0">
                                  Available: <strong className="text-gray-900 font-semibold">{available} {effectiveUnit}</strong>
                                </span>

                                <span className="text-gray-300">·</span>

                                <span className="shrink-0">
                                  Rate: <strong className="text-gray-900 font-semibold">₹{rate.toFixed(2)}/{effectiveUnit}</strong>
                                </span>
                              </div>

                              <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isSelected ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-[#084E92] bg-blue-50 border border-blue-200">
                                    {allocatedQty} {effectiveUnit}
                                  </span>
                                ) : (
                                  <span className="text-[10.5px] text-gray-400 font-medium">Unselected</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )
                  ) : (
                    // Read-only View Purpose Source Batches
                    viewTransferredBatches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400 border border-dashed rounded-lg">
                        No batch information available for this transferred item.
                      </div>
                    ) : (
                      viewTransferredBatches.map((batch, idx) => {
                        const expiryDateStr = formatDate(batch.expiryDate);
                        const rate = Number(batch.unitRate || batch.rate || 0);
                        const qty = Number(batch.quantity || 0);
                        const amount = qty * rate;
                        const batchLabel = batch.batchNumber || batch.batchCode || batch.referenceCode || `Batch #${batch.batchId || idx + 1}`;

                        return (
                          <div
                            key={batch.batchId || idx}
                            className="p-3 rounded-xl border border-gray-200 bg-white space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-bold text-gray-900 truncate font-mono">
                                  {batchLabel}
                                </span>
                                {batch.referenceCode && (
                                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded font-mono shrink-0 border border-gray-200">
                                    {batch.referenceCode}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-bold text-[#084E92]">
                                {qty} {effectiveUnit}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-gray-500 gap-2 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} className="text-gray-400" />
                                Expiry: <strong className="text-gray-800 font-semibold">{expiryDateStr}</strong>
                              </span>
                              <span>
                                @ ₹{rate.toFixed(2)} / {effectiveUnit} = <strong className="text-gray-900 font-semibold">₹{amount.toFixed(2)}</strong>
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              </div>

              {/* Right Panel: Destination Recreated Rate Layers */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3 min-w-0">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 gap-2">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    Destination Recreated Layers ({destinationLayers.length})
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    Valuation: ₹{totalReceivedValuation.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {destinationLayers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 border border-dashed rounded-lg">
                      {allowBatchSelection
                        ? 'Select batch(es) from the source panel to preview destination recreated layers.'
                        : 'Destination FIFO rate layers will appear here.'}
                    </div>
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
                          className="p-3 rounded-xl border border-blue-100 bg-blue-50/30 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-[#084E92] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                {layer.layerIndex || idx + 1}
                              </div>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-bold text-gray-900 truncate font-mono" title={layer.layerTitle}>
                                  {layer.sourceBatchNumber || layer.batchNumber || layer.batchCode
                                    ? `Layer ${layer.layerIndex || idx + 1} (From ${layer.sourceBatchNumber || layer.batchNumber || layer.batchCode})`
                                    : layer.layerTitle || `Layer ${layer.layerIndex || idx + 1}`}
                                </span>
                                {layer.sourceReferenceCode && (
                                  <span className="text-[10px] text-[#084E92] bg-white border border-blue-200 px-1.5 py-0.2 rounded font-mono shrink-0">
                                    {layer.sourceReferenceCode}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-bold text-gray-900 shrink-0">
                              ₹{layerAmount.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-gray-600 pl-7 gap-2 flex-wrap">
                            <span>
                              {layerQty} {effectiveUnit} @ ₹{layerRate.toFixed(2)} / {effectiveUnit}
                            </span>
                            {postingDate && (
                              <span className="text-[10px] text-gray-400">
                                {postingDate}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Valuation Summary Box */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Effective Avg Rate:</span>
                  <span className="font-bold text-[#084E92]">
                    ₹{Number(averageEffectiveRate).toFixed(2)} / {effectiveUnit}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white shrink-0 flex-wrap gap-2">
          {allowBatchSelection ? (
            <>
              <div className="flex items-center gap-2 text-xs">
                {isExactFulfillment ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <CheckCircle2 size={16} />
                    {targetRequiredQty} {effectiveUnit} allocated across {activeAllocatedCount} batch(es).
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                    <Info size={15} />
                    Allocate exactly {targetRequiredQty} {effectiveUnit} ({remainingNeeded} {effectiveUnit} remaining).
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={!isExactFulfillment}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={15} />
                  Confirm & Apply Batches
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-gray-600 font-semibold">
                Transferred {initialQty} {effectiveUnit} across {viewTransferredBatches.length} batch(es) · Valuation: ₹{totalReceivedValuation.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FifoBatchVisualizerModal;
