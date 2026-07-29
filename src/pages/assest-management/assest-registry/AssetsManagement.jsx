import { AlertTriangle, ChevronRight, CircleCheck, Download, Eye, Loader2, Package, Plus, Search, ShieldAlert, ShieldCheck, SquarePen, Trash2, Upload, UserPen, Wallet, Wrench } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CheckboxButton, CheckboxField } from 'react-aria-components';
import { Link, useNavigate } from 'react-router';
import AssetPreviewDetail from './AssetPreviewDetail';
import { getAllAssets, deleteAsset } from '@/services/apiServices';
import { Container } from "@/components/common/container";
import { notify } from "@/utils/toast";

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

// Normalizes list-endpoint responses that may come back as {data:[...]}, {content:[...]}, or [...]
const unwrapList = (res) => {
    const raw = res?.data?.data ?? res?.data?.content ?? res?.data ?? [];
    return Array.isArray(raw) ? raw : [];
};

const WARRANTY_SOON_DAYS = 30;

// Derives "valid" / "expiring" from a warranty end date since the API
// likely returns a date, not a precomputed label. Treat missing/unparsable
// dates as "valid" so the table doesn't flag things it isn't sure about.
const getWarrantyState = (endDate) => {
    if (!endDate) return "valid";
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) return "valid";
    const daysLeft = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= WARRANTY_SOON_DAYS ? "expiring" : "valid";
};

// Maps a raw asset record from /api/assets/getall into the shape the
// table/badges expect. Field names (categoryName, statusName, etc.) are a
// best guess based on the AddAsset form — confirm against a real response
// and adjust here if they differ.
const normalizeAsset = (a) => ({
    id: a.id,
    assetId: a.assetId ?? a.assetCode ?? `AST-${a.id}`,
    itemName: a.itemName ?? a.name ?? "—",
    category: a.categoryName ?? a.category ?? "Uncategorized",
    status: a.statusName ?? a.status ?? "Available",
    condition: (a.conditionName ?? a.condition ?? "good").toLowerCase(),
    value: a.currentValue ?? a.purchaseCost ?? a.value ?? 0,
    warranty: getWarrantyState(a.warrantyEndDate ?? a.warrantyEnd),
    activities: Array.isArray(a.activities) ? a.activities : [],
    raw: a, // keep the original record around for the detail slider
});

const StatusBadge = ({ status }) => {
    const styles = {
        "In Use": "bg-green-100 text-green-700",
        Disposed: "bg-blue-100 text-blue-700",
        Lost: "bg-orange-100 text-orange-700",
    };
    const dotStyle = {
         "In Use": "bg-[#16A34A]",
        Disposed: "bg-[#265FA4]",
        Lost: "bg-[#C2410C]",
    }
    return (
        <span
            className={`p-1 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-700"} flex gap-1 items-center justify-center`}
        >
            <p className={`w-2 h-2 rounded-full ${dotStyle[status] ?? "bg-gray-400"}`}></p>
            <p>{status}</p>
        </span>
    );
};
const ConditionBadge = ({ condition }) => {
    const styles = {
        excellent: "bg-green-50 text-green-600",
        good: "bg-gray-100 text-gray-600",
        fair: "bg-yellow-50 text-yellow-600",
        bad: "bg-red-50 text-red-600"
    };

    if (!condition) return null;

    return (
        <span
            className={`px-3 py-1 rounded-md text-sm font-medium ${styles[condition] ?? "bg-gray-100 text-gray-600"}`}
        >
            {condition.charAt(0).toUpperCase() + condition.slice(1)}
        </span>
    );
};


