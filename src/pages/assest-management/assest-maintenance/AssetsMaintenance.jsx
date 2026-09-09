import React, { useEffect, useMemo, useState } from 'react'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Link } from 'react-router';
import { Container } from "@/components/common/container";
import { ChevronRight, CircleCheck, CircleEllipsis, ClipboardList, Download, Eye, FileText, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { deleteAssetMaintenanceById, getAllAssetsMaintenance, getAllAssetsMaintenancePaginated, getAssetMaintenanceById, getAssetsMaintenanceByStatus, getByMaintenanceDateRangeAndStatus } from '../../../services/apiServices';
import ViewMaintenanceModal from './ViewMaintenanceModal';

const StatusBadge = ({ status }) => {
    const styles = {
        "COMPLETED": "bg-green-100 text-green-700",
        "IN_PROGRESS": "bg-blue-100 text-blue-700",
        "PENDING": "bg-amber-100 text-amber-700",
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
            {status}
        </span>
    );
};
const formatDateForComparison = (date) => {
    if (!date) return "";

    // API date: DD/MM/YYYY
    if (date.includes("/")) {
        const [day, month, year] = date.split("/");
        return `${year}-${month}-${day}`;
    }

    return date;
};
const AssetsMaintenance = () => {
    const [maintenanceData, setMaintenanceData] = useState([]);
    const [statsData, setStatsData] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Records");

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSaving, setDeleteSaving] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [showViewMaintenance, setShowViewMaintenance] = useState(false);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewMaintenanceData, setViewMaintenanceData] = useState(null);

    const fetchStatsData = async () => {
        try {
            const res = await getAllAssetsMaintenance();

            const data = res?.data?.data ?? res?.data ?? [];

            setStatsData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };
    useEffect(() => {
        fetchStatsData();
    }, []);

    const fetchMaintenanceData = async (pageIndex = pagination.pageIndex, pageSize = pagination.pageSize) => {
        setLoading(true);

        try {
            let res;
            if (fromDate && toDate) {
                // input[type="date"] gives yyyy-MM-dd
                // API expects dd/MM/yyyy

                const formatDateForApi = (date) => {
                    if (!date) return "";

                    const [year, month, day] = date.split("-");
                    return `${day}/${month}/${year}`;
                };

                const from = formatDateForApi(fromDate);
                const to = formatDateForApi(toDate);

                res = await getByMaintenanceDateRangeAndStatus(from, to, statusFilter);

                const data = res?.data?.data ?? [];

                setMaintenanceData(Array.isArray(data) ? data : []);
                setTotalCount(Array.isArray(data) ? data.length : 0);

                return;
            }
            if (statusFilter === "All Records") {
                // Get all records with pagination
                res = await getAllAssetsMaintenancePaginated(pageIndex, pageSize);
            } else {
                // Get records according to selected status
                res = await getAssetsMaintenanceByStatus(statusFilter);
            }

            const pageData = res?.data?.data ?? res?.data ?? {};

            // For paginated API
            const content = Array.isArray(pageData)
                ? pageData
                : pageData.content ?? [];

            const total = Array.isArray(pageData)
                ? pageData.length
                : pageData.totalElements ?? content.length;

            setMaintenanceData(content);
            setTotalCount(total);

        } catch (err) {
            console.error(err);
            setError(err);
            setMaintenanceData([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };
    // Refetch whenever the page or page size changes.
    useEffect(() => {
        fetchMaintenanceData(pagination.pageIndex, pagination.pageSize);
    }, [pagination.pageIndex, pagination.pageSize, statusFilter, fromDate, toDate]);

    const openDeleteConfirm = (row) => {
        setDeleteTarget({ id: row.id, itemLabel: row.itemName });
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
            await deleteAssetMaintenanceById(deleteTarget.id);
            closeDeleteConfirm();
            fetchMaintenanceData(); // refresh current page
            fetchStatsData(); //refresh stat data
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteSaving(false);
        }
    };
    const handleViewMaintenance = async (id) => {
        try {
            setViewLoading(true);

            const res = await getAssetMaintenanceById(id);

            const data = res?.data?.data ?? res?.data ?? null;

            setViewMaintenanceData(data);
            setShowViewMaintenance(true);
        } catch (error) {
            console.error("Failed to fetch maintenance details:", error);
        } finally {
            setViewLoading(false);
        }
    };
    const STATS = [
        {
            title: "Total Maintenace Logs",
            value: `${statsData.length}`,
            icon: FileText,
            bg: "bg-slate-50",
            iconColor: "text-slate-600",
        },
        {
            title: "Completed Services ",
            value: `${statsData.filter(item => item.status === "COMPLETED").length}`,
            icon: CircleCheck,
            bg: "bg-green-50",
            iconColor: "text-green-600",
        },
        {
            title: "Pending Services",
            badge: "Critical",
            value: `${statsData.filter(item => item.status === "PENDING").length}`,
            icon: CircleEllipsis,
            bg: "bg-orange-50",
            iconColor: "text-[#D97706]",
        },
        {
            title: "Today's Maintenace",
            badge: "Scheduled",
            value: `${statsData.filter(item => formatDateForComparison(item.nextServiceDate) === new Date().toISOString().split('T')[0]).length}`,
            icon: ClipboardList,
            bg: "bg-slate-50",
            iconColor: "text-slate-600",
        },
    ];

    const columns = [
        {
            id: "select",
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    className='my-5'
                />
            ),
            cell: ({ row }) => (
                <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
            ),
            size: 30,
        },
        {
            accessorKey: "assetId",
            header: ({ column }) => <DataGridColumnHeader title="ASSET IDENTITY" column={column} className="text-[#43474F] font-semibold" />,
            cell: ({ row }) => (
                <div>
                   <p className="text-[#0B5CAB] font-semibold text-sm"> {row.original.assetCode}</p>
                   <span className="text-gray-600 text-sm">{row.original.itemName || '-'}</span>
                </div>
            ),
            size: 140,
        },
        {
            accessorKey: "orgName",
            header: ({ column }) => <DataGridColumnHeader title="UNIT" column={column} className="text-[#43474F] font-semibold" />,
            cell: ({ row }) => row.original.orgName ?? '-',
            size: 130,
        },
        {
            accessorKey: "maintenanceDate",
            header: ({ column }) => <DataGridColumnHeader title="DATE" column={column} className="text-[#43474F] font-semibold" />,
            size: 120,
        },
        {
            accessorKey: "complaint",
            header: ({ column }) => <DataGridColumnHeader title="REPORTED ISSUE" column={column} className="text-[#43474F] font-semibold" />,
            cell: ({ row }) => (
                <span>{row.original.complaint || '-'}</span>
            ),
            size: 160,
        },
        {
            accessorKey: "engineerName",
            header: ({ column }) => <DataGridColumnHeader title="ENGINEER" column={column} className="text-[#43474F] font-semibold" />,
            cell: ({ row }) => (
                <span>{row.original.engineerName || '-'}</span>
            ),
            size: 120,
        },
        {
            accessorKey: "cost",
            header: ({ column }) => <DataGridColumnHeader title="SERVICE COST" column={column} className="text-[#43474F] font-semibold" />,
            cell: ({ row }) => (
                <span className="font-semibold text-[#084E92]">₹{row.original.cost}</span>
            ),
            size: 120,
        },
        {
            accessorKey: "status",
            header: ({ column }) => <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-semibold" />,
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            size: 120,
        },
        {
            accessorKey: "nextServiceDate",
            header: ({ column }) => <DataGridColumnHeader title="NEXT DUE" column={column} className="text-[#43474F] font-semibold" />,
            cell: ({ row }) => row.original.nextServiceDate ?? '-',
            size: 120,
        },
        {
            id: "actions",
            header: ({ column }) => <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />,
            cell: ({ row }) => (
                <div className="flex gap-2 my-1 items-center">
                    <button onClick={() => handleViewMaintenance(row.original.id)} className="text-gray-500 hover:text-green-600 cursor-pointer">
                        <Eye size={18} />
                    </button>

                    <Link to={`/assets/edit-maintenance-log/${row.original.id}`}>
                        <button className="text-gray-500 hover:text-blue-600 cursor-pointer py-2">
                            <SquarePen size={18} />
                        </button>
                    </Link>

                    <button onClick={() => openDeleteConfirm(row.original)} className="text-red-300 hover:text-red-600 cursor-pointer">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
            size: 100
        },
    ];

    // Client-side filter over the CURRENT PAGE only (endpoint has no filter
    // params). Guarded with `?? ""` so missing fields never crash the filter.
    const filteredMaintenanceData = useMemo(() => {
        const q = searchText.toLowerCase();

        return maintenanceData.filter((item) => {
            const matchesSearch =
                q === "" ||
                (item.itemName ?? "").toLowerCase().includes(q) ||
                (item.assetCode ?? "").toLowerCase().includes(q) ||
                (item.engineerName ?? "").toLowerCase().includes(q) ||
                (item.orgName ?? "").toLowerCase().includes(q);

            return matchesSearch;
        });
    }, [maintenanceData, searchText]);

    const pageCount = pagination.pageSize > 0 ? Math.ceil(totalCount / pagination.pageSize) : 0;

    const table = useReactTable({
        data: filteredMaintenanceData,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        manualPagination: true,
        pageCount,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <Container>
            <div className='p-4 md:p-6'>
                <div className="flex items-center gap-1.5 sm:text-xs text-[10px] text-gray-400 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Asset Management</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">Maintenance Log</span>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Maintenance Log</h1>
                        <p className="text-sm text-[#6B7280] mt-1">
                            View and manage all maintenance records for organizational assets.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center cursor-pointer gap-2 px-4 py-2 border border-[#D8E2F0] bg-white rounded-xl text-[#0B5CAB] font-medium hover:bg-[#F8FAFC] transition">
                            <Download size={16} />
                            Export
                        </button>
                        <Link to="/assets/add-maintenance-log">
                            <button className="flex items-center w-max cursor-pointer gap-2 px-5 py-2 bg-[#084E92] text-white rounded-xl font-medium hover:bg-[#084E92] transition">
                                <Plus size={16} />
                                Add Maintenance Log
                            </button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 my-6">
                    {STATS.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <div key={index} className="bg-white rounded-2xl border p-4 shadow-sm">
                                <div className={`w-6 h-6 rounded flex items-center justify-center ${item.bg}`}>
                                    <Icon className={item.iconColor} size={15} />
                                </div>
                                <p className="text-sm text-[#43474F] pt-2">{item.title}</p>
                                <h2 className="text-xl font-bold">{item.value}</h2>
                                {item.badge && (
                                    <span className={`text-[11px] font-medium ${item.iconColor}`}>{item.badge}</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="bg-white border rounded-2xl p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <div className="relative mt-1">
                                <label className="text-xs text-gray-500">Search</label>
                                <Search size={16} className="absolute left-3 top-11 -translate-y-1/2 text-gray-400" />
                                <input
                                    placeholder="Asset ID, Name, Kitchen..."
                                    className="w-full border rounded-lg pl-10 pr-3 py-2 outline-none"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="text-xs text-gray-500">Status</label>
                            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                                <SelectTrigger className="w-full h-10 mt-1 border-[#C3C6D1] rounded-lg text-sm text-gray-600">
                                    <SelectValue placeholder="All Records" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All Records">All Records</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-1">
                            <label className="text-xs text-gray-500">From Date</label>
                            <input
                                type="date"
                                className="w-full border rounded-lg px-3 py-2 mt-1 outline-none"
                                value={fromDate}
                                onChange={(e) => {
                                    setFromDate(e.target.value);

                                    // Reset pagination when filter changes
                                    setPagination(prev => ({
                                        ...prev,
                                        pageIndex: 0,
                                    }));
                                }}
                                max={toDate || undefined}
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="text-xs text-gray-500">To Date</label>
                            <input
                                type="date"
                                className="w-full border rounded-lg px-3 py-2 mt-1 outline-none"
                                value={toDate}
                                onChange={(e) => {
                                    setToDate(e.target.value);

                                    // Reset pagination when filter changes
                                    setPagination(prev => ({
                                        ...prev,
                                        pageIndex: 0,
                                    }));
                                }}
                                min={fromDate || undefined}
                            />
                        </div>
                        </div>
                    </div>
                </div>

                <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                    <DataGrid table={table} recordCount={totalCount} className="rounded-2xl">
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

                {showViewMaintenance && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <div
                            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
                            onClick={() => { setShowViewMaintenance(false); setViewMaintenanceData(null); }}
                        />
                        <div className="relative z-10 h-full w-full max-w-md bg-white shadow-xl">
                            <ViewMaintenanceModal
                                maintenance={viewMaintenanceData}
                                loading={viewLoading}
                                onClose={() => {
                                    setShowViewMaintenance(false);
                                    setViewMaintenanceData(null);
                                }}
                            />
                        </div>

                    </div>
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

export default AssetsMaintenance;