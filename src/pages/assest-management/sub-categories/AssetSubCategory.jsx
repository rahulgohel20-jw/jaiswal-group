import {
    Blocks,
    ChevronRight,
    CircleCheck,
    CircleX,
    Eye,
    Plus,
    Search,
    Sparkles,
    SquarePen,
    Trash2,
    Upload,
} from 'lucide-react'
import React, { useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddSubCategoryModal from './AddSubCategoryModal';

const STATS = [
    {
        title: "Total Sub Categories",
        value: "58",
        note: "+4 from last month",
        noteColor: "text-[#265FA4]",
        icon: <Blocks size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
        color: "text-[#1B1B1F]",
    },
    {
        title: "Active Sub Categories",
        value: "52",
        note: "89.6% of total",
        noteColor: "text-[#15803D]",
        icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
        color: "text-[#15803D]",
    },
    {
        title: "Inactive Sub Categories",
        value: "6",
        note: "Requires Review",
        noteColor: "text-[#737781]",
        icon: <CircleX size={22} className="text-white p-1 bg-[#6B7280] rounded" />,
        color: "text-[#1B1B1F]",
    },
    {
        title: "Total Assets Mapped",
        value: "2,486",
        note: "Across 12 Categories",
        noteColor: "text-[#7C3AED]",
        icon: <Sparkles size={22} className="text-[#7C3AED] p-1 bg-[#EDE9FE] rounded" />,
        color: "text-[#1B1B1F]",
    },
];

const INITIAL_SUBCATEGORIES = [
    {
        id: 1,
        parentCategory: "IT Equipment",
        name: "Laptops & Notebooks",
        description: "Standard issue corporate laptops and mobile workstations.",
        status: "Active",
    },
    {
        id: 2,
        parentCategory: "Kitchen",
        name: "Induction Hobs",
        description: "High-efficiency commercial induction units.",
        status: "Active",
    },
    {
        id: 3,
        parentCategory: "Kitchen",
        name: "Induction Hobs",
        description: "High-efficiency commercial induction units.",
        status: "Active",
    },
    {
        id: 4,
        parentCategory: "Kitchen",
        name: "Induction Hobs",
        description: "High-efficiency commercial induction units.",
        status: "Active",
    },
];

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

const AssetSubCategory = () => {
    const [subCategories, setSubCategories] = useState(INITIAL_SUBCATEGORIES);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [showAddSubCategory, setShowAddSubCategory] = useState(false);

    const handleSaveSubCategory = (data) => {
        setSubCategories((prev) => [
            ...prev,
            {
                id: prev.length ? Math.max(...prev.map((c) => c.id)) + 1 : 1,
                parentCategory: data.parentCategory,
                name: data.name,
                description: data.description,
                status: data.status,
            },
        ]);
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
            id: "parentCategory",
            accessorFn: (row) => row.parentCategory,
            header: ({ column }) => (
                <DataGridColumnHeader title="PARENT CATEGORY" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2">{row.original.parentCategory}</div>
            ),
            size: 170,
        },
        {
            id: "name",
            accessorFn: (row) => row.name,
            header: ({ column }) => (
                <DataGridColumnHeader title="SUB CATEGORY NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-1">{row.original.name}</div>
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
            size: 300,
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
            cell: () => (
                <div className="flex items-center gap-3 py-1">
                    <button type="button">
                        <Eye size={18} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
                    </button>
                    <button type="button">
                        <SquarePen size={18} className="text-gray-500 hover:text-green-600 cursor-pointer" />
                    </button>
                    <button type="button">
                        <Trash2 size={18} className="text-red-300 hover:text-red-600 cursor-pointer" />
                    </button>
                </div>
            ),
            enableSorting: false,
            size: 110,
        },
    ];

    const table = useReactTable({
        data: subCategories,
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
                <span className="text-[#084E92] font-medium">Sub Category Master</span>
            </div>

            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#084E92]">Asset Sub Categories</h1>
                    <p className="text-[#737781] mt-1">
                        Manage sub-categories under each asset category for better classification, reporting, and
                        inventory management.
                    </p>
                </div>

                <div className="flex gap-3 self-end">
                    <button type="button" className="px-4 py-2 border border-[#C3C6D1] rounded-lg flex gap-2 items-center text-[#43474F] hover:bg-gray-50 transition cursor-pointer bg-white">
                        <Upload size={16} />
                        Export
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowAddSubCategory(true)}
                        className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-[#073e77] transition"
                    >
                        <Plus size={16} />
                        Add Sub Category
                    </button>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 py-8 text-[#43474F]">
                {STATS.map((item) => (
                    <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4">
                        <div className="pb-2">{item.icon}</div>
                        <h1 className="text-sm text-[#43474F]">{item.title}</h1>
                        <h2 className={`text-xl font-bold ${item.color}`}>{item.value}</h2>
                        <p className={`text-xs mt-1 ${item.noteColor}`}>{item.note}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-center">
                    <div className="relative col-span-1 min-w-0 border border-[#C3C6D1] rounded-lg">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input placeholder="Search by name, code or description..." className="w-full min-w-0 pl-10 py-2 outline-none rounded-lg" />
                    </div>

                    <p className="border border-[#C3C6D1] rounded-lg px-3 py-2 min-w-0">
                        <select className="outline-none w-full min-w-0 bg-transparent">
                            <option>All Categories</option>
                            <option>Kitchen Equipment</option>
                            <option>IT Equipment</option>
                            <option>Office Furniture</option>
                            <option>Vehicles</option>
                        </select>
                    </p>

                    <p className="border border-[#C3C6D1] rounded-lg px-3 py-2 min-w-0">
                        <select className="outline-none w-full min-w-0 bg-transparent">
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </p>

                    <button type="button" className="bg-[#084E92] text-white rounded-lg px-4 py-2 hover:bg-[#073e77] transition cursor-pointer">
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                <DataGrid table={table} recordCount={subCategories.length} className="rounded-2xl">
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

            <AddSubCategoryModal
                isOpen={showAddSubCategory}
                onClose={() => setShowAddSubCategory(false)}
                onSave={handleSaveSubCategory}
            />
        </div>
    );
};

export default AssetSubCategory;