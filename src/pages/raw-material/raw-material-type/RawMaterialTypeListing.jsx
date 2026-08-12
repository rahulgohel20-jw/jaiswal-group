import {
    Blocks,
    ChevronRight,
    CircleCheck,
    CircleX,
    Clock,
    Eye,
    Plus,
    Search,
    SquarePen,
    Trash2,
    Upload,
} from 'lucide-react'
import React, { useState, useEffect, useMemo } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddRawMaterialTypeModal from './AddRawMaterialModal';
import RawMaterialTypeDetailsModal from './RawMaterialTypeDetailsModal';
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import { Container } from "@/components/common/container";
import { notify } from "@/utils/toast";
import {
    getAllRawMaterialCategoryType,
    getRawMaterialCategoryTypeById,
    deleteRawMaterialCategoryTypeById,
    updateRawMaterialCategoryTypeStatus,
} from '@/services/apiServices';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


const mapType = (t) => ({
    id: t.id,
    nameEnglish: t.nameEnglish || '',
    isActive: Boolean(t.isActive),
    status: t.isActive ? "Active" : "Inactive",
    createdAt: t.createdAt || null,
});

const RawMaterialTypeListing = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [showAddType, setShowAddType] = useState(false);
    const [editingType, setEditingType] = useState(null);

    // View-only modal state
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingType, setViewingType] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);

    // Status toggle confirm modal state
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null); // { id, name, nextActive }
    const [statusSaving, setStatusSaving] = useState(false);


    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const openEditModal = (row) => {
        setEditingType(row);
        setShowAddType(true);
    };

    const openCreateModal = () => {
        setEditingType(null);
        setShowAddType(true);
    };

    const closeModal = () => {
        setShowAddType(false);
        setEditingType(null);
    };

    // Eye button — fetches fresh data by id and shows it read-only
    const openViewModal = async (row) => {
        setShowViewModal(true);
        setViewLoading(true);
        setViewingType(null);
        try {
            const res = await getRawMaterialCategoryTypeById(row.id);
            const detail = res.data?.data?.["Raw Material Category Type Details"]?.[0]
                ?? res.data?.data
                ?? null;
            setViewingType(detail);
        } catch (err) {
            console.error(err);
            setViewingType(null);
        } finally {
            setViewLoading(false);
        }
    };

    const closeViewModal = () => {
        setShowViewModal(false);
        setViewingType(null);
    };

    const openStatusConfirm = (row) => {
        setStatusTarget({
            id: row.id,
            name: row.nameEnglish,
            nextActive: row.status !== 'Active',
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
            await updateRawMaterialCategoryTypeStatus(statusTarget.id, statusTarget.nextActive);
            setShowStatusConfirm(false);
            setStatusTarget(null);
            fetchTypes();
        } catch (err) {
            console.error(err);
            alert('Failed to update status.');
        } finally {
            setStatusSaving(false);
        }
    };



    const openDeleteConfirm = (row) => {
        setDeleteTarget({ id: row.id, name: row.nameEnglish });
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        if (deleteLoading) return;
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleteLoading(true);
            await deleteRawMaterialCategoryTypeById(deleteTarget.id);
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
            fetchTypes();
        } catch (err) {
            console.error(err);
            notify.error('Failed to delete material type.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const fetchTypes = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAllRawMaterialCategoryType();
            const raw = res.data?.data?.["Raw Material Category Type Details"] ?? [];
            setTypes(Array.isArray(raw) ? raw.map(mapType) : []);
        } catch (err) {
            console.error(err);
            setError('Failed to load raw material types');
            notify.error('Failed to load raw material type');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTypes();
    }, []);

    const filteredTypes = useMemo(() => {
        return types.filter((t) => {
            const matchesSearch = t.nameEnglish?.toLowerCase().includes(searchTerm.trim().toLowerCase());
            const matchesStatus = statusFilter === 'All Status' || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [types, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const total = types.length;
        const active = types.filter((t) => t.status === 'Active').length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [types]);

    const columns = [
        {
            id: "sno",
            header: ({ column }) => (
                <DataGridColumnHeader title="S.NO" column={column} className="py-4" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-500 py-4">{String(row.index + 1).padStart(2, '0')}</span>
            ),
            enableSorting: false,
            size: 70,
        },
        {
            id: "name",
            accessorFn: (row) => row.nameEnglish,
            header: ({ column }) => (
                <DataGridColumnHeader title="TYPE NAME" column={column} />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2 capitalize">{row.original.nameEnglish}</div>
            ),
            size: 260,
        },
        {
            id: "status",
            accessorFn: (row) => row.status,
            header: ({ column }) => (
                <DataGridColumnHeader title="VISIBILITY STATUS" column={column} />
            ),
            cell: ({ row }) => (
                <label className="relative inline-flex cursor-pointer">
                    <input
                        type="checkbox"
                        checked={row.original.status === "Active"}
                        className="sr-only peer"
                        onChange={() => {
                            setStatusTarget({
                                id: row.original.id,
                                itemLabel: row.original.name,
                                nextActive: row.original.status !== "Active",
                                nextStatusLabel:
                                    row.original.status === "Active" ? "Inactive" : "Active",
                            });
                            setShowStatusConfirm(true);
                        }}
                    />

                    <div className=" w-11 h-6  bg-gray-300 rounded-full peer peer-checked:bg-[#084E92] after:absolute after:top-0.5 after:left-0.5
              after:h-5 after:w-5  after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full " />
                </label>
            ),
            size: 160,
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1">
                    <button type="button" onClick={() => openViewModal(row.original)}>
                        <Eye size={18} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
                    </button>
                    <button type="button" onClick={() => openEditModal(row.original)}>
                        <SquarePen size={18} className="text-gray-500 hover:text-green-600 cursor-pointer" />
                    </button>
                    <button type="button" onClick={() => openDeleteConfirm(row.original)}>
                        <Trash2 size={18} className="text-red-300 hover:text-red-600 cursor-pointer" />
                    </button>
                </div>
            ),
            size: 110,
        },
    ];

    const table = useReactTable({
        data: filteredTypes,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const lastUpdatedLabel = useMemo(() => {
        const withDates = types.filter((t) => t.createdAt);
        if (!withDates.length) return '—';
        const parse = (s) => {
            const [d, m, y] = s.split('/').map(Number);
            return new Date(y, m - 1, d);
        };
        const latest = withDates.reduce((a, b) => (parse(a.createdAt) > parse(b.createdAt) ? a : b));
        return latest.createdAt;
    }, [types]);

    const STATS = [
        {
            title: "Total Types",
            value: String(stats.total),
            icon: <Blocks size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Types",
            value: String(stats.active).padStart(2, '0'),
            icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
            color: "text-[#15803D]",
        },
        {
            title: "Inactive Types",
            value: String(stats.inactive).padStart(2, '0'),
            icon: <CircleX size={22} className="text-white p-1 bg-[#6B7280] rounded" />,
            color: "text-[#1B1B1F]",
        },
        {
            title: "Last Updated",
            value: lastUpdatedLabel,
            icon: <Clock size={22} className="text-[#7C3AED] p-1 bg-[#EDE9FE] rounded" />,
            color: "text-[#1B1B1F]",
        },
    ];

    return (
        <Container>
            <div className="p-4 md:p-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Master Data</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">Raw Material Type</span>
                </div>

                <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Raw Material Type Master</h1>
                    </div>

                    <div className="flex gap-3 self-end">
                        <button
                            type="button"
                            className="px-4 py-2 border border-[#C3C6D1] text-[#43474F] rounded-lg flex gap-2 items-center cursor-pointer hover:bg-gray-50 transition"
                        >
                            <Upload size={16} />
                            Export
                        </button>
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-[#073e77] transition"
                        >
                            <Plus size={16} />
                            Add Type
                        </button>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 py-8 text-[#43474F]">
                    {STATS.map((item) => (
                        <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4">
                            <div className="flex justify-between items-center pb-2">
                                <p>{item.icon}</p>
                            </div>
                            <h1 className="text-sm text-[#43474F]">{item.title}</h1>
                            <h2 className={`text-xl font-bold ${item.color}`}>{item.value}</h2>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="relative min-w-0 border border-[#C3C6D1] rounded-lg">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                placeholder="Search by type name..."
                                className="w-full min-w-0 pl-10 py-2 outline-none rounded-lg"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select
                            value={statusFilter}
                            onValueChange={(value) => setStatusFilter(value)}
                        >
                            <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="All Status">
                                    All Status
                                </SelectItem>

                                <SelectItem value="Active">
                                    Active
                                </SelectItem>

                                <SelectItem value="Inactive">
                                    Inactive
                                </SelectItem>
                            </SelectContent>
                        </Select>

                    </div>
                </div>

                {/* Table */}
                <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                    {loading && <p className="p-4 text-sm text-gray-500">Loading raw material types...</p>}
                    {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                    <DataGrid table={table} recordCount={filteredTypes.length} className="rounded-2xl ">
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

                <AddRawMaterialTypeModal
                    isOpen={showAddType}
                    onClose={closeModal}
                    onSaved={fetchTypes}
                    initialData={editingType}
                />

                <RawMaterialTypeDetailsModal
                    isOpen={showViewModal}
                    onClose={closeViewModal}
                    type={viewingType}
                    loading={viewLoading}
                />

                <StatusConfirmModal
                    isOpen={showStatusConfirm}
                    onClose={closeStatusConfirm}
                    onConfirm={confirmStatusChange}
                    itemLabel={statusTarget?.name}
                    nextStatusLabel={statusTarget?.nextActive ? "Active" : "Inactive"}
                    saving={statusSaving}
                />
                <DeleteConfirmModal
                    isOpen={showDeleteConfirm}
                    onClose={closeDeleteConfirm}
                    onConfirm={confirmDelete}
                    itemLabel={deleteTarget?.name}
                    saving={deleteLoading}
                />
            </div>
        </Container>
    );
};

export default RawMaterialTypeListing;