import {
    Award,
    ChevronRight,
    CircleCheck,
    CircleX,
    Eye,
    Plus,
    SquarePen,
    Tag,
    Trash2,
} from 'lucide-react'
import { SearchBar } from '@/components/common/SearchBar';
import React, { useState, useEffect, useMemo } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddAssetBrandModal from './AddAssetBrandModal';
import AssetBrandDetailsModal from './AssetBrandDetailsModal';
import { getAssetBrands, getAssetBrandById, deleteAssetBrand } from '@/services/apiServices';
import { notify } from "@/utils/toast";
import { Container } from "@/components/common/container";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router';

const StatusBadge = ({ status }) => {
    const color = status === "Active" ? "text-emerald-600" : "text-gray-500";
    return (
        <span className={`text-xs font-semibold whitespace-nowrap uppercase tracking-wide ${color}`}>
            {status || '—'}
        </span>
    );
};

// Maps a raw API brand object to the shape the table/UI expects
const mapBrand = (b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    status: b.active ? "Active" : "Inactive",
    totalAssets: b.totalAssets,
    createdDate: b.createdDate,
});

const AssetBrandListing = () => {
    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Asset Brand Master');

    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [showAddBrand, setShowAddBrand] = useState(false);
    const [viewingBrand, setViewingBrand] = useState(null);
    const [editingBrand, setEditingBrand] = useState(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);
    const navigate = useNavigate();

    // Shows the cached row immediately, then refreshes with the authoritative
    // record from getById (the list payload may not carry every detail field).
    const handleViewBrand = async (row) => {
        setViewingBrand(row);
        try {
            const res = await getAssetBrandById(row.id);
            const raw = res.data?.data ?? res.data ?? null;
            if (raw) setViewingBrand(mapBrand(raw));
        } catch (err) {
            console.error(err);
            // keep showing the cached row data on failure
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
            await deleteAssetBrand(deleteTarget.id);
            closeDeleteConfirm();
            fetchBrands();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteSaving(false);
        }
    };

    const openEditModal = async (row) => {
        setEditingBrand(row);
        setShowAddBrand(true);
        try {
            const res = await getAssetBrandById(row.id);
            const raw = res.data?.data ?? res.data ?? null;
            if (raw) setEditingBrand(mapBrand(raw));
        } catch (err) {
            console.error(err);
            // keep editing with the cached row data on failure
        }
    };

    const openCreateModal = () => {
        setEditingBrand(null);
        setShowAddBrand(true);
    };

    const closeModal = () => {
        setShowAddBrand(false);
        setEditingBrand(null);
    };

    const fetchBrands = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAssetBrands();
            // Adjust this line once you confirm the actual API response shape
            const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];
            setBrands(Array.isArray(raw) ? raw.map(mapBrand) : []);
        } catch (err) {
            console.error(err);
            setError("Failed to load brands");
            notify.error("Failed to load brands");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    const filteredBrands = useMemo(() => {
        return brands.filter((b) => {
            const matchesSearch = b.name?.toLowerCase().includes(searchTerm.trim().toLowerCase());
            const matchesStatus = statusFilter === 'All Status' || b.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [brands, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const total = brands.length;
        const active = brands.filter((b) => b.status === 'Active').length;
        const inactive = total - active;
        const assetsBranded = brands.reduce((sum, b) => sum + (Number(b.totalAssets) || 0), 0);
        return { total, active, inactive, assetsBranded };
    }, [brands]);

    const STATS = [
        {
            title: "Total Brands",
            value: String(stats.total),
            icon: <Award size={18} />,
            iconBg: "bg-[#D5E3FF]",
            iconColor: "text-[#00376C]",
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Brands",
            value: String(stats.active),
            icon: <CircleCheck size={18} />,
            iconBg: "bg-[#DCFCE7]",
            iconColor: "text-[#15803D]",
            color: "text-[#15803D]",
        },
        {
            title: "Inactive Brands",
            value: String(stats.inactive),
            icon: <CircleX size={18} />,
            iconBg: "bg-[#FEE2E2]",
            iconColor: "text-[#DC2626]",
            color: "text-[#DC2626]",
        },
        {
            title: "Assets Branded",
            value: stats.assetsBranded.toLocaleString(),
            icon: <Tag size={18} />,
            iconBg: "bg-[#EDE9FE]",
            iconColor: "text-[#7C3AED]",
            color: "text-[#1B1B1F]",
        },
    ];

    const columns = useMemo(() => [
        {
            id: "sno",
            header: ({ column }) => (
                <DataGridColumnHeader title="S.NO" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-500 py-2">{String(row.index + 1).padStart(2, '0')}</span>
            ),
            enableSorting: false,
            size: 36,
        },
        {
            id: "name",
            accessorFn: (row) => row.name,
            header: ({ column }) => (
                <DataGridColumnHeader title="BRAND NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-800 py-2 first-letter:uppercase truncate block">{row.original.name}</div>
            ),
            enableSorting: false,
            size: 200,
        },
        {
            id: "status",
            accessorFn: (row) => row.status,
            header: ({ column }) => (
                <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-semibold my-3" />
            ),
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            enableSorting: false,
            size: 80,
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1 whitespace-nowrap">
                    <button type="button" onClick={() => handleViewBrand(row.original)} title="View Brand">
                        <Eye size={18} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
                    </button>
                    {canEdit && (
                        <button type="button" onClick={() => openEditModal(row.original)} title="Edit Brand">
                            <SquarePen size={18} className="text-gray-500 hover:text-green-600 cursor-pointer" />
                        </button>
                    )}
                    {canDelete && (
                        <button type="button" onClick={() => openDeleteConfirm(row.original)} title="Delete Brand">
                            <Trash2 size={18} className="text-red-300 hover:text-red-600 cursor-pointer" />
                        </button>
                    )}
                </div>
            ),
            enableSorting: false,
            size: 80,
        },
    ], [canEdit, canDelete]);

    const table = useReactTable({
        data: filteredBrands,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (!canView) {
        return <AccessDenied pageTitle="Asset Brand Master" />;
    }

    return (
       <Container>
         <div className="pt-2 pb-6 mx-auto space-y-4">
            <PageHeader
                title="Asset Brands"
                actions={
                    canAdd && (
                        <HeaderActionButton onClick={openCreateModal}>
                            Add Brand
                        </HeaderActionButton>
                    )
                }
            />

            <PageErrorAlert error={error} onRetry={fetchBrands} className="my-3" />

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 text-[#43474F]">
                {STATS.map((item) => (
                    <div key={item.title} className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                        <div className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                            {item.icon}
                        </div>
                        <div className="flex flex-col items-end text-right">
                            <span className="text-xs font-semibold text-[#00376C]">{item.title}</span>
                            <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{item.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <SearchBar
                        placeholder="Search by brand name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        wrapperClassName="md:col-span-2"
                    />

                    <Select
                            value={statusFilter}
                            onValueChange={(value) => setStatusFilter(value)}
                        >
                            <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl text-sm text-gray-600">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="All Status">
                                    All Status
                                </SelectItem>

                                <SelectItem value="Active">
                                    Active
                                </SelectItem>

                                <SelectItem value="Inactive">
                                    Inactive
                                </SelectItem>
                            </SelectContent>
                        </Select>
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                {loading && <p className="p-4 text-sm text-gray-500">Loading brands...</p>}
                <DataGrid
                    table={table}
                    recordCount={filteredBrands.length}
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
            </div>

            <AddAssetBrandModal
                isOpen={showAddBrand}
                onClose={closeModal}
                onSaved={fetchBrands}
                initialData={editingBrand}
            />
            <AssetBrandDetailsModal
                isOpen={!!viewingBrand}
                onClose={() => setViewingBrand(null)}
                brand={viewingBrand}
            />

            <DeleteConfirmModal
                    isOpen={showDeleteConfirm}
                    onClose={closeDeleteConfirm}
                    onConfirm={confirmDelete}
                    itemLabel={deleteTarget?.itemLabel}
                    saving={deleteSaving}
            />
        </div>
       </Container>
    );
};

export default AssetBrandListing;