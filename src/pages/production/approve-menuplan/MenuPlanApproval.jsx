import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Filter,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Clock,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import SearchableSelect from '@/utils/SearchableSelect';
import { getAllMenuPlans } from '@/services/apiServices';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getOrgIdFromToken } from '@/utils/auth';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { CodeCell } from '@/components/common/CodeCell';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MENU_PLAN_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PARTIALLY_APPROVED: 'PARTIALLY_APPROVED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const ACTIONABLE_STATUSES = [
  MENU_PLAN_STATUS.SUBMITTED,
  MENU_PLAN_STATUS.PARTIALLY_APPROVED,
];

const STATUS_FILTER_OPTIONS = [
  { value: MENU_PLAN_STATUS.SUBMITTED, label: 'Submitted' },
  { value: MENU_PLAN_STATUS.PARTIALLY_APPROVED, label: 'Partially Approved' },
  { value: MENU_PLAN_STATUS.APPROVED, label: 'Approved' },
  { value: MENU_PLAN_STATUS.REJECTED, label: 'Rejected' },
];

const STATUS_META = {
  [MENU_PLAN_STATUS.SUBMITTED]: {
    label: 'Submitted',
    badgeClass: 'bg-blue-50 text-[#2952E3] border-blue-200',
  },
  [MENU_PLAN_STATUS.PARTIALLY_APPROVED]: {
    label: 'Partially Approved',
    badgeClass: 'bg-amber-50 text-[#B5590B] border-amber-200',
  },
  [MENU_PLAN_STATUS.APPROVED]: {
    label: 'Approved',
    badgeClass: 'bg-emerald-50 text-[#14804A] border-emerald-200',
  },
  [MENU_PLAN_STATUS.REJECTED]: {
    label: 'Rejected',
    badgeClass: 'bg-rose-50 text-[#C0293D] border-rose-200',
  },
};

const formatDateDot = (d) => {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}.${month}.${year}`;
};

const TruncatedCell = ({
  value,
  widthClass = 'max-w-full',
  className = 'text-xs text-gray-800 font-medium',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

const mapMenuPlan = (mp) => ({
  id: mp.id,
  planCode: mp.planCode || `#${mp.id}`,
  fromDate: mp.fromDate,
  toDate: mp.toDate,
  totalDays: mp.totalDays ?? (Array.isArray(mp.days) ? mp.days.length : 0),
  avgFoodCostPerMeal: mp.avgFoodCostPerMeal ?? 0,
  status: (mp.status || 'DRAFT').toUpperCase(),
  organizationId: mp.organizationId,
  organizationName: mp.organizationName ?? `Unit #${mp.organizationId}`,
  subOutletId: mp.subOutletId,
  subOutletName: mp.subOutletName ?? '',
  remarks: mp.remarks ?? '',
  rejectionReason: mp.rejectionReason ?? '',
  submittedByName: mp.submittedByName ?? mp.createdByName ?? '',
  createdAt: mp.createdAt,
  raw: mp,
});

