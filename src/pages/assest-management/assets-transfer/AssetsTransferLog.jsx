import { ArrowLeftRight, CalendarDays, ChevronRight, Download, Eye, RotateCcw, Search, SquarePen, Trash2, CalendarSync } from 'lucide-react';
import React, { useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useNavigate } from 'react-router';
import { Container } from "@/components/common/container";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';



const STATS = [
    {
        title: "Total Transfers",
        value: "148",
        icon: ArrowLeftRight,
        iconBg: "bg-[#D5E3FF]",
        iconColor: "text-[#00376C]",
    },
    {
        title: "Transfers This Month",
        value: "24",
        icon: CalendarDays,
        iconBg: "bg-[#D5E3FF]",
        iconColor: "text-[#00376C]",
    },
    {
        title: "Transfers Today",
        value: "05",
        icon: CalendarDays,
        iconBg: "bg-[#D5E3FF]",
        iconColor: "text-[#00376C]",
    },
];
const TRANSFER_DATA = [
    {
        transferId: "TRF-2023-001",
        assetId: "AST-2023-042",
        fromLocation: "Central Kitchen",
        toLocation: "North Wing",
        transferDate: "2023-11-24",
        approvedBy: "John Doe",
        receivedBy: "Sarah Smith",
        reason: "Operational",
    },
    {
        transferId: "TRF-2023-002",
        assetId: "AST-2023-089",
        fromLocation: "Bakery Unit",
        toLocation: "South Kitchen",
        transferDate: "2023-11-25",
        approvedBy: "Mike Ross",
        receivedBy: "Jane Doe",
        reason: "Maintenance",
    },
    {
        transferId: "TRF-2023-003",
        assetId: "AST-2023-108",
        fromLocation: "Storage Room",
        toLocation: "Production Kitchen",
        transferDate: "2023-11-25",
        approvedBy: "Emily Clark",
        receivedBy: "David Lee",
        reason: "Operational",
    },
    {
        transferId: "TRF-2023-004",
        assetId: "AST-2023-115",
        fromLocation: "Cold Storage",
        toLocation: "Main Kitchen",
        transferDate: "2023-11-26",
        approvedBy: "Mike Ross",
        receivedBy: "Jane Doe",
        reason: "Maintenance",
    },
];

const ReasonBadge = ({ type }) => {
    const styles = {
        Operational: "bg-blue-100 text-blue-700",
        Maintenance: "bg-gray-100 text-gray-700",
    };

    return (
        <span
            className={`px-3 py-1 rounded-md text-[10px] uppercase font-semibold ${styles[type]}`}
        >
            {type}
        </span>
    );
};

