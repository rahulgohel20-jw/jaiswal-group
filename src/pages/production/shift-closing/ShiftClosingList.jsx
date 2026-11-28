import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Calendar,
  ClipboardCheck,
  Eye,
  Loader2,
  Play,
  Plus,
  RotateCw,
  X,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
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
import { notify } from '@/utils/toast';
import {
  getAllMealTypes,
  getAllProductionExecutions,
} from '@/services/apiServices';
import { fetchShiftClosingList } from './shiftClosingApi';

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

const formatDateDot = (d) => {
  if (!d) return '—';
  const str = String(d).split('T')[0];
  const parts = str.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return str;
};

const INITIAL_FILTERS = {
  organizationId: '',
  subOutletId: '',
  productionPlanId: '',
  mealTypeId: '',
  productionDate: '',
  fromDate: '',
  toDate: '',
  status: 'All Status',
  page: 0,
  pageSize: 10,
};

const CHILD_ROUTES = ['/production/shift-closing/entry'];

export const ShiftClosingList = () => {
  const navigate = useNavigate();
  const {
    loading: scopeLoading,
    error: scopeError,
    units: scopeUnits,
    outlets: scopeOutlets,
    subOutlets: scopeSubOutlets,
    retry: retryScope,
  } = useOrgScope();

  const [filters, setFilters] = useModuleState(
    'SHIFT_CLOSING_LISTING',
    INITIAL_FILTERS,
    CHILD_ROUTES
  );

  const {
    organizationId,
    subOutletId,
    productionPlanId,
    mealTypeId,
    productionDate,
    fromDate,
    toDate,
    status: statusFilter,
    page: pageIndex,
    pageSize,
  } = filters;

  const [mealTypes, setMealTypes] = useState([]);
  const [planChoices, setPlanChoices] = useState([]);
  const [sorting, setSorting] = useState([{ id: 'closingDate', desc: true }]);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  // Open / Start Shift Closing modal state
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [startContext, setStartContext] = useState({
    productionPlanId: '',
    mealTypeId: '',
    organizationId: '',
    subOutletId: '',
  });

  const requestIdRef = useRef(0);

  // Load Meal Types & Production Plans for dropdowns
  useEffect(() => {
    let isMounted = true;
    const loadDropdowns = async () => {
      try {
        const [mtRes, execRes] = await Promise.all([
          getAllMealTypes(),
          getAllProductionExecutions({
            page: 0,
            size: 100,
            sortBy: 'createdAt',
            sortDirection: 'DESC',
          }).catch(() => null),
        ]);

        if (!isMounted) return;

        const mtData = mtRes?.data?.data ?? mtRes?.data ?? [];
        const mtList = Array.isArray(mtData) ? mtData : mtData?.items || [];
        setMealTypes(mtList);

        const execData = execRes?.data?.data ?? execRes?.data ?? {};
        const execList = Array.isArray(execData.content)
          ? execData.content
          : Array.isArray(execData.items)
            ? execData.items
            : Array.isArray(execData)
              ? execData
              : [];

        const uniqueMap = new Map();
        execList.forEach((p) => {
          const id = Number(p.productionPlanId ?? p.id ?? 0);
          if (id > 0 && !uniqueMap.has(id)) {
            uniqueMap.set(id, {
              id,
              planCode: p.planCode || `PP-${id}`,
              productionDate: p.productionDate || '',
            });
          }
        });
        setPlanChoices(Array.from(uniqueMap.values()));
      } catch (err) {
        console.error('Failed to load shift closing dropdowns:', err);
      }
    };
    loadDropdowns();
    return () => {
      isMounted = false;
    };
  }, []);

  const orgOptions = useMemo(() => {
    const raw = scopeOutlets && scopeOutlets.length > 0 ? scopeOutlets : scopeUnits || [];
    return [
      { value: '', label: 'All Organizations' },
      ...raw.map((u) => ({
        value: String(u.id),
        label: u.name || u.companyNameEnglish || u.companyName || `Org #${u.id}`,
      })),
    ];
  }, [scopeOutlets, scopeUnits]);

  const buildSubOutletOptions = useCallback(
    (selectedOrgId, emptyLabel = 'All Sub-Outlets') => {
      const list = Array.isArray(scopeSubOutlets) ? scopeSubOutlets : [];
      const filtered = selectedOrgId
        ? list.filter(
            (su) =>
              String(su.organizationId ?? su.orgId ?? su.outletId) ===
              String(selectedOrgId)
          )
        : list;
      return [
        { value: '', label: emptyLabel },
        ...filtered.map((su) => ({
          value: String(su.id),
          label: su.subOutletName || su.name || su.locationName || `Outlet #${su.id}`,
        })),
      ];
    },
    [scopeSubOutlets]
  );

  const subOutletFilterOptions = useMemo(
    () => buildSubOutletOptions(organizationId, 'All Outlets'),
    [buildSubOutletOptions, organizationId]
  );

  const startSubOutletOptions = useMemo(
    () =>
      buildSubOutletOptions(
        startContext.organizationId,
        startContext.organizationId ? 'Select Outlet (Optional)' : 'Select Organization First'
      ).filter((o) => o.value !== ''),
    [buildSubOutletOptions, startContext.organizationId]
  );

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

  const planOptions = useMemo(() => {
    const map = new Map();
    planChoices.forEach((p) => map.set(String(p.id), p));
    records.forEach((r) => {
      const id = Number(r.productionPlanId ?? 0);
      if (id > 0 && !map.has(String(id))) {
        map.set(String(id), {
          id,
          planCode: r.planCode || `PP-${id}`,
          productionDate: r.productionDate || r.closingDate || '',
        });
      }
    });
    return [
      { value: '', label: 'All Production Plans' },
      ...Array.from(map.values()).map((p) => ({
        value: String(p.id),
        label: p.productionDate ? `${p.planCode} (${formatDateDot(p.productionDate)})` : p.planCode,
      })),
    ];
  }, [planChoices, records]);

  const fetchList = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const activeSort = sorting[0] || { id: 'closingDate', desc: true };
      const payload = {
        page: pageIndex,
        size: pageSize,
        sortBy: activeSort.id || 'closingDate',
        sortDirection: activeSort.desc ? 'DESC' : 'ASC',
      };

      if (organizationId && Number(organizationId) > 0) {
        payload.organizationId = Number(organizationId);
      }
      if (subOutletId && Number(subOutletId) > 0) {
        payload.subOutletId = Number(subOutletId);
      }
      if (productionPlanId && Number(productionPlanId) > 0) {
        payload.productionPlanId = Number(productionPlanId);
      }
      if (mealTypeId && Number(mealTypeId) > 0) {
        payload.mealTypeId = Number(mealTypeId);
      }
      if (productionDate) {
        payload.productionDate = productionDate;
      }
      if (fromDate) {
        payload.fromDate = fromDate;
      }
      if (toDate) {
        payload.toDate = toDate;
      }
      if (statusFilter && statusFilter !== 'All Status') {
        payload.status = statusFilter;
      }

      const res = await fetchShiftClosingList(payload);
      if (reqId !== requestIdRef.current) return;

      if (!isApiSuccess(res)) {
        const msg =
          res?.data?.message ||
          res?.data?.msg ||
          'Failed to load shift closing history.';
        setError(msg);
        setRecords([]);
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

      setRecords(list);
      setTotalCount(total);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      console.error('Failed to load shift closing history:', err);
      setRecords([]);
      setTotalCount(0);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.msg ||
          err?.message ||
          'Network error while loading shift closing history.'
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
    organizationId,
    subOutletId,
    productionPlanId,
    mealTypeId,
    productionDate,
    fromDate,
    toDate,
    statusFilter,
  ]);

  useEffect(() => {
    if (!scopeLoading) {
      fetchList();
    }
  }, [fetchList, scopeLoading]);

  const handleResetFilters = () => {
    setSorting([{ id: 'closingDate', desc: true }]);
    setFilters(INITIAL_FILTERS);
  };

  const handleOpenRow = useCallback(
    (row) => {
      if (!row?.productionPlanId || !row?.mealTypeId || !row?.organizationId) {
        notify.error('Missing plan, meal type, or organization context on this row.');
        return;
      }
      navigate('/production/shift-closing/entry', {
        state: {
          productionPlanId: Number(row.productionPlanId),
          mealTypeId: Number(row.mealTypeId),
          organizationId: Number(row.organizationId),
          subOutletId: row.subOutletId ? Number(row.subOutletId) : null,
          planCode: row.planCode || '',
          mealTypeName: row.mealTypeName || '',
          organizationName: row.organizationName || '',
          subOutletName: row.subOutletName || '',
        },
      });
    },
    [navigate]
  );

  const handleOpenStartModal = () => {
    setStartContext({
      productionPlanId: productionPlanId || '',
      mealTypeId: mealTypeId || '',
      organizationId: organizationId || '',
      subOutletId: subOutletId || '',
    });
    setIsStartModalOpen(true);
  };

  const handleConfirmStart = (e) => {
    e.preventDefault();
    if (!startContext.productionPlanId) {
      notify.error('Please select a Production Plan.');
      return;
    }
    if (!startContext.mealTypeId) {
      notify.error('Please select a Meal Type.');
      return;
    }
    if (!startContext.organizationId) {
      notify.error('Please select an Organization.');
      return;
    }

    const planObj = planChoices.find(
      (p) => String(p.id) === String(startContext.productionPlanId)
    );
    const mtObj = mealTypes.find(
      (mt) => String(mt.id) === String(startContext.mealTypeId)
    );
    const orgObj = orgOptions.find(
      (o) => String(o.value) === String(startContext.organizationId)
    );
    const subObj = startSubOutletOptions.find(
      (su) => String(su.value) === String(startContext.subOutletId)
    );

    setIsStartModalOpen(false);
    navigate('/production/shift-closing/entry', {
      state: {
        productionPlanId: Number(startContext.productionPlanId),
        mealTypeId: Number(startContext.mealTypeId),
        organizationId: Number(startContext.organizationId),
        subOutletId: startContext.subOutletId ? Number(startContext.subOutletId) : null,
        planCode: planObj?.planCode || '',
        mealTypeName: mtObj?.name || mtObj?.mealTypeName || '',
        organizationName: orgObj?.label || '',
        subOutletName: subObj?.label || '',
      },
    });
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
        cell: ({ row }) => {
          const r = row.original;
          return (
            <button
              type="button"
              onClick={() => handleOpenRow(r)}
              className="px-2 font-bold text-xs text-[#084E92] hover:underline cursor-pointer text-left"
            >
              {r.planCode || (r.productionPlanId ? `PP-${r.productionPlanId}` : '—')}
            </button>
          );
        },
        size: 140,
      },
      {
        id: 'closingDate',
        accessorFn: (row) => row.closingDate || row.productionDate,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Closing Date"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="px-2 flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span>
              {formatDateDot(row.original.closingDate || row.original.productionDate)}
            </span>
          </div>
        ),
        size: 135,
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
                (row.original.mealTypeId ? `Meal #${row.original.mealTypeId}` : '—')}
            </span>
          </div>
        ),
        size: 120,
      },
      {
        id: 'subOutletName',
        accessorFn: (row) => row.subOutletName || row.organizationName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Outlet"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="px-2 text-xs">
              <span className="font-semibold text-gray-800 block truncate">
                {r.subOutletName || r.organizationName || '—'}
              </span>
              {r.subOutletName && r.organizationName && (
                <span className="text-[11px] text-slate-400 block truncate">
                  {r.organizationName}
                </span>
              )}
            </div>
          );
        },
        size: 165,
      },
      {
        id: 'totalActualPax',
        accessorFn: (row) => row.totalActualPax ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Actual Pax"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs font-bold text-slate-800">
            {row.original.totalActualPax ?? 0}
          </span>
        ),
        size: 105,
      },
      {
        id: 'totalClosingQty',
        accessorFn: (row) => row.totalClosingQty ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Leftover Qty"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const qty = row.original.totalClosingQty;
          return (
            <span className="block px-2 text-xs font-semibold text-slate-800">
              {qty !== null && qty !== undefined ? Number(qty).toFixed(3) : '—'}
            </span>
          );
        },
        size: 115,
      },
      {
        id: 'consumptionPct',
        accessorFn: (row) => row.consumptionPct ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Consumption %"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const pct = row.original.consumptionPct;
          return (
            <span className="block px-2 text-xs font-bold text-[#084E92]">
              {pct !== null && pct !== undefined ? `${Number(pct).toFixed(2)}%` : '—'}
            </span>
          );
        },
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
        cell: ({ row }) => (
          <div className="px-2">
            <StatusBadge status={row.original.status || 'DRAFT'} />
          </div>
        ),
        size: 115,
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
          const isClosed = statusNorm === 'CLOSED';
          return (
            <div className="flex items-center gap-1 px-2">
              <button
                type="button"
                onClick={() => handleOpenRow(row.original)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isClosed
                    ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    : 'bg-[#084E92] hover:bg-[#00376C] text-white'
                }`}
              >
                {isClosed ? <Eye size={13} /> : <Play size={12} />}
                <span>{isClosed ? 'View' : 'Continue'}</span>
              </button>
            </div>
          );
        },
        size: 115,
        enableSorting: false,
      },
    ],
    [pageIndex, pageSize, handleOpenRow]
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
    data: records,
    columns,
    state: { pagination, sorting },
    onPaginationChange: handlePaginationChange,
    onSortingChange: (updater) => {
      setSorting((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        return next.length > 0 ? next : [{ id: 'closingDate', desc: true }];
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
          title="Shift Closing & Leftover Disposition"
          description="Record post-service leftover quantities, wastage/reuse disposition, and actual pax per meal shift."
          actions={
            <HeaderActionButton
              onClick={handleOpenStartModal}
              icon={Plus}
              label="Open Shift Closing"
            />
          }
        />

        <PageErrorAlert
          error={scopeError || error}
          onRetry={() => {
            if (scopeError) {
              retryScope?.();
            } else {
              fetchList();
            }
          }}
          className="my-2"
        />

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Organization
              </label>
              <SearchableSelect
                name="organizationId"
                value={organizationId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFilters((prev) => ({
                    ...prev,
                    organizationId: val,
                    subOutletId: '',
                    page: 0,
                  }));
                }}
                options={orgOptions}
                placeholder="All Organizations"
                isClearable={true}
              />
            </div>

            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Outlet / Sub-Unit
              </label>
              <SearchableSelect
                name="subOutletId"
                value={subOutletId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFilters((prev) => ({ ...prev, subOutletId: val, page: 0 }));
                }}
                options={subOutletFilterOptions}
                placeholder="All Outlets"
                isClearable={true}
              />
            </div>

            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Production Plan
              </label>
              <SearchableSelect
                name="productionPlanId"
                value={productionPlanId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFilters((prev) => ({
                    ...prev,
                    productionPlanId: val,
                    page: 0,
                  }));
                }}
                options={planOptions}
                placeholder="All Production Plans"
                isClearable={true}
              />
            </div>

            <div className="lg:col-span-3">
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

            <div className="lg:col-span-3">
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
                    page: 0,
                  }))
                }
                className="w-full h-10 px-3 bg-white border border-[#C3C6D1] rounded-xl text-xs font-medium text-slate-900 focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                From Date
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
                    page: 0,
                  }))
                }
                className="w-full h-10 px-3 bg-white border border-[#C3C6D1] rounded-xl text-xs font-medium text-slate-900 focus:border-[#084E92] focus:outline-none"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    toDate: e.target.value,
                    page: 0,
                  }))
                }
                className="w-full h-10 px-3 bg-white border border-[#C3C6D1] rounded-xl text-xs font-medium text-slate-900 focus:border-[#084E92] focus:outline-none"
              />
            </div>

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
                    <SelectItem value="CLOSED" className="text-xs">
                      Closed
                    </SelectItem>
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

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading || scopeLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin text-[#084E92]" />
              Loading shift closing records...
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-slate-400">
              <ClipboardCheck size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">
                No Shift Closing Records Found
              </p>
              <p className="text-xs">
                Click &quot;Open Shift Closing&quot; above to record leftovers for a meal shift, or adjust your filters.
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

      {/* Start / Open Shift Closing Context Modal */}
      {isStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#E5E7EB] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center">
                  <ClipboardCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Open Shift Closing</h3>
                  <p className="text-xs text-gray-500">
                    Select plan, meal type, organization, and outlet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStartModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmStart} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Production Plan <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  name="startPlanId"
                  value={startContext.productionPlanId}
                  onChange={(e) => {
                    const val = e?.target?.value ?? e?.value ?? '';
                    setStartContext((prev) => ({ ...prev, productionPlanId: val }));
                  }}
                  options={planOptions.filter((p) => p.value !== '')}
                  placeholder="Select Production Plan"
                  isClearable={false}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Meal Type <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  name="startMealTypeId"
                  value={startContext.mealTypeId}
                  onChange={(e) => {
                    const val = e?.target?.value ?? e?.value ?? '';
                    setStartContext((prev) => ({ ...prev, mealTypeId: val }));
                  }}
                  options={mealTypeOptions.filter((m) => m.value !== '')}
                  placeholder="Select Meal Type"
                  isClearable={false}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Organization <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  name="startOrganizationId"
                  value={startContext.organizationId}
                  onChange={(e) => {
                    const val = e?.target?.value ?? e?.value ?? '';
                    setStartContext((prev) => ({
                      ...prev,
                      organizationId: val,
                      subOutletId: '',
                    }));
                  }}
                  options={orgOptions.filter((o) => o.value !== '')}
                  placeholder="Select Organization"
                  isClearable={false}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Outlet / Sub-Unit
                </label>
                <SearchableSelect
                  name="startSubOutletId"
                  value={startContext.subOutletId}
                  onChange={(e) => {
                    const val = e?.target?.value ?? e?.value ?? '';
                    setStartContext((prev) => ({ ...prev, subOutletId: val }));
                  }}
                  options={startSubOutletOptions}
                  placeholder={
                    !startContext.organizationId
                      ? 'Select Organization First'
                      : startSubOutletOptions.length === 0
                        ? 'No Sub-Outlets Found'
                        : 'Select Outlet'
                  }
                  disabled={!startContext.organizationId || startSubOutletOptions.length === 0}
                  isClearable={true}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsStartModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#084E92] hover:bg-[#063c70] text-white text-xs font-semibold transition cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Container>
  );
};

export default ShiftClosingList;

