import {
    ChevronRight,
    CircleCheck,
    CircleX,
    Eye,
    Plus,
    Ruler,
    SquarePen,
    Trash2,
    Upload,
} from 'lucide-react'
import { SearchBar } from '@/components/common/SearchBar';
import React, { useEffect, useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import AddAssetUnitModal from './AddAssetUnitModal';
import AssetUnitDetailsModal from './AssetUnitDetailsModal';
import { getAssetUnits, getAssetUnitById, deleteAssetUnit } from '@/services/apiServices';
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

// Normalize backend shape into what the UI expects
const normalizeUnit = (u) => ({
    id: u.id,
    name: u.name,
    symbol: u.symbol,
    status: typeof u.active === 'boolean' ? (u.active ? 'Active' : 'Inactive') : (u.status || 'Inactive'),
});

const AssetUnitList = () => {
    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Measure of unit Master');

    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

    const [showAddUnit, setShowAddUnit] = useState(false);
    const [editingUnit, setEditingUnit] = useState(null);

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Status");

    const [selectedUnit, setSelectedUnit] = useState(null);
    const [showViewUnit, setShowViewUnit] = useState(false);
    const [viewLoading, setViewLoading] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);
    
    const navigate = useNavigate();

    const fetchUnits = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAssetUnits();
            const list = res?.data?.data || res?.data || [];
            setUnits(Array.isArray(list) ? list.map(normalizeUnit) : []);
        } catch (err) {
            console.error(err);
            setError('Failed to load units. Please try again.');
            notify.error("Failed to load Units. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnits();
    }, []);

    const filteredUnits = useMemo(() => {
        const term = searchText.trim().toLowerCase();

        return units.filter((u) => {
            const matchesSearch =
                !term ||
                u.name.toLowerCase().includes(term) ||
                u.symbol.toLowerCase().includes(term);

            const matchesStatus =
                statusFilter === "All Status" ||
                u.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [units, searchText, statusFilter]);

    useEffect(() => {
        setPagination((prev) => ({
            ...prev,
            pageIndex: 0,
        }));
    }, [searchText, statusFilter]);

    const activeCount = units.filter((u) => u.status === 'Active').length;
    const inactiveCount = units.length - activeCount;

    const STATS = [
        {
            title: "Total Units",
            value: String(units.length),
            icon: <Ruler size={18} />,
            iconBg: "bg-[#D5E3FF]",
            iconColor: "text-[#00376C]",
            color: "text-[#1B1B1F]",
        },
        {
            title: "Active Units",
            value: String(activeCount),
            icon: <CircleCheck size={18} />,
            iconBg: "bg-[#DCFCE7]",
            iconColor: "text-[#15803D]",
            color: "text-[#15803D]",
        },
        {
            title: "Inactive Units",
            value: String(inactiveCount).padStart(2, '0'),
            icon: <CircleX size={18} />,
            iconBg: "bg-[#FEE2E2]",
            iconColor: "text-[#DC2626]",
            color: "text-[#DC2626]",
        },
    ];

    const handleAddClick = () => {
        setEditingUnit(null);
        setShowAddUnit(true);
    };

    const handleEditClick = (unit) => {
        setEditingUnit(unit);
        setShowAddUnit(true);
    };

    const handleViewClick = async (unit) => {
        setShowViewUnit(true);
        setSelectedUnit(null);
        setViewLoading(true);
        try {
            const res = await getAssetUnitById(unit.id);
            const data = res?.data?.data || res?.data;
            setSelectedUnit(data ? normalizeUnit(data) : unit);
        } catch (err) {
            console.error(err);
            // Fall back to the row data already in hand
            setSelectedUnit(unit);
        } finally {
            setViewLoading(false);
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
            await deleteAssetUnit(deleteTarget.id);
            closeDeleteConfirm();
            fetchUnits();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteSaving(false);
        }
    };

    const columns = useMemo(() => [
        {
            id: "sno",
            header: ({ column }) => (
                <DataGridColumnHeader title="S.NO" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-500">{String(row.index + 1).padStart(2, '0')}</span>
            ),
            enableSorting: false,
            size: 36,
        },
        {
            id: "name",
            accessorFn: (row) => row.name,
            header: ({ column }) => (
                <DataGridColumnHeader title="UNIT NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-semibold text-gray-900 py-2 truncate block">{row.original.name}</div>
            ),
            enableSorting: false,
            size: 180,
        },
        {
            id: "symbol",
            accessorFn: (row) => row.symbol,
            header: ({ column }) => (
                <DataGridColumnHeader title="SYMBOL" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => <span className="text-gray-600 truncate block">{row.original.symbol}</span>,
            enableSorting: false,
            size: 120,
        },
        {
            id: "status",
            accessorFn: (row) => row.status,
            header: ({ column }) => (
                <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            enableSorting: false,
            size: 80,
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold py-4" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1 whitespace-nowrap">
                    <button type="button" onClick={() => handleViewClick(row.original)} title="View Unit">
                        <Eye size={18} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
                    </button>
                    {canEdit && (
                        <button type="button" onClick={() => handleEditClick(row.original)} title="Edit Unit">
                            <SquarePen size={18} className="text-gray-500 hover:text-green-600 cursor-pointer" />
                        </button>
                    )}
                    {canDelete && (
                        <button type="button" onClick={() => openDeleteConfirm(row.original)} title="Delete Unit">
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
        data: filteredUnits,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (!canView) {
        return <AccessDenied pageTitle="Measure of unit Master" />;
    }

    return (
       <Container>
         <div className="pt-2 pb-6 mx-auto space-y-4">
            <PageHeader
                title="Measure of Unit Master"
                actions={
                    canAdd && (
                        <HeaderActionButton onClick={handleAddClick}>
                            Add Unit
                        </HeaderActionButton>
                    )
                }
            />

            <PageErrorAlert error={error} onRetry={fetchUnits} className="my-3" />

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 text-[#43474F]">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <SearchBar
                    placeholder="Search Unit Name or Symbol..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
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

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-sm text-gray-500">Loading units...</div>
                ) : (
                    <DataGrid
                        table={table}
                        recordCount={filteredUnits.length}
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

            <AddAssetUnitModal
                isOpen={showAddUnit}
                onClose={() => setShowAddUnit(false)}
                onSaved={fetchUnits}
                initialData={editingUnit}
            />

            <AssetUnitDetailsModal
                isOpen={showViewUnit}
                onClose={() => setShowViewUnit(false)}
                unit={selectedUnit}
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

export default AssetUnitList;