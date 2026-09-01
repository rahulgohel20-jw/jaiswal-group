import { BadgeDollarSign, CalendarDays, ChevronRight, CirclePlus, ClipboardList, Download, Eye, Plus, RotateCcw, Search, SquarePen, Trash2 } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Link } from 'react-router';
import { Container } from "@/components/common/container";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

const STATS = [
    {
        title: "Total Records",
        value: "1,248",
        icon: ClipboardList,
        iconBg: "bg-blue-50",
        iconColor: "text-[#0B5CAB]",
        badge: "↗ 12.5%",
        badgeClass: "text-green-700",
    },
    {
        title: "Assets Sold",
        value: "852",
        subText: "$42.5k Rev",
        icon: BadgeDollarSign,
        iconBg: "bg-blue-50",
        iconColor: "text-[#0B5CAB]",
        subTextColor: "text-[#059669]"
    },
    {
        title: "Scrapped",
        value: "396",
        icon: Trash2,
        iconBg: "bg-red-50",
        iconColor: "text-red-500",
        badge: "High Volume",
        badgeClass: "text-red-500",
    },
    {
        title: "This Month",
        value: "42",
        subText: "5 pending",
        icon: CalendarDays,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-500",
        subTextColor: "text-[#D97706]"
    },
];
const DISPOSAL_DATA = [
    {
        assetId: "AST-9901-K",
        assetName: "Commercial convection oven",
        model: "OVC-2000",
        kitchen: "Downtown Central",
        date: "Oct 12, 2023",
        method: "Sale",
        saleValue: "$1,250.00",
        approvedBy: "Marcus Chen",
    },
    {
        assetId: "AST-8422-C",
        assetName: "Refrigeration Unit XL",
        model: "COOL-MAX-5",
        kitchen: "Northside Express",
        date: "Oct 11, 2023",
        method: "Scrap",
        saleValue: "$0.00",
        approvedBy: "Sarah Jenkins",
    },
    {
        assetId: "AST-4512-D",
        assetName: "Excess Furniture Set",
        model: "FURN-2023",
        kitchen: "Corporate Office",
        date: "Oct 09, 2023",
        method: "Donation",
        saleValue: "$0.00",
        approvedBy: "David Miller",
    },
    {
        assetId: "AST-2121-S",
        assetName: "Delivery Bike #4",
        model: "BIKE-004",
        kitchen: "East Side Hub",
        date: "Oct 05, 2023",
        method: "Sale",
        saleValue: "$550.00",
        approvedBy: "Eleanor Vance",
    },
];
const DisposalBadge = ({ type }) => {
    const styles = {
        Sale: "bg-green-100 text-green-700",
        Scrap: "bg-slate-100 text-slate-600",
        Donation: "bg-blue-100 text-blue-700",
    };

    return (
        <span
            className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase ${styles[type]}`}
        >
            {type}
        </span>
    );
};
const AssetsDisposalLog = () => {
    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Asset Disposal');
    const [disposalData, setDisposalData] = useState(DISPOSAL_DATA);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [searchText, setSearchText] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

    const openDeleteConfirm = (row) => {
        setDeleteTarget({
            id: row.assetId,
            itemLabel: `${row.assetName} (${row.assetId})`,
        });
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
            setDisposalData((prev) => prev.filter((item) => item.assetId !== deleteTarget.id));
            closeDeleteConfirm();
         
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteSaving(false);
        }
    };

    const columns = useMemo(() => [
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
            accessorKey: "assetId",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="ASSET ID"
                    column={column}
                />
            ),
            cell: ({ row }) => (
                <span className="font-semibold text-[#0B5CAB]">
                    {row.original.assetId}
                </span>
            ),
            size: 130,
        },

        {
            accessorKey: "assetName",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="ASSET NAME"
                    column={column}
                />
            ),
            cell: ({ row }) => (
                <div>
                    <p className="font-semibold text-gray-900 leading-tight">
                        {row.original.assetName}
                    </p>

                    <p className="text-xs text-gray-500">
                        {row.original.model}
                    </p>
                </div>
            ),
            size: 240,
        },

        {
            accessorKey: "kitchen",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="KITCHEN"
                    column={column}
                />
            ),
            size: 160,
        },

        {
            accessorKey: "date",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="DISPOSAL DATE"
                    column={column}
                />
            ),
            size: 120,
        },

        {
            accessorKey: "method",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="METHOD"
                    column={column}
                />
            ),
            cell: ({ row }) => (
                <DisposalBadge type={row.original.method} />
            ),
            size: 110,
        },

        {
            accessorKey: "saleValue",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="SALE VALUE"
                    column={column}
                />
            ),
            cell: ({ row }) => (
                <span className="font-semibold text-[#111827]">
                    {row.original.saleValue}
                </span>
            ),
            size: 110,
        },

        {
            accessorKey: "approvedBy",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="APPROVED BY"
                    column={column}
                />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                        {row.original.approvedBy}
                    </span>
                </div>
            ),
            size: 150,
        },

        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="ACTIONS"
                    column={column}
                />
            ),
            cell: ({row}) => (
                <div className="flex items-center gap-2">
                    <button className="text-gray-500 hover:text-green-600 cursor-pointer" title="View Disposal">
                        <Eye
                           size={18}
                        />
                    </button>

                    {canEdit && (
                        <button className="text-gray-500 hover:text-blue-600 cursor-pointer" title="Edit Disposal">
                            <SquarePen
                               size={18}
                            />
                        </button>
                    )}

                    {canDelete && (
                        <button onClick={() => openDeleteConfirm(row.original)} className="text-red-300 hover:text-red-600 cursor-pointer" title="Delete Disposal">
                            <Trash2
                               size={18}
                            />
                        </button>
                    )}
                </div>
            ),
            enableSorting: false,
            size: 120,
        },
    ], [canEdit, canDelete]);

    const filteredDisposalData = useMemo(() => {
        return disposalData.filter((item) => {

            const keyword = searchText.toLowerCase();

            const matchesSearch =
                !keyword ||
                item.assetId.toLowerCase().includes(keyword) ||
                item.assetName.toLowerCase().includes(keyword) ||
                item.approvedBy.toLowerCase().includes(keyword) ||
                item.kitchen.toLowerCase().includes(keyword);

            const matchesDate =
                !dateFilter ||
                item.date.toLowerCase().includes(dateFilter.toLowerCase());

            return matchesSearch && matchesDate;
        });

    }, [disposalData, searchText, dateFilter]);

    const table = useReactTable({
        data: filteredDisposalData,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (!canView) {
        return <AccessDenied pageTitle="Asset Disposal" />;
    }

    return (
       <Container>
         <div className='p-4 md:p-6'>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Asset Disposal Log</span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">
                        Asset Disposal Log
                    </h1>

                    <p className="text-[#6B7280] mt-1 text-sm">
                        Audit-ready records for organization-wide asset retirements.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button className="flex text-sm cursor-pointer items-center gap-2 px-4 py-2 border border-[#D7DCE5] bg-white rounded-xl text-[#0B5CAB] font-medium hover:bg-slate-50">
                        <Download size={16} />
                        Export
                    </button>
                    {canAdd && (
                        <Link to="/assets/add-disposal">
                            <button className="flex text-sm cursor-pointer items-center gap-2 px-5 py-3 bg-[#084E92] text-white rounded-xl shadow-md hover:bg-[#084E92]">
                                <CirclePlus size={18} />
                                New Disposal Entry
                            </button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 my-8">
                {STATS.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <div
                            key={index}
                            className="border border-[#C3C6D1] rounded-2xl p-4"
                        >

                            <div
                                className={`w-6 h-6 rounded ${item.iconBg} flex items-center justify-center`}
                            >
                                <Icon
                                    size={15}
                                    className={item.iconColor}
                                />
                            </div>

                            <p className="text-sm text-[#43474F] pt-2">
                                {item.title}
                            </p>
                            <h2 className="text-xl font-bold">
                                {item.value}
                            </h2>
                            {item.subText && (
                                <span className={`text-xs font-medium ${item.subTextColor} mb-1`}>
                                    {item.subText}
                                </span>
                            )}
                            {item.badge && (
                                <span
                                    className={`text-xs mt-1 font-semibold ${item.badgeClass}`}
                                >
                                    {item.badge}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="bg-white border border-[#E6EAF2] rounded-3xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                    <div className="md:col-span-3">

                        <div className="relative rounded-xl">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                value={searchText}
                                onChange={(e) => {
                                    setSearchText(e.target.value);
                                    setPagination({
                                        pageIndex: 0,
                                        pageSize: 10,
                                    });
                                }}
                                placeholder="Search Asset ID, Name, or Approved By..."
                                className="w-full h-12 border border-[#DCE3EE] rounded-xl pl-10 pr-4 outline-none"
                            />
                        </div>
                    </div>

                    <div className="col-span-1">
                        <div className="relative rounded-xl">
                            <CalendarDays
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                value={dateFilter}
                                onChange={(e) => {
                                    setDateFilter(e.target.value);
                                    setPagination({
                                        pageIndex: 0,
                                        pageSize: 10,
                                    });
                                }}
                                placeholder="Select timeframe"
                                className="w-full h-12 border border-[#DCE3EE] rounded-xl pl-10 pr-4 outline-none"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                <DataGrid table={table} recordCount={filteredDisposalData.length} className="rounded-2xl">
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

export default AssetsDisposalLog
