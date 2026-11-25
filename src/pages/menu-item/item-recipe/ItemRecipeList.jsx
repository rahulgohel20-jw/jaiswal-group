import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { notify } from '@/utils/toast';
import {
    getCoreRowModel,
    getSortedRowModel,
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
    getAllRecipesByFilter,
    deleteKitchenMenuItemRecipe,
    getAllKitchenMenuCategory,
} from '../../../services/apiServices';
import { useModuleState } from '../../../hooks/useModuleState';
import { usePagePermissions } from '@/utils/permissions';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getOrgIdFromToken } from '@/utils/auth';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';

const FILTER_DEFAULTS = {
    search: '',
    categoryId: '',
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
        isGroupUser,
        showUnitDropdown,
        units,
        effectiveOutletId,
        selfOrg,
        retry: retryScope,
    } = useOrgScope();

    const canShowUnitFilter = Boolean(!isOutletUser && (isCompanyUser || isGroupUser || showUnitDropdown || units?.length > 0));

    const [filters, setFilters, resetFilters] = useModuleState(
        'ITEM_RECIPE_LIST',
        FILTER_DEFAULTS,
        CHILD_ROUTES
    );

    const {
        search,
        categoryId: categoryFilter,
        outletId: outletFilter,
        page: pageIndex,
        pageSize,
    } = filters;

    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Item Recipe');

    // UI & Server states
    const [rowSelection, setRowSelection] = useState({});
    const [sorting, setSorting] = useState([]);
    const [loading, setLoading] = useState(false);
    const [recipes, setRecipes] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState(null);

    // Category options state
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        const loadCategories = async () => {
            setCategoriesLoading(true);
            try {
                const res = await getAllKitchenMenuCategory();
                const payload = res?.data?.data ?? res?.data ?? {};
                const list = Array.isArray(payload['Menu Category Details'])
                    ? payload['Menu Category Details']
                    : Array.isArray(payload)
                        ? payload
                        : Array.isArray(payload.items)
                            ? payload.items
                            : [];

                const active = list.filter((item) => item?.isActive !== false);

                if (!isCancelled) {
                    setCategories(active);
                }
            } catch (err) {
                console.error('Failed to load categories for dropdown:', err);
                if (!isCancelled) {
                    setCategories([]);
                }
            } finally {
                if (!isCancelled) setCategoriesLoading(false);
            }
        };

        loadCategories();
        return () => {
            isCancelled = true;
        };
    }, []);

    const categoryOptions = useMemo(() => {
        return categories.map((cat) => ({
            value: String(cat.id),
            label: cat.nameEnglish || cat.name || `Category #${cat.id}`,
        }));
    }, [categories]);
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
            const apiParams = {
                page: pageIndex + 1,
                size: pageSize || 10,
            };

            // If company user has selected a unit in the dropdown, pass it in orgId (UnitId)
            if (outletFilter && Number.isFinite(Number(outletFilter))) {
                apiParams.orgId = Number(outletFilter);
            } else if (isOutletUser && effectiveOutletId) {
                // If it is unit user, pass the unit user's effectiveOutletId
                apiParams.orgId = Number(effectiveOutletId);
            }

            if (categoryFilter && String(categoryFilter).trim()) {
                apiParams.menuCatId = Number(categoryFilter);
            }

            if (search && search.trim()) {
                apiParams.itemName = search.trim();
            }

            const res = await getAllRecipesByFilter(apiParams);
            const payload = res?.data?.data ?? res?.data ?? {};

            // Extract the list of recipe headers
            const rawList = Array.isArray(payload.headers)
                ? payload.headers
                : Array.isArray(payload.items)
                    ? payload.items
                    : Array.isArray(payload.content)
                        ? payload.content
                        : Array.isArray(payload.data)
                            ? payload.data
                            : Array.isArray(payload)
                                ? payload
                                : [];

            // Extract total count for pagination
            let total =
                payload.total != null
                    ? Number(payload.total)
                    : payload.totalElements != null
                        ? Number(payload.totalElements)
                        : payload.totalCount != null
                            ? Number(payload.totalCount)
                            : payload.totalRecords != null
                                ? Number(payload.totalRecords)
                                : rawList.length;

            // Map recipe header rows
            let mapped = rawList.map((header) => {
                const resolvedOutlet =
                    header.orgName ||
                    header.outletName ||
                    (header.orgId ? outletNameMap.get(Number(header.orgId)) : null) ||
                    '-';

                const totalRecipeCost = Number(
                    header.recipeRate != null && Number(header.recipeRate) > 0
                        ? header.recipeRate
                        : header.rate != null && Number(header.rate) > 0
                            ? header.rate
                            : header.totalCost ?? header.amount ?? 0
                );

                const categoryName =
                    header.categoryName ||
                    header.category ||
                    header.menuCategoryName ||
                    header.menuCategory?.nameEnglish ||
                    header.menuCategory?.name ||
                    header.menuItemCategoryName ||
                    header.rawMaterialCat?.nameEnglish ||
                    '-';

                return {
                    id: header.id,
                    recipeHeaderId: header.id,
                    menuItemId: header.menuItemId,
                    menuItem: header.menuItemName || header.itemName || header.nameEnglish || `Item #${header.menuItemId}`,
                    category: categoryName,
                    outlet: resolvedOutlet,
                    weight: header.weight ?? 0,
                    unit: header.unitName || header.unit || '-',
                    price: totalRecipeCost,
                    orgId: header.orgId,
                    subOutletId: header.subOutletId ?? null,
                    raw: header,
                };
            });

            // Handle unpaginated backend fallback or filtered results smaller than page size
            if (rawList.length > pageSize) {
                total = rawList.length;
                const start = pageIndex * pageSize;
                const end = start + pageSize;
                setRecipes(mapped.slice(start, end));
            } else {
                if (rawList.length < pageSize) {
                    total = pageIndex * pageSize + rawList.length;
                }
                setRecipes(mapped);
            }

            setTotalCount(total);
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
        categoryFilter,
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
            notify.error('Missing Menu Item ID or Unit ID to delete recipe');
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
                        className="py-4 text-xs uppercase text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-xs text-gray-500">
                        {String(pageIndex * pageSize + row.index + 1).padStart(2, '0')}
                    </span>
                ),
                enableSorting: false,
                size: 40,
            },
            {
                id: 'menuItem',
                accessorFn: (row) => row.menuItem,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Menu Item"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-2 px-2 py-0.5">
                        <span className="font-medium text-xs text-gray-800 capitalize truncate max-w-full">
                            {row.original.menuItem}
                        </span>
                    </div>
                ),
                size: 240,
            },
            {
                id: 'category',
                accessorFn: (row) => row.category,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Category"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-xs text-gray-800 font-medium capitalize truncate">
                        {row.original.category || '-'}
                    </span>
                ),
                size: 150,
            },
            {
                id: 'outlet',
                accessorFn: (row) => row.outlet,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Unit"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-xs text-gray-800 font-medium capitalize truncate">
                        {row.original.outlet}
                    </span>
                ),
                enableSorting: false,
                size: 180,
            },
            {
                id: 'weight',
                accessorFn: (row) => row.weight,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Weight"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-xs text-gray-800 font-medium capitalize truncate">
                        {row.original.weight ?? 0}
                    </span>
                ),
                sortingFn: (rowA, rowB) =>
                    Number(rowA.original.weight ?? 0) - Number(rowB.original.weight ?? 0),
                size: 120,
            },
            {
                id: 'unit',
                accessorFn: (row) => row.unit,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Unit"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-xs text-gray-800 font-medium capitalize truncate">
                        {row.original.unit || '-'}
                    </span>
                ),
                enableSorting: false,
                size: 120,
            },
            {
                id: 'price',
                accessorFn: (row) => row.price,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Price"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-xs"
                    />
                ),
                cell: ({ row }) => (
                    <span className="block px-2 text-xs text-gray-800 font-medium truncate">
                        {row.original.price != null
                            ? `₹${Number(row.original.price).toFixed(2)}`
                            : '-'}
                    </span>
                ),
                sortingFn: (rowA, rowB) =>
                    Number(rowA.original.price ?? 0) - Number(rowB.original.price ?? 0),
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
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className={canShowUnitFilter ? "md:col-span-5 w-full" : "md:col-span-8 w-full"}>
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
                                wrapperClassName="w-full"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className={canShowUnitFilter ? "md:col-span-3 w-full" : "md:col-span-4 w-full"}>
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
                                options={categoryOptions}
                                placeholder={
                                    categoriesLoading ? 'Loading Categories...' : 'All Categories'
                                }
                                isLoading={categoriesLoading}
                                isClearable={true}
                            />
                        </div>

                        {/* Unit Filter (Company User Only) */}
                        {canShowUnitFilter && (
                            <div className="md:col-span-4 w-full">
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
                                            ? `All Units (${selfOrg?.name || 'Company'})`
                                            : 'All Units'
                                    }
                                    isClearable={true}
                                />
                            </div>
                        )}
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
                                width: 'auto',
                                cellBorder: true,
                                headerBorder: true,
                                rowBorder: true,
                            }}
                        >
                            <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none border-0">
                                <CardTable>
                                    <DataGridTable />
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