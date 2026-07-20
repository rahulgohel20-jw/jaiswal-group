import React, { useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CheckboxButton, CheckboxField } from 'react-aria-components';
import { Link } from 'react-router';
import { ChevronRight, CircleCheck, CircleEllipsis, CircleX, ClipboardList, Download, Eye, FileText, Plus, RotateCcw, Search, SquarePen, Trash2 } from 'lucide-react';


const STATS = [
    {
        title: "TOTAL MAINTENANCE LOGS",
        value: "148",
        icon: FileText,
        bg: "bg-slate-50",
        iconColor: "text-slate-300",
    },
    {
        title: "COMPLETED SERVICES",
        value: "132",
        badge: "12% Inc.",
        badgeColor: "bg-green-100 text-green-700",
        icon: CircleCheck,
        bg: "bg-green-50",
        iconColor: "text-green-200",
    },
    {
        title: "PENDING SERVICES",
        value: "16",
        badge: "Critical",
        badgeColor: "bg-amber-100 text-amber-700",
        icon: CircleEllipsis,
        bg: "bg-orange-50",
        iconColor: "text-[#D97706]/20",
    },
    {
        title: "TODAY'S MAINTENANCE",
        value: "5",
        badge: "Scheduled",
        badgeColor: "bg-blue-100 text-blue-700",
        icon: ClipboardList,
        bg: "bg-slate-50",
        iconColor: "text-slate-300",
    },
];

const MAINTENANCE_DATA = [
    {
        assetId: "AST-2023-001",
        asset: "Industrial Oven",
        unit: "Central Kitchen",
        date: "2023-11-24",
        issue: "Heating issue",
        engineer: "John Doe",
        cost: "$150.00",
        status: "Completed",
        nextDue: "2024-05-24",
    },
    {
        assetId: "AST-2023-042",
        asset: "Walk-in Freezer",
        unit: "North Wing",
        date: "2023-11-25",
        issue: "Compressor noise",
        engineer: "Sarah Smith",
        cost: "--",
        status: "In Progress",
        nextDue: "TBD",
    },
    {
        assetId: "AST-2023-018",
        asset: "Conveyor Belt",
        unit: "Bakery Unit",
        date: "2023-11-25",
        issue: "Belt slippage",
        engineer: "Mike Ross",
        cost: "--",
        status: "Pending",
        nextDue: "--",
    },
    {
        assetId: "AST-2023-089",
        asset: "Gas Range",
        unit: "South Kitchen",
        date: "2023-11-23",
        issue: "Pilot failure",
        engineer: "John Doe",
        cost: "$85.00",
        status: "Completed",
        nextDue: "2024-03-23",
    },
    {
        assetId: "AST-2023-011",
        asset: "Dishwasher",
        unit: "Main Dining",
        date: "2023-11-22",
        issue: "Drainage block",
        engineer: "Sarah Smith",
        cost: "$120.00",
        status: "Completed",
        nextDue: "2024-04-22",
    },
];

const StatusBadge = ({ status }) => {
    const styles = {
        Completed: "bg-green-100 text-green-700",
        "In Progress": "bg-blue-100 text-blue-700",
        Pending: "bg-amber-100 text-amber-700",
    };

    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}
        >
            {status}
        </span>
    );
};

