import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  CalendarRange,
  CheckCircle2,
  Clock3,
  Loader2,
  Pencil,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';

import { Container } from '@/components/common/container';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PageHeader } from '@/components/common/PageHeader';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { SearchBar } from '@/components/common/SearchBar';
import { CodeCell } from '@/components/common/CodeCell';
import { AccessDenied } from '@/components/common/AccessDenied';
import { usePagePermissions } from '@/utils/permissions';
import { getFilteredProposals } from '@/services/apiServices';

const STATUS_TEXT_COLORS = {
  Draft: 'text-amber-600',
  'Pending Approval': 'text-blue-600',
  'Sent for Approval': 'text-amber-600',
  'In Progress': 'text-blue-600',
  Approved: 'text-emerald-600',
  Accepted: 'text-emerald-600',
  Issued: 'text-indigo-600',
  Rejected: 'text-rose-600',
  Expired: 'text-gray-500',
  Cancelled: 'text-gray-400',
};

const StatusBadge = ({ status }) => (
  <span
    title={status || '—'}
    className={`font-semibold text-xs block truncate max-w-full ${
      STATUS_TEXT_COLORS[status] || 'text-gray-600'
    }`}
  >
    {status || '—'}
  </span>
);

const TruncatedCell = ({
  value,
  widthClass = 'max-w-full',
  className = 'text-gray-800 font-medium',
}) => (
  <span title={value} className={`block truncate text-xs ${className} ${widthClass}`}>
    {value || '—'}
  </span>
);

const formatDateShort = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

function StatCard({ icon, iconBg, iconFg, label, value }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg, color: iconFg }}
      >
        {icon}
      </div>
      <div className="flex flex-col items-end text-right">
        <span className="text-xs font-semibold text-[#00376C]">{label}</span>
        <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
          {value}
        </span>
      </div>
    </div>
  );
}

