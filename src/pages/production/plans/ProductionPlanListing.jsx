import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Plus,
  PackageCheck,
  Trash2,
  Truck,
  ArrowDownLeft,
  Utensils,
  Eye,
  ChefHat,
  Pencil,
  Loader2,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { KpiCard } from '@/components/production/KpiCard';
import { SearchBar } from '@/components/common/SearchBar';
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
import { getAllProductionPlans, GetAllStoreByOrg } from '@/services/apiServices';
import { getOrgIdFromToken, getOutletIdFromToken } from '@/utils/auth';
import { useOrgScope } from '@/hooks/useOrgScope';
import { useServerPagination } from '@/hooks/useServerPagination';
import { getUserPermissions } from '@/utils/permissions';
import { notify } from '@/utils/toast';

const formatDateDisplay = (dateVal) => {
  if (!dateVal) return '—';
  const str = String(dateVal).split('T')[0];
  const parts = str.split('-');
  if (parts.length === 3) {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${parts[2]} ${monthNames[monthIdx] || parts[1]} ${parts[0]}`;
  }
  return dateVal;
};

export const ProductionPlanListing = () => {
  const navigate = useNavigate();

  const {
    isOutletUser,
    effectiveOutletId,
    selectedUnitId,
    selfOrg,
  } = useOrgScope();

  // Resolve organization ID for Unit User:
  // When logged in as Unit User (e.g. PDEU id 40), pass 40 in organizationId, NOT in subOutletId
  const resolvedOrgId = useMemo(() => {
    if (isOutletUser && effectiveOutletId) {
      return Number(effectiveOutletId);
    }
    if (selectedUnitId && Number.isFinite(Number(selectedUnitId))) {
      return Number(selectedUnitId);
    }
    const unitFallback =
      effectiveOutletId ??
      getOutletIdFromToken() ??
      selfOrg?.id ??
      getOrgIdFromToken();
    return unitFallback ? Number(unitFallback) : 0;
  }, [isOutletUser, effectiveOutletId, selectedUnitId, selfOrg]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedKitchenId, setSelectedKitchenId] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Granular rights checks for action buttons
  const { isAdmin, hasPermission } = useMemo(() => getUserPermissions(), []);

  const canExecute = useMemo(
    () =>
      isAdmin ||
      hasPermission('Production Execution', 'view') ||
      hasPermission('Production Execution', 'add') ||
      hasPermission('Production Execution', 'edit') ||
      hasPermission('Production Plans', 'edit'),
    [isAdmin, hasPermission]
  );

  const canFoodTransfer = useMemo(
    () =>
      isAdmin ||
      hasPermission('Food Transfers', 'view') ||
      hasPermission('Food Transfers', 'add') ||
      hasPermission('Food Transfers', 'edit'),
    [isAdmin, hasPermission]
  );

  const canPlateWaste = useMemo(
    () =>
      isAdmin ||
      hasPermission('Plate Waste', 'view') ||
      hasPermission('Plate Waste', 'add') ||
      hasPermission('Plate Waste', 'edit'),
    [isAdmin, hasPermission]
  );

  const canStoreIssue = useMemo(
    () =>
      isAdmin ||
      hasPermission('Store Issues', 'view') ||
      hasPermission('Store Issues', 'add') ||
      hasPermission('Store Issues', 'edit'),
    [isAdmin, hasPermission]
  );

  const canViewPlan = useMemo(
    () =>
      isAdmin ||
      hasPermission('Production Plans', 'view') ||
      hasPermission('Production Plan', 'view'),
    [isAdmin, hasPermission]
  );

  // Sorting state matching TanStack react-table pattern
  const [sorting, setSorting] = useState([{ id: 'id', desc: true }]);

  // Server Pagination hook matching PurchaseRequisitionList.jsx
  const {
    pagination,
    setPagination,
    totalElements,
    totalPages,
    updateFromResponse,
    resetPage,
  } = useServerPagination({ defaultPageSize: 10 });

  // Data & loading state
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [kitchenOptions, setKitchenOptions] = useState([]);

  // Fetch kitchen options for filter
  useEffect(() => {
    let isMounted = true;
    const loadKitchens = async () => {
      try {
        const targetOrg = resolvedOrgId || Number(getOrgIdFromToken()) || 40;
        const res = await GetAllStoreByOrg({ orgId: targetOrg, type: 'KITCHEN' });
        const data = res?.data?.data || res?.data || [];
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const mapped = data.map((k) => ({
            id: k.id || k.subLocationId || k.subOutletId,
            name: k.name || k.subLocationName || k.subOutletName || `Kitchen #${k.id}`,
          }));
          setKitchenOptions(mapped);
        }
      } catch (err) {
        console.warn('Failed to load kitchens for production plan filter:', err);
      }
    };
    loadKitchens();
    return () => {
      isMounted = false;
    };
  }, [resolvedOrgId]);

  // Fetch Production Plans via POST /production/get-all
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const activeSort = sorting[0] || { id: 'id', desc: true };
      const payload = {
        direction: activeSort.desc ? 'DESC' : 'ASC',
        fromDate: fromDate || '',
        id: 0,
        mealTypeId: 0,
        menuPlanId: 0,
        organizationId: Number(resolvedOrgId || 0),
        page: pagination.pageIndex,
        pageNo: pagination.pageIndex,
        pageSize: pagination.pageSize,
        planCode: '',
        productionLocationId: selectedKitchenId !== 'All' ? Number(selectedKitchenId) : 0,
        search: (searchQuery || '').trim(),
        size: pagination.pageSize,
        sortBy: activeSort.id || 'id',
        status: selectedStatus === 'All' ? '' : selectedStatus,
        subOutletId: 0,
        toDate: toDate || '',
      };

      const res = await getAllProductionPlans(payload);
      const resData = res?.data?.data ?? res?.data;

      const rawList = Array.isArray(resData?.content)
        ? resData.content
        : Array.isArray(resData?.items)
          ? resData.items
          : Array.isArray(resData?.plans)
            ? resData.plans
            : Array.isArray(resData?.data)
              ? resData.data
              : Array.isArray(resData)
                ? resData
                : [];

      const paginationSource =
        resData && typeof resData === 'object' && ('totalElements' in resData || 'totalRecords' in resData || 'totalPages' in resData)
          ? { data: resData }
          : res;
      updateFromResponse(paginationSource, rawList.length);

      if (rawList.length > 0) {
        const mapped = rawList.map((item, idx) => {
          const progressVal = Number(
            item.progressPct ??
            item.progress ??
            (item.status === 'COMPLETED' ? 100 : item.status === 'IN_PROGRESS' ? 65 : 0)
          );

          const rawMenuPlanCode =
            item.menuPlanCode ||
            item.mealPlanCode ||
            item.menuPlanPlanCode ||
            item.menuPlan?.planCode ||
            item.menuPlan?.menuPlanCode;

          const menuPlanIdVal =
            item.menuPlanId ??
            item.mealPlanId ??
            item.menuPlan?.id ??
            item.menuPlanDayId ??
            null;

          const menuPlanDisplay =
            rawMenuPlanCode ||
            (menuPlanIdVal
              ? `MPL-${new Date().getFullYear()}-${String(menuPlanIdVal).padStart(4, '0')}`
              : '—');

          return {
            id: item.id || item.productionPlanId || idx + 1,
            planCode: item.planCode || `PP-${new Date().getFullYear()}-${String(item.id || idx + 1).padStart(4, '0')}`,
            menuPlanId: menuPlanIdVal,
            menuPlanCode: rawMenuPlanCode,
            menuPlanDayId: item.menuPlanDayId || null,
            menuPlanDisplay,
            date: formatDateDisplay(item.productionDate || item.planDate || item.servingDate || item.createdAt),
            shift: item.mealTypeName || item.shiftName || item.shift || 'General',
            site: item.organizationName || item.siteName || item.site || 'Main Site',
            kitchen: item.productionLocationName || item.kitchenLocationName || item.kitchenName || item.subLocationName || item.kitchen || 'Central Kitchen',
            progress: Math.min(100, Math.max(0, progressVal)),
            plannedQty: item.totalPlannedQty != null ? `${item.totalPlannedQty} meals` : item.totalPlannedPax != null ? `${item.totalPlannedPax} pax` : (item.plannedQty || '0 meals'),
            completedQty: item.totalCompletedQty != null ? `${item.totalCompletedQty} meals` : (item.completedQty || '0 meals'),
            status: String(item.status || 'DRAFT').toUpperCase(),
            raw: item,
          };
        });
        setPlans(mapped);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error('Failed to load production plans from API:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [
    resolvedOrgId,
    pagination.pageIndex,
    pagination.pageSize,
    searchQuery,
    fromDate,
    toDate,
    selectedKitchenId,
    selectedStatus,
    sorting,
    updateFromResponse,
  ]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Reset page when filters change
  useEffect(() => {
    resetPage();
  }, [searchQuery, fromDate, toDate, selectedKitchenId, selectedStatus, resetPage]);

  // Dynamic KPI counts
  const totalCount = totalElements || plans.length;
  const inProgressCount = plans.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'EXECUTE' || p.status === 'EXECUETE').length;
  const completedCount = plans.filter((p) => p.status === 'COMPLETED').length;
  const draftCount = plans.filter((p) => p.status === 'DRAFT' || p.status === 'CONFIRMED' || p.status === 'PENDING').length;

  // Table Columns Definition matching PurchaseRequisitionList.jsx design
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
        size: 40,
      },
      {
        id: 'planCode',
        accessorFn: (row) => row.planCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="PLAN ID" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => {
          const rawStatus = (row.original.status || '').toUpperCase();
          const isDraft = rawStatus === 'DRAFT' || rawStatus === 'PENDING';
          const hasMenuPlan = row.original.menuPlanDisplay && row.original.menuPlanDisplay !== '—';

          return (
            <div className="py-1">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    isDraft
                      ? `/production/plans/edit/${row.original.id}`
                      : `/production/plans/${row.original.id}/sourcing`
                  )
                }
                className="font-bold text-xs text-[#084E92] hover:underline cursor-pointer text-left block whitespace-nowrap"
                title={`Production Plan: ${row.original.planCode}`}
              >
                {row.original.planCode}
              </button>

              {hasMenuPlan && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (row.original.menuPlanId) {
                      navigate(`/production/menu-planning/details/${row.original.menuPlanId}`, {
                        state: {
                          planId: row.original.menuPlanId,
                          dayId: row.original.menuPlanDayId,
                        },
                      });
                    }
                  }}
                  disabled={!row.original.menuPlanId}
                  className={`text-[11px] text-left block whitespace-nowrap mt-0.5 ${
                    row.original.menuPlanId
                      ? 'text-slate-500 hover:text-[#084E92] hover:underline cursor-pointer'
                      : 'text-slate-400 cursor-default'
                  }`}
                  title={row.original.menuPlanId ? `View Menu Plan (${row.original.menuPlanDisplay})` : ''}
                >
                  <span className="font-normal text-slate-400">Meal: </span>
                  <span className="font-semibold text-slate-700">{row.original.menuPlanDisplay}</span>
                </button>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 135,
      },
      {
        id: 'productionDate',
        accessorFn: (row) => row.date,
        header: ({ column }) => (
          <DataGridColumnHeader title="DATE & SHIFT" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-gray-800 whitespace-nowrap overflow-hidden">
            <Calendar size={13} className="text-gray-400 shrink-0" />
            <span className="font-semibold">{row.original.date}</span>
            <span className="text-[11px] text-gray-500 font-medium">({row.original.shift})</span>
          </div>
        ),
        enableSorting: false,
        size: 165,
      },
      {
        id: 'organizationName',
        accessorFn: (row) => row.site,
        header: ({ column }) => (
          <DataGridColumnHeader title="UNIT" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-gray-800 text-xs truncate block" title={row.original.site}>
            {row.original.site}
          </span>
        ),
        enableSorting: false,
        size: 85,
      },
      {
        id: 'progress',
        accessorFn: (row) => row.progress,
        header: ({ column }) => (
          <DataGridColumnHeader title="PROGRESS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => {
          const pct = Math.min(100, Math.max(0, Number(row.original.progress || 0)));
          const isDone = pct === 100 || row.original.status === 'COMPLETED';
          return (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="w-12 bg-gray-100 rounded-full h-1.5 overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all ${isDone ? 'bg-emerald-500' : 'bg-[#084E92]'
                    }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-gray-700">{pct}%</span>
            </div>
          );
        },
        enableSorting: false,
        size: 85,
      },
      {
        id: 'totalPlannedQty',
        accessorFn: (row) => row.plannedQty,
        header: ({ column }) => (
          <DataGridColumnHeader title="PLANNED QTY" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-gray-900 text-xs whitespace-nowrap">
            {row.original.plannedQty}
          </span>
        ),
        enableSorting: false,
        size: 105,
      },
      {
        id: 'totalCompletedQty',
        accessorFn: (row) => row.completedQty,
        header: ({ column }) => (
          <DataGridColumnHeader title="COMPLETED QTY" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-gray-900 text-xs whitespace-nowrap">
            {row.original.completedQty}
          </span>
        ),
        enableSorting: false,
        size: 125,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => {
          const rawStatus = String(row.original.status || 'DRAFT').toUpperCase();
          const color =
            rawStatus === 'COMPLETED'
              ? 'text-emerald-600'
              : rawStatus === 'IN_PROGRESS'
                ? 'text-blue-600'
                : rawStatus === 'EXECUTE' || rawStatus === 'EXECUETE' || rawStatus === 'EXECUTED'
                  ? 'text-indigo-600'
                  : rawStatus === 'CONFIRMED'
                    ? 'text-sky-600'
                    : rawStatus === 'CANCELLED' || rawStatus === 'FAILED'
                      ? 'text-rose-600'
                      : 'text-amber-600';
          return (
            <span className={`text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${color}`}>
              {rawStatus.replace(/_/g, ' ')}
            </span>
          );
        },
        enableSorting: false,
        size: 95,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs text-center" />
        ),
        cell: ({ row }) => {
          const rawStatus = String(row.original.status || 'DRAFT').toUpperCase();
          const isDraft = rawStatus === 'DRAFT';
          const isConfirmed = rawStatus === 'CONFIRMED';
          const isExecuted =
            rawStatus === 'EXECUTE' ||
            rawStatus === 'EXECUETE' ||
            rawStatus === 'EXECUTED' ||
            rawStatus === 'IN_PROGRESS' ||
            rawStatus === 'COMPLETED';

          // When confirmed status: give actions like food transfer, plate waste, view, execute production
          const showExecution = (isDraft || isConfirmed || isExecuted) && canExecute;
          const showFoodTransfer = (isConfirmed || isExecuted) && canFoodTransfer;
          const showPlateWaste = (isConfirmed || isExecuted) && canPlateWaste;
          const showStoreIssue = (isConfirmed || isExecuted) && canStoreIssue;

          // View plan is available across statuses (draft, executed, cancelled, etc.) based on user rights
          const showView = canViewPlan;

          // Edit plan is available for draft plans
          const showEdit = isDraft && canExecute;

          return (
            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              {showEdit && (
                <button
                  type="button"
                  title="Edit Plan"
                  onClick={() =>
                    navigate(`/production/plans/edit/${row.original.id}`, {
                      state: { planId: row.original.id, isEdit: true },
                    })
                  }
                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                >
                  <Pencil size={15} />
                </button>
              )}

              {showExecution && (
                <button
                  type="button"
                  title="Production Execution"
                  onClick={() => navigate(`/production/plans/${row.original.id}/execution`)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition cursor-pointer"
                >
                  <ChefHat size={15} />
                </button>
              )}

              {showFoodTransfer && (
                <button
                  type="button"
                  title="Food Transfer"
                  onClick={() => navigate(`/production/transfers`)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                >
                  <Truck size={15} />
                </button>
              )}

              {showPlateWaste && (
                <button
                  type="button"
                  title="Plate Waste"
                  onClick={() => navigate(`/production/plate-waste/create`)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Utensils size={15} />
                </button>
              )}

              {showStoreIssue && (
                <button
                  type="button"
                  title="Store Issue"
                  onClick={() =>
                    navigate(`/production/plans/${row.original.id}/store-issue`, {
                      state: { returnTo: '/production/plans' },
                    })
                  }
                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#084E92] hover:bg-blue-50 transition cursor-pointer"
                >
                  <PackageCheck size={15} />
                </button>
              )}

              {showView && (
                <button
                  type="button"
                  title="View Plan"
                  onClick={() => navigate(`/production/plans/${row.original.id}/sourcing`)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#084E92] hover:bg-slate-100 transition cursor-pointer"
                >
                  <Eye size={15} />
                </button>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 150,
      },
    ],
    [
      pagination.pageIndex,
      pagination.pageSize,
      navigate,
      canExecute,
      canFoodTransfer,
      canPlateWaste,
      canStoreIssue,
      canViewPlan,
    ]
  );

  const table = useReactTable({
    data: plans,
    columns,
    state: { pagination, sorting },
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        {/* Standardized PageHeader with HeaderActionButton */}
        <PageHeader
          title="Production Plan Listing"
          description="Manage production plans and access all related kitchen operations from one place."
          actions={
            <HeaderActionButton
              to="/production/plans/create"
              icon={Plus}
              label="Create Production Plan"
            />
          }
        />

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={FileText} label="Total Plans" value={totalCount} tone="default" />
          <KpiCard icon={Clock} label="In Progress" value={inProgressCount} tone="default" />
          <KpiCard icon={CheckCircle2} label="Completed Today" value={completedCount} tone="emerald" />
          <KpiCard icon={AlertTriangle} label="Pending Actions" value={draftCount} tone="amber" />
        </div>

        {/* Search & Filters Bar: Aligned in One Clean Row Without Outer Double Border */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* SearchBar matching PurchaseRequisitionList.jsx */}
          <div className="flex-1 min-w-[220px]">
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Search plan, meal plan, menu, kitchen..."
            />
          </div>

          {/* From Date - To Date */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center h-10 px-2.5 rounded-xl border border-[#C3C6D1] bg-white text-xs gap-1.5">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs text-gray-700 bg-transparent focus:outline-none"
                title="From Date"
              />
            </div>
            <span className="text-xs text-gray-400">to</span>
            <div className="flex items-center h-10 px-2.5 rounded-xl border border-[#C3C6D1] bg-white text-xs gap-1.5">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs text-gray-700 bg-transparent focus:outline-none"
                title="To Date"
              />
            </div>
          </div>

          {/* Kitchen Filter */}
          <div className="min-w-[180px]">
            <Select value={selectedKitchenId} onValueChange={setSelectedKitchenId}>
              <SelectTrigger className="h-10 rounded-xl border-[#C3C6D1] bg-white text-xs font-medium">
                <SelectValue placeholder="All Kitchens / Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs">
                  All Kitchens / Sites
                </SelectItem>
                {kitchenOptions.map((k) => (
                  <SelectItem key={k.id} value={String(k.id)} className="text-xs">
                    {k.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[140px]">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-10 rounded-xl border-[#C3C6D1] bg-white text-xs font-medium">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-xs">
                  All Status
                </SelectItem>
                <SelectItem value="DRAFT" className="text-xs">
                  Draft
                </SelectItem>
                <SelectItem value="CONFIRMED" className="text-xs">
                  Confirmed
                </SelectItem>
                <SelectItem value="EXECUTE" className="text-xs">
                  Execute
                </SelectItem>
                <SelectItem value="IN_PROGRESS" className="text-xs">
                  In Progress
                </SelectItem>
                <SelectItem value="COMPLETED" className="text-xs">
                  Completed
                </SelectItem>
                <SelectItem value="CANCELLED" className="text-xs">
                  Cancelled
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Plans Table: DataGrid + CardTable + DataGridPagination matching PurchaseRequisitionList.jsx */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin text-[#084E92]" />
              Loading production plans…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={totalElements || plans.length}
              className="rounded-2xl"
              emptyMessage="No Production Plans Found"
              tableLayout={{
                dense: true,
                width: 'fixed',
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
              tableClassNames={{
                base: 'w-full',
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none border-0">
                <CardTable className="w-full overflow-x-auto">
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

export default ProductionPlanListing;