function StatusPill({ status }) {
  const upper = (status || '').toUpperCase();
  const meta = STATUS_META[upper] ?? {
    label: status || '—',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      title={meta.label}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

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

function UnitDropdown({ units, selectedUnitId, onChange }) {
  const options = [
    { value: '', label: 'All Units' },
    ...units
      .filter((u) => u?.id != null && String(u.id).toUpperCase() !== 'ALL')
      .map((u) => ({
        value: String(u.id),
        label: u.name || u.companyName,
      })),
  ];

  return (
    <div className="min-w-[220px]">
      <SearchableSelect
        name="unit"
        value={selectedUnitId ?? ''}
        onChange={(e) => onChange(e?.target?.value ?? e?.value ?? '')}
        options={options}
        placeholder={units.length === 0 ? 'No units available' : 'Select unit...'}
        disabled={units.length === 0}
        isClearable={true}
      />
    </div>
  );
}

function StatusDropdown({ value, onChange }) {
  return (
    <div className="relative min-w-47.5">
      <Filter
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none"
      />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full pl-9 pr-8 rounded-xl border border-[#C3C6D1] bg-white text-xs text-[#101828] font-medium focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 focus:border-[#084E92]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const PAGE_SIZE = 10;

function MenuPlanApprovalList() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(MENU_PLAN_STATUS.SUBMITTED);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const handlePaginationChange = useCallback((updater) => {
    setPagination((old) => {
      const next = typeof updater === 'function' ? updater(old) : updater;
      if (next.pageSize !== old.pageSize) {
        return { ...next, pageIndex: 0 };
      }
      return next;
    });
  }, []);

  const {
    loading: scopeLoading,
    error: scopeError,
    isOutletUser,
    showUnitDropdown,
    units,
    selectedUnitId,
    setSelectedUnitId,
    effectiveOutletId,
    selfOrg,
    filterRowsByScope,
    retry: retryScope,
  } = useOrgScope();

  const resolvedOrgId = useMemo(() => {
    if (selectedUnitId && Number.isFinite(Number(selectedUnitId))) {
      return Number(selectedUnitId);
    }
    if (isOutletUser && effectiveOutletId) {
      return Number(effectiveOutletId);
    }
    const fallback = selfOrg?.id ?? effectiveOutletId ?? getOrgIdFromToken();
    return fallback ? Number(fallback) : null;
  }, [selectedUnitId, isOutletUser, effectiveOutletId, selfOrg]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuPlans, setMenuPlans] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Calls /menu-plan/get-all with single status string (initially SUBMITTED)
  const fetchMenuPlansForApproval = useCallback(async () => {
    if (scopeLoading || scopeError) return;
    setLoading(true);
    setError(null);
    try {
      const criteria = {
        pageNo: pagination.pageIndex,
        pageSize: pagination.pageSize,
        status: statusFilter,
        ...(resolvedOrgId ? { organizationId: Number(resolvedOrgId) } : {}),
        ...(debouncedQuery ? { planCode: debouncedQuery } : {}),
      };

      const res = await getAllMenuPlans(criteria);
      const payload = res?.data?.data ?? res?.data ?? {};

      const rawList = Array.isArray(payload.content)
        ? payload.content
        : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];

      const mapped = rawList.map(mapMenuPlan);
      const scoped = filterRowsByScope ? filterRowsByScope(mapped) : mapped;

      const resolvedTotal = Number(
        payload.totalElements ?? payload.total ?? scoped.length
      );
      const resolvedPages = Number(
        payload.totalPages ?? Math.max(1, Math.ceil(resolvedTotal / pagination.pageSize))
      );

      setMenuPlans(scoped);
      setTotalElements(resolvedTotal);
      setTotalPages(resolvedPages);
    } catch (err) {
      console.error('Failed to load menu plans for approval:', err);
      setMenuPlans([]);
      setError(err?.message || 'Failed to load menu plans for approval.');
    } finally {
      setLoading(false);
    }
  }, [
    scopeLoading,
    scopeError,
    pagination.pageIndex,
    pagination.pageSize,
    resolvedOrgId,
    debouncedQuery,
    statusFilter,
    filterRowsByScope,
  ]);

  useEffect(() => {
    fetchMenuPlansForApproval();
  }, [fetchMenuPlansForApproval]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [debouncedQuery, statusFilter, selectedUnitId]);

  const counts = useMemo(() => {
    const c = {
      [MENU_PLAN_STATUS.SUBMITTED]: 0,
      [MENU_PLAN_STATUS.PARTIALLY_APPROVED]: 0,
      [MENU_PLAN_STATUS.APPROVED]: 0,
      [MENU_PLAN_STATUS.REJECTED]: 0,
    };
    menuPlans.forEach((mp) => {
      if (c[mp.status] != null) c[mp.status] += 1;
    });
    if (c[statusFilter] != null && totalElements > c[statusFilter]) {
      c[statusFilter] = totalElements;
    }
    return c;
  }, [menuPlans, statusFilter, totalElements]);

  // Navigate to CreateMenuPlanning -> MenuRecipeCosting in Approve or Reject Mode
  const handleOpenApprovalFlow = useCallback(
    (mp, mode) => {
      navigate('/production/menu-planning/create', {
        state: {
          planId: mp.id,
          menuPlanId: mp.id,
          approvalMode: mode, // 'APPROVED' | 'REJECTED'
          fromApproval: true,
        },
      });
    },
    [navigate]
  );

  const columns = useMemo(
    () => [
      {
        id: 'sno',
        header: ({ column }) => (
          <DataGridColumnHeader title="S.NO" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2 text-xs">
            {String(pagination.pageIndex * pagination.pageSize + row.index + 1).padStart(2, '0')}
          </span>
        ),
        enableSorting: false,
        size: 50,
      },
      {
        id: 'planCode',
        accessorFn: (row) => row.planCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="PLAN CODE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <CodeCell code={row.original.planCode} maxWidth="max-w-full" className="text-xs" />
        ),
        enableSorting: false,
        size: 145,
      },
      {
        id: 'organizationName',
        accessorFn: (row) => row.organizationName,
        header: ({ column }) => (
          <DataGridColumnHeader title="UNIT NAME" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.organizationName} widthClass="max-w-full" />
        ),
        enableSorting: false,
        size: 140,
      },
      {
        id: 'subOutletName',
        accessorFn: (row) => row.subOutletName,
        header: ({ column }) => (
          <DataGridColumnHeader title="SUB UNIT" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.subOutletName || '-'} widthClass="max-w-full" />
        ),
        enableSorting: false,
        size: 130,
      },
      {
        id: 'dateRange',
        header: ({ column }) => (
          <DataGridColumnHeader title="DATE RANGE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-800 font-medium whitespace-nowrap text-xs">
            {row.original.fromDate && row.original.toDate
              ? `${formatDateDot(row.original.fromDate)} - ${formatDateDot(row.original.toDate)}`
              : '—'}
          </span>
        ),
        enableSorting: false,
        size: 165,
      },
      {
        id: 'totalDays',
        accessorFn: (row) => row.totalDays,
        header: ({ column }) => (
          <DataGridColumnHeader title="DAYS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-800">
            {row.original.totalDays} Days
          </span>
        ),
        enableSorting: false,
        size: 80,
      },
      {
        id: 'avgFoodCostPerMeal',
        accessorFn: (row) => row.avgFoodCostPerMeal,
        header: ({ column }) => (
          <DataGridColumnHeader title="AVG COST/MEAL" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-bold text-emerald-700">
            ₹{Number(row.original.avgFoodCostPerMeal || 0).toFixed(2)}
          </span>
        ),
        enableSorting: false,
        size: 115,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <StatusPill status={row.original.status} />,
        enableSorting: false,
        size: 140,
      },
      {
        id: 'action',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => {
          const mp = row.original;
          const isActionable = ACTIONABLE_STATUSES.includes(mp.status);

          return (
            <div className="flex items-center gap-0.5 whitespace-nowrap">
              <button
                type="button"
                onClick={() =>
                  navigate(`/production/menu-planning/details/${mp.id}`, {
                    state: { planId: mp.id, fromApproval: true },
                  })
                }
                className="text-gray-500 hover:text-[#084E92] cursor-pointer p-1 rounded-md hover:bg-blue-50 transition"
                title="View Menu Plan Details"
              >
                <Eye size={16} />
              </button>

              {isActionable && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenApprovalFlow(mp, MENU_PLAN_STATUS.APPROVED)}
                    className="text-emerald-600 hover:text-emerald-700 cursor-pointer p-1 rounded-md hover:bg-emerald-50 transition"
                    title="Review & Approve Menu Plan"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenApprovalFlow(mp, MENU_PLAN_STATUS.REJECTED)}
                    className="text-rose-500 hover:text-rose-700 cursor-pointer p-1 rounded-md hover:bg-rose-50 transition"
                    title="Review & Reject Menu Plan"
                  >
                    <XCircle size={16} />
                  </button>
                </>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 105,
      },
    ],
    [pagination.pageIndex, pagination.pageSize, navigate, handleOpenApprovalFlow]
  );

  const pageCount = useMemo(() => {
    if (totalPages > 0) return totalPages;
    return Math.max(1, Math.ceil((totalElements || menuPlans.length) / pagination.pageSize));
  }, [totalPages, totalElements, menuPlans.length, pagination.pageSize]);

  const table = useReactTable({
    data: menuPlans,
    columns,
    state: { pagination },
    manualPagination: true,
    pageCount,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Container>
      <div className="pt-2 pb-6 space-y-3.5">
        <PageHeader
          title="Menu Plan Approval"
          description="Review, approve, or reject submitted cyclic menu plans."
        />

        <PageErrorAlert
          error={scopeError || error}
          onRetry={scopeError ? retryScope : fetchMenuPlansForApproval}
        />

        {/* 4 Status Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<ClipboardList size={18} />}
            iconBg="#EEF2FE"
            iconFg="#2952E3"
            label="Submitted"
            value={counts[MENU_PLAN_STATUS.SUBMITTED] ?? 0}
          />
          <StatCard
            icon={<Clock size={18} />}
            iconBg="#FDF1E3"
            iconFg="#B5590B"
            label="Partially Approved"
            value={counts[MENU_PLAN_STATUS.PARTIALLY_APPROVED] ?? 0}
          />
          <StatCard
            icon={<CheckCircle2 size={18} />}
            iconBg="#E7F7EE"
            iconFg="#14804A"
            label="Approved"
            value={counts[MENU_PLAN_STATUS.APPROVED] ?? 0}
          />
          <StatCard
            icon={<XCircle size={18} />}
            iconBg="#FBEAEC"
            iconFg="#C0293D"
            label="Rejected"
            value={counts[MENU_PLAN_STATUS.REJECTED] ?? 0}
          />
        </div>

        {/* Search + Unit Dropdown + Status Dropdown */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex-1 min-w-55">
            <SearchBar
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              placeholder="Search by plan code..."
            />
          </div>
          {showUnitDropdown && (
            <UnitDropdown
              units={units}
              selectedUnitId={selectedUnitId}
              onChange={setSelectedUnitId}
            />
          )}
          <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
        </div>

        {/* DataGrid Table */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {scopeLoading || loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin text-[#084E92]" />
              Loading menu plans…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={totalElements || menuPlans.length}
              className="rounded-2xl"
              tableLayout={{
                dense: true,
                width: 'fixed',
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none border-0">
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
      </div>
    </Container>
  );
}

const MenuPlanApproval = () => {
  const { canView } = usePagePermissions('Approve Menu Plan');

  if (canView === false) {
    return <AccessDenied pageTitle="Approve Menu Plan" />;
  }

  return <MenuPlanApprovalList />;
};

export default MenuPlanApproval;