import {
    Blocks,
    ChevronRight,
    CircleCheck,
    CircleX,
    Eye,
    Plus,
    Search,
    Sparkles,
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
import AddSubCategoryModal from './AddSubCategoryModal';
import AssetSubCategoryDetailsModal from './AssetSubCategoryDetailsModal';
import { getSubCategories, getAssetCategories, deleteSubCategory } from '@/services/apiServices';
import { notify } from "@/utils/toast";

const StatusBadge = ({ status }) => {
    const styles = {
        Active: "bg-green-100 text-green-700",
        Inactive: "bg-gray-200 text-gray-600",
    };
    return (
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${styles[status]}`}>
            {status}
        </span>
    );
};

// Single source of truth for mapping a raw sub-category API object to the table shape.
// Takes the just-fetched categories array explicitly so callers never rely on stale state.
const mapSubCategory = (c, cats) => ({
    id: c.id,
    categoryId: c.categoryId,
    parentCategory:
        c.categoryName || c.category?.name ||
        (Array.isArray(cats) ? cats.find((x) => x.id === c.categoryId)?.name : null) ||
        `Category #${c.categoryId}`,
    name: c.name,
    description: c.description,
    status: c.active ? "Active" : "Inactive",
    assetCount: c.assetCount,
    healthIndex: c.healthIndex,
    healthLabel: c.healthLabel,
});

const AssetSubCategory = () => {
    const [subCategories, setSubCategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rowSelection, setRowSelection] = useState({});
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [showAddSubCategory, setShowAddSubCategory] = useState(false);
    const [viewingSubCategory, setViewingSubCategory] = useState(null);
    const [editingSubCategory, setEditingSubCategory] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All")
    const [appliedFilters, setAppliedFilters] = useState({
        search: "",
        status: "All",
        category: "All",
    });

    const handleApplyFilter = () => {
        setAppliedFilters({
            search,
            status: statusFilter,
            category: categoryFilter,
        });
    };

    const categoryNameById = (id) =>
        categories.find((c) => c.id === id)?.name || `Category #${id}`;

    const mapSubCategory = (c) => ({
        id: c.id,
        categoryId: c.categoryId,
        // prefer a name the backend may already embed; fall back to local lookup
        parentCategory: c.categoryName || c.category?.name || categoryNameById(c.categoryId),
        name: c.name,
        description: c.description,
        status: c.active ? "Active" : "Inactive",
        assetCount: c.assetCount,
        healthIndex: c.healthIndex,
        healthLabel: c.healthLabel,
    });

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [catRes, subRes] = await Promise.all([
                getAssetCategories(),
                getSubCategories(),
            ]);
            const cats = catRes.data?.data ?? catRes.data?.content ?? catRes.data ?? [];
            setCategories(Array.isArray(cats) ? cats : []);

            const raw = subRes.data?.data ?? subRes.data?.content ?? subRes.data ?? [];
            const list = Array.isArray(raw) ? raw : [];
            // map using the just-fetched categories (not stale state)
            setSubCategories(list.map((c) => mapSubCategory(c, cats)));
        } catch (err) {
            console.error(err);
            notify.error('Failed to load sub category.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const filteredSubCategories = useMemo(() => {
        const keyword = search.toLowerCase().trim();
        return subCategories.filter((item) => {


            const matchesSearch =
                item.name?.toLowerCase().includes(keyword) ||
                item.description?.toLowerCase().includes(keyword) ||
                item.parentCategory?.toLowerCase().includes(keyword);

            const matchesStatus =
                statusFilter === "All" ||
                item.status === statusFilter;

            const matchesCategory =
                categoryFilter === "All" ||
                item.parentCategory === categoryFilter;

            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [subCategories, search, statusFilter, categoryFilter])

    const STATS = [
        {
            title: "Total Sub Categories",
            value: `${subCategories.length}`,
            note: "+4 from last month",
            noteColor: "text-[#265FA4]",
            icon: <Blocks size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Sub Categories",
            value: `${subCategories.filter((c) => c.status == 'Active').length}`,
            note: "89.6% of total",
            noteColor: "text-[#15803D]",
            icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
            color: "text-[#15803D]",
        },
        {
            title: "Inactive Sub Categories",
            value: `${subCategories.filter((c) => c.status == 'Inactive').length}`,
            note: "Requires Review",
            noteColor: "text-[#737781]",
            icon: <CircleX size={22} className="text-white p-1 bg-[#6B7280] rounded" />,
            color: "text-[#1B1B1F]",
        },
    ];

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this sub category? This cannot be undone.')) return;
        try {
            await deleteSubCategory(id);
            notify.success("Subcategory Deleted successfully");
            fetchAll();
        } catch (err) {
            console.error(err);
            notify.error('Failed to delete sub category.');
        }
    };

    const openEditModal = (row) => {
        setEditingSubCategory(row);
        setShowAddSubCategory(true);
    };

    const openCreateModal = () => {
        setEditingSubCategory(null);
        setShowAddSubCategory(true);
    };

    const closeModal = () => {
        setShowAddSubCategory(false);
        setEditingSubCategory(null);
    };

    const handleSaveSubCategory = (data) => {
        setSubCategories((prev) => [
            ...prev,
            {
                id: prev.length ? Math.max(...prev.map((c) => c.id)) + 1 : 1,
                parentCategory: data.parentCategory,
                name: data.name,
                description: data.description,
                status: data.status,
            },
        ]);
    };

    const columns = useMemo(() => [
        {
            id: "select",
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    className="w-4 h-4 cursor-pointer"
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                    className="h-4 w-4 rounded border-gray-300 text-[#084E92] focus:ring-[#084E92] cursor-pointer"
                />
            ),
            enableSorting: false,
            size: 45,
        },
        {
            id: "parentCategory",
            accessorFn: (row) => row.parentCategory,
            header: ({ column }) => (
                <DataGridColumnHeader title="PARENT CATEGORY" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2">{row.original.parentCategory}</div>
            ),
            size: 170,
        },
        {
            id: "name",
            accessorFn: (row) => row.name,
            header: ({ column }) => (
                <DataGridColumnHeader title="SUB CATEGORY NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-1">{row.original.name}</div>
            ),
            size: 190,
        },
        {
            id: "description",
            accessorFn: (row) => row.description,
            header: ({ column }) => (
                <DataGridColumnHeader title="DESCRIPTION" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-500 py-1 line-clamp-1">{row.original.description}</span>
            ),
            size: 300,
        },
        {
            id: "status",
            accessorFn: (row) => row.status,
            header: ({ column }) => (
                <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            size: 120,
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1">
                    <button type="button" onClick={() => setViewingSubCategory(row.original)}>
                        <Eye size={18} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
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
            size: 110,
        },
    ], []
    )
    const table = useReactTable({
        data: filteredSubCategories,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="p-4 md:p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Sub Category Master</span>
            </div>

            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#084E92]">Asset Sub Categories</h1>
                    <p className="text-[#737781] mt-1">
                        Manage sub-categories under each asset category for better classification, reporting, and
                        inventory management.
                    </p>
                </div>

                <div className="flex gap-3 self-end">
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-[#073e77] transition"
                    >
                        <Plus size={16} />
                        Add Sub Category
                    </button>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 py-8 text-[#43474F]">
                {STATS.map((item) => (
                    <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4">
                        <div className="pb-2">{item.icon}</div>
                        <h1 className="text-sm text-[#43474F]">{item.title}</h1>
                        <h2 className={`text-xl font-bold ${item.color}`}>{item.value}</h2>
                        <p className={`text-xs mt-1 ${item.noteColor}`}>{item.note}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-center">
                    <div className="relative col-span-1 min-w-0 border border-[#C3C6D1] rounded-lg">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                            placeholder="Search by name, code or description..." className="w-full min-w-0 pl-10 py-2 outline-none rounded-lg" />
                    </div>

                    <p className="border border-[#C3C6D1] rounded-lg px-3 py-2 min-w-0">
                        <select value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="outline-none w-full min-w-0 bg-transparent">
                            <option value="All">All Categories</option>
                            {[...new Set(subCategories.map(item => item.parentCategory))].map(category => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </p>

                    <p className="border border-[#C3C6D1] rounded-lg px-3 py-2 min-w-0">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="outline-none w-full bg-transparent"
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </p>

                    <button type="button" onClick={handleApplyFilter} className="bg-[#084E92] text-white rounded-lg px-4 py-2 hover:bg-[#073e77] transition cursor-pointer">
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                <DataGrid table={table} recordCount={filteredSubCategories.length} className="rounded-2xl">
                {loading && <p className="p-4 text-sm text-gray-500">Loading sub categories...</p>}
                {error && <p className="p-4 text-sm text-red-600">{error}</p>}
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

            {loading && <p className="p-4 text-sm text-gray-500">Loading sub categories...</p>}
            {error && <p className="p-4 text-sm text-red-600">{error}</p>}

            <AddSubCategoryModal
                isOpen={showAddSubCategory}
                onClose={closeModal}
                onSaved={fetchAll}
                initialData={editingSubCategory}
            />

            <AssetSubCategoryDetailsModal
                isOpen={!!viewingSubCategory}
                onClose={() => setViewingSubCategory(null)}
                subCategory={viewingSubCategory}
            />
        </div>
    );
};

export default AssetSubCategory;