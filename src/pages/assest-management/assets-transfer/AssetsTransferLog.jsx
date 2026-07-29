import { ArrowLeftRight, CalendarDays, ChevronRight, Download, Eye, RotateCcw, Search, SquarePen, Trash2, CalendarSync } from 'lucide-react';
import React, { useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Container } from "@/components/common/container";

import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from 'react-router';
import { fi } from '@faker-js/faker';



const STATS = [
    {
        title: "Total Transfers",
        value: "148",
        icon: ArrowLeftRight,
        iconBg: "bg-blue-50",
        iconColor: "text-[#0B5CAB]",
    },
    {
        title: "Transfers This Month",
        value: "24",
        icon: CalendarDays,
        iconBg: "bg-blue-50",
        iconColor: "text-[#0B5CAB]",
    },
    {
        title: "Transfers Today",
        value: "05",
        icon: CalendarDays,
        iconBg: "bg-blue-50",
        iconColor: "text-[#0B5CAB]",
    },
];
const TRANSFER_DATA = [
    {
        transferId: "TRF-2023-001",
        assetId: "AST-2023-042",
        fromLocation: "Central Kitchen",
        toLocation: "North Wing",
        transferDate: "2023-11-24",
        approvedBy: "John Doe",
        receivedBy: "Sarah Smith",
        reason: "Operational",
    },
    {
        transferId: "TRF-2023-002",
        assetId: "AST-2023-089",
        fromLocation: "Bakery Unit",
        toLocation: "South Kitchen",
        transferDate: "2023-11-25",
        approvedBy: "Mike Ross",
        receivedBy: "Jane Doe",
        reason: "Maintenance",
    },
    {
        transferId: "TRF-2023-003",
        assetId: "AST-2023-108",
        fromLocation: "Storage Room",
        toLocation: "Production Kitchen",
        transferDate: "2023-11-25",
        approvedBy: "Emily Clark",
        receivedBy: "David Lee",
        reason: "Operational",
    },
    {
        transferId: "TRF-2023-004",
        assetId: "AST-2023-115",
        fromLocation: "Cold Storage",
        toLocation: "Main Kitchen",
        transferDate: "2023-11-26",
        approvedBy: "Mike Ross",
        receivedBy: "Jane Doe",
        reason: "Maintenance",
    },
];

const ReasonBadge = ({ type }) => {
    const styles = {
        Operational: "bg-blue-100 text-blue-700",
        Maintenance: "bg-gray-100 text-gray-700",
    };

    return (
        <span
            className={`px-3 py-1 rounded-md text-[10px] uppercase font-semibold ${styles[type]}`}
        >
            {type}
        </span>
    );
};

