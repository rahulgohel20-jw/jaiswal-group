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
  CheckCircle2,
  XCircle,
  CheckCheck,
  Ban,
  AlertTriangle,
  Eye,
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
import {
  getTransferById,
  dispatchTransfer,
  approveTransfer,
  rejectTransfer,
} from '@/services/apiServices';
import { getUserIdFromToken } from '@/utils/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import FifoBatchVisualizerModal from './FifoBatchVisualizerModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { useOrgScope } from '@/hooks/useOrgScope';

const STATUS_STYLES = {
  Draft: 'bg-amber-50 text-amber-700 border-amber-200',
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'In Transit': 'bg-blue-50 text-blue-700 border-blue-200',
  IN_TRANSIT: 'bg-blue-50 text-blue-700 border-blue-200',
  'Partially Accepted': 'bg-purple-50 text-purple-700 border-purple-200',
  PARTIALLY_ACCEPTED: 'bg-purple-50 text-purple-700 border-purple-200',
  Received: 'bg-gray-100 text-gray-700 border-gray-200',
  RECEIVED: 'bg-gray-100 text-gray-700 border-gray-200',
  Closed: 'bg-gray-100 text-gray-700 border-gray-200',
  CLOSED: 'bg-gray-100 text-gray-700 border-gray-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  'Pending Discrepancy Approval': 'bg-orange-50 text-orange-700 border-orange-200',
  PENDING_DISCREPANCY_APPROVAL: 'bg-orange-50 text-orange-700 border-orange-200',
  'Discrepancy Pending': 'bg-amber-50 text-amber-700 border-amber-200',
  DISCREPANCY_PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  'Discrepancy Resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISCREPANCY_RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const STATUS_DOT = {
  Draft: 'bg-amber-500',
  DRAFT: 'bg-amber-500',
  Pending: 'bg-amber-500',
  PENDING: 'bg-amber-500',
  Approved: 'bg-emerald-500',
  APPROVED: 'bg-emerald-500',
  'In Transit': 'bg-blue-500',
  IN_TRANSIT: 'bg-blue-500',
  'Partially Accepted': 'bg-purple-500',
  PARTIALLY_ACCEPTED: 'bg-purple-500',
  Received: 'bg-gray-400',
  RECEIVED: 'bg-gray-400',
  Closed: 'bg-gray-400',
  CLOSED: 'bg-gray-400',
  Rejected: 'bg-rose-500',
  REJECTED: 'bg-rose-500',
  'Pending Discrepancy Approval': 'bg-orange-500',
  PENDING_DISCREPANCY_APPROVAL: 'bg-orange-500',
  'Discrepancy Pending': 'bg-amber-500',
  DISCREPANCY_PENDING: 'bg-amber-500',
  'Discrepancy Resolved': 'bg-emerald-500',
  DISCREPANCY_RESOLVED: 'bg-emerald-500',
};

const formatStatusLabel = (status) => {
  if (!status) return 'Draft';
  const s = String(status).toUpperCase().replace(/[\s_]/g, '');
  if (s === 'DRAFT') return 'Draft';
  if (s === 'PENDING' || s === 'SENTFORAPPROVAL' || s === 'PENDINGAPPROVAL') return 'Pending Approval';
  if (s === 'APPROVED') return 'Approved';
  if (s === 'INTRANSIT') return 'In Transit';
  if (s === 'PARTIALLYACCEPTED') return 'Partially Accepted';
  if (s === 'REJECTED') return 'Rejected';
  if (s === 'CLOSED' || s === 'RECEIVED' || s === 'RECIEVED') return 'Closed';
  if (s === 'PENDINGDISCREPANCYAPPROVAL') return 'Pending Discrepancy Approval';
  if (s === 'DISCREPANCYPENDING') return 'Discrepancy Pending';
  if (s === 'DISCREPANCYRESOLVED') return 'Discrepancy Resolved';
  return status;
};

const StatusBadge = ({ status = 'Draft' }) => {
  const label = formatStatusLabel(status);
  return (
    <span className="text-xs font-semibold text-gray-700">
      {label}
    </span>
  );
};

const StockTransferDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Permissions
  const transferPermissions = usePagePermissions(['Stock Transfer Request', 'Stock Transfer', 'STR']);
  const receivePermissions = usePagePermissions(['STR Received', 'Stock Transfer Request Received', 'Stock Transfer Receive', 'STR Receive']);
  const approvalPermissions = usePagePermissions(['STR Approval', 'Stock Transfer Approval', 'Stock Transfer Request Approval']);
  const canView = transferPermissions.canView || receivePermissions.canView || approvalPermissions.canView;
  const {
    subOutlets: scopeSubOutlets = [],
    subLocations: scopeSubLocations = [],
  } = useOrgScope();

  // Fast lookup maps for sub-outlets and sub-locations
  const subOutletMap = React.useMemo(() => {
    const map = {};
    (scopeSubOutlets || []).forEach((s) => {
      map[String(s.id)] = s.subOutletName || s.name || s.label;
    });
    return map;
  }, [scopeSubOutlets]);

  const subLocationMap = React.useMemo(() => {
    const map = {};
    (scopeSubLocations || []).forEach((l) => {
      map[String(l.id)] = l.locationName || l.subLocationName || l.name || l.label;
    });
    return map;
  }, [scopeSubLocations]);

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);

  // FIFO visualizer modal
  const [visualizerOpen, setVisualizerOpen] = useState(false);
  const [selectedItemForVisualizer, setSelectedItemForVisualizer] = useState(null);

  // Approval & Rejection modal state
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejecting, setRejecting] = useState(false);

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

  const handleConfirmApprove = async () => {
    if (!transfer?.id) return;
    setApproving(true);
    try {
      const currentUserId = getUserIdFromToken() || (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null);
      await approveTransfer(transfer.id, currentUserId);
      toast.success(`Stock transfer ${transfer.transferCode || transfer.code || ''} approved successfully`);
      setApproveModalOpen(false);
      fetchDetails();
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.msg || 'Failed to approve transfer';
      toast.error(errMsg);
    } finally {
      setApproving(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!transfer?.id) return;
    if (!rejectReason.trim()) {
      setRejectError('Please enter a mandatory reason for rejecting this transfer request.');
      return;
    }
    setRejectError('');
    setRejecting(true);
    try {
      const currentUserId = getUserIdFromToken() || (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null);
      const payload = {
        id: Number(transfer.id),
        reason: rejectReason.trim(),
        userId: currentUserId ? Number(currentUserId) : undefined,
      };
      await rejectTransfer(transfer.id, payload);
      toast.success(`Stock transfer ${transfer.transferCode || transfer.code || ''} rejected successfully`);
      setRejectModalOpen(false);
      fetchDetails();
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.msg || 'Failed to reject transfer';
      toast.error(errMsg);
    } finally {
      setRejecting(false);
    }
  };

  const rawStatus = (transfer?.status || '').toString().trim().toUpperCase().replace(/[\s_]/g, '');
  const isDraft = rawStatus === 'DRAFT' || Boolean(transfer?.isDraft);
  const isApproved = rawStatus === 'APPROVED';
  const isPending =
    rawStatus === 'DRAFT' ||
    rawStatus === 'PENDING' ||
    rawStatus === 'SENTFORAPPROVAL' ||
    rawStatus === 'PENDINGAPPROVAL' ||
    Boolean(transfer?.isDraft);
  const isRejected = rawStatus === 'REJECTED';

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
        batches:
          Array.isArray(item.selectedBatches) && item.selectedBatches.length > 0
            ? item.selectedBatches
            : Array.isArray(item.batchBreakdown) && item.batchBreakdown.length > 0
            ? item.batchBreakdown
            : Array.isArray(item.batches) && item.batches.length > 0
            ? item.batches
            : item.batchNumber
            ? [
                {
                  batchNumber: item.batchNumber,
                  expiryDate: item.expiryDate || '',
                  quantity: item.dispatchedQuantity ?? reqQty,
                  sourceStockBatchId: item.sourceStockBatchId || null,
                },
              ]
            : [],
        selectedBatches: Array.isArray(item.selectedBatches) ? item.selectedBatches : [],
        batchBreakdown: Array.isArray(item.batchBreakdown) ? item.batchBreakdown : [],
        batchNumber: item.batchNumber || '',
        expiryDate: item.expiryDate || '',
        discrepancyResolution: item.discrepancyResolution || '',
        reasonCategory: item.reasonCategory || item.reason || '',
        discrepancyRemarks: item.discrepancyRemarks || '',
        resolutionQuantity: Number(item.resolutionQuantity || shortQty || 0),
        status: item.status || '',
        remarks: item.remarks || item.discrepancyRemarks || item.reasonCategory || item.reason || '—',
      };
    });
  }, [transfer, isRejected, rawStatus]);

  const openVisualizer = (rowItem) => {
    setSelectedItemForVisualizer({
      ...rowItem,
      itemId: rowItem.itemId,
      itemName: rowItem.itemName,
      transferItemId: rowItem.transferItemId || rowItem.id,
      fromOrganizationId: transfer?.fromOrganizationId || transfer?.fromOutletId,
      fromSubOutletId: transfer?.fromSubOutletId,
      fromSubLocationId: transfer?.fromSubLocationId,
      toOrganizationId: transfer?.toOrganizationId || transfer?.toOutletId,
      toSubOutletId: transfer?.toSubOutletId,
      toSubLocationId: transfer?.toSubLocationId,
      fromOutletName: transfer?.fromOrganizationName || transfer?.fromOutletName || transfer?.fromOutlet || 'Source Unit',
      toOutletName: transfer?.toOrganizationName || transfer?.toOutletName || transfer?.toOutlet || 'Destination Unit',
      selectedBatches: rowItem.batches || rowItem.selectedBatches || [],
      batchBreakdown: rowItem.batches || rowItem.batchBreakdown || [],
      batches: rowItem.batches || [],
      transferQty: Number(rowItem.dispatchedQuantity || rowItem.requestedQuantity || rowItem.receivedQuantity || 0),
      unit: rowItem.unit,
    });
    setVisualizerOpen(true);
  };

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
        size: 38,
        enableSorting: false,
      },
      {
        id: 'itemName',
        accessorFn: (row) => row.itemName,
        header: ({ column }) => (
          <DataGridColumnHeader title="ITEM NAME" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => {
          const itemBatches = Array.isArray(row.original.batches) ? row.original.batches : [];
          return (
            <div className="flex flex-col gap-1 py-0.5 min-w-0">
              <span className="text-xs font-bold text-[#0F172A] block truncate" title={row.original.itemName}>
                {row.original.itemName}
              </span>

              {/* View Batches Button (Opens Read Mode FIFO Batch Visualizer Modal) */}
              <button
                type="button"
                onClick={() => openVisualizer(row.original)}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-[#084E92] border border-blue-200 hover:bg-blue-100 transition cursor-pointer shadow-2xs w-fit"
                title="Click to view batch allocation & FIFO flow details"
              >
                <Boxes size={12} className="text-[#084E92] shrink-0" />
                <span>
                  {itemBatches.length > 0
                    ? `${itemBatches.length} ${itemBatches.length === 1 ? 'Batch' : 'Batches'} Allocated`
                    : 'View Batches'}
                </span>
                <Eye size={12} className="text-[#084E92] shrink-0 ml-0.5" />
              </button>
            </div>
          );
        },
        size: 190,
        enableSorting: false,
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
        size: 95,
        enableSorting: false,
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
        size: 95,
        enableSorting: false,
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
        size: 90,
        enableSorting: false,
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
        size: 90,
        enableSorting: false,
      },
      {
        id: 'discrepancyReason',
        header: ({ column }) => (
          <DataGridColumnHeader title="REASON FOR DISCREPANCY" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => {
          const reason = row.original.reasonCategory || row.original.discrepancyRemarks || row.original.remarks;
          return (
            <span className="text-xs text-gray-700 italic font-medium truncate block" title={reason || ''}>
              {reason && reason !== '—' ? reason : '—'}
            </span>
          );
        },
        size: 140,
        enableSorting: false,
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
        size: 90,
        enableSorting: false,
      });
    }

    cols.push({
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
      size: 110,
      enableSorting: false,
    });

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
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] font-sans">
                {transfer?.transferCode || transfer?.code || `Transfer #${id}`}
              </h1>
              <StatusBadge status={transfer?.status || (isDraft ? 'Draft' : 'In Transit')} />
              {transfer?.totalValuation > 0 && (
                <span className="text-xs font-semibold text-gray-700">
                  Total Valuation: ₹{Number(transfer.totalValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <p className="text-[#667085] text-xs mt-0.5">
              Internal inventory movement details and manifest.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/inventory/stock-transfer')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs cursor-pointer"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            {(isDraft || isPending) && (transferPermissions.canEdit || approvalPermissions.canEdit) && (
              <button
                type="button"
                onClick={() => navigate(`/inventory/stock-transfer-request?id=${id}&mode=edit`)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#084E92] text-[#084E92] bg-white hover:bg-blue-50 text-xs font-semibold transition shadow-xs cursor-pointer"
              >
                <Pencil size={14} />
                Edit Transfer
              </button>
            )}

            {isPending && (approvalPermissions.canEdit || approvalPermissions.canAdd || transferPermissions.canEdit) && (
              <>
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#084E92] hover:bg-[#073e77] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRejectReason('');
                    setRejectError('');
                    setRejectModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DC2626] text-[#DC2626] bg-white hover:bg-red-50 text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  <XCircle size={14} />
                  Reject
                </button>
              </>
            )}

            {isApproved && (transferPermissions.canEdit || transferPermissions.canAdd || approvalPermissions.canEdit || approvalPermissions.canAdd) && (
              <button
                type="button"
                onClick={handleDispatch}
                disabled={dispatching}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#084E92] text-white text-xs font-semibold hover:bg-[#073e77] transition shadow-xs cursor-pointer disabled:opacity-50"
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
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-gray-100">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                    <Building2 size={14} />
                  </div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Origin (Source)</h3>
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">From Unit</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {transfer?.fromOrganizationName || transfer?.fromOutletName || transfer?.fromOutlet || '—'}
                  </p>
                </div>
                {(() => {
                  const fromSubOutletId = transfer?.fromSubOutletId || transfer?.fromSubOutlet?.id;
                  const fromSubOutletName =
                    transfer?.fromSubOutletName ||
                    transfer?.fromSubOutlet?.name ||
                    transfer?.fromSubOutlet?.subOutletName ||
                    (fromSubOutletId ? subOutletMap[String(fromSubOutletId)] : '') ||
                    '';
                  return fromSubOutletName && fromSubOutletName !== 'Main Store' ? (
                    <div>
                      <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">From Sub-Unit / Location</label>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">{fromSubOutletName}</p>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const fromSubLocationId = transfer?.fromSubLocationId || transfer?.fromSubLocation?.id;
                  const fromSubLocationName =
                    transfer?.fromSubLocationName ||
                    transfer?.fromSubLocation?.name ||
                    transfer?.fromSubLocation?.locationName ||
                    transfer?.fromSubLocation?.subLocationName ||
                    transfer?.fromSubLocation ||
                    (fromSubLocationId ? subLocationMap[String(fromSubLocationId)] : '') ||
                    '';
                  return fromSubLocationName ? (
                    <div>
                      <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">From Sub-Location</label>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">{fromSubLocationName}</p>
                    </div>
                  ) : null;
                })()}
                {transfer?.requestedAt && (
                  <div className="pt-2.5 border-t border-gray-100">
                    <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">Requested Date & Time</label>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5 font-mono">{transfer.requestedAt}</p>
                  </div>
                )}
              </div>

              {/* Destination Card */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-gray-100">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isRejected ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <Building2 size={14} />
                  </div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Destination</h3>
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">To Unit</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {transfer?.toOrganizationName || transfer?.toOutletName || transfer?.toOutlet || '—'}
                  </p>
                </div>
                {(() => {
                  const toSubOutletId = transfer?.toSubOutletId || transfer?.toSubOutlet?.id;
                  const toSubOutletName =
                    transfer?.toSubOutletName ||
                    transfer?.toSubOutlet?.name ||
                    transfer?.toSubOutlet?.subOutletName ||
                    (toSubOutletId ? subOutletMap[String(toSubOutletId)] : '') ||
                    '';
                  return toSubOutletName && toSubOutletName !== 'Main Store' ? (
                    <div>
                      <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">To Sub-Unit / Location</label>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">{toSubOutletName}</p>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const toSubLocationId = transfer?.toSubLocationId || transfer?.toSubLocation?.id;
                  const toSubLocationName =
                    transfer?.toSubLocationName ||
                    transfer?.toSubLocation?.name ||
                    transfer?.toSubLocation?.locationName ||
                    transfer?.toSubLocation?.subLocationName ||
                    transfer?.toSubLocation ||
                    (toSubLocationId ? subLocationMap[String(toSubLocationId)] : '') ||
                    '';
                  return toSubLocationName ? (
                    <div>
                      <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">To Sub-Location</label>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">{toSubLocationName}</p>
                    </div>
                  ) : null;
                })()}
                {isRejected ? (
                  (transfer?.rejectedAt ||
                    transfer?.rejectedDate ||
                    transfer?.rejectionDate ||
                    transfer?.rejectionDateTime ||
                    transfer?.rejectedDateTime ||
                    transfer?.updatedAt) && (
                    <div className="pt-2.5 border-t border-rose-100 bg-rose-50/50 p-2.5 rounded-xl">
                      <label className="text-[10.5px] font-semibold text-rose-500 uppercase tracking-wider block">
                        Rejected Date & Time
                      </label>
                      <p className="text-xs font-bold text-rose-700 mt-0.5 font-mono">
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
                    <div className="pt-2.5 border-t border-gray-100">
                      <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">
                        Received Date & Time
                      </label>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5 font-mono">
                        {transfer.receivedAt}
                      </p>
                    </div>
                  )
                )}
                {isRejected && (transfer?.rejectionReason || transfer?.rejectReason || transfer?.cancelReason) && (
                  <div className="pt-1.5">
                    <label className="text-[10.5px] font-semibold text-rose-500 uppercase tracking-wider block">
                      Rejection Reason
                    </label>
                    <p className="text-xs text-rose-600 mt-0.5 italic">
                      "{transfer.rejectionReason || transfer.rejectReason || transfer.cancelReason}"
                    </p>
                  </div>
                )}
              </div>

              {/* Transport & Schedule Card */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-gray-100">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                    <Truck size={14} />
                  </div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Transport & Schedule</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">Vehicle Number</label>
                    <p className="text-xs font-bold text-gray-900 font-mono mt-0.5">{transfer?.vehicleNumber || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">Transfer Date</label>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5 font-mono">{transfer?.transferDate || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">Driver Name</label>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{transfer?.driverName || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">Driver Contact</label>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5 font-mono">{transfer?.driverContact || '—'}</p>
                  </div>
                </div>
                {transfer?.dispatchedAt && (
                  <div className="pt-2.5 border-t border-gray-100">
                    <label className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider block">Dispatched Date & Time</label>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5 font-mono">{transfer.dispatchedAt}</p>
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

              <DataGrid
                table={table}
                recordCount={manifestItems.length}
                className="rounded-none border-0"
                tableLayout={{
                  dense: true,
                  width: 'fixed',
                  cellBorder: true,
                  headerBorder: true,
                  rowBorder: true,
                }}
              >
                <Card className="rounded-none border-0 shadow-none">
                  <CardTable className="w-full overflow-x-hidden">
                    <DataGridTable />
                  </CardTable>
                </Card>
              </DataGrid>
            </div>
          </div>
        )}

        {/* FIFO Batch Flow Visualizer Modal (Read-Only View Purpose) */}
        {selectedItemForVisualizer && (
          <FifoBatchVisualizerModal
            isOpen={visualizerOpen}
            onClose={() => {
              setVisualizerOpen(false);
              setSelectedItemForVisualizer(null);
            }}
            item={selectedItemForVisualizer}
            transferItemId={selectedItemForVisualizer.transferItemId || selectedItemForVisualizer.id}
            itemId={selectedItemForVisualizer.itemId}
            itemType={selectedItemForVisualizer.itemType || 'RAW_MATERIAL'}
            unitId={selectedItemForVisualizer.unitId ? Number(selectedItemForVisualizer.unitId) : undefined}
            fromOrganizationId={transfer?.fromOrganizationId}
            fromSubOutletId={transfer?.fromSubOutletId}
            fromSubLocationId={transfer?.fromSubLocationId}
            toOrganizationId={transfer?.toOrganizationId}
            toSubOutletId={transfer?.toSubOutletId}
            toSubLocationId={transfer?.toSubLocationId}
            itemName={selectedItemForVisualizer.itemName}
            fromOutletName={selectedItemForVisualizer.fromOutletName || transfer?.fromOrganizationName}
            transferQty={Number(selectedItemForVisualizer.transferQty || selectedItemForVisualizer.dispatchedQuantity || selectedItemForVisualizer.requestedQuantity || selectedItemForVisualizer.receivedQuantity || 0)}
            unit={selectedItemForVisualizer.unit || 'kg'}
            viewOnly={true}
            readOnly={true}
            isSelectionMode={false}
          />
        )}

        {/* Approve Confirmation Dialog */}
        <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <DialogHeader className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                <CheckCircle2 size={22} />
              </div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Approve Stock Transfer Request?
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Are you sure you want to approve transfer{' '}
                <strong className="text-gray-800">{transfer?.transferCode || transfer?.code || `#${id}`}</strong>?
                Once approved, the originating outlet can dispatch the items to the destination outlet.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                disabled={approving}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={approving}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                Approve Transfer
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Modal with Mandatory Reason */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <DialogHeader className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-1">
                <AlertTriangle size={22} />
              </div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Reject Stock Transfer Request
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Please provide a mandatory reason for rejecting{' '}
                <strong className="text-gray-800">{transfer?.transferCode || transfer?.code || `#${id}`}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 my-2">
              <label className="text-xs font-bold text-gray-700 block">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError('');
                }}
                placeholder="Enter detailed reason for rejection..."
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 placeholder:text-gray-400"
              />
              {rejectError && (
                <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                  <AlertTriangle size={12} /> {rejectError}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReason('');
                  setRejectError('');
                }}
                disabled={rejecting}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejecting}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {rejecting ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Reject Transfer
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Container>
  );
};

export default StockTransferDetail;
