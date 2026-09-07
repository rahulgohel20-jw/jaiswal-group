import React, { useMemo, useState } from 'react';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Search,
    Eye,
    Download,
    ArrowLeftRight,
    ClipboardList,
    CircleCheck,
    Wallet,
    ChevronRight,
} from 'lucide-react';
import { notify } from '@/utils/toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import TransferModal from './TransferModal';

/* ---------- dummy data (no API yet) ---------- */

const DUMMY_SUMMARY = {
    totalTransfers: 1248,
    totalTransfersTrend: '+12%',
    pendingApproval: 42,
    completedMtd: 896,
    transferVolume: '$2.4M',
};

const DUMMY_TRANSFERS = [
    {
        id: 1,
        itemName: 'Industrial Bearing 6204-ZZ',
        itemCategory: 'Mechanical Parts',
        transferCode: 'TRF-2024-001',
        fromOutlet: 'Main Warehouse',
        toOutlet: 'City Center Mall',
        currentStock: '2,500 Units',
        transferQuantity: '-',
        acceptedQuantity: '2,500 Units',
        status: 'Pending',
        remarks: 'Awaiting outlet confirmation',
    },
    {
        id: 2,
        itemName: 'Copper Wiring Bundles',
        itemCategory: 'Electrical Supplies',
        transferCode: 'TRF-2024-002',
        fromOutlet: 'Regional Hub A',
        toOutlet: 'North Industrial Park',
        currentStock: '150 Units',
        transferQuantity: '-',
        acceptedQuantity: '150 Units',
        status: 'In Transit',
        remarks: 'Dispatched via carrier',
    },
    {
        id: 3,
        itemName: 'Heavy Duty Casters',
        itemCategory: 'Logistics Equipment',
        transferCode: 'TRF-2024-003',
        fromOutlet: 'South Distribution Center',
        toOutlet: 'Downtown Showroom',
        currentStock: '480 Units',
        transferQuantity: '500 Units',
        acceptedQuantity: '480 Units',
        status: 'Partially Accepted',
        remarks: '20 units short on delivery',
    },
];

/* ---------- presentational helpers ---------- */

const StatCard = ({ label, value, trendLabel, trendType = 'neutral', helperText, icon: Icon, iconBg, iconColor }) => (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 flex-1 min-w-40">
        <div className="flex flex-col gap-2">
            <div
                className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                style={{ backgroundColor: iconBg }}
            >
                <Icon className="w-4 h-4" style={{ color: iconColor }} />
            </div>
            <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">{label}</p>

        </div>

        <p className="text-2xl font-bold text-[#0F172A] mt-1">{value}</p>

        {trendLabel && (
            <p
                className={`text-xs font-medium mt-1 ${trendType === 'up'
                    ? 'text-green-600'
                    : trendType === 'warn'
                        ? 'text-red-500'
                        : 'text-gray-400'
                    }`}
            >
                {trendLabel}
            </p>
        )}
        {helperText && <p className="text-xs text-gray-400 mt-1">{helperText}</p>}
    </div>
);

