// ============================================
// File: src/pages/inventory/generate-grn/GenerateGRN.jsx
// ============================================

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  FileText,
  Search,
  ChevronRight,
  Filter,
  Loader2,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import SearchableSelect from '@/utils/SearchableSelect';
import { getPOsByOutlet, getPurchaseOrdersByOutlet } from '@/services/apiServices';
import { useOrgScope } from '@/hooks/useOrgScope';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

const STATUS_STYLES = {
  Approved: 'bg-emerald-50 text-emerald-600',
  APPROVED: 'bg-emerald-50 text-emerald-600',
  'In Progress': 'bg-blue-50 text-blue-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  'Partially Received': 'bg-amber-50 text-amber-600',
  PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-600',
  Closed: 'bg-gray-100 text-gray-500',
  CLOSED: 'bg-gray-100 text-gray-500',
  Pending: 'bg-red-50 text-red-600',
};

const STATUS_DOT = {
  Approved: 'bg-emerald-500',
  APPROVED: 'bg-emerald-500',
  'In Progress': 'bg-blue-500',
  IN_PROGRESS: 'bg-blue-500',
  'Partially Received': 'bg-amber-500',
  PARTIALLY_RECEIVED: 'bg-amber-500',
  Closed: 'bg-gray-400',
  CLOSED: 'bg-gray-400',
  Pending: 'bg-red-500',
};

const StatusBadge = ({ status, size = 'md' }) => {
  const displayStatus = status || 'Approved';
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full capitalize ${
        size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'
      } ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-500'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`} />
      {displayStatus.toLowerCase().replace(/_/g, ' ')}
    </span>
  );
};