const AssetsMaintenance = () => {
    const [maintenanceData, setMaintenanceData] = useState(MAINTENANCE_DATA);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});

    const columns = [
        {
            id: "select",
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    className='my-8'
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                />
            ),
            size: 40,
        },

        {
            accessorKey: "assetId",
            header: "ASSET IDENTITY",
            cell: ({ row }) => (
                <span className="text-[#0B5CAB] font-semibold">
                    {row.original.assetId}
                </span>
            ),
            size:140,
        },

        {
            accessorKey: "asset",
            header: "DESCRIPTION",
            size:140,
        },

        {
            accessorKey: "unit",
            header: "UNIT/KITCHEN",
            size:140,
        },

        {
            accessorKey: "date",
            header: "DATE",
            size:120,
        },

        {
            accessorKey: "issue",
            header: "REPORTED ISSUE",
            cell: ({ row }) => (
                <span className="text-gray-600">
                    "{row.original.issue}"
                </span>
            ),
            size:170,
        },

        {
            accessorKey: "engineer",
            header: "ENGINEER",
            size:120,
        },

        {
            accessorKey: "cost",
            header: "SERVICE COST",
            cell: ({ row }) => (
                <span className="font-semibold text-[#084E92]">
                    {row.original.cost}
                </span>
            ),
            size:120,
        },

        {
            accessorKey: "status",
            header: "STATUS",
            cell: ({ row }) => (
                <StatusBadge status={row.original.status} />
            ),
            size:130,
        },

        {
            accessorKey: "nextDue",
            header: "NEXT DUE",
            size:120,
        },

        {
            id: "actions",
            header: "ACTIONS",
            cell: () => (
                <div className="flex gap-2 my-2">
                    <button className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center cursor-pointer">
                        <Eye size={14} className="text-blue-600" />
                    </button>

                    <button className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center cursor-pointer">
                        <SquarePen size={14} className="text-amber-500" />
                    </button>

                    <button className="w-8 h-8 rounded bg-red-50 flex items-center justify-center cursor-pointer">
                        <Trash2 size={14} className="text-red-500" />
                    </button>
                </div>
            ),
        },
    ];


    const table = useReactTable({
        data: maintenanceData,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    return (
        <div className='p-4 md:p-6'>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#002246] font-medium">Maintenance Log</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                    <h1 className="text-[32px] font-bold text-[#0B3B75]">
                        Maintenance Log
                    </h1>

                    <p className="text-sm text-[#6B7280] mt-1">
                        View and manage all maintenance records for organizational assets.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center cursor-pointer gap-2 px-4 py-2 border border-[#D8E2F0] bg-white rounded-xl text-[#0B5CAB] font-medium hover:bg-[#F8FAFC] transition">
                        <Download size={16} />
                        Export
                    </button>
                    <Link to="/assets/add-maintenance-log">
                        <button className="flex items-center cursor-pointer gap-2 px-5 py-2 bg-[#084E92] text-white rounded-xl font-medium hover:bg-[#084E92] transition">
                            <Plus size={16} />
                            Add Maintenance Log
                        </button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 my-6">
                {STATS.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={index}
                            className="bg-white rounded-2xl border p-5 shadow-sm relative"
                        >
                            <div className="flex justify-between items-start">
                                <div className='w-full'>
                                    <p className="text-xs font-semibold text-gray-500 uppercase">
                                        {item.title}
                                    </p>

                                    <div className='flex justify-between gap-5 w-full'>
                                        <h2 className="text-4xl font-bold mt-3">
                                            {item.value}
                                        </h2>

                                        {item.badge && (
                                            <span
                                                className={` mt-6 px-3 py-0.5 flex items-center justify-center rounded-full text-[11px] font-medium ${item.badgeColor}`}
                                            >
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center absolute right-3 top-3`}
                                >
                                    <Icon className={item.iconColor} size={35} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white border rounded-2xl p-5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                    <div className="md:col-span-3">
                        <label className="text-xs font-semibold">
                            Search Database
                        </label>

                        <div className="relative mt-1">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                placeholder="Asset ID, Name, Kitchen..."
                                className="w-full border rounded-lg pl-10 pr-3 py-2  outline-none"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <label className="text-xs font-semibold">
                            Status Filter
                        </label>

                        <p className='border rounded-lg px-3 py-2 mt-1'>
                            <select className="w-full outline-none">
                            <option>All Records</option>
                            <option>Completed</option>
                            <option>Pending</option>
                            <option>In Progress</option>
                        </select>
                        </p>
                    </div>

                    <div className="md:col-span-3">
                        <label className="text-xs font-semibold">
                            Service Date
                        </label>

                        <input
                            type="date"
                            className="w-full border rounded-lg px-3 py-2 mt-1  outline-none"
                        />
                    </div>

                    <div className="md:col-span-3 flex items-end gap-2">
                        <button className="flex-1 bg-[#084E92] text-white py-2 rounded-lg cursor-pointer">
                            Apply Filters
                        </button>

                        <button className="p-2 border rounded-lg">
                            <RotateCcw size={18} />
                        </button>
                    </div>
                </div>
            </div>


            
                  {/* Table */}
                  <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                    <DataGrid table={table} recordCount={maintenanceData.length} className="rounded-2xl">
                      <Card className="rounded-t-none border-t-0 rounded-2xl">
                        <CardTable>
                          <ScrollArea>
                            <DataGridTable />
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </CardTable>
                        <CardFooter className="bg-[#EFF4FF4D] border-t border-[#C3C6D1] rounded-b-2xl">
                          <DataGridPagination />
                        </CardFooter>
                      </Card>
                    </DataGrid>
                  </div>
            
        </div>
    )
}

export default AssetsMaintenance;
