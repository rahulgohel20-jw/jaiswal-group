import { ChevronRight, Eye, Plus, RotateCcw, Search, SquarePen, Trash2 } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import CreateMenuCategory from './CreateMenuCategory';

const initialData = [
    {
        id: 1,
        image: "https://placehold.co/60x60",
        name: "SOUP STATION",
        price: 0,
        sequence: 1,
        status: true,
    },
    {
        id: 2,
        image: "https://placehold.co/60x60",
        name: "STARTERS",
        price: 0,
        sequence: 2,
        status: true,
    },
    {
        id: 3,
        image: "https://placehold.co/60x60",
        name: "CHAT AND MODERN CHATS",
        price: 0,
        sequence: 3,
        status: true,
    },
    {
        id: 4,
        image: "https://placehold.co/60x60",
        name: "MEXICAN STATION",
        price: 0,
        sequence: 4,
        status: true,
    },
    {
        id: 5,
        image: "https://placehold.co/60x60",
        name: "ITALIAN STATION",
        price: 0,
        sequence: 5,
        status: false,
    },
];

const MenuCategory = () => {
    const [search, setSearch] = useState("");
    const [categories] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [openCategory, setOpenCategory] = useState(false);

    const filteredCategories = useMemo(() => {
        return categories.filter((item) =>
            item.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, categories]);

    const columns = useMemo(() => [

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
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                />
            ),

            enableSorting: false,
            size: 50,
        },


        // IMAGE
        {
            id: "image",

            accessorFn: (row) => row.image,

            header: ({ column }) => (
                <DataGridColumnHeader
                    title="IMAGE"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),

            cell: ({ row }) => (

                <img
                    src={row.original.image}
                    alt={row.original.name}
                    className="w-12 h-12 rounded-lg object-cover border"
                />

            ),

            size: 100,
        },


        // NAME
        {
            id: "name",

            accessorFn: (row) => row.name,

            header: ({ column }) => (
                <DataGridColumnHeader
                    title="NAME"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),

            cell: ({ row }) => (

                <div className="font-semibold text-gray-800">
                    {row.original.name}
                </div>

            ),

            size: 220,
        },


        // PRICE
        {
            id: "price",

            accessorFn: (row) => row.price,

            header: ({ column }) => (
                <DataGridColumnHeader
                    title="PRICE"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),

            cell: ({ row }) => (

                <span className="text-gray-700">
                    ₹ {row.original.price}
                </span>

            ),

            size: 120,
        },


        // SEQUENCE
        {
            id: "sequence",

            accessorFn: (row) => row.sequence,

            header: ({ column }) => (
                <DataGridColumnHeader
                    title="SEQUENCE"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),

            cell: ({ row }) => (

                <span className="text-gray-700">
                    {row.original.sequence}
                </span>

            ),

            size: 120,
        },


        // STATUS
        {
            id: "status",

            accessorFn: (row) => row.status,

            header: ({ column }) => (
                <DataGridColumnHeader
                    title="STATUS"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),

            cell: ({ row }) => (

                <label className="relative inline-flex cursor-pointer">

                    <input
                        type="checkbox"
                        checked={row.original.status}
                        readOnly
                        className="sr-only peer"
                    />

                    <div
                        className="
                    w-11 h-6 
                    bg-gray-300 
                    rounded-full 
                    peer 
                    peer-checked:bg-[#084E92]
                    after:absolute
                    after:top-0.5
                    after:left-0.5
                    after:h-5
                    after:w-5
                    after:bg-white
                    after:rounded-full
                    after:transition-all
                    peer-checked:after:translate-x-full
                    "
                    />

                </label>

            ),

            size: 120,
        },


        // ACTIONS
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

                <div className="flex items-center gap-3">

                    <button>
                        <Eye
                            size={18}
                            className="text-green-600 hover:text-green-800"
                        />
                    </button>


                    <button>
                        <SquarePen
                            size={18}
                            className="text-blue-600 hover:text-blue-800"
                        />
                    </button>


                    <button>
                        <Trash2
                            size={18}
                            className="text-red-500 hover:text-red-700"
                        />
                    </button>


                </div>

            ),

            enableSorting: false,
            size: 120,
        },


    ], []);

    const table = useReactTable({
        data: filteredCategories,
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
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Menu Item</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Category</span>
            </div>

            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F172A] text-start">Menu Category Master</h1>

                </div>

                <div className="flex gap-3 self-end">
                    <button
                        type="button"
                        onClick={() => setOpenCategory(true)}
                        className="px-4 py-2 bg-[#084E92] border border-[#E2E8F0] text-[#ffffff] rounded-lg flex gap-2 items-center cursor-pointer hover:bg-blue-800 transition"
                    >
                        <Plus size={16} />
                        Create New
                    </button>
                </div>
            </div>

            <div className="bg-white  py-5">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                    <div className="relative w-full md:w-96">

                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="text"
                            placeholder="Search Category..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-[#084E92]"
                        />

                    </div>

                    <p className="text-sm text-gray-500">
                        Showing {filteredCategories.length} of {categories.length} categories
                    </p>

                </div>

            </div>


            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                {loading && <p className="p-4 text-sm text-gray-500">Loading categories...</p>}
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


            <CreateMenuCategory
                open={openCategory}
                onClose={() => setOpenCategory(false)}
            />
        </div>
    )
}

export default MenuCategory
