import { AlertTriangle, CircleCheck, Download, Eye, Package, Plus, Search, ShieldAlert, ShieldCheck, SquarePen, Trash2, Upload, UserPen, Wallet, Wrench } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CheckboxButton, CheckboxField } from 'react-aria-components';
import { Link } from 'react-router';
import AssetPreviewDetail from './AssetPreviewDetail';
const STATS = [
    {
        title: "Total Assets",
        value: "1,250",
        badge: "Live",
        icon: <Package size={25} className='text-[#00376C] p-1 bg-[#D5E3FF] rounded' />,
        color: "text-[#43474F]",
        bgColor: "bg-[#fffff]"
    },
    {
        title: "Available",
        value: "845",
        badge: "67%",
        icon: <CircleCheck size={25} className='text-[#15803D] p-1 bg-[#DCFCE7] rounded' />,
        color: "text-[#15803D]",
        bgColor: "bg-[#DCFCE7]"
    },
    {
        title: "Assigned",
        value: "310",
        badge: "25%",
        icon: <UserPen size={25} className='text-[#265FA4] p-1 bg-[#D5E3FF] rounded' />,
        color: "text-[#265FA4]",
        bgColor: "bg-[#D5E3FF]"
    },
    {
        title: "Under Maintenance",
        value: "52",
        badge: "ACTION",
        icon: <Wrench size={25} className='text-[#C2410C] p-1 bg-[#FFEDD5] rounded' />,
        color: "text-[#C2410C]",
        bgColor: "bg-[#FFEDD5]"
    },
    {
        title: "Warranty Expiring",
        value: "18",
        badge: "URGENT",
        icon: <ShieldAlert size={25} className='text-[#BA1A1A] p-1 bg-[#FEE2E2] rounded' />,
        color: "text-[#BA1A1A]",
        bgColor: "bg-[#FEE2E2]"
    },
];

const INITIAL_ASSETS = [
    {
        id: 1,
        assetId: "AST-000125",
        itemName: "Chest Freezer",
        category: "Kitchen Equipment",
        status: "Available",
        condition: "excellent",
        value: 48500,
        warranty: "valid",

        activities: [
            {
                title: "Last Audited",
                subtitle: "05 Jan 2024 • Site Audit Team",
                status: "Verified",
                active: true,
            },
            {
                title: "Assigned to HQ - Floor 2",
                subtitle: "12 Oct 2023 • Rajesh Kumar",
            },
            {
                title: "Registered",
                subtitle: "11 Oct 2023 • System Entry",
            },
            {
                title: "Created",
                subtitle: "10 Oct 2023 • Admin User",
            },
        ],
    },

    {
        id: 2,
        assetId: "AST-000142",
        itemName: "Dell Latitude",
        category: "IT Equipment",
        status: "Assigned",
        condition: "good",
        value: 65000,
        warranty: "expiring",

        activities: [
            {
                title: "Assigned to Anita Desai",
                subtitle: "15 Jan 2024 • IT Department",
                status: "Active",
                active: true,
            },
            {
                title: "Registered",
                subtitle: "10 Jan 2024 • System Entry",
            },
            {
                title: "Created",
                subtitle: "08 Jan 2024 • Admin User",
            },
        ],
    },

    {
        id: 3,
        assetId: "AST-000143",
        itemName: "Dell Latitude",
        category: "IT Equipment",
        status: "Maintenance",
        condition: "fair",
        value: 65000,
        warranty: "expiring",

        activities: [
            {
                title: "Sent For Maintenance",
                subtitle: "20 Feb 2024 • Support Team",
                status: "In Progress",
                active: true,
            },
            {
                title: "Issue Reported",
                subtitle: "18 Feb 2024 • User Complaint",
            },
            {
                title: "Assigned",
                subtitle: "12 Jan 2024 • IT Department",
            },
            {
                title: "Created",
                subtitle: "08 Jan 2024 • Admin User",
            },
        ],
    },
];


const StatusBadge = ({ status }) => {
    const styles = {
        Available: "bg-green-100 text-green-700",
        Assigned: "bg-blue-100 text-blue-700",
        Maintenance: "bg-orange-100 text-orange-700",
        Expiring: "bg-[#FEE2E2] text-[#BA1A1A]"
    };
    const dotStyle = {
        Available: "bg-[#16A34A]",
        Assigned: "bg-[#265FA4]",
        Maintenance: "bg-[#C2410C]",
        Expiring: "bg-[#BA1A1A]"
    }
    return (
        <span
            className={`p-1 rounded-full text-xs font-medium ${styles[status]} flex gap-1 items-center justify-center`}
        >
            <p className={`w-2 h-2 rounded-full ${dotStyle[status]}`}></p>
            <p>{status}</p>
        </span>
    );
};
const ConditionBadge = ({ condition }) => {
    const styles = {
        excellent: "bg-blue-50 text-blue-600",
        good: "bg-gray-100 text-gray-600",
        fair: "bg-yellow-50 text-yellow-600",
    };

    return (
        <span
            className={`px-3 py-1 rounded-md text-sm font-medium ${styles[condition]}`}
        >
            {condition.charAt(0).toUpperCase() + condition.slice(1)}
        </span>
    );
};


