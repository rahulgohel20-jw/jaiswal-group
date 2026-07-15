import {
    Activity,
    ArrowLeftRight,
    CalendarDays,
    Clock,
    Eye,
    MapPin,
    Package,
    Plus,
    QrCode,
    RotateCcw,
    Search,
    SquarePen,
    Trash2,
    Upload,
    UserCog,
    Wrench,
    X,
    CircleCheck,
} from 'lucide-react'
import React, { useState } from 'react'
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Link } from 'react-router';

const STATS = [
    {
        title: "Total Assignments",
        value: "1,258",
        icon: <Package size={22} className="text-[#00376C] p-1 bg-[#D5E3FF] rounded" />,
        color: "text-[#1B1B1F]",
    },
    {
        title: "Active Assignments",
        value: "1,105",
        icon: <CircleCheck size={22} className="text-[#15803D] p-1 bg-[#DCFCE7] rounded" />,
        color: "text-[#15803D]",
    },
    {
        title: "Returned Assets",
        value: "142",
        icon: <RotateCcw size={22} className="text-[#265FA4] p-1 bg-[#D5E3FF] rounded" />,
        color: "text-[#1B1B1F]",
    },
    {
        title: "Pending Returns",
        value: "11",
        icon: <Clock size={22} className="text-[#C2410C] p-1 bg-[#FFEDD5] rounded" />,
        color: "text-[#C2410C]",
    },
    {
        title: "Transfer Requests",
        value: "28",
        icon: <ArrowLeftRight size={22} className="text-[#265FA4] p-1 bg-[#D5E3FF] rounded" />,
        color: "text-[#265FA4]",
    },
    {
        title: "Under Maintenance",
        value: "34",
        icon: <Wrench size={22} className="text-[#BA1A1A] p-1 bg-[#FEE2E2] rounded" />,
        color: "text-[#BA1A1A]",
    },
];

const INITIAL_ASSIGNMENTS = [
    {
        id: 1,
        assignmentId: "ASGN-1001",
        assetId: "AST-98212",
        itemName: "Commercial Oven XL-500",
        assignedTo: "Chef Rajesh Kumar",
        location: "Bandra Outlet\nHot Kitchen A-1",
        qty: 1,
        status: "Assigned",
        serialNumber: "2024-OVEN-0092",
        assignedBy: "Super Admin",
        assignmentDate: "Oct 24, 2023",
        returnDueDate: "Jan 24, 2024",
        primaryLocation: "Section B, Central Kitchen, Mumbai Outlet",
        timeline: [
            {
                title: "Asset Assigned",
                date: "Oct 24, 2023 • 10:45 AM",
                description: "Assigned to Rajesh Kumar for the festive season peak load.",
                tone: "done",
            },
            {
                title: "Maintenance Clearance",
                date: "Oct 22, 2023 • 03:20 PM",
                description: "Pre-assignment check completed by Tech Support.",
                tone: "active",
            },
            {
                title: "Registered in Inventory",
                date: "Aug 15, 2023 • 09:00 AM",
                description: "",
                tone: "pending",
            },
        ],
    },
    {
        id: 2,
        assignmentId: "ASGN-1002",
        assetId: "AST-98213",
        itemName: "Industrial Dishwasher",
        assignedTo: "Vikas Khanna",
        location: "Worli Outlet\nCleaning Dept",
        qty: 2,
        status: "Pending",
        serialNumber: "2024-DISH-0154",
        assignedBy: "Super Admin",
        assignmentDate: "Nov 2, 2023",
        returnDueDate: "Feb 2, 2024",
        primaryLocation: "Cleaning Dept, Worli Outlet",
        timeline: [
            {
                title: "Assignment Pending Approval",
                date: "Nov 2, 2023 • 11:15 AM",
                description: "Awaiting outlet manager confirmation.",
                tone: "active",
            },
            {
                title: "Registered in Inventory",
                date: "Sep 1, 2023 • 09:00 AM",
                description: "",
                tone: "pending",
            },
        ],
    },
    {
        id: 3,
        assignmentId: "ASGN-1003",
        assetId: "AST-98214",
        itemName: "Deep Freezer 400L",
        assignedTo: "Priya Sharma",
        location: "Andheri Outlet\nCold Storage",
        qty: 1,
        status: "Returned",
        serialNumber: "2024-FRZ-0033",
        assignedBy: "Super Admin",
        assignmentDate: "Jun 10, 2023",
        returnDueDate: "Sep 10, 2023",
        primaryLocation: "Cold Storage, Andheri Outlet",
        timeline: [
            {
                title: "Asset Returned",
                date: "Sep 8, 2023 • 04:40 PM",
                description: "Returned in good condition, inspected by store keeper.",
                tone: "done",
            },
            {
                title: "Asset Assigned",
                date: "Jun 10, 2023 • 10:00 AM",
                description: "Assigned to Priya Sharma for cold storage expansion.",
                tone: "active",
            },
            {
                title: "Registered in Inventory",
                date: "May 1, 2023 • 09:00 AM",
                description: "",
                tone: "pending",
            },
        ],
    },
    {
        id: 4,
        assignmentId: "ASGN-1004",
        assetId: "AST-98215",
        itemName: "Dell Latitude 5420",
        assignedTo: "Anita Desai",
        location: "Head Office\nAccounts",
        qty: 1,
        status: "Assigned",
        serialNumber: "2024-LTP-0087",
        assignedBy: "Super Admin",
        assignmentDate: "Jan 5, 2024",
        returnDueDate: "Jan 5, 2025",
        primaryLocation: "Accounts Dept, Head Office",
        timeline: [
            {
                title: "Asset Assigned",
                date: "Jan 5, 2024 • 09:30 AM",
                description: "Assigned to Anita Desai for finance operations.",
                tone: "done",
            },
            {
                title: "Registered in Inventory",
                date: "Dec 20, 2023 • 09:00 AM",
                description: "",
                tone: "pending",
            },
        ],
    },
];

