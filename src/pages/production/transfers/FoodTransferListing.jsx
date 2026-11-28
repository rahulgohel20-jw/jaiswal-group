import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Calendar,
  Eye,
  Loader2,
  RotateCw,
  Search,
  Truck,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
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
import { StatusBadge } from '@/components/production/StatusBadge';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { useModuleState } from '@/hooks/useModuleState';
import { useOrgScope } from '@/hooks/useOrgScope';
import {
  GetAllProductionPlanDispatch,
  getAllMealTypes,
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
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return str;
};

const VIEW_ONLY_STATUSES = [
  'DISPATCHED',
  'COMPLETED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'CLOSED',
];

const INITIAL_FILTERS = {
  search: '',
  productionPlanId: '',
  dispatchDate: '',
  mealTypeId: '',
  sourceKitchenLocationId: '',
  destinationOrganizationId: '',
  destinationSubOutletId: '',
  destinationLocationId: '',
  status: 'All Status',
  page: 0,
  pageSize: 10,
};

const CHILD_ROUTES = ['/production/transfers/:stockTransferId'];

export const FoodTransferListing = () => {
  const navigate = useNavigate();
  const {
    loading: scopeLoading,
    error: scopeError,
    units: scopeUnits,
    outlets: scopeOutlets,
    subOutlets: scopeSubOutlets,
    subLocations,
    retry: retryScope,
  } = useOrgScope();

  const [filters, setFilters] = useModuleState(
    'FOOD_TRANSFER_DISPATCH_LISTING',
    INITIAL_FILTERS,
    CHILD_ROUTES
  );

  const {
    search,
    productionPlanId,
    dispatchDate,
    mealTypeId,
    sourceKitchenLocationId,
    destinationOrganizationId,
    destinationSubOutletId,
    destinationLocationId,
    status: statusFilter,
    page: pageIndex,
    pageSize,
  } = filters;

  const [searchInput, setSearchInput] = useState(search);
  const [planInput, setPlanInput] = useState(productionPlanId);
  const [mealTypes, setMealTypes] = useState([]);
  const [sorting, setSorting] = useState([{ id: 'createdAt', desc: true }]);
  const [loading, setLoading] = useState(false);
  const [dispatches, setDispatches] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    setPlanInput(productionPlanId);
  }, [productionPlanId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setFilters((prev) => ({
          ...prev,
          search: searchInput,
          page: 0,
        }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, search, setFilters]);

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

  const kitchenLocationOptions = useMemo(() => {
    const list = Array.isArray(subLocations) ? subLocations : [];
    return [
      { value: '', label: 'All Locations' },
      ...list.map((loc) => ({
        value: String(loc.id),
        label: loc.name || loc.subLocationName || loc.locationName || `Location #${loc.id}`,
      })),
    ];
  }, [subLocations]);

  const orgOptions = useMemo(() => {
    const raw = scopeOutlets && scopeOutlets.length > 0 ? scopeOutlets : scopeUnits || [];
    return [
      { value: '', label: 'All Units / Outlets' },
      ...raw.map((u) => ({
        value: String(u.id),
        label: u.name || u.companyNameEnglish || u.companyName || `Unit #${u.id}`,
      })),
    ];
  }, [scopeOutlets, scopeUnits]);

  const subOutletOptions = useMemo(() => {
    const list = Array.isArray(scopeSubOutlets) ? scopeSubOutlets : [];
    const filtered = destinationOrganizationId
      ? list.filter(
          (su) =>
            String(su.organizationId ?? su.orgId ?? su.outletId) ===
            String(destinationOrganizationId)
        )
      : list;
    return [
      { value: '', label: 'All Sub-Outlets' },
      ...filtered.map((su) => ({
        value: String(su.id),
        label: su.subOutletName || su.name || su.locationName || `Sub-Unit #${su.id}`,
      })),
    ];
  }, [scopeSubOutlets, destinationOrganizationId]);

  const fetchDispatches = useCallback(async () => {
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

      if (search && search.trim() !== '') {
        payload.search = search.trim();
      }
      if (productionPlanId && String(productionPlanId).trim() !== '') {
        const parsedPlanId = Number(productionPlanId);
        if (!Number.isNaN(parsedPlanId) && parsedPlanId > 0) {
          payload.productionPlanId = parsedPlanId;
        }
      }
      if (dispatchDate) {
        payload.dispatchDate = dispatchDate;
      }
      if (mealTypeId && Number(mealTypeId) > 0) {
        payload.mealTypeId = Number(mealTypeId);
      }
      if (sourceKitchenLocationId && Number(sourceKitchenLocationId) > 0) {
        payload.sourceKitchenLocationId = Number(sourceKitchenLocationId);
      }
      if (destinationOrganizationId && Number(destinationOrganizationId) > 0) {
        payload.destinationOrganizationId = Number(destinationOrganizationId);
      }
      if (destinationSubOutletId && Number(destinationSubOutletId) > 0) {
        payload.destinationSubOutletId = Number(destinationSubOutletId);
      }
      if (destinationLocationId && Number(destinationLocationId) > 0) {
        payload.destinationLocationId = Number(destinationLocationId);
      }
      if (statusFilter && statusFilter !== 'All Status') {
        payload.status = statusFilter;
      }

      const res = await GetAllProductionPlanDispatch(payload);
      if (reqId !== requestIdRef.current) return;

      if (!isApiSuccess(res)) {
        const msg =
          res?.data?.message ||
          res?.data?.msg ||
          'Failed to load dispatch list.';
        setError(msg);
        setDispatches([]);
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

      setDispatches(list);
      setTotalCount(total);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      console.error('Failed to load dispatches:', err);
      setDispatches([]);
      setTotalCount(0);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.msg ||
          err?.message ||
          'Failed to load food dispatch list.'
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
    search,
    productionPlanId,
    dispatchDate,
    mealTypeId,
    sourceKitchenLocationId,
    destinationOrganizationId,
    destinationSubOutletId,
    destinationLocationId,
    statusFilter,
  ]);

  useEffect(() => {
    if (!scopeLoading) {
      fetchDispatches();
    }
  }, [fetchDispatches, scopeLoading]);

  const handleApplyFilters = () => {
    setFilters((prev) => ({
      ...prev,
      search: searchInput.trim(),
      productionPlanId: planInput.trim(),
      page: 0,
    }));
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setPlanInput('');
    setSorting([{ id: 'createdAt', desc: true }]);
    setFilters(INITIAL_FILTERS);
  };

  const handleOpenDispatch = useCallback(
    (row) => {
      const targetId = row?.stockTransferId ?? row?.id;
      if (!targetId) return;
      navigate(`/production/transfers/${targetId}`, {
        state: {
          stockTransferId: Number(targetId),
          dispatchSummary: row,
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
        size: 60,
      },
      {
        id: 'transferCode',
        accessorFn: (row) =>
          row.transferCode || row.transferNumber || row.transferNo || row.stockTransferId,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Transfer Code"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const r = row.original;
          const transferLabel =
            r.transferCode ||
            r.transferNumber ||
            r.transferNo ||
            r.dispatchNumber ||
            `STR-${r.stockTransferId ?? r.id}`;
          return (
            <button
              type="button"
              onClick={() => handleOpenDispatch(r)}
              className="px-2 font-bold text-xs text-[#084E92] hover:underline cursor-pointer text-left"
            >
              {transferLabel}
            </button>
          );
        },
        size: 195,
      },
      {
        id: 'transferDate',
        accessorFn: (row) => row.transferDate || row.dispatchDate || row.productionDate,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Dispatch Date"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="px-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <span>
                  {formatDateDisplay(
                    r.transferDate || r.dispatchDate || r.productionDate || r.createdAt
                  )}
                </span>
              </div>
              {r.scheduledDispatchTime && (
                <span className="text-[10px] text-slate-400 block pl-5 truncate">
                  {r.scheduledDispatchTime}
                </span>
              )}
            </div>
          );
        },
        size: 155,
      },
      {
        id: 'planCode',
        accessorFn: (row) => row.planCode || row.productionPlanCode || row.productionPlanId,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Plan Code"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <span className="block px-2 text-xs font-semibold text-slate-900">
              {r.planCode ||
                r.productionPlanCode ||
                (r.productionPlanId ? `PP-${r.productionPlanId}` : '—')}
            </span>
          );
        },
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
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="px-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#084E92] border border-blue-100">
                {r.mealTypeName || (r.mealTypeId ? `Meal #${r.mealTypeId}` : 'General')}
              </span>
            </div>
          );
        },
        size: 115,
      },
      {
        id: 'destinationName',
        accessorFn: (row) =>
          row.destinationName ||
          row.destinationOrganizationName ||
          row.destinationOutletName ||
          row.toOutlet,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Destination"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const r = row.original;
          const orgLabel =
            r.destinationName ||
            r.destinationOrganizationName ||
            r.destinationOutletName ||
            r.toOutlet ||
            '';
          const subLabel =
            r.destinationSubOutletName || r.destinationLocationName || r.subLocationName || '';
          return (
            <div className="px-2 text-xs">
              <span className="font-semibold text-gray-800 block truncate">
                {orgLabel || subLabel || '—'}
              </span>
              {orgLabel && subLabel && (
                <span className="text-[11px] text-slate-400 block truncate">{subLabel}</span>
              )}
            </div>
          );
        },
        size: 165,
      },
      {
        id: 'vehicleNumber',
        accessorFn: (row) => row.vehicleNumber || row.vehicleNo,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Vehicle / Driver"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const r = row.original;
          const vehicle = r.vehicleNumber || r.vehicleNo || '';
          const driver = r.driverName || '';
          return (
            <div className="px-2 text-xs">
              <span className="font-semibold text-slate-800 block truncate">
                {vehicle || '—'}
              </span>
              {driver && (
                <span className="text-[11px] text-slate-400 block truncate">{driver}</span>
              )}
            </div>
          );
        },
        size: 145,
        enableSorting: false,
      },
      {
        id: 'itemsCount',
        accessorFn: (row) => row.itemsCount ?? row.itemCount ?? row.totalItems ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Items / Qty"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const r = row.original;
          const count =
            r.itemsCount ??
            r.itemCount ??
            r.totalItems ??
            (Array.isArray(r.items) ? r.items.length : null);
          const qty =
            r.totalQuantity ?? r.totalTransferQuantity ?? r.totalQty ?? r.qty ?? null;
          const unit = r.uomSymbol || r.unitSymbol || r.unitName || '';
          const containers = r.totalContainers ?? r.totalContainerCount ?? null;
          return (
            <div className="px-2 text-xs">
              <span className="font-bold text-slate-800 block">
                {qty != null ? `${qty}${unit ? ` ${unit}` : ''}` : count != null ? `${count} items` : '—'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {count != null ? `${count} ${count === 1 ? 'item' : 'items'}` : ''}
                {containers != null && containers > 0 ? ` • ${containers} cnt` : ''}
              </span>
            </div>
          );
        },
        size: 120,
        enableSorting: false,
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
          <div className="px-2">
            <StatusBadge status={row.original.status || 'DRAFT'} />
          </div>
        ),
        size: 130,
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
          const statusNorm = String(row.original.status || '').toUpperCase();
          const isViewOnly = VIEW_ONLY_STATUSES.includes(statusNorm);
          return (
            <div className="flex items-center gap-1 px-2">
              <button
                type="button"
                onClick={() => handleOpenDispatch(row.original)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isViewOnly
                    ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    : 'bg-[#084E92] hover:bg-[#00376C] text-white'
                }`}
              >
                {isViewOnly ? <Eye size={13} /> : <Truck size={13} />}
                <span>{isViewOnly ? 'View' : 'Dispatch'}</span>
              </button>
            </div>
          );
        },
        size: 115,
        enableSorting: false,
      },
    ],
    [pageIndex, pageSize, handleOpenDispatch]
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
    data: dispatches,
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
          title="Food Dispatch & Transfers"
          description="Track, draft, and dispatch finished kitchen meals to destination outlets."
        />

        <PageErrorAlert
          error={scopeError || error}
          onRetry={() => {
            if (scopeError) {
              retryScope?.();
            } else {
              fetchDispatches();
            }
          }}
          className="my-2"
        />

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* Search */}
            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Search
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyFilters();
                  }}
                  placeholder="Transfer no., plan, vehicle..."
                  className="w-full h-10 pl-8 pr-3 bg-white border border-[#C3C6D1] rounded-xl text-xs font-medium text-slate-900 focus:border-[#084E92] focus:outline-none"
                />
              </div>
            </div>

            {/* Plan ID */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Plan ID
              </label>
              <input
                type="number"
                min="1"
                value={planInput}
                onChange={(e) => setPlanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyFilters();
                }}
                placeholder="Plan ID..."
                className="w-full h-10 px-3 bg-white border border-[#C3C6D1] rounded-xl text-xs font-medium text-slate-900 focus:border-[#084E92] focus:outline-none"
              />
            </div>

            {/* Dispatch Date */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Dispatch Date
              </label>
              <input
                type="date"
                value={dispatchDate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    dispatchDate: e.target.value,
                    page: 0,
                  }))
                }
                className="w-full h-10 px-3 bg-white border border-[#C3C6D1] rounded-xl text-xs font-medium text-slate-900 focus:border-[#084E92] focus:outline-none"
              />
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

            {/* Source Kitchen */}
            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Source Kitchen
              </label>
              <SearchableSelect
                name="sourceKitchenLocationId"
                value={sourceKitchenLocationId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFilters((prev) => ({
                    ...prev,
                    sourceKitchenLocationId: val,
                    page: 0,
                  }));
                }}
                options={kitchenLocationOptions}
                placeholder="All Kitchens"
                isClearable={true}
              />
            </div>

            {/* Destination Unit */}
            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Destination Unit
              </label>
              <SearchableSelect
                name="destinationOrganizationId"
                value={destinationOrganizationId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFilters((prev) => ({
                    ...prev,
                    destinationOrganizationId: val,
                    destinationSubOutletId: '',
                    page: 0,
                  }));
                }}
                options={orgOptions}
                placeholder="All Units / Outlets"
                isClearable={true}
              />
            </div>

            {/* Destination Sub-Outlet */}
            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Destination Sub-Unit
              </label>
              <SearchableSelect
                name="destinationSubOutletId"
                value={destinationSubOutletId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFilters((prev) => ({
                    ...prev,
                    destinationSubOutletId: val,
                    page: 0,
                  }));
                }}
                options={subOutletOptions}
                placeholder="All Sub-Outlets"
                isClearable={true}
              />
            </div>

            {/* Destination Location */}
            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Destination Location
              </label>
              <SearchableSelect
                name="destinationLocationId"
                value={destinationLocationId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFilters((prev) => ({
                    ...prev,
                    destinationLocationId: val,
                    page: 0,
                  }));
                }}
                options={kitchenLocationOptions}
                placeholder="All Locations"
                isClearable={true}
              />
            </div>

            {/* Status & Actions */}
            <div className="lg:col-span-3">
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
                    <SelectItem value="DRAFT" className="text-xs">
                      Draft
                    </SelectItem>
                    <SelectItem value="APPROVED" className="text-xs">
                      Approved
                    </SelectItem>
                    <SelectItem value="PENDING" className="text-xs">
                      Pending
                    </SelectItem>
                    <SelectItem value="READY_TO_DISPATCH" className="text-xs">
                      Ready to Dispatch
                    </SelectItem>
                    <SelectItem value="DISPATCHED" className="text-xs">
                      Dispatched
                    </SelectItem>
                    <SelectItem value="IN_TRANSIT" className="text-xs">
                      In Transit
                    </SelectItem>
                    <SelectItem value="COMPLETED" className="text-xs">
                      Completed
                    </SelectItem>
                    <SelectItem value="CLOSED" className="text-xs">
                      Closed
                    </SelectItem>
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="h-10 px-3 rounded-xl bg-[#084E92] hover:bg-[#00376C] text-white text-xs font-semibold transition cursor-pointer shrink-0"
                >
                  Apply
                </button>

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
              Loading food dispatches...
            </div>
          ) : dispatches.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-slate-400">
              <Truck size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">
                No Food Dispatches Found
              </p>
              <p className="text-xs">
                Try adjusting your filters or click Reset to view all transfers.
              </p>
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

export default FoodTransferListing;

