import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Plus,
  Eye,
  Trash2,
  SquarePen,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { SearchBar } from '@/components/common/SearchBar';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '@/utils/SearchableSelect';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { useModuleState } from '@/hooks/useModuleState';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getOrgIdFromToken } from '@/utils/auth';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import {
  getAllMenuPlans,
  deleteMenuPlanById,
  getDashboardSummary,
} from '@/services/apiServices';

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  SUBMITTED: {
    label: 'Submitted',
    badgeClass: 'bg-blue-50 text-[#084E92] border-blue-200',
  },
  PARTIALLY_APPROVED: {
    label: 'Partially Approved',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  APPROVED: {
    label: 'Approved',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const EDITABLE_STATUSES = ['DRAFT', 'REJECTED'];

const formatDateDot = (d) => {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}.${month}.${year}`;
};

const StatCard = ({ label, value, icon, tone, textColor = 'text-black', subText = null }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between shadow-2xs">
    <div className="flex flex-col items-start text-left">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={`text-xl sm:text-2xl font-black ${textColor}`}>{value}</span>
        {subText && <span className="text-xs font-semibold text-rose-500">{subText}</span>}
      </div>
    </div>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
      {icon}
    </div>
  </div>
);

const INITIAL_FILTERS = {
  search: '',
  status: 'All Status',
  unitId: '',
  fromDate: '',
  toDate: '',
  page: 0,
  pageSize: 10,
};

const CHILD_ROUTES = [
  '/production/menu-planning/create',
  '/production/menu-planning/costing',
  '/production/menu-planning/details/:id',
];

const MenuPlanListing = () => {
  const navigate = useNavigate();

  // Organization / Outlet scope hook matching ItemRecipeList pattern
  const {
    loading: scopeLoading,
    error: scopeError,
    isCompanyUser,
    isOutletUser,
    units,
    effectiveOutletId,
    selfOrg,
    retry: retryScope,
  } = useOrgScope();

  const [filters, setFilters] = useModuleState(
    'MENU_PLAN_LISTING',
    INITIAL_FILTERS,
    CHILD_ROUTES
  );

  const {
    search,
    status: statusFilter,
    unitId: unitFilter,
    fromDate,
    toDate,
    page: pageIndex,
    pageSize,
  } = filters;

  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Menu Planning');

  // Resolve active organizationId
  const resolvedOrgId = useMemo(() => {
    if (unitFilter && Number.isFinite(Number(unitFilter))) {
      return Number(unitFilter);
    }
    if (isOutletUser && effectiveOutletId) {
      return Number(effectiveOutletId);
    }
    const fallbackOrgId =
      selfOrg?.id ??
      effectiveOutletId ??
      getOrgIdFromToken();

    return fallbackOrgId ? Number(fallbackOrgId) : null;
  }, [unitFilter, isOutletUser, effectiveOutletId, selfOrg]);

  // Unit filter dropdown options
  const unitFilterOptions = useMemo(() => {
    if (!Array.isArray(units)) return [];
    return [
      {
        value: '',
        label: isCompanyUser
          ? `All Units (${selfOrg?.name || selfOrg?.organizationName || 'Company'})`
          : 'All Units',
      },
      ...units
        .filter((u) => u?.id != null && String(u.id).toUpperCase() !== 'ALL')
        .map((u) => ({
          value: String(u.id),
          label: u.name || u.companyName,
        })),
    ];
  }, [units, isCompanyUser, selfOrg]);

  // Server state
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuPlans, setMenuPlans] = useState([]);
  const [error, setError] = useState(null);

  // Dashboard Summary State
  const [dashboardSummary, setDashboardSummary] = useState({
    draftPlansCount: 0,
    pendingApprovalCount: 0,
    publishedCount: 0,
    costDeviationAlertsCount: 0,
  });

  const [totalCount, setTotalCount] = useState(0);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Search input debouncer
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== search) {
        setFilters((prev) => ({
          ...prev,
          search: searchInput,
          page: 0,
        }));
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput, search, setFilters]);

  // Fetch Dashboard Summary
  const fetchSummary = useCallback(async () => {
    try {
      const params = {};
      if (resolvedOrgId) {
        params.organizationId = Number(resolvedOrgId);
      }
      const res = await getDashboardSummary(params);
      const data = res?.data?.data ?? res?.data ?? {};
      setDashboardSummary({
        draftPlansCount: data.draftPlansCount ?? 0,
        pendingApprovalCount: data.pendingApprovalCount ?? 0,
        publishedCount: data.publishedCount ?? 0,
        costDeviationAlertsCount: data.costDeviationAlertsCount ?? 0,
      });
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    }
  }, [resolvedOrgId]);

  // Fetch Menu Plans Listing
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pageIndex,
        size: pageSize,
      };

      if (search.trim()) params.planCode = search.trim();
      if (resolvedOrgId) params.organizationId = Number(resolvedOrgId);
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (statusFilter && statusFilter !== 'All Status') params.status = statusFilter;

      const res = await getAllMenuPlans(params);
      const payload = res?.data?.data ?? res?.data ?? {};

      const rawList = Array.isArray(payload.content)
        ? payload.content
        : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];

      const resolvedTotal = payload.totalElements ?? payload.total ?? rawList.length;

      setMenuPlans(rawList);
      setTotalCount(resolvedTotal);
    } catch (err) {
      console.error('Failed to load menu plans:', err);
      setMenuPlans([]);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, search, resolvedOrgId, fromDate, toDate, statusFilter]);

  // Only run calls when useOrgScope has completed loading
  useEffect(() => {
    if (!scopeLoading) {
      fetchPlans();
      fetchSummary();
    }
  }, [fetchPlans, fetchSummary, scopeLoading]);

  const openDeleteConfirm = (item) => {
    setDeleteTarget({ id: item.id, itemLabel: item.planCode || `Plan #${item.id}` });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await deleteMenuPlanById(deleteTarget.id);
      setShowDeleteConfirm(false);
      fetchPlans();
      fetchSummary();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteSaving(false);
    }
  };

  // Columns definition
  const columns = useMemo(
    () => [
      {
        id: 'sno',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="S.NO"
            column={column}
            className="py-4 text-xs uppercase text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs text-gray-500 py-2">
            {String(pageIndex * pageSize + row.index + 1).padStart(2, '0')}
          </span>
        ),
        enableSorting: false,
        size: 55,
      },
      {
        id: 'planCode',
        accessorFn: (row) => row.planCode,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Plan Code"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 font-bold text-xs text-slate-900">
            {row.original.planCode || `#${row.original.id}`}
          </span>
        ),
        size: 140,
      },
      {
        id: 'unit',
        accessorFn: (row) => row.organizationName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Unit"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs text-gray-800 font-medium">
            {row.original.organizationName || '—'}
          </span>
        ),
        size: 150,
        enableSorting: false,
      },
      {
        id: 'dateRange',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Date Range"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs text-slate-700 font-medium">
            {row.original.fromDate && row.original.toDate
              ? `${formatDateDot(row.original.fromDate)} - ${formatDateDot(row.original.toDate)}`
              : '-'}
          </span>
        ),
        size: 180,
      },
      {
        id: 'totalDays',
        accessorFn: (row) => row.totalDays,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Days"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs font-semibold text-slate-800">
            {row.original.totalDays ?? (row.original.days?.length || '—')} Days
          </span>
        ),
        size: 90,
      },
      {
        id: 'avgFoodCostPerMeal',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Avg Cost/Meal"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs font-bold text-emerald-700">
            ₹{Number(row.original.avgFoodCostPerMeal || 0).toFixed(2)}
          </span>
        ),
        size: 120,
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
        cell: ({ row }) => {
          const rawStatus = (row.original.status || 'DRAFT').toUpperCase();
          const meta = STATUS_CONFIG[rawStatus] || {
            label: row.original.status || 'Draft',
            badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          };

          return (
            <div className="px-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${meta.badgeClass}`}
              >
                {meta.label}
              </span>
            </div>
          );
        },
        size: 140,
        enableSorting: false,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Actions"
            column={column}
            className="py-4 uppercase text-[#43474F] font-semibold text-right"
          />
        ),
        cell: ({ row }) => {
          const rawStatus = (row.original.status || 'DRAFT').toUpperCase();
          const isEditableOrDeletable = EDITABLE_STATUSES.includes(rawStatus);

          return (
            <div className="flex items-center justify-start gap-0.5 px-2">
              <button
                type="button"
                onClick={() =>
                  navigate(`/production/menu-planning/details/${row.original.id}`, {
                    state: { planId: row.original.id },
                  })
                }
                className="p-1.5 text-[#084E92] hover:text-[#00376C] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                title="View Plan Details"
              >
                <Eye size={16} />
              </button>

              {canEdit && isEditableOrDeletable && (
                <button
                  type="button"
                  onClick={() =>
                    navigate('/production/menu-planning/create', {
                      state: { planId: row.original.id },
                    })
                  }
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  title="Edit Plan"
                >
                  <SquarePen size={16} />
                </button>
              )}

              {canDelete && isEditableOrDeletable && (
                <button
                  type="button"
                  onClick={() => openDeleteConfirm(row.original)}
                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Delete Plan"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        },
        size: 110,
      },
    ],
    [pageIndex, pageSize, canEdit, canDelete, navigate]
  );

  const pagination = useMemo(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize]
  );

  const handlePaginationChange = useCallback(
    (updater) => {
      setFilters((prev) => {
        const current = { pageIndex: prev.page, pageSize: prev.pageSize };
        const next = typeof updater === 'function' ? updater(current) : updater;
        return {
          ...prev,
          page: next.pageIndex,
          pageSize: next.pageSize,
        };
      });
    },
    [setFilters]
  );

  const table = useReactTable({
    data: menuPlans,
    columns,
    state: { pagination, rowSelection, sorting },
    onPaginationChange: handlePaginationChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    enableRowSelection: true,
    manualPagination: true,
    rowCount: totalCount,
    pageCount: Math.ceil(totalCount / pageSize) || 1,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (canView === false) {
    return <AccessDenied pageTitle="Menu Planning" />;
  }

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        {/* Header */}
        <PageHeader
          title="Menu Planning Master"
          description="Create, schedule, and cost cyclic shift menus and recipe demands."
          actions={
            <div className="flex items-center gap-3">
              {canAdd && (
                <HeaderActionButton
                  to="/production/menu-planning/create"
                  icon={Plus}
                  label="Create Menu Plan"
                />
              )}
            </div>
          }
        />

        <PageErrorAlert
          error={scopeError || error}
          onRetry={() => {
            if (scopeError) {
              retryScope?.();
            } else {
              fetchPlans();
              fetchSummary();
            }
          }}
          className="my-2"
        />

        {/* Global Dashboard Summary Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard
            label="Draft Plans"
            value={dashboardSummary.draftPlansCount.toLocaleString()}
            icon={<FileText size={18} className="text-slate-600" />}
            tone="bg-slate-100"
          />
          <StatCard
            label="Pending Approval"
            value={dashboardSummary.pendingApprovalCount.toLocaleString()}
            icon={<Clock size={18} className="text-amber-600" />}
            tone="bg-amber-50"
          />
          <StatCard
            label="Published"
            value={dashboardSummary.publishedCount.toLocaleString()}
            icon={<CheckCircle2 size={18} className="text-emerald-600" />}
            tone="bg-emerald-50"
          />
          <StatCard
            label="Cost Deviation Alerts"
            value={dashboardSummary.costDeviationAlertsCount.toLocaleString()}
            icon={<AlertTriangle size={18} className="text-rose-500" />}
            tone="bg-rose-50"
          />
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Search Input */}
            <div className={!isOutletUser ? 'md:col-span-3' : 'md:col-span-4'}>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Search
              </label>
              <SearchBar
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onClear={() => {
                  setSearchInput('');
                  setFilters((prev) => ({
                    ...prev,
                    search: '',
                    page: 0,
                  }));
                }}
                placeholder="Search by plan code..."
              />
            </div>

            {/* Unit Filter - Only rendered for Company users (hidden for outlet users) */}
            {!isOutletUser && (
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Unit
                </label>
                <SearchableSelect
                  name="unitFilter"
                  value={unitFilter}
                  onChange={(e) => {
                    const val = e?.target?.value ?? e?.value ?? '';
                    setFilters((prev) => ({
                      ...prev,
                      unitId: val,
                      page: 0,
                    }));
                  }}
                  options={unitFilterOptions}
                  placeholder={
                    isCompanyUser
                      ? `All Units (${selfOrg?.name || selfOrg?.organizationName || 'Company'})`
                      : 'All Units'
                  }
                  isClearable={true}
                />
              </div>
            )}

            {/* From Date (Default Native Date Input) */}
            <div className={!isOutletUser ? 'md:col-span-2' : 'md:col-span-3'}>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => {
                  const newFromDate = e.target.value;
                  setFilters((prev) => ({
                    ...prev,
                    fromDate: newFromDate,
                    toDate:
                      prev.toDate && newFromDate && newFromDate > prev.toDate
                        ? ''
                        : prev.toDate,
                    page: 0,
                  }));
                }}
                className="w-full h-10 px-3 bg-white border border-[#C3C6D1] hover:border-slate-400 focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/20 focus:outline-none rounded-xl text-xs font-medium text-slate-900 transition-all shadow-2xs"
              />
            </div>

            {/* To Date (Default Native Date Input) */}
            <div className={!isOutletUser ? 'md:col-span-2' : 'md:col-span-3'}>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  setFilters((prev) => ({
                    ...prev,
                    toDate: e.target.value,
                    page: 0,
                  }));
                }}
                className="w-full h-10 px-3 bg-white border border-[#C3C6D1] hover:border-slate-400 focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/20 focus:outline-none rounded-xl text-xs font-medium text-slate-900 transition-all shadow-2xs"
              />
            </div>

            {/* Status Filter: DRAFT -> SUBMITTED -> PARTIALLY_APPROVED / APPROVED / REJECTED */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={(val) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: val,
                    page: 0,
                  }))
                }
              >
                <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl bg-white text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Status" className="text-xs">All Status</SelectItem>
                  <SelectItem value="DRAFT" className="text-xs">Draft</SelectItem>
                  <SelectItem value="SUBMITTED" className="text-xs">Submitted</SelectItem>
                  <SelectItem value="PARTIALLY_APPROVED" className="text-xs">Partially Approved</SelectItem>
                  <SelectItem value="APPROVED" className="text-xs">Approved</SelectItem>
                  <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* DataGrid Table */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading || scopeLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin text-[#084E92]" />
              Loading menu plans...
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={totalCount}
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
                <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </DataGrid>
          )}
        </div>

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          itemLabel={deleteTarget?.itemLabel}
          saving={deleteSaving}
        />
      </div>
    </Container>
  );
};

export default MenuPlanListing;