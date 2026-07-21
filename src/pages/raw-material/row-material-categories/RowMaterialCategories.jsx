import { Blocks, ChevronRight, CircleCheck, CircleX, Clock, Eye, ListFilter, Plus, Search, SquarePen, Trash2, Upload } from 'lucide-react'
import React, { useState, useEffect, useMemo } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddRowMaterialCategoryModel from './AddRowMaterialCategoryModel';

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
const categoryData = [
    {
        id: 1,
        categoryName: "Grocery",
        typeName: "Food Category",
        status: "Active",
    },
    {
        id: 2,
        categoryName: "Dairy",
        typeName: "Food Category",
        status: "Active",
    },
    {
        id: 3,
        categoryName: "Vegetables",
        typeName: "Food Category",
        status: "Active",
    },
    {
        id: 4,
        categoryName: "Fruits",
        typeName: "Food Category",
        status: "Inactive",
    },
    {
        id: 5,
        categoryName: "Fuel",
        typeName: "Food Category",
        status: "Active",
    },

];
const RowMaterialCategories = () => {
    const [categoriesData, setCategoriesData] = useState(categoryData);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [typeFilter, setTypeFilter] = useState("Category Type");
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
    const handleReset = () => {
        setSearchTerm("");
        setStatusFilter("All Status");
        setTypeFilter("Category Type");
    };

    const stats = useMemo(() => {
        const total = categoriesData.length;
        const active = categoriesData.filter((t) => t.status === 'Active').length;
        const inactive = total - active;
        return { total, active, inactive };
    }, [categoriesData]);
    const columns = [
        {
            id: "sno",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="S.NO"
                    column={column}
                    className="text-[#43474F] font-semibold py-4"
                />
            ),
            cell: ({ row }) => (
                <span className="text-gray-500 py-2">
                    {String(row.index + 1).padStart(2, "0")}
                </span>
            ),
            enableSorting: false,
            size: 70,
        },

        {
            id: "categoryName",
            accessorFn: (row) => row.categoryName,
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="CATEGORY NAME"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2">
                    {row.original.categoryName}
                </div>
            ),
            size: 220,
        },

        {
            id: "typeName",
            accessorFn: (row) => row.typeName,
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="TYPE NAME"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2">
                    {row.original.typeName}
                </div>
            ),
            size: 220,
        },

        {
            id: "status",
            accessorFn: (row) => row.status,
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="VISIBILITY STATUS"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),
            cell: ({ row }) => (
                <StatusBadge status={row.original.status} />
            ),
            size: 180,
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
                <div className="flex items-center gap-3 py-1">
                    <button
                        type="button"
                        onClick={() => openViewModal?.(row.original)}
                    >
                        <Eye
                            size={18}
                            className="text-[#084E92] hover:text-blue-700 cursor-pointer"
                        />
                    </button>

                    <button
                        type="button"
                        onClick={() => openEditModal(row.original)}
                    >
                        <SquarePen
                            size={18}
                            className="text-gray-500 hover:text-green-600 cursor-pointer"
                        />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleDelete(row.original.id)}
                    >
                        <Trash2
                            size={18}
                            className="text-red-300 hover:text-red-600 cursor-pointer"
                        />
                    </button>
                </div>
            ),
            enableSorting: false,
            size: 120,
        },
    ];

    const filteredCategories = useMemo(() => {
        return categoriesData.filter((item) => {
            const matchesSearch =
                item.categoryName
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase());

            const matchesStatus =
                statusFilter === "All Status" ||
                item.status === statusFilter;

            const matchesType =
                typeFilter === "Category Type" ||
                item.typeName === typeFilter;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesType
            );
        });
    }, [categoriesData, searchTerm, statusFilter, typeFilter]);

    const table = useReactTable({
        data: filteredCategories,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    const STATS = [
        {
            title: "Total Category",
            value: String(stats.total),
            icon: <Blocks size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Category",
            value: String(stats.active).padStart(2, '0'),
            icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
            color: "text-[#15803D]",
        },
        {
            title: "Inactive Category",
            value: String(stats.inactive).padStart(2, '0'),
            icon: <CircleX size={22} className="text-white p-1 bg-[#6B7280] rounded" />,
            color: "text-[#1B1B1F]",
        },
    ];



    return (
        <div className='p-4 md:p-6'>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Master Data</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Raw Material Categories</span>
            </div>


            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#084E92]">Raw Material Category Master</h1>
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
                        Add Category
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
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4">
                <div className="grid grid-cols-1 xl:grid-cols-4 sm:grid-col-2 gap-4">
                    {/* Search */}
                    <div className="relative md:col-span-1">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by type name..."
                            className="w-full pl-10 py-2 border rounded-lg outline-none "
                        />
                    </div>

                    {/* Status */}
                    <p className='border rounded-lg px-3 py-2'>
                        <select className="outline-none w-full"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}>
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </p>


                    {/* Category Type */}
                    <p className='border rounded-lg px-3 py-2'>
                        <select className="w-full outline-none"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}>
                            <option>Category Type</option>
                            <option>Food Category</option>
                            <option>Fuel Category</option>
                        </select>
                    </p>

                    <div className='grid grid-cols-6 gap-3'>
                        {/* Apply */}
                        <button className="bg-[#084E92] col-span-4 text-sm text-white rounded-lg px-4 py-2 flex gap-3 justify-center items-center cursor-pointer">
                            <ListFilter size={20} />
                            Apply Filters
                        </button>

                        {/* Reset */}
                        <button onClick={handleReset} className="border col-span-2 rounded-lg px-4 py-2 cursor-pointer ">
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                {loading && <p className="p-4 text-sm text-gray-500">Loading raw material types...</p>}
                {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                <DataGrid table={table} recordCount={filteredCategories.length} className="rounded-2xl">
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

            <AddRowMaterialCategoryModel
                isOpen={showAddType}
                onClose={closeModal}
                initialData={editingType} />

        </div>
    )
}

export default RowMaterialCategories
