import {
    Award,
    ChevronRight,
    CircleCheck,
    CircleX,
    Eye,
    Plus,
    Search,
    SquarePen,
    Tag,
    Trash2,
} from 'lucide-react'
import React, { useState, useEffect, useMemo } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddAssetBrandModal from './AddAssetBrandModal';
import AssetBrandDetailsModal from './AssetBrandDetailsModal';
import { getAssetBrands, getAssetBrandById, deleteAssetBrand } from '@/services/apiServices';

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

// Maps a raw API brand object to the shape the table/UI expects
const mapBrand = (b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    status: b.active ? "Active" : "Inactive",
    totalAssets: b.totalAssets,
    createdDate: b.createdDate,
});

const AssetBrandListing = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [showAddBrand, setShowAddBrand] = useState(false);
    const [viewingBrand, setViewingBrand] = useState(null);
    const [editingBrand, setEditingBrand] = useState(null);

    // Shows the cached row immediately, then refreshes with the authoritative
    // record from getById (the list payload may not carry every detail field).
    const handleViewBrand = async (row) => {
        setViewingBrand(row);
        try {
            const res = await getAssetBrandById(row.id);
            const raw = res.data?.data ?? res.data ?? null;
            if (raw) setViewingBrand(mapBrand(raw));
        } catch (err) {
            console.error(err);
            // keep showing the cached row data on failure
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this brand? This cannot be undone.')) return;
        try {
            await deleteAssetBrand(id);
            fetchBrands();
        } catch (err) {
            console.error(err);
            alert('Failed to delete brand.');
        }
    };

    const openEditModal = async (row) => {
        setEditingBrand(row);
        setShowAddBrand(true);
        try {
            const res = await getAssetBrandById(row.id);
            const raw = res.data?.data ?? res.data ?? null;
            if (raw) setEditingBrand(mapBrand(raw));
        } catch (err) {
            console.error(err);
            // keep editing with the cached row data on failure
        }
    };

    const openCreateModal = () => {
        setEditingBrand(null);
        setShowAddBrand(true);
    };

    const closeModal = () => {
        setShowAddBrand(false);
        setEditingBrand(null);
    };

    const fetchBrands = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAssetBrands();
            // Adjust this line once you confirm the actual API response shape
            const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];
            setBrands(Array.isArray(raw) ? raw.map(mapBrand) : []);
        } catch (err) {
            console.error(err);
            setError('Failed to load brands');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    const filteredBrands = useMemo(() => {
        return brands.filter((b) => {
            const matchesSearch = b.name?.toLowerCase().includes(searchTerm.trim().toLowerCase());
            const matchesStatus = statusFilter === 'All Status' || b.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [brands, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const total = brands.length;
        const active = brands.filter((b) => b.status === 'Active').length;
        const inactive = total - active;
        const assetsBranded = brands.reduce((sum, b) => sum + (Number(b.totalAssets) || 0), 0);
        return { total, active, inactive, assetsBranded };
    }, [brands]);

    const STATS = [
        {
            title: "Total Brands",
            value: String(stats.total),
            icon: <Award size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Brands",
            value: String(stats.active),
            icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
            color: "text-[#15803D]",
        },
        {
            title: "Inactive Brands",
            value: String(stats.inactive),
            icon: <CircleX size={22} className="text-white p-1 bg-[#6B7280] rounded" />,
            color: "text-[#1B1B1F]",
        },
        {
            title: "Assets Branded",
            value: stats.assetsBranded.toLocaleString(),
            icon: <Tag size={22} className="text-[#7C3AED] p-1 bg-[#EDE9FE] rounded" />,
            color: "text-[#1B1B1F]",
        },
    ];

    const columns = [
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
                <DataGridColumnHeader title="BRAND NAME" column={column} className="text-[#43474F] font-semibold" />
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
                    <button type="button" onClick={() => handleViewBrand(row.original)}>
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
    ];

    const table = useReactTable({
        data: filteredBrands,
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
                <span className="text-[#084E92] font-medium">Brand Master</span>
            </div>

            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#084E92]">Asset Brands</h1>
                    <p className="text-[#737781] mt-1">
                        Create and manage manufacturer/brand records used across the organization for asset
                        classification and reporting.
                    </p>
                </div>

                <div className="flex gap-3 self-end">
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-[#073e77] transition"
                    >
                        <Plus size={16} />
                        Add Brand
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="relative col-span-1 min-w-0 border border-[#C3C6D1] rounded-lg md:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            placeholder="Search by brand name..."
                            className="w-full min-w-0 pl-10 py-2 outline-none rounded-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <p className="border border-[#C3C6D1] rounded-lg px-3 py-2 min-w-0">
                        <select
                            className="outline-none w-full min-w-0 bg-transparent"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                {loading && <p className="p-4 text-sm text-gray-500">Loading brands...</p>}
                {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                <DataGrid table={table} recordCount={filteredBrands.length} className="rounded-2xl">
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

            <AddAssetBrandModal
                isOpen={showAddBrand}
                onClose={closeModal}
                onSaved={fetchBrands}
                initialData={editingBrand}
            />
            <AssetBrandDetailsModal
                isOpen={!!viewingBrand}
                onClose={() => setViewingBrand(null)}
                brand={viewingBrand}
            />
        </div>
    );
};

export default AssetBrandListing;