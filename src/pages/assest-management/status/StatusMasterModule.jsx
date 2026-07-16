import React, { useState } from 'react'
import {
    ClipboardList,
    CircleCheck,
    CircleX,
    RefreshCw,
    Download,
    Plus,
    ChevronRight,
    List,
    Search,
    Trash2,
    SquarePen,
    Eye,
    Boxes,
    SlidersVertical,
    X,
} from "lucide-react";
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const STATS = [
    {
        title: "Total Statuses",
        value: "08",
        badge: "OVERVIEW",
        icon: List,
        iconBg: "bg-[#EAF3FF]",
        iconColor: "text-[#084E92]",
    },
    {
        title: "Active Statuses",
        value: "07",
        badge: "ACTIVE",
        icon: CircleCheck,
        iconBg: "bg-[#ECFDF3]",
        iconColor: "text-[#16A34A]",
    },
    {
        title: "Inactive Statuses",
        value: "01",
        badge: "INACTIVE",
        icon: CircleX,
        iconBg: "bg-[#FFF7ED]",
        iconColor: "text-[#F97316]",
    },
    {
        title: "Last Updated",
        value: "Today",
        badge: "SYNCED",
        icon: RefreshCw,
        iconBg: "bg-[#EEF4FF]",
        iconColor: "text-[#2563EB]",
    },
];

const STATUS_DATA = [
    {
        id: 1,
        srNo: "01",
        statusName: "Active",
        visibilityStatus: "Active",
    },
    {
        id: 2,
        srNo: "02",
        statusName: "Available",
        visibilityStatus: "Active",
    },
    {
        id: 3,
        srNo: "03",
        statusName: "In Use",
        visibilityStatus: "Active",
    },
    {
        id: 4,
        srNo: "04",
        statusName: "Under Maintenance",
        visibilityStatus: "Active",
    },
    {
        id: 5,
        srNo: "05",
        statusName: "Reserved",
        visibilityStatus: "Active",
    },
    {
        id: 6,
        srNo: "06",
        statusName: "Disposed",
        visibilityStatus: "Active",
    },
    {
        id: 7,
        srNo: "07",
        statusName: "Inactive",
        visibilityStatus: "Inactive",
    },
];

