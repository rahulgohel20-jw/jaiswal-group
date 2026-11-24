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
    SquarePen,
    Trash2,
    XCircle,
    Plus,
    Loader2,
    CalendarClock,
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
import {
    deleteMealSlot,
    getAllMealSlots,
    saveOrUpdateMealSlot,
    getAllKitchenMenuCategory,
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
import MealSlotModal from './MealSlotModal';

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
    status: 'All Status',
    categoryId: '',
    page: 0,
    pageSize: 10,
};

import { getOrgIdFromToken } from '@/utils/auth';
import { getAuth } from '@/auth/lib/helpers';

const getLoggedInOrgId = () => {
    const tokenOrgId = getOrgIdFromToken();
    if (tokenOrgId && !isNaN(Number(tokenOrgId)) && Number(tokenOrgId) > 0) {
        return Number(tokenOrgId);
    }
    const storedAuth = getAuth();
    const authOrg = storedAuth?.organizationId || storedAuth?.data?.organizationId || storedAuth?.accessibleScope?.assignments?.[0]?.organizationId;
    if (authOrg && !isNaN(Number(authOrg)) && Number(authOrg) > 0) {
        return Number(authOrg);
    }
    const local = localStorage.getItem('organizationId') || localStorage.getItem('selectedCompanyId');
    if (local && !isNaN(Number(local)) && Number(local) > 0) {
        return Number(local);
    }
    return 18;
};

const CHILD_ROUTES = [];

