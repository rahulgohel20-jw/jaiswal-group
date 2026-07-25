import { ChevronRight, CircleCheck, CircleX, ClipboardList, Package, RotateCcw } from 'lucide-react'
import React, { useState } from 'react'

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



    const columns = [
        {
            accessorKey: "prCode",
            header: "PR CODE",
        },
        {
            accessorKey: "poCode",
            header: "PO CODE",
            cell: ({ row }) =>
                row.original.poCode === "TO BE GENERATED" ? (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-xs">
                        TO BE GENERATED
                    </span>
                ) : (
                    row.original.poCode
                ),
        },
        {
            accessorKey: "date",
            header: "DATE",
        },
        {
            accessorKey: "company",
            header: "COMPANY NAME",
        },
        {
            accessorKey: "outlet",
            header: "OUTLET NAME",
        },
        {
            accessorKey: "raisedBy",
            header: "RAISED BY",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                        {row.original.initials}
                    </div>
                    {row.original.raisedBy}
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "STATUS",
            cell: ({ row }) => (
                <StatusBadge status={row.original.status} />
            ),
        },
        {
            id: "actions",
            header: "ACTIONS",
            cell: ({ row }) => (
                <div className="flex gap-2">
                    {row.original.action === "Generate PO" ? (
                        <>
                            <button className="bg-[#084E92] text-white px-4 py-1 rounded text-xs">
                                Generate PO
                            </button>
                            <button className="border px-4 py-1 rounded text-xs">
                                Reject
                            </button>
                        </>
                    ) : (
                        <button className="border px-4 py-1 rounded text-xs">
                            Edit
                        </button>
                    )}
                </div>
            ),
        },
    ];
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
        </div>
    )
}

export default PurchaseOrderRequest
