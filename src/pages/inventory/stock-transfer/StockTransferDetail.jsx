import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  ArrowLeft,
  Loader2,
  Building2,
  Truck,
  FileText,
  Layers,
  Pencil,
  Send,
  Boxes,
} from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import { Card, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { getTransferById, dispatchTransfer } from '@/services/apiServices';
import FifoBatchVisualizerModal from './FifoBatchVisualizerModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

const STATUS_STYLES = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-200',
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  'In Transit': 'bg-blue-50 text-blue-700 border-blue-200',
  IN_TRANSIT: 'bg-blue-50 text-blue-700 border-blue-200',
  'Partially Accepted': 'bg-purple-50 text-purple-700 border-purple-200',
  PARTIALLY_ACCEPTED: 'bg-purple-50 text-purple-700 border-purple-200',
  Received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_DOT = {
  Draft: 'bg-gray-400',
  DRAFT: 'bg-gray-400',
  Pending: 'bg-amber-500',
  PENDING: 'bg-amber-500',
  'In Transit': 'bg-blue-500',
  IN_TRANSIT: 'bg-blue-500',
  'Partially Accepted': 'bg-purple-500',
  PARTIALLY_ACCEPTED: 'bg-purple-500',
  Received: 'bg-emerald-500',
  RECEIVED: 'bg-emerald-500',
  Closed: 'bg-emerald-500',
  CLOSED: 'bg-emerald-500',
  Rejected: 'bg-rose-500',
  REJECTED: 'bg-rose-500',
};

const StatusBadge = ({ status = 'Draft' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
      STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`} />
    {status}
  </span>
);

const StockTransferDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Permissions
  const transferPermissions = usePagePermissions(['Stock Transfer Request', 'Stock Transfer', 'STR']);
  const receivePermissions = usePagePermissions(['STR Received', 'Stock Transfer Request Received', 'Stock Transfer Receive', 'STR Receive']);
  const canView = transferPermissions.canView || receivePermissions.canView;

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);

  // FIFO visualizer modal
  const [visualizerOpen, setVisualizerOpen] = useState(false);
  const [selectedItemForVisualizer, setSelectedItemForVisualizer] = useState(null);

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getTransferById(id);
      const data = res?.data?.data ?? res?.data ?? res;
      setTransfer(data);
    } catch (err) {
      console.error('Failed to load transfer detail:', err);
      toast.error('Failed to load transfer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleDispatch = async () => {
    if (!transfer?.id) return;
    setDispatching(true);
    try {
      const rawItems = Array.isArray(transfer.items)
        ? transfer.items
        : Array.isArray(transfer.transferItems)
        ? transfer.transferItems
        : Array.isArray(transfer.details)
        ? transfer.details
        : [];

      const dispatchPayload = {
        driverContact: (transfer.driverContact || '').trim(),
        driverName: (transfer.driverName || '').trim(),
        vehicleNumber: (transfer.vehicleNumber || '').trim(),
        remarks: (transfer.remarks || '').trim(),
        items: rawItems.map((item) => ({
          transferItemId: Number(item.id || item.transferItemId || 0),
          dispatchedQuantity: Number(
            item.transferQty ??
            item.requestedQuantity ??
            item.quantity ??
            item.dispatchedQuantity ??
            0
          ),
          batchNumber: item.batchNumber || '',
          expiryDate: item.expiryDate || '',
          remarks: item.remarks || '',
        })),
      };

      await dispatchTransfer(transfer.id, dispatchPayload);
      toast.success('Stock transfer dispatched successfully');
      fetchDetails();
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.msg || 'Failed to dispatch transfer';
      toast.error(errMsg);
    } finally {
      setDispatching(false);
    }
  };

  const rawStatus = (transfer?.status || '').toString().trim().toUpperCase();
  const isDraft = rawStatus === 'DRAFT' || Boolean(transfer?.isDraft);
  const isPending = rawStatus === 'PENDING';
  const isRejected = rawStatus === 'REJECTED' || String(transfer?.status || '').toUpperCase() === 'REJECTED';

  const manifestItems = React.useMemo(() => {
    if (!transfer) return [];
    const rawItems = Array.isArray(transfer.items)
      ? transfer.items
      : Array.isArray(transfer.transferItems)
      ? transfer.transferItems
      : Array.isArray(transfer.details)
      ? transfer.details
      : [];

    const isClosedOrReceived = ['CLOSED', 'RECEIVED', 'RECIEVED', 'PARTIALLY_ACCEPTED', 'PARTIALLYACCEPTED'].includes(rawStatus);

    return rawItems.map((item, idx) => {
      const reqQty = Number(
        item.requestedQuantity ??
        item.transferQty ??
        item.transferQuantity ??
        item.quantity ??
        0
      );
      const dispQty =
        item.dispatchedQuantity !== null && item.dispatchedQuantity !== undefined
          ? Number(item.dispatchedQuantity)
          : null;

      let recQty = null;
      if (isRejected) {
        recQty = 0;
      } else if (item.receivedQuantity !== null && item.receivedQuantity !== undefined) {
        recQty = Number(item.receivedQuantity);
      } else if (item.acceptedQuantity !== null && item.acceptedQuantity !== undefined) {
        recQty = Number(item.acceptedQuantity);
      } else if (item.acceptedQty !== null && item.acceptedQty !== undefined) {
        recQty = Number(item.acceptedQty);
      } else if (isClosedOrReceived) {
        recQty = 0;
      }

      let damQty = null;
      if (isRejected) {
        damQty = 0;
      } else if (item.damagedQuantity !== null && item.damagedQuantity !== undefined) {
        damQty = Number(item.damagedQuantity);
      } else if (item.damageQty !== null && item.damageQty !== undefined) {
        damQty = Number(item.damageQty);
      } else if (recQty !== null || isClosedOrReceived) {
        damQty = 0;
      }

      let shortQty = null;
      if (isRejected) {
        shortQty = 0;
      } else if (item.shortageQuantity !== null && item.shortageQuantity !== undefined) {
        shortQty = Number(item.shortageQuantity);
      } else if (item.shortageQty !== null && item.shortageQty !== undefined) {
        shortQty = Number(item.shortageQty);
      } else if (recQty !== null || isClosedOrReceived) {
        const calculatedShortage = reqQty - (recQty || 0) - (damQty || 0);
        shortQty = Math.max(0, calculatedShortage);
      }

      let rejQty = null;
      if (isRejected) {
        if (item.rejectedQuantity !== null && item.rejectedQuantity !== undefined) {
          rejQty = Number(item.rejectedQuantity);
        } else if (item.baseDispatchedQuantity !== null && item.baseDispatchedQuantity !== undefined) {
          rejQty = Number(item.baseDispatchedQuantity);
        } else if (item.baseDispatchedQty !== null && item.baseDispatchedQty !== undefined) {
          rejQty = Number(item.baseDispatchedQty);
        } else if (item.dispatchedQuantity !== null && item.dispatchedQuantity !== undefined) {
          rejQty = Number(item.dispatchedQuantity);
        } else {
          rejQty = reqQty;
        }
      } else if (item.rejectedQuantity !== null && item.rejectedQuantity !== undefined) {
        rejQty = Number(item.rejectedQuantity);
      }

      return {
        index: idx + 1,
        id: item.id,
        itemId: item.itemId || item.rawMaterialId || item.id,
        itemType: item.itemType || 'RAW_MATERIAL',
        unitId: item.unitId || item.unit?.id || item.measureUnitId || item.unitOfMeasurementId || item.uomId || item.rawMaterialUnitId || 0,
        transferItemId: item.id || item.transferItemId,
        itemName: item.itemName || item.rawMaterialName || `Raw Material Item #${idx + 1}`,
        unit: item.unitName || item.unitSymbol || item.unit || 'Units',
        requestedQuantity: reqQty,
        dispatchedQuantity: dispQty,
        receivedQuantity: recQty,
        acceptedQuantity: recQty,
        damagedQuantity: damQty,
        shortageQuantity: shortQty,
        rejectedQuantity: rejQty,
        valuation: Number(item.totalValuation || 0),
        effectiveRate: Number(item.averageEffectiveRate || 0),
        batchBreakdown: Array.isArray(item.batchBreakdown) ? item.batchBreakdown : [],
        status: item.status || '',
        remarks: item.remarks || '—',
      };
    });
  }, [transfer, isRejected, rawStatus]);

  const columns = React.useMemo(() => {
    const hasRejected = isRejected || manifestItems.some((i) => i.rejectedQuantity !== null && i.rejectedQuantity > 0);

    const cols = [
      {
        id: 'srNo',
        header: ({ column }) => (
          <DataGridColumnHeader title="SR." column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 text-xs font-semibold">{String(row.original.index).padStart(2, '0')}</span>
        ),
        size: 55,
      },
      {
        id: 'itemName',
        accessorFn: (row) => row.itemName,
        header: ({ column }) => (
          <DataGridColumnHeader title="ITEM NAME" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <div className="space-y-1.5 py-1">
            <button
              type="button"
              onClick={() => {
                const qty = Number(row.original.requestedQuantity || 0);
                if (!qty || qty <= 0) {
                  toast.info('Transfer quantity must be greater than 0 to view FIFO batch flow');
                  return;
                }
                setSelectedItemForVisualizer({
                  ...row.original,
                  fromOutletName: transfer?.fromOrganizationName || transfer?.fromOutletName || 'Source Outlet',
                  toOutletName: transfer?.toOrganizationName || transfer?.toOutletName || 'Destination Outlet',
                });
                setVisualizerOpen(true);
              }}
              className="group flex items-center gap-2 text-left hover:text-[#084E92] transition cursor-pointer"
              title="Click to view FIFO Batch Layer Visualizer"
            >
              <div className="w-6 h-6 rounded-lg bg-[#EEF2FF] text-[#2952E3] group-hover:bg-[#084E92] group-hover:text-white flex items-center justify-center shrink-0 transition">
                <Layers size={13} />
              </div>
              <span className="text-xs font-bold text-[#0F172A] group-hover:text-[#084E92] group-hover:underline">
                {row.original.itemName}
              </span>
            </button>
            {row.original.batchBreakdown.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pl-8">
                {row.original.batchBreakdown.map((b, bIdx) => (
                  <span
                    key={b.id || bIdx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-[#084E92] border border-blue-100"
                  >
                    Batch #{b.sourceStockBatchId || bIdx + 1}: {b.quantity} {row.original.unit} @ ₹{Number(b.unitRate || 0).toFixed(2)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
        size: 240,
      },
      {
        id: 'requestedQuantity',
        accessorFn: (row) => row.requestedQuantity,
        header: ({ column }) => (
          <DataGridColumnHeader title="TRANSFER QTY" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <span className="font-bold text-xs text-[#084E92]">
            {row.original.requestedQuantity} {row.original.unit}
          </span>
        ),
        size: 120,
      },
      {
        id: 'receivedQuantity',
        accessorFn: (row) => row.receivedQuantity,
        header: ({ column }) => (
          <DataGridColumnHeader title="RECEIVED QTY" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <span className="font-bold text-xs text-emerald-700">
            {row.original.receivedQuantity !== null && row.original.receivedQuantity !== undefined
              ? `${row.original.receivedQuantity} ${row.original.unit}`
              : '—'}
          </span>
        ),
        size: 120,
      },
      {
        id: 'damagedQuantity',
        accessorFn: (row) => row.damagedQuantity,
        header: ({ column }) => (
          <DataGridColumnHeader title="DAMAGED QTY" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <span
            className={`font-bold text-xs ${
              row.original.damagedQuantity !== null && row.original.damagedQuantity > 0
                ? 'text-rose-600'
                : 'text-gray-400'
            }`}
          >
            {row.original.damagedQuantity !== null && row.original.damagedQuantity !== undefined
              ? `${row.original.damagedQuantity} ${row.original.unit}`
              : '—'}
          </span>
        ),
        size: 120,
      },
      {
        id: 'shortageQuantity',
        accessorFn: (row) => row.shortageQuantity,
        header: ({ column }) => (
          <DataGridColumnHeader title="SHORTAGE QTY" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <span
            className={`font-bold text-xs ${
              row.original.shortageQuantity !== null && row.original.shortageQuantity > 0
                ? 'text-amber-600'
                : 'text-gray-400'
            }`}
          >
            {row.original.shortageQuantity !== null && row.original.shortageQuantity !== undefined
              ? `${row.original.shortageQuantity} ${row.original.unit}`
              : '—'}
          </span>
        ),
        size: 120,
      },
    ];

    if (hasRejected) {
      cols.push({
        id: 'rejectedQuantity',
        accessorFn: (row) => row.rejectedQuantity,
        header: ({ column }) => (
          <DataGridColumnHeader title="REJECTED QTY" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <span
            className={`font-bold text-xs ${
              row.original.rejectedQuantity !== null && row.original.rejectedQuantity > 0
                ? 'text-rose-600'
                : 'text-gray-400'
            }`}
          >
            {row.original.rejectedQuantity !== null && row.original.rejectedQuantity !== undefined
              ? `${row.original.rejectedQuantity} ${row.original.unit}`
              : '0'}
          </span>
        ),
        size: 120,
      });
    }

    cols.push(
      {
        id: 'rateValuation',
        header: ({ column }) => (
          <DataGridColumnHeader title="RATE / VALUATION" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => {
          if (!row.original.valuation && !row.original.effectiveRate) {
            return <span className="text-gray-400 text-xs font-medium">—</span>;
          }
          return (
            <div>
              <div className="font-bold text-xs text-gray-900">
                ₹{Number(row.original.valuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              {row.original.effectiveRate > 0 && (
                <div className="text-[10px] text-gray-500 font-medium">
                  @ ₹{Number(row.original.effectiveRate).toFixed(2)} / {row.original.unit}
                </div>
              )}
            </div>
          );
        },
        size: 140,
      },
      {
        id: 'remarks',
        accessorFn: (row) => row.remarks,
        header: ({ column }) => (
          <DataGridColumnHeader title="REMARKS" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => <span className="text-xs text-gray-500">{row.original.remarks || '—'}</span>,
        size: 150,
      }
    );

    return cols;
  }, [transfer, isRejected, manifestItems]);

  const table = useReactTable({
    data: manifestItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Stock Transfer" />;
  }

  return (
    <Container>
      <div className="py-1 md:py-2 pb-6 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Link to="/inventory/stock-transfer" className="hover:text-gray-600">
            Inventory
          </Link>
          <ChevronRight size={12} />
          <Link to="/inventory/stock-transfer" className="hover:text-gray-600">
            Stock Transfer
          </Link>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-semibold">
            {transfer?.transferCode || transfer?.code || `Transfer #${id}`}
          </span>
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#0F172A] font-sans">
                  {transfer?.transferCode || transfer?.code || `Transfer #${id}`}
                </h1>
                <StatusBadge status={transfer?.status || (isDraft ? 'Draft' : 'In Transit')} />
                {transfer?.totalValuation > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-800">
                    Total Valuation: ₹{Number(transfer.totalValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <p className="text-[#667085] text-xs mt-1">
                Internal inventory movement details and manifest.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/inventory/stock-transfer')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-sm cursor-pointer"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            {isDraft && transferPermissions.canEdit && (
              <button
                type="button"
                onClick={() => navigate(`/inventory/stock-transfer-request?id=${id}`)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#084E92] text-[#084E92] bg-white hover:bg-blue-50 text-xs font-semibold transition shadow-sm cursor-pointer"
              >
                <Pencil size={14} />
                Edit Transfer
              </button>
            )}

            {(isDraft || isPending) && (transferPermissions.canEdit || transferPermissions.canAdd) && (
              <button
                type="button"
                onClick={handleDispatch}
                disabled={dispatching}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#084E92] text-white text-xs font-semibold hover:bg-[#073e77] transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {dispatching ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Dispatch Transfer
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-24 bg-white rounded-2xl border border-[#E2E8F0] flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 size={24} className="animate-spin text-[#084E92]" />
            <p className="text-sm font-medium">Loading transfer details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Origin Card */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Building2 size={16} className="text-[#2952E3]" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Origin (Source)</h3>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase">From Outlet</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {transfer?.fromOrganizationName || transfer?.fromOutletName || transfer?.fromOutlet || '—'}
                  </p>
                </div>
                {transfer?.fromSubOutletId && transfer?.fromSubOutletName && transfer.fromSubOutletName !== 'Main Store' && (
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase">From Sub-Outlet</label>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">{transfer.fromSubOutletName}</p>
                  </div>
                )}
                {transfer?.requestedAt && (
                  <div className="pt-2 border-t border-gray-100">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase">Requested Date & Time</label>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{transfer.requestedAt}</p>
                  </div>
                )}
              </div>

              {/* Destination Card */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Building2 size={16} className={isRejected ? 'text-rose-500' : 'text-emerald-600'} />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Destination</h3>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase">To Outlet</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {transfer?.toOrganizationName || transfer?.toOutletName || transfer?.toOutlet || '—'}
                  </p>
                </div>
                {transfer?.toSubOutletId && transfer?.toSubOutletName && transfer.toSubOutletName !== 'Main Store' && (
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase">To Sub-Outlet</label>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">{transfer.toSubOutletName}</p>
                  </div>
                )}
                {isRejected ? (
                  (transfer?.rejectedAt ||
                    transfer?.rejectedDate ||
                    transfer?.rejectionDate ||
                    transfer?.rejectionDateTime ||
                    transfer?.rejectedDateTime ||
                    transfer?.updatedAt) && (
                    <div className="pt-2 border-t border-rose-100 bg-rose-50/50 p-2 rounded-xl">
                      <label className="text-[11px] font-semibold text-rose-500 uppercase block">
                        Rejected Date & Time
                      </label>
                      <p className="text-xs font-bold text-rose-700 mt-0.5">
                        {transfer.rejectedAt ||
                          transfer.rejectedDate ||
                          transfer.rejectionDate ||
                          transfer.rejectionDateTime ||
                          transfer.rejectedDateTime ||
                          transfer.updatedAt}
                      </p>
                    </div>
                  )
                ) : (
                  transfer?.receivedAt && (
                    <div className="pt-2 border-t border-gray-100">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase">
                        Received Date & Time
                      </label>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5">
                        {transfer.receivedAt}
                      </p>
                    </div>
                  )
                )}
                {isRejected && (transfer?.rejectionReason || transfer?.rejectReason || transfer?.cancelReason) && (
                  <div className="pt-1.5">
                    <label className="text-[11px] font-semibold text-rose-500 uppercase block">
                      Rejection Reason
                    </label>
                    <p className="text-xs text-rose-600 mt-0.5 italic">
                      "{transfer.rejectionReason || transfer.rejectReason || transfer.cancelReason}"
                    </p>
                  </div>
                )}
              </div>

              {/* Transport & Schedule Card */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Truck size={16} className="text-[#084E92]" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Transport & Schedule</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase">Vehicle Number</label>
                    <p className="text-xs font-bold text-gray-900 font-mono mt-0.5">{transfer?.vehicleNumber || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase">Transfer Date</label>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{transfer?.transferDate || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase">Driver Name</label>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{transfer?.driverName || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase">Driver Contact</label>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{transfer?.driverContact || '—'}</p>
                  </div>
                </div>
                {transfer?.dispatchedAt && (
                  <div className="pt-2 border-t border-gray-100">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase">Dispatched Date & Time</label>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{transfer.dispatchedAt}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Remarks note if present */}
            {transfer?.remarks && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 text-xs text-[#084E92]">
                <FileText size={16} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Remarks:</span>
                  <p className="mt-0.5 text-gray-700">{transfer.remarks}</p>
                </div>
              </div>
            )}

            {/* Manifest Table */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <Boxes size={18} className="text-[#084E92]" />
                  <span className="font-bold text-[#0F172A] text-sm">Transfer Manifest Items</span>
                </div>
                <span className="text-xs font-semibold text-gray-500">
                  Total Items: <strong className="text-[#0F172A]">{manifestItems.length} Distinct Items</strong>
                </span>
              </div>

              <DataGrid table={table} recordCount={manifestItems.length} className="rounded-none border-0">
                <Card className="rounded-none border-0 shadow-none">
                  <CardTable>
                    <ScrollArea>
                      <DataGridTable />
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </CardTable>
                </Card>
              </DataGrid>
            </div>
          </div>
        )}

        {/* FIFO Batch Flow Visualizer Modal */}
        {selectedItemForVisualizer && (
          <FifoBatchVisualizerModal
            isOpen={visualizerOpen}
            onClose={() => {
              setVisualizerOpen(false);
              setSelectedItemForVisualizer(null);
            }}
            transferItemId={selectedItemForVisualizer.transferItemId || selectedItemForVisualizer.id}
            itemId={selectedItemForVisualizer.itemId}
            itemType={selectedItemForVisualizer.itemType || 'RAW_MATERIAL'}
            unitId={selectedItemForVisualizer.unitId ? Number(selectedItemForVisualizer.unitId) : undefined}
            fromOrganizationId={transfer?.fromOrganizationId}
            fromSubOutletId={transfer?.fromSubOutletId}
            toOrganizationId={transfer?.toOrganizationId}
            toSubOutletId={transfer?.toSubOutletId}
            itemName={selectedItemForVisualizer.itemName}
            fromOutletName={selectedItemForVisualizer.fromOutletName}
            toOutletName={selectedItemForVisualizer.toOutletName}
            transferQty={selectedItemForVisualizer.requestedQuantity != null && selectedItemForVisualizer.requestedQuantity !== '' ? Number(selectedItemForVisualizer.requestedQuantity) : 0}
            unit={selectedItemForVisualizer.unit || 'kg'}
          />
        )}
      </div>
    </Container>
  );
};

export default StockTransferDetail;
