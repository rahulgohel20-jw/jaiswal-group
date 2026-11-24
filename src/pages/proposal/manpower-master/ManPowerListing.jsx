import { useCallback, useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import { notify } from '@/utils/toast';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  CheckCircle2,
  Users,
  SquarePen,
  Trash2,
  XCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { SearchBar } from '@/components/common/SearchBar';
import SearchableSelect from '../../../utils/SearchableSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModuleState } from '../../../hooks/useModuleState';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import {
  getAllManpower,
  deleteManpower,
  updateManpowerStatus,
  getAllStates,
} from '../../../services/apiServices';
import ManPowerModal from './ManPowerModal';


const extractArray = (res) => {
  if (!res) return [];
  const raw = res?.data?.data ?? res?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const cleanStateName = (name) => {
  if (!name) return '';
  return name.replace(/\s*\((Zone\s*[A-Za-z0-9]+)\)/gi, '').trim();
};

const StatCard = ({ label, value, icon, tone, textColor = 'text-black' }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
      {icon}
    </div>
    <div className="flex flex-col items-end text-right">
      <span className="text-xs font-semibold text-[#00376C]">{label}</span>
      <span className={`text-lg sm:text-xl font-bold mt-0.5 ${textColor}`}>{value}</span>
    </div>
  </div>
);

const INITIAL_FILTERS = {
  search: '',
  stateId: '',
  status: 'All Status',
  page: 0,
  pageSize: 10,
};

const CHILD_ROUTES = [];

const ManpowerListing = () => {
  const currentOrgId = Number(localStorage.getItem('organizationId') || 18);
  const currentUserId = Number(localStorage.getItem('userId') || 1);

  const [filters, setFilters, resetFilters] = useModuleState(
    'MANPOWER_MASTER',
    INITIAL_FILTERS,
    CHILD_ROUTES
  );

  const {
    search,
    stateId: stateFilter,
    status: statusFilter,
    page: pageIndex,
    pageSize,
  } = filters;

  const { canAdd, canEdit, canDelete, canView, canExport } = usePagePermissions([
    'Man Power Master',
    'Manpower Master',
    'Man Power',
    'Manpower',
  ]);

  // UI & Data States
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manpowerList, setManpowerList] = useState([]);
  const [states, setStates] = useState([]);
  const [error, setError] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedManpower, setSelectedManpower] = useState(null);

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

  // Counters
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  // Confirm Modals
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // TanStack Pagination state
  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
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

  // Fetch States for filter dropdown
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await getAllStates();
        setStates(extractArray(res));
      } catch (err) {
        console.error('Failed to load states:', err);
      }
    };
    fetchStates();
  }, []);

  const stateSelectOptions = useMemo(
    () => [
      { value: '', label: 'All States' },
      ...states.map((st) => ({
        value: String(st.id ?? st.value),
        label: cleanStateName(st.name || st.stateName || st.label || `State #${st.id ?? st.value}`),
      })),
    ],
    [states]
  );

  // Fetch Manpower Records
  const fetchManpower = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {}

      if (search.trim()) {
        params.search = search.trim();
      }

      if (stateFilter) {
        params.stateId = Number(stateFilter);
      }

      const res = await getAllManpower();
      const data = res?.data?.data ?? res?.data ?? [];
      const rawList = Array.isArray(data) ? data : data?.items || data?.content || [];

      const list = rawList.map((item) => ({
        id: item.id,
        name: item.name || '-',
        basicSalary: item.basicSalary ?? 0,
        stateId: item.stateId,
        stateName: item.stateName || item.state?.name || '-',
        status: item.isActive !== false && item.status !== 'Inactive' ? 'Active' : 'Inactive',
        raw: item,
      }));

      // Client-side status filter
      const filteredList =
        statusFilter !== 'All Status'
          ? list.filter((item) => item.status === statusFilter)
          : list;

      const total = data?.totalElements ?? data?.totalRecords ?? list.length;
      const active = list.filter((i) => i.status === 'Active').length;
      const inactive = list.filter((i) => i.status === 'Inactive').length;

      setManpowerList(filteredList);
      setTotalCount(filteredList.length);
      setActiveCount(active);
      setInactiveCount(inactive);
    } catch (err) {
      console.error('Failed to load manpower:', err);
      setManpowerList([]);
      setError('Failed to load manpower records');
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, search, stateFilter, statusFilter]);

  useEffect(() => {
    fetchManpower();
  }, [fetchManpower]);

  // Client-side pagination slice
  const displayedItems = useMemo(() => {
    const start = pageIndex * pageSize;
    return manpowerList.slice(start, start + pageSize);
  }, [manpowerList, pageIndex, pageSize]);

  // Status toggle handler
  const openStatusConfirm = (item) => {
    setStatusTarget({
      id: item.id,
      itemLabel: item.name,
      nextStatus: item.status !== 'Active',
      nextStatusLabel: item.status === 'Active' ? 'Inactive' : 'Active',
      raw: item.raw,
    });
    setShowStatusConfirm(true);
  };

  const closeStatusConfirm = () => {
    if (statusSaving) return;
    setShowStatusConfirm(false);
    setStatusTarget(null);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;

    setStatusSaving(true);
    try {
      await updateManpowerStatus(statusTarget.id, statusTarget.nextStatus, currentUserId);
      closeStatusConfirm();
      fetchManpower();
    } catch (err) {
      console.error(err);
      notify.error('Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  };

  // Delete handler
  const openDeleteConfirm = (item) => {
    setDeleteTarget({ id: item.id, itemLabel: item.name });
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
      await deleteManpower(deleteTarget.id);
      closeDeleteConfirm();
      fetchManpower();
    } catch (err) {
      console.error(err);
      notify.error('Failed to delete manpower');
    } finally {
      setDeleteSaving(false);
    }
  };

  // TanStack columns
  const columns = useMemo(
    () => [
      {
        id: 'sno',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="S.NO"
            column={column}
            className="py-6 text-xs uppercase text-[#43474F] font-semibold"
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
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="NAME"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 px-2">
            <span className="font-medium text-xs text-gray-800 capitalize truncate max-w-full">
              {row.original.name}
            </span>
          </div>
        ),
        size: 240,
      },
      {
        id: 'basicSalary',
        accessorFn: (row) => row.basicSalary,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="BASIC SALARY"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs font-semibold text-gray-800">
            ₹{Number(row.original.basicSalary ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        ),
        size: 150,
      },
      {
        id: 'state',
        accessorFn: (row) => row.stateName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="STATE"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="block px-2 text-xs text-gray-700 font-medium">
            {cleanStateName(row.original.stateName)}
          </span>
        ),
        size: 160,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="STATUS"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="px-2">
            <label className="relative inline-flex cursor-pointer">
              <input
                type="checkbox"
                checked={row.original.status === 'Active'}
                disabled={!canEdit}
                onChange={() => openStatusConfirm(row.original)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-[#084E92] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full peer-disabled:opacity-60 peer-disabled:cursor-not-allowed" />
            </label>
          </div>
        ),
        enableSorting: false,
        size: 110,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="ACTIONS"
            column={column}
            className="py-4 uppercase text-[#43474F] font-semibold text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3 px-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setSelectedManpower(row.original);
                  setShowModal(true);
                }}
              >
                <SquarePen
                  size={18}
                  className="text-gray-500 hover:text-blue-800 cursor-pointer transition"
                />
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => openDeleteConfirm(row.original)}
              >
                <Trash2
                  size={18}
                  className="text-red-300 hover:text-red-700 cursor-pointer transition"
                />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
        size: 110,
      },
    ],
    [pageIndex, pageSize, canEdit, canDelete]
  );

  const table = useReactTable({
    data: displayedItems,
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
    return <AccessDenied pageTitle="Man Power Master" />;
  }

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        {/* Page Header */}
        <PageHeader
          title="Manpower Master"
          description="Configure and manage manpower designations, state-wise minimum/basic salaries, and statuses."
          actions={
            <div className="flex items-center gap-3">
              {/* {canExport && (
                <HeaderActionButton
                  variant="outline"
                  onClick={() => setShowExportModal(true)}
                  icon={<Download className="w-3.5 h-3.5" />}
                  label="Export"
                />
              )} */}
              {canAdd && (
                <HeaderActionButton
                  onClick={() => {
                    setSelectedManpower(null);
                    setShowModal(true);
                  }}
                  icon={Plus}
                  label="Add Manpower"
                />
              )}
            </div>
          }
        />

        <PageErrorAlert error={error} onRetry={fetchManpower} className="my-2" />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total Manpower"
            value={totalCount.toLocaleString()}
            icon={<Users size={18} className="text-[#00376C]" />}
            tone="bg-[#D5E3FF]"
          />
          <StatCard
            label="Active Manpower"
            value={activeCount.toLocaleString()}
            icon={<CheckCircle2 size={18} className="text-[#15803D]" />}
            tone="bg-[#DCFCE7]"
          />
          <StatCard
            label="Inactive Manpower"
            value={inactiveCount.toLocaleString()}
            icon={<XCircle size={18} className="text-[#DC2626]" />}
            tone="bg-[#FEE2E2]"
          />
        </div>

        {/* Filters */}
        <div className="bg-white mt-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-6">
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
                placeholder="Search by manpower name..."
              />
            </div>

            {/* State Filter Searchable Select */}
            <div className="md:col-span-3">
              <SearchableSelect
                name="stateFilter"
                value={stateFilter}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFilters((prev) => ({
                    ...prev,
                    stateId: val,
                    page: 0,
                  }));
                }}
                options={stateSelectOptions}
                placeholder="All States"
                isClearable={true}
              />
            </div>

            {/* Status Filter Dropdown Select */}
            <div className="md:col-span-3">
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: value,
                    page: 0,
                  }))
                }
              >
                <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl bg-white text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Status">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* DataGrid Table */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading Manpower...
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

        {/* Add / Edit Modal */}
        <ManPowerModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedManpower(null);
          }}
          initialData={selectedManpower}
          currentOrgId={currentOrgId}
          stateOptions={states}
          onSuccess={fetchManpower}
        />

        {/* Status Toggle Modal */}
        <StatusConfirmModal
          isOpen={showStatusConfirm}
          onClose={closeStatusConfirm}
          onConfirm={confirmStatusChange}
          itemLabel={statusTarget?.itemLabel}
          nextStatusLabel={statusTarget?.nextStatusLabel}
          saving={statusSaving}
        />

        {/* Delete Confirm Modal */}
        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={closeDeleteConfirm}
          onConfirm={confirmDelete}
          itemLabel={deleteTarget?.itemLabel}
          saving={deleteSaving}
        />

        {/* Export Modal */}
        {/* <MasterExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          tableName="m_manpower"
          title="Export Manpower Report"
        /> */}
      </div>
    </Container>
  );
};

export default ManpowerListing;