const TruncatedCell = ({
  value,
  widthClass = 'max-w-[180px]',
  className = 'text-gray-600',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

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

const PO_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CLOSED', label: 'Closed' },
];

function StatusDropdown({ value, onChange }) {
  return (
    <div className="relative min-w-[190px]">
      <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full pl-9 pr-8 rounded-xl border border-[#E7EAF0] bg-white text-xs text-[#101828] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
      >
        {PO_STATUS_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

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

const PAGE_SIZE = 10;

const GenerateGRN = () => {
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Generate GRN');

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

  const [list, setList] = useState([]);
  const [selectedPos, setSelectedPos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [poError, setPoError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const loadData = useCallback(async () => {
    if (scopeLoading) return;
    setLoading(true);
    setPoError(null);
    try {
      const outletId = effectiveOutletId === 'ALL' || !effectiveOutletId ? 0 : Number(effectiveOutletId);

      let rawList = [];
      if (statusFilter === 'ALL') {
        try {
          const res = await getPurchaseOrdersByOutlet(outletId, '');
          const data = res?.data?.data ?? res?.data ?? [];
          if (Array.isArray(data) && data.length > 0) {
            rawList = data;
          } else {
            throw new Error('Fallback to parallel');
          }
        } catch {
          const [appRes, closedRes] = await Promise.all([
            getPurchaseOrdersByOutlet(outletId, 'APPROVED').catch(() => ({ data: [] })),
            getPurchaseOrdersByOutlet(outletId, 'CLOSED').catch(() => ({ data: [] })),
          ]);
          const appData = appRes?.data?.data ?? appRes?.data ?? [];
          const closedData = closedRes?.data?.data ?? closedRes?.data ?? [];
          rawList = [
            ...(Array.isArray(appData) ? appData : []),
            ...(Array.isArray(closedData) ? closedData : []),
          ];
        }
      } else {
        let response;
        try {
          response = await getPOsByOutlet(outletId, statusFilter);
        } catch (apiErr) {
          response = await getPurchaseOrdersByOutlet(outletId, statusFilter);
        }
        const raw = response?.data?.data ?? response?.data ?? response ?? [];
        rawList = Array.isArray(raw) ? raw : [];
      }

      const normalized = rawList
        .filter((item) => {
          if (statusFilter === 'ALL') return true;
          const s = String(item.status || 'APPROVED').toUpperCase();
          return s === statusFilter.toUpperCase();
        })
        .map((item) => {
          const prCode =
            item.prcode ||
            item.prCode ||
            item.purchaseRequisitionCode ||
            item.details?.[0]?.prcode ||
            item.details?.[0]?.prCode ||
            item.prPoMapping?.[0]?.prcode ||
            '—';

          const deliveryDateRaw =
            item.expectedDeliveryDate ||
            item.deliveryDate ||
            item.targetDeliveryDate ||
            item.deliveryScheduleDate ||
            '';

          const vendorName =
            item.vendorName ||
            item.vendor?.name ||
            item.vendor?.companyName ||
            item.vendor?.tradeName ||
            item.details?.[0]?.vendorName ||
            item.poVendorName ||
            (item.vendorId ? `Vendor #${item.vendorId}` : '—');

          return {
            id: item.id,
            prCode: prCode,
            poCode: item.purchaseOrderCode || item.poCode || `PO-${item.id}`,
            date: formatDate(item.poDate || item.date || item.createdAt),
            rawDate: item.poDate || item.date || item.createdAt,
            deliveryDate: formatDate(deliveryDateRaw),
            outlet: item.organizationName || item.outletName || item.outlet || (item.outletId ? `Outlet #${item.outletId}` : '—'),
            outletId: item.outletId || item.orgId,
            raisedBy: item.createdByName || item.raisedBy || item.createdBy || '—',
            status: item.status || 'APPROVED',
            rawStatus: item.status || 'APPROVED',
            vendorId: item.vendorId || item.vendor?.id || item.details?.[0]?.vendorId,
            vendorName: vendorName,
            details: item.details || [],
          };
        });

      const scopedRows = filterRowsByScope(normalized);
      setList(scopedRows);
    } catch (err) {
      setPoError(err?.message || 'Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  }, [scopeLoading, effectiveOutletId, statusFilter, filterRowsByScope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    let rows = list;
    if (statusFilter !== 'ALL') {
      rows = rows.filter(
        (r) => (r.rawStatus || '').toUpperCase() === statusFilter.toUpperCase()
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          (r.prCode || '').toLowerCase().includes(q) ||
          (r.poCode || '').toLowerCase().includes(q) ||
          (r.outlet || '').toLowerCase().includes(q) ||
          (r.raisedBy || '').toLowerCase().includes(q) ||
          (r.vendorName || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [list, statusFilter, searchQuery]);

  const selectableRows = useMemo(() => {
    return filteredRows.filter((r) => String(r.rawStatus).toUpperCase() === 'APPROVED');
  }, [filteredRows]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [searchQuery, statusFilter, selectedUnitId]);

  const toggleSelectPo = useCallback((item) => {
    setSelectedPos((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (exists) {
        return prev.filter((p) => p.id !== item.id);
      }
      if (prev.length > 0) {
        const first = prev[0];
        const outletMatch = item.outletId && first.outletId ? item.outletId === first.outletId : item.outlet === first.outlet;
        const vendorMatch = item.vendorId && first.vendorId ? item.vendorId === first.vendorId : item.vendorName === first.vendorName;
        if (!outletMatch || !vendorMatch) {
          toast.error('Only Purchase Orders from the same Outlet and Vendor can be combined into a single GRN.');
          return prev;
        }
      }
      return [...prev, item];
    });
  }, []);

  const handleBulkGenerateGRN = () => {
    if (selectedPos.length === 0) {
      toast.error('Please select at least one Purchase Order.');
      return;
    }
    const ids = selectedPos.map((p) => p.id);
    navigate('/inventory/generate-grn/generate', {
      state: { poIds: ids, pos: selectedPos },
    });
  };

  const columns = useMemo(() => {
    const isAllApprovedSelected =
      selectableRows.length > 0 &&
      selectableRows.every((r) => selectedPos.some((p) => p.id === r.id));
    const isSomeSelected = selectedPos.length > 0 && !isAllApprovedSelected;
    const firstSelected = selectedPos[0];

    const cols = [];
    if (canAdd) {
      cols.push({
        id: 'select',
        header: () => (
          <div className="flex items-center justify-center px-1">
            <input
              type="checkbox"
              checked={isAllApprovedSelected}
              ref={(input) => {
                if (input) input.indeterminate = isSomeSelected;
              }}
              onChange={() => {
                if (isAllApprovedSelected) {
                  setSelectedPos([]);
                } else {
                  if (selectableRows.length === 0) return;
                  const first = selectableRows[0];
                  const matching = selectableRows.filter(
                    (r) =>
                      (r.outletId && first.outletId ? r.outletId === first.outletId : r.outlet === first.outlet) &&
                      (r.vendorId && first.vendorId ? r.vendorId === first.vendorId : r.vendorName === first.vendorName)
                  );
                  setSelectedPos(matching);
                }
              }}
              className="w-4 h-4 rounded text-[#084E92] focus:ring-[#084E92] border-gray-300 cursor-pointer"
              title="Select all matching Approved Purchase Orders"
            />
          </div>
        ),
        cell: ({ row }) => {
          const item = row.original;
          const isApproved = String(item.rawStatus).toUpperCase() === 'APPROVED';
          if (!isApproved) return <span className="text-gray-300 text-center block">—</span>;

          const isSelected = selectedPos.some((p) => p.id === item.id);
          const isMismatch =
            firstSelected &&
            ((item.outletId && firstSelected.outletId ? item.outletId !== firstSelected.outletId : item.outlet !== firstSelected.outlet) ||
             (item.vendorId && firstSelected.vendorId ? item.vendorId !== firstSelected.vendorId : item.vendorName !== firstSelected.vendorName));

          return (
            <div className="flex items-center justify-center px-1">
              <input
                type="checkbox"
                checked={isSelected}
                disabled={Boolean(isMismatch)}
                onChange={() => toggleSelectPo(item)}
                title={
                  isMismatch
                    ? 'Only Purchase Orders from the same Outlet and Vendor can be merged into a single GRN'
                    : 'Select for combined GRN'
                }
                className={`w-4 h-4 rounded text-[#084E92] focus:ring-[#084E92] border-gray-300 ${
                  isMismatch ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                }`}
              />
            </div>
          );
        },
        size: 45,
        enableSorting: false,
      });
    }

    cols.push(
      {
        id: 'poCode',
        accessorFn: (row) => row.poCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="PO CODE" column={column} className="my-2 text-xs font-semibold text-[#43474F] uppercase" />
        ),
        cell: ({ row }) => (
          <span
            onClick={() => navigate(`/purchase/purchase-order-detail/${row.original.id}`)}
            className="font-bold text-[#084E92] font-mono text-xs whitespace-nowrap hover:underline cursor-pointer"
          >
            {row.original.poCode}
          </span>
        ),
        size: 200,
      },
      {
        id: 'prCode',
        accessorFn: (row) => row.prCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="PR CODE" column={column} className="my-2 text-xs font-semibold text-[#43474F] uppercase" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-gray-700 font-mono text-xs whitespace-nowrap">
            {row.original.prCode || '—'}
          </span>
        ),
        size: 180,
      },
      {
        id: 'date',
        accessorFn: (row) => row.date,
        header: ({ column }) => (
          <DataGridColumnHeader title="PO DATE" column={column} className="my-2 text-xs font-semibold text-[#43474F] uppercase" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
            {row.original.date || '—'}
          </span>
        ),
        size: 130,
      },
      {
        id: 'deliveryDate',
        accessorFn: (row) => row.deliveryDate,
        header: ({ column }) => (
          <DataGridColumnHeader title="DELIVERY DATE" column={column} className="my-2 text-xs font-semibold text-[#43474F] uppercase" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
            {row.original.deliveryDate || '—'}
          </span>
        ),
        size: 140,
      },
      {
        id: 'outlet',
        accessorFn: (row) => row.outlet,
        header: ({ column }) => (
          <DataGridColumnHeader title="OUTLET" column={column} className="my-2 text-xs font-semibold text-[#43474F] uppercase" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-800 font-medium whitespace-nowrap" title={row.original.outlet}>
            {row.original.outlet || '—'}
          </span>
        ),
        size: 190,
      },
      {
        id: 'vendorName',
        accessorFn: (row) => row.vendorName,
        header: ({ column }) => (
          <DataGridColumnHeader title="VENDOR NAME" column={column} className="my-2 text-xs font-semibold text-[#43474F] uppercase" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-800 font-medium whitespace-nowrap" title={row.original.vendorName}>
            {row.original.vendorName || '—'}
          </span>
        ),
        size: 180,
      },
      {
        id: 'raisedBy',
        accessorFn: (row) => row.raisedBy,
        header: ({ column }) => (
          <DataGridColumnHeader title="RAISED BY" column={column} className="my-2 text-xs font-semibold text-[#43474F] uppercase" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-700 font-medium whitespace-nowrap" title={row.original.raisedBy}>
            {row.original.raisedBy || '—'}
          </span>
        ),
        size: 150,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs font-semibold text-[#43474F] uppercase" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        size: 150,
      },
      {
        id: 'action',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs font-semibold text-[#43474F] uppercase" />
        ),
        cell: ({ row }) => {
          const original = row.original;
          const isApproved = String(original.rawStatus).toUpperCase() === 'APPROVED';
          if (!isApproved || !canAdd) {
            return (
              <button
                type="button"
                onClick={() => navigate(`/purchase/purchase-order-detail/${original.id}`)}
                className="text-gray-500 hover:text-green-600 cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 transition"
                title="View Order"
              >
                <Eye size={18} />
              </button>
            );
          }
          return (
            <button
              type="button"
              onClick={() =>
                navigate('/inventory/generate-grn/generate', {
                  state: { poIds: [original.id], pos: [original] },
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white bg-[#084E92] text-xs font-semibold hover:bg-[#073e77] transition cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate GRN
            </button>
          );
        },
        enableSorting: false,
        size: 160,
      }
    );

    return cols;
  }, [navigate, canAdd, selectableRows, selectedPos, toggleSelectPo]);

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Generate GRN" />;
  }

  return (
    <Container>
      <div className="py-1 md:py-1.5 pb-2 space-y-2.5">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span>Dashboard</span>
          <ChevronRight size={11} />
          <span>Inventory</span>
          <ChevronRight size={11} />
          <span className="text-[#084E92] font-semibold">Generate GRN</span>
        </div>

        {/* Page header */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg md:text-xl font-bold text-[#101828] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Generate GRN
            </h1>
            <p className="text-[#667085] text-xs max-w-xl">
              List of approved Purchase Orders ready for Goods Received Note generation.
            </p>
          </div>

          {canAdd && (
            <button
              type="button"
              onClick={handleBulkGenerateGRN}
              disabled={selectedPos.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-2xs ${
                selectedPos.length > 0
                  ? 'bg-[#084E92] text-white hover:bg-[#073e77] cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                {selectedPos.length > 0
                  ? `Generate GRN (${selectedPos.length})`
                  : 'Generate GRN'}
              </span>
            </button>
          )}
        </div>

        {/* Selected POs Info Banner */}
        {selectedPos.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 text-xs text-[#084E92] font-medium animate-in fade-in duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#084E92] shrink-0" />
              <span className="truncate">
                <strong>{selectedPos.length}</strong> PO{selectedPos.length > 1 ? 's' : ''} selected ({selectedPos[0].outlet} &bull; {selectedPos[0].vendorName})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPos([])}
              className="text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer bg-transparent border-0 text-xs shrink-0"
            >
              Clear
            </button>
          </div>
        )}

        {scopeError && (
          <div className="rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-[#C0293D]">{scopeError}</span>
            <button onClick={retryScope} className="text-xs font-semibold text-[#C0293D] underline shrink-0">
              Retry
            </button>
          </div>
        )}

        {/* Search + unit dropdown + status dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PO Code, Outlet, Raised By..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E7EAF0] bg-white text-xs text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
            />
          </div>

          {showUnitDropdown && (
            <UnitDropdown units={units} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
          )}

          <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
        </div>

        {poError && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-2 text-xs text-[#C0293D]">
            <span>{poError}</span>
            <button
              type="button"
              onClick={loadData}
              className="ml-auto font-semibold underline cursor-pointer bg-transparent border-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table card (Maximized height for comfortable viewing) */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden shadow-sm">
          {loading || scopeLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading purchase orders…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredRows.length}
              className="rounded-2xl"
              tableLayout={{
                width: 'fixed',
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none">
                <CardTable>
                  <ScrollArea className="max-h-[60vh] w-full">
                    <DataGridTable />
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardTable>
                <CardFooter className="bg-[#F9FAFC] rounded-b-2xl border-t border-[#E7EAF0] py-2">
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

export default GenerateGRN;
