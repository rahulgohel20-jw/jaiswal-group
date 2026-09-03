import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import { notify } from '@/utils/toast';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    ChevronRight,
    Plus,
    RefreshCw,
    Search,
    SquarePen,
    Trash2,
} from 'lucide-react';
import {
    getAllCaptainRecipeByOrgId,
} from '@/services/apiServices.js';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { getOrgIdFromToken } from '../../../utils/auth';
import CreateCaptainRecipe from './CreateCaptainRecipe';
import { deleteCaptainRecipeById, getCaptainRecipeById, syncCaptainRecipes, updateCaptainRecipeStatus } from '../../../services/apiServices';

const ORG_ID = getOrgIdFromToken();

const CaptainRecipeList = () => {
    const [search, setSearch] = useState('');
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
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
            console.log('Deleting recipe ID:', deleteTarget.id);
            await deleteCaptainRecipeById(deleteTarget.id);

            setShowDeleteConfirm(false);
            setDeleteTarget(null);
            await fetchRecipes();
        } catch (err) {
            console.error('Failed to delete recipe:', err);

        } finally {
            setDeleteSaving(false);
        }
    };

    const fetchRecipes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAllCaptainRecipeByOrgId(ORG_ID);

            const payload = res?.data?.data ?? res?.data ?? res;

            const rawList = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.data)
                    ? payload.data
                    : [];

            const list = rawList.map((item) => ({
                id: item.id,
                name: item.name ?? '',
                unitName: item.unitName ?? item.unitHierarchy?.nameEnglish ?? '',
                rate: item.rate,
                weight: item.weight,
                status: item.isActive ?? false,
                rawMaterial: item.rawMaterial ?? [],
                raw: item,
            }));

            setRecipes(list);

            if (!Array.isArray(payload) && list.length === 0) {
                console.warn('getAllCaptainRecipeByOrgId: unexpected response shape', res);
            }
        } catch (err) {
            console.error('Failed to fetch captain recipes:', err);
            setError('Failed to load captain recipes.');
            setRecipes([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecipes();
    }, [fetchRecipes]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await syncCaptainRecipes(ORG_ID);
            notify.success('Recipes synced successfully.');
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
        return list.filter((item) =>
            item.name?.toLowerCase().includes(search.toLowerCase()),
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
            await updateCaptainRecipeStatus(
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

    // with this:
    const handleEdit = async (row) => {
        try {
            const res = await getCaptainRecipeById(row.id);
            const data = res?.data?.data;
            if (!data) return;
            setEditData(data);
            setOpenRecipe(true);
        } catch (err) {
            console.error('Failed to fetch recipe details:', err);
            notify.error('Failed to load recipe details.');
        }
    };

    const columns = useMemo(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                        className="w-4 h-4 cursor-pointer my-4"
                    />
                ),
                cell: ({ row }) => (
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                ),
                enableSorting: false,
                size: 30,
            },

            {
                id: 'srNo',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="SR NO"
                        column={column}
                        className="text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700">
                        {row.index + 1 + pagination.pageIndex * pagination.pageSize}
                    </span>
                ),
                enableSorting: false,
                size: 70,
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
                    <div className="font-semibold text-gray-800 capitalize">{row.original.name}</div>
                ),
                size: 220,
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
                    <span className="text-gray-700 uppercase">{row.original.unitName || '-'}</span>
                ),
                size: 120,
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
                    <span className="text-gray-700">{row.original.rate ?? '-'}</span>
                ),
                size: 120,
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
                size: 120,
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
                size: 120,
            },

            {
                id: 'actions',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="ACTIONS"
                        column={column}
                        className="text-[#43474F] font-semibold"
                    />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        <button onClick={() => handleEdit(row.original)}>
                            <SquarePen
                                size={18}
                                className="text-gray-500 hover:text-blue-800 cursor-pointer"
                            />
                        </button>

                        <button onClick={() => openDeleteConfirm(row.original)}>
                            <Trash2
                                size={18}
                                className="text-red-300 hover:text-red-700 cursor-pointer"
                            />
                        </button>
                    </div>
                ),
                enableSorting: false,
                size: 120,
            },
        ],
        [pagination.pageIndex, pagination.pageSize],
    );

    const table = useReactTable({
        data: filteredRecipes,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <Container>
            <div className="p-4 md:p-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">Captain Recipes</span>
                </div>

                <div className="flex justify-between flex-col lg:flex-row gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F172A] text-start">
                            Captain Recipes
                        </h1>
                    </div>
                </div>

                <div className="bg-white py-5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                placeholder="Search recipe..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-[#084E92]"
                            />
                        </div>

                        <div className="flex gap-3 lg:self-end">
                            <button
                                type="button"
                                onClick={handleSync}
                                disabled={syncing}
                                className="px-4 py-2 bg-[#084E92] border border-[#E2E8F0] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                                {syncing ? 'Syncing...' : 'Sync Recipes'}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setEditData(null);
                                    setOpenRecipe(true);
                                }}
                                className="px-4 py-2 bg-[#084E92] border border-[#E2E8F0] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-blue-800 transition"
                            >
                                <Plus size={16} />
                                Create New
                            </button>
                        </div>
                    </div>
                </div>

                <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                    {loading && (
                        <p className="p-4 text-sm text-gray-500">Loading captain recipes...</p>
                    )}
                    {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                    <DataGrid
                        table={table}
                        recordCount={filteredRecipes.length}
                        className="rounded-2xl"
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
                </div>

                <CreateCaptainRecipe
                    open={openRecipe}
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

export default CaptainRecipeList;
