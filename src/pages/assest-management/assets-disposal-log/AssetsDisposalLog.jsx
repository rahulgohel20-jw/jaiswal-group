import {
    BadgeDollarSign,
    CalendarDays,
    ChevronRight,
    CirclePlus,
    ClipboardList,
    Download,
    Eye,
    SquarePen,
    Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router";
import { Container } from "@/components/common/container";
import DeleteConfirmModal from "@/utils/DeleteConfirmModal";
import { usePagePermissions } from "@/utils/permissions";
import { AccessDenied } from "@/components/common/AccessDenied";
import { HeaderActionButton } from "@/components/common/HeaderActionButton";
import { getAllAssetsDisposal, deleteAssetDisposalById, getAssetDisposalById } from "../../../services/apiServices";
import ViewDisposalModal from "./ViewDisposalModal";

const FETCH_ALL_PAGE_SIZE = 1000;

const unwrapList = (response) =>
    response?.data?.data?.content ?? response?.data?.content ?? response?.data?.data ?? response?.data ?? [];

const toDisplayDate = (apiDate) => {
    if (!apiDate) return "-";
    // Accepts dd/MM/yyyy from the API as-is; falls back to raw value otherwise.
    return apiDate;
};

const toCurrency = (value) => {
    const num = Number(value) || 0;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const mapDisposalToRow = (record) => ({
    id: record.id,
    assetId: record.asset?.assetCode ?? record.assetCode ?? `AST-${record.assetId}`,
    assetName: record.asset?.itemName ?? record.assetName ?? "-",
    model: record.asset?.model ?? record.model ?? "",
    orgName: record.orgName ?? record.org?.orgName ?? `Org #${record.orgId}`,
    subOutletName:
        record.subOutletName ??
        record.subOutlet?.subOutletName ??
        "-",
    date: toDisplayDate(record.disposalDate),
    method: record.disposableMethod ?? "-",
    saleValue: toCurrency(record.saleValue),
    approvedBy: record.approvedByName ?? record.approvedBy?.name ?? (record.approvedById ? `User #${record.approvedById}` : "-"),
});

const DisposalBadge = ({ type }) => {
    const styles = {
        SALE: "bg-green-100 text-green-700",
        SCRAP: "bg-red-100 text-red-700",
        DONATION: "bg-blue-100 text-blue-700",
        RECYCLED: "bg-amber-100 text-amber-700",
    };

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase ${styles[type] ?? "bg-gray-100 text-gray-600"}`}>
            {type}
        </span>
    );
};

const AssetsDisposalLog = () => {
    const { canAdd, canEdit, canDelete, canView } = usePagePermissions("Asset Disposal");
    const navigate = useNavigate();

    const [disposalData, setDisposalData] = useState([]);
    const [loading, setLoading] = useState(false);

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [searchText, setSearchText] = useState("");
    const [dateFilter, setDateFilter] = useState("");

    const [showViewDisposal, setShowViewDisposal] = useState(false);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewDisposalData, setViewDisposalData] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

    const loadDisposals = async () => {
        setLoading(true);

        try {
            const response = await getAllAssetsDisposal(0, FETCH_ALL_PAGE_SIZE);
            const records = unwrapList(response);
            setDisposalData((records ?? []).map(mapDisposalToRow));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDisposals();
    }, []);

    const handleViewDisposal = async (id) => {
        try {
            setViewLoading(true);

            const res = await getAssetDisposalById(id);

            const data = res?.data?.data ?? res?.data ?? null;

            setViewDisposalData(data);
            setShowViewDisposal(true);
        } catch (error) {
            console.error("Failed to fetch disposal details:", error);
        } finally {
            setViewLoading(false);
        }
    };
    const openDeleteConfirm = (row) => {
        setDeleteTarget({
            id: row.id,
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
            await deleteAssetDisposalById(deleteTarget.id);
            closeDeleteConfirm();
            await loadDisposals();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteSaving(false);
        }
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: "assetId",
                header: ({ column }) => <DataGridColumnHeader title="ASSET ID" column={column} />,
                cell: ({ row }) => <span className="font-semibold text-[#0B5CAB]">{row.original.assetId}</span>,
                size: 130,
            },

            {
                accessorKey: "assetName",
                header: ({ column }) => <DataGridColumnHeader title="ASSET NAME" column={column} />,
                cell: ({ row }) => (
                    <div>
                        <p className="font-semibold text-gray-900 leading-tight">{row.original.assetName}</p>
                    </div>
                ),
                size: 160,
            },
            {
                accessorKey: "Unit",
                header: ({ column }) => <DataGridColumnHeader title="UNIT" column={column} />,
                cell: ({ row }) => <span className="font-medium text-sm">{row.original.orgName}</span>,
                size: 160,
            },

            {
                accessorKey: "SubUnit",
                header: ({ column }) => <DataGridColumnHeader title="SUB UNIT" column={column} />,
                cell: ({ row }) => <span className="font-medium text-sm">{row.original.subOutletName || '-'}</span>,
                size: 160,
            },

            {
                accessorKey: "date",
                header: ({ column }) => <DataGridColumnHeader title="DISPOSAL DATE" column={column} />,
                size: 120,
            },

            {
                accessorKey: "method",
                header: ({ column }) => <DataGridColumnHeader title="METHOD" column={column} />,
                cell: ({ row }) => <DisposalBadge type={row.original.method} />,
                size: 110,
            },

            {
                accessorKey: "saleValue",
                header: ({ column }) => <DataGridColumnHeader title="SALE VALUE" column={column} />,
                cell: ({ row }) => <span className="font-semibold text-[#111827]">{row.original.saleValue}</span>,
                size: 110,
            },

            {
                accessorKey: "approvedBy",
                header: ({ column }) => <DataGridColumnHeader title="APPROVED BY" column={column} />,
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{row.original.approvedBy}</span>
                    </div>
                ),
                size: 150,
            },

            {
                id: "actions",
                header: ({ column }) => <DataGridColumnHeader title="ACTIONS" column={column} />,
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleViewDisposal(row.original.id)}
                            className="text-gray-500 hover:text-green-600 cursor-pointer"
                            title="View Disposal"
                        >
                            <Eye size={18} />
                        </button>

                        {canEdit && (
                            <button
                                onClick={() => navigate(`/assets/edit-disposal/${row.original.id}`)}
                                className="text-gray-500 hover:text-blue-600 cursor-pointer"
                                title="Edit Disposal"
                            >
                                <SquarePen size={18} />
                            </button>
                        )}

                        {canDelete && (
                            <button
                                onClick={() => openDeleteConfirm(row.original)}
                                className="text-red-300 hover:text-red-600 cursor-pointer"
                                title="Delete Disposal"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                ),
                enableSorting: false,
                size: 120,
            },
        ],
        [canEdit, canDelete, navigate],
    );

    const filteredDisposalData = useMemo(() => {
        return disposalData.filter((item) => {
            const keyword = searchText.toLowerCase();

            const matchesSearch =
                !keyword ||
                item.assetId.toLowerCase().includes(keyword) ||
                item.assetName.toLowerCase().includes(keyword) ||
                item.approvedBy.toLowerCase().includes(keyword) ||
                item.subOutletName.toLowerCase().includes(keyword);

            const matchesDate = !dateFilter || item.date.toLowerCase().includes(dateFilter.toLowerCase());

            return matchesSearch && matchesDate;
        });
    }, [disposalData, searchText, dateFilter]);

    const stats = useMemo(() => {
        const total = disposalData.length;

        const soldRecords = disposalData.filter((item) =>
            /sale/i.test(item.method)
        );

        const soldRevenue = soldRecords.reduce(
            (sum, item) => {
                const numeric =
                    Number(
                        String(item.saleValue).replace(
                            /[^0-9.]/g,
                            ""
                        )
                    ) || 0;

                return sum + numeric;
            },
            0
        );

        const scrapped = disposalData.filter((item) =>
            /scrap/i.test(item.method)
        ).length;

        // API date format: dd/MM/yyyy
        const now = new Date();

        const thisMonth = disposalData.filter((item) => {
            const dateString = String(
                item.date ?? ""
            );

            const [day, month, year] =
                dateString.split("/");

            if (!day || !month || !year) {
                return false;
            }
            return (
                Number(month) - 1 ===
                now.getMonth() &&
                Number(year) ===
                now.getFullYear()
            );
        }).length;

        return [
            {
                title: "Total Records",
                value: String(total),
                icon: ClipboardList,
                iconBg: "bg-[#D5E3FF]",
                iconColor: "text-[#00376C]",
                color: "text-[#1B1B1F]",
            },
            {
                title: "Assets Sold",
                value: String(
                    soldRecords.length
                ),
                icon: BadgeDollarSign,
                iconBg: "bg-[#DCFCE7]",
                iconColor: "text-[#15803D]",
                color: "text-[#15803D]",
            },
            {
                title: "Scrapped",
                value: String(scrapped),
                icon: Trash2,
                iconBg: "bg-[#FEE2E2]",
                iconColor: "text-[#DC2626]",
                color: "text-[#DC2626]",
            },
            {
                title: "This Month",
                value: String(thisMonth),
                icon: CalendarDays,
                iconBg: "bg-[#FEF3C7]",
                iconColor: "text-[#B45309]",
                color: "text-[#1B1B1F]",
            },
        ];
    }, [disposalData]);

    const table = useReactTable({
        data: filteredDisposalData,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (!canView) {
        return <AccessDenied pageTitle="Asset Disposal" />;
    }

    return (
        <Container>
            <div className='p-4 mx-auto'>
                <div className="flex items-center gap-1.5 sm:text-xs text-[10px] text-gray-400 mb-2">
                    <span className='cursor-pointer hover:text-blue-300' onClick={() => navigate('/')}>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Asset Management</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">Asset Disposal Log</span>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
                    <div>
                        <h1 className="font-bold text-[#101828] text-xl sm:text-2xl">Asset Disposal Log</h1>
                    </div>

                    {canAdd && (
                        <HeaderActionButton to="/assets/add-disposal">
                            New Disposal Entry
                        </HeaderActionButton>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 my-4">
                    {stats.map((item, index) => {
                        const Icon = item.icon;

                        return (
                            <div key={index} className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                                <div className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                                    <Icon size={18} />
                                </div>

                                <div className="flex flex-col items-end text-right">
                                    <span className="text-xs font-semibold text-[#00376C]">{item.title}</span>
                                    <span className={`text-lg sm:text-xl font-bold mt-0.5 ${item.color || 'text-[#1B1B1F]'}`}>{item.value}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3">
                            <div className="relative rounded-xl">
                                <input
                                    value={searchText}
                                    onChange={(e) => {
                                        setSearchText(e.target.value);
                                        setPagination({ pageIndex: 0, pageSize: 10 });
                                    }}
                                    placeholder="Search Asset ID, Name, or Approved By..."
                                    className="w-full h-10 border border-[#DCE3EE] rounded-xl pl-4 pr-4 outline-none"
                                />
                            </div>
                        </div>

                        <div className="col-span-1">
                            <div className="relative rounded-xl">
                                <input
                                    value={dateFilter}
                                    onChange={(e) => {
                                        setDateFilter(e.target.value);
                                        setPagination({ pageIndex: 0, pageSize: 10 });
                                    }}
                                    placeholder="Select timeframe"
                                    className="w-full h-10 border border-[#DCE3EE] rounded-xl pl-4 pr-4 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                    {loading && (
                        <div className="px-6 py-4 text-sm text-gray-500 bg-white">Loading disposal records...</div>
                    )}

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
                    {showViewDisposal && (
                        <div className="fixed inset-0 z-50 flex justify-end">
                            <div
                                className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
                                onClick={() => { setShowViewDisposal(false); setViewDisposalData(null); }}
                            />
                            <div className="relative z-10 h-full w-full max-w-md bg-white shadow-xl">
                                <ViewDisposalModal
                                    disposal={viewDisposalData}
                                    loading={viewLoading}
                                    onClose={() => {
                                        setShowViewDisposal(false);
                                        setViewDisposalData(null);
                                    }}
                                />
                            </div>

                        </div>
                    )}
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
    );
};

export default AssetsDisposalLog;