const AssetsManagement = () => {
    const [assets, setAssets] = useState(INITIAL_ASSETS);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [showDetails, setShowDetails] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [categoryInput, setCategoryInput] = useState("All");
    const [statusInput, setStatusInput] = useState("All");
    const [purchaseDateInput, setPurchaseDateInput] = useState("");
    const [expiryDateInput, setExpiryDateInput] = useState("");
    const [filters, setFilters] = useState({
        search: "",
        category: "All",
        status: "All",
        purchaseDate: "",
        expiryDate: "",
    });

    const applyFilters = () => {
        setFilters({
            search: searchInput,
            category: categoryInput,
            status: statusInput,
            purchaseDate: purchaseDateInput,
            expiryDate: expiryDateInput,
        });
    };

    const filteredAssets = useMemo(() => {

        return assets.filter((asset) => {

            const searchMatch =
                asset.assetId.toLowerCase().includes(filters.search.toLowerCase()) ||
                asset.itemName.toLowerCase().includes(filters.search.toLowerCase()) ||
                asset.category.toLowerCase().includes(filters.search.toLowerCase());


            const categoryMatch =
                filters.category === "All" ||
                asset.category === filters.category;


            const statusMatch =
                filters.status === "All" ||
                asset.status === filters.status;

            const purchaseMatch = true;
            const expiryMatch = true;

            return (
                searchMatch &&
                categoryMatch &&
                statusMatch &&
                purchaseMatch &&
                expiryMatch
            );
        });

    }, [assets, filters]);

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
            size: 50,
        },
        {
            id: "assetId",
            accessorFn: (row) => row.assetId,
            header: ({ column }) => (
                <DataGridColumnHeader title="ASSET ID" column={column} className="text-[#43474F] font-semibold my-4" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-[#123B6D] leading-5 py-2">
                    {row.original.assetId}
                </div>
            ),
            size: 120,
        },

        {
            id: "itemName",
            accessorFn: (row) => row.itemName,
            header: ({ column }) => (
                <DataGridColumnHeader title="ITEM NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-medium text-gray-800 py-1">
                    {row.original.itemName}
                </div>
            ),
            size: 150,
        },

        {
            id: "category",
            accessorFn: (row) => row.category,
            header: ({ column }) => (
                <DataGridColumnHeader title="CATEGORY" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-600 py-1">
                    {row.original.category}
                </span>
            ),
            size: 170,
        },

        {
            id: "status",
            accessorFn: (row) => row.status,
            header: ({ column }) => (
                <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <StatusBadge status={row.original.status} />
            ),
            size: 140,
        },

        {
            id: "condition",
            accessorFn: (row) => row.condition,
            header: ({ column }) => (
                <DataGridColumnHeader title="CONDITION" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <ConditionBadge condition={row.original.condition} className="py-1" />
            ),
            size: 150,
        },

        {
            id: "value",
            accessorFn: (row) => row.value,
            header: ({ column }) => (
                <DataGridColumnHeader title="VALUE" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="font-semibold py-1">
                    ₹{row.original.value.toLocaleString()}
                </span>
            ),
            size: 120,
        },

        {
            id: "warranty",
            accessorFn: (row) => row.warranty,
            header: ({ column }) => (
                <DataGridColumnHeader title="WARRANTY" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) =>
                row.original.warranty === "valid" ? (
                    <div className="flex items-center gap-1 text-green-600 font-medium py-1">
                        <ShieldCheck size={16} />
                        Valid
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-red-600 font-medium py-1">
                        <AlertTriangle size={16} />
                        Expiring Soon
                    </div>
                ),
            size: 160,
        },

        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold py-1" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1">
                    <button>
                        <Eye size={18} onClick={() => {
                            setSelectedAsset(row.original);
                            setShowDetails(true);
                        }} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
                    </button>

                    <button>
                        <SquarePen
                            size={18}
                            className="text-gray-500 hover:text-green-600 cursor-pointer"
                        />
                    </button>

                    <button>
                        <Trash2 size={18} className="text-red-300 hover:text-red-600 cursor-pointer" />
                    </button>
                </div>
            ),
            enableSorting: false,
            size: 130,
        },
    ];

    const table = useReactTable({
        data: filteredAssets,
        columns,
        state: { pagination, rowSelection, },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#084E92]">
                        Assets
                    </h1>

                    <p className="text-[#737781] mt-1">
                        Manage, monitor, assign, and maintain all organizational assets
                        from a centralized dashboard.
                    </p>
                </div>

                <div className="flex gap-3 self-end">
                    <button className="px-4 py-2 border rounded-lg flex gap-2 items-center">
                        <Download size={16} />
                        Export
                    </button>
                    <Link to="/assets/add-asset">
                        <button className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center cursor-pointer">
                            <Plus size={16} />
                            Add Asset
                        </button>
                    </Link>
                </div>
            </div>

            <div className='flex flex-col xl:flex-row gap-6 py-8 text-[#43474F]'>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 flex-1'>
                    {
                        STATS.map((item) => (
                            <div className='border border-[#C3C6D1] rounded-2xl p-4'>
                                <div className='flex justify-between items-center pb-2'>
                                    <p>{item.icon}</p>

                                </div>
                                <h1 className="text-sm text-[#43474F]">{item.title}</h1>
                                <h2 className="text-xl font-semibold text-gray-900 mt-0.5">{item.value}</h2>
                                <p className={`text-xs mt-1 ${item.color}`}>{item.badge}</p>
                            </div>
                        ))
                    }
                </div>
                <div className='bg-[#002246]  text-white p-6 rounded-2xl flex flex-col gap-2 shrink-0'>
                    <Wallet size={20} />
                    <p>Total Asset Value</p>
                    <p>₹ 5.8 Cr</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="relative col-span-2 border border-[#C3C6D1] rounded-lg">
                        <Search 
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            placeholder="Search by Asset ID, Name, Brand..." className="w-full pl-10 py-2 outline-none" />
                    </div>
                    <p className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                        <select value={categoryInput}
                            onChange={(e) => setCategoryInput(e.target.value)}
                            className="outline-none w-full">
                            <option value="All">All Categories</option>
                            <option value="Kitchen Equipment">Kitchen Equipment</option>
                            <option value="IT Equipment">IT Equipment</option>
                        </select>
                    </p>


                    <p className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                        <select value={statusInput}
                            onChange={(e) => setStatusInput(e.target.value)}
                            className="outline-none w-full">
                            <option value="All">All Status</option>
                            <option value="Available">Available</option>
                            <option value="Assigned">Assigned</option>
                            <option value="Maintenance">Maintenance</option>
                        </select>
                    </p>
                </div>

                <div className='flex flex-col lg:flex-row gap-4 lg:justify-between'>
                    <div className='flex flex-col sm:flex-row gap-4'>
                        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                            <label>Purchase Date:</label>
                            <input value={purchaseDateInput}
                                onChange={(e) => setPurchaseDateInput(e.target.value)}
                                type="date" className='outline-none px-2 py-1 border border-[#C3C6D1] rounded-lg' />
                        </div>
                        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                            <label>Expiry Date:</label>
                            <input value={expiryDateInput}
                                onChange={(e) => setExpiryDateInput(e.target.value)}
                                type="date" className='outline-none px-2 py-1 border border-[#C3C6D1] rounded-lg' />
                        </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                        <button onClick={() => {
                            setSearchInput("");
                            setCategoryInput("All");
                            setStatusInput("All");
                            setPurchaseDateInput("");
                            setExpiryDateInput("");

                            setFilters({
                                search: "",
                                category: "All",
                                status: "All",
                                purchaseDate: "",
                                expiryDate: ""
                            });
                        }} className=" text-[#265FA4] cursor-pointer rounded-lg px-4 py-2 w-full sm:w-auto">
                            Reset Filters
                        </button>
                        <button onClick={applyFilters} className="bg-[#084E92] cursor-pointer text-white rounded-lg px-4 py-2 w-full sm:w-auto">
                            Apply Filter
                        </button>
                    </div>
                </div>
            </div>

            <div className='w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden'>
                <DataGrid table={table} recordCount={filteredAssets.length} className="rounded-2xl">

                    {/* Table Card */}
                    <Card className="rounded-t-none border-t-0 rounded-2xl">
                        <CardTable>
                            <ScrollArea>
                                <DataGridTable />
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </CardTable>
                        <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1]  rounded-b-2xl">
                            <DataGridPagination />
                        </CardFooter>
                    </Card>
                </DataGrid>
            </div>
            {showDetails && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                        onClick={() => setShowDetails(false)}
                    />

                    <div className="fixed right-0 top-0 h-screen w-100 bg-white z-50">
                        <AssetPreviewDetail
                            asset={selectedAsset}
                            onClose={() => setShowDetails(false)}
                        />
                    </div>
                </>
            )}
        </div>
    )
}

export default AssetsManagement