const VisibilityBadge = ({ status }) => (
    <span
        className={`px-3 py-1 rounded-full text-[10px] font-semibold ${status === "Active"
            ? "bg-[#DCFCE7] text-[#15803D]"
            : "bg-[#D9E3F6] text-[#6B7280]"
            }`}
    >
        {status}
    </span>
);
const StatusMasterModule = () => {
    const [statusData, setStatusData] = useState(STATUS_DATA);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusName, setStatusName] = useState("");
    const [status, setStatus] = useState("Active");

    const columns = [
        {
            id: "select",
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    className='my-4'
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
            size: 50,
        },

        {
            accessorKey: "srNo",
            header: ({ column }) => (
                <DataGridColumnHeader title="S.NO" column={column} className="font-semibold my-4" />
            ),
            size: 50,
        },

        {
            accessorKey: "statusName",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="STATUS NAME"
                    column={column}
                    className="font-semibold my-4"
                />
            ),
            cell: ({ row }) => (
                <span className="font-medium text-[#0F172A]">
                    {row.original.statusName}
                </span>
            ),
        },

        {
            accessorKey: "visibilityStatus",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="VISIBILITY STATUS"
                    column={column}
                    className="font-semibold"
                />
            ),
            cell: ({ row }) => (
                <VisibilityBadge
                    status={row.original.visibilityStatus}
                />
            ),
        },

        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="ACTIONS"
                    column={column}
                    className="font-semibold"
                />
            ),

            cell: () => (
                <div className="flex items-center gap-4">
                    <Eye
                        size={16}
                        className="text-[#265FA4] cursor-pointer"
                    />

                    <SquarePen
                        size={16}
                        className="cursor-pointer"
                    />

                    <Trash2
                        size={16}
                        className="text-red-500 cursor-pointer"
                    />
                </div>
            ),

            enableSorting: false,
        },
    ];

    const table = useReactTable({
        data: statusData,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    return (
        <div className='p-4 md:px-6'>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Status Master</span>
            </div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-[#084E92]">
                        Status Master
                    </h1>

                    <p className="text-[#737781] mt-1">
                        Streamline operational tracking with comprehensive asset status management.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white">
                        <Download size={16} />
                        Export
                    </button>

                    <button onClick={() => setShowStatusModal(true)} className="flex items-center gap-2 px-5 py-2 bg-[#084E92] text-white rounded-lg">
                        <Plus size={16} />
                        Add Status
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">
                {STATS.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={index}
                            className="bg-white border border-[#E4E8F1] rounded-3xl p-5 shadow-sm"
                        >
                            <div className="flex justify-between items-center">
                                <div
                                    className={`w-11 h-11 rounded-xl ${item.iconBg} flex items-center justify-center`}
                                >
                                    <Icon
                                        size={18}
                                        className={item.iconColor}
                                    />
                                </div>

                                <span
                                    className={`px-2 py-1 rounded-full text-[10px] font-semibold ${item.iconBg} ${item.iconColor}`}
                                >
                                    {item.badge}
                                </span>
                            </div>

                            <div className="mt-5">
                                <p className="text-xs font-semibold tracking-[2px] uppercase text-[#737781]">
                                    {item.title}
                                </p>

                                <h3 className="text-[32px] font-bold text-[#0F172A] mt-2">
                                    {item.value}
                                </h3>
                            </div>
                        </div>
                    );
                })}
            </div>


            <div className="bg-white rounded-2xl border border-[#D9DEE8] p-5 my-6">
                <div className="grid md:grid-cols-4 gap-4">

                    <div>
                        <label className="text-xs font-semibold text-[#002246]">
                            Status Name
                        </label>

                        <div className="relative mt-1 bg-[#EFF4FF] rounded-lg">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                placeholder="Search by name..."
                                className="w-full pl-10 py-2 border rounded-lg outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-[#43474F]">
                            Status
                        </label>

                        <p className='border rounded-lg px-3 py-2 mt-1 bg-[#EFF4FF]'>
                            <select className="w-full outline-none">
                                <option>All Statuses</option>
                                <option>Active</option>
                                <option>Inactive</option>
                            </select>
                        </p>
                    </div>

                    <div className='col-span-2 flex gap-8 justify-end'>
                        <div className="flex items-end justify-center px-4 py-2">
                            <button className="text-[#43474FCC] text-sm font-semibold">
                                Reset Filters
                            </button>
                        </div>

                        <div className="flex items-end">
                            <button className="w-full text-white rounded-lg px-6 py-2 bg-[#084E92]">
                                Apply Filters
                            </button>
                        </div>
                    </div>

                </div>
            </div>


            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                <DataGrid table={table} recordCount={status.length} className="rounded-2xl">
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


            {
                showStatusModal && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                            onClick={() => setShowStatusModal(false)}
                        />

                        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                            <div
                                className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start px-6 py-5 border-b border-[#E5E7EB]">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-12 h-12 rounded-xl bg-[#EEF4FF] flex items-center justify-center">
                                            <SlidersVertical
                                                size={22}
                                                className="text-[#084E92]"
                                            />
                                        </div>

                                        <div>
                                            <h2 className="text-[24px] text-[#121C2A]">
                                                Add Status
                                            </h2>

                                            <p className="text-[#6B7280]">
                                                Configure system-wide asset status settings.
                                            </p>
                                        </div>
                                    </div>

                                    <button onClick={() => setShowStatusModal(false)} className='cursor-pointer'>
                                        <X
                                            size={22}
                                            className="text-gray-500"
                                        />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-8">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block mb-2 text-sm font-medium text-[#374151]">
                                                Status Name <span className="text-red-500">*</span>
                                            </label>

                                            <input
                                                type="text"
                                                value={statusName}
                                                onChange={(e) => setStatusName(e.target.value)}
                                                placeholder="e.g. Under Maintenance"
                                                className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block mb-2 text-sm font-medium text-[#374151]">
                                                Status
                                            </label>

                                            <p className=' border border-[#D1D5DB] rounded-xl px-4 py-3 '>
                                                <select
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value)}
                                                className="w-full outline-none"
                                            >
                                                <option>Active</option>
                                                <option>Inactive</option>
                                            </select>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div>
                                        <h3 className="text-xs font-bold tracking-[2px] text-[#6B7280] mb-4">
                                            REAL-TIME PREVIEW
                                        </h3>

                                        <div className="bg-[#F5F8FF] border border-[#E5EAF5] rounded-2xl p-8">
                                            <div className="bg-white rounded-2xl p-6 flex justify-between items-center shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-[#084E920D] rounded-xl flex items-center justify-center">
                                                        <Boxes
                                                            size={22}
                                                            className="text-[#265FA4]"
                                                        />
                                                    </div>

                                                    <div>
                                                        <h4 className="text-xl text-[#1F2937]">
                                                            {statusName || "New Status"}
                                                        </h4>

                                                        <p className="text-xs uppercase tracking-[1px] text-[#9CA3AF]">
                                                            Preview Label
                                                        </p>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`px-4 py-2 rounded-full text-sm font-medium ${status === "Active"
                                                            ? "bg-[#DCFCE7] text-[#15803D]"
                                                            : "bg-[#E5EAF5] text-[#6B7280]"
                                                        }`}
                                                >
                                                    {status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="border-t bg-[#EFF4FF] border-[#C3C6D166] px-6 py-4 flex justify-between gap-4">
                                    <button
                                        onClick={() => setShowStatusModal(false)}
                                        className="px-6 py-3 border border-[#D1D5DB] rounded-xl text-[#4B5563] bg-[#FFFFFF]"
                                    >
                                        Cancel
                                    </button>

                                    <div className='flex gap-3'>
                                        <button className="px-6 py-3 border border-[#BFD5F6] bg-[#EEF4FF] text-[#084E92] rounded-xl">
                                        Save & Add Another
                                    </button>

                                    <button className="px-6 py-3 bg-[#084E92] text-white rounded-xl">
                                        Save Status
                                    </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )
            }
        </div>
    )
}

export default StatusMasterModule
