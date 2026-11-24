import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  CalendarRange,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '@/utils/SearchableSelect';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { useOrgScope } from '@/hooks/useOrgScope';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { SearchBar } from '@/components/common/SearchBar';
import { CodeCell } from '@/components/common/CodeCell';
import { AccessDenied } from '@/components/common/AccessDenied';
import { usePagePermissions } from '@/utils/permissions';
import { toast } from 'sonner';
import { getFilteredProposals, deleteProposal } from '@/services/apiServices';

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

// --- Unit/Outlet Dropdown ---
function UnitDropdown({ options, value, onChange }) {
  return (
    <div className="min-w-[220px]">
      <SearchableSelect
        name="unit"
        value={value ? String(value) : ''}
        onChange={(e) => onChange(e.target.value || '')}
        options={options}
        placeholder="All Outlets"
        disabled={false}
      />
    </div>
  );
}

const PROPOSAL_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Pending Approval', label: 'Pending Approval' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Issued', label: 'Issued' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Cancelled', label: 'Cancelled' },
];

function StatusDropdown({ value, onChange }) {
  return (
    <div className="relative min-w-[170px]">
      <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none z-10" />
      <Select value={value || 'ALL'} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full pl-9 pr-7 rounded-xl border border-[#C3C6D1] bg-white text-xs text-[#101828] font-medium focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 focus:border-[#084E92]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          {PROPOSAL_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
};

const formatDateShort = (val) => {
  if (!val) return '—';
  const str = String(val).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    return str;
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }
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

const ProposalListing = () => {
  const navigate = useNavigate();

  const { canAdd, canEdit, canDelete, canView, canExport } = usePagePermissions([
    'Proposal',
    'Proposals',
    'Proposal Management',
  ]);

  // Unit options from org hierarchy
  const { units = [] } = useOrgScope();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  // Delete modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);

  // Load proposals from backend
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

      const mapped = listData.map((p) => {
        const rawStatus = String(p.status || 'DRAFT').toUpperCase().trim();
        let statusLabel = 'Draft';
        if (rawStatus === 'PENDING_APPROVAL' || rawStatus === 'PENDING APPROVAL') {
          statusLabel = 'Pending Approval';
        } else if (rawStatus === 'APPROVED') {
          statusLabel = 'Approved';
        } else if (rawStatus === 'ISSUED') {
          statusLabel = 'Issued';
        } else if (rawStatus === 'ACCEPTED') {
          statusLabel = 'Accepted';
        } else if (rawStatus === 'EXPIRED') {
          statusLabel = 'Expired';
        } else if (rawStatus === 'REJECTED') {
          statusLabel = 'Rejected';
        } else if (rawStatus === 'CANCELLED' || rawStatus === 'CANCELED') {
          statusLabel = 'Cancelled';
        }

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
          status: statusLabel,
          rawStatus: p.status,
          currentStep: p.currentStep || 1,
          owner: {
            name: ownerName,
          },
        };
      });

      setList(mapped);
    } catch (err) {
      console.warn('Backend proposals fetch error:', err);
      setFetchError(err?.message || 'Failed to fetch proposals.');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const metrics = useMemo(() => {
    const safeList = Array.isArray(list) ? list : [];
    const total = safeList.length;
    const drafts = safeList.filter((p) => p.status === 'Draft').length;
    const pending = safeList.filter((p) => p.status === 'Pending Approval').length;
    const accepted = safeList.filter((p) => p.status === 'Accepted' || p.status === 'Approved').length;
    return {
      total,
      drafts,
      pending,
      accepted,
    };
  }, [list]);

  // Combine outlets from org hierarchy and from proposals in list
  const outletOptions = useMemo(() => {
    const map = new Map();
    (units || []).forEach((u) => {
      if (u.id) map.set(String(u.id), u.name || `Outlet #${u.id}`);
    });
    (list || []).forEach((p) => {
      if (p.outletId && !map.has(String(p.outletId))) {
        map.set(String(p.outletId), p.outlet || `Outlet #${p.outletId}`);
      }
    });

    return [
      { value: '', label: 'All Outlets' },
      ...Array.from(map.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [units, list]);

  // Client-side filtering & search
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

      const matchesStatus =
        statusFilter === 'ALL' || item.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesOutlet =
        !selectedOutletFilter ||
        String(item.outletId) === String(selectedOutletFilter);

      const itemDate = item.validUntil ? new Date(item.validUntil) : null;
      const matchesDate =
        !itemDate ||
        ((!fromDate || itemDate >= fromDate) && (!toDate || itemDate <= toDate));

      return matchesSearch && matchesStatus && matchesOutlet && matchesDate;
    });
  }, [list, searchQuery, statusFilter, selectedOutletFilter, dateRange]);

  const displayRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredRows.slice(start, start + pagination.pageSize);
  }, [filteredRows, pagination.pageIndex, pagination.pageSize]);

  const pageCount = Math.ceil(filteredRows.length / pagination.pageSize) || 1;

  // Delete Handlers
  const openDeleteConfirm = (item) => {
    setDeleteTarget({ id: item.id, itemLabel: item.proposalCode });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteSaving) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await deleteProposal(deleteTarget.id);
      setList((prev) => (Array.isArray(prev) ? prev.filter((p) => p.id !== deleteTarget.id) : []));
      toast.success('Proposal deleted successfully.');
      closeDeleteConfirm();
    } catch (err) {
      console.warn('Delete proposal error:', err);
      toast.error('Failed to delete proposal.');
    } finally {
      setDeleteSaving(false);
    }
  };

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
        size: 45,
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
            onClick={() => navigate(`/proposals/${row.original.id}/edit`)}
          />
        ),
        enableSorting: true,
        size: 130,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'client',
        accessorFn: (row) => row.client,
        header: ({ column }) => (
          <DataGridColumnHeader title="CLIENT" column={column} className="my-1 text-[11px] font-bold -ms-1 px-1 gap-1" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.client} widthClass="max-w-full" />
        ),
        enableSorting: true,
        size: 130,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'proposalDate',
        accessorFn: (row) => row.proposalDate,
        header: ({ column }) => (
          <DataGridColumnHeader title="DATE" column={column} className="my-1 text-[11px] font-bold -ms-1 px-1 gap-1" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-800 font-medium whitespace-nowrap text-xs">
            {formatDateShort(row.original.proposalDate)}
          </span>
        ),
        enableSorting: true,
        size: 85,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'validUntil',
        accessorFn: (row) => row.validUntil,
        header: ({ column }) => (
          <DataGridColumnHeader title="VALID UNTIL" column={column} className="my-1 text-[11px] font-bold -ms-1 px-1 gap-1" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-800 font-medium whitespace-nowrap text-xs">
            {formatDateShort(row.original.validUntil)}
          </span>
        ),
        enableSorting: true,
        size: 95,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'totalCost',
        accessorFn: (row) => row.totalCost,
        header: ({ column }) => (
          <DataGridColumnHeader title="TOTAL COST" column={column} className="my-1 text-[11px] font-bold -ms-1 px-1 gap-1" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-medium text-gray-800 whitespace-nowrap">
            {formatCurrency(row.original.totalCost)}
          </span>
        ),
        enableSorting: true,
        size: 95,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'margin',
        accessorFn: (row) => row.margin,
        header: ({ column }) => (
          <DataGridColumnHeader title="MARGIN" column={column} className="my-1 text-[11px] font-bold -ms-1 px-1 gap-1" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded whitespace-nowrap">
            {Number(row.original.margin || 0).toFixed(1)}%
          </span>
        ),
        enableSorting: true,
        size: 75,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'totalValue',
        accessorFn: (row) => row.totalValue,
        header: ({ column }) => (
          <DataGridColumnHeader title="TOTAL VALUE" column={column} className="my-1 text-[11px] font-bold -ms-1 px-1 gap-1" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-bold text-gray-900 whitespace-nowrap">
            {formatCurrency(row.original.totalValue)}
          </span>
        ),
        enableSorting: true,
        size: 95,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-1 text-[11px] font-bold -ms-1 px-1 gap-1" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: true,
        size: 105,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'raisedBy',
        accessorFn: (row) => row.owner?.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="RAISED BY" column={column} className="my-1 text-[11px] font-bold -ms-1 px-1 gap-1" />
        ),
        cell: ({ row }) => {
          const name = row.original.owner?.name || row.original.clientContactPerson;
          return <TruncatedCell value={name || '—'} widthClass="max-w-full" />;
        },
        enableSorting: true,
        size: 105,
        meta: { headerClassName: 'overflow-hidden' },
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-1 text-[11px] font-bold px-0 gap-1" />
        ),
        cell: ({ row }) => {
          const original = row.original;
          const rawStatus = String(original.rawStatus || original.status || '').toUpperCase().trim();
          const isPendingApproval =
            rawStatus === 'PENDING_APPROVAL' ||
            rawStatus === 'PENDING APPROVAL' ||
            rawStatus === 'SENT_FOR_APPROVAL' ||
            rawStatus === 'SENT FOR APPROVAL';

          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => navigate(`/proposals/${original.id}/edit`)}
                  className="text-gray-500 hover:text-blue-600 cursor-pointer p-0.5 rounded hover:bg-blue-50 transition"
                  title="Edit"
                >
                  <Pencil size={16} />
                </button>
              )}
              {canDelete && !isPendingApproval && (
                <button
                  type="button"
                  onClick={() => openDeleteConfirm(original)}
                  className="text-red-400 hover:text-red-600 cursor-pointer p-0.5 rounded hover:bg-red-50 transition"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 75,
        meta: { headerClassName: 'overflow-hidden' },
      },
    ],
    [pagination.pageIndex, pagination.pageSize, navigate, canEdit, canDelete]
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
    return <AccessDenied pageTitle="Proposal" />;
  }

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-3.5">
        {/* Page Header */}
        <PageHeader
          title="Proposal Management"
          actions={
            canAdd ? (
              <HeaderActionButton to="/proposals/create">
                Create Proposal
              </HeaderActionButton>
            ) : null
          }
        />

        <PageErrorAlert error={fetchError} onRetry={fetchProposals} />

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          <StatCard
            icon={<FileText size={18} />}
            iconBg="#EEF2FE"
            iconFg="#2952E3"
            label="Total Proposals"
            value={metrics.total}
          />
          <StatCard
            icon={<FileCheck2 size={18} />}
            iconBg="#FEF6E7"
            iconFg="#B7791F"
            label="Draft"
            value={metrics.drafts}
          />
          <StatCard
            icon={<Clock3 size={18} />}
            iconBg="#EEF2FE"
            iconFg="#2952E3"
            label="Pending Approval"
            value={metrics.pending}
          />
          <StatCard
            icon={<CheckCircle2 size={18} />}
            iconBg="#E7F7EE"
            iconFg="#14804A"
            label="Approved / Accepted"
            value={metrics.accepted}
          />
        </div>

        {/* Filter Controls Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Search proposal code, client, owner..."
            />
          </div>


          {/* Status Filter */}
          <StatusDropdown value={statusFilter} onChange={setStatusFilter} />

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
                  className="px-3 py-1 text-xs bg-[#084E92] text-white rounded-lg hover:bg-[#073d73]"
                >
                  Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* DataGrid Table Card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading proposals…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredRows.length}
              className="rounded-2xl"
              tableLayout={{
                dense: true,
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none border-0">
                <CardTable className="w-full overflow-x-hidden">
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        itemLabel={deleteTarget?.itemLabel}
        saving={deleteSaving}
        title="Delete Proposal"
        description={
          deleteTarget?.itemLabel ? (
            <>
              Are you sure you want to delete proposal{' '}
              <span className="font-semibold text-gray-900">"{deleteTarget.itemLabel}"</span>? This action cannot be undone.
            </>
          ) : (
            'Are you sure you want to delete this proposal?'
          )
        }
      />
    </Container>
  );
};

export default ProposalListing;
