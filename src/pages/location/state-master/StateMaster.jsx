import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Container } from "@/components/common/container";
import { ChevronRight, Eye, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { getAllStates, deleteStateById } from '../../../services/apiServices';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import AddStateModel from './AddStateModel';

const StateMaster = () => {
    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('State');

    const [search, setSearch] = useState('');
    const [states, setStates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});

    // ---- Modal state ----
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [isViewOnly, setIsViewOnly] = useState(false);

    // ---- Delete confirm state ----
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

    const fetchStates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAllStates();
            const payload = res.data;

            if (payload?.success) {
                const mapped = (payload.data || []).map((item) => ({
                    id: item.id,
                    name: item.name,
                    country: item.country?.name ?? '',
                    countryId: item.country?.id ?? '',
                    createdAt: item.createdAt,
                }));
                setStates(mapped);
            } else {
                setError('Failed to load states.');
            }
        } catch (err) {
            console.error(err);
            setError('Something went wrong while fetching states.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStates();
    }, [fetchStates]);

    const filteredStates = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return states;
        return states.filter((item) =>
            item.name?.toLowerCase().includes(query) ||
            item.country?.toLowerCase().includes(query)
        );
    }, [states, search]);

    const openAddModal = () => {
        setIsViewOnly(false);
        setEditData(null);
        setIsModalOpen(true);
    };

    const openViewModal = (row) => {
        setIsViewOnly(true);
        setEditData(row);
        setIsModalOpen(true);
    };

    const openEditModal = (row) => {
        setIsViewOnly(false);
        setEditData(row);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditData(null);
        setIsViewOnly(false);
    };

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
        if (!deleteTarget) return;
        setDeleteSaving(true);
        try {
            await deleteStateById(deleteTarget.id);
            closeDeleteConfirm();
            fetchStates();
        } catch (err) {
            console.error('Failed to delete state:', err);
        } finally {
            setDeleteSaving(false);
        }
    };

    const columns = useMemo(
        () => [
            {
                id: 'sno',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="S.NO"
                        column={column}
                        className="text-[#43474F] font-semibold py-4 uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-500 py-2">
                        {String(row.index + 1).padStart(2, '0')}
                    </span>
                ),
                enableSorting: false,
                size: 70,
            },

            // NAME
            {
                id: 'name',
                accessorFn: (row) => row.name,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Name"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <div className="font-semibold text-gray-800 capitalize">{row.original.name}</div>
                ),
            },
            // ACTIONS
            {
                id: 'actions',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Actions"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        <button onClick={() => openViewModal(row.original)} title="View Details">
                            <Eye
                                size={18}
                                className="text-gray-500 hover:text-green-600 cursor-pointer"
                            />
                        </button>

                        {canEdit && (
                            <button onClick={() => openEditModal(row.original)} title="Edit">
                                <SquarePen
                                    size={18}
                                    className="text-blue-400 hover:text-blue-800 cursor-pointer"
                                />
                            </button>
                        )}

                        {canDelete && (
                            <button onClick={() => openDeleteConfirm(row.original)} title="Delete">
                                <Trash2
                                    size={18}
                                    className="text-red-300 hover:text-red-700 cursor-pointer"
                                />
                            </button>
                        )}
                    </div>
                ),
                enableSorting: false,
            },
        ],
        [canEdit, canDelete],
    );

    const table = useReactTable({
        data: filteredStates,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (!canView) {
        return <AccessDenied pageTitle="State" />;
    }

    return (
        <Container>
            <div className='p-4 md:p-6'>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Location Master</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">State</span>
                </div>

                <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F172A] text-start">
                            State Master
                        </h1>
                    </div>

                    <div className="flex gap-3 self-end">
                        {canAdd && (
                            <button
                                onClick={openAddModal}
                                className="px-4 py-2 bg-[#084E92] border border-[#E2E8F0] text-[#ffffff] rounded-lg flex gap-2 items-center cursor-pointer hover:bg-blue-800 transition"
                            >
                                <Plus size={16} />
                                Add State
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white py-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                type="text"
                                placeholder="Search State..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPagination((prev) => ({
                                        ...prev,
                                        pageIndex: 0,
                                    }));
                                }}
                                className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-[#084E92]"
                            />
                        </div>

                        <p className="text-sm text-gray-500">
                            Showing {filteredStates.length} of {states.length} states
                        </p>
                    </div>
                </div>

                <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                    {loading && (
                        <p className="p-4 text-sm text-gray-500">
                            Loading states...
                        </p>
                    )}
                    {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                    <DataGrid
                        table={table}
                        recordCount={filteredStates.length}
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

                <AddStateModel
                    open={isModalOpen}
                    editData={editData}
                    onClose={closeModal}
                    onSuccess={fetchStates}
                    isViewOnly={isViewOnly}
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
    )
}

export default StateMaster