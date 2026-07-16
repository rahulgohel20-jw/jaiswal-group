import { ArrowRightLeft, Building2, CircleCheck, CircleX, ClipboardList, Download, Eye, MonitorSmartphone, Package, Plus, RotateCcw, Search, SquareCheckBig, SquarePen, Trash2 } from 'lucide-react';
import React, { useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CheckboxButton, CheckboxField } from 'react-aria-components';
import { Link } from 'react-router';
const STATS = [
    {
        title: "Total Asset Types",
        value: "3",
        icon: Package,
        bg: "bg-[#F5F7FB]",
        iconColor: "text-[#245AA8]",
        borderColor: "",
    },
    {
        title: "Fixed Assets",
        value: "145",
        icon: Building2,
        bg: "bg-[#EEF5FF]",
        iconColor: "text-[#245AA8]",
        borderColor: "border-r-4 border-[#245AA8]",
    },
    {
        title: "Unit-to-Unit Assets",
        value: "82",
        icon: ArrowRightLeft,
        bg: "bg-[#ECFDF3]",
        iconColor: "text-[#10B981]",
        borderColor: "border-r-4 border-[#10B981]",
    },
    {
        title: "Movable Assets",
        value: "54",
        icon: MonitorSmartphone,
        bg: "bg-[#FFF3ED]",
        iconColor: "text-[#F97316]",
        borderColor: "border-r-4 border-[#F97316]",
    },
];

