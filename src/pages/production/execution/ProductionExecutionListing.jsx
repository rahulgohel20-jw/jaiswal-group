import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Calendar,
  ChefHat,
  Eye,
  Loader2,
  Play,
  RotateCw,
  Search,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '@/utils/SearchableSelect';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { useModuleState } from '@/hooks/useModuleState';
import { useOrgScope } from '@/hooks/useOrgScope';
import {
  getAllMealTypes,
  getAllProductionExecutions,
} from '@/services/apiServices';

const isApiSuccess = (res) => {
  const body = res?.data;
  if (!body) return false;
  if (body.status !== undefined) {
    return String(body.status).toUpperCase() === 'SUCCESS';
  }
  if (body.success !== undefined) {
    return Boolean(body.success);
  }
  return res.status >= 200 && res.status < 300;
};

const formatDateDisplay = (d) => {
  if (!d) return '—';
  const str = String(d).split('T')[0];
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return str;
};

const INITIAL_FILTERS = {
  productionPlanId: '',
  mealTypeId: '',
  productionDate: '',
  fromDate: '',
  toDate: '',
  status: 'All Status',
  kitchenLocationId: '',
  page: 0,
  pageSize: 10,
};

const CHILD_ROUTES = [
  '/production/execution/:productionPlanId',
  '/production/plans/:planId/execution',
];

