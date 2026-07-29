import { ArrowRightLeft, Building2, ChevronRight, CircleCheck, CircleX, ClipboardList, Download, Eye, MonitorSmartphone, Package, Plus, RotateCcw, Search, SquareCheckBig, SquarePen, Trash2 } from 'lucide-react';
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
import { notify } from "@/utils/toast";
import { Container } from "@/components/common/container";


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
     transferAllowed: t.transferAllowed,
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
    const fetchTypes = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await getAssetTypes();
            const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];

            setType(Array.isArray(raw) ? raw.map(mapAssetType) : []);
        } catch (err) {
            console.error(err);
            setError("Failed to load asset types");
            notify.error("Failed to load asset types.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchTypes();
    }, []);
    const handleDelete = async (id) => {
        if (!window.confirm('Delete this asset type? This cannot be undone.')) return;
        try {
            await deleteAssetType(id);
            notify.success("Asset Type Deleted successfully");
            fetchTypes();
        } catch (err) {
            console.error(err);
            notify.error('Failed to delete asset type.');
        }
    };
    const filteredTypes = useMemo(() => {
        return type.filter((item) => {

            const keyword = searchInput.toLowerCase();

            const searchMatch =
                item.name?.toLowerCase().includes(keyword) ||
                item.description?.toLowerCase().includes(keyword);

            const typeMatch =
                typeInput === "All" ||
                item.name?.toLowerCase() === typeInput.toLowerCase();

            const transferMatch =
                transferInput === "Any" ||
                item.transferAllowed === transferInput;

            return searchMatch && typeMatch && transferMatch;
        });

    }, [type, searchInput, typeInput, transferInput]);

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
    const columns = [
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
                        size={18}
                        className="text-[#64748B] hover:text-green-600 cursor-pointer"
                        onClick={() => handleView(row.original)}
                    />
                    <SquarePen
                        size={18}
                        className="text-[#64748B] hover:text-blue-600 cursor-pointer"
                        onClick={() => openEditModal(row.original)}
                    />
                    <Trash2
                        size={18}
                        className="text-red-300 hover:text-red-600 cursor-pointer"
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
    useEffect(() => {
        table.setPageIndex(0);
    }, [searchInput, typeInput, transferInput]);
    return (
        <Container>
            <div className="space-y-6 p-6">

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Asset Types</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Assign Asset Types</h1>
                    <p className="text-[#5F6368] mt-2 max-w-3xl text-sm">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 py-2">
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
            {/* Filters */}
            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4">

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-center">
                    <div className="relative w-full border border-[#C3C6D1] rounded-lg">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                        />

                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by type, description..."
                            className="w-full pl-10 pr-3 py-2.5 outline-none rounded-lg text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        {/* Asset Type */}
                        <div className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                            <select
                                value={typeInput}
                                onChange={(e) => setTypeInput(e.target.value)}
                                className="outline-none w-full bg-transparent text-sm text-gray-600"
                            >
                                <option value="All">All Types</option>

                                {type.map((t) => (
                                    <option key={t.id || t.name} value={t.name}>
                                        {t.name}
                                    </option>
                                ))}

                            </select>
                        </div>


                        {/* Transfer Allowed */}
                        <div className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                            <select
                                value={transferInput}
                                onChange={(e) => setTransferInput(e.target.value)}
                                className="outline-none w-full bg-transparent text-sm text-gray-600"
                            >
                                <option value="Any">Any Transfer</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                        </div>

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
        </Container>
    );
};

export default AssetsType;