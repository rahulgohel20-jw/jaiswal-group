import {
    ChevronRight,
    CircleCheck,
    CircleX,
    Eye,
    Plus,
    Ruler,
    Search,
    SquarePen,
    Trash2,
    Upload,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddAssetUnitModal from './AddAssetUnitModal';
import AssetUnitDetailsModal from './AssetUnitDetailsModal';
import { getAssetUnits, getAssetUnitById, deleteAssetUnit } from '@/services/apiServices';
import { notify } from "@/utils/toast";
import { Container } from "@/components/common/container";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const StatusBadge = ({ status }) => {
    const styles = {
        Active: "text-green-700",
        Inactive: "text-gray-600",
    };
    return (
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${styles[status]}`}>
            {status}
        </span>
    );
};

// Normalize backend shape into what the UI expects
const normalizeUnit = (u) => ({
    id: u.id,
    name: u.name,
    symbol: u.symbol,
    status: typeof u.active === 'boolean' ? (u.active ? 'Active' : 'Inactive') : (u.status || 'Inactive'),
});

const AssetUnitList = () => {
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
    const [rowSelection, setRowSelection] = useState({});

    const [showAddUnit, setShowAddUnit] = useState(false);
    const [editingUnit, setEditingUnit] = useState(null);

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");

    const [selectedUnit, setSelectedUnit] = useState(null);
    const [showViewUnit, setShowViewUnit] = useState(false);
    const [viewLoading, setViewLoading] = useState(false);

        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [deleteTarget, setDeleteTarget] = useState(null);
const [deleteSaving, setDeleteSaving] = useState(false);

    const fetchUnits = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAssetUnits();
            const list = res?.data?.data || res?.data || [];
            setUnits(Array.isArray(list) ? list.map(normalizeUnit) : []);
        } catch (err) {
            console.error(err);
            setError('Failed to load units. Please try again.');
            notify.error("Failed to load Units. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnits();
    }, []);

    const filteredUnits = useMemo(() => {
        const term = searchText.trim().toLowerCase();

        return units.filter((u) => {
            const matchesSearch =
                !term ||
                u.name.toLowerCase().includes(term) ||
                u.symbol.toLowerCase().includes(term);

            const matchesStatus =
                statusFilter === "All Status" ||
                u.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [units, searchText, statusFilter]);

    useEffect(() => {
        setPagination((prev) => ({
            ...prev,
            pageIndex: 0,
        }));
    }, [searchText, statusFilter]);

    const activeCount = units.filter((u) => u.status === 'Active').length;
    const inactiveCount = units.length - activeCount;

    const STATS = [
        {
            title: "Total Units",
            value: String(units.length),
            badge: "OVERVIEW",
            icon: <Ruler size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Units",
            value: String(activeCount),
            badge: "ACTIVE",
            icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
            color: "text-[#15803D]",
        },
        {
            title: "Inactive Units",
            value: String(inactiveCount).padStart(2, '0'),
            badge: "INACTIVE",
            icon: <CircleX size={22} className="text-[#B45309] p-1 bg-[#FEF3C7] rounded" />,
            color: "text-[#B45309]",
        },
    ];

    const handleAddClick = () => {
        setEditingUnit(null);
        setShowAddUnit(true);
    };

    const handleEditClick = (unit) => {
        setEditingUnit(unit);
        setShowAddUnit(true);
    };

    const handleViewClick = async (unit) => {
        setShowViewUnit(true);
        setSelectedUnit(null);
        setViewLoading(true);
        try {
            const res = await getAssetUnitById(unit.id);
            const data = res?.data?.data || res?.data;
            setSelectedUnit(data ? normalizeUnit(data) : unit);
        } catch (err) {
            console.error(err);
            // Fall back to the row data already in hand
            setSelectedUnit(unit);
        } finally {
            setViewLoading(false);
        }
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
        await deleteAssetUnit(deleteTarget.id);
        closeDeleteConfirm();
        fetchUnits();
    } catch (err) {
        console.error(err);
    } finally {
        setDeleteSaving(false);
    }
};

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
            id: "sno",
            header: ({ column }) => (
                <DataGridColumnHeader title="S.NO" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-500">{String(row.index + 1).padStart(2, '0')}</span>
            ),
            enableSorting: false,
            size: 70,
        },
        {
            id: "name",
            accessorFn: (row) => row.name,
            header: ({ column }) => (
                <DataGridColumnHeader title="UNIT NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-[#084E92] py-2">{row.original.name}</div>
            ),
            size: 200,
        },
        {
            id: "symbol",
            accessorFn: (row) => row.symbol,
            header: ({ column }) => (
                <DataGridColumnHeader title="SYMBOL" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => <span className="text-gray-600">{row.original.symbol}</span>,
            size: 160,
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
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold py-4" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1">
                    <button type="button" onClick={() => handleViewClick(row.original)}>
                        <Eye size={18} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
                    </button>
                    <button type="button" onClick={() => handleEditClick(row.original)}>
                        <SquarePen size={18} className="text-gray-500 hover:text-green-600 cursor-pointer" />
                    </button>
                    <button type="button" onClick={() => openDeleteConfirm(row.original)}>
                        <Trash2 size={18} className="text-red-300 hover:text-red-600 cursor-pointer" />
                    </button>
                </div>
            ),
            enableSorting: false,
            size: 110,
        },
    ];

    const table = useReactTable({
        data: filteredUnits,
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
                <span className="text-[#084E92] font-medium">Measure of unit Master</span>
            </div>

            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Measure of unit Master</h1>
                    <p className="text-[#737781] mt-1 text-sm">
                        Manage all measurement units used throughout the Asset Management module.
                    </p>
                </div>

                <div className="flex gap-3 self-end">
                    <button type="button" className="px-4 py-2 border border-[#C3C6D1] rounded-lg flex gap-2 items-center text-[#43474F] hover:bg-gray-50 transition cursor-pointer bg-white">
                        <Upload size={16} />
                        Export
                    </button>
                    <button
                        type="button"
                        onClick={handleAddClick}
                        className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-[#073e77] transition"
                    >
                        <Plus size={16} />
                        Add Unit
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
                        {item.badge && <p className="text-xs mt-1">{item.badge}</p>}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">

                <div className="relative border border-[#C3C6D1] rounded-lg">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                    />

                    <input
                        placeholder="Search Unit Name or Symbol..."
                        className="w-full pl-10 py-2 outline-none rounded-lg"
                        value={searchText}
                        onChange={(e) => { setSearchText(e.target.value); }}
                    />
                </div>

                    <Select
                        value={statusFilter}
                        onValueChange={(value) => setStatusFilter(value)}
                    >
                        <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg text-sm text-gray-600">
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

            {error && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-sm text-gray-500">Loading units...</div>
                ) : (
                    <DataGrid table={table} recordCount={filteredUnits.length} className="rounded-2xl">
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
                )}
            </div>

            <AddAssetUnitModal
                isOpen={showAddUnit}
                onClose={() => setShowAddUnit(false)}
                onSaved={fetchUnits}
                initialData={editingUnit}
            />

            <AssetUnitDetailsModal
                isOpen={showViewUnit}
                onClose={() => setShowViewUnit(false)}
                unit={selectedUnit}
                loading={viewLoading}
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

export default AssetUnitList;