const AssetsTransferLog = () => {
    const [dateRange, setDateRange] = useState({
        from: undefined,
        to: undefined,
    })
    const [search, setSearch] = useState("");
    const [transferData, setTransferData] = useState(TRANSFER_DATA);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
     const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

    const navigate = useNavigate();

    const filteredTransferData = useMemo(() => {
        return TRANSFER_DATA.filter((item) => {

            const keyword = search.toLowerCase();

            const matchesSearch =
                !keyword ||
                item.transferId.toLowerCase().includes(keyword) ||
                item.assetId.toLowerCase().includes(keyword) ||
                item.approvedBy.toLowerCase().includes(keyword) ||
                item.receivedBy.toLowerCase().includes(keyword) ||
                item.fromLocation.toLowerCase().includes(keyword) ||
                item.toLocation.toLowerCase().includes(keyword);

            return matchesSearch ;
        });

    }, [search]);
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
            
            closeDeleteConfirm();
         
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteSaving(false);
        }
    };

    const columns = [
        {
            accessorKey: "transferId",
            header: ({ column }) => (
                <DataGridColumnHeader title="TRANSFER ID" column={column} />
            ),
            cell: ({ row }) => (
                <span className="font-semibold text-[#0B5CAB]">
                    {row.original.transferId}
                </span>
            ),
            size: 140,
        },

        {
            accessorKey: "fromLocation",
            header: ({ column }) => (
                <DataGridColumnHeader title="FROM LOCATION" column={column} />
            ),
            size: 140,
        },

        {
            accessorKey: "toLocation",
            header: ({ column }) => (
                <DataGridColumnHeader title="TO LOCATION" column={column} />
            ),
            size: 140,
        },

        {
            accessorKey: "transferDate",
            header: ({ column }) => (
                <DataGridColumnHeader title="TRANSFER DATE" column={column} />
            ),
            size: 140,
        },

        {
            accessorKey: "approvedBy",
            header: ({ column }) => (
                <DataGridColumnHeader title="APPROVED BY" column={column} />
            ),
            cell: ({ row }) => {
                const name = row.original.approvedBy;

                return (
                    <div className="flex items-center gap-2 my-3">
                        <span className='text-[#121C2A] font-semibold'>{name}</span>
                    </div>
                );
            },
            size: 120,
        },

        {
            accessorKey: "receivedBy",
            header: ({ column }) => (
                <DataGridColumnHeader title="RECEIVED BY" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-[#121C2A] font-semibold">{row.original.receivedBy}</span>
            ),
            size: 120,
        },

        {
            accessorKey: "reason",
            header: ({ column }) => (
                <DataGridColumnHeader title="REASON" column={column} />
            ),
            cell: ({ row }) => (
                <ReasonBadge type={row.original.reason} />
            ),
            size: 120,
        },

        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} />
            ),
            cell: ({row}) => (
                <div className="flex gap-2">
                    <button  className="text-gray-500 hover:text-green-600 cursor-pointer" >
                        <Eye size={18}/>
                    </button>

                    <button className="text-gray-500 hover:text-blue-600 cursor-pointer">
                        <SquarePen size={18}/>
                    </button>

                    <button onClick={() => openDeleteConfirm(row.original)} className="text-red-300 hover:text-red-600 cursor-pointer">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
            enableSorting: false,
            size: 120,
        },
    ];

    const table = useReactTable({
        data: filteredTransferData,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    return (
       <Container>
         <div className='p-4 mx-auto'>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span className='cursor-pointer hover:text-blue-300' onClick={() => navigate('/')}>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Asset Transfer Log</span>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
                <div>
                    <h1 className="font-bold text-[#101828] text-xl sm:text-2xl">
                        Asset Transfer Log
                    </h1>
                </div>
                <HeaderActionButton to="/assets/asset-transfer" icon={CalendarSync}>
                    Transfer New Asset
                </HeaderActionButton>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 my-4">
                {STATS.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={index}
                            className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs"
                        >
                            <div className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                                <Icon size={18} />
                            </div>
                            <div className="flex flex-col items-end text-right">
                                <span className="text-xs font-semibold text-[#00376C]">
                                    {item.title}
                                </span>

                                <span className="text-lg sm:text-xl font-bold text-[#1B1B1F] mt-0.5">
                                    {item.value}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

                    {/* Search */}

                        <div className="relative md:col-span-4">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Transfer ID, Asset ID, or Personnel..."
                                className="w-full h-11 rounded-xl border border-[#D9E2EC] pl-10 pr-4 text-sm outline-none"
                            />
                        </div>
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                <DataGrid table={table} recordCount={filteredTransferData.length} className="rounded-2xl">
                    <Card className="rounded-t-none border-t-0 rounded-2xl">
                        <CardTable>
                            <ScrollArea>
                                <DataGridTable />
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </CardTable>
                        <CardFooter className="bg-[#EFF4FF4D] border-t border-[#C3C6D1] rounded-b-2xl">
                            <DataGridPagination />
                        </CardFooter>
                    </Card>
                </DataGrid>
            </div>
        </div>
        <DeleteConfirmModal
                        isOpen={showDeleteConfirm}
                        onClose={closeDeleteConfirm}
                        onConfirm={confirmDelete}
                        itemLabel={deleteTarget?.itemLabel}
                        saving={deleteSaving}
                    />
       </Container>
    )
}

export default AssetsTransferLog