const StatusBadge = ({ status }) => {
    const styles = {
        Assigned: "bg-green-100 text-green-700",
        Pending: "bg-orange-100 text-orange-700",
        Returned: "bg-gray-100 text-gray-600",
        Overdue: "bg-[#FEE2E2] text-[#BA1A1A]",
    };
    const dotStyle = {
        Assigned: "bg-[#16A34A]",
        Pending: "bg-[#C2410C]",
        Returned: "bg-[#6B7280]",
        Overdue: "bg-[#BA1A1A]",
    };
    return (
        <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]} flex gap-1 items-center justify-center w-fit`}
        >
            <p className={`w-2 h-2 rounded-full ${dotStyle[status]}`}></p>
            <p>{status}</p>
        </span>
    );
};

const timelineDot = {
    done: "bg-[#16A34A] border-[#16A34A]",
    active: "bg-[#265FA4] border-[#265FA4]",
    pending: "bg-white border-gray-300",
};

const AssignmentPreviewDrawer = ({ assignment, onClose, onTransfer, onMarkReturned }) => {
    if (!assignment) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="bg-blue-50/50 border border-blue-100 flex items-start justify-between px-5 py-4 shrink-0">
                    <div>
                        <h2 className="text-sm font-bold text-[#265FA4]">Assignment Preview</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{assignment.assignmentId} Details</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer bg-white shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                    {/* Item summary */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl shadow-sm px-4 py-4 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                            <QrCode className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-gray-400">{assignment.assignmentId}</p>
                            <p className="text-sm font-bold text-gray-900 truncate">{assignment.itemName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">S/N: {assignment.serialNumber}</p>
                        </div>
                    </div>

                    {/* Current assignment */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <UserCog className="w-4 h-4 text-[#265FA4]" />
                            <h3 className="text-sm font-bold text-[#265FA4]">Current Assignment</h3>
                        </div>
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-4 grid grid-cols-2 gap-x-4 gap-y-4">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Assigned To</p>
                                <p className="text-sm font-semibold text-gray-800 mt-0.5">{assignment.assignedTo}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Assigned By</p>
                                <p className="text-sm font-semibold text-gray-800 mt-0.5">{assignment.assignedBy}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Assignment Date</p>
                                <p className="text-sm font-semibold text-gray-800 mt-0.5">{assignment.assignmentDate}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Return Due Date</p>
                                <p className="text-sm font-semibold text-gray-800 mt-0.5">{assignment.returnDueDate}</p>
                            </div>
                            <div className="col-span-2 flex items-start gap-2 pt-1 border-t border-blue-100">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-1 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Primary Location</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{assignment.primaryLocation}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-[#265FA4]" />
                            <h3 className="text-sm font-bold text-[#265FA4]">Assignment Timeline</h3>
                        </div>
                        <div className="space-y-5">
                            {assignment.timeline.map((event, idx) => (
                                <div key={event.title} className="flex gap-3 relative">
                                    <div className="flex flex-col items-center">
                                        <span className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 mt-1 ${timelineDot[event.tone]}`} />
                                        {idx < assignment.timeline.length - 1 && (
                                            <span className="w-px flex-1 bg-gray-200 mt-1" />
                                        )}
                                    </div>
                                    <div className="pb-1">
                                        <p className="text-sm font-semibold text-gray-800">{event.title}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                            <CalendarDays className="w-3 h-3" />
                                            {event.date}
                                        </p>
                                        {event.description && (
                                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{event.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
                    <button
                        type="button"
                        onClick={() => onTransfer?.(assignment)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition"
                    >
                        <ArrowLeftRight className="w-4 h-4" />
                        Transfer Asset
                    </button>
                    <button
                        type="button"
                        onClick={() => onMarkReturned?.(assignment)}
                        className="flex-1 px-4 py-2.5 rounded-lg text-[#BA1A1A] border border-[#F3B4B4] text-sm font-semibold bg-white cursor-pointer hover:bg-red-50 transition"
                    >
                        Mark as Returned
                    </button>
                </div>
            </div>
        </div>
    );
};

const AssignAssets = () => {
    const [assignments] = useState(INITIAL_ASSIGNMENTS);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [rowSelection, setRowSelection] = useState({});
    const [previewAssignment, setPreviewAssignment] = useState(null);

    const columns = [
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
            size: 45,
        },
        {
            id: "assignmentId",
            accessorFn: (row) => row.assignmentId,
            header: ({ column }) => (
                <DataGridColumnHeader title="ASSIGNMENT ID" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <Link to={`/assignments/${row.original.id}`} className="font-semibold text-[#123B6D] leading-5 py-2 hover:underline">
                    {row.original.assignmentId}
                </Link>
            ),
            size: 140,
        },
        {
            id: "assetId",
            accessorFn: (row) => row.assetId,
            header: ({ column }) => (
                <DataGridColumnHeader title="ASSET ID" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-700 py-1">{row.original.assetId}</span>
            ),
            size: 120,
        },
        {
            id: "itemName",
            accessorFn: (row) => row.itemName,
            header: ({ column }) => (
                <DataGridColumnHeader title="ITEM NAME" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="font-medium text-gray-800 py-1">{row.original.itemName}</div>
            ),
            size: 190,
        },
        {
            id: "assignedTo",
            accessorFn: (row) => row.assignedTo,
            header: ({ column }) => (
                <DataGridColumnHeader title="ASSIGNED TO" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-700 py-1">{row.original.assignedTo}</span>
            ),
            size: 160,
        },
        {
            id: "location",
            accessorFn: (row) => row.location,
            header: ({ column }) => (
                <DataGridColumnHeader title="UNIT/LOCATION" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="text-gray-600 text-sm leading-snug py-1 whitespace-pre-line">
                    {row.original.location}
                </div>
            ),
            size: 170,
        },
        {
            id: "qty",
            accessorFn: (row) => row.qty,
            header: ({ column }) => (
                <DataGridColumnHeader title="QTY" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <span className="text-gray-700 font-medium py-1">{row.original.qty}</span>
            ),
            size: 70,
        },
        {
            id: "status",
            accessorFn: (row) => row.status,
            header: ({ column }) => (
                <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            size: 120,
        },
        {
            id: "actions",
            header: ({ column }) => (
                <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-3 py-1">
                    <button type="button" onClick={() => setPreviewAssignment(row.original)}>
                        <Eye size={18} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
                    </button>
                    <button type="button">
                        <SquarePen size={18} className="text-gray-500 hover:text-green-600 cursor-pointer" />
                    </button>
                    <button type="button">
                        <Trash2 size={18} className="text-red-300 hover:text-red-600 cursor-pointer" />
                    </button>
                </div>
            ),
            enableSorting: false,
            size: 110,
        },
    ];

    const table = useReactTable({
        data: assignments,
        columns,
        state: { pagination, rowSelection },
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#084E92]">Assign Assets</h1>
                    <p className="text-[#737781] mt-1">
                        Assign registered assets to kitchens, outlets, departments, or users
                        while maintaining complete inventory tracking.
                    </p>
                </div>

                <div className="flex gap-3 self-end">
                    <button type="button" className="px-4 py-2 border border-[#C3C6D1] rounded-lg flex gap-2 items-center text-[#43474F] hover:bg-gray-50 transition cursor-pointer bg-white">
                        <Upload size={16} />
                        Export Assignments
                    </button>
                    <Link to="/assignments/add">
                        <button type="button" className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-[#073e77] transition">
                            <Plus size={16} />
                            Assign Asset
                        </button>
                    </Link>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 py-8 text-[#43474F]">
                {STATS.map((item) => (
                    <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4">
                        <div className="pb-2">{item.icon}</div>
                        <h1 className="text-sm text-[#43474F]">{item.title}</h1>
                        <h2 className={`text-xl font-bold ${item.color}`}>{item.value}</h2>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-center">
                    <div className="relative col-span-1 xl:col-span-1 border border-[#C3C6D1] rounded-lg">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input placeholder="Search by ID, Name, Kitchen..." className="w-full pl-10 py-2 outline-none rounded-lg" />
                    </div>

                    <p className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                        <select className="outline-none w-full bg-transparent">
                            <option>All Companies</option>
                            <option>Jaiswal Group</option>
                            <option>Jaiswal Hospitality</option>
                        </select>
                    </p>

                    <div className="flex gap-3 justify-end">
                        <button type="button" className="border border-[#C3C6D1] text-[#43474F] rounded-lg px-4 py-2 hover:bg-gray-50 transition cursor-pointer bg-white">
                            Reset
                        </button>
                        <button type="button" className="bg-[#084E92] text-white rounded-lg px-4 py-2 hover:bg-[#073e77] transition cursor-pointer">
                            Apply Filters
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs text-[#737781] mb-1">Outlet</label>
                        <p className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                            <select className="outline-none w-full bg-transparent">
                                <option>All Outlets</option>
                                <option>Bandra Outlet</option>
                                <option>Worli Outlet</option>
                                <option>Andheri Outlet</option>
                            </select>
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs text-[#737781] mb-1">Unit Name</label>
                        <p className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                            <select className="outline-none w-full bg-transparent">
                                <option>Main Kitchen</option>
                                <option>Cold Storage</option>
                                <option>Cleaning Dept</option>
                            </select>
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs text-[#737781] mb-1">Asset Category</label>
                        <p className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                            <select className="outline-none w-full bg-transparent">
                                <option>Industrial Cookers</option>
                                <option>Kitchen Equipment</option>
                                <option>IT Equipment</option>
                            </select>
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs text-[#737781] mb-1">Status</label>
                        <p className="border border-[#C3C6D1] rounded-lg px-3 py-2">
                            <select className="outline-none w-full bg-transparent">
                                <option>Assigned</option>
                                <option>Pending</option>
                                <option>Returned</option>
                            </select>
                        </p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
                <DataGrid table={table} recordCount={assignments.length} className="rounded-2xl">
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

            {previewAssignment && (
                <AssignmentPreviewDrawer
                    assignment={previewAssignment}
                    onClose={() => setPreviewAssignment(null)}
                    onTransfer={() => setPreviewAssignment(null)}
                    onMarkReturned={() => setPreviewAssignment(null)}
                />
            )}
        </div>
    );
};

export default AssignAssets;