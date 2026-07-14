import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CircleCheck,
  CircleX,
  ClockFading,
  Download,
  Eye,
  Hourglass,
  ListFilter,
  Plus,
  Search,
  SquarePen,
  Trash2,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';
import { Link } from 'react-router';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const DATA = [
  {
    label: 'TOTAL USERS',
    count: '2,482',
    detail: '+12% ',
    detailIcon: <TrendingUp className="w-4 h-4 text-[#16A34A]" />,
    detailColor: 'text-[#16A34A]',
    icon: <UsersRound className="w-5 h-5 text-[#084E92]" />,
    color: 'text-[#084E92]',
    iconBg: 'bg-[#084E921A]/50',
  },
  {
    label: 'KYC VERIFIED',
    count: '2,333',
    detail: '94% ',
    detailIcon: <CircleCheck className="w-4 h-4 text-[#16A34A]" />,
    detailColor: 'text-[#16A34A]',
    icon: <BadgeCheck className="w-5 h-5 text-[#084E92]" />,
    color: 'text-[#084E92]',
    iconBg: 'bg-[#084E921A]/50',
  },
  {
    label: 'PENDING REVIEW',
    count: '124',
    detail: `48 Pending`,
    detailColor: 'text-[#CA8A04]',
    icon: <Hourglass className="w-5 h-5 text-[#084E92]" />,
    color: 'text-[#084E92]',
    iconBg: 'bg-[#084E921A]/50',
  },
  {
    label: 'ACTIVE ORGANIZATIONS',
    count: '12',
    detail: `Across 42 Outlets`,
    detailColor: 'text-[#43474F]',
    icon: <Building2 className="w-5 h-5 text-[#084E92]" />,
    color: 'text-[#084E92]',
    iconBg: 'bg-[#084E921A]/50',
  },
];

const INITIAL_DATA = [
  {
    id: 1,
    name: 'Aditya Jaiswal',
    createdBy: 'Created 12 Oct, 2023',
    code: 'USR-2024-0042',
    email: 'aditya.j@jaiswalgroup.com',
    company: 'Jaiswal Group India Pvt Ltd',
    role: 'Super Admin',
    department: 'Management',
    kycStatus: 'Verified',
    kycIcon: <BadgeCheck size={20}/>,
    color: 'text-[#15803D]',
    KycView: 'View Details',
  },
  {
    id: 2,
    name: 'Priya Sharma',
    createdBy: 'Created 12 Oct, 2023',
    code: 'USR-2024-0042',
    email: 'p.sharma@jaiswalgroup.com',
    company: 'Jaiswal Group India Pvt Ltd',
    role: 'Finance Head',
    department: 'Finance',
    kycStatus: 'Pending',
    kycIcon: <ClockFading size={20}/>,
    color: 'text-[#5F2600]',
    KycView: 'Review KYC',
  },
  {
    id: 3,
    name: 'Rahul Varma',
    createdBy: 'Created 12 Oct, 2023',
    code: 'USR-2024-0042',
    email: 'rahul.v@jaiswalgroup.com',
    company: 'Jaiswal Group India Pvt Ltd',
    role: 'Outlet Manager ',
    department: 'Operations',
    kycStatus: 'Verified',
    kycIcon: <BadgeCheck size={20}/>,
    color: 'text-[#15803D]',
    KycView: 'Re-verify',
  },
  {
    id: 4,
    name: 'Sneha Patel',
    createdBy: 'Created 12 Oct, 2023',
    code: 'USR-2024-0155',
    email: 'sneha.p@jaiswalgroup.com',
    company: 'Jaiswal Group India Pvt Ltd',
    role: 'Logistics Executive',
    department: 'Logistics',
    kycStatus: 'Rejected',
    kycIcon: <CircleX size={20}/>,
    color: 'text-[#BA1A1A]',
    KycView: 'View Details',
  },
  {
    id: 5,
    name: 'Vikram Mehta',
    createdBy: 'Created 12 Oct, 2023',
    code: 'USR-2024-0201',
    email: 'v.mehta@jaiswalgroup.com',
    company: 'Jaiswal Group India Pvt Ltd',
    role: 'System Analyst',
    department: 'IT Support',
    kycStatus: 'Verified',
    kycIcon: <BadgeCheck size={20}/>,
    color: 'text-[#15803D]',
    KycView: 'Review KYC',
  },
];