const AssetsManagement = () => {
    const navigate = useNavigate();

    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(true);
    const [assetsError, setAssetsError] = useState(null);

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [showDetails, setShowDetails] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [categoryInput, setCategoryInput] = useState("All Category");
    const [statusInput, setStatusInput] = useState("All Status");
    const [deleting, setDeleting] = useState(false);
    const [deletingAsset, setdeletingAsset] = useState(null);

    const fetchAssets = async () => {
        setAssetsLoading(true);
        setAssetsError(null);
        try {
            const res = await getAllAssets();

            setAssets(unwrapList(res).map(normalizeAsset));
        } catch (err) {
            console.error("Failed to fetch assets:", err);
            setAssetsError("Could not load assets. Please try again.");
        } finally {
            setAssetsLoading(false);
        }
    };

    const handleDelete = (user) => setdeletingAsset(user);

    const confirmDelete = async () => {
        if (!deletingAsset) return;
        setDeleting(true);
        try {
            await deleteAsset(deletingAsset.id);
            notify.success("Asset Deleted Successfully");
            fetchAssets();

            setdeletingAsset(null);
        } catch (err) {
            console.error(err);
            notify.error('Could not delete this Asset. Please try again.')
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    // Filter dropdown options derived from live data instead of a hardcoded list
    const categoryOptions = useMemo(
        () => ["All Category", ...new Set(assets.map((a) => a.category).filter(Boolean))],
        [assets]
    );
    const statusOptions = useMemo(
        () => ["All Status", ...new Set(assets.map((a) => a.status).filter(Boolean))],
        [assets]
    );

    const filteredAssets = useMemo(() => {
        const keyword = searchInput.toLowerCase();

        return assets.filter((item) => {
            const searchMatch =
                item.assetId?.toLowerCase().includes(keyword) ||
                item.itemName?.toLowerCase().includes(keyword) ||
                item.category?.toLowerCase().includes(keyword);

            const categoryMatch =
                categoryInput === "All Category" ||
                item.category === categoryInput;

            const statusMatch =
                statusInput === "All Status" ||
                item.status === statusInput;

            return searchMatch && categoryMatch && statusMatch;
        });
    }, [assets, searchInput, categoryInput, statusInput]);

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
            size: 40,
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
            size: 110,
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
            size: 150,
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
                    ₹{Number(row.original.value ?? 0).toLocaleString()}
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
                        }} className="text-gray-500 hover:text-green-600 cursor-pointer" />
                    </button>

                    <button onClick={() => navigate(`/assets/edit-asset/${row.original.id}`)}>
                        <SquarePen
                            size={18}
                            className="text-gray-500 hover:text-blue-600 cursor-pointer"
                        />
                    </button>

                    <button onClick={() => handleDelete(row.original)}>
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
    useEffect(() => {
        table.setPageIndex(0);
    }, [searchInput, categoryInput, statusInput, table]);
    return (
       <Container>
         <div className="p-4 md:p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Assets</span>
            </div>

            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-2xl font-bold">
                        Assets
                    </h1>

                    <p className="text-[#737781] mt-1 text-sm">
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

            {/* Filters */}
            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-center">

                    {/* Search  */}
                    <div className="relative w-full border border-[#C3C6D1] rounded-lg">
                        <Search

                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                        />

                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by type, description..."
                            className="w-full pl-10 pr-3 py-2.5 outline-none rounded-lg text-sm"
                        />
                    </div>

                    {/* Right side  */}
                    <div className="grid grid-cols-2 gap-3">

                        {/* Asset Type */}
                        <div className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                            <select
                                value={categoryInput}
                                onChange={(e) => setCategoryInput(e.target.value)}
                                className="w-full bg-transparent outline-none text-sm text-gray-600"
                            >
                                {categoryOptions.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                            <select
                                value={statusInput}
                                onChange={(e) => setStatusInput(e.target.value)}
                                className="w-full bg-transparent outline-none text-sm text-gray-600"
                            >
                                {statusOptions.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>
                </div>
            </div>
            <div className='w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden'>
                {assetsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-gray-400 bg-white">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading assets...</span>
                    </div>
                ) : assetsError ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 bg-white">
                        <p className="text-sm text-red-600">{assetsError}</p>
                        <button
                            onClick={fetchAssets}
                            className="px-4 py-1.5 text-sm rounded-lg border border-[#084E92] text-[#084E92] cursor-pointer bg-white"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
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
                )}
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

            {deletingAsset && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-50"
                        onClick={() => setdeletingAsset(null)}
                    />

                    <div className="fixed inset-0 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-100 shadow-lg">
                            <h3 className="text-lg font-semibold mb-2">
                                Delete Asset
                            </h3>

                            <p className="text-gray-600 mb-5">
                                Are you sure you want to delete{" "}
                                <span className="font-medium">
                                    {deletingAsset.itemName}
                                </span>
                                ?
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setdeletingAsset(null)}
                                    className="px-4 py-2 border rounded-lg"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"
                                >
                                    {deleting && (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    )}
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
       </Container>
    )
}

export default AssetsManagement