import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronRight,
  Search,
  Eye,
  Filter,
  Calendar,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  CircleAlert,
  CircleCheck,
  CheckCircle2,
  FileText,
  Loader2,
  PackageCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { getAllGrnDetailsByStatus, getPOByIdAndOpenItem } from '@/services/apiServices';
import SearchableSelect from '@/utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

const formatDate = (val) => {
  if (!val) return '—';
  const slashMatch = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d.padStart(2, '0')} ${monthName} ${y}`;
  }
  const parsed = new Date(val);
  if (isNaN(parsed.getTime())) return String(val).split(' ')[0] || val;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function UnitDropdown({ units, selectedUnitId, onChange }) {
  const options = [
    { value: '', label: 'All Outlets' },
    ...units.map((u) => ({ value: String(u.id), label: u.name })),
  ];
  return (
    <div className="min-w-[220px]">
      <SearchableSelect
        name="unit"
        value={selectedUnitId ? String(selectedUnitId) : ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        options={options}
        placeholder={units.length === 0 ? 'No outlets available' : 'All Outlets'}
        disabled={units.length === 0}
      />
    </div>
  );
}

const StatCard = ({ label, value, trend, trendLabel, trendType = 'up' }) => (
  <div className="bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-xs">
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase truncate">{label}</p>
      <span className="text-base md:text-lg font-bold text-[#0F172A] leading-tight mt-0.5 block">{value}</span>
    </div>
    {trend && (
      <span
        className={`flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
          trendType === 'up'
            ? 'bg-amber-50 text-amber-600'
            : trendType === 'down'
              ? 'bg-blue-50 text-blue-600'
              : trendType === 'ok'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-gray-100 text-gray-600'
        }`}
      >
        {trendType === 'up' && <ArrowUpRight size={11} />}
        {trendType === 'down' && <RotateCcw size={11} />}
        {trendType === 'ok' && <CircleCheck size={11} />}
        {trendLabel}
      </span>
    )}
  </div>
);

const STATUS_MAP = {
  RETURN_REQUESTED: {
    label: 'Return Requested',
    cls: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
  },
  RETURN_REPLACEMENT_REQUESTED: {
    label: 'Replacement Requested',
    cls: 'bg-blue-50 text-[#084E92] border-blue-200/80',
    dot: 'bg-[#084E92]',
  },
  RETURN_REPLACEMENT_COMPLETED: {
    label: 'Completed',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-600',
  },
  RETURNED: {
    label: 'Returned',
    cls: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
  },
  REPLACED: {
    label: 'Replaced',
    cls: 'bg-blue-50 text-[#084E92] border-blue-200/80',
    dot: 'bg-[#084E92]',
  },
};

const StatusBadge = ({ status }) => {
  const normKey = String(status || '').toUpperCase().trim();
  const config = STATUS_MAP[normKey] || {
    label: status || 'Pending',
    cls: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

const TruncatedCell = ({
  value,
  widthClass = 'max-w-[150px]',
  className = 'text-gray-600',
  onClick,
}) => (
  <span
    title={value}
    onClick={onClick}
    className={`block truncate ${widthClass} ${className}`}
  >
    {value}
  </span>
);

const ReturnReplacementList = () => {
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Return and Replacement');
  const { canAdd: canGenerateGrn } = usePagePermissions('Generate GRN');

  const {
    loading: scopeLoading,
    error: scopeError,
    showUnitDropdown,
    units,
    selectedUnitId,
    setSelectedUnitId,
    effectiveOutletId,
    filterRowsByScope,
    retry: retryScope,
  } = useOrgScope();

  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});

  const [statusFilter, setStatusFilter] = useState('RETURN_REPLACEMENT_REQUESTED');

  const fetchReturnReplacements = useCallback(async () => {
    if (scopeLoading) return;
    setLoading(true);
    setError(null);
    try {
      const outletParam = effectiveOutletId === 'ALL' || !effectiveOutletId ? 0 : Number(effectiveOutletId);
      const statusParam = statusFilter === 'ALL' ? '' : statusFilter;

      // Fetch from API
      let res;
      try {
        res = await getAllGrnDetailsByStatus(statusParam, outletParam);
      } catch (err) {
        res = await getAllGrnDetailsByStatus();
      }

      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const rawList = Array.isArray(raw) ? raw : [];

      const list = rawList.map((item, index) => {
        const rawStatus =
          item.returnReplacementStatus ||
          item.status ||
          (Number(item.rejectedQuantity || item.returnQuantity) > 0 ? 'RETURN_REQUESTED' : 'RETURN_REQUESTED');

        const outletNameStr = item.outletName || item.organizationName || item.purchaseOrder?.outletName || item.purchaseOrder?.organizationName || '';

        // Match unit from units list by name if outletId is not directly in item
        let matchedUnitId = undefined;
        if (outletNameStr && Array.isArray(units)) {
          const matched = units.find(
            (u) => (u.name || '').trim().toLowerCase() === outletNameStr.trim().toLowerCase()
          );
          if (matched) {
            matchedUnitId = Number(matched.id);
          }
        }

        const rawOutletId =
          item.outletId ??
          item.organizationId ??
          item.orgId ??
          item.purchaseOrder?.outletId ??
          item.purchaseOrder?.orgId ??
          item.grn?.orgId ??
          item.grn?.outletId ??
          item.purchaseOrder?.organizationId ??
          matchedUnitId ??
          (effectiveOutletId ? Number(effectiveOutletId) : undefined);

        return {
          id: item.id || index + 1,
          grnDetailId: item.id,
          grnId: item.grnId || item.grnHeaderId || item.grn?.id || item.oldGrnId,
          grnCode: item.grnCode || item.grn?.grnCode || (item.grnId ? `GRN-#${item.grnId}` : '—'),
          purchaseOrderId: item.purchaseOrderId || item.poId || item.purchaseOrder?.id,
          poCode: item.purchaseOrderCode || item.poCode || item.purchaseOrder?.purchaseOrderCode || item.purchaseOrder?.poCode || (item.purchaseOrderId ? `PO-${item.purchaseOrderId}` : '—'),
          prCode: item.prcode || item.prCode || item.purchaseRequisitionCode || item.purchaseOrder?.prcode || '—',
          outletId: rawOutletId !== undefined && rawOutletId !== null ? Number(rawOutletId) : undefined,
          outlet: outletNameStr || (rawOutletId ? `Outlet #${rawOutletId}` : '—'),
          rawMaterialId: item.rawMaterialId,
          purchaseOrderDetailId: item.purchaseOrderDetailId,
          itemName: item.rawMaterialName || item.itemName || `Item #${item.rawMaterialId || index + 1}`,
          itemCode: item.rawMaterialCode || item.itemCode || item.hsnCode || `RM-${item.rawMaterialId || index + 1}`,
          uomName: item.uomName || item.unitName || item.uom || 'Unit',
          receivedQuantity: item.receivedQuantity ?? item.acceptedQuantity ?? 0,
          acceptedQuantity: item.acceptedQuantity ?? 0,
          rejectedQuantity: item.rejectedQuantity ?? item.returnQuantity ?? 0,
          returnQuantity: item.rejectedQuantity ?? item.returnQuantity ?? 0,
          status: rawStatus,
          rawStatus: rawStatus,
          remarks: item.remarks || '',
          grnDate: formatDate(item.grnDate || item.createdAt),
          poDate: formatDate(item.poDate || item.purchaseOrder?.poDate),
          raw: item,
        };
      });

      setRecords(list);
    } catch (err) {
      console.error('Failed to fetch return & replacement records:', err);
      setError(err?.message || 'Failed to load return & replacement records.');
      toast.error('Failed to load return & replacement records');
    } finally {
      setLoading(false);
    }
  }, [scopeLoading, effectiveOutletId, statusFilter, units]);

  useEffect(() => {
    fetchReturnReplacements();
  }, [fetchReturnReplacements]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, statusFilter, selectedUnitId, effectiveOutletId]);

  const scopedRecords = useMemo(() => {
    // If API is already filtered by effectiveOutletId, or if outletId matches
    if (effectiveOutletId && effectiveOutletId !== 'ALL' && records.length > 0) {
      const filtered = filterRowsByScope(records);
      return filtered.length > 0 ? filtered : records;
    }
    return filterRowsByScope(records);
  }, [records, filterRowsByScope, effectiveOutletId]);

  const summary = useMemo(() => {
    const total = scopedRecords.length;
    const returnReq = scopedRecords.filter(
      (r) => String(r.status || '').toUpperCase() === 'RETURN_REQUESTED'
    ).length;
    const replacementReq = scopedRecords.filter(
      (r) => String(r.status || '').toUpperCase() === 'RETURN_REPLACEMENT_REQUESTED'
    ).length;
    const completed = scopedRecords.filter(
      (r) => String(r.status || '').toUpperCase() === 'RETURN_REPLACEMENT_COMPLETED'
    ).length;

    return {
      totalReturns: total,
      returnReq,
      replacementReq,
      completed,
    };
  }, [scopedRecords]);

  const filteredRecords = useMemo(() => {
    let rows = scopedRecords;
    if (statusFilter !== 'ALL') {
      rows = rows.filter(
        (r) => String(r.status || '').toUpperCase() === String(statusFilter).toUpperCase()
      );
    }
    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter(
        (r) =>
          (r.itemName || '').toLowerCase().includes(term) ||
          (r.itemCode || '').toLowerCase().includes(term) ||
          (r.prCode || '').toLowerCase().includes(term) ||
          (r.poCode || '').toLowerCase().includes(term) ||
          (r.grnCode || '').toLowerCase().includes(term) ||
          (r.outlet || '').toLowerCase().includes(term)
      );
    }
    return rows;
  }, [scopedRecords, search, statusFilter]);

  const [checkingPoId, setCheckingPoId] = useState(null);

  const handleAcceptReturn = async (row) => {
    const poId =
      row.purchaseOrderId ||
      row.poId ||
      row.raw?.purchaseOrderId ||
      (row.poCode ? Number(row.poCode.replace(/^.*-(\d+)$/, '$1')) : null);

    if (!poId) {
      toast.error('Purchase order ID not found for this return item.');
      return;
    }

    setCheckingPoId(row.id);
    try {
      const res = await getPOByIdAndOpenItem([Number(poId)]);
      const rawData = res?.data?.data ?? res?.data;
      if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
        const msg = res?.data?.message || res?.data?.msg || 'Purchase Order has no open items or is closed.';
        toast.error(msg);
        return;
      }

      const returnGrnDetailId = row.grnDetailId || row.id;
      const queryParams = new URLSearchParams({
        returnGrnDetailId: String(returnGrnDetailId),
        ...(row.purchaseOrderDetailId ? { purchaseOrderDetailId: String(row.purchaseOrderDetailId) } : {}),
        ...(row.rawMaterialId ? { rawMaterialId: String(row.rawMaterialId) } : {}),
        ...(row.returnQuantity !== undefined && row.returnQuantity !== null ? { returnQty: String(row.returnQuantity) } : {}),
        ...(row.grnCode && row.grnCode !== '—' ? { grnCode: String(row.grnCode) } : {}),
        ...(row.grnId ? { oldGrnId: String(row.grnId) } : {}),
      });

      // Navigate to Generate GRN passing return item parameters
      navigate(`/inventory/generate-grn/generate/${poId}?${queryParams.toString()}`, {
        state: {
          poIds: [Number(poId)],
          poId: Number(poId),
          returnGrnDetailId: returnGrnDetailId,
          purchaseOrderDetailId: row.purchaseOrderDetailId,
          rawMaterialId: row.rawMaterialId,
          returnQty: row.returnQuantity,
          grnCode: row.grnCode,
          oldGrnId: row.grnId,
          returnItem: row,
        },
      });
    } catch (err) {
      console.error('Failed to verify PO open items:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        err?.message ||
        'Purchase order is closed or has no open items.';
      toast.error(msg);
    } finally {
      setCheckingPoId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'itemName',
        accessorFn: (row) => row.itemName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Item Description"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="py-1 min-w-[160px] max-w-[190px]">
            <div
              className="font-bold text-[#084E92] text-sm hover:underline cursor-pointer truncate"
              title={row.original.itemName}
            >
              {row.original.itemName}
            </div>
            {row.original.itemCode && (
              <div className="text-[11px] text-gray-500 font-mono mt-0.5 truncate" title={row.original.itemCode}>
                {row.original.itemCode}
              </div>
            )}
          </div>
        ),
        size: 180,
      },
      {
        id: 'prCode',
        accessorFn: (row) => row.prCode,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="PR Code"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-[130px]">
            <TruncatedCell
              value={row.original.prCode || '—'}
              widthClass="max-w-[130px]"
              className="font-mono text-xs font-semibold text-gray-700"
            />
          </div>
        ),
        size: 150,
      },
      {
        id: 'poCode',
        accessorFn: (row) => row.poCode,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="PO Code"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <TruncatedCell
              value={row.original.poCode || '—'}
              widthClass="max-w-[140px]"
              className="font-bold text-[#084E92] text-xs font-mono hover:underline cursor-pointer"
              onClick={() => row.original.purchaseOrderId && navigate(`/purchase/purchase-order-detail/${row.original.purchaseOrderId}`)}
            />
          </div>
        ),
        size: 160,
      },
      {
        id: 'grnCode',
        accessorFn: (row) => row.grnCode,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="GRN Code"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-[150px]">
            <TruncatedCell
              value={row.original.grnCode || '—'}
              widthClass="max-w-[150px]"
              className="font-mono text-xs text-gray-700 font-medium"
            />
          </div>
        ),
        size: 170,
      },
      {
        id: 'grnDate',
        accessorFn: (row) => row.grnDate,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="GRN Date"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-[110px]">
            <TruncatedCell
              value={row.original.grnDate || '—'}
              widthClass="max-w-[110px]"
              className="text-gray-600 text-xs font-medium"
            />
          </div>
        ),
        size: 130,
      },
      {
        id: 'outlet',
        accessorFn: (row) => row.outlet,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Outlet Name"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <TruncatedCell
              value={row.original.outlet || '—'}
              widthClass="max-w-[140px]"
              className="text-gray-800 text-xs font-medium"
            />
          </div>
        ),
        size: 160,
      },
      {
        id: 'returnQuantity',
        accessorFn: (row) => row.returnQuantity,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Return Qty"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap min-w-[110px]">
            <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-lg text-xs">
              {row.original.returnQuantity || 0}
            </span>
            <span className="text-[11px] text-gray-600 font-semibold">{row.original.uomName}</span>
          </div>
        ),
        size: 130,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Status"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap min-w-[185px] pr-2">
            <StatusBadge status={row.original.status} />
          </div>
        ),
        size: 200,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Actions"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const normStatus = String(row.original.status || '').toUpperCase().trim();

          if (normStatus === 'RETURN_REPLACEMENT_COMPLETED') {
            return (
              <div className="min-w-[140px] flex items-center justify-start">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
                  <CheckCircle2 size={13} />
                  Completed
                </span>
              </div>
            );
          }

          if (normStatus === 'RETURN_REPLACEMENT_REQUESTED') {
            const hasPermissionToAccept = canAdd || canEdit || canGenerateGrn;
            if (!hasPermissionToAccept) {
              return (
                <div className="min-w-[140px] flex items-center justify-start">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
                    Pending Return
                  </span>
                </div>
              );
            }

            return (
              <div className="min-w-[140px] flex items-center justify-start">
                <button
                  type="button"
                  onClick={() => handleAcceptReturn(row.original)}
                  disabled={checkingPoId === row.original.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#084E92] text-white text-xs font-semibold hover:bg-[#073e77] transition cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-50"
                >
                  {checkingPoId === row.original.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <FileText size={13} />
                  )}
                  Accept Return
                </button>
              </div>
            );
          }

          // For RETURN_REQUESTED (Return only, no replacement needed)
          return (
            <div className="min-w-[140px] flex items-center justify-start">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
                <RotateCcw size={13} />
                Return Only
              </span>
            </div>
          );
        },
        enableSorting: false,
        size: 160,
      },
    ],
    [navigate, canAdd, canEdit, canGenerateGrn, checkingPoId]
  );

  const table = useReactTable({
    data: filteredRecords,
    columns,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Return and Replacement" />;
  }

  return (
    <Container>
      <div className="py-3 md:py-4 pb-6 space-y-4 md:space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span>Dashboard</span>
          <ChevronRight size={11} />
          <span>Inventory</span>
          <ChevronRight size={11} />
          <span className="text-[#084E92] font-semibold">Return and Replacement</span>
        </div>

        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] text-start leading-tight">
            Return &amp; Replacement Listing
          </h1>
          <p className="text-[#53565b] text-xs mt-1">
            Manage and track returned inventory and generate replacement GRNs
          </p>
        </div>

        {scopeError && (
          <div className="rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-[#C0293D]">{scopeError}</span>
            <button onClick={retryScope} className="text-xs font-semibold text-[#C0293D] underline shrink-0 cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Returns"
            value={summary.totalReturns}
            trend
            trendType="up"
            trendLabel="All"
          />
          <StatCard
            label="Return Requested"
            value={summary.returnReq}
            trend
            trendType="warn"
            trendLabel="Action"
          />
          <StatCard
            label="Replacement Requested"
            value={summary.replacementReq}
            trend
            trendType="down"
            trendLabel="Pending"
          />
          <StatCard
            label="Completed"
            value={summary.completed}
            trend
            trendType="ok"
            trendLabel="Done"
          />
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by Item, PR, PO, GRN, or Outlet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9.5 border border-gray-200 rounded-xl pl-9 pr-3 text-xs text-gray-800 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92] transition"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {showUnitDropdown && (
              <UnitDropdown
                units={units}
                selectedUnitId={selectedUnitId}
                onChange={setSelectedUnitId}
              />
            )}

            <div className="relative min-w-[180px]">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9.5 w-full pl-8 pr-7 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92] transition cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="RETURN_REPLACEMENT_REQUESTED">Replacement Requested</option>
                <option value="RETURN_REQUESTED">Return Requested</option>
                <option value="RETURN_REPLACEMENT_COMPLETED">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
          {loading && (
            <div className="p-8 text-center flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#084E92]" />
              Loading records...
            </div>
          )}
          {error && !loading && <p className="p-6 text-center text-sm text-red-600">{error}</p>}

          {!loading && (
            <DataGrid
              table={table}
              recordCount={filteredRecords.length}
              className="rounded-2xl"
              tableLayout={{
                width: 'fixed',
                cellBorder: false,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-2xl border-0 shadow-none bg-transparent">
                <CardTable>
                  <ScrollArea className="max-h-[60vh] w-full">
                    <DataGridTable />
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardTable>
                <CardFooter className="bg-[#F8FAFC] border-t border-[#E2E8F0] rounded-b-2xl py-2.5">
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </DataGrid>
          )}
        </div>
      </div>
    </Container>
  );
};

export default ReturnReplacementList;

