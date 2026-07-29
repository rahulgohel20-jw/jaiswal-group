import {
    Blocks,
    ChevronRight,
    CircleCheck,
    CircleX,
    Eye,
    Plus,
    Search,
    SquarePen,
    Tag,
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
import AddCategoryModal from './AddCategoryModal';
import AssetCategoryDetailsModal from './AssetCategoryDetailsModal';
import { getAssetCategories, deleteAssetCategory } from '@/services/apiServices';
import { notify } from "@/utils/toast";
import { Container } from "@/components/common/container";


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

// Maps a raw API category object to the shape the table/UI expects
const mapCategory = (c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    status: c.active ? "Active" : "Inactive",
    totalAssets: c.totalAssets,
    createdDate: c.createdDate,
    activity: c.activity,
});

const AssetCategory = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [viewingCategory, setViewingCategory] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this category? This cannot be undone.')) return;
        try {
            await deleteAssetCategory(id);
            notify.success("Category Deleted successfully");
            fetchCategories();
        } catch (err) {
            console.error(err);
            notify.error('Failed to delete category.');
        }
    };
    const openEditModal = (row) => {
        setEditingCategory(row);
        setShowAddCategory(true);
    };

    const openCreateModal = () => {
        setEditingCategory(null);
        setShowAddCategory(true);
    };

    const closeModal = () => {
        setShowAddCategory(false);
        setEditingCategory(null);
    };

    const fetchCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAssetCategories();
            // Adjust this line once you confirm the actual API response shape
            const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];
            setCategories(Array.isArray(raw) ? raw.map(mapCategory) : []);
        } catch (err) {
            console.error(err);
            setError('Failed to load categories');
            notify.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchCategories();
    }, []);

    const filteredCategories = useMemo(() => {
        const keyword = search.toLowerCase().trim();

        return categories.filter((category) => {
            const matchesSearch =
                category.name.toLowerCase().includes(keyword) ||
                category.description.toLowerCase().includes(keyword);

            const matchesStatus =
                statusFilter === "All" ||
                category.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [categories, search, statusFilter]);
    const STATS = [
        {
            title: "Total Categories",
            value: `${categories.length}`,
            badge: null,
            icon: <Blocks size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Categories",
            value: `${categories.filter((c) => c.status == 'Active').length}`,
            badge: "HIGH",
            badgeStyle: "bg-green-100 text-green-700",
            icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
            color: "text-[#15803D]",
        },
        {
            title: "Inactive Categories",
            value: `${categories.filter((c) => c.status == 'Inactive').length}`,
            badge: null,
            icon: <CircleX size={22} className="text-white p-1 bg-[#6B7280] rounded" />,
            color: "text-[#1B1B1F]",
        },
    ];
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
            id: "name",
            accessorFn: (row) => row.name,
            header: ({ column }) => (
                <DataGridColumnHeader title="CATEGORY NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2">{row.original.name}</div>
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
            size: 320,
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
                    <button type="button" onClick={() => setViewingCategory(row.original)}>
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
    ], [])

    const table = useReactTable({
        data: filteredCategories,
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
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Category Master</span>
            </div>

            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Asset Categories</h1>
                    <p className="text-[#737781] mt-1 text-sm">
                        Create and manage asset categories used across the organization for better classification, reporting,
                        and inventory management.
                    </p>
                </div>

                <div className="flex gap-3 self-end">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3   gap-4 py-8 text-[#43474F]">
                {STATS.map((item) => (
                    <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4">
                        <div className="flex justify-between items-center pb-2">
                            <p>{item.icon}</p>
                            {item.badge && (
                                <p className={`text-xs rounded font-semibold px-1.5 py-1 ${item.badgeStyle}`}>{item.badge}</p>
                            )}
                        </div>
                        <h1 className="text-sm text-[#43474F]">{item.title}</h1>
                        <h2 className={`text-xl font-bold ${item.color}`}>{item.value}</h2>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-center">
                    <div className="relative col-span-1 min-w-0 border border-[#C3C6D1] rounded-lg">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value)}}
                            placeholder="Search by name or description..."
                            className="w-full min-w-0 pl-10 py-2 outline-none rounded-lg"
                        />
                    </div>

                    <p className="border border-[#C3C6D1] rounded-lg px-3 py-2 min-w-0">
                        <select value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)} className="outline-none w-full min-w-0 bg-transparent">
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </p>

                    <p className="border border-[#C3C6D1] rounded-lg px-3 py-2 min-w-0">
                        <select className="outline-none w-full min-w-0 bg-transparent">
                            <option>All Users</option>
                            <option>Super Admin</option>
                            <option>Rajesh Kumar</option>
                        </select>
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                {loading && <p className="p-4 text-sm text-gray-500">Loading categories...</p>}
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

            <AddCategoryModal
                isOpen={showAddCategory}
                onClose={closeModal}
                onSaved={fetchCategories}
                initialData={editingCategory}
            />
            <AssetCategoryDetailsModal
                isOpen={!!viewingCategory}
                onClose={() => setViewingCategory(null)}
                category={viewingCategory}
                loading={viewLoading}
            />
        </div>
       </Container>
    );
};

export default AssetCategory;