const DeleteConfirmModal = ({ user, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
      <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Delete user?</h2>
        <p className="text-sm text-gray-500 mt-1.5">
          This will permanently remove{" "}
          <span className="font-semibold text-gray-700">{user.name}</span> from your
          user list. This action cannot be undone.
        </p>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-5 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold border-0 cursor-pointer transition"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);
const ViewUserModal = ({ user, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">User Details</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-6 py-5 space-y-4">
        {[
          ["User Name", user.name],
          ["User Code", user.code],
          ["Company", user.company],
          ["Role", user.role],
          ["Department", user.department],
          ["Email Address", user.email],
          ["Created On", user.createdBy],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm gap-4">
            <span className="text-gray-400 shrink-0">{label}</span>
            <span className="font-semibold text-gray-800 text-right break-all">{value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">KYC Status</span>
          <span className={`${user.color}`}>{user.kycStatus}</span>
        </div>
      </div>
      <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);
const UserManagementList = () => {
  const [userData, setUserData] = useState(INITIAL_DATA)
const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [viewingUser, setViewingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);


    const handleDelete = (user) => setDeletingUser(user);
  const confirmDelete = () => {
    setUserData((v) => v.filter((u) => u.id !== deletingUser.id));
    setDeletingUser(null);
  };

   const columns = useMemo(
      () => [
        {
          id: "name",
          accessorFn: (row) => row.name,
          header: ({ column }) => <DataGridColumnHeader title="USER NAME" column={column} className="my-2 text-xs"/>,
          cell: ({ row }) => (
            <div className='flex gap-3 items-center w-full'>
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {row.original.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
                <div className='flex flex-col gap-1'>
                     <span className="font-semibold text-gray-800">{row.original.name}</span>
                     <span className="font-medium text-xs text-[#737781] ">{row.original.createdBy}</span>
                </div>
               
            </div>
          
          ),
          size: 220,
        },
        {
          id: "code",
          accessorFn: (row) => row.code,
          header: ({ column }) => <DataGridColumnHeader title="USER CODE" column={column} className="my-2 text-xs"/>,
          cell: ({ row }) => <span className="text-gray-600">{row.original.code}</span>,
        },
        {
          id: "email",
          accessorFn: (row) => row.email,
          header: ({ column }) => <DataGridColumnHeader title="EMAIL ADDRESS" column={column} className="my-2 text-xs"/>,
          cell: ({ row }) => <span className="text-gray-600">{row.original.email}</span>,
          size: 210,
        },
        {
          id: "company",
          accessorFn: (row) => row.company,
          header: ({ column }) => <DataGridColumnHeader title="COMPANY" column={column} className="my-2 text-xs"/>,
          cell: ({ row }) => <span className="text-gray-600">{row.original.company}</span>,
          size: 220,
        },
        {
          id: "role",
          accessorFn: (row) => row.role,
          header: ({ column }) => <DataGridColumnHeader title="ROLE" column={column} className="my-2 text-xs"/>,
          cell: ({ row }) => <span className="text-gray-600">{row.original.role}</span>,
          size: 160,
        },
         {
          id: "department",
          accessorFn: (row) => row.department,
          header: ({ column }) => <DataGridColumnHeader title="DEPARTMENT" column={column} className="my-2 text-xs"/>,
          cell: ({ row }) => <span className="text-gray-600">{row.original.department}</span>,
        },
         {
          id: "kycStatus",
          accessorFn: (row) => row.kycStatus,
          header: ({ column }) => <DataGridColumnHeader title="KYC STATUS" column={column} className="my-2 text-xs"/>,
          cell: ({ row }) => <div className={`flex gap-1 items-center ${row.original.color} font-semibold`}>
            <span>{row.original.kycIcon}</span>
            <span>{row.original.kycStatus}</span>
          </div>,
        },
         {
          id: "KycView",
          accessorFn: (row) => row.KycView,
          header: ({ column }) => <DataGridColumnHeader title="Kyc View" column={column} />,
          cell: ({ row }) => <Link to="/kyc-information" className={`${row.original.KycView === "Re-verify" ? "text-[#BA1A1A]" : "text-[#084E92]"} font-bold`}>{row.original.KycView} </Link>,
        },
         {
          id: "action",
          accessorFn: (row) => row.action,
          header: ({ column }) => <DataGridColumnHeader title="ACTIONS" column={column} />,
         cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setViewingUser(row.original)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer bg-white"
              title="View user"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => alert(`Update ${row.original.name}`)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition cursor-pointer bg-white"
              title="Update user"
            >
              <SquarePen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition cursor-pointer bg-white"
              title="Delete user"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
        enableSorting: false,
        size: 130,
        },
        
      ],
      [],
    );

      const table = useReactTable({
        data: userData,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
      });
  
  return (
    <container>
      <div className="w-full lg:w-[95%]">
        <div className="w-full  flex justify-between mx-6">
          <div>
            <h1 className="text-[#084E92] text-2xl md:text-4xl font-bold">
              User Management List
            </h1>
            <p className="pt-2">
              Manage enterprise-wide user access, organizational roles, and
              compliance verification status from a centralized console.
            </p>
          </div>

          <Link
            to="/users/add-user"
            className="flex gap-3 bg-[#084E92] justify-center items-center h-max p-3 rounded text-white text-sm"
          >
            <Plus size={15} /> Add New User
          </Link>
        </div>

        <div className="mx-6 flex gap-5 mt-12 bg-white justify-between w-full">
          {DATA.map((item) => (
            <div className="w-[50%] md:w-[25%] border border-[#C3C6D1] rounded-2xl p-6">
              <div className="flex justify-between">
                <span
                  className={`bg-[#084E921A]/50 p-2 w-max rounded flex items-center justify-center`}
                >
                  {item.icon}
                </span>
                <span
                  className={`flex gap-1 items-center justify-center text-xs self-start ${item.detailColor} font-bold`}
                >
                  {item.detail} {item.detailIcon}
                </span>
              </div>
              <div className="mt-2">
                <h3 className="text-xs text-[#737781]">{item.label}</h3>
                <p className={`${item.color} font-bold`}>{item.count}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full rounded-2xl px-2 mt-6 border border-[#C3C6D1] mx-6 flex py-4 min-w-max">
          <div className="flex gap-2 items-center  text-sm">
            <ListFilter size={15} />
            <p className='border-r border-[#C3C6D1] pr-4'>Filters</p>
          </div>

          <div className="w-full flex items-center gap-3 p-2 mx-3 lg:w-[80%]">
            <div className="text-sm">
              <p>Role</p>
              <p className="py-2 px-2 bg-[#F1F3FF] rounded mt-1">
                <select name="" id="" className='outline-none pr-6'>
                  <option value="All Roles">All Roles</option>
                </select>
              </p>
            </div>

            <div className="text-sm">
              <p>Department</p>
              <p className="py-2 px-2 bg-[#F1F3FF] rounded mt-1">
                <select name="" id=""  className='outline-none pr-6'>
                  <option value="All Departments">All Departments</option>
                </select>
              </p>
            </div>
            <div className="text-sm">
              <p>KYC Status</p>
              <p className="py-2 px-2 bg-[#F1F3FF] rounded mt-1">
                <select name="" id="" className='outline-none pr-6'>
                  <option value="All Status">All Status</option>
                </select>
              </p>
            </div>
          </div>

          <div className="lg:w-[15%] md:w-[25%] text-xs my-2  flex items-center gap-2 w-full flex-col lg:flex-row">
            <div className="py-1 px-2 border border-[#C3C6D1] rounded">
              <button className="flex items-center gap-1">
                <Download />
                <p>Export</p>
              </button>
            </div>

            <p className="text-[#084E92] font-bold">Clear All</p>
          </div>
        </div>

        <div className='w-full my-6 border border-[#C3C6D1] rounded-2xl mx-6'>
          <DataGrid table={table} recordCount={userData.length} className="rounded-2xl">
          
                    {/* Table Card */}
                    <Card className="rounded-t-none border-t-0 rounded-2xl">
                      <CardTable>
                        <ScrollArea>
                          <DataGridTable/>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </CardTable>
                      <CardFooter className="bg-[#F9F9FF]  rounded-b-2xl">
                        <DataGridPagination />
                      </CardFooter>
                    </Card>
                  </DataGrid>
        </div>
          {viewingUser && (
        <ViewUserModal user={viewingUser} onClose={() => setViewingUser(null)} />
      )}

      {deletingUser && (
        <DeleteConfirmModal
         user={deletingUser}
          onCancel={() => setDeletingUser(null)}
          onConfirm={confirmDelete}
        />
      )}

      </div>
    </container>
  );
};

export default UserManagementList;
