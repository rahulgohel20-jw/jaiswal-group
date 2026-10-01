import { ArrowRightLeft, Building2, ChevronRight, CircleCheck, CircleX, ClipboardList, Download, Eye, MonitorSmartphone, Package, Plus, RotateCcw, SquareCheckBig, SquarePen, Trash2 } from 'lucide-react';
import { SearchBar } from '@/components/common/SearchBar';
import React, { useState, useEffect, useMemo } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddAssetTypeModal from './AddAssetTypeModal';
import AssetTypeDetailsModal from './AsssetTypeDetailsModal';
import { getAssetTypes, getAssetTypeById, deleteAssetType } from '@/services/apiServices';
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


const TruncatedCell = ({ value, widthClass = "max-w-[180px]", className = "text-gray-600" }) => (
    <span title={value} className={`block truncate ${widthClass} ${className}`}>
        {value}
    </span>
);

const TypeBadge = ({ type }) => {
    const styles = {
        Fixed: "bg-blue-100 text-blue-700",
        "Unit-to-Unit": "bg-green-100 text-green-700",
        Movable: "bg-orange-100 text-orange-700",
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[type] || 'bg-gray-100 text-gray-700'}`}>
            {type}
        </span>
    );
};

const mapAssetType = (t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    status: t.active ? "Active" : "Inactive",
     transferAllowed: t.transferAllowed,
    createdAt: t.createdAt,
});

const AssetsType = () => {
    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Assets Type Master');
    const navigate = useNavigate();
    const [type, setType] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [viewingType, setViewingType] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [typeInput, setTypeInput] = useState("All");
    const [transferInput, setTransferInput] = useState("Any");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [deleteTarget, setDeleteTarget] = useState(null);
const [deleteSaving, setDeleteSaving] = useState(false);


    const openCreateModal = () => {
        setEditingType(null);
        setShowAddModal(true);
    };

    const openEditModal = (row) => {
        setEditingType(row);
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setEditingType(null);
    };


    const handleView = async (row) => {
        setViewLoading(true);
        setViewingType(row); // instant fallback while fetching
        try {
            const res = await getAssetTypeById(row.id);
            const raw = res.data?.data ?? res.data ?? row;
            setViewingType(mapAssetType(raw));
        } catch (err) {
            console.error(err);
        } finally {
            setViewLoading(false);
        }
    };

    const handleEditFromDetails = (data) => {
        setViewingType(null);
        setEditingType(data);
        setShowAddModal(true);
    };
    const fetchTypes = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await getAssetTypes();
            const raw = res.data?.data ?? res.data?.content ?? res.data ?? [];

            setType(Array.isArray(raw) ? raw.map(mapAssetType) : []);
        } catch (err) {
            console.error(err);
            setError("Failed to load asset types");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchTypes();
    }, []);

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
        await deleteAssetType(deleteTarget.id);
        closeDeleteConfirm();
        fetchTypes();
    } catch (err) {
        console.error(err);
    } finally {
        setDeleteSaving(false);
    }
};
    const filteredTypes = useMemo(() => {
        return type.filter((item) => {

            const keyword = searchInput.toLowerCase();

            const searchMatch =
                item.name?.toLowerCase().includes(keyword) ||
                item.description?.toLowerCase().includes(keyword);

            const typeMatch =
                typeInput === "All" ||
                item.name?.toLowerCase() === typeInput.toLowerCase();

            const transferMatch =
                transferInput === "Any" ||
                item.transferAllowed === transferInput;

            return searchMatch && typeMatch && transferMatch;
        });

    }, [type, searchInput, typeInput, transferInput]);

    const STATS = [
        {
            title: "Total Asset Types",
            value: `${type.length}`,
            icon: Package,
            bg: "bg-[#D5E3FF]",
            iconColor: "text-[#00376C]",
        },
        {
            title: "Fixed Assets",
            value: `${type.filter((c) => c.name == 'fixed').length}`,
            icon: Building2,
            bg: "bg-[#EEF5FF]",
            iconColor: "text-[#00376C]",
        },
        {
            title: "Unit-to-Unit Assets",
            value: `${type.filter((c) => c.name == "unit-to-unit").length}`,
            icon: ArrowRightLeft,
            bg: "bg-[#DCFCE7]",
            iconColor: "text-[#15803D]",
        },
        {
            title: "Movable Assets",
            value: `${type.filter((c) => c.name == "movable").length}`,
            icon: MonitorSmartphone,
            bg: "bg-[#FEF3C7]",
            iconColor: "text-[#B45309]",
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
            size: 70,
        },
        {
            accessorKey: "assetType",
            header: ({ column }) => (
                <DataGridColumnHeader title="ASSET TYPE" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => <TypeBadge type={row.original.name} />,
            size: 150,
        },

        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className={`text-xs font-semibold whitespace-nowrap ${row.original.status === 'Active' ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {row.original.status || '—'}
                </span>
            ),
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-4">
                    <Eye
                        size={18}
                        className="text-[#64748B] hover:text-green-600 cursor-pointer"
                        onClick={() => handleView(row.original)}
                        title="View Asset Type"
                    />
                    {canEdit && (
                        <SquarePen
                            size={18}
                            className="text-[#64748B] hover:text-blue-600 cursor-pointer"
                            onClick={() => openEditModal(row.original)}
                            title="Edit Asset Type"
                        />
                    )}
                    {canDelete && (
                        <Trash2
                            size={18}
                            className="text-red-300 hover:text-red-600 cursor-pointer"
                            onClick={() => openDeleteConfirm(row.original)}
                            title="Delete Asset Type"
                        />
                    )}
                </div>
            ),
            enableSorting: false,
        },
    ], [canEdit, canDelete])
    const table = useReactTable({
        data: filteredTypes,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    useEffect(() => {
        table.setPageIndex(0);
    }, [searchInput, typeInput, transferInput]);

    if (!canView) {
        return <AccessDenied pageTitle="Assets Type Master" />;
    }

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                <PageHeader
                    title="Assign Asset Types"
                    actions={
                        canAdd && (
                            <HeaderActionButton onClick={openCreateModal}>
                                Add Asset Type
                            </HeaderActionButton>
                        )
                    }
                />

            <PageErrorAlert error={error} onRetry={fetchTypes} className="my-3" />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 py-4 text-[#43474F]">
                {STATS.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={index}
                            className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs"
                        >
                            <div
                                className={`w-9 h-9 rounded-xl ${item.bg} ${item.iconColor} flex items-center justify-center shrink-0`}
                            >
                                <Icon className="w-5 h-5" />
                            </div>

                            <div className="flex flex-col items-end text-right">
                                <span className="text-xs font-semibold text-[#00376C]">
                                    {item.title}
                                </span>

                                <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                                    {item.value}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Filters */}
            <div className="flex flex-col gap-4">

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-center">
                    <SearchBar
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by type, description..."
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        {/* Asset Type */}
                            <div className="border border-[#C3C6D1] rounded-xl py-0.5 my-auto">
                                <Select
                                    value={typeInput}
                                    onValueChange={(value) => setTypeInput(value)}
                                >
                                    <SelectTrigger className="w-full border-0 shadow-none focus:ring-0 text-sm text-gray-600">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="All">All Types</SelectItem>

                                        {type.map((t) => (
                                            <SelectItem
                                                key={t.id || t.name}
                                                value={t.name}
                                            >
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>


                            {/* Transfer Allowed */}
                            <div className="border border-[#C3C6D1] rounded-xl py-0.5 my-auto">
                                <Select
                                    value={transferInput}
                                    onValueChange={(value) => setTransferInput(value)}
                                >
                                    <SelectTrigger className="w-full border-0 shadow-none focus:ring-0 text-sm text-gray-600">
                                        <SelectValue placeholder="Any Transfer" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="Any">Any Transfer</SelectItem>
                                        <SelectItem value="Yes">Yes</SelectItem>
                                        <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                        </div>

                </div>

            </div>

            {/* Table */}
            <div className='w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden'>
                {loading && <p className="p-4 text-sm text-gray-500">Loading asset types...</p>}
                <DataGrid table={table} recordCount={filteredTypes.length} className="rounded-2xl">
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

            <AddAssetTypeModal
                isOpen={showAddModal}
                onClose={closeAddModal}
                onSaved={fetchTypes}
                initialData={editingType}
            />

            <AssetTypeDetailsModal
                isOpen={!!viewingType}
                onClose={() => setViewingType(null)}
                onEdit={handleEditFromDetails}
                assetType={viewingType}
                loading={viewLoading}
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

export default AssetsType;