const AssetsTransferLog = () => {
    const [dateRange, setDateRange] = useState({
        from: undefined,
        to: undefined,
    })
    const [search, setSearch] = useState("");
    const [transferData, setTransferData] = useState(TRANSFER_DATA);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});

    const filteredTransferData = useMemo(() => {
        return TRANSFER_DATA.filter((item) => {

            const keyword = search.toLowerCase();

            const matchesSearch =
                !keyword ||
                item.transferId.toLowerCase().includes(keyword) ||
                item.assetId.toLowerCase().includes(keyword) ||
                item.approvedBy.toLowerCase().includes(keyword) ||
                item.receivedBy.toLowerCase().includes(keyword) ||
                item.fromLocation.toLowerCase().includes(keyword) ||
                item.toLocation.toLowerCase().includes(keyword);

            const matchesDate =
                !dateRange.from ||
                !dateRange.to ||
                (
                    new Date(item.transferDate) >= dateRange.from &&
                    new Date(item.transferDate) <= dateRange.to
                );

            return matchesSearch && matchesDate;
        });

    }, [search, dateRange]);
    const columns = [
        {
            id: "select",
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    className='my-6'
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                />
            ),
            enableSorting: false,
            size: 30,
        },

        {
            accessorKey: "transferId",
            header: ({ column }) => (
                <DataGridColumnHeader title="TRANSFER ID" column={column} />
            ),
            cell: ({ row }) => (
                <span className="font-semibold text-[#0B5CAB]">
                    {row.original.transferId}
                </span>
            ),
            size: 140,
        },

        {
            accessorKey: "assetId",
            header: ({ column }) => (
                <DataGridColumnHeader title="ASSET ID" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-[#121C2A] font-semibold">{row.original.assetId}</span>
            ),
            size: 140,
        },

        {
            accessorKey: "fromLocation",
            header: ({ column }) => (
                <DataGridColumnHeader title="FROM LOCATION" column={column} />
            ),
            size: 140,
        },

        {
            accessorKey: "toLocation",
            header: ({ column }) => (
                <DataGridColumnHeader title="TO LOCATION" column={column} />
            ),
            size: 140,
        },

        {
            accessorKey: "transferDate",
            header: ({ column }) => (
                <DataGridColumnHeader title="TRANSFER DATE" column={column} />
            ),
            size: 140,
        },

        {
            accessorKey: "approvedBy",
            header: ({ column }) => (
                <DataGridColumnHeader title="APPROVED BY" column={column} />
            ),
            cell: ({ row }) => {
                const name = row.original.approvedBy;

                return (
                    <div className="flex items-center gap-2 my-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0B5CAB] flex items-center justify-center text-xs font-bold">
                            {name
                                .split(" ")
                                .map((i) => i[0])
                                .join("")}
                        </div>

                        <span className='text-[#121C2A] font-semibold'>{name}</span>
                    </div>
                );
            },
            size: 120,
        },

        {
            accessorKey: "receivedBy",
            header: ({ column }) => (
                <DataGridColumnHeader title="RECEIVED BY" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-[#121C2A] font-semibold">{row.original.receivedBy}</span>
            ),
            size: 120,
        },

        {
            accessorKey: "reason",
            header: ({ column }) => (
                <DataGridColumnHeader title="REASON" column={column} />
            ),
            cell: ({ row }) => (
                <ReasonBadge type={row.original.reason} />
            ),
            size: 120,
        },

        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} />
            ),
            cell: () => (
                <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center cursor-pointer">
                        <Eye size={15} className="text-[#0B5CAB]" />
                    </button>

                    <button className="w-8 h-8 rounded-lg bg-[#FFF7E8] flex items-center justify-center cursor-pointer">
                        <SquarePen size={15} className="text-[#D97706]" />
                    </button>

                    <button className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center cursor-pointer">
                        <Trash2 size={15} className="text-red-500" />
                    </button>
                </div>
            ),
            enableSorting: false,
            size: 120,
        },
    ];

    const table = useReactTable({
        data: filteredTransferData,
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
         <div className='p-4 md:p-6'>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Asset Transfer Log</span>
            </div>

            <div className='flex justify-between flex-col gap-5 sm:flex-row'>
                <div>
                    <h1 className="text-2xl font-bold">
                        Asset Transfer Log
                    </h1>

                    <p className="text-[#6B7280] mt-1 w-[80%] md:w-full text-sm">
                        View and manage all asset transfer records across kitchens and operational
                        locations with high-fidelity tracking.
                    </p>
                </div>
                <div className='flex gap-5'>
                    <button className="flex items-center cursor-pointer gap-2 h-11 px-5 border rounded-xl text-[#0B5CAB] hover:bg-gray-50 transition-colors duration-200">
                        <Download size={16} />
                        Export
                    </button>
                    <Link
                        to="/assets/asset-transfer"
                        className="flex items-center cursor-pointer gap-2 h-11 px-5 rounded-xl bg-[#0B5CAB] text-white font-medium hover:bg-[#094b8f] transition"
                    >
                        <CalendarSync size={16} />
                        Transfer New Asset
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 my-8">
                {STATS.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={index}
                            className="bg-white rounded-2xl border p-4 shadow-sm"
                        >
                            <div className="w-6 h-6 rounded bg-[#EAF3FF] flex items-center justify-center mb-2">
                                <Icon size={15} className="text-[#0B5CAB]" />
                            </div>
                            <div>
                                <p className="text-sm text-[#43474F] pt-2">
                                    {item.title}
                                </p>

                                <h2 className="text-xl font-bold">
                                    {item.value}
                                </h2>
                            </div>


                        </div>
                    );
                })}
            </div>

            <div className="bg-white border border-[#E6EAF2] rounded-2xl p-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

                    {/* Search */}

                        <div className="relative md:col-span-3">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Transfer ID, Asset ID, or Personnel..."
                                className="w-full h-11 rounded-xl border border-[#D9E2EC] pl-10 pr-4 text-sm outline-none"
                            />
                        </div>

                    {/* Date Range 50% */}
                    <div className='md:col-span-1'>

                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="w-full h-11 border border-[#D9E2EC] rounded-xl px-4 flex items-center gap-3">
                                    <CalendarIcon className="w-4 h-4 text-gray-500" />

                                    <span className="text-sm">
                                        {dateRange.from
                                            ? `${format(dateRange.from, "MMM dd, yyyy")} ${dateRange.to
                                                ? `- ${format(dateRange.to, "MMM dd, yyyy")}`
                                                : ""
                                            }`
                                            : "Select Date Range"}
                                    </span>
                                </button>
                            </PopoverTrigger>

                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="range"
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                <DataGrid table={table} recordCount={filteredTransferData.length} className="rounded-2xl">
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
       </Container>
    )
}

export default AssetsTransferLog
