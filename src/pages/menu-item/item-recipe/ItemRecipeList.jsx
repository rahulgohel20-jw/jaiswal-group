import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { notify } from '@/utils/toast';
import {
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Eye,
    SquarePen,
    Trash2,
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
import SearchableSelect from '../../../utils/SearchableSelect';
import {
    getKitchenMenuItemRecipe,
    deleteKitchenMenuItemRecipe,
} from '../../../services/apiServices';
import { useModuleState } from '../../../hooks/useModuleState';
import { usePagePermissions } from '@/utils/permissions';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getOrgIdFromToken } from '@/utils/auth';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';

const FILTER_DEFAULTS = {
    search: '',
    outletId: '',
    page: 0,
    pageSize: 10,
};

const CHILD_ROUTES = [
    '/menu-item/create-recipe',
    '/menu-item/update-recipe',
    '/menu-item/view-recipe',
];

const ItemRecipeList = () => {
    const navigate = useNavigate();

    const {
        loading: scopeLoading,
        error: scopeError,
        isCompanyUser,
        isOutletUser,
        units,
        effectiveOutletId,
        selfOrg,
        retry: retryScope,
    } = useOrgScope();

    const [filters, setFilters, resetFilters] = useModuleState(
        'ITEM_RECIPE_LIST',
        FILTER_DEFAULTS,
        CHILD_ROUTES
    );

    const {
        search,
        outletId: outletFilter,
        page: pageIndex,
        pageSize,
    } = filters;

    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Item Recipe');

    // UI & Server states
    const [rowSelection, setRowSelection] = useState({});
    const [loading, setLoading] = useState(false);
    const [recipes, setRecipes] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState(null);

    // Debounced search state
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

    // Outlet name mapping for lookup
    const outletNameMap = useMemo(() => {
        const map = new Map();
        if (selfOrg?.id != null) {
            map.set(
                Number(selfOrg.id),
                selfOrg.companyNameEnglish || selfOrg.organizationName || 'Company Main'
            );
        }
        if (Array.isArray(units)) {
            units.forEach((u) => {
                if (u?.id != null) {
                    map.set(Number(u.id), u.name);
                }
            });
        }
        return map;
    }, [units, selfOrg]);

    // Outlet filter dropdown options
    const outletFilterOptions = useMemo(() => {
        if (!Array.isArray(units)) return [];
        return units
            .filter((u) => u?.id != null && String(u.id).toUpperCase() !== 'ALL')
            .map((u) => ({
                value: String(u.id),
                label: u.name,
            }));
    }, [units]);

    // Delete Modal states
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

    const fetchRecipes = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const apiParams = {};

            if (outletFilter && Number.isFinite(Number(outletFilter))) {
                apiParams.orgId = Number(outletFilter);
            } else if (isOutletUser && effectiveOutletId) {
                apiParams.orgId = Number(effectiveOutletId);
            } else {
                const fallbackOrgId =
                    selfOrg?.id ??
                    effectiveOutletId ??
                    getOrgIdFromToken();

                if (fallbackOrgId) {
                    apiParams.orgId = Number(fallbackOrgId);
                }
            }

            const res = await getKitchenMenuItemRecipe(apiParams);
            const payload = res?.data?.data ?? res?.data ?? {};
            const headers = Array.isArray(payload.headers) ? payload.headers : [];

            // Filter by outlet ONLY if an outlet is explicitly chosen in the dropdown
            let filteredHeaders = headers.filter((h) => {
                if (outletFilter && Number.isFinite(Number(outletFilter))) {
                    return Number(h.orgId) === Number(outletFilter);
                }
                return true;
            });

            // Map recipe header rows
            let mapped = filteredHeaders.map((header) => {
                const resolvedOutlet =
                    header.orgName ||
                    (header.orgId ? outletNameMap.get(Number(header.orgId)) : null) ||
                    '-';

                return {
                    id: header.id,
                    recipeHeaderId: header.id,
                    menuItemId: header.menuItemId,
                    menuItem: header.menuItemName || `Item #${header.menuItemId}`,
                    outlet: resolvedOutlet,
                    weight: header.weight ?? 0,
                    unit: header.unitName || '-',
                    orgId: header.orgId,
                    subOutletId: header.subOutletId ?? null,
                    raw: header,
                };
            });

            // Search filter
            if (search.trim()) {
                const query = search.trim().toLowerCase();
                mapped = mapped.filter((item) =>
                    item.menuItem.toLowerCase().includes(query) ||
                    item.outlet.toLowerCase().includes(query)
                );
            }

            setTotalCount(mapped.length);

            const start = pageIndex * pageSize;
            const end = start + pageSize;
            setRecipes(mapped.slice(start, end));
        } catch (err) {
            console.error('Failed to load item recipes:', err);
            setRecipes([]);
            setError('Failed to load item recipes');
        } finally {
            setLoading(false);
        }
    }, [
        pageIndex,
        pageSize,
        search,
        isOutletUser,
        effectiveOutletId,
        outletFilter,
        selfOrg,
        outletNameMap,
    ]);
    useEffect(() => {
        if (!scopeLoading) {
            fetchRecipes();
        }
    }, [fetchRecipes, scopeLoading]);

    // Delete handlers: track menuItemId and orgId
    const openDeleteConfirm = (item) => {
        setDeleteTarget({
            menuItemId: item.menuItemId,
            orgId: item.orgId,
            subOutletId: item.subOutletId,
            itemLabel: item.menuItem,
        });
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        if (deleteSaving) return;
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    };

    // Execute delete API with menuItemId and orgId
    const confirmDelete = async () => {
        if (!deleteTarget?.menuItemId || !deleteTarget?.orgId) {
            notify.error('Missing Menu Item ID or Outlet ID to delete recipe');
            return;
        }

        setDeleteSaving(true);
        try {
            await deleteKitchenMenuItemRecipe({
                menuItemId: deleteTarget.menuItemId,
                orgId: deleteTarget.orgId,
                subOutletId: deleteTarget.subOutletId,
            });

            closeDeleteConfirm();
            fetchRecipes();
        } catch (err) {
            console.error('Delete failed:', err?.response?.data ?? err);
            notify.error(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to delete recipe');
        } finally {
            setDeleteSaving(false);
        }
    };

    // Columns: S.NO, Menu Item, Outlet, Weight, Unit, Actions
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
                    <span className="block px-2 text-gray-500">
                        {String(pageIndex * pageSize + row.index + 1).padStart(2, '0')}
                    </span>
                ),
                enableSorting: false,
                size: 35,
            },
            {
                id: 'menuItem',
                accessorFn: (row) => row.menuItem,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Menu Item"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-2 px-2 py-0.5">
                        <span className="font-semibold text-gray-800 capitalize truncate max-w-xs">
                            {row.original.menuItem}
                        </span>
                    </div>
                ),
                size: 240,
            },
            {
                id: 'outlet',
                accessorFn: (row) => row.outlet,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Outlet"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-gray-700 capitalize truncate">
                        {row.original.outlet}
                    </span>
                ),
                size: 180,
            },
            {
                id: 'weight',
                accessorFn: (row) => row.weight,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Weight"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-gray-700 capitalize truncate">
                        {row.original.weight ?? 0}
                    </span>
                ),
                size: 120,
            },
            {
                id: 'unit',
                accessorFn: (row) => row.unit,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Unit"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-gray-700 capitalize truncate">
                        {row.original.unit || '-'}
                    </span>
                ),
                size: 120,
            },
            {
                id: 'actions',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Actions"
                        column={column}
                        className="py-4 text-xs uppercase text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => {
                    const rowOrgId = row.original.orgId;
                    const menuItemId = row.original.menuItemId;

                    return (
                        <div className="flex items-center gap-3 px-2">
                            {/* View Action */}
                            <Link
                                to={`/menu-item/view-recipe/${menuItemId}?orgId=${rowOrgId}`}
                                state={{
                                    orgId: rowOrgId,
                                    menuItemId,
                                    headerId: row.original.id,
                                    returnUrl: '/menu-item/recipe',
                                }}
                                title="View Recipe"
                            >
                                <Eye
                                    size={18}
                                    className="text-gray-500 hover:text-[#00376C] cursor-pointer transition"
                                />
                            </Link>

                            {/* Edit Action */}
                            {canEdit && (
                                <Link
                                    to={`/menu-item/update-recipe/${menuItemId}?orgId=${rowOrgId}`}
                                    state={{
                                        orgId: rowOrgId,
                                        menuItemId,
                                        headerId: row.original.id,
                                        returnUrl: '/menu-item/recipe',
                                    }}
                                    title="Edit Recipe"
                                >
                                    <SquarePen
                                        size={18}
                                        className="text-gray-500 hover:text-blue-800 cursor-pointer transition"
                                    />
                                </Link>
                            )}

                            {/* Delete Action */}
                            {canDelete && (
                                <button
                                    type="button"
                                    onClick={() => openDeleteConfirm(row.original)}
                                    title="Delete Recipe"
                                >
                                    <Trash2
                                        size={18}
                                        className="text-red-400 hover:text-red-700 cursor-pointer transition"
                                    />
                                </button>
                            )}
                        </div>
                    );
                },
                enableSorting: false,
                size: 120,
            },
        ],
        [pageIndex, pageSize, canEdit, canDelete]
    );

    const table = useReactTable({
        data: recipes,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: handlePaginationChange,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        manualPagination: true,
        rowCount: totalCount,
        pageCount: Math.ceil(totalCount / pageSize) || 1,
        getCoreRowModel: getCoreRowModel(),
    });

    if (canView === false) {
        return <AccessDenied pageTitle="Item Recipe" />;
    }

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                <PageHeader
                    title="Item Recipe Listing"
                    description="View, manage, and calculate kitchen menu item recipes."
                    actions={
                        canAdd && (
                            <HeaderActionButton
                                to="/menu-item/create-recipe"
                                icon={Plus}
                                label="Create Recipe"
                            />
                        )
                    }
                />

                <PageErrorAlert
                    error={scopeError || error}
                    onRetry={() => {
                        if (scopeError) {
                            retryScope?.();
                        } else {
                            fetchRecipes();
                        }
                    }}
                    className="my-2"
                />

                {/* Filter and Search Bar */}
                <div className="bg-white mt-4">
                    <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
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
                            placeholder="Search by recipe or menu item..."
                        />

                        <div>
                            {!isOutletUser && (
                                <div className="sm:col-span-10 w-full">
                                    <SearchableSelect
                                        name="outletFilter"
                                        value={outletFilter}
                                        onChange={(e) => {
                                            const val = e?.target?.value ?? e?.value ?? '';
                                            setFilters((prev) => ({
                                                ...prev,
                                                outletId: val,
                                                page: 0,
                                            }));
                                        }}
                                        options={outletFilterOptions}
                                        placeholder={
                                            isCompanyUser
                                                ? `All Outlets (${selfOrg?.companyNameEnglish || 'Company'})`
                                                : 'All Outlets'
                                        }
                                        isClearable={true}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* DataGrid Table */}
                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
                    {loading || scopeLoading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading Recipe...
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

                {/* Delete Modal */}
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

export default ItemRecipeList;