import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import { notify } from '@/utils/toast';
import {
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Loader2,
    Plus,
    RefreshCw,
    SquarePen,
    Trash2,
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    deleteKitchenCaptainReceipeById,
    getAllKitchenCaptainReceipeByOrgId,
    getKitchenCaptainReceipeById,
    syncCaptainRecipes,
    updateKitchenCaptainReceipeStatusById,
} from '../../../services/apiServices';
import { useNavigate } from 'react-router';
import CreateKitchenCaptainRecipe from './CreateKitchenCaptainRecipe';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getOrgIdFromToken } from '@/utils/auth';
import SearchableSelect from '../../../utils/SearchableSelect';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';

const KitchenCaptainRecipeList = () => {
    const {
        loading: scopeLoading,
        error: scopeError,
        isCompanyUser,
        isOutletUser,
        isGroupUser,
        units,
        selectedUnitId,
        setSelectedUnitId,
        effectiveOutletId,
        selfOrg,
        retry: retryScope,
    } = useOrgScope();

    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Captain Recipe');
    const navigate = useNavigate();

    // Map to lookup outlet names from orgId (only name without code)
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

    // Outlet dropdown options
    const outletFilterOptions = useMemo(() => {
        if (!Array.isArray(units)) return [];
        return units
            .filter((u) => u?.id != null && String(u.id).toUpperCase() !== 'ALL')
            .map((u) => ({
                value: String(u.id),
                label: u.name,
            }));
    }, [units]);

    // Determine the orgId to send to the backend
    const currentScopeOrgId = useMemo(() => {
        if (selectedUnitId) return Number(selectedUnitId);

        if (isCompanyUser) {
            return selfOrg?.id ? Number(selfOrg.id) : Number(getOrgIdFromToken());
        }

        return effectiveOutletId ? Number(effectiveOutletId) : Number(getOrgIdFromToken());
    }, [selectedUnitId, isCompanyUser, selfOrg, effectiveOutletId]);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState([]);
    const [openRecipe, setOpenRecipe] = useState(false);
    const [editData, setEditData] = useState(null);
    const [syncing, setSyncing] = useState(false);

    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null);
    const [statusSaving, setStatusSaving] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

    const openDeleteConfirm = (row) => {
        setDeleteTarget({ id: row.id, itemLabel: row.name });
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        if (deleteSaving) return;
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    };

    const confirmDelete = async () => {
        if (!deleteTarget?.id) return;
        setDeleteSaving(true);
        try {
            await deleteKitchenCaptainReceipeById(deleteTarget.id);
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
            await fetchRecipes();
        } catch (err) {
            console.error('Failed to delete recipe:', err);
            notify.error('Failed to delete recipe.');
        } finally {
            setDeleteSaving(false);
        }
    };

    const fetchRecipes = useCallback(async () => {
        if (!currentScopeOrgId) return;

        setLoading(true);
        setError(null);
        try {
            const statusParam =
                statusFilter === 'ALL' ? undefined : statusFilter === 'true';

            const res = await getAllKitchenCaptainReceipeByOrgId(
                currentScopeOrgId,
                statusParam
            );

            const payload = res?.data?.data ?? res?.data ?? res;

            const rawList = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.data)
                    ? payload.data
                    : [];

            const list = rawList.map((item) => {
                const itemOrgId = item.orgId ?? item.outletId;
                const resolvedOutlet =
                    item.outletName ||
                    item.organizationName ||
                    (itemOrgId ? outletNameMap.get(Number(itemOrgId)) : null) ||
                    (itemOrgId ? `Outlet #${itemOrgId}` : '-');

                return {
                    id: item.id,
                    name: item.name ?? '',
                    outletName: resolvedOutlet,
                    orgId: itemOrgId,
                    unitName: item.unitName ?? item.unitHierarchy?.nameEnglish ?? '',
                    rate: item.rate,
                    weight: item.weight,
                    status: item.isActive ?? false,
                    rawMaterial: item.krawMaterial ?? item.rawMaterial ?? [],
                    raw: item,
                };
            });

            setRecipes(list);
        } catch (err) {
            console.error('Failed to fetch captain recipes:', err);
            setError('Failed to load captain recipes.');
            setRecipes([]);
        } finally {
            setLoading(false);
        }
    }, [currentScopeOrgId, statusFilter, outletNameMap]);

    useEffect(() => {
        if (!scopeLoading && currentScopeOrgId) {
            fetchRecipes();
        }
    }, [fetchRecipes, scopeLoading, currentScopeOrgId]);

    const handleSync = async () => {
        if (!currentScopeOrgId) return;

        setSyncing(true);
        try {
            await syncCaptainRecipes(currentScopeOrgId);
            notify.success('Captain Receipe updated successfully')
            await fetchRecipes();
        } catch (err) {
            console.error('Failed to sync recipes:', err);
            notify.error('Failed to sync recipes.');
        } finally {
            setSyncing(false);
        }
    };

    const filteredRecipes = useMemo(() => {
        const list = Array.isArray(recipes) ? recipes : [];
        const term = search.toLowerCase().trim();
        if (!term) return list;
        return list.filter((item) =>
            item.name?.toLowerCase().includes(term) ||
            item.outletName?.toLowerCase().includes(term)
        );
    }, [search, recipes]);

    const openStatusConfirm = (row) => {
        setStatusTarget({
            id: row.id,
            itemLabel: row.name,
            nextStatusLabel: row.status ? 'Inactive' : 'Active',
            nextActive: !row.status,
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
            await updateKitchenCaptainReceipeStatusById(
                statusTarget.id,
                statusTarget.nextActive
            );
            closeStatusConfirm();
            fetchRecipes();
        } catch (err) {
            console.error(err);
            notify.error('Failed to update status.');
        } finally {
            setStatusSaving(false);
        }
    };

    const handleEdit = async (row) => {
        try {
            const res = await getKitchenCaptainReceipeById(row.id);
            const data = res?.data?.data;
            if (!data) return;
            setEditData(data);
            setOpenRecipe(true);
        } catch (err) {
            console.error('Failed to fetch recipe details:', err);
            notify.error('Failed to load recipe details.');
        }
    };

    const handleOutletFilterChange = (e) => {
        const value = e.target.value;
        setSelectedUnitId(value ? Number(value) : null);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const handleStatusFilterChange = (value) => {
        setStatusFilter(value || 'ALL');
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const columns = useMemo(
        () => [
            {
                id: 'srNo',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="SR NO"
                        column={column}
                        className="py-4 text-xs uppercase text-[#43474F] font-semibold "
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700">
                        {String(row.index + 1 + pagination.pageIndex * pagination.pageSize).padStart(2, '0')}
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
                        className="text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <div className="font-semibold text-gray-800 capitalize">
                        {row.original.name}
                    </div>
                ),
                size: 200,
            },
            {
                id: 'outletName',
                accessorFn: (row) => row.outletName,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="OUTLET"
                        column={column}
                        className="text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700 font-medium">
                        {row.original.outletName}
                    </span>
                ),
                enableSorting: false,
                size: 180,
            },
            {
                id: 'unitName',
                accessorFn: (row) => row.unitName,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="UNIT"
                        column={column}
                        className="text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700 uppercase">
                        {row.original.unitName || '-'}
                    </span>
                ),
                enableSorting: false,
                size: 110,
            },
            {
                id: 'rate',
                accessorFn: (row) => row.rate,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="RATE"
                        column={column}
                        className="text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700">{row.original.rate != null ? `₹${Number(row.original.rate).toFixed(2)}` : '-'}</span>
                ),
                sortingFn: (rowA, rowB) =>
                    Number(rowA.original.rate ?? 0) - Number(rowB.original.rate ?? 0),
                size: 100,
            },
            {
                id: 'weight',
                accessorFn: (row) => row.weight,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="WEIGHT"
                        column={column}
                        className="text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700">{row.original.weight ?? '-'}</span>
                ),
                sortingFn: (rowA, rowB) =>
                    Number(rowA.original.weight ?? 0) - Number(rowB.original.weight ?? 0),
                size: 100,
            },
            {
                id: 'status',
                accessorFn: (row) => row.status,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="STATUS"
                        column={column}
                        className="text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!row.original.status}
                            disabled={!canEdit}
                            onChange={() => openStatusConfirm(row.original)}
                            className="sr-only peer"
                        />
                        <div
                            className="
                                w-11 h-6
                                bg-gray-300
                                rounded-full
                                peer
                                peer-checked:bg-[#084E92]
                                after:absolute
                                after:top-0.5
                                after:left-0.5
                                after:h-5
                                after:w-5
                                after:bg-white
                                after:rounded-full
                                after:transition-all
                                peer-checked:after:translate-x-full
                                peer-disabled:opacity-60
                                peer-disabled:cursor-not-allowed
                            "
                        />
                        {row.original.status && (
                            <svg
                                className="absolute left-1 top-1 h-4 w-4 text-[#084E92] pointer-events-none"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </label>
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
                        className="py-4 text-xs uppercase text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => handleEdit(row.original)}
                                title="Edit Recipe"
                            >
                                <SquarePen
                                    size={18}
                                    className="text-gray-500 hover:text-blue-800 cursor-pointer"
                                />
                            </button>
                        )}

                        {canDelete && (
                            <button
                                type="button"
                                onClick={() => openDeleteConfirm(row.original)}
                                title="Delete Recipe"
                            >
                                <Trash2
                                    size={18}
                                    className="text-red-300 hover:text-red-700 cursor-pointer"
                                />
                            </button>
                        )}
                    </div>
                ),
                enableSorting: false,
                size: 110,
            },
        ],
        [pagination.pageIndex, pagination.pageSize, canEdit, canDelete]
    );

    const table = useReactTable({
        data: filteredRecipes,
        columns,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (canView === false) {
        return <AccessDenied pageTitle="Captain Recipe" />;
    }

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                {/* Standardized PageHeader with HeaderActionButton */}
                <PageHeader
                    title="Captain Recipes"
                    description="Configure and manage kitchen captain recipes and constituent raw materials across outlets."
                    actions={
                        <div className="flex items-center gap-2.5">
                            <HeaderActionButton
                                variant="outline"
                                onClick={handleSync}
                                disabled={syncing || !currentScopeOrgId}
                                icon={<RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />}
                                label={syncing ? 'Sync Recipes...' : 'Sync Recipes'}
                            />

                            {canAdd && (
                                <HeaderActionButton
                                    icon={Plus}
                                    onClick={() => {
                                        setEditData(null);
                                        setOpenRecipe(true);
                                    }}
                                    label="Create New"
                                />
                            )}
                        </div>
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

                {/* Filter and Search Bar Row */}
                <div className="bg-white mt-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Standardized SearchBar */}
                        <div className="w-full md:w-[70%]">
                            <SearchBar
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                                }}
                                onClear={() => {
                                    setSearch('');
                                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                                }}
                                placeholder="Search recipe or outlet..."
                                wrapperClassName="w-full"
                            />
                        </div>

                        <div className={`w-full md:w-[30%] grid ${isOutletUser ? 'grid-cols-1' : 'sm:grid-cols-2'} gap-4 grid-cols-1`}>
                            {/* Searchable Select Outlet Filter (Hidden for Outlet Users) */}
                            {!isOutletUser && (
                                <div className="w-full">
                                    <SearchableSelect
                                        name="outletFilter"
                                        value={selectedUnitId ? String(selectedUnitId) : ''}
                                        onChange={handleOutletFilterChange}
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

                            <div>
                                <Select
                                    value={statusFilter}
                                    onValueChange={handleStatusFilterChange}
                                >
                                    <SelectTrigger className="h-10 w-full border-[#C3C6D1] rounded-xl bg-white text-sm">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Status</SelectItem>
                                        <SelectItem value="true">Active</SelectItem>
                                        <SelectItem value="false">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DataGrid Table */}
                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading captain Recipe..
                        </div>
                    ) : (
                        <DataGrid
                            table={table}
                            recordCount={filteredRecipes.length}
                            className="rounded-2xl"
                            tableLayout={{
                                dense: true,
                                width: 'fixed',
                                cellBorder: true,
                                headerBorder: true,
                                rowBorder: true,
                            }}
                        >
                            <Card className="rounded-t-none border-t-0 rounded-2xl">
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

                <CreateKitchenCaptainRecipe
                    open={openRecipe}
                    orgId={currentScopeOrgId}
                    initialData={editData}
                    onClose={() => {
                        setOpenRecipe(false);
                        setEditData(null);
                    }}
                    onSuccess={fetchRecipes}
                />

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

export default KitchenCaptainRecipeList;