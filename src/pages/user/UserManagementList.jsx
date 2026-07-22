import React, { useEffect, useMemo, useState } from 'react';
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
  SquarePen,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getAllEmployees, deleteEmployeeById } from '@/services/apiServices';
import { extractList, mapEmployeeToRow } from './utils/Employeemappers';
import { getActiveCompany } from '../../services/apiServices';


// NOTE: these summary cards are still static placeholder numbers. Wire them
// up to real counts once there's a dashboard/summary endpoint — get-all's
// result length can at least drive "TOTAL USERS" in the meantime (see below).

// Truncates long text within a fixed-width box, revealing the full value on hover
const TruncatedCell = ({ value, widthClass = "max-w-[180px]", className = "text-gray-600" }) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

const kycMeta = (status) => {
  if (status === 'Verified') return { icon: <BadgeCheck size={20} />, color: 'text-[#15803D]', KycView: 'View Details' };
  if (status === 'Rejected') return { icon: <CircleX size={20} />, color: 'text-[#BA1A1A]', KycView: 'View Details' };
  return { icon: <ClockFading size={20} />, color: 'text-[#5F2600]', KycView: 'Review KYC' };
};

const DeleteConfirmModal = ({ user, onCancel, onConfirm, deleting }) => (
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
          disabled={deleting}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold border-0 cursor-pointer transition disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

const DEPARTMENT_OPTIONS = [
  { key: "all", label: "All Categories" },
  { key: "Management", label: "Management" },
  { key: "Finance", label: "Finance" },
  { key: "Operations", label: "Operations" },
  { key: "Logistics", label: "Logistics" },
  { key: "IT Support", label: "IT Support" },
];

const ROLE_OPTIONS = [
  { key: "all", label: "All Roles" },
  { key: "Super Admin", label: "Super Admin" },
  { key: "Finance Head", label: "Finance Head" },
  { key: "Outlet Manager", label: "Outlet Manager" },
  { key: "Logistics Executive", label: "Logistics Executive" },
  { key: "System Analyst", label: "System Analyst" },
];

const KYC_OPTIONS = [
  { key: "all", label: "All KYC Statuses" },
  { key: "Verified", label: "Verified" },
  { key: "Pending", label: "Pending" },
  { key: "Rejected", label: "Rejected" },
];

const UserManagementList = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeCompanies, setActiveCompanies] = useState([]);
 
  const fetchActiveCompanies = async () => {
  try {
    const res = await getActiveCompany();
    const companies =
      res?.data?.data || [];

    setActiveCompanies(companies);
  } catch (error) {
    console.error(error);
  }
};

  const fetchUsers = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getAllEmployees();
      const rows = extractList(res).map(mapEmployeeToRow);
      setUserData(rows);
    } catch (err) {
      console.error(err);
      setLoadError('Could not load users. Please refresh to try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchActiveCompanies();
  }, []);

  const DATA = [
  {
    label: 'TOTAL USERS',
    count: `${userData.length}`,
    icon: <UsersRound className="w-5 h-5 text-[#084E92]" />,
    color: 'text-[#084E92]',
    iconBg: 'bg-[#084E921A]/50',
  },
  {
    label: 'KYC VERIFIED',
    count: `${userData.filter((u) => u.kycStatus === 'Verified').length}`,
    icon: <BadgeCheck className="w-5 h-5 text-[#084E92]" />,
    color: 'text-[#084E92]',
    iconBg: 'bg-[#084E921A]/50',
  },
  {
    label: 'PENDING REVIEW',
    count: `${userData.filter((u) => u.kycStatus === 'Pending').length}`,
    icon: <Hourglass className="w-5 h-5 text-[#084E92]" />,
    color: 'text-[#084E92]',
    iconBg: 'bg-[#084E921A]/50',
  },
  {
    label: 'ACTIVE ORGANIZATIONS',
    count: `${activeCompanies.length}`,
    icon: <Building2 className="w-5 h-5 text-[#084E92]" />,
    color: 'text-[#084E92]',
    iconBg: 'bg-[#084E921A]/50',
  },
];
  const filteredUser = useMemo(
    () =>
      userData.filter((u) => {
        const matchesCategory = departmentFilter === "all" || u.department === departmentFilter;
        const matchesKyc = kycFilter === "all" || u.kycStatus === kycFilter;
        const matchesRole = roleFilter === "all" || u.role === roleFilter;
        return matchesCategory && matchesKyc && matchesRole;
      }),
    [userData, departmentFilter, kycFilter, roleFilter],
  );

  // Edit reuses the same registration form component, switched into "update"
  // mode by the presence of state.user — the form fetches the full record
  // by id itself, so only the id needs to travel reliably here.
  const handleEdit = (user) => {
    navigate('/users/update-user', { state: { user: { id: user.id, name: user.name } } });
  };

  // View now opens a dedicated details page instead of a modal.
  const handleView = (user) => {
    navigate('/users/view-user', { state: { user: { id: user.id, name: user.name } } });
  };

  const handleDelete = (user) => setDeletingUser(user);

  const confirmDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await deleteEmployeeById(deletingUser.id);
      setUserData((u) => u.filter((row) => row.id !== deletingUser.id));
      setDeletingUser(null);
    } catch (err) {
      console.error(err);
      alert('Could not delete this user. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = (format) => {
    alert(`Exporting ${filteredUser.length} user(s) as ${format.toUpperCase()}`);
  };

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: ({ column }) => <DataGridColumnHeader title="USER NAME" column={column} className="my-2 text-xs" />,
        cell: ({ row }) => (
          <div className='flex gap-3 items-center w-full'>
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">
              {(row.original.name || '?')
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .join("")}
            </div>
            <div className='flex flex-col gap-1'>
              <span className="font-semibold text-gray-800">{row.original.name}</span>
              <span className="font-medium text-xs text-[#737781] ">{row.original.createdBy}</span>
            </div>

          </div>

        ),
        size: 210,
      },
      {
        id: "code",
        accessorFn: (row) => row.code,
        header: ({ column }) => <DataGridColumnHeader title="USER CODE" column={column} className="my-2 text-xs" />,
        cell: ({ row }) => <span className="text-gray-600">{row.original.code}</span>,
        size: 150,
      },
      {
        id: "email",
        accessorFn: (row) => row.email,
        header: ({ column }) => <DataGridColumnHeader title="EMAIL ADDRESS" column={column} className="my-2 text-xs" />,
        cell: ({ row }) => <TruncatedCell value={row.original.email} widthClass="max-w-[190px]" />,
        size: 150,
      },
      {
        id: "company",
        accessorFn: (row) => row.company,
        header: ({ column }) => <DataGridColumnHeader title="COMPANY" column={column} className="my-2 text-xs" />,
        cell: ({ row }) => <TruncatedCell value={row.original.company} widthClass="max-w-[190px]" />,
        size: 150,
      },
      {
        id: "role",
        accessorFn: (row) => row.role,
        header: ({ column }) => <DataGridColumnHeader title="ROLE" column={column} className="my-2 text-xs" />,
        cell: ({ row }) => <span className="text-gray-600">{row.original.role}</span>,
        size: 160,
      },
      {
        id: "department",
        accessorFn: (row) => row.department,
        header: ({ column }) => <DataGridColumnHeader title="DEPARTMENT" column={column} className="my-2 text-xs" />,
        cell: ({ row }) => <span className="text-gray-600">{row.original.department}</span>,
        size: 120,
      },
      {
        id: "kycStatus",
        accessorFn: (row) => row.kycStatus,
        header: ({ column }) => <DataGridColumnHeader title="KYC STATUS" column={column} className="my-2 text-xs" />,
        cell: ({ row }) => {
          const meta = kycMeta(row.original.kycStatus);
          return (
            <div className={`flex gap-1 items-center ${meta.color} font-semibold`}>
              <span>{meta.icon}</span>
              <span>{row.original.kycStatus}</span>
            </div>
          );
        },
        size: 120,
      },
      {
        id: "KycView",
        accessorFn: (row) => row.kycStatus,
        header: ({ column }) => <DataGridColumnHeader title="Kyc View" column={column} />,
        cell: ({ row }) => {
          const meta = kycMeta(row.original.kycStatus);
          return (
            <Link to="/user/kyc-information" className={`${meta.KycView === "Re-verify" ? "text-[#BA1A1A]" : "text-[#084E92]"} font-bold`}>
              {meta.KycView}
            </Link>
          );
        },
        size: 120,
      },
      {
        id: "action",
        header: ({ column }) => <DataGridColumnHeader title="ACTIONS" column={column} />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleView(row.original)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer bg-white"
              title="View user"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(row.original)}
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
    data: filteredUser,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <container>
      <div className="w-full lg:w-[95%] p-4 md:p-6">
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

        <div className="mx-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mt-12 bg-white w-full">
          {DATA.map((item) => (
            <div key={item.label} className=" border border-[#C3C6D1] rounded-2xl p-6">
              <div className="flex justify-between">
                <span
                  className={`bg-[#084E921A]/50 p-2 w-max rounded flex items-center justify-center`}
                >
                  {item.icon}
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
              <p className="py-2 px-2 rounded mt-1">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-600 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 transition appearance-none cursor-pointer"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </p>
            </div>

            <div className="text-sm">
              <p>Department</p>
              <p className="py-2 px-2 rounded mt-1">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-600 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 transition appearance-none cursor-pointer"
                >
                  {DEPARTMENT_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </p>
            </div>
            <div className="text-sm">
              <p>KYC Status</p>
              <p className="py-2 px-2 rounded mt-1">
                <select
                  value={kycFilter}
                  onChange={(e) => setKycFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-600 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 transition appearance-none cursor-pointer"
                >
                  {KYC_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </p>
            </div>
          </div>

          <div className="lg:w-[15%] sm:w-[50%] text-xs my-2  flex items-center gap-5 w-full flex-col lg:flex-row">
            <div className="py-1 px-2 border border-[#C3C6D1] rounded">
              <button className="flex items-center gap-1 cursor-pointer" onClick={() => handleExport("csv")}>
                <Download />
                <p>Export</p>
              </button>
            </div>

            <button type='button' onClick={() => {
              setDepartmentFilter("all");
              setKycFilter("all");
              setRoleFilter("all");
            }} className="text-[#084E92] font-bold cursor-pointer">Clear All</button>
          </div>
        </div>

        {loadError && (
          <div className="mx-6 mt-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
            <button type="button" onClick={fetchUsers} className="ml-auto font-semibold underline cursor-pointer bg-transparent border-0">
              Retry
            </button>
          </div>
        )}

        <div className='w-full my-6 border border-[#C3C6D1] rounded-2xl mx-6'>
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">Loading users...</div>
          ) : (
            <DataGrid table={table} recordCount={filteredUser.length} className="rounded-2xl">
              {/* Table Card */}
              <Card className="rounded-t-none border-t-0 rounded-2xl">
                <CardTable>
                  <ScrollArea>
                    <DataGridTable />
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardTable>
                <CardFooter className="bg-[#F9F9FF]  rounded-b-2xl">
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </DataGrid>
          )}
        </div>

        {deletingUser && (
          <DeleteConfirmModal
            user={deletingUser}
            deleting={deleting}
            onCancel={() => setDeletingUser(null)}
            onConfirm={confirmDelete}
          />
        )}

      </div>
    </container>
  );
};

export default UserManagementList;