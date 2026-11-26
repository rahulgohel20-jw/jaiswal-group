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
  Trash2,
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
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { GetAllPrepWaste, getAllMealTypes } from '@/services/apiServices';

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  SUBMITTED: {
    label: 'Submitted',
    badgeClass: 'bg-blue-50 text-[#084E92] border-blue-200',
  },
  APPROVED: {
    label: 'Approved',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
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

const INITIAL_FILTERS = {
  planCode: '',
  mealTypeId: '',
  kitchenLocationId: '',
  status: 'All Status',
  fromDate: '',
  toDate: '',
  page: 0,
  pageSize: 10,
};

const CHILD_ROUTES = [
  '/production/prep-waste/create',
  '/production/plans/:planId/prep-waste',
];

const PreparationWasteListing = () => {
  const navigate = useNavigate();

  const {
    loading: scopeLoading,
    error: scopeError,
    subLocations,
    retry: retryScope,
  } = useOrgScope();

  const [filters, setFilters] = useModuleState(
    'PREP_WASTE_LISTING',
    INITIAL_FILTERS,
    CHILD_ROUTES
  );

  const {
    planCode,
    mealTypeId,
    kitchenLocationId,
    status: statusFilter,
    fromDate,
    toDate,
    page: pageIndex,
    pageSize,
  } = filters;

  const [mealTypes, setMealTypes] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  const [planCodeInput, setPlanCodeInput] = useState(planCode);

  useEffect(() => {
    setPlanCodeInput(planCode);
  }, [planCode]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (planCodeInput !== planCode) {
        setFilters((prev) => ({
          ...prev,
          planCode: planCodeInput,
          page: 0,
        }));
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [planCodeInput, planCode, setFilters]);

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

  const mealTypeOptions = useMemo(() => {
    return [
      { value: '', label: 'All Meal Types' },
      ...mealTypes.map((mt) => ({
        value: String(mt.id),
        label: mt.name || mt.mealTypeName || `Meal #${mt.id}`,
      })),
    ];
  }, [mealTypes]);

  const fetchPrepWaste = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        page: pageIndex,
        size: pageSize,
      };

      if (planCode.trim()) payload.planCode = planCode.trim();
      if (fromDate) payload.fromDate = fromDate;
      if (toDate) payload.toDate = toDate;
      if (mealTypeId && Number(mealTypeId) > 0) payload.mealTypeId = Number(mealTypeId);
      if (kitchenLocationId && Number(kitchenLocationId) > 0) {
        payload.kitchenLocationId = Number(kitchenLocationId);
      }
      if (statusFilter && statusFilter !== 'All Status') {
        payload.status = statusFilter;
      }
      if (sorting.length > 0) {
        payload.sortBy = sorting[0].id;
        payload.sortDirection = sorting[0].desc ? 'DESC' : 'ASC';
      }

      const res = await GetAllPrepWaste(payload);
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
      console.error('Failed to load preparation waste list:', err);
      setRecords([]);
      setTotalCount(0);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.msg ||
          err?.message ||
          'Failed to load preparation waste entries.'
      );
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, planCode, fromDate, toDate, mealTypeId, kitchenLocationId, statusFilter, sorting]);

  useEffect(() => {
    if (!scopeLoading) {
      fetchPrepWaste();
    }
  }, [fetchPrepWaste, scopeLoading]);

  const handleResetFilters = () => {
    setPlanCodeInput('');
    setFilters(INITIAL_FILTERS);
  };

  const handleOpenEntry = useCallback(
    (row) => {
      const targetPlanId = row?.productionPlanId || row?.id || 0;
      navigate(`/production/plans/${targetPlanId}/prep-waste`, {
        state: {
          prepWasteRecord: row,
          productionPlanId: row?.productionPlanId || 0,
          planCode: row?.planCode || '',
          mealTypeId: row?.mealTypeId || 0,
          mealTypeName: row?.mealTypeName || '',
          productionDate: row?.productionDate || '',
          kitchenLocationName: row?.kitchenLocationName || row?.kitchenName || '',
          entries: row?.entries || row?.items || [],
          notes: row?.notes || '',
          status: row?.status || 'DRAFT',
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
            onClick={() => handleOpenEntry(row.original)}
            className="px-2 font-bold text-xs text-[#084E92] hover:underline cursor-pointer text-left"
          >
            {row.original.planCode ||
              row.original.prepWasteCode ||
              `PP-${row.original.productionPlanId || row.original.id}`}
          </button>
        ),
        size: 150,
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
            <span>{formatDateDot(row.original.productionDate || row.original.createdAt)}</span>
          </div>
        ),
        size: 140,
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
        size: 130,
      },
      {
        id: 'kitchenLocationName',
        accessorFn: (row) => row.kitchenLocationName || row.kitchenName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Kitchen Location"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs text-gray-800 font-medium">
            {row.original.kitchenLocationName || row.original.kitchenName || '—'}
          </span>
        ),
        size: 160,
        enableSorting: false,
      },
      {
        id: 'entriesCount',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Entries"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const count =
            row.original.entriesCount ??
            row.original.totalEntries ??
            (Array.isArray(row.original.entries) ? row.original.entries.length : null) ??
            1;
          return (
            <span className="block px-2 text-xs font-semibold text-slate-700">
              {count} {count === 1 ? 'Item' : 'Items'}
            </span>
          );
        },
        size: 95,
        enableSorting: false,
      },
      {
        id: 'wasteQuantity',
        accessorFn: (row) => row.totalWasteQuantity ?? row.wasteQuantity,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Total Waste Qty"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const entriesArr = Array.isArray(row.original.entries) ? row.original.entries : [];
          const computedWaste = entriesArr.reduce(
            (sum, e) => sum + (Number(e.wasteQuantity) || 0),
            0
          );
          const qty = Number(
            row.original.totalWasteQuantity ?? row.original.wasteQuantity ?? computedWaste
          );
          return (
            <span className="block px-2 text-xs font-bold text-rose-600">
              {Number(qty.toFixed(2))} kg
            </span>
          );
        },
        size: 130,
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
          const rawStatus = String(row.original.status || 'DRAFT').toUpperCase();
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
        size: 125,
        enableSorting: false,
      },
      {
        id: 'notes',
        accessorFn: (row) => row.notes || row.remarks,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Notes"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const text = row.original.notes || row.original.remarks || '';
          return (
            <span
              title={text || '—'}
              className="block px-2 text-xs text-slate-600 truncate max-w-[180px]"
            >
              {text || '—'}
            </span>
          );
        },
        size: 185,
        enableSorting: false,
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
        cell: ({ row }) => (
          <div className="flex items-center gap-1 px-2">
            <button
              type="button"
              onClick={() => handleOpenEntry(row.original)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-[#084E92] hover:bg-blue-50 transition cursor-pointer"
              title="View / Edit Preparation Waste"
            >
              <Eye size={14} />
              <span>View</span>
            </button>
          </div>
        ),
        size: 100,
        enableSorting: false,
      },
    ],
    [pageIndex, pageSize, handleOpenEntry]
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
          title="Preparation Waste Entry"
          description="Track and record raw material waste generated during cleaning, peeling, cutting, and trimming."
          actions={
            <HeaderActionButton
              to="/production/prep-waste/create"
              icon={Plus}
              label="Add Prep Waste"
            />
          }
        />

        <PageErrorAlert
          error={scopeError || error}
          onRetry={() => {
            if (scopeError) {
              retryScope?.();
            } else {
              fetchPrepWaste();
            }
          }}
          className="my-2"
        />

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Plan Code Search */}
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Plan Code
              </label>
              <SearchBar
                value={planCodeInput}
                onChange={(e) => setPlanCodeInput(e.target.value)}
                onClear={() => {
                  setPlanCodeInput('');
                  setFilters((prev) => ({
                    ...prev,
                    planCode: '',
                    page: 0,
                  }));
                }}
                placeholder="Search by plan code..."
              />
            </div>

            {/* Meal Type */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Meal Type
              </label>
              <SearchableSelect
                name="mealTypeId"
                value={mealTypeId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFilters((prev) => ({
                    ...prev,
                    mealTypeId: val,
                    page: 0,
                  }));
                }}
                options={mealTypeOptions}
                placeholder="All Meal Types"
                isClearable={true}
              />
            </div>

            {/* Kitchen Location */}
            <div className="md:col-span-2">
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

            {/* From Date */}
            <div className="md:col-span-2">
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
            <div className="md:col-span-1">
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
                className="w-full h-10 px-2.5 bg-white border border-[#C3C6D1] hover:border-slate-400 focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/20 focus:outline-none rounded-xl text-xs font-medium text-slate-900 transition-all shadow-2xs"
              />
            </div>

            {/* Status & Reset */}
            <div className="md:col-span-2">
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
                    <SelectItem value="All Status" className="text-xs">All Status</SelectItem>
                    <SelectItem value="DRAFT" className="text-xs">Draft</SelectItem>
                    <SelectItem value="SUBMITTED" className="text-xs">Submitted</SelectItem>
                    <SelectItem value="APPROVED" className="text-xs">Approved</SelectItem>
                    <SelectItem value="COMPLETED" className="text-xs">Completed</SelectItem>
                    <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
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
              Loading preparation waste records...
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-slate-400">
              <Trash2 size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">
                No Preparation Waste Entries Found
              </p>
              <p className="text-xs">
                Click &quot;Add Prep Waste&quot; to record preparation waste for a production plan.
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

export default PreparationWasteListing;

