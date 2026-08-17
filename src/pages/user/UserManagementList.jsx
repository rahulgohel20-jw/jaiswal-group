import React, { useEffect, useMemo, useState } from 'react';
import { getUserIdFromToken } from '@/utils/auth';
import { notify } from '@/utils/toast';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
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
  UsersRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
  deleteEmployeeById,
  getActiveCompany,
  getAllEmployees,
  getAllRoleMasterByUserId,
} from '@/services/apiServices';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { extractList, mapEmployeeToRow } from './utils/Employeemappers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';

// NOTE: these summary cards are still static placeholder numbers. Wire them
// up to real counts once there's a dashboard/summary endpoint — get-all's
// result length can at least drive "TOTAL USERS" in the meantime (see below).

// Truncates long text within a fixed-width box, revealing the full value on hover
const TruncatedCell = ({
  value,
  widthClass = 'max-w-[180px]',
  className = 'text-gray-600',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

const kycMeta = (status) => {
  if (status === 'Verified')
    return {
      icon: <BadgeCheck size={20} />,
      color: 'text-[#15803D]',
      KycView: 'View Details',
    };
  if (status === 'Rejected')
    return {
      icon: <CircleX size={20} />,
      color: 'text-[#BA1A1A]',
      KycView: 'View Details',
    };
  return {
    icon: <ClockFading size={20} />,
    color: 'text-[#5F2600]',
    KycView: 'Review KYC',
  };
};


const KYC_OPTIONS = [
  { key: 'all', label: 'All KYC Statuses' },
  { key: 'Verified', label: 'Verified' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Rejected', label: 'Rejected' },
];

const UserManagementList = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [activeCompanies, setActiveCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [departments, setDepartments] = useState([]);


  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const fetchActiveCompanies = async () => {
    try {
      const res = await getActiveCompany();
      const companies = res?.data?.data || [];

      setActiveCompanies(companies);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDepartmentOptions = async () => {
    try {
      const userId = getUserIdFromToken();
      const res = await getAllRoleMasterByUserId(userId);
      const list = extractList(res).map((d) => ({
        id: d.id,
        name: d.name ?? d.roleName ?? d.departmentName ?? '',
      }));
      setDepartments(list);
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
    fetchDepartmentOptions();
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
        const searchText = search.toLowerCase().trim();

        const matchesSearch =
          !searchText ||
          u.name?.toLowerCase().includes(searchText) ||
          u.email?.toLowerCase().includes(searchText) ||
          u.code?.toLowerCase().includes(searchText) ||
          u.company?.toLowerCase().includes(searchText);

        const matchesCategory =
          departmentFilter === 'all' || u.department === departmentFilter;

        const matchesKyc = kycFilter === 'all' || u.kycStatus === kycFilter;

        return matchesSearch && matchesCategory && matchesKyc;
      }),
    [userData, search, departmentFilter, kycFilter],
  );

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [search, departmentFilter, kycFilter]);
  // Edit reuses the same registration form component, switched into "update"
  // mode by the presence of state.user — the form fetches the full record
  // by id itself, so only the id needs to travel reliably here.
  const handleEdit = (user) => {
    navigate('/users/update-user', {
      state: { user: { id: user.id, name: user.name } },
    });
  };

  // View now opens a dedicated details page instead of a modal.
  const handleView = (user) => {
    navigate('/users/view-user', { state: { user } });
  };
  const openDeleteConfirm = (item) => {
    setDeleteTarget({ id: item.id, itemLabel: item.name });
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
      await deleteEmployeeById(deleteTarget.id);  
      closeDeleteConfirm();
      fetchUsers();          
    } catch (err) {
      console.error(err);
      notify.error('Failed to delete users');
    } finally {
      setDeleteSaving(false);
    }
  };


  const handleExport = (format) => {
    alert(
      `Exporting ${filteredUser.length} user(s) as ${format.toUpperCase()}`,
    );
  };

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="USER NAME"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="flex gap-3 items-center w-full min-w-0">
            <div className="flex flex-col gap-1 min-w-0">
              <span
                className="font-semibold text-gray-800 truncate block"
                title={row.original.name}
              >
                {row.original.name}
              </span>
              <span
                className="font-medium text-xs text-[#737781] truncate block"
                title={row.original.createdAt}
              >
                {row.original.createdAt}
              </span>
            </div>
          </div>
        ),
        size: 160,
      },
      {
        id: 'code',
        accessorFn: (row) => row.code,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="USER CODE"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.code} widthClass="max-w-[130px]" />
        ),
        size: 150,
      },
      {
        id: 'email',
        accessorFn: (row) => row.email,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="EMAIL ADDRESS"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.email}
            widthClass="max-w-[190px]"
          />
        ),
        size: 200,
      },
      {
        id: 'company',
        accessorFn: (row) => row.company,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="COMPANY"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.company}
            widthClass="max-w-[170px]"
          />
        ),
        size: 180,
      },
      {
        id: 'department',
        accessorFn: (row) => row.department,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="DEPARTMENT"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.department}
            widthClass="max-w-[140px]"
          />
        ),
        size: 150,
      },
      {
        id: 'kycStatus',
        accessorFn: (row) => row.kycStatus,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="KYC STATUS"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => {
          const meta = kycMeta(row.original.kycStatus);
          return (
            <div
              className={`flex gap-1 items-center whitespace-nowrap ${meta.color} font-semibold`}
            >
              <span>{meta.icon}</span>
              <span>{row.original.kycStatus}</span>
            </div>
          );
        },
        size: 130,
      },
      {
        id: 'KycView',
        accessorFn: (row) => row.kycStatus,
        header: ({ column }) => (
          <DataGridColumnHeader title="Kyc View" column={column} />
        ),
        cell: ({ row }) => {
          const meta = kycMeta(row.original.kycStatus);
          return (
            <Link
              to="/user/kyc-information"
              className={`whitespace-nowrap ${meta.KycView === 'Re-verify' ? 'text-[#BA1A1A]' : 'text-[#084E92]'} font-bold`}
            >
              {meta.KycView}
            </Link>
          );
        },
        size: 130,
      },
      {
        id: 'action',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleView(row.original)}
              className="text-gray-500 hover:text-green-600 cursor-pointer"
              title="View user"
            >
              <Eye size={18} />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(row.original)}
              className="text-gray-500 hover:text-blue-600 cursor-pointer"
              title="Update user"
            >
              <SquarePen size={18} />
            </button>
            <button
              type="button"
              onClick={() => openDeleteConfirm(row.original)}
              className="text-red-300 hover:text-red-600 cursor-pointer"
              title="Delete user"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ),
        enableSorting: false,
        size: 100,
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
    <Container>
      <div className="w-full p-4 sm:p-5 lg:p-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h1 className="text-2xl font-bold">User Management List</h1>
            <p className="pt-2 text-md text-gray-400">
              Manage enterprise-wide user access, organizational roles, and
              compliance verification status from a centralized console.
            </p>
          </div>

          <Link
            to="/users/add-user"
            className="flex items-center justify-center gap-2 bg-[#084E92] px-5 py-3 rounded-lg text-white text-sm font-medium w-full sm:w-max"
          >
            <Plus size={15} /> Add New User
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-8">
          {DATA.map((item) => (
            <div
              key={item.label}
              className=" border border-[#C3C6D1] rounded-2xl p-4"
            >
              <div className="flex justify-between">
                <span
                  className={`bg-[#084E921A]/50 p-2 w-7 h-7 rounded flex items-center justify-center`}
                >
                  <p className="text-xl">{item.icon}</p>
                </span>
              </div>
              <div className="mt-2">
                <h3 className="text-xs text-[#737781]">{item.label}</h3>
                <p className={`${item.color} font-bold`}>{item.count}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4 my-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-center">
            {/* Search Section - Left 50% */}
            <div className="relative w-full border border-[#C3C6D1] rounded-lg">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-3 py-2.5 outline-none rounded-lg text-sm"
              />
            </div>

            {/* Filters Section - Right 50% */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* KYC */}
              <Select
                value={kycFilter}
                onValueChange={setKycFilter}
              >
                <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {KYC_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Department */}
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Department</SelectItem>

                  {departments.map((opt) => (
                    <SelectItem
                      key={opt.id}
                      value={opt.name}
                    >
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>
          </div>
        </div>
        {loadError && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
            <button
              type="button"
              onClick={fetchUsers}
              className="ml-auto font-semibold underline cursor-pointer bg-transparent border-0"
            >
              Retry
            </button>
          </div>
        )}

        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">
              Loading users...
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredUser.length}
              className="rounded-2xl"
              tableLayout={{
                width: 'fixed',
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
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

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={closeDeleteConfirm}
          onConfirm={confirmDelete}
          itemLabel={deleteTarget?.itemLabel}
          saving={deleteSaving}
        />
      </div>
    </Container>
  );
};

export default UserManagementList;
