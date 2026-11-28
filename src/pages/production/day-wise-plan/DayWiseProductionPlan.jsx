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
  Loader2,
  Calendar,
  RotateCw,
  ClipboardPlus,
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
import { useModuleState } from '@/hooks/useModuleState';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getOrgIdFromToken } from '@/utils/auth';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { GetAllMenuPlanByDay } from '@/services/apiServices';

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
  CLOSED: {
    label: 'Closed',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

const formatDateDot = (d) => {
  if (!d) return '—';
  const str = String(d).split('T')[0];
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return str;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}.${month}.${year}`;
};

const formatDayName = (name) => {
  if (!name) return '—';
  const lower = String(name).toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

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
  '/production/plans/create',
  '/production/menu-planning/details/:id',
];

const DayWiseProductionPlan = () => {
  const navigate = useNavigate();

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
    'DAY_WISE_PRODUCTION_PLAN',
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

  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dayPlans, setDayPlans] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

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

  const fetchDayWisePlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        isActive: true,
        page: pageIndex,
        pageNo: pageIndex,
        pageSize,
        size: pageSize,
      };

      if (resolvedOrgId) {
        payload.organizationId = Number(resolvedOrgId);
        payload.orgId = Number(resolvedOrgId);
        payload.effectiveOrganizationId = Number(resolvedOrgId);
      }

      if (search.trim()) {
        payload.search = search.trim();
      }
      if (fromDate) {
        payload.fromDate = fromDate;
      }
      if (toDate) {
        payload.toDate = toDate;
      }
      if (statusFilter && statusFilter !== 'All Status') {
        payload.status = statusFilter;
      } else {
        payload.statuses = ['APPROVED', 'CLOSED'];
      }

      const res = await GetAllMenuPlanByDay(payload);
      const data = res?.data?.data ?? res?.data ?? {};

      const list = Array.isArray(data.content)
        ? data.content
        : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];

      const total = Number(data.totalElements ?? data.total ?? list.length);

      // Only APPROVED and CLOSED menu plans are allowed. Draft and any other statuses are excluded.
      const filteredList = list.filter((item) => {
        const s = String(item.planStatus || item.status || item.dayStatus || '').toUpperCase();
        if (s !== 'APPROVED' && s !== 'CLOSED') return false;
        if (!statusFilter || statusFilter === 'All Status') return true;
        return s === statusFilter.toUpperCase();
      });

      setDayPlans(filteredList);
      setTotalCount(filteredList.length < list.length ? filteredList.length : total);
    } catch (err) {
      console.error('Failed to load day wise menu plans:', err);
      setDayPlans([]);
      setTotalCount(0);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.msg ||
          err?.message ||
          'Failed to load day wise production plans.'
      );
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, resolvedOrgId, search, fromDate, toDate, statusFilter]);

  useEffect(() => {
    if (!scopeLoading) {
      fetchDayWisePlans();
    }
  }, [fetchDayWisePlans, scopeLoading]);

  const handleResetFilters = () => {
    setSearchInput('');
    setFilters(INITIAL_FILTERS);
  };

  const renderStatusBadge = (rawValue) => {
    const key = String(rawValue || 'DRAFT').toUpperCase();
    const meta = STATUS_CONFIG[key] || {
      label: rawValue || 'Draft',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${meta.badgeClass}`}
      >
        {meta.label}
      </span>
    );
  };

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
        size: 60,
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
          <button
            type="button"
            onClick={() =>
              navigate(`/production/menu-planning/details/${row.original.menuPlanId}`, {
                state: {
                  planId: row.original.menuPlanId,
                  dayId: row.original.id,
                },
              })
            }
            className="px-2 font-bold text-xs text-[#084E92] hover:underline cursor-pointer text-left"
          >
            {row.original.planCode || `#${row.original.menuPlanId}`}
          </button>
        ),
        size: 145,
      },
      {
        id: 'planDate',
        accessorFn: (row) => row.planDate,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Plan Date"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="px-2 flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span>{formatDateDot(row.original.planDate)}</span>
          </div>
        ),
        size: 130,
      },
      {
        id: 'dayOfWeek',
        accessorFn: (row) => row.dayOfWeekName || row.dayOfWeek,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Day"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs font-medium text-slate-700">
            {formatDayName(row.original.dayOfWeekName || row.original.dayOfWeek)}
          </span>
        ),
        size: 110,
      },
      {
        id: 'unit',
        accessorFn: (row) => row.organizationName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Unit / Sub-Unit"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="px-2">
            <span className="block text-xs text-gray-800 font-medium">
              {row.original.organizationName || '—'}
            </span>
            {row.original.subOutletName && (
              <span className="block text-[11px] text-slate-400">
                {row.original.subOutletName}
              </span>
            )}
          </div>
        ),
        size: 150,
        enableSorting: false,
      },
      {
        id: 'totalItems',
        accessorFn: (row) => row.totalItems,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Total Items"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="px-2">
            <span className="text-xs font-semibold text-slate-700">
              {Number(row.original.totalItems ?? 0)} Items
            </span>
          </div>
        ),
        size: 110,
      },
      {
        id: 'status',
        accessorFn: (row) => row.planStatus || row.status || row.dayStatus,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Status"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs text-center"
          />
        ),
        cell: ({ row }) => {
          const raw = row.original.planStatus || row.original.status || row.original.dayStatus || 'APPROVED';
          return (
            <div className="flex justify-center px-2">
              {renderStatusBadge(raw)}
            </div>
          );
        },
        size: 110,
        enableSorting: false,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Actions"
            column={column}
            className="py-4 uppercase text-[#43474F] font-semibold text-center"
          />
        ),
        cell: ({ row }) => {
          const rawStatus = String(
            row.original.planStatus ||
            row.original.status ||
            row.original.dayStatus ||
            ''
          ).toUpperCase();
          const isApproved = rawStatus === 'APPROVED';
          const isClosed = rawStatus === 'CLOSED';
          // Closed day wise menu plan will NOT have option for generating production plan
          const canCreatePlan = isApproved && !isClosed;

          return (
            <div className="flex items-center justify-center gap-1.5 px-2">
              <button
                type="button"
                onClick={() =>
                  navigate(`/production/menu-planning/details/${row.original.menuPlanId}`, {
                    state: {
                      planId: row.original.menuPlanId,
                      dayId: row.original.id,
                    },
                  })
                }
                className="p-1.5 text-[#084E92] hover:text-[#00376C] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                title="View Menu Plan Details"
              >
                <Eye size={16} />
              </button>

              {canCreatePlan && (
                <button
                  type="button"
                  onClick={() =>
                    navigate('/production/plans/create', {
                      state: {
                        dayPlan: row.original,
                        dayId: row.original.id,
                        menuPlanDayId: row.original.id,
                        menuPlanDayShiftId: row.original.menuPlanDayShiftId || row.original.shiftId || 0,
                        menuPlanId: row.original.menuPlanId,
                        mealTypeId: row.original.mealTypeId || 0,
                        planCode: row.original.planCode,
                        planDate: row.original.planDate,
                        organizationId: row.original.organizationId,
                        organizationName: row.original.organizationName,
                        subOutletId: row.original.subOutletId || 0,
                        productionLocationId: row.original.productionLocationId || 0,
                        storeSubLocationIds: Array.isArray(row.original.storeSubLocationIds)
                          ? row.original.storeSubLocationIds
                          : row.original.storeSubLocationId
                            ? [row.original.storeSubLocationId]
                            : [0],
                        storeSubOutletIds: Array.isArray(row.original.storeSubOutletIds)
                          ? row.original.storeSubOutletIds
                          : row.original.storeSubOutletId
                            ? [row.original.storeSubOutletId]
                            : [0],
                      },
                    })
                  }
                  className="p-1.5 text-[#084E92] hover:text-[#00376C] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                  title="Create Production Plan"
                >
                  <ClipboardPlus size={16} />
                </button>
              )}
            </div>
          );
        },
        size: 90,
        enableSorting: false,
      },
    ],
    [pageIndex, pageSize, navigate]
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
    data: dayPlans,
    columns,
    state: { pagination, sorting },
    onPaginationChange: handlePaginationChange,
    onSortingChange: setSorting,
    manualPagination: true,
    rowCount: totalCount,
    pageCount: Math.ceil(totalCount / pageSize) || 1,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        {/* Header */}
        <PageHeader
          title="Day Wise Production Plan"
          description="View daily menu plan schedules and create day-wise production plans."
          actions={
            <HeaderActionButton
              to="/production/plans/create"
              icon={Plus}
              label="Create Production Plan"
            />
          }
        />

        <PageErrorAlert
          error={scopeError || error}
          onRetry={() => {
            if (scopeError) {
              retryScope?.();
            } else {
              fetchDayWisePlans();
            }
          }}
          className="my-2"
        />

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

            {/* Unit Filter */}
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

            {/* From Date */}
            <div className={!isOutletUser ? 'md:col-span-2' : 'md:col-span-2'}>
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

            {/* To Date */}
            <div className={!isOutletUser ? 'md:col-span-2' : 'md:col-span-2'}>
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

            {/* Status Filter & Reset */}
            <div className={!isOutletUser ? 'md:col-span-2' : 'md:col-span-4'}>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Status
              </label>
              <div className="flex items-center gap-2">
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
                    <SelectItem value="All Status" className="text-xs">All (Approved & Closed)</SelectItem>
                    <SelectItem value="APPROVED" className="text-xs">Approved</SelectItem>
                    <SelectItem value="CLOSED" className="text-xs">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Reset Filters"
                  className="h-10 px-3 rounded-xl border border-[#C3C6D1] bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shrink-0 flex items-center justify-center"
                >
                  <RotateCw size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DataGrid Table */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading || scopeLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin text-[#084E92]" />
              Loading day wise production plans...
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
      </div>
    </Container>
  );
};

export default DayWiseProductionPlan;

