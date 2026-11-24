import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, Loader2, UtensilsCrossed, SquarePen } from 'lucide-react';
import {
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { SearchBar } from '@/components/common/SearchBar';
import SearchableSelect from '@/utils/SearchableSelect';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { notify } from '@/utils/toast';
import { useOrgScope } from '@/hooks/useOrgScope';
import {
    getConsumptionConfigList,
    deleteConsumptionConfigById,
    getAllKitchenMenuItem,
} from '@/services/apiServices';
import { AccessDenied } from '@/components/common/AccessDenied';
import { usePagePermissions } from '@/utils/permissions';
import { getOrgIdFromToken } from '@/utils/auth';

const PAGE_SIZE = 10;

const MenuItemConsumption = () => {
    const navigate = useNavigate();
    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Menu Item Consumption');
    const {
        loading: scopeLoading,
        error: scopeError,
        isOutletUser,
        isCompanyUser,
        units,
        effectiveOutletId,
        selfOrg,
        retry: retryScope,
    } = useOrgScope();

    // Filters
    const [selectedOutlet, setSelectedOutlet] = useState('');
    const [selectedMenuItem, setSelectedMenuItem] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    // Catalogs & Data
    const [menuItems, setMenuItems] = useState([]);
    const [consumptions, setConsumptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Delete Modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Table state
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
    const [sorting, setSorting] = useState([]);

    const outletOptions = useMemo(() => {
        return (units || [])
            .filter((u) => u?.id != null && String(u.id).toUpperCase() !== 'ALL')
            .map((u) => ({
                value: String(u.id),
                label: `${u.name}`,
            }));
    }, [units]);

    // Outlet Synchronization
    useEffect(() => {
        if (scopeLoading) return;

        if (isOutletUser && effectiveOutletId) {
            setSelectedOutlet(String(effectiveOutletId));
        } else if (isCompanyUser && !selectedOutlet && outletOptions.length > 0) {
            const defaultId = effectiveOutletId || selfOrg?.id || outletOptions[0]?.value;
            const match = outletOptions.find((o) => String(o.value) === String(defaultId));
            if (match) {
                setSelectedOutlet(String(match.value));
            }
        }
    }, [scopeLoading, isOutletUser, isCompanyUser, effectiveOutletId, selfOrg, outletOptions, selectedOutlet]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim());
            setPagination((p) => ({ ...p, pageIndex: 0 }));
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Load Menu Items for dropdown
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await getAllKitchenMenuItem({ page: 1, size: 2000, isAsc: true });
                const payload = res?.data?.data ?? res?.data ?? {};
                const list = Array.isArray(payload.items) ? payload.items : Array.isArray(payload) ? payload : [];
                if (active) {
                    setMenuItems(list.filter((m) => m.isActive !== false));
                }
            } catch (err) {
                console.error('Failed to load menu items:', err);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    const menuItemOptions = useMemo(() => {
        return menuItems.map((item) => ({
            value: String(item.id),
            label: item.nameEnglish || item.name || `Item #${item.id}`,
        }));
    }, [menuItems]);

    const fetchConfigs = useCallback(async () => {
    // 1. Resolve Org ID in priority order: Selected Outlet -> Effective Outlet -> Self Org -> Token Org ID
    const targetOrgId =
        selectedOutlet ||
        (isOutletUser && effectiveOutletId ? String(effectiveOutletId) : '') ||
        (selfOrg?.id ? String(selfOrg.id) : '') ||
        (getOrgIdFromToken() ? String(getOrgIdFromToken()) : '');

    // If targetOrgId exists, pass it; otherwise call without it or with company ID
    const params = targetOrgId ? { organizationId: Number(targetOrgId) } : {};

    setLoading(true);
    setError(null);

    try {
        const res = await getConsumptionConfigList(params);
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        setConsumptions(list);
    } catch (err) {
        console.error('Failed to load consumption configs:', err);
        setError(err?.response?.data?.message || err?.message || 'Failed to load consumption configs');
        setConsumptions([]);
    } finally {
        setLoading(false);
    }
}, [selectedOutlet, isOutletUser, effectiveOutletId, selfOrg]);

    // Auto-fetch on scope resolution and selection changes
    useEffect(() => {
        if (!scopeLoading && !scopeError) {
            fetchConfigs();
        }
    }, [selectedOutlet, scopeLoading, scopeError, fetchConfigs]);

    // Filter table records
    // Filter table records
const filteredRecords = useMemo(() => {
    let rows = consumptions;

    // Filter by outlet if selected
    if (selectedOutlet) {
        rows = rows.filter((r) => String(r.organizationId) === String(selectedOutlet));
    }

    if (selectedMenuItem) {
        rows = rows.filter((r) => String(r.kitchenMenuItemId) === String(selectedMenuItem));
    }

    if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(
            (r) =>
                r.kitchenMenuItemNameEnglish?.toLowerCase().includes(q) ||
                r.organizationName?.toLowerCase().includes(q) ||
                r.kitchenMenuCategoryNameEnglish?.toLowerCase().includes(q)
        );
    }

    return rows;
}, [consumptions, selectedOutlet, selectedMenuItem, search]);

    const handleDelete = async () => {
        if (!deleteTarget?.id) return;
        setDeleting(true);
        try {
            await deleteConsumptionConfigById(deleteTarget.id);
            setDeleteModalOpen(false);
            setDeleteTarget(null);
            fetchConfigs();
        } catch (err) {
            console.error('Failed to delete consumption config:', err);
            notify.error(err?.response?.data?.message || err?.message || 'Failed to delete config');
        } finally {
            setDeleting(false);
        }
    };

    const columns = useMemo(
        () => [
            {
                id: 'sno',
                header: ({ column }) => (
                    <DataGridColumnHeader title="S.NO" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-500 py-2 text-xs">
                        {String(pagination.pageIndex * pagination.pageSize + row.index + 1).padStart(2, '0')}
                    </span>
                ),
                enableSorting: false,
                size: 50,
            },
            {
                id: 'menuItem',
                accessorFn: (row) => row.kitchenMenuItemNameEnglish || '',
                sortingFn: (rowA, rowB) => {
                    const a = String(rowA.original.kitchenMenuItemNameEnglish || '').toLowerCase();
                    const b = String(rowB.original.kitchenMenuItemNameEnglish || '').toLowerCase();
                    return a.localeCompare(b);
                },
                header: ({ column }) => (
                    <DataGridColumnHeader title="MENU ITEM" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => (
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-xs text-[#0F172A] truncate" title={row.original.kitchenMenuItemNameEnglish}>
                            {row.original.kitchenMenuItemNameEnglish || '—'}
                        </span>
                        {row.original.kitchenMenuCategoryNameEnglish && (
                            <span className="text-[10px] text-gray-400">
                                {row.original.kitchenMenuCategoryNameEnglish}
                            </span>
                        )}
                    </div>
                ),
                size: 240,
                enableSorting: true,
            },
            {
                id: 'outlet',
                accessorFn: (row) => row.organizationName || '',
                sortingFn: (rowA, rowB) => {
                    const a = String(rowA.original.organizationName || '').toLowerCase();
                    const b = String(rowB.original.organizationName || '').toLowerCase();
                    return a.localeCompare(b);
                },
                header: ({ column }) => (
                    <DataGridColumnHeader title="UNIT" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700 text-xs block truncate" title={row.original.organizationName}>
                        {row.original.organizationName || '—'}
                    </span>
                ),
                size: 190,
                enableSorting: true,
            },
            {
                id: 'quantity',
                accessorFn: (row) => Number(row.quantity ?? 0),
                sortingFn: (rowA, rowB) => {
                    const a = Number(rowA.original.quantity ?? 0);
                    const b = Number(rowB.original.quantity ?? 0);
                    return a - b;
                },
                header: ({ column }) => (
                    <DataGridColumnHeader title="QTY" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => (
                    <span className="font-semibold text-xs text-gray-900 font-mono">
                        {row.original.quantity ?? '0'}
                    </span>
                ),
                size: 90,
                enableSorting: true,
            },
            {
                id: 'unit',
                accessorFn: (row) => row.unitNameEnglish || row.unitSymbolEnglish || '',
                sortingFn: (rowA, rowB) => {
                    const a = String(rowA.original.unitNameEnglish || rowA.original.unitSymbolEnglish || '').toLowerCase();
                    const b = String(rowB.original.unitNameEnglish || rowB.original.unitSymbolEnglish || '').toLowerCase();
                    return a.localeCompare(b);
                },
                header: ({ column }) => (
                    <DataGridColumnHeader title="UNIT OF MEASURE" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-600 text-xs whitespace-nowrap">
                        {row.original.unitNameEnglish || row.original.unitSymbolEnglish || '—'}
                    </span>
                ),
                size: 110,
                enableSorting: true,
            },
            ...(canEdit || canDelete
                ? [
                    {
                        id: 'actions',
                        header: ({ column }) => (
                            <DataGridColumnHeader title="ACTION" column={column} className="text-xs font-bold" />
                        ),
                        cell: ({ row }) => (
                            <div className="flex items-center gap-2">
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/menu-item/consumption/edit/${row.original.id}`)}
                                        className="p-1 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                        title="Edit Configuration"
                                    >
                                        <SquarePen size={16} />
                                    </button>
                                )}

                                {canDelete && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDeleteTarget(row.original);
                                            setDeleteModalOpen(true);
                                        }}
                                        className="p-1 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                        title="Delete Configuration"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ),
                        enableSorting: false,
                        size: 80,
                    },
                ]
                : []),
        ],
        [navigate, canEdit, canDelete]
    );

    const table = useReactTable({
        data: filteredRecords,
        columns,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (canView === false) {
        return <AccessDenied pageTitle="Menu Item Consumption" />;
    }
    return (
        <Container>
            <div className="pt-2 pb-6 space-y-4">
                <PageHeader
                    title="Menu Item Per-Person Consumption"
                    description="Configure and manage per-person standard consumption for kitchen menu items."
                    actions={
                        canAdd && (
                            <HeaderActionButton
                                to="/menu-item/consumption/create"
                                icon={Plus}
                                label="Add Consumption"
                            />
                        )
                    }
                />

                <PageErrorAlert
                    error={scopeError || error}
                    onRetry={scopeError ? retryScope : fetchConfigs}
                />

                {/* Filter Bar */}
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                        <div className={isOutletUser ? 'md:col-span-8' : 'md:col-span-6'}>
                            <SearchBar
                                isStandalone={false}
                                placeholder="Search by menu item or category..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onClear={() => setSearchInput('')}
                                wrapperClassName="w-full"
                            />
                        </div>

                        {!isOutletUser && (
                            <div className="md:col-span-3">
                                <SearchableSelect
                                    name="outlet"
                                    value={selectedOutlet ? String(selectedOutlet) : ''}
                                    onChange={(e) => {
                                        const val = e?.target?.value ?? e?.value ?? '';
                                        setSelectedOutlet(val ? String(val) : '');
                                        setPagination((p) => ({ ...p, pageIndex: 0 }));
                                    }}
                                    options={outletOptions}
                                    isClearable={true}
                                    clearable={true}
                                    placeholder={
                                        isCompanyUser
                                            ? `Select Unit (${selfOrg?.name || 'Company'})`
                                            : 'Select Unit'
                                    }
                                />
                            </div>
                        )}

                        <div className={isOutletUser ? 'md:col-span-4' : 'md:col-span-3'}>
                            <SearchableSelect
                                name="menuItem"
                                value={selectedMenuItem ? String(selectedMenuItem) : ''}
                                onChange={(e) => {
                                    const val = e?.target?.value ?? e?.value ?? '';
                                    setSelectedMenuItem(val ? String(val) : '');
                                    setPagination((p) => ({ ...p, pageIndex: 0 }));
                                }}
                                options={menuItemOptions}
                                isClearable={true}
                                clearable={true}
                                placeholder="All Menu Items"
                            />
                        </div>
                    </div>
                </div>

                {/* Table Card */}
                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden shadow-xs">
                    {loading || scopeLoading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Loader2 size={18} className="animate-spin text-[#084E92]" />
                            Loading consumption configs…
                        </div>
                    ) : (
                        <DataGrid
                            table={table}
                            recordCount={filteredRecords.length}
                            className="rounded-2xl"
                            tableLayout={{
                                dense: true,
                                width: 'fixed',
                                cellBorder: true,
                                headerBorder: true,
                                rowBorder: true,
                            }}
                        >
                            <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none">
                                <CardTable className="w-full overflow-x-auto">
                                    <ScrollArea>
                                        <DataGridTable />
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>
                                </CardTable>
                                <CardFooter className="bg-[#F9FAFC] rounded-b-2xl border-t border-[#E7EAF0] py-2.5">
                                    <DataGridPagination />
                                </CardFooter>
                            </Card>
                        </DataGrid>
                    )}
                </div>

                <DeleteConfirmModal
                    isOpen={deleteModalOpen}
                    onClose={() => {
                        setDeleteModalOpen(false);
                        setDeleteTarget(null);
                    }}
                    onConfirm={handleDelete}
                    itemLabel={deleteTarget?.kitchenMenuItemNameEnglish}
                    saving={deleting}
                />
            </div>
        </Container>
    );
};

export default MenuItemConsumption;