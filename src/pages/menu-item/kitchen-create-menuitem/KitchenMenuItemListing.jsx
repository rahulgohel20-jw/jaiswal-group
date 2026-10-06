import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import { notify } from '@/utils/toast';
import {
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    CheckCircle2,
    Package,
    SquarePen,
    Trash2,
    XCircle,
    RotateCcw,
    Plus,
    Loader2,
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
import { SearchBar } from '@/components/common/SearchBar';
import {
    deleteKitchenMenuItemById,
    getAllKitchenMenuCategory,
    getAllKitchenMenuItem,
    updateKitchenMenuItemStatus,
} from '../../../services/apiServices';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '../../../utils/SearchableSelect';
import { useModuleState } from '../../../hooks/useModuleState';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';

const StatCard = ({ label, value, icon, tone, textColor = 'text-[#1B1B1F]' }) => (
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

// Child routes where returning must preserve all filters and search state
const CHILD_ROUTES = [
    '/menu-item/add-menu-items',
    '/menu-item/edit-menu-item',
];

const KitchenMenuItemListing = () => {
    const navigate = useNavigate();

    const [filters, setFilters, resetFilters] = useModuleState(
        'KITCHEN_MENU_ITEMS',
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

    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Menu Items');

    // Temporary UI / Server states
    const [rowSelection, setRowSelection] = useState({});
    const [loading, setLoading] = useState(false);
    const [menuItems, setMenuItems] = useState([]);
    const [error, setError] = useState(null);
    const [categoryOptions, setCategoryOptions] = useState([]);

    // Debounced search input synchronized with persistent filter state
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

    // Modals
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [statusSaving, setStatusSaving] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

    // Stable pagination object for TanStack Table
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

    // Load Categories for dropdown
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await getAllKitchenMenuCategory();

                const data =
                    res?.data?.data?.['Menu Category Details'] ||
                    res?.data?.data ||
                    [];

                const activeCategories = Array.isArray(data)
                    ? data.filter((item) => item?.isActive === true)
                    : [];

                setCategoryOptions(activeCategories);
            } catch (err) {
                console.error('Failed to load categories:', err);
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
                .filter((category) => category?.nameEnglish)
                .map((category) => ({
                    value: String(category.id),
                    label: category.nameEnglish,
                })),
        ],
        [categoryOptions]
    );

    const fetchMenuItems = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = {
                page: pageIndex + 1,
                size: pageSize,
            };

            if (search.trim()) {
                params.itemName = search.trim();
            }

            if (categoryFilter) {
                params.menuCatId = Number(categoryFilter);
            }

            const res = await getAllKitchenMenuItem(params);
            const payload = res?.data?.data ?? res?.data ?? {};
            const rawList = Array.isArray(payload.items) ? payload.items : [];

            const list = rawList.map((item) => ({
                id: item.id,
                image:
                    item.files
                        ?.filter(
                            (file) =>
                                (file?.moduleName === 'KITCHENMENUITEM' ||
                                    file?.moduleName === 'MENUITEM') &&
                                file?.path,
                        )
                        ?.at(-1)?.path || '',
                name: item.nameEnglish || item.name || '-',
                orgId: item.orgId ?? '-',
                category:
                    item.menuCategory?.nameEnglish ||
                    item.menuCategoryName ||
                    '-',
                categoryId: item.menuCategory?.id ?? null,
                subCategory:
                    item.menuSubCategory?.nameEnglish ||
                    item.menuSubCategoryName ||
                    '-',
                price: item.price ?? item.dishCosting ?? 0,
                sequence: item.sequence ?? '-',
                status: item.isActive ? 'Active' : 'Inactive',
                raw: item,
            }));

            const total = payload.total ?? 0;
            const active = payload.activeCount ?? 0;
            const inactive = payload.inactiveCount ?? Math.max(0, total - active);

            setMenuItems(list);
            setTotalCount(total);
            setActiveCount(active);
            setInactiveCount(inactive);
        } catch (err) {
            console.error('Failed to load kitchen menu items:', err);
            setMenuItems([]);
            setError('Failed to load kitchen menu items');
        } finally {
            setLoading(false);
        }
    }, [pageIndex, pageSize, search, categoryFilter]);

    useEffect(() => {
        fetchMenuItems();
    }, [fetchMenuItems]);

    // Client-side status slice
    const displayedItems = useMemo(() => {
        if (statusFilter === 'All Status') return menuItems;
        return menuItems.filter((item) => item.status === statusFilter);
    }, [menuItems, statusFilter]);

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
            await updateKitchenMenuItemStatus(statusTarget.id, statusTarget.nextStatus);
            closeStatusConfirm();
            fetchMenuItems();
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
            await deleteKitchenMenuItemById(deleteTarget.id);
            closeDeleteConfirm();
            fetchMenuItems();
        } catch (err) {
            console.error(err);
            notify.error('Failed to delete kitchen menu item');
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
                        className="py-6 text-xs uppercase text-[#43474F] font-semibold "
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-gray-500 py-2">
                        {String(pageIndex * pageSize + row.index + 1).padStart(2, '0')}
                    </span>
                ),
                enableSorting: false,
                size: 35,
            },
            {
                id: 'image',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Image"
                        column={column}
                        className="py-4 text-xs uppercase text-[#43474F] font-semibold "
                    />
                ),
                cell: ({ row }) => (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center shrink-0 mx-2">
                        {row.original.image ? (
                            <img
                                src={row.original.image}
                                alt={row.original.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Package size={16} className="text-gray-300" />
                        )}
                    </div>
                ),
                enableSorting: false,
                size: 55,
            },
            {
                id: 'name',
                accessorFn: (row) => row.name,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Item Name"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <div className="block px-2 font-semibold text-gray-800 capitalize truncate max-w-50">
                        {row.original.name}
                    </div>
                ),
                size: 160,
            },
            {
                id: 'category',
                accessorFn: (row) => row.category,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Category"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-gray-700 capitalize truncate">
                        {row.original.category}
                    </span>
                ),
                size: 130,
            },
            {
                id: 'price',
                accessorFn: (row) => row.price,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Price"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-gray-700 font-medium">
                        ₹{Number(row.original.price ?? 0).toFixed(2)}
                    </span>
                ),
                size: 100,
            },
            {
                id: 'sequence',
                accessorFn: (row) => row.sequence,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Seq."
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-gray-700">
                        {row.original.sequence}
                    </span>
                ),
                size: 80,
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
                size: 110,
            },
            {
                id: 'actions',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Actions"
                        column={column}
                        className="py-4 uppercase text-[#43474F] font-semibold "
                    />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-3 px-2">
                        {canEdit && (
                            <Link
                                to={`/menu-item/edit-menu-item/${row.original.id}`}
                            >
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
                size: 120,
            },
        ],
        [pageIndex, pageSize, canEdit, canDelete]
    );

    const table = useReactTable({
        data: displayedItems,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: handlePaginationChange,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        manualPagination: true,
        rowCount: totalCount,
        pageCount: Math.ceil(totalCount / pageSize),
        getCoreRowModel: getCoreRowModel(),
    });

    if (canView === false) {
        return <AccessDenied pageTitle="Menu Items" />;
    }

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                <PageHeader
                    title="Menu Items Master"
                    description="Configure and manage kitchen menu items, pricing, categories, and item availability."
                    actions={
                        canAdd && (
                            <HeaderActionButton
                                to="/menu-item/add-menu-items"
                                icon={Plus}
                                label="Add New Item"
                            />
                        )
                    }
                />

                <PageErrorAlert
                    error={error}
                    onRetry={fetchMenuItems}
                    className="my-2"
                />

                {/* Global Recipe Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <StatCard
                        label="Total Recipes"
                        value={totalCount.toLocaleString()}
                        icon={<Package size={18} className="text-[#00376C]" />}
                        tone="bg-[#D5E3FF]"
                    />
                    <StatCard
                        label="Active Recipes"
                        value={activeCount.toLocaleString()}
                        icon={<CheckCircle2 size={18} className="text-[#15803D]" />}
                        tone="bg-[#DCFCE7]"
                        textColor="text-[#15803D]"
                    />
                    <StatCard
                        label="Inactive Recipes"
                        value={inactiveCount.toLocaleString()}
                        icon={<XCircle size={18} className="text-[#DC2626]" />}
                        tone="bg-[#FEE2E2]"
                        textColor="text-[#DC2626]"
                    />
                </div>

                {/* Standardized SearchBar & Server Filter Controls */}
                <div className="bg-white mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-5">
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
                                placeholder="Search by item name..."
                            />
                        </div>

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

                        <div className="md:col-span-3">
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
                        </div>

                        <div className="md:col-span-1 flex items-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchInput('');
                                    resetFilters();
                                }}
                                title="Reset Filters"
                                className="w-full h-10 flex items-center justify-center gap-1 border border-[#C3C6D1] rounded-xl text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                            >
                                <RotateCcw size={15} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* DataGrid Table */}
                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading Menu items...
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
            </div>
        </Container>
    );
};

export default KitchenMenuItemListing;