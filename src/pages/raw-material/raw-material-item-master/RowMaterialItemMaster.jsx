import { ChevronRight, CircleCheck, CircleX, ClipboardList, Eye, ListFilter, Plus, RotateCcw, Search, SquarePen, Trash2 } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddRawMaterialItemModal from './AddRawMaterialItemModal';
import { Container } from "@/components/common/container";


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

const rawMaterialData = [
    {
        name: "Grocery",
        category: "Food Category",
        unit: "PSC(S)",
        rate: 0,
        status: "Active",
    },
    {
        name: "Grocery",
        category: "Food Category",
        unit: "PSC(S)",
        rate: 0,
        status: "Inactive",
    },
    {
        name: "Grocery",
        category: "Food Category",
        unit: "PSC(S)",
        rate: 0,
        status: "Inactive",
    },
    {
        name: "Oil",
        category: "Food Category",
        unit: "PSC(S)",
        rate: 0,
        status: "Active",
    },
    {
        name: "Oil",
        category: "Food Category",
        unit: "PSC(S)",
        rate: 0,
        status: "Active",
    },
];

const RowMaterialItemMaster = () => {
    const [itemData, setItemData] = useState(rawMaterialData);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");
    const [typeFilter, setTypeFilter] = useState("Category Type");
    const [showAddItem, setShowAddItem] = useState(false);

    const openCreateModal = () => {
        setShowAddItem(true);
    };

    const closeModal = () => {
        setShowAddItem(false);
    };

    const handleReset = () => {
        setSearchTerm("");
        setStatusFilter("All Status");
        setTypeFilter("Category Type");
    };

    const columns = [
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

        {
            accessorKey: "image",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="IMAGE"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-xs"
                />
            ),
            cell: () => (
                <img
                    src=""
                    alt="row-material"
                    className="w-12 h-12 rounded-lg object-cover"
                />
            ),
            size: 100,
        },

        {
            accessorKey: "name",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="RAW MATERIAL NAME"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-xs"
                />
            ),
        },

        {
            accessorKey: "category",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="ROW MATERIAL CATEGORY"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-xs"
                />
            ),
            size: 190,
        },

        {
            accessorKey: "unit",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="UNIT"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-xs"
                />
            ),
            size: 110,
        },

        {
            accessorKey: "rate",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="RATE"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-xs"
                />
            ),
            size: 110,
        },

        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="STATUS"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-xs"
                />
            ),
            cell: ({ row }) => (
                <StatusBadge status={row.original.status} />
            ),
        },

        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="ACTIONS"
                    column={column}
                    className="text-[#43474F] font-semibold py-4 text-xs"
                />
            ),

            cell: () => (
                <div className="flex items-center gap-3">
                    <Eye
                        size={17}
                        className="text-[#084E92] cursor-pointer"
                    />

                    <SquarePen
                        size={17}
                        className="text-gray-500 cursor-pointer"
                    />

                    <Trash2
                        size={17}
                        className="text-red-500 cursor-pointer"
                    />
                </div>
            ),
        },
    ];

    const STATS = [
        {
            title: "Total Item",
            value: `${itemData.length}`,
            icon: (
                <ClipboardList
                    size={22}
                    className="text-[#084E92] p-1 bg-[#E8F1FF] rounded"
                />
            ),
            color: 'text-[#084E92]'
        },
        {
            title: "Active Item",
            value: `${itemData.filter((i) => i.status == 'Active').length}`,
            icon: (
                <CircleCheck
                    size={22}
                    className="text-[#16A34A] p-1 bg-[#DCFCE7] rounded"
                />
            ),
            color: 'text-[#16A34A]'
        },
        {
            title: "Inactive Item",
            value: `${itemData.filter((i) => i.status == 'Inactive').length}`,
            icon: (
                <CircleX
                    size={22}
                    className="text-[#DC2626] p-1 bg-[#FEE2E2] rounded"
                />
            ),
            color: 'text-[#DC2626]'
        },
    ];
    const filteredItems = useMemo(() => {
        return itemData.filter((item) => {
            const matchesSearch =
                item.name
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase());

            const matchesStatus =
                statusFilter === "All Status" ||
                item.status.toLowerCase() === statusFilter.toLowerCase();

            const matchesType =
                typeFilter === "Category Type" ||
                item.category === typeFilter;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesType
            );
        });
    }, [itemData, searchTerm, statusFilter, typeFilter]);

    const table = useReactTable({
        data: filteredItems,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    return (
       <Container>
         <div className='p-4 md:p-6'>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Master Data</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Raw Material Items</span>
            </div>

            <div className="flex justify-between items-start flex-col lg:flex-row gap-4">
                <div>
                    <h1  className="text-2xl font-bold text-[#0F172A] text-start">
                        Raw Material Items Master
                    </h1>

                    <p className="text-sm text-gray-400 mt-1 max-w-xl">
                        Centralized inventory registry for global raw material tracking,
                        specification management, and real-time stock valuation monitoring.
                    </p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="bg-[#00376C] hover:bg-[#074486] cursor-pointer transition-colors duration-200 text-white rounded-xl px-6 py-3 flex items-center gap-2 shadow-lg"
                >
                    <Plus size={18} />
                    Add New Item
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
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

            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative md:col-span-2">
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
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                {loading && <p className="p-4 text-sm text-gray-500">Loading raw material types...</p>}
                {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                <DataGrid table={table} recordCount={filteredItems.length} className="rounded-2xl">
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

            <AddRawMaterialItemModal
                isOpen={showAddItem}
                onClose={closeModal}
            />
        </div>
       </Container>
    )
}

export default RowMaterialItemMaster
