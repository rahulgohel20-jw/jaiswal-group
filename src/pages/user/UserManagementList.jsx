import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  CircleCheck,
  CircleX,
  ClockFading,
  Download,
  Hourglass,
  ListFilter,
  Plus,
  Search,
  TrendingUp,
  UsersRound,
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
    img: <img src="" alt="profile-img" />,
    name: 'Aditya Jaiswal',
    createdBy: 'Created 12 Oct, 2023',
    code: 'USR-2024-0042',
    email: 'aditya.j@jaiswalgroup.com',
    company: 'Jaiswal Group India Pvt Ltd',
    role: 'Super Admin',
    department: 'Management',
    kycStatus: 'Verified',
    kycIcon: <BadgeCheck />,
    color: 'text-[#15803D]',
    action: 'View Details',
  },
  {
    id: 2,
    img: <img src="" alt="profile-img" />,
    name: 'Priya Sharma',
    createdBy: 'Created 12 Oct, 2023',
    code: 'USR-2024-0042',
    email: 'p.sharma@jaiswalgroup.com',
    company: 'Jaiswal Group India Pvt Ltd',
    role: 'Finance Head',
    department: 'Finance',
    kycStatus: 'Pending',
    kycIcon: <ClockFading />,
    color: 'text-[#5F2600]',
    action: 'Review KYC',
  },
  {
    id: 3,
    img: <img src="" alt="profile-img" />,
    name: 'Rahul Varma',
    createdBy: 'Created 12 Oct, 2023',
    code: 'USR-2024-0042',
    email: 'rahul.v@jaiswalgroup.com',
    company: 'Jaiswal Group India Pvt Ltd',
    role: 'Outlet Manager ',
    department: 'Operations',
    kycStatus: 'Verified',
    kycIcon: <BadgeCheck />,
    color: 'text-[#15803D]',
    action: 'Re-verify',
  },
  {
    id: 4,
    img: <img src="" alt="profile-img" />,
    name: 'Sneha Patel',
    createdBy: 'Created 12 Oct, 2023',
    code: 'USR-2024-0155',
    email: 'sneha.p@jaiswalgroup.com',
    company: 'Jaiswal Group India Pvt Ltd',
    role: 'Logistics Executive',
    department: 'Logistics',
    kycStatus: 'Rejected',
    kycIcon: <CircleX />,
    color: 'text-[#BA1A1A]',
    action: 'View Details',
  },
  {
    id: 5,
    img: <img src="" alt="profile-img" />,
    name: 'Vikram Mehta',
    createdBy: 'Created 12 Oct, 2023',
    code: 'USR-2024-0201',
    email: 'v.mehta@jaiswalgroup.com',
    company: 'Jaiswal Group India Pvt Ltd',
    role: 'System Analyst',
    department: 'IT Support',
    kycStatus: 'Verified',
    kycIcon: <BadgeCheck />,
    color: 'text-[#15803D]',
    action: 'Review KYC',
  },
];

const UserManagementList = () => {
  const [userData, setUserData] = useState(INITIAL_DATA)
const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

   const columns = useMemo(
      () => [
        {
          id: "name",
          accessorFn: (row) => row.name,
          header: ({ column }) => <DataGridColumnHeader title="USER NAME" column={column} className="my-2 text-xs"/>,
          cell: ({ row }) => (
            <div className='flex gap-2 items-center w-full'>
                <img src="" alt="profile-img" className='w-10 h-10 rounded-full border border-gray-500' />
                <div className='flex flex-col gap-1'>
                     <span className="font-semibold text-gray-800">{row.original.name}</span>
                     <span className="font-medium text-xs text-[#737781] ">{row.original.createdBy}</span>
                </div>
               
            </div>
          
          ),
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
        },
        {
          id: "company",
          accessorFn: (row) => row.company,
          header: ({ column }) => <DataGridColumnHeader title="COMPANY" column={column} className="my-2 text-xs"/>,
          cell: ({ row }) => <span className="text-gray-600">{row.original.company}</span>,
        },
        {
          id: "role",
          accessorFn: (row) => row.role,
          header: ({ column }) => <DataGridColumnHeader title="ROLE" column={column} className="my-2 text-xs"/>,
          cell: ({ row }) => <span className="text-gray-600">{row.original.role}</span>,
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
          id: "action",
          accessorFn: (row) => row.action,
          header: ({ column }) => <DataGridColumnHeader title="ACTIONS" column={column} />,
          cell: ({ row }) => <span className={`${row.original.action === "Re-verify" ? "text-[#BA1A1A]" : "text-[#084E92]"} font-bold`}>{row.original.action}</span>,
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
      <div className="w-full md:w-[95%]">
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
            to="/users/add-new-user"
            className="flex gap-3 bg-[#084E92] justify-center items-center h-max p-4 rounded text-white text-xs"
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

          <div className="flex items-center gap-3 p-2 mx-3 w-[80%]">
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

        <div className='my-6 border border-[#C3C6D1] rounded-2xl mx-2'>
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
      </div>
    </container>
  );
};

export default UserManagementList;