const MealSlotListing = () => {
    const currentOrgId = getLoggedInOrgId();

    const [filters, setFilters, resetFilters] = useModuleState(
        'MEAL_SLOT_MASTER',
        INITIAL_FILTERS,
        CHILD_ROUTES
    );

    const {
        search,
        status: statusFilter,
        categoryId: categoryFilter,
        page: pageIndex,
        pageSize,
    } = filters;

    const { canAdd, canEdit, canDelete, canView, canExport } = usePagePermissions([
        'Meal Slot Master',
        'Meal Slot',
        'Meal Slots',
    ]);

    // UI & Data State
    const [rowSelection, setRowSelection] = useState({});
    const [sorting, setSorting] = useState([]);
    const [loading, setLoading] = useState(false);
    const [mealSlots, setMealSlots] = useState([]);
    const [error, setError] = useState(null);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [showExportModal, setShowExportModal] = useState(false);

    // Modal state for Add/Edit
    const [showSlotModal, setShowSlotModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);

    // Debounced Search Input
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

    // Confirmation Modals
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [statusSaving, setStatusSaving] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

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

    // Load Kitchen Menu Categories for filter dropdown
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await getAllKitchenMenuCategory();
                const data =
                    res?.data?.data?.['Menu Category Details'] ||
                    res?.data?.data ||
                    res?.data ||
                    [];

                const activeCategories = Array.isArray(data)
                    ? data.filter((item) => item?.isActive !== false)
                    : [];

                setCategoryOptions(activeCategories);
            } catch (err) {
                console.error('Failed to load menu categories:', err);
                setCategoryOptions([]);
            }
        };

        fetchCategories();
    }, []);

    const categorySelectOptions = useMemo(
        () => [
            {
                value: '',
                label: 'All Categories',
            },
            ...categoryOptions
                .filter((cat) => cat?.nameEnglish || cat?.name)
                .map((cat) => ({
                    value: String(cat.id),
                    label: cat.nameEnglish || cat.name,
                })),
        ],
        [categoryOptions]
    );

    // Fetch Meal Slots
    const fetchSlots = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await getAllMealSlots(currentOrgId, search.trim());
            const payload = res?.data?.data ?? res?.data ?? [];
            const rawList = Array.isArray(payload) ? payload : (payload.items || []);

            const list = rawList.map((item) => ({
                id: item.id,
                name: item.name || item.slotName || '-',
                kitchenMenuCategoryId:
                    item.kitchenMenuCategoryId ||
                    item.menuCategoryId ||
                    item.categoryId ||
                    null,
                categoryName:
                    item.kitchenMenuCategory?.nameEnglish ||
                    item.kitchenMenuCategory?.name ||
                    item.menuCategory?.nameEnglish ||
                    item.categoryName ||
                    item.kitchenCategoryName ||
                    '-',
                sequence: item.sequence ?? '-',
                status: item.isActive !== false ? 'Active' : 'Inactive',
                raw: item,
            }));

            // Filter by Kitchen Category
            const filteredList = categoryFilter
                ? list.filter(
                      (item) => String(item.kitchenMenuCategoryId) === String(categoryFilter)
                  )
                : list;

            setMealSlots(filteredList);
            setTotalCount(filteredList.length);
            setActiveCount(filteredList.filter((i) => i.status === 'Active').length);
            setInactiveCount(filteredList.filter((i) => i.status === 'Inactive').length);
        } catch (err) {
            console.error('Failed to load meal slots:', err);
            setMealSlots([]);
            setError('Failed to load meal slots');
        } finally {
            setLoading(false);
        }
    }, [currentOrgId, search, categoryFilter]);

    useEffect(() => {
        fetchSlots();
    }, [fetchSlots]);

    // Client-side status slice
    const displayedItems = useMemo(() => {
        let result = mealSlots;
        if (statusFilter !== 'All Status') {
            result = result.filter((item) => item.status === statusFilter);
        }
        const start = pageIndex * pageSize;
        return result.slice(start, start + pageSize);
    }, [mealSlots, statusFilter, pageIndex, pageSize]);

    // Status change handler
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
                id: statusTarget.id,
                kitchenMenuCategoryId:
                    statusTarget.raw?.kitchenMenuCategoryId ||
                    statusTarget.raw?.menuCategoryId ||
                    statusTarget.raw?.categoryId ||
                    0,
                name: statusTarget.raw?.name || statusTarget.raw?.slotName || '',
                sequence: statusTarget.raw?.sequence ?? 0,
                isActive: statusTarget.nextStatus,
                organizationId: Number(statusTarget.raw?.organizationId || currentOrgId),
            };
            await saveOrUpdateMealSlot(updatePayload);
            closeStatusConfirm();
            fetchSlots();
        } catch (err) {
            console.error(err);
            notify.error('Failed to update slot status');
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
            await deleteMealSlot(deleteTarget.id);
            closeDeleteConfirm();
            fetchSlots();
        } catch (err) {
            console.error(err);
            notify.error('Failed to delete meal slot');
        } finally {
            setDeleteSaving(false);
        }
    };

    // Table columns definition
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
                        title="Meal Slot Name"
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
            // {
            //     id: 'category',
            //     accessorFn: (row) => row.categoryName,
            //     header: ({ column }) => (
            //         <DataGridColumnHeader
            //             title="Menu Category"
            //             column={column}
            //             className="text-[#43474F] font-semibold uppercase text-xs"
            //         />
            //     ),
            //     cell: ({ row }) => (
            //         <span className="block px-2 text-xs text-gray-700 font-medium capitalize truncate">
            //             {row.original.categoryName}
            //         </span>
            //     ),
            //     size: 200,
            // },
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
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedSlot(row.original);
                                    setShowSlotModal(true);
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
        return <AccessDenied pageTitle="Meal Slot Master" />;
    }

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                <PageHeader
                    title="Meal Slot Master"
                    description="Configure and manage meal slots mapped to kitchen menu categories."
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
                                        setSelectedSlot(null);
                                        setShowSlotModal(true);
                                    }}
                                    icon={Plus}
                                    label="Add Meal Slot"
                                />
                            )}
                        </div>
                    }
                />

                <PageErrorAlert
                    error={error}
                    onRetry={fetchSlots}
                    className="my-2"
                />

                {/* Counters */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <StatCard
                        label="Total Slots"
                        value={totalCount.toLocaleString()}
                        icon={<CalendarClock size={18} className="text-[#00376C]" />}
                        tone="bg-[#D5E3FF]"
                    />
                    <StatCard
                        label="Active Slots"
                        value={activeCount.toLocaleString()}
                        icon={<CheckCircle2 size={18} className="text-[#15803D]" />}
                        tone="bg-[#DCFCE7]"
                    />
                    <StatCard
                        label="Inactive Slots"
                        value={inactiveCount.toLocaleString()}
                        icon={<XCircle size={18} className="text-[#DC2626]" />}
                        tone="bg-[#FEE2E2]"
                    />
                </div>

                {/* Filters */}
                <div className="bg-white mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
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
                                placeholder="Search by slot name..."
                            />
                        </div>

                        <div className="md:col-span-6">
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

                        {/* <div className="md:col-span-3">
                            <SearchableSelect
                                name="categoryFilter"
                                value={categoryFilter}
                                onChange={(e) => {
                                    const val = e?.target?.value ?? e?.value ?? '';
                                    setFilters((prev) => ({
                                        ...prev,
                                        categoryId: val,
                                        page: 0,
                                    }));
                                }}
                                options={categorySelectOptions}
                                placeholder="All Categories"
                                isClearable={true}
                            />
                        </div> */}
                    </div>
                </div>

                {/* DataGrid Table */}
                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading Meal Slots...
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
                <MealSlotModal
                    isOpen={showSlotModal}
                    onClose={() => {
                        setShowSlotModal(false);
                        setSelectedSlot(null);
                    }}
                    initialData={selectedSlot}
                    onSuccess={fetchSlots}
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

                {/* Master Export Modal */}
                {/* <MasterExportModal
                    isOpen={showExportModal}
                    onClose={() => setShowExportModal(false)}
                    tableName="m_meal_slot"
                    title="Export Meal Slot Report"
                /> */}
            </div>
        </Container>
    );
};

export default MealSlotListing;