const StatusBadge = ({ status }) => {
    const map = {
        Pending: 'bg-amber-50 text-amber-600',
        'In Transit': 'bg-blue-50 text-blue-600',
        'Partially Accepted': 'bg-green-50 text-green-600',
    };
    const dotMap = {
        Pending: 'bg-amber-500',
        'In Transit': 'bg-blue-600',
        'Partially Accepted': 'bg-green-600',
    };
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-500'
                }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${dotMap[status] || 'bg-gray-400'}`} />
            {status}
        </span>
    );
};

const StockTransfer = () => {
    const [transfer, setTransfer] = useState(DUMMY_TRANSFERS)
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [dateRangeFilter, setDateRangeFilter] = useState('All Dates');
    const [itemTypeFilter, setItemTypeFilter] = useState('All Types');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});

    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferTarget, setTransferTarget] = useState(null);
    const [transferSaving, setTransferSaving] = useState(false);

    const handleTransferAccept = (row) => {
        setTransferTarget(row);
        setShowTransferModal(true);
    };

    const closeTransferModal = () => {
        if (transferSaving) return;
        setShowTransferModal(false);
        setTransferTarget(null);
    };

    const confirmTransferAccept = async ({ id, transferQuantity, remarks }) => {
        setTransferSaving(true);
        try {
            // await acceptStockTransfer({ id, transferQuantity, remarks });
            notify.success('Transfer accepted successfully');
            closeTransferModal();
            // refetch data here once wired to a real API
        } catch (err) {
            console.error(err);
            notify.error('Failed to accept transfer');
        } finally {
            setTransferSaving(false);
        }
    };

    const filteredTransfers = useMemo(() => {
        const term = search.trim().toLowerCase();
        return transfer.filter((row) => {
            const matchesSearch =
                !term ||
                row.itemName?.toLowerCase().includes(term) ||
                row.transferCode?.toLowerCase().includes(term) ||
                row.itemCategory?.toLowerCase().includes(term);

            const matchesStatus = statusFilter === 'All Status' || row.status === statusFilter;
            const matchesItemType =
                itemTypeFilter === 'All Types' || row.itemCategory === itemTypeFilter;
            // dateRangeFilter left as a placeholder — wire to real date logic when ready

            return matchesSearch && matchesStatus && matchesItemType;
        });
    }, [search, statusFilter, itemTypeFilter, dateRangeFilter]);

    const handleExport = () => {
        // TODO: wire this up to the real export endpoint
        notify.success('Export started');
    };

    const columns = useMemo(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                        className="w-4 h-4 cursor-pointer accent-[#005BAC] my-4"
                    />
                ),
                cell: ({ row }) => (
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="w-4 h-4 cursor-pointer accent-[#005BAC]"
                    />
                ),
                enableSorting: false,
                size: 50,
            },
            {
                id: 'itemName',
                accessorFn: (row) => row.itemName,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Item Name"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <div>
                        <div className="font-semibold text-gray-800">{row.original.itemName}</div>
                        {row.original.itemCategory && (
                            <div className="text-xs text-gray-400 mt-0.5">{row.original.itemCategory}</div>
                        )}
                    </div>
                ),
                size: 210,
            },
            {
                id: 'transferCode',
                accessorFn: (row) => row.transferCode,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Transfer Code"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700">{row.original.transferCode || '-'}</span>,
                size: 150,
            },
            {
                id: 'fromOutlet',
                accessorFn: (row) => row.fromOutlet,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="From Outlet"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700">{row.original.fromOutlet || '-'}</span>,
                size: 160,
            },
            {
                id: 'toOutlet',
                accessorFn: (row) => row.toOutlet,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="To Outlet"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700">{row.original.toOutlet || '-'}</span>,
                size: 160,
            },
            {
                id: 'currentStock',
                accessorFn: (row) => row.currentStock,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Current Stock"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700">{row.original.currentStock || '-'}</span>,
                size: 140,
            },
            {
                id: 'transferQuantity',
                accessorFn: (row) => row.transferQuantity,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Transfer Quantity"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700">{row.original.transferQuantity || '-'}</span>
                ),
                size: 150,
            },
            {
                id: 'acceptedQuantity',
                accessorFn: (row) => row.acceptedQuantity,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Accepted Quantity"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700">{row.original.acceptedQuantity || '-'}</span>
                ),
                size: 160,
            },
            {
                id: 'status',
                accessorFn: (row) => row.status,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Status"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
                size: 150,
            },
            {
                id: 'remarks',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Remarks"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <button
                        type="button"
                        title={row.original.remarks || 'No remarks'}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                        <Eye size={18} />
                    </button>
                ),
                enableSorting: false,
                size: 90,
            },
            {
                id: 'actions',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Actions"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <button
                        type="button"
                        onClick={() => handleTransferAccept(row.original)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#084E92] text-white text-xs font-medium hover:bg-blue-800 transition cursor-pointer whitespace-nowrap"
                    >
                        Transfer Accept
                    </button>
                ),
                enableSorting: false,
                size: 150,
            },
        ],
        []
    );

    const table = useReactTable({
        data: filteredTransfers,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getRowId: (row) => String(row.id),
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <Container>
            <div className="p-4 md:p-6">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Inventory</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">Stock Transfer</span>
                </div>

                {/* Header */}
                <div className='flex justify-between items-center'>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F172A]">Stock Transfer</h1>
                        <p className="text-[#43474F] text-sm mt-1">
                            Manage and accept inventory movements across organization units.
                        </p>

                    </div>
                    <button
                        type="button"
                        onClick={handleExport}
                        className="flex items-center w-max gap-2 px-3.5 py-2 h-max rounded-lg border border-[#E2E8F0] text-sm text-gray-600 bg-white hover:bg-gray-50 transition cursor-pointer"
                    >
                        <Download size={15} />
                        Export
                    </button>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <StatCard
                        label="Total Transfers"
                        value={DUMMY_SUMMARY.totalTransfers}
                        trendLabel={`${DUMMY_SUMMARY.totalTransfersTrend} vs last month`}
                        trendType="up"
                        icon={ArrowLeftRight}
                        iconBg="#EEF2FF"
                        iconColor="#4C5FD5"
                    />
                    <StatCard
                        label="Pending Approval"
                        value={DUMMY_SUMMARY.pendingApproval}
                        trendLabel="Requires immediate attention"
                        trendType="warn"
                        icon={ClipboardList}
                        iconBg="#FEECEC"
                        iconColor="#E24C4C"
                    />
                    <StatCard
                        label="Completed (MTD)"
                        value={DUMMY_SUMMARY.completedMtd}
                        helperText="Processed this month"
                        icon={CircleCheck}
                        iconBg="#E9F9F0"
                        iconColor="#1FAE5A"
                    />
                    <StatCard
                        label="Transfer Volume"
                        value={DUMMY_SUMMARY.transferVolume}
                        helperText="Total value in transit"
                        icon={Wallet}
                        iconBg="#F3F4F6"
                        iconColor="#4B5563"
                    />
                </div>

                {/* Search + Filters */}
                <div className="bg-white py-5 border border-[#C3C6D1] rounded-lg my-6 px-6 ">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div className="relative w-full">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                placeholder="Search items, categories..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full border rounded-lg pl-10 pr-4 py-2 outline-none "
                            />
                        </div>

                        <div className="grid sm:grid-cols-3 gap-3 items-center">
                            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                                <SelectTrigger className="h-10 border-[#C3C6D1] rounded-lg my-auto">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All Status">All Status</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="In Transit">In Transit</SelectItem>
                                    <SelectItem value="Partially Accepted">Partially Accepted</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={dateRangeFilter} onValueChange={(value) => setDateRangeFilter(value)}>
                                <SelectTrigger className="h-10 border-[#C3C6D1] rounded-lg my-auto">
                                    <SelectValue placeholder="Date Range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All Dates">All Dates</SelectItem>
                                    <SelectItem value="Today">Today</SelectItem>
                                    <SelectItem value="This Week">This Week</SelectItem>
                                    <SelectItem value="This Month">This Month</SelectItem>
                                    <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={itemTypeFilter} onValueChange={(value) => setItemTypeFilter(value)}>
                                <SelectTrigger className="h-10 border-[#C3C6D1] rounded-lg my-auto">
                                    <SelectValue placeholder="Item Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All Types">All Types</SelectItem>
                                    <SelectItem value="Mechanical Parts">Mechanical Parts</SelectItem>
                                    <SelectItem value="Electrical Supplies">Electrical Supplies</SelectItem>
                                    <SelectItem value="Logistics Equipment">Logistics Equipment</SelectItem>
                                </SelectContent>
                            </Select>


                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="w-full my-2 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                    <DataGrid
                        table={table}
                        recordCount={filteredTransfers.length}
                        className="rounded-2xl"
                    >
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

                <TransferModal
                    isOpen={showTransferModal}
                    onClose={closeTransferModal}
                    onConfirm={confirmTransferAccept}
                    item={transferTarget}
                    saving={transferSaving}
                />
            </div>
        </Container>
    );
};

export default StockTransfer;
