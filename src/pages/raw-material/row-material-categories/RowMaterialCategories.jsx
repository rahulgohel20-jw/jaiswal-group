import { Blocks, ChevronRight, CircleCheck, CircleX, Eye, Plus, Search, SquarePen, Trash2, Upload } from 'lucide-react'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddRawMaterialCategoryModal from './AddRowMaterialCategoryModel';
import RawMaterialCategoryDetailsModal from './RawMaterialCategoryDetailsModal';
import StatusConfirmModal from '@/utils/StatusConfirmModal';
import { Container } from "@/components/common/container";
import {
    getAllRawMaterialCategory,
    getAllRawMaterialCategoryType,
    getRawMaterialCategoryById,
    deleteRawMaterialCategoryById,
    updateRawMaterialCategoryStatus,
} from '@/services/apiServices';

const StatusToggle = ({ isActive, onClick }) => (
    <div className="flex items-center gap-2">
        <button
            type="button"
            onClick={onClick}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? "bg-green-600" : "bg-gray-300"
            }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isActive ? "translate-x-6" : "translate-x-1"
                }`}
            />
        </button>
        <span
            className={`text-xs font-semibold uppercase tracking-wide ${
                isActive ? "text-green-700" : "text-gray-500"
            }`}
        >
            {isActive ? "Active" : "Inactive"}
        </span>
    </div>
);

// Maps raw API row into the shape the table/UI expects.
const mapCategory = (c) => {
    const isActive = Boolean(c.isActive ?? c.active);
    return {
        id: c.id,
        nameEnglish: c.nameEnglish || '',
        typeName: c.rawMaterialCategoryTypeName || c.typeName || '',
        rawMaterialCatTypeId: c.rawMaterialCatTypeId,
        sequence: c.sequence,
        isDirect: Boolean(c.isDirect),
        isActive,
        status: isActive ? "Active" : "Inactive",
        createdAt: c.createdAt || null,
    };
};

const RowMaterialCategories = () => {
    const [categoriesData, setCategoriesData] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [showAddType, setShowAddType] = useState(false);
    const [editingType, setEditingType] = useState(null);

    // View-only modal state
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingCategory, setViewingCategory] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);

    // Status toggle confirm modal state
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null); // { id, nameEnglish, nextActive }
    const [statusSaving, setStatusSaving] = useState(false);

    const [categoryTypes, setCategoryTypes] = useState([]);
    const [typeFilterId, setTypeFilterId] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await getAllRawMaterialCategoryType();
                const raw = res.data?.data ?? [];
                setCategoryTypes(raw.map(t => ({ id: t.id, name: t.nameEnglish || t.name })));
            } catch (err) {
                console.error(err);
            }
        })();
    }, []);

    // Single source of truth for fetching — depends on typeFilterId so the
    // server-side filter re-runs when the dropdown changes.
    // typeFilterId is only sent when a real value is selected, so we never
    // send an empty/undefined categoryTypeId to the backend.
    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = typeFilterId
                ? await getAllRawMaterialCategory(typeFilterId)
                : await getAllRawMaterialCategory();
            const raw = res.data?.data ?? [];
            setCategoriesData(Array.isArray(raw) ? raw.map(mapCategory) : []);
        } catch (err) {
            console.error(err);
            setError('Failed to load raw material categories');
        } finally {
            setLoading(false);
        }
    }, [typeFilterId]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

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

    const openViewModal = async (row) => {
        setShowViewModal(true);
        setViewLoading(true);
        setViewingCategory(null);
        try {
            const res = await getRawMaterialCategoryById(row.id);
            const detail = res.data?.data ?? null;
            setViewingCategory(detail);
        } catch (err) {
            console.error(err);
            setViewingCategory(null);
        } finally {
            setViewLoading(false);
        }
    };

    const closeViewModal = () => {
        setShowViewModal(false);
        setViewingCategory(null);
    };

    const openStatusConfirm = (row) => {
        setStatusTarget({
            id: row.id,
            nameEnglish: row.nameEnglish,
            nextActive: !row.isActive,
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
            await updateRawMaterialCategoryStatus(statusTarget.id, statusTarget.nextActive);
            setShowStatusConfirm(false);
            setStatusTarget(null);
            fetchCategories();
        } catch (err) {
            console.error(err);
            alert('Failed to update status.');
        } finally {
            setStatusSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this material category? This cannot be undone.')) return;
        try {
            await deleteRawMaterialCategoryById(id);
            fetchCategories();
        } catch (err) {
            console.error(err);
            alert('Failed to delete material category.');
        }
    };

    // Client-side search + status filtering on top of the server-side type filter
    const filteredCategories = useMemo(() => {
        return categoriesData.filter((c) => {
            const matchesSearch = searchTerm.trim()
                ? c.nameEnglish.toLowerCase().includes(searchTerm.trim().toLowerCase())
                : true;
            const matchesStatus =
                statusFilter === "All Status" ? true : c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [categoriesData, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const total = categoriesData.length;
        const active = categoriesData.filter((t) => t.status === 'Active').length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [categoriesData]);

    const columns = [
        {
            id: "sno",
            header: ({ column }) => (
                <DataGridColumnHeader title="S.NO" column={column} className="text-[#43474F] font-semibold py-4" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-500 py-2">{String(row.index + 1).padStart(2, "0")}</span>
            ),
            enableSorting: false,
            size: 70,
        },
        {
            id: "categoryName",
            accessorFn: (row) => row.nameEnglish,
            header: ({ column }) => (
                <DataGridColumnHeader title="CATEGORY NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2">{row.original.nameEnglish}</div>
            ),
            size: 220,
        },
        {
            id: "typeName",
            accessorFn: (row) => row.typeName,
            header: ({ column }) => (
                <DataGridColumnHeader title="TYPE NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2">{row.original.typeName}</div>
            ),
            size: 220,
        },
        {
            id: "status",
            accessorFn: (row) => row.status,
            header: ({ column }) => (
                <DataGridColumnHeader title="VISIBILITY STATUS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <StatusToggle
                    isActive={row.original.isActive}
                    onClick={() => openStatusConfirm(row.original)}
                />
            ),
            size: 180,
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1">
                    <button type="button" onClick={() => openViewModal(row.original)}>
                        <Eye size={18} className="text-[#084E92] hover:text-blue-700 cursor-pointer" />
                    </button>
                    <button type="button" onClick={() => openEditModal(row.original)}>
                        <SquarePen size={18} className="text-gray-500 hover:text-green-600 cursor-pointer" />
                    </button>
                    <button type="button" onClick={() => handleDelete(row.original.id)}>
                        <Trash2 size={18} className="text-red-300 hover:text-red-600 cursor-pointer" />
                    </button>
                </div>
            ),
            enableSorting: false,
            size: 120,
        },
    ];

    const table = useReactTable({
        data: filteredCategories,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const STATS = [
        {
            title: "Total Category",
            value: String(stats.total),
            icon: <Blocks size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Category",
            value: String(stats.active).padStart(2, '0'),
            icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
            color: "text-[#15803D]",
        },
        {
            title: "Inactive Category",
            value: String(stats.inactive).padStart(2, '0'),
            icon: <CircleX size={22} className="text-white p-1 bg-[#6B7280] rounded" />,
            color: "text-[#1B1B1F]",
        },
    ];

    return (
       <Container>
         <div className='p-4 md:p-6'>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Master Data</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Raw Material Categories</span>
            </div>

            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#084E92]">Raw Material Category Master</h1>
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
                        Add Category
                    </button>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 py-8 text-[#43474F]">
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

            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4">
                <div className="grid grid-cols-1 xl:grid-cols-4 sm:grid-col-2 gap-4">
                    <div className="relative md:col-span-2">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by category name..."
                            className="w-full pl-10 py-2 border rounded-lg outline-none"
                        />
                    </div>

                    <p className='border rounded-lg px-3 py-2'>
                        <select
                            className="outline-none w-full"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </p>

                    <p className='border rounded-lg px-3 py-2'>
                      <select
                          className="w-full outline-none"
                          value={typeFilterId}
                          onChange={(e) => setTypeFilterId(e.target.value)}
                      >
                          <option value="">Category Type</option>
                          {categoryTypes.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                      </select>
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                {loading && <p className="p-4 text-sm text-gray-500">Loading raw material categories...</p>}
                {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                <DataGrid table={table} recordCount={filteredCategories.length} className="rounded-2xl">
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

            <AddRawMaterialCategoryModal
                isOpen={showAddType}
                onClose={closeModal}
                onSaved={fetchCategories}
                initialData={editingType}
            />

            <RawMaterialCategoryDetailsModal
                isOpen={showViewModal}
                onClose={closeViewModal}
                category={viewingCategory}
                loading={viewLoading}
            />

            <StatusConfirmModal
                isOpen={showStatusConfirm}
                onClose={closeStatusConfirm}
                onConfirm={confirmStatusChange}
                targetName={statusTarget?.nameEnglish}
                targetStatus={statusTarget?.nextActive}
                saving={statusSaving}
            />
        </div>
       </Container>
    )
}

export default RowMaterialCategories