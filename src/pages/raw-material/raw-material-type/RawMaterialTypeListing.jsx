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

// Maps a raw API type object to the shape the table/UI expects
const mapType = (t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    status: t.active ? "Active" : "Inactive",
    updatedAt: t.updatedAt,
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

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this material type? This cannot be undone.')) return;
        try {
            await deleteRawMaterialType(id);
            fetchTypes();
        } catch (err) {
            console.error(err);
            alert('Failed to delete material type.');
        }
    };

    const fetchTypes = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getRawMaterialTypes();
            // Adjust this line once you confirm the actual API response shape
            const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];
            setTypes(Array.isArray(raw) ? raw.map(mapType) : []);
        } catch (err) {
            console.error(err);
            setError('Failed to load raw material types');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTypes();
    }, []);

    const filteredTypes = useMemo(() => {
        return types.filter((t) => {
            const matchesSearch = t.name?.toLowerCase().includes(searchTerm.trim().toLowerCase());
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
                <DataGridColumnHeader title="S.NO" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-500 py-2">{String(row.index + 1).padStart(2, '0')}</span>
            ),
            enableSorting: false,
            size: 70,
        },
        {
            id: "name",
            accessorFn: (row) => row.name,
            header: ({ column }) => (
                <DataGridColumnHeader title="TYPE NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2">{row.original.name}</div>
            ),
            size: 260,
        },
        {
            id: "status",
            accessorFn: (row) => row.status,
            header: ({ column }) => (
                <DataGridColumnHeader title="VISIBILITY STATUS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            size: 160,
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1">
                    <button type="button" onClick={() => openEditModal(row.original)}>
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
        data: filteredTypes,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const lastUpdatedLabel = useMemo(() => {
        const withDates = types.filter((t) => t.updatedAt);
        if (!withDates.length) return '—';
        const latest = withDates.reduce((a, b) => (new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b));
        const d = new Date(latest.updatedAt);
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isToday = d.toDateString() === new Date().toDateString();
        return isToday ? `Today, ${time}` : `${d.toLocaleDateString()}, ${time}`;
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
                {loading && <p className="p-4 text-sm text-gray-500">Loading raw material types...</p>}
                {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                <DataGrid table={table} recordCount={filteredTypes.length} className="rounded-2xl">
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
        </div>
      </Container>
    );
};

export default RawMaterialTypeListing;