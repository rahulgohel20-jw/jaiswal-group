import { ChevronRight, CircleCheck, CircleX, ClipboardList, Download, Filter, MoreVertical, Package, RotateCcw, Search } from 'lucide-react'
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

const requests = [
    {
        prCode: "PR-2024-001",
        poCode: "TO BE GENERATED",
        date: "Oct 24, 2023",
        company: "Reliance Retail Ltd.",
        outlet: "Mumbai - Main Hub",
        raisedBy: "Animesh Sharma",
        initials: "AS",
        status: "Approved",
        action: "Generate PO",
    },
    {
        prCode: "PR-2024-002",
        poCode: "PO-2024-101",
        date: "Oct 22, 2023",
        company: "Tata Consumer Products",
        outlet: "Delhi North Outlet",
        raisedBy: "Priya Singh",
        initials: "PS",
        status: "Approved",
        action: "Edit",
    },
    {
        prCode: "PR-2024-003",
        poCode: "TO BE GENERATED",
        date: "Oct 21, 2023",
        company: "Britannia Industries",
        outlet: "Bangalore Central",
        raisedBy: "Ravi Varma",
        initials: "RV",
        status: "Pending",
        action: "Generate PO",
    },
    {
        prCode: "PR-2024-004",
        poCode: "TO BE GENERATED",
        date: "Oct 20, 2023",
        company: "Amul India",
        outlet: "Ahmedabad Plant",
        raisedBy: "Mehul Desai",
        initials: "MD",
        status: "Approved",
        action: "Generate PO",
    },
    {
        prCode: "PR-2024-005",
        poCode: "PO-2024-102",
        date: "Oct 19, 2023",
        company: "Nestle Waters",
        outlet: "Pune South Hub",
        raisedBy: "Sameer Khan",
        initials: "SK",
        status: "Approved",
        action: "Edit",
    },
];
const TruncatedCell = ({ value, widthClass = "max-w-[180px]", className = "text-gray-600" }) => (
    <span title={value} className={`block truncate ${widthClass} ${className}`}>
        {value}
    </span>
);
const StatusBadge = ({ status }) => {
    const styles = {
        Approved: "bg-green-100 text-green-700",
        Pending: "bg-yellow-100 text-yellow-700",
        Rejected: "bg-red-100 text-red-700",
    };

    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}
        >
            {status.toUpperCase()}
        </span>
    );
};
const PurchaseOrderRequest = () => {
    const [prRequest, setPrRequest] = useState(requests);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [search, setSearch] = useState("");
    const [companyFilter, setCompanyFilter] = useState("All Companies");
    const [outletFilter, setOutletFilter] = useState("All Outlets");
    const [statusFilter, setStatusFilter] = useState("All Status");

    const columns = [
        {
            accessorKey: "prCode",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="PR CODE"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),
             size: 140,
        },
        {
            accessorKey: "poCode",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="PO CODE"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),
            cell: ({ row }) =>
                row.original.poCode === "TO BE GENERATED" ? (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-xs">
                        TO BE GENERATED
                    </span>
                ) : (
                    row.original.poCode
                ),
            size: 170,
        },
        {
            accessorKey: "date",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="DATE"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),
            size:120,
        },
        {
            accessorKey: "company",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="COMPANY NAME"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),
            cell: ({ row }) => <TruncatedCell value={row.original.company} widthClass="max-w-[190px]" />,
        },
        {
            accessorKey: "outlet",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="OUTLET NAME"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),
            cell: ({ row }) => <TruncatedCell value={row.original.outlet} widthClass="max-w-[190px] py-3" />,
        },
        {
            accessorKey: "raisedBy",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="RAISED BY"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                        {row.original.initials}
                    </div>
                    {row.original.raisedBy}
                </div>
            ),
            size:190,
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="STATUS"
                    column={column}
                    className="text-[#43474F] font-semibold"
                />
            ),
            cell: ({ row }) => (
                <StatusBadge status={row.original.status} />
            ),
            size:110
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader
                    title="ACTIONS"
                    column={column}
                    className="text-[#43474F] font-semibold py-6"
                />
            ),
            cell: ({ row }) => (
                <div className="flex gap-2">
                    {row.original.action === "Generate PO" ? (
                        <>
                            <Link 
                            to="/purchase/create-purchase-order-requests" 
                            state={row.original}>
                            <button className="bg-[#084E92] text-white px-4 py-1 rounded-lg text-xs cursor-pointer">
                                Generate PO
                            </button>
                            </Link>
                            <button className="border px-4 py-1 rounded-lg text-xs cursor-pointer">
                                Reject
                            </button>
                        </>
                    ) : (
                        <button className="border px-4 py-1 rounded text-xs cursor-pointer">
                            Edit
                        </button>
                    )}
                </div>
            ),
            size:230
        },
    ];

    const filteredRequests = useMemo(() => {
        const keyword = search.toLowerCase().trim();

        return prRequest.filter((item) => {
            const matchesSearch =
                item.prCode.toLowerCase().includes(keyword) ||
                item.company.toLowerCase().includes(keyword) ||
                item.raisedBy.toLowerCase().includes(keyword);

            const matchesCompany =
                companyFilter === "All Companies" || item.company === companyFilter;

            const matchesOutlet =
                outletFilter === "All Outlets" || item.outlet === outletFilter;

            const matchesStatus =
                statusFilter === "All Status" || item.status === statusFilter;

            return (
                matchesSearch &&
                matchesCompany &&
                matchesOutlet &&
                matchesStatus
            );
        });
    }, [prRequest, search, companyFilter, outletFilter, statusFilter]);
    const table = useReactTable({
        data: filteredRequests,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });



    const STATS = [
        {
            title: "Total PRs",
            value: "1,240",
            icon: <ClipboardList size={22} className="text-blue-600 p-1 bg-blue-100 rounded" />,
        },
        {
            title: "Pending POs",
            value: "12",
            icon: <Package size={22} className="text-orange-500 p-1 bg-orange-100 rounded" />,
        },
        {
            title: "PO Generated",
            value: "850",
            icon: <CircleCheck size={22} className="text-green-600 p-1 bg-green-100 rounded" />,
        },
        {
            title: "Rejected",
            value: "04",
            icon: <CircleX size={22} className="text-red-500 p-1 bg-red-100 rounded" />,
        },
    ];
    return (
       <Container>
         <div className='p-4 md:p-6'>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Purchase</span>
                <ChevronRight size={12} />
                <span className="text-[#084E92] font-medium">Purchase Order Requests</span>
            </div>

            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#0F172A]">Purchase Order Requests</h1>
                    <p className="text-[#737781] mt-1 md:w-[90%]">
                        Review approved purchase requisitions and generate purchase orders for procurement
                        workflows.
                    </p>
                </div>

                <div className="flex gap-3 self-end">
                    <button
                        type="button"
                        className="px-4 py-2 bg-[#FFFFFF] border border-[#E2E8F0] text-[#334155] rounded-lg flex gap-2 items-center cursor-pointer hover:bg-gray-50 transition"
                    >
                        <RotateCcw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 py-8 text-[#43474F]">
                {STATS.map((item) => (
                    <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4">
                        <div className="flex justify-between items-center pb-2">
                            <p>{item.icon}</p>
                            {item.badge && (
                                <p className={`text-xs rounded font-semibold px-1.5 py-1 ${item.badgeStyle}`}>{item.badge}</p>
                            )}
                        </div>
                        <h1 className="text-sm text-[#43474F]">{item.title}</h1>
                        <h2 className={`text-xl font-bold ${item.color}`}>{item.value}</h2>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Search */}
                    <div className="relative  pr-4 py-2.5 border border-[#C3C6D1] rounded-lg w-full">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by PR Code, Company or Raised By..."
                            className="w-full pl-10 outline-none"
                        />
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                        {/* Company */}
                        <p className='border border-[#C3C6D1] rounded-lg px-3 py-2.5'>
                            <select
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                                className="w-full outline-none"
                            >
                                <option value="All Companies">All Companies</option>
                                <option value="Reliance Retail Ltd.">Reliance Retail Ltd.</option>
                                <option value="Tata Consumer Products">Tata Consumer Products</option>
                                <option value="Britannia Industries">Britannia Industries</option>
                                <option value="Amul India">Amul India</option>
                                <option value="Nestle Waters">Nestle Waters</option>
                            </select>
                        </p>

                        {/* Outlet */}
                        <p className='border border-[#C3C6D1] rounded-lg px-3 py-2.5 '>
                            <select
                                value={outletFilter}
                                onChange={(e) => setOutletFilter(e.target.value)}
                                className="w-full outline-none"
                            >
                                <option value="All Outlets">All Outlets</option>
                                <option value="Mumbai - Main Hub">Mumbai - Main Hub</option>
                                <option value="Delhi North Outlet">Delhi North Outlet</option>
                                <option value="Bangalore Central">Bangalore Central</option>
                                <option value="Ahmedabad Plant">Ahmedabad Plant</option>
                                <option value="Pune South Hub">Pune South Hub</option>
                            </select>
                        </p>

                        {/* Status */}
                        <p className='border border-[#C3C6D1] rounded-lg px-3 py-2.5 '>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full outline-none"
                            >
                                <option value="All Status">All Status</option>
                                <option value="Approved">Approved</option>
                                <option value="Pending">Pending</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </p>

                    </div>

                </div>
            </div>

            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">

                {loading && (
                    <p className="p-4 text-sm text-gray-500">
                        Loading purchase requests...
                    </p>
                )}

                {error && (
                    <p className="p-4 text-sm text-red-600">
                        {error}
                    </p>
                )}

                <DataGrid
                    table={table}
                    recordCount={filteredRequests.length}
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
        </div>
       </Container>
    )
}

export default PurchaseOrderRequest
