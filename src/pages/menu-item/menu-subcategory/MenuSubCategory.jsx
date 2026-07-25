import { ChevronRight, Eye, Plus, RotateCcw, Search, SquarePen, Trash2 } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import CreateSubCategory from './CreateSubCategory';



const initialData = [
    {
        id: 1,
        name: "Juice",
        category: "Welcome Drinks",
        status: true,
    },

];

const MenuSubCategory = () => {
    const [search, setSearch] = useState("");
    const [subCategories] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [openCategory, setOpenCategory] = useState(false);


    const columns = useMemo(() => [

        {
            id: "sno",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="S.NO"
                    column={column}
                    className="text-[#43474F] font-semibold py-6 text-xs"
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

        // NAME
        {
            id: "name",

            accessorFn: (row) => row.name,

            header: ({ column }) => (
                <DataGridColumnHeader
                    title="Name"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),

            cell: ({ row }) => (

                <div className="font-semibold text-gray-800">
                    {row.original.name}
                </div>

            ),

            size: 120,
        },

        // category
        {
            id: "category",

            accessorFn: (row) => row.category,

            header: ({ column }) => (
                <DataGridColumnHeader
                    title="Category"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),

            cell: ({ row }) => (

                <span className="text-gray-700">
                    {row.original.category}
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
                    title="Status"
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
                    title="Actions"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),


            cell: ({ row }) => (

                <div className="flex items-center gap-3">

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

    const filteredCategories = useMemo(() => {
        return subCategories.filter((item) =>
            item.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, subCategories]);

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
                <span className="text-[#084E92] font-medium">Sub Category</span>
            </div>


            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F172A] text-start">Menu Item Sub Category</h1>

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
                            placeholder="Search Sub Category..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-[#084E92]"
                        />

                    </div>

                    <p className="text-sm text-gray-500">
                        Showing {filteredCategories.length} of {subCategories.length} sub categories
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
            <CreateSubCategory
                open={openCategory}
                onClose={() => setOpenCategory(false)}
            />
        </div>
    )
}

export default MenuSubCategory
