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
import React, { useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddAssetUnitModal from './AddAssetUnitModal';

const INITIAL_UNITS = [
    { id: 1, name: "Nos", symbol: "Nos", status: "Active" },
    { id: 2, name: "Kilogram", symbol: "Kg", status: "Active" },
    { id: 3, name: "Liter", symbol: "Ltr", status: "Active" },
    { id: 4, name: "Box", symbol: "Box", status: "Active" },
    { id: 5, name: "Set", symbol: "Set", status: "Inactive" },
    { id: 6, name: "Piece", symbol: "Pc", status: "Active" },
    { id: 7, name: "Meter", symbol: "M", status: "Active" },
    { id: 8, name: "Dozen", symbol: "Dz", status: "Active" },
    { id: 9, name: "Pair", symbol: "Pr", status: "Active" },
    { id: 10, name: "Roll", symbol: "Roll", status: "Active" },
    { id: 11, name: "Pack", symbol: "Pack", status: "Active" },
    { id: 12, name: "Bag", symbol: "Bag", status: "Active" },
    { id: 13, name: "Bundle", symbol: "Bdl", status: "Active" },
    { id: 14, name: "Carton", symbol: "Ctn", status: "Active" },
    { id: 15, name: "Gram", symbol: "g", status: "Active" },
    { id: 16, name: "Milliliter", symbol: "ml", status: "Active" },
    { id: 17, name: "Ton", symbol: "T", status: "Inactive" },
    { id: 18, name: "Unit", symbol: "Unit", status: "Active" },
];

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

const AssetUnitList = () => {
    const [units, setUnits] = useState(INITIAL_UNITS);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
    const [rowSelection, setRowSelection] = useState({});
    const [showAddUnit, setShowAddUnit] = useState(false);

    // Draft filter values vs. what's actually applied to the table
    const [searchDraft, setSearchDraft] = useState('');
    const [statusDraft, setStatusDraft] = useState('All Statuses');
    const [appliedFilters, setAppliedFilters] = useState({ search: '', status: 'All Statuses' });

    const handleSaveUnit = (data) => {
        setUnits((prev) => [
            ...prev,
            {
                id: prev.length ? Math.max(...prev.map((u) => u.id)) + 1 : 1,
                name: data.name,
                symbol: data.symbol,
                status: data.status,
            },
        ]);
    };

    const applyFilters = () => {
        setAppliedFilters({ search: searchDraft, status: statusDraft });
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    };

    const resetFilters = () => {
        setSearchDraft('');
        setStatusDraft('All Statuses');
        setAppliedFilters({ search: '', status: 'All Statuses' });
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    };

    const filteredUnits = useMemo(() => {
        const term = appliedFilters.search.trim().toLowerCase();
        return units.filter((u) => {
            const matchesSearch =
                !term || u.name.toLowerCase().includes(term) || u.symbol.toLowerCase().includes(term);
            const matchesStatus = appliedFilters.status === 'All Statuses' || u.status === appliedFilters.status;
            return matchesSearch && matchesStatus;
        });
    }, [units, appliedFilters]);

    const activeCount = units.filter((u) => u.status === 'Active').length;
    const inactiveCount = units.length - activeCount;

    const STATS = [
        {
            title: "Total Units",
            value: String(units.length),
            badge: "OVERVIEW",
            badgeStyle: "bg-blue-50 text-[#00376C]",
            icon: <Ruler size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Units",
            value: String(activeCount),
            badge: "ACTIVE",
            badgeStyle: "bg-green-100 text-green-700",
            icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
            color: "text-[#15803D]",
        },
        {
            title: "Inactive Units",
            value: String(inactiveCount).padStart(2, '0'),
            badge: "INACTIVE",
            badgeStyle: "bg-amber-100 text-amber-700",
            icon: <CircleX size={22} className="text-[#B45309] p-1 bg-[#FEF3C7] rounded" />,
            color: "text-[#B45309]",
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
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1">
                    <button type="button">
                        <Eye size={18} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
                    </button>
                    <button type="button">
                        <SquarePen size={18} className="text-gray-500 hover:text-green-600 cursor-pointer" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setUnits((prev) => prev.filter((u) => u.id !== row.original.id))}
                    >
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
        <div className="p-4 md:p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Unit Master</span>
            </div>

            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#084E92]">Unit Master</h1>
                    <p className="text-[#737781] mt-1">
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
                        onClick={() => setShowAddUnit(true)}
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
                        {item.badge && (
                                <p className={`text-xs mt-1`}>
                                    {item.badge}
                                </p>
                            )}
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-[#43474F] mb-1.5 block">Search Unit</label>
                        <div className="relative border border-[#C3C6D1] rounded-lg">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                placeholder="Search Unit Name or Symbol..."
                                className="w-full min-w-0 pl-10 py-2 outline-none rounded-lg"
                                value={searchDraft}
                                onChange={(e) => setSearchDraft(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-[#43474F] mb-1.5 block">Status</label>
                        <p className="border border-[#C3C6D1] rounded-lg px-3 py-2 min-w-0">
                            <select
                                className="outline-none w-full min-w-0 bg-transparent"
                                value={statusDraft}
                                onChange={(e) => setStatusDraft(e.target.value)}
                            >
                                <option>All Statuses</option>
                                <option>Active</option>
                                <option>Inactive</option>
                            </select>
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={applyFilters}
                            className="px-4 py-2 bg-[#084E92] text-white rounded-lg font-semibold hover:bg-[#073e77] transition cursor-pointer whitespace-nowrap"
                        >
                            Apply Filter
                        </button>
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="px-4 py-2 border border-[#C3C6D1] rounded-lg text-[#43474F] hover:bg-gray-50 transition cursor-pointer bg-white whitespace-nowrap"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
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
            </div>

            <AddAssetUnitModal
                isOpen={showAddUnit}
                onClose={() => setShowAddUnit(false)}
                onSave={handleSaveUnit}
            />
        </div>
    );
};

export default AssetUnitList;