export const ProposalApproval = () => {
  const navigate = useNavigate();

  const { canView } = usePagePermissions([
    'Proposal Approval',
    'Approve Proposal',
    'Proposal',
    'Proposals',
    'Proposal Management',
  ]);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);

  // Fetch proposals and isolate PENDING_APPROVAL
  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await getFilteredProposals();
      const raw = res?.data?.data ?? res?.data;
      const listData = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.content)
        ? raw.content
        : Array.isArray(res?.data?.content)
        ? res.data.content
        : [];

      const pendingOnly = listData.filter((p) => {
        const rawStatus = String(p.status || '').toUpperCase().trim();
        return (
          rawStatus === 'PENDING_APPROVAL' ||
          rawStatus === 'PENDING APPROVAL' ||
          rawStatus === 'SENT_FOR_APPROVAL' ||
          rawStatus === 'SENT FOR APPROVAL'
        );
      });

      const mapped = pendingOnly.map((p) => {
        const ownerName = p.clientContactPerson || p.clientName || 'Admin';
        const outletDisplay = p.organizationName || p.outlet || '—';
        const subOutletDisplay = p.subOutletName || p.subLocation || '';

        return {
          id: p.id,
          proposalCode: p.proposalNumber || `PRP-2026-${String(p.id).padStart(4, '0')}`,
          title: p.title || '',
          client: p.clientName || 'N/A',
          clientContactPerson: p.clientContactPerson || '',
          clientEmail: p.clientEmail || '',
          clientPhone: p.clientPhone || '',
          outlet: outletDisplay,
          outletCode: p.organizationCode || '',
          outletId: p.organizationId || 0,
          subLocation: subOutletDisplay,
          subOutletId: p.subOutletId || null,
          stateId: p.stateId || null,
          stateName: p.stateName || '',
          version: p.version || 'v1.0',
          validUntil: p.validityDate || p.validUntil,
          proposalDate: p.proposalDate,
          serviceStartDate: p.serviceStartDate,
          serviceEndDate: p.serviceEndDate,
          totalFoodCost: Number(p.totalFoodCost || 0),
          totalManpowerCost: Number(p.totalManpowerCost || 0),
          totalOtherCost: Number(p.totalOtherCost || 0),
          totalCost: Number(p.totalCost || 0),
          margin: Number(p.marginPercentage ?? p.margin ?? 0),
          totalValue: Number(p.totalValue || 0),
          status: 'Pending Approval',
          rawStatus: p.status,
          currentStep: p.currentStep || 1,
          owner: {
            name: ownerName,
          },
        };
      });

      setList(mapped);
    } catch (err) {
      console.warn('Backend proposal approval fetch error:', err);
      setFetchError(err?.message || 'Failed to fetch pending proposals.');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // Metrics (only Pending Approval & Pending Clients)
  const metrics = useMemo(() => {
    const safeList = Array.isArray(list) ? list : [];
    const totalPending = safeList.length;
    const uniqueClients = new Set(safeList.map((p) => p.client).filter(Boolean)).size;

    return {
      totalPending,
      uniqueClients,
    };
  }, [list]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const safeList = Array.isArray(list) ? list : [];
    const fromDate = dateRange.from ? new Date(dateRange.from) : null;
    const toDate = dateRange.to ? new Date(dateRange.to) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const q = searchQuery.trim().toLowerCase();

    return safeList.filter((item) => {
      const matchesSearch =
        !q ||
        (item.proposalCode && item.proposalCode.toLowerCase().includes(q)) ||
        (item.client && item.client.toLowerCase().includes(q)) ||
        (item.owner?.name && item.owner.name.toLowerCase().includes(q));

      const itemDate = item.validUntil ? new Date(item.validUntil) : null;
      const matchesDate =
        !itemDate ||
        ((!fromDate || itemDate >= fromDate) && (!toDate || itemDate <= toDate));

      return matchesSearch && matchesDate;
    });
  }, [list, searchQuery, dateRange]);

  const displayRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredRows.slice(start, start + pagination.pageSize);
  }, [filteredRows, pagination.pageIndex, pagination.pageSize]);

  const pageCount = Math.ceil(filteredRows.length / pagination.pageSize) || 1;

  const columns = useMemo(
    () => [
      {
        id: 'sno',
        header: ({ column }) => (
          <DataGridColumnHeader title="S.NO" column={column} className="my-1 text-[11px] font-bold px-0 gap-1" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2 text-xs font-medium">
            {String(pagination.pageIndex * pagination.pageSize + row.index + 1).padStart(2, '0')}
          </span>
        ),
        enableSorting: false,
        size: 40,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'proposalCode',
        accessorFn: (row) => row.proposalCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="PROPOSAL CODE" column={column} className="my-1 text-[11px] font-bold -ms-1 px-1 gap-1" />
        ),
        cell: ({ row }) => (
          <CodeCell
            code={row.original.proposalCode}
            maxWidth="max-w-full"
            className="text-xs font-semibold text-[#084E92]"
            onClick={() => navigate(`/proposals/${row.original.id}/edit?mode=approval`)}
          />
        ),
        enableSorting: true,
        size: 120,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'client',
        accessorFn: (row) => row.client,
        header: ({ column }) => (
          <DataGridColumnHeader title="CLIENT" column={column} className="my-1 text-[11px] font-bold px-0 gap-1" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.client} widthClass="max-w-full" />,
        enableSorting: true,
        size: 130,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'validUntil',
        accessorFn: (row) => row.validUntil,
        header: ({ column }) => (
          <DataGridColumnHeader title="VALID UNTIL" column={column} className="my-1 text-[11px] font-bold px-0 gap-1" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-700 whitespace-nowrap">
            {row.original.validUntil ? formatDateShort(row.original.validUntil) : '—'}
          </span>
        ),
        enableSorting: true,
        size: 85,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'totalCost',
        accessorFn: (row) => row.totalCost,
        header: ({ column }) => (
          <DataGridColumnHeader title="TOTAL COST" column={column} className="my-1 text-[11px] font-bold px-0 gap-1" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-medium text-gray-800 whitespace-nowrap">
            ₹
            {Number(row.original.totalCost || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
        enableSorting: true,
        size: 90,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'margin',
        accessorFn: (row) => row.margin,
        header: ({ column }) => (
          <DataGridColumnHeader title="MARGIN" column={column} className="my-1 text-[11px] font-bold px-0 gap-1" />
        ),
        cell: ({ row }) => {
          const val = Number(row.original.margin || 0);
          const isNegative = val < 0;
          return (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${
                isNegative ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {val > 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`}
            </span>
          );
        },
        enableSorting: true,
        size: 65,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'totalValue',
        accessorFn: (row) => row.totalValue,
        header: ({ column }) => (
          <DataGridColumnHeader title="TOTAL VALUE" column={column} className="my-1 text-[11px] font-bold px-0 gap-1" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-bold text-gray-900 whitespace-nowrap">
            ₹
            {Number(row.original.totalValue || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
        enableSorting: true,
        size: 90,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-1 text-[11px] font-bold px-0 gap-1" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: true,
        size: 95,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'owner',
        accessorFn: (row) => row.owner?.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="SUBMITTED BY" column={column} className="my-1 text-[11px] font-bold px-0 gap-1" />
        ),
        cell: ({ row }) => {
          const name = row.original.owner?.name || row.original.clientContactPerson;
          return <TruncatedCell value={name || '—'} widthClass="max-w-full" />;
        },
        enableSorting: true,
        size: 100,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-1 text-[11px] font-bold px-0 gap-1" />
        ),
        cell: ({ row }) => {
          const original = row.original;
          return (
            <div className="flex items-center justify-center whitespace-nowrap">
              <button
                type="button"
                onClick={() => navigate(`/proposals/${original.id}/edit?mode=approval`)}
                className="text-gray-500 hover:text-blue-600 cursor-pointer p-1 rounded hover:bg-blue-50 transition"
                title="Edit & Approve"
              >
                <Pencil size={15} />
              </button>
            </div>
          );
        },
        enableSorting: false,
        size: 50,
        meta: { headerClassName: 'overflow-hidden' },
      },
    ],
    [pagination.pageIndex, pagination.pageSize, navigate]
  );

  const table = useReactTable({
    data: displayRows,
    columns,
    state: { pagination, sorting },
    pageCount,
    manualPagination: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (canView === false) {
    return <AccessDenied pageTitle="Proposal Approval" />;
  }

  return (
    <Container className="w-full max-w-full overflow-x-hidden">
      <div className="pt-2 pb-6 mx-auto space-y-3.5 w-full max-w-full min-w-0 overflow-x-hidden">
        {/* Page Header */}
        <PageHeader
          title="Proposal Approval"
          actions={
            <button
              type="button"
              onClick={fetchProposals}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          }
        />

        <PageErrorAlert error={fetchError} onRetry={fetchProposals} />

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <StatCard
            icon={<Clock3 size={18} />}
            iconBg="#FEF6E7"
            iconFg="#B7791F"
            label="Pending Approval"
            value={metrics.totalPending}
          />
          <StatCard
            icon={<Building2 size={18} />}
            iconBg="#F3E8FF"
            iconFg="#7E22CE"
            label="Pending Clients"
            value={metrics.uniqueClients}
          />
        </div>

        {/* Filter Controls Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Search proposal code, client, submitter..."
            />
          </div>

          {/* Date Range Popover */}
          <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-10 flex items-center justify-center gap-2 border border-[#C3C6D1] bg-white text-[#101828] px-3.5 text-xs rounded-xl font-medium hover:bg-gray-50 whitespace-nowrap cursor-pointer"
              >
                <CalendarRange size={14} className="text-[#98A2B3]" />
                {dateRange.from || dateRange.to
                  ? `${formatDateShort(dateRange.from)} - ${formatDateShort(dateRange.to)}`
                  : 'Filter by Date'}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 p-4 space-y-3 bg-white shadow-xl rounded-xl border border-gray-100"
            >
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-[#084E92]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-[#084E92]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setDateRange({ from: '', to: '' });
                    setDateRangeOpen(false);
                  }}
                  className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setDateRangeOpen(false)}
                  className="px-3 py-1 text-xs text-white bg-[#084E92] hover:bg-[#00376C] rounded-lg"
                >
                  Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* DataGrid Table Card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden w-full max-w-full min-w-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading pending proposals…
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <CheckCircle2 size={36} className="text-emerald-500" />
              <p className="text-sm font-semibold text-gray-700">No proposals pending approval</p>
              <p className="text-xs text-gray-400">All submitted proposals have been reviewed and processed.</p>
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredRows.length}
              className="rounded-2xl w-full max-w-full"
              tableLayout={{
                dense: true,
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
                width: 'fixed',
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none border-0 w-full max-w-full min-w-0 overflow-hidden">
                <CardTable className="w-full max-w-full min-w-0 overflow-x-hidden">
                  <DataGridTable />
                </CardTable>
                <CardFooter className="bg-[#F9FAFC] rounded-b-2xl border-t border-[#E7EAF0]">
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

export default ProposalApproval;