const ProductionExecutionListing = () => {
  const navigate = useNavigate();
  const {
    loading: scopeLoading,
    error: scopeError,
    subLocations,
    retry: retryScope,
  } = useOrgScope();

  const [filters, setFilters] = useModuleState(
    'PRODUCTION_EXECUTION_LISTING',
    INITIAL_FILTERS,
    CHILD_ROUTES
  );

  const {
    productionPlanId,
    mealTypeId,
    productionDate,
    fromDate,
    toDate,
    status: statusFilter,
    kitchenLocationId,
    page: pageIndex,
    pageSize,
  } = filters;

  const [planInput, setPlanInput] = useState(productionPlanId);
  const [mealTypes, setMealTypes] = useState([]);
  const [sorting, setSorting] = useState([{ id: 'createdAt', desc: true }]);
  const [loading, setLoading] = useState(false);
  const [executions, setExecutions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    setPlanInput(productionPlanId);
  }, [productionPlanId]);

  // Debounced auto-filter for planInput so Apply button is not needed
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((planInput || '').trim() !== (productionPlanId || '').trim()) {
        setFilters((prev) => ({
          ...prev,
          productionPlanId: (planInput || '').trim(),
          page: 0,
        }));
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [planInput, productionPlanId, setFilters]);

  // Load Meal Types lookup
  useEffect(() => {
    let isMounted = true;
    const loadMealTypes = async () => {
      try {
        const res = await getAllMealTypes();
        const data = res?.data?.data ?? res?.data ?? [];
        const list = Array.isArray(data) ? data : data?.items || [];
        if (isMounted) setMealTypes(list);
      } catch (err) {
        console.error('Failed to load meal types:', err);
      }
    };
    loadMealTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  const mealTypeOptions = useMemo(
    () => [
      { value: '', label: 'All Meal Types' },
      ...mealTypes.map((mt) => ({
        value: String(mt.id),
        label: mt.name || mt.mealTypeName || `Meal #${mt.id}`,
      })),
    ],
    [mealTypes]
  );

  const kitchenOptions = useMemo(() => {
    const list = Array.isArray(subLocations) ? subLocations : [];
    return [
      { value: '', label: 'All Kitchens' },
      ...list.map((loc) => ({
        value: String(loc.id),
        label: loc.name || loc.subLocationName || `Kitchen #${loc.id}`,
      })),
    ];
  }, [subLocations]);

  const fetchExecutions = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const activeSort = sorting[0] || { id: 'createdAt', desc: true };
      const payload = {
        page: pageIndex,
        size: pageSize,
        sortBy: activeSort.id || 'createdAt',
        sortDirection: activeSort.desc ? 'DESC' : 'ASC',
      };

      // Drop empty filters instead of sending null or ""
      if (productionPlanId && String(productionPlanId).trim() !== '') {
        const cleanPlan = String(productionPlanId).trim();
        const matchDigits = cleanPlan.match(/\d+$/);
        const parsedPlanId = Number(cleanPlan) || (matchDigits ? Number(matchDigits[0]) : null);
        if (parsedPlanId && !Number.isNaN(parsedPlanId) && parsedPlanId > 0) {
          payload.productionPlanId = parsedPlanId;
        } else {
          payload.planCode = cleanPlan;
        }
      }
      if (mealTypeId && Number(mealTypeId) > 0) {
        payload.mealTypeId = Number(mealTypeId);
      }
      if (productionDate) {
        payload.productionDate = productionDate;
      } else {
        if (fromDate) payload.fromDate = fromDate;
        if (toDate) payload.toDate = toDate;
      }
      if (statusFilter && statusFilter !== 'All Status') {
        payload.status = statusFilter;
      }
      if (kitchenLocationId && Number(kitchenLocationId) > 0) {
        payload.kitchenLocationId = Number(kitchenLocationId);
      }

      const res = await getAllProductionExecutions(payload);
      if (reqId !== requestIdRef.current) return; // Ignore stale response

      if (!isApiSuccess(res)) {
        const msg =
          res?.data?.message ||
          res?.data?.msg ||
          'Failed to load production executions.';
        setError(msg);
        setExecutions([]);
        setTotalCount(0);
        return;
      }

      const data = res?.data?.data ?? res?.data ?? {};
      const list = Array.isArray(data.content)
        ? data.content
        : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];
      const total = Number(data.totalElements ?? data.total ?? list.length);

      setExecutions(list);
      setTotalCount(total);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      console.error('Failed to load production executions:', err);
      setExecutions([]);
      setTotalCount(0);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.msg ||
          err?.message ||
          'Network error while loading production executions.'
      );
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    pageIndex,
    pageSize,
    sorting,
    productionPlanId,
    mealTypeId,
    productionDate,
    fromDate,
    toDate,
    statusFilter,
    kitchenLocationId,
  ]);

  useEffect(() => {
    if (!scopeLoading) {
      fetchExecutions();
    }
  }, [fetchExecutions, scopeLoading]);

  const handleResetFilters = () => {
    setPlanInput('');
    setSorting([{ id: 'createdAt', desc: true }]);
    setFilters(INITIAL_FILTERS);
  };

  const handleOpenExecution = useCallback(
    (row) => {
      const targetPlanId = row?.productionPlanId ?? row?.id;
      if (!targetPlanId) return;
      const targetMealTypeId = row?.mealTypeId;
      const query = targetMealTypeId ? `?mealTypeId=${targetMealTypeId}` : '';
      navigate(`/production/execution/${targetPlanId}${query}`, {
        state: {
          productionPlanId: Number(targetPlanId),
          mealTypeId: targetMealTypeId ? Number(targetMealTypeId) : null,
          executionSummary: row,
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
        size: 50,
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
            onClick={() => handleOpenExecution(row.original)}
            className="px-2 font-bold text-xs text-[#084E92] hover:underline cursor-pointer text-left"
          >
            {row.original.planCode ||
              `PP-${row.original.productionPlanId ?? row.original.id}`}
          </button>
        ),
        size: 130,
      },
      {
        id: 'productionDate',
        accessorFn: (row) => row.productionDate,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Production Date"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="px-2 flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span>{formatDateDisplay(row.original.productionDate)}</span>
          </div>
        ),
        size: 120,
      },
      {
        id: 'mealTypeName',
        accessorFn: (row) => row.mealTypeName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Meal Type"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="px-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#084E92] border border-blue-100">
              {row.original.mealTypeName ||
                (row.original.mealTypeId ? `Meal #${row.original.mealTypeId}` : 'All Day')}
            </span>
          </div>
        ),
        size: 110,
      },
      {
        id: 'kitchenName',
        accessorFn: (row) => row.kitchenName || row.kitchenLocationName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Kitchen"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs text-gray-800 font-medium truncate">
            {row.original.kitchenName || row.original.kitchenLocationName || '—'}
          </span>
        ),
        size: 130,
      },
      {
        id: 'supervisorName',
        accessorFn: (row) => row.supervisorName || row.supervisor,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Supervisor"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs text-slate-700 font-medium">
            {row.original.supervisorName || row.original.supervisor || '—'}
          </span>
        ),
        size: 110,
      },
      {
        id: 'progressPct',
        accessorFn: (row) => row.progressPct ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Progress"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const pct = Math.min(100, Math.max(0, Number(row.original.progressPct ?? 0)));
          const isDone = pct === 100 || String(row.original.status).toUpperCase() === 'COMPLETED';
          return (
            <div className="px-2 flex items-center gap-2">
              <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all ${
                    isDone ? 'bg-emerald-500' : 'bg-[#084E92]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-700">{pct}%</span>
            </div>
          );
        },
        size: 105,
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
          const rawStatus = String(row.original.status || 'DRAFT')
            .toUpperCase()
            .replace(/[\s-]/g, '_');
          let color = 'text-slate-600';
          if (['COMPLETED', 'CONFIRMED', 'APPROVED'].includes(rawStatus)) {
            color = 'text-emerald-600';
          } else if (['IN_PROGRESS'].includes(rawStatus)) {
            color = 'text-[#084E92]';
          } else if (['DRAFT', 'PENDING', 'NOT_STARTED'].includes(rawStatus)) {
            color = 'text-amber-600';
          } else if (['CANCELLED', 'FAILED', 'SHORTFALL'].includes(rawStatus)) {
            color = 'text-rose-600';
          }
          return (
            <span className={`block px-2 text-xs font-bold uppercase tracking-wider ${color}`}>
              {rawStatus.replace(/_/g, ' ')}
            </span>
          );
        },
        size: 95,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Actions"
            column={column}
            className="py-4 uppercase text-[#43474F] font-semibold"
          />
        ),
        cell: ({ row }) => {
          const isCompleted =
            String(row.original.status || '').toUpperCase() === 'COMPLETED';
          return (
            <div className="flex items-center gap-1 px-2">
              <button
                type="button"
                onClick={() => handleOpenExecution(row.original)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isCompleted
                    ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    : 'bg-[#084E92] hover:bg-[#00376C] text-white'
                }`}
              >
                {isCompleted ? <Eye size={13} /> : <Play size={12} />}
                <span>{isCompleted ? 'View' : 'Execute'}</span>
              </button>
            </div>
          );
        },
        size: 95,
        enableSorting: false,
      },
    ],
    [pageIndex, pageSize, handleOpenExecution]
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
    data: executions,
    columns,
    state: { pagination, sorting },
    onPaginationChange: handlePaginationChange,
    onSortingChange: (updater) => {
      setSorting((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        return next.length > 0 ? next : [{ id: 'createdAt', desc: true }];
      });
    },
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
    pageCount: Math.ceil(totalCount / pageSize) || 1,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        <PageHeader
          title="Production Execution"
          description="Select a production plan to record actual batch yields, waste, and complete production."
        />

        <PageErrorAlert
          error={scopeError || error}
          onRetry={() => {
            if (scopeError) {
              retryScope?.();
            } else {
              fetchExecutions();
            }
          }}
          className="my-2"
        />

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* Plan ID Input */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Plan ID
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={planInput}
                  onChange={(e) => setPlanInput(e.target.value)}
                  placeholder="Plan ID..."
                  className="w-full h-10 pl-8 pr-3 bg-white border border-[#C3C6D1] rounded-xl text-xs font-medium text-slate-900 focus:border-[#084E92] focus:outline-none"
                />
              </div>
            </div>

            {/* Meal Type */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Meal Type
              </label>
              <SearchableSelect
                name="mealTypeId"
                value={mealTypeId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFilters((prev) => ({ ...prev, mealTypeId: val, page: 0 }));
                }}
                options={mealTypeOptions}
                placeholder="All Meal Types"
                isClearable={true}
              />
            </div>

            {/* Kitchen */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Kitchen
              </label>
              <SearchableSelect
                name="kitchenLocationId"
                value={kitchenLocationId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFilters((prev) => ({
                    ...prev,
                    kitchenLocationId: val,
                    page: 0,
                  }));
                }}
                options={kitchenOptions}
                placeholder="All Kitchens"
                isClearable={true}
              />
            </div>

            {/* Production Date */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Production Date
              </label>
              <input
                type="date"
                value={productionDate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    productionDate: e.target.value,
                    fromDate: '',
                    toDate: '',
                    page: 0,
                  }))
                }
                className="w-full h-10 px-3 bg-white border border-[#C3C6D1] rounded-xl text-xs font-medium text-slate-900 focus:border-[#084E92] focus:outline-none"
              />
            </div>

            {/* From Date - To Date */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      fromDate: e.target.value,
                      toDate:
                        prev.toDate && e.target.value && e.target.value > prev.toDate
                          ? ''
                          : prev.toDate,
                      productionDate: '',
                      page: 0,
                    }))
                  }
                  className="w-full h-10 px-2 bg-white border border-[#C3C6D1] rounded-xl text-xs font-medium text-slate-900 focus:border-[#084E92] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      toDate: e.target.value,
                      productionDate: '',
                      page: 0,
                    }))
                  }
                  className="w-full h-10 px-2 bg-white border border-[#C3C6D1] rounded-xl text-xs font-medium text-slate-900 focus:border-[#084E92] focus:outline-none"
                />
              </div>
            </div>

            {/* Status & Reset */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Status
              </label>
              <div className="flex items-center gap-1.5">
                <Select
                  value={statusFilter}
                  onValueChange={(val) =>
                    setFilters((prev) => ({ ...prev, status: val, page: 0 }))
                  }
                >
                  <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl bg-white text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Status" className="text-xs">
                      All Status
                    </SelectItem>
                    <SelectItem value="NOT_STARTED" className="text-xs">
                      Not Started
                    </SelectItem>
                    <SelectItem value="IN_PROGRESS" className="text-xs">
                      In Progress
                    </SelectItem>
                    <SelectItem value="COMPLETED" className="text-xs">
                      Completed
                    </SelectItem>
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Reset Filters"
                  className="h-10 px-2.5 rounded-xl border border-[#C3C6D1] bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shrink-0 flex items-center justify-center"
                >
                  <RotateCw size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading || scopeLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin text-[#084E92]" />
              Loading production executions...
            </div>
          ) : executions.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-slate-400">
              <ChefHat size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">
                No Production Executions Found
              </p>
              <p className="text-xs">
                Try adjusting your filters or click Reset to view all plans.
              </p>
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={totalCount}
              className="rounded-2xl"
              tableLayout={{
                dense: true,
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none border-0">
                <CardTable>
                  <div className="overflow-x-auto">
                    <DataGridTable />
                  </div>
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

export default ProductionExecutionListing;

