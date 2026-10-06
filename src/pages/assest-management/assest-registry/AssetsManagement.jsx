import { AlertTriangle, CircleCheck, Download, Eye, Loader2, Package, Plus, Search, ShieldAlert, ShieldCheck, SquarePen, Trash2, Upload, UserPen, Wallet, Wrench } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { CheckboxButton, CheckboxField } from 'react-aria-components';
import { Link, useNavigate } from 'react-router';
import AssetPreviewDetail from './AssetPreviewDetail';
import { getAllAssets, deleteAsset } from '@/services/apiServices';
import { Container } from "@/components/common/container";
import { notify } from "@/utils/toast";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { SearchBar } from '@/components/common/SearchBar';

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

const STATUS_TEXT_COLORS = {
    "In Use": "text-emerald-600",
    Disposed: "text-blue-600",
    Lost: "text-orange-600",
    Available: "text-emerald-600",
};

const StatusBadge = ({ status }) => {
    const color = STATUS_TEXT_COLORS[status] ?? "text-gray-600";
    return (
        <span className={`text-xs font-semibold whitespace-nowrap ${color}`}>
            {status || '—'}
        </span>
    );
};
const CONDITION_TEXT_COLORS = {
    excellent: "text-emerald-600",
    good: "text-blue-600",
    fair: "text-amber-600",
    bad: "text-rose-600",
};

const ConditionBadge = ({ condition }) => {
    if (!condition) return <span className="text-gray-400">—</span>;

    const normalized = String(condition).toLowerCase();
    const color = CONDITION_TEXT_COLORS[normalized] ?? "text-gray-600";
    const label = condition.charAt(0).toUpperCase() + condition.slice(1);

    return (
        <span className={`text-xs font-semibold whitespace-nowrap ${color}`}>
            {label}
        </span>
    );
};


