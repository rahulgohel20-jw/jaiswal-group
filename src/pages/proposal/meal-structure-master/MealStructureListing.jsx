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
    CalendarDays,
    SquarePen,
    Trash2,
    XCircle,
    Plus,
    Loader2,
    Search,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import {
    deleteMealStructure,
    getAllMealStructures,
    saveOrUpdateMealStructure,
    getAllMealTypes,
} from '../../../services/apiServices';
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
import MasterExportModal from '../../../utils/MasterExportModal';
import SearchableSelect from '../../../utils/SearchableSelect';

const extractArray = (res) => {
    if (!res) return [];
    const raw = res?.data?.data ?? res?.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.content)) return raw.content;
    if (Array.isArray(res?.data?.content)) return res.data.content;
    if (Array.isArray(res?.data)) return res.data;
    return [];
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
    mealType: 'All',
    status: 'All',
    page: 0,
    pageSize: 10,
};

const CHILD_ROUTES = [
    '/proposal/meal-structure/add-meal-structure',
    '/proposal/meal-structure/edit-meal-structure',
];

const MealStructureListing = () => {
    const navigate = useNavigate();
    const currentOrgId = Number(localStorage.getItem('organizationId') || 18);

    const [filters, setFilters, resetFilters] = useModuleState(
        'MEAL_STRUCTURE_MASTER',
        INITIAL_FILTERS,
        CHILD_ROUTES
    );

    const {
        search,
        mealType: mealTypeFilter,
        status: statusFilter,
        page: pageIndex,
        pageSize,
    } = filters;

    const { canAdd, canEdit, canDelete, canView, canExport } = usePagePermissions([
        'Meal Structure Master',
        'Meal Structure',
        'Meal Structures',
    ]);

    // UI / Server states
    const [rowSelection, setRowSelection] = useState({});
    const [sorting, setSorting] = useState([]);
    const [loading, setLoading] = useState(false);
    const [structures, setStructures] = useState([]);
    const [error, setError] = useState(null);
    const [mealTypeOptions, setMealTypeOptions] = useState([]);
    const [showExportModal, setShowExportModal] = useState(false);

    // Debounced search input
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

    // Counters & Pagination
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [activeCount, setActiveCount] = useState(0);
    const [inactiveCount, setInactiveCount] = useState(0);

    // Modals
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

    // Load Meal Types for the filter dropdown
    useEffect(() => {
        const fetchMealTypes = async () => {
            try {
                const res = await getAllMealTypes(currentOrgId);
                setMealTypeOptions(extractArray(res));
            } catch (err) {
                console.error('Failed to load meal types:', err);
                setMealTypeOptions([]);
            }
        };

        fetchMealTypes();
    }, [currentOrgId]);

    // Fetch meal structures (Server-Side Paginated & Filtered)
    const fetchStructures = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = {
                page: pageIndex,
                size: pageSize,
            };

            if (search.trim()) {
                params.name = search.trim();
            }

            if (mealTypeFilter !== 'All') {
                params.mealTypeId = mealTypeFilter;
            }

            if (statusFilter !== 'All') {
                params.isActive = statusFilter === 'Active';
            }

            const res = await getAllMealStructures(params);
            const data = res?.data?.data ?? res?.data;
            const rawList = Array.isArray(data) ? data : data?.content || data?.items || [];

            const list = rawList.map((item, idx) => ({
                id: item.id,
                code: item.code || `MS-${String(item.id || idx + 1).padStart(3, '0')}`,
                name: item.name || '-',
                mealTypeId: item.mealTypeId,
                mealTypeName: item.mealTypeName || item.mealType?.name || '-',
                categorySlotsCount: item.details?.length || item.slots?.length || item.categorySlots?.length || 0,
                effectiveDate: item.effectiveDate ? item.effectiveDate.split('T')[0] : '-',
                status: item.isActive !== false ? 'Active' : 'Inactive',
                raw: item,
            }));

            // Pure server response mapping - no client-side filtering or slicing
            setStructures(list);
            setTotalCount(data?.totalElements ?? data?.totalRecords ?? list.length);
            setTotalPages(
                (data?.totalPages ?? Math.ceil((data?.totalElements ?? list.length) / pageSize)) || 1
            );

            // Counter cards
            if (data?.activeCount !== undefined && data?.inactiveCount !== undefined) {
                setActiveCount(data.activeCount);
                setInactiveCount(data.inactiveCount);
            } else {
                setActiveCount(data?.totalElements ?? list.length);
            }
        } catch (err) {
            console.error('Failed to load meal structures:', err);
            setStructures([]);
            setError('Failed to load meal structures');
        } finally {
            setLoading(false);
        }
    }, [currentOrgId, pageIndex, pageSize, search, mealTypeFilter, statusFilter]);

    useEffect(() => {
        fetchStructures();
    }, [fetchStructures]);

    // Status action
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
            const updatePayload = {
                ...(statusTarget.raw || {}),
                id: statusTarget.id,
                isActive: statusTarget.nextStatus,
                organizationId: currentOrgId,
            };
            await saveOrUpdateMealStructure(updatePayload);
            closeStatusConfirm();
            fetchStructures();
        } catch (err) {
            console.error(err);
            notify.error('Failed to update status');
        } finally {
            setStatusSaving(false);
        }
    };

    // Delete action
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
            await deleteMealStructure(deleteTarget.id);
            closeDeleteConfirm();
            fetchStructures();
        } catch (err) {
            console.error(err);
            notify.error('Failed to delete meal structure');
        } finally {
            setDeleteSaving(false);
        }
    };

    // Table definition
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
                size: 45,
            },
            {
                id: 'code',
                accessorFn: (row) => row.code,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Structure Code"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-xs font-semibold text-gray-700 font-mono">
                        {row.original.code}
                    </span>
                ),
                size: 130,
            },
            {
                id: 'name',
                accessorFn: (row) => row.name,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Structure Name"
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
                id: 'mealType',
                accessorFn: (row) => row.mealTypeName,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Meal Type"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-xs text-gray-800 font-medium capitalize truncate">
                        {row.original.mealTypeName}
                    </span>
                ),
                size: 140,
            },
            {
                id: 'categorySlots',
                accessorFn: (row) => row.categorySlotsCount,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Category Slots"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-xs text-gray-700 font-medium">
                        {row.original.categorySlotsCount} Slots
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
                        className="text-[#43474F] font-semibold uppercase text-sm"
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
                        title="Actions"
                        column={column}
                        className="py-4 uppercase text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-3 px-2">
                        {canEdit && (
                            <Link to={`/proposal/meal-structure/edit-meal-structure/${row.original.id}`}>
                                <SquarePen
                                    size={18}
                                    className="text-gray-500 hover:text-blue-800 cursor-pointer transition"
                                />
                            </Link>
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
        data: structures, // Bind direct API response
        columns,
        state: { pagination, rowSelection, sorting },
        onPaginationChange: handlePaginationChange,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        enableRowSelection: true,
        manualPagination: true,
        rowCount: totalCount,
        pageCount: totalPages,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (canView === false) {
        return <AccessDenied pageTitle="Meal Structure Master" />;
    }

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                <PageHeader
                    title="Meal Structure Master"
                    description="Configure and manage meal structures, slot allocations, and effective dates."
                    actions={
                        <div className="flex items-center gap-3">
                            {canAdd && (
                                <HeaderActionButton
                                    to="/proposal/meal-structure/add-meal-structure"
                                    icon={Plus}
                                    label="Add Meal Structure"
                                />
                            )}
                        </div>
                    }
                />

                <PageErrorAlert
                    error={error}
                    onRetry={fetchStructures}
                    className="my-2"
                />

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <StatCard
                        label="Total Structures"
                        value={totalCount.toLocaleString()}
                        icon={<CalendarDays size={18} className="text-[#00376C]" />}
                        tone="bg-[#D5E3FF]"
                    />
                    <StatCard
                        label="Active Structures"
                        value={activeCount.toLocaleString()}
                        icon={<CheckCircle2 size={18} className="text-[#15803D]" />}
                        tone="bg-[#DCFCE7]"
                    />
                    <StatCard
                        label="Inactive Structures"
                        value={inactiveCount.toLocaleString()}
                        icon={<XCircle size={18} className="text-[#DC2626]" />}
                        tone="bg-[#FEE2E2]"
                    />
                </div>

                <div>
                    <div className="grid sm:grid-cols-4 grid-cols-1 gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 col-span-2">
                            <Search
                                size={15}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search meal structure..."
                                className="w-full h-10 pl-9 pr-3.5 text-xs rounded-xl border border-[#C3C6D1] bg-white placeholder:text-gray-400 focus:outline-none focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/15 transition"
                            />
                        </div>

                        {/* Meal Type Searchable Filter */}
                        <div className="flex items-center">
                            <SearchableSelect
                                name="mealType"
                                value={mealTypeFilter}
                                onChange={(e) => {
                                    const val = e?.target?.value ?? e?.value ?? 'All';
                                    setFilters((prev) => ({
                                        ...prev,
                                        mealType: val,
                                        page: 0,
                                    }));
                                }}
                                options={[
                                    { value: 'All', label: 'All Meal Types' },
                                    ...mealTypeOptions.map((t) => ({
                                        value: String(t.id),
                                        label: t.name || t.mealTypeName || `Meal Type #${t.id}`,
                                    })),
                                ]}
                                placeholder="Select Meal Type"
                                isClearable={false}
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center">
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
                                <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl bg-white text-xs text-gray-700">
                                    <span className="text-gray-500 mr-1">Status:</span>
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All</SelectItem>
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
                            Loading meal structures...
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

                {/* Modals */}
                <StatusConfirmModal
                    isOpen={showStatusConfirm}
                    onClose={closeStatusConfirm}
                    onConfirm={confirmStatusChange}
                    itemLabel={statusTarget?.itemLabel}
                    nextStatusLabel={statusTarget?.nextStatusLabel}
                    saving={statusSaving}
                />

                <DeleteConfirmModal
                    isOpen={showDeleteConfirm}
                    onClose={closeDeleteConfirm}
                    onConfirm={confirmDelete}
                    itemLabel={deleteTarget?.itemLabel}
                    saving={deleteSaving}
                />

                <MasterExportModal
                    isOpen={showExportModal}
                    onClose={() => setShowExportModal(false)}
                    tableName="m_meal_structure"
                    title="Export Meal Structure Report"
                />
            </div>
        </Container>
    );
};

export default MealStructureListing;