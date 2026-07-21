import { ArrowRightLeft, Building2, CircleCheck, CircleX, ClipboardList, Download, Eye, MonitorSmartphone, Package, Plus, RotateCcw, Search, SquareCheckBig, SquarePen, Trash2 } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddAssetTypeModal from './AddAssetTypeModal';
import AssetTypeDetailsModal from './AsssetTypeDetailsModal';
import { getAssetTypes, getAssetTypeById, deleteAssetType } from '@/services/apiServices';



const TruncatedCell = ({ value, widthClass = "max-w-[180px]", className = "text-gray-600" }) => (
    <span title={value} className={`block truncate ${widthClass} ${className}`}>
        {value}
    </span>
);

const TypeBadge = ({ type }) => {
    const styles = {
        Fixed: "bg-blue-100 text-blue-700",
        "Unit-to-Unit": "bg-green-100 text-green-700",
        Movable: "bg-orange-100 text-orange-700",
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[type] || 'bg-gray-100 text-gray-700'}`}>
            {type}
        </span>
    );
};

const mapAssetType = (t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    status: t.active ? "Active" : "Inactive",
    createdAt: t.createdAt,
});

const AssetsType = () => {
    const [type, setType] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rowSelection, setRowSelection] = useState({});
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [viewingType, setViewingType] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [typeInput, setTypeInput] = useState("All");
    const [transferInput, setTransferInput] = useState("Any");
    const [filters, setFilters] = useState({
        search: "",
        type: "All",
        transfer: "Any",
    });

    
    const applyFilters = () => {
    setFilters({
        search: searchInput,
        type: typeInput,
        transfer: transferInput,
    });
};

    const fetchTypes = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAssetTypes();
            const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];
            setType(Array.isArray(raw) ? raw.map(mapAssetType) : []);
        } catch (err) {
            console.error(err);
            setError('Failed to load asset types');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchTypes();
    }, []);

    const openCreateModal = () => {
        setEditingType(null);
        setShowAddModal(true);
    };

    const openEditModal = (row) => {
        setEditingType(row);
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setEditingType(null);
    };

    const handleView = async (row) => {
        setViewLoading(true);
        setViewingType(row); // instant fallback while fetching
        try {
            const res = await getAssetTypeById(row.id);
            const raw = res.data?.data ?? res.data ?? row;
            setViewingType(mapAssetType(raw));
        } catch (err) {
            console.error(err);
        } finally {
            setViewLoading(false);
        }
    };

    const handleEditFromDetails = (data) => {
        setViewingType(null);
        setEditingType(data);
        setShowAddModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this asset type? This cannot be undone.')) return;
        try {
            await deleteAssetType(id);
            fetchTypes();
        } catch (err) {
            console.error(err);
            alert('Failed to delete asset type.');
        }
    };
 const filteredTypes = useMemo(() => {
    return type.filter((item) => {

        const keyword = filters.search.toLowerCase();

        const searchMatch =
            item.name?.toLowerCase().includes(keyword) ||
            item.description?.toLowerCase().includes(keyword);

        const typeMatch =
            filters.type === "All" ||
            item.name === filters.type;

        const transferMatch =
            filters.transfer === "Any" ||
            item.transferAllowed === filters.transfer;

        return searchMatch && typeMatch && transferMatch;
    });

}, [type, filters]);

    const STATS = [
        {
            title: "Total Asset Types",
            value: `${type.length}`,
            icon: Package,
            bg: "bg-[#F5F7FB]",
            iconColor: "text-[#245AA8]",
        },
        {
            title: "Fixed Assets",
            value: `${type.filter((c) => c.name == 'fixed').length}`,
            icon: Building2,
            bg: "bg-[#EEF5FF]",
            iconColor: "text-[#245AA8]",
        },
        {
            title: "Unit-to-Unit Assets",
            value: `${type.filter((c) => c.name == "unit-to-unit").length}`,
            icon: ArrowRightLeft,
            bg: "bg-[#ECFDF3]",
            iconColor: "text-[#10B981]",
        },
        {
            title: "Movable Assets",
            value: `${type.filter((c) => c.name == "movable").length}`,
            icon: MonitorSmartphone,
            bg: "bg-[#FFF3ED]",
            iconColor: "text-[#F97316]",
        },
    ];
    const columns =  [
        {
            id: "select",
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    className="mx-6"
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                    className="mx-6"
                />
            ),
            enableSorting: false,
            size: 100,
        },
        {
            accessorKey: "assetType",
            header: ({ column }) => (
                <DataGridColumnHeader title="ASSET TYPE" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => <TypeBadge type={row.original.name} />,
            size: 150,
        },
        {
            accessorKey: "description",
            header: ({ column }) => (
                <DataGridColumnHeader title="DESCRIPTION" column={column} className="text-[#43474F] font-semibold my-4" />
            ),
            cell: ({ row }) => (
                <TruncatedCell value={row.original.description} widthClass="max-w-[220px]" />
            ),
            size: 220,
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className={`flex items-center gap-2 text-sm font-medium ${row.original.status === 'Active' ? 'text-[#16A34A]' : 'text-[#737781]'}`}>
                    <span className={`w-2 h-2 rounded-full my-4 ${row.original.status === 'Active' ? 'bg-[#16A34A]' : 'bg-[#9CA3AF]'}`} />
                    {row.original.status}
                </div>
            ),
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-4">
                    <Eye
                        size={16}
                        className="text-[#64748B] hover:text-[#084E92] cursor-pointer"
                        onClick={() => handleView(row.original)}
                    />
                    <SquarePen
                        size={16}
                        className="text-[#64748B] hover:text-green-600 cursor-pointer"
                        onClick={() => openEditModal(row.original)}
                    />
                    <Trash2
                        size={16}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                        onClick={() => handleDelete(row.original.id)}
                    />
                </div>
            ),
            enableSorting: false,
        },
    ]
    const table = useReactTable({
        data: filteredTypes,
        columns,
        state: { rowSelection },
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#0B3B75]">Assign Asset Types</h1>
                    <p className="text-[#5F6368] mt-2 max-w-3xl">
                        Configure classification rules and transfer protocols for organizational assets.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={openCreateModal} className="flex items-center gap-2 px-5 py-2 bg-[#084E92] text-white rounded-lg hover:bg-[#063b6d] cursor-pointer">
                        <Plus size={16} />
                        Add Asset Type
                    </button>
                </div>
            </div>

            {/* Stats Cards — unchanged, still static */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 py-8">
                {STATS.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={index}
                            className={`border border-[#C3C6D1] rounded-2xl p-4 shadow-sm`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div
                                    className={`w-7 h-7 rounded ${item.bg} flex items-center justify-center`}
                                >
                                    <Icon className={`w-4 h-4 ${item.iconColor}`} />
                                </div>
                            </div>

                            <p className="text-sm text-[#43474F]">
                                {item.title}
                            </p>

                            <h2 className="text-xl font-bold text-[#111827]">
                                {item.value}
                            </h2>
                        </div>
                    );
                })}
            </div>
            {/* Filters — unchanged */}
            <div className="bg-white border rounded-2xl p-5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-3">
                        <label className="text-xs font-semibold">Global Search</label>
                        <input value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Type, Description..." className="w-full border rounded-lg px-3 py-2 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-semibold">Asset Type</label>
                        <p className='w-full border rounded-lg px-3 py-2 '>
                            <select value={typeInput} onChange={(e) => setTypeInput(e.target.value)} className="outline-none w-full">
                                <option value="All">All Types</option>
                                {
                                    type.map((t) => (
                                        <option value={t.name}>{t.name}</option>
                                    ))
                                }
                            </select>
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-semibold">Transfer Allowed</label>
                        <p className='w-full border rounded-lg px-3 py-2 '>
                            <select
                                value={transferInput}
                                onChange={(e) => setTransferInput(e.target.value)}
                                className="outline-none w-full"
                            >
                                <option value="Any">
                                    Any
                                </option>
                                <option value="Yes">
                                    Yes
                                </option>
                                <option value="No">
                                    No
                                </option>

                            </select>
                        </p>
                    </div>
                    <div className="md:col-span-3 flex items-end gap-1 ">
                        <button onClick={applyFilters} className="bg-[#084E92] cursor-pointer text-white px-6 py-2 rounded-lg">Apply Filter</button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className='w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden'>
                {loading && <p className="p-4 text-sm text-gray-500">Loading asset types...</p>}
                {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                <DataGrid table={table} recordCount={filteredTypes.length} className="rounded-2xl">
                    <Card className="rounded-t-none border-t-0 rounded-2xl">
                        <CardTable>
                            <ScrollArea>
                                <DataGridTable />
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </CardTable>
                    </Card>
                </DataGrid>
            </div>

            <AddAssetTypeModal
                isOpen={showAddModal}
                onClose={closeAddModal}
                onSaved={fetchTypes}
                initialData={editingType}
            />

            <AssetTypeDetailsModal
                isOpen={!!viewingType}
                onClose={() => setViewingType(null)}
                onEdit={handleEditFromDetails}
                assetType={viewingType}
                loading={viewLoading}
            />
        </div>
    );
};

export default AssetsType;