const INITIAL_TYPE = [
    {
        id: 1,
        assetType: "Fixed",
        description: "Permanent structural installations",
        status: "Active",
    },
    {
        id: 2,
        assetType: "Unit-to-Unit",
        description: "Appliances used in production units",
        status: "Active",
    },
    {
        id: 3,
        assetType: "Movable",
        description: "Laptops and mobile devices",
        status: "Active",
    },
];
// Truncates long text within a fixed-width box, revealing the full value on hover
const TruncatedCell = ({ value, widthClass = "max-w-[180px]", className = "text-gray-600" }) => (
    <span title={value} className={`block truncate ${widthClass} ${className}`}>
        {value}
    </span>
);
const StatusBadge = ({ status }) => {
    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${status === "Active"
                ? "bg-[#DCFCE7] text-[#15803D]"
                : "bg-[#D9E3F6] text-[#737781]"
                }`}
        >
            {status.toUpperCase()}
        </span>
    );
};

const TypeBadge = ({ type }) => {
    const styles = {
        Fixed: "bg-blue-100 text-blue-700",
        "Unit-to-Unit": "bg-green-100 text-green-700",
        Movable: "bg-orange-100 text-orange-700",
    };

    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[type]}`}
        >
            {type}
        </span>
    );
};
const AssetsType = () => {
    const [type, setType] = useState(INITIAL_TYPE);
    const [rowSelection, setRowSelection] = useState({});
    const [showAddModal, setShowAddModal] = useState(false);

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
                <DataGridColumnHeader
                    title="ASSET TYPE"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),

            cell: ({ row }) => (
                <TypeBadge type={row.original.assetType} />
            ),
            size: 150,
        },

        {
            accessorKey: "description",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="DESCRIPTION"
                    column={column}
                    className="text-[#43474F] font-semibold my-4"
                />
            ),

            cell: ({ row }) => (
                <TruncatedCell
                    value={row.original.description}
                    widthClass="max-w-[220px]"
                />
            ),
            size: 220,
        },

        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="STATUS"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),

            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-[#16A34A] text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A] my-4" />
                    {row.original.status}
                </div>
            ),
        },

        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="ACTIONS"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),

            cell: ({ row }) => (
                <div className="flex items-center gap-4">
                    <Eye
                        size={16}
                        className="text-[#64748B] hover:text-[#084E92] cursor-pointer"
                    />

                    <SquarePen
                        size={16}
                        className="text-[#64748B] hover:text-green-600 cursor-pointer"
                    />

                    <Trash2
                        size={16}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                    />
                </div>
            ),

            enableSorting: false,
        },
    ];
    const table = useReactTable({
        data: type,
        columns,
        state: { rowSelection, },
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
                    <h1 className="text-3xl font-bold text-[#0B3B75]">
                        Assign Asset Types
                    </h1>

                    <p className="text-[#5F6368] mt-2 max-w-3xl">
                        Configure classification rules and transfer protocols for organizational assets.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-[#C3C6D1] rounded-lg text-[#084E92] bg-[#EAF3FF] hover:bg-gray-50">
                        <Download size={16} />
                        Export
                    </button>

                    <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2 bg-[#084E92] text-white rounded-lg hover:bg-[#063b6d]">
                        <Plus size={16} />
                        Add Asset Type
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {STATS.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={index}
                            className="bg-white border border-[#C3C6D1] rounded-2xl p-5 shadow-sm"
                        >
                            <div className="flex items-center gap-4 justify-between">

                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-[#5F6368]">
                                            {item.title}
                                        </p>

                                        {item.badge && (
                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#DCFCE7] text-[#16A34A]">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="text-3xl font-bold text-[#0F172A]">
                                        {item.value}
                                    </h2>
                                </div>

                                <div
                                    className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center self-end`}
                                >
                                    <Icon className={item.iconColor} size={22} />
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
                            Global Search
                        </label>

                        <input
                            placeholder="Type, Description..."
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-xs font-semibold">
                            Asset Type
                        </label>

                        <select className="w-full border rounded-lg px-3 py-2">
                            <option>All Types</option>
                            <option>Fixed</option>
                            <option>Unit-to-Unit</option>
                            <option>Movable</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-xs font-semibold">
                            Transfer Allowed
                        </label>

                        <select className="w-full border rounded-lg px-3 py-2">
                            <option>Any</option>
                        </select>
                    </div>

                    <div className="md:col-span-3 flex items-end gap-1">
                        <button className="bg-[#084E92] text-white px-6 py-2 rounded-lg">
                            Apply Filter
                        </button>

                        <button className='bg-[#E6EEFF] p-2 rounded'><RotateCcw size={22} /></button>
                    </div>
                </div>
            </div>
            <div className='w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden'>
                <DataGrid table={table} recordCount={type.length} className="rounded-2xl">

                    {/* Table Card */}
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


            {showAddModal && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-[10px] z-40"
                        onClick={() => setShowAddModal(false)}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="bg-white rounded-2xl shadow-xl w-full max-w-190"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between p-5 border-b">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#DCEBFF] flex items-center justify-center">
                                        <Package size={18} className="text-[#084E92]" />
                                    </div>

                                    <div>
                                        <h2 className="font-bold text-lg text-[#1F2937]">
                                            Add Asset Type
                                        </h2>

                                        <p className="text-sm text-[#6B7280]">
                                            Configure how assets are assigned, transferred, and managed.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="text-gray-500 hover:text-black text-xl"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-5">
                                <h3 className="text-[#084E92] font-semibold text-sm mb-4">
                                    01 Asset Type Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Asset Type */}
                                    <div>
                                        <label className="block text-sm mb-2">
                                            Asset Type Name*
                                        </label>

                                        <select className="w-full border border-[#D6DCE5] rounded-lg px-3 py-3 outline-none bg-[#F5F8FF]">
                                            <option>Select Type</option>
                                            <option>Fixed</option>
                                            <option>Unit-to-Unit</option>
                                            <option>Movable</option>
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-sm mb-2">
                                            Status
                                        </label>

                                        <select className="w-full border border-[#D6DCE5] rounded-lg px-3 py-3 outline-none bg-[#F5F8FF]">
                                            <option>Active</option>
                                            <option>Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mt-4">
                                    <label className="block text-sm mb-2">
                                        Description
                                    </label>

                                    <textarea
                                        rows={4}
                                        placeholder="Enter purpose of this asset category..."
                                        className="w-full border border-[#D6DCE5] rounded-lg px-3 py-3 outline-none resize-none bg-[#F5F8FF]"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t p-5 flex justify-between">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-5 py-2 border border-red-200 text-red-500 rounded-lg"
                                >
                                    Cancel
                                </button>

                                <div className="flex gap-3">
                                    <button className="px-5 py-2 border border-[#084E92] text-[#084E92] rounded-lg font-medium">
                                        Save & Add Another
                                    </button>

                                    <button className="px-5 py-2 bg-[#084E92] text-white rounded-lg font-medium">
                                        Save Asset Type
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default AssetsType
