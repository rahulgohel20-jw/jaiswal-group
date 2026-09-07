// ============================================
// File: src/pages/inventory/grn-listing/GRNListing.jsx
// ============================================

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  CalendarRange,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import { Link } from 'react-router';
import { Container } from '@/components/common/container';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import SearchableSelect from '@/utils/SearchableSelect';
import { getAllGrns, getGrnById, getGrnByOutletOrStatus } from '@/services/apiServices';
import { useOrgScope } from '@/hooks/useOrgScope';
import { usePagePermissions } from '@/utils/permissions';
import { toast } from 'sonner';
import GRNDetailsViewModal from './GRNDetailsViewModal';

const STATUS_STYLES = {
  OPEN: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  Open: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  open: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  CLOSED: 'bg-gray-100 text-gray-600 border border-gray-200',
  Closed: 'bg-gray-100 text-gray-600 border border-gray-200',
  closed: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const STATUS_DOT = {
  OPEN: 'bg-emerald-500',
  Open: 'bg-emerald-500',
  open: 'bg-emerald-500',
  CLOSED: 'bg-gray-400',
  Closed: 'bg-gray-400',
  closed: 'bg-gray-400',
};

const StatusBadge = ({ status, size = 'md' }) => {
  const display = status || 'CLOSED';
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full capitalize ${
        size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'
      } ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`} />
      {display.toLowerCase().replace(/_/g, ' ')}
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

const GRN_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
];

function StatusDropdown({ value, onChange }) {
  return (
    <div className="relative min-w-[190px]">
      <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full pl-10 pr-8 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
      >
        {GRN_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const parseGrnDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateShort = (val) => {
  if (!val) return '—';
  const slashMatch = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d.padStart(2, '0')} ${monthName} ${y}`;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const PAGE_SIZE = 10;

const GRNListing = () => {
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('GRN');
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

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [grnError, setGrnError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const [showGrnModal, setShowGrnModal] = useState(false);
  const [grnTarget, setGrnTarget] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  const loadData = useCallback(async () => {
    if (scopeLoading) return;
    setLoading(true);
    setGrnError(null);
    try {
      const outletParam = effectiveOutletId === 'ALL' || !effectiveOutletId ? 0 : Number(effectiveOutletId);
      const statusParam = statusFilter === 'ALL' ? '' : statusFilter;

      let res;
      if (outletParam || statusParam) {
        try {
          res = await getGrnByOutletOrStatus(outletParam, statusParam);
        } catch (err) {
          res = await getAllGrns();
        }
      } else {
        res = await getAllGrns();
      }

      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const rawList = Array.isArray(raw) ? raw : [];

      const normalized = rawList.map((g) => ({
        id: g.id,
        grnCode: g.grnCode || g.code || `GRN-${g.id}`,
        poCode: g.purchaseOrderCode || g.poCode || (g.purchaseOrderId ? `PO-${g.purchaseOrderId}` : '—'),
        purchaseOrderId: g.purchaseOrderId,
        grnDate: formatDateShort(g.grnDate || g.date || g.createdAt),
        rawDate: g.grnDate || g.date || g.createdAt,
        raisedBy: g.createdByName || g.raisedBy || g.userName || g.createdBy || '—',
        outlet: g.organizationName || g.outletName || g.orgName || (g.orgId ? `Outlet #${g.orgId}` : '—'),
        outletId: g.orgId || g.outletId,
        vendorName: g.vendorName || (g.vendorId ? `Vendor #${g.vendorId}` : '—'),
        itemsReceived: Array.isArray(g.details) ? g.details.length : g.itemsReceived ?? 0,
        status: g.status || 'Verified',
        rawStatus: g.status || 'Verified',
        details: g.details || [],
      }));

      const scopedRows = filterRowsByScope(normalized);
      setList(scopedRows);
    } catch (err) {
      console.error('Failed to load GRN listing:', err);
      setGrnError(err?.message || 'Failed to load GRN list.');
    } finally {
      setLoading(false);
    }
  }, [scopeLoading, effectiveOutletId, statusFilter, filterRowsByScope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewGrn = async (row) => {
    setViewLoading(true);
    setShowGrnModal(true);
    try {
      const res = await getGrnById(row.id);
      const detailed = res?.data?.data ?? res?.data ?? res ?? row;

      const items = (detailed.details || row.details || []).map((d, index) => ({
        id: d.id || index + 1,
        name: d.rawMaterialName || d.itemName || `Item #${d.rawMaterialId || d.purchaseOrderDetailId || index + 1}`,
        unit: d.unitName || d.uomName || d.unit || 'Unit',
        receivedQuantity: d.receivedQuantity ?? 0,
        acceptedQuantity: d.acceptedQuantity ?? d.receivedQuantity ?? 0,
        returnQuantity: d.returnQuantity ?? d.rejectedQuantity ?? 0,
        rejectedQuantity: d.returnQuantity ?? d.rejectedQuantity ?? 0,
        returnReplacementStatus: d.returnReplacementStatus || null,
        remarks: d.remarks || '',
        status: d.status || (Number(d.returnQuantity || d.rejectedQuantity) > 0 ? 'Partial' : 'Received'),
      }));

      setGrnTarget({
        id: detailed.id || row.id,
        grnCode: detailed.grnCode || row.grnCode,
        poCode: detailed.purchaseOrderCode || detailed.poCode || row.poCode,
        purchaseOrderId: detailed.purchaseOrderId || row.purchaseOrderId,
        date: formatDateShort(detailed.grnDate || detailed.date || row.rawDate),
        outletName: detailed.organizationName || detailed.outletName || row.outlet,
        subOutletName: detailed.subOutletName || detailed.subOutlet?.subOutletName || null,
        vendorName: detailed.vendorName || row.vendorName,
        status: detailed.status || row.status || 'Verified',
        raisedBy: detailed.createdByName || detailed.raisedBy || row.raisedBy,
        remarks: detailed.remarks || row.remarks || '',
        images: detailed.images || detailed.files || [],
        items: items,
      });
    } catch (err) {
      console.warn('Could not fetch single GRN by ID, fallback to row data:', err);
      setGrnTarget({
        id: row.id,
        grnCode: row.grnCode,
        poCode: row.poCode,
        purchaseOrderId: row.purchaseOrderId,
        date: row.grnDate,
        outletName: row.outlet,
        subOutletName: null,
        vendorName: row.vendorName,
        status: row.status || 'Verified',
        raisedBy: row.raisedBy,
        remarks: row.remarks || '',
        images: row.images || [],
        items: (row.details || []).map((d, idx) => ({
          id: d.id || idx + 1,
          name: d.rawMaterialName || d.itemName || `Item #${idx + 1}`,
          unit: d.unitName || d.uomName || 'Unit',
          receivedQuantity: d.receivedQuantity ?? 0,
          acceptedQuantity: d.acceptedQuantity ?? 0,
          returnQuantity: d.returnQuantity ?? d.rejectedQuantity ?? 0,
          rejectedQuantity: d.returnQuantity ?? d.rejectedQuantity ?? 0,
          returnReplacementStatus: d.returnReplacementStatus || null,
          remarks: d.remarks || '',
          status: 'Received',
        })),
      });
    } finally {
      setViewLoading(false);
    }
  };

  const closeGrnModal = () => {
    if (acknowledging) return;
    setShowGrnModal(false);
    setGrnTarget(null);
  };

  const handlePrintGrn = () => {
    window.print();
  };

  const handleAcknowledgeGrn = async () => {
    setAcknowledging(true);
    try {
      toast.success('GRN acknowledged successfully.');
      closeGrnModal();
    } catch (err) {
      console.error(err);
      toast.error('Failed to acknowledge GRN.');
    } finally {
      setAcknowledging(false);
    }
  };

  const filteredRows = useMemo(() => {
    const fromDate = dateRange.from ? new Date(dateRange.from) : null;
    const toDate = dateRange.to ? new Date(dateRange.to) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const q = searchQuery.trim().toLowerCase();

    return list.filter((item) => {
      const matchesSearch =
        !q ||
        (item.grnCode || '').toLowerCase().includes(q) ||
        (item.poCode || '').toLowerCase().includes(q) ||
        (item.raisedBy || '').toLowerCase().includes(q) ||
        (item.vendorName || '').toLowerCase().includes(q) ||
        (item.outlet || '').toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (item.rawStatus || '').toLowerCase() === statusFilter.toLowerCase();

      const itemDate = parseGrnDate(item.rawDate);
      const matchesDate =
        !itemDate ||
        ((!fromDate || itemDate >= fromDate) &&
          (!toDate || itemDate <= toDate));

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [list, searchQuery, statusFilter, dateRange]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [searchQuery, statusFilter, selectedUnitId, dateRange]);

  const columns = useMemo(
    () => [
      {
        id: 'grnCode',
        accessorFn: (row) => row.grnCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="GRN CODE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.grnCode}
            widthClass="max-w-[260px]"
            className="font-semibold text-[#084E92]"
          />
        ),
        size: 270,
      },
      {
        id: 'poCode',
        accessorFn: (row) => row.poCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="PO CODE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.poCode}
            widthClass="max-w-[170px]"
            className="font-semibold text-gray-800"
          />
        ),
        size: 180,
      },
      {
        id: 'grnDate',
        accessorFn: (row) => row.grnDate,
        header: ({ column }) => (
          <DataGridColumnHeader title="GRN DATE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.grnDate} widthClass="max-w-[120px]" />,
        size: 130,
      },
      {
        id: 'outlet',
        accessorFn: (row) => row.outlet,
        header: ({ column }) => (
          <DataGridColumnHeader title="OUTLET NAME" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.outlet} widthClass="max-w-[180px]" />,
        size: 180,
      },
      {
        id: 'raisedBy',
        accessorFn: (row) => row.raisedBy,
        header: ({ column }) => (
          <DataGridColumnHeader title="RAISED BY" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.raisedBy || '—'} widthClass="max-w-[140px]" />,
        size: 150,
      },
      {
        id: 'itemsReceived',
        accessorFn: (row) => row.itemsReceived,
        header: ({ column }) => (
          <DataGridColumnHeader title="ITEMS RECEIVED" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-gray-700">{row.original.itemsReceived} Items</span>
        ),
        size: 140,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        size: 140,
      },
      {
        id: 'action',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => handleViewGrn(row.original)}
            className="text-gray-500 hover:text-green-600 cursor-pointer p-1"
            title="View Details"
          >
            <Eye size={18} />
          </button>
        ),
        enableSorting: false,
        size: 90,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Container>
      <div className="mx-auto py-10 p-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Inventory</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">GRN Listing</span>
        </div>

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mt-3 mb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-bold text-[#101828]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              GRN Listing
            </h1>
            <p className="text-[#667085] text-sm mt-1.5 max-w-xl">
              View and track all Goods Received Notes across outlets.
            </p>
          </div>

          {(canGenerateGrn || canAdd) && (
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/inventory/generate-grn"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition"
              >
                <Plus className="w-4 h-4" />
                Generate GRN
              </Link>
            </div>
          )}
        </div>

        {scopeError && (
          <div className="mb-6 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-[#C0293D]">{scopeError}</span>
            <button onClick={retryScope} className="text-xs font-semibold text-[#C0293D] underline shrink-0">
              Retry
            </button>
          </div>
        )}

        {/* Search + unit dropdown + status dropdown + date range */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search GRN Code, PO Code, Outlet..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
            />
          </div>

          {showUnitDropdown && (
            <UnitDropdown units={units} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
          )}

          <StatusDropdown value={statusFilter} onChange={setStatusFilter} />

          <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-11 flex items-center justify-center gap-2 border border-[#E7EAF0] bg-white text-[#101828] px-4 text-sm rounded-xl font-medium hover:bg-gray-50 whitespace-nowrap cursor-pointer"
              >
                <CalendarRange size={16} className="text-[#98A2B3]" />
                {dateRange.from || dateRange.to
                  ? `${formatDateShort(dateRange.from) || '...'} - ${formatDateShort(dateRange.to) || '...'}`
                  : 'Date Range'}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-4 space-y-3 bg-white shadow-xl rounded-xl border border-gray-100">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setDateRange({ from: '', to: '' })}
                  className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setDateRangeOpen(false)}
                  className="bg-[#084E92] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#063d73] cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {grnError && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 text-sm text-[#C0293D]">
            <span>{grnError}</span>
            <button
              type="button"
              onClick={loadData}
              className="ml-auto font-semibold underline cursor-pointer bg-transparent border-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading || scopeLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading goods received notes…
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
              <Card className="rounded-t-none border-t-0 rounded-2xl">
                <CardTable>
                  <ScrollArea>
                    <DataGridTable />
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardTable>
                <CardFooter className="bg-[#F9FAFC] rounded-b-2xl">
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </DataGrid>
          )}
        </div>

        <GRNDetailsViewModal
          isOpen={showGrnModal}
          onClose={closeGrnModal}
          grn={grnTarget}
          onPrint={handlePrintGrn}
          onAcknowledge={handleAcknowledgeGrn}
          acknowledging={acknowledging}
          loading={viewLoading}
        />
      </div>
    </Container>
  );
};

export default GRNListing;