const AssetsManagement = () => {
    const navigate = useNavigate();
    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Assets');

    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(true);
    const [assetsError, setAssetsError] = useState(null);

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [showDetails, setShowDetails] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [categoryInput, setCategoryInput] = useState("All Category");
    const [statusInput, setStatusInput] = useState("All Status");

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

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
    const openDeleteConfirm = (row) => {
        setDeleteTarget({ id: row.id, itemLabel: row.name });
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        if (deleteSaving) return;
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    };    

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteSaving(true);
        try {
            await deleteAsset(deleteTarget.id);
            closeDeleteConfirm();
            fetchAssets();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteSaving(false);
        }
    }; 

    useEffect(() => {
        fetchAssets();
    }, []);

    const stats = useMemo(() => {
        const total = assets.length;

        const warehouseCount = assets.filter(a => {
            const s = (a.status || '').toLowerCase();
            return s.includes('warehouse') || s.includes('available') || s.includes('store') || s.includes('stock') || s.includes('ready');
        }).length;

        const assignedCount = assets.filter(a => {
            const s = (a.status || '').toLowerCase();
            return s.includes('assigned') || s.includes('use') || s.includes('allocated') || s.includes('issued') || s.includes('deployed');
        }).length;

        const maintenanceCount = assets.filter(a => {
            const s = (a.status || '').toLowerCase();
            return s.includes('maintenance') || s.includes('repair') || s.includes('broken') || s.includes('damage') || s.includes('service');
        }).length;

        const expiringCount = assets.filter(a => a.warranty === 'expiring').length;

        const totalValue = assets.reduce((sum, a) => sum + Number(a.value || 0), 0);

        const warehousePercent = total > 0 ? Math.round((warehouseCount / total) * 100) : 0;
        const assignedPercent = total > 0 ? Math.round((assignedCount / total) * 100) : 0;

        return {
            total,
            warehouseCount,
            warehousePercent,
            assignedCount,
            assignedPercent,
            maintenanceCount,
            expiringCount,
            totalValue
        };
    }, [assets]);

    const statsCards = useMemo(() => [
        {
            title: "Total Assets",
            value: stats.total.toLocaleString(),
            icon: <Package size={18} />,
            iconBg: "bg-[#D5E3FF]",
            iconColor: "text-[#00376C]",
            color: "text-[#1B1B1F]",
        },
        {
            title: "Warehouse",
            value: stats.warehouseCount.toLocaleString(),
            icon: <CircleCheck size={18} />,
            iconBg: "bg-[#DCFCE7]",
            iconColor: "text-[#15803D]",
            color: "text-[#15803D]",
        },
        {
            title: "Assigned",
            value: stats.assignedCount.toLocaleString(),
            icon: <UserPen size={18} />,
            iconBg: "bg-[#D5E3FF]",
            iconColor: "text-[#265FA4]",
            color: "text-[#1B1B1F]",
        },
        {
            title: "Under Maintenance",
            value: stats.maintenanceCount.toLocaleString(),
            icon: <Wrench size={18} />,
            iconBg: "bg-[#FFEDD5]",
            iconColor: "text-[#C2410C]",
            color: "text-[#C2410C]",
        },
        {
            title: "Warranty Expiring",
            value: stats.expiringCount.toLocaleString(),
            icon: <ShieldAlert size={18} />,
            iconBg: "bg-[#FEE2E2]",
            iconColor: "text-[#BA1A1A]",
            color: "text-[#BA1A1A]",
        },
    ], [stats]);

    const formatTotalValue = (value) => {
        if (value >= 10000000) {
            const crValue = (value / 10000000).toFixed(2);
            return `₹ ${parseFloat(crValue)} Cr`;
        }
        if (value >= 100000) {
            const lakhValue = (value / 100000).toFixed(2);
            return `₹ ${parseFloat(lakhValue)} Lakh`;
        }
        return `₹ ${value.toLocaleString('en-IN')}`;
    };

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

    const columns = useMemo(() => [
        {
            id: "sno",
            header: ({ column }) => (
                <DataGridColumnHeader title="S.NO" column={column} className="my-2 text-xs" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-500 py-2">{String(row.index + 1).padStart(2, '0')}</span>
            ),
            enableSorting: false,
            size: 36,
        },
        {
            id: "assetId",
            accessorFn: (row) => row.assetId,
            header: ({ column }) => (
                <DataGridColumnHeader title="ASSET ID" column={column} className="my-2 text-xs" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-[#123B6D] leading-5 py-2">
                    {row.original.assetId}
                </div>
            ),
            enableSorting: false,
            size: 100,
        },
        {
            id: "itemName",
            accessorFn: (row) => row.itemName,
            header: ({ column }) => (
                <DataGridColumnHeader title="ITEM NAME" column={column} className="my-2 text-xs" />
            ),
            cell: ({ row }) => (
                <div title={row.original.itemName} className="font-medium text-gray-800 py-1 truncate max-w-[140px]">
                    {row.original.itemName}
                </div>
            ),
            enableSorting: false,
            size: 140,
        },
        {
            id: "category",
            accessorFn: (row) => row.category,
            header: ({ column }) => (
                <DataGridColumnHeader title="CATEGORY" column={column} className="my-2 text-xs" />
            ),
            cell: ({ row }) => (
                <span title={row.original.category} className="text-gray-600 py-1 truncate block max-w-[110px]">
                    {row.original.category}
                </span>
            ),
            enableSorting: false,
            size: 110,
        },
        {
            id: "status",
            accessorFn: (row) => row.status,
            header: ({ column }) => (
                <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
            ),
            cell: ({ row }) => (
                <StatusBadge status={row.original.status} />
            ),
            enableSorting: false,
            size: 80,
        },
        {
            id: "condition",
            accessorFn: (row) => row.condition,
            header: ({ column }) => (
                <DataGridColumnHeader title="CONDITION" column={column} className="my-2 text-xs" />
            ),
            cell: ({ row }) => (
                <ConditionBadge condition={row.original.condition} className="py-1" />
            ),
            enableSorting: false,
            size: 75,
        },
        {
            id: "value",
            accessorFn: (row) => row.value,
            header: ({ column }) => (
                <DataGridColumnHeader title="VALUE" column={column} className="my-2 text-xs" />
            ),
            cell: ({ row }) => (
                <span className="font-semibold py-1">
                    ₹{Number(row.original.value ?? 0).toLocaleString()}
                </span>
            ),
            enableSorting: false,
            size: 85,
        },
        {
            id: "warranty",
            accessorFn: (row) => row.warranty,
            header: ({ column }) => (
                <DataGridColumnHeader title="WARRANTY" column={column} className="my-2 text-xs" />
            ),
            cell: ({ row }) =>
                row.original.warranty === "valid" ? (
                    <div className="flex items-center gap-1 text-emerald-600 font-medium py-1 whitespace-nowrap">
                        Valid
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-rose-600 font-medium py-1 whitespace-nowrap">
                        Expiring Soon
                    </div>
                ),
            enableSorting: false,
            size: 90,
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1">
                    <button>
                        <Eye size={18} onClick={() => {
                            setSelectedAsset(row.original);
                            setShowDetails(true);
                        }} className="text-gray-500 hover:text-green-600 cursor-pointer" />
                    </button>

                    {canEdit && (
                        <button onClick={() => navigate(`/assets/edit-asset/${row.original.id}`)}>
                            <SquarePen
                                size={18}
                                className="text-gray-500 hover:text-blue-600 cursor-pointer"
                            />
                        </button>
                    )}

                    {canDelete && (
                        <button onClick={() => openDeleteConfirm(row.original)}>
                            <Trash2 size={18} className="text-red-300 hover:text-red-600 cursor-pointer" />
                        </button>
                    )}
                </div>
            ),
            enableSorting: false,
            size: 85,
        },
    ], [canEdit, canDelete]);

    const table = useReactTable({
        data: filteredAssets,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    useEffect(() => {
        table.setPageIndex(0);
    }, [searchInput, categoryInput, statusInput, table]);

    if (!canView) {
        return <AccessDenied pageTitle="Assets" />;
    }

    return (
       <Container>
         <div className="pt-2 pb-6 mx-auto space-y-3.5">
            <PageHeader
                title="Assets"
                actions={
                    canAdd && (
                        <HeaderActionButton to="/assets/add-asset">
                            Add Asset
                        </HeaderActionButton>
                    )
                }
            />

            <div className='flex flex-col xl:flex-row gap-4 text-[#43474F]'>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 flex-1'>
                    {
                        statsCards.map((item, index) => (
                            <div key={index} className='bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs'>
                                <div className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                                    {item.icon}
                                </div>
                                <div className="flex flex-col items-end text-right">
                                    <span className="text-xs font-semibold text-[#00376C]">{item.title}</span>
                                    <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{item.value}</span>
                                </div>
                            </div>
                        ))
                    }
                </div>
                <div className='bg-[#002246] text-white p-3.5 rounded-2xl flex items-center justify-between gap-4 shrink-0'>
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <Wallet size={18} />
                    </div>
                    <div className="flex flex-col items-end text-right">
                        <span className="text-xs font-semibold text-blue-200">Total Asset Value</span>
                        <span className="text-sm sm:text-base font-bold mt-0.5 text-white">{formatTotalValue(stats.totalValue)}</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-center">

                    {/* Search  */}
                    <SearchBar
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by type, description..."
                    />

                    {/* Right side  */}
                        <div className="grid grid-cols-2 gap-3">

                            {/* Category */}
                            <div>
                                <Select
                                    value={categoryInput}
                                    onValueChange={(value) => setCategoryInput(value)}
                                >
                                    <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl text-sm text-gray-600">
                                        <SelectValue placeholder="All Category" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {categoryOptions.map((category) => (
                                            <SelectItem
                                                key={category}
                                                value={category}
                                            >
                                                {category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status */}
                            <div>
                                <Select
                                    value={statusInput}
                                    onValueChange={(value) => setStatusInput(value)}
                                >
                                    <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl text-sm text-gray-600">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {statusOptions.map((status) => (
                                            <SelectItem
                                                key={status}
                                                value={status}
                                            >
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                    <DataGrid
                        table={table}
                        recordCount={filteredAssets.length}
                        className="rounded-2xl"
                        tableLayout={{
                            dense: true,
                            width: 'fixed',
                            cellBorder: true,
                            headerBorder: true,
                            rowBorder: true,
                        }}
                    >
                        <Card className="rounded-t-none border-t-0 rounded-2xl">
                            <CardTable className="w-full overflow-x-hidden">
                                <DataGridTable />
                            </CardTable>
                            <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
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

            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={closeDeleteConfirm}
                onConfirm={confirmDelete}
                itemLabel={deleteTarget?.itemLabel}
                saving={deleteSaving}
            />
        </div>
       </Container>
    )
}

export default AssetsManagement