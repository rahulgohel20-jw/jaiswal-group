import { useEffect, useMemo, useState } from 'react';
import { OrgTypes } from '@/constants/orgTypes';
import { notify } from '@/utils/toast';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  AlertTriangle,
  Building2,
  Eye,
  Plus,
  Search,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import {
  deleteCompany,
  getCompanyById,
  getOrganizationByType,
  getRegisteredCompany,
} from '../../services/apiServices';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  onboarding: 'bg-blue-50 text-blue-700 ring-blue-200',
  inactive: 'bg-gray-100 text-gray-500 ring-gray-200',
};

const STATUS_LABELS = {
  active: 'Active',
  pending: 'Pending',
  onboarding: 'Onboarding',
  inactive: 'Inactive',
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        status === 'active'
          ? 'bg-emerald-500'
          : status === 'pending'
            ? 'bg-amber-500'
            : status === 'onboarding'
              ? 'bg-blue-500'
              : 'bg-gray-400'
      }`}
    />
    {STATUS_LABELS[status]}
  </span>
);


const CompanyRegistration = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const normalizeCompany = (item) => ({
    id: item.id,
    name: item.companyNameEnglish || '',
    code: item.companyCode || '',
    location: item.cityName || '',
    mobile: item.mobilenumber || '',
    gstNumber: item.gstNumber || '',
    status: item.isActive ? 'active' : 'inactive',
  });

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getOrganizationByType(OrgTypes.SUB_COMPANY);

      const list = res?.data?.data || res?.data?.content || res?.data || [];

      const companyList = Array.isArray(list) ? list : [];

      setCompanies(companyList.map(normalizeCompany));
    } catch (err) {
      console.error(err);
      setError('Failed to load companies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleViewClick = async (company) => {
    try {
      const res = await getCompanyById(company.id);
      navigate('/companies/company-details', {
        state: {
          company: res.data.data,
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const filteredCompanies = useMemo(
    () =>
      companies.filter((c) => {
        const matchesSearch =
          (c.name || '').toLowerCase().includes(search) ||
          (c.code || '').toLowerCase().includes(search) ||
          (c.location || '').toLowerCase().includes(search) ||
          (c.mobile || '').toLowerCase().includes(search);
        const matchesStatus =
          statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [companies, search, statusFilter],
  );
  const openDeleteConfirm = (row) => {
    setDeleteTarget({ id: row.id, name: row.name });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await deleteCompany(deleteTarget.id);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      fetchCompanies();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = async (company) => {
    try {
      const res = await getCompanyById(company.id);
      navigate('/companies/update-company', {
        state: {
          company: res.data.data,
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Company Name" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-gray-800">
            {row.original.name}
          </span>
        ),
        size: 220,
      },
      {
        id: 'code',
        accessorFn: (row) => row.code,
        header: ({ column }) => (
          <DataGridColumnHeader title="Company Code" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-gray-600">{row.original.code}</span>
        ),
      },
      {
        id: 'location',
        accessorFn: (row) => row.location,
        header: ({ column }) => (
          <DataGridColumnHeader title="Location" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-gray-600">{row.original.location}</span>
        ),
      },
      {
        id: 'mobile',
        accessorFn: (row) => row.mobile,
        header: ({ column }) => (
          <DataGridColumnHeader title="Mobile Number" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-gray-600">{row.original.mobile}</span>
        ),
      },
      {
        id: 'gstNumber',
        accessorFn: (row) => row.gstNumber,
        header: ({ column }) => (
          <DataGridColumnHeader title="GST Number" column={column} />
        ),
        cell: ({ row }) =>
          row.original.gstNumber ? (
            <span className="text-gray-700">{row.original.gstNumber}</span>
          ) : (
            <span className="text-gray-300">—</span>
          ),
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: () => (
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Actions
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleViewClick(row.original)}
              className="text-gray-500 hover:text-green-600 cursor-pointer"
              title="View company"
            >
              <Eye size={18} />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(row.original)}
              className="text-gray-500 hover:text-blue-600 cursor-pointer"
              title="Update company"
            >
              <SquarePen size={18} />
            </button>
            <button
              type="button"
              onClick={() => openDeleteConfirm(row.original)}
              className="text-red-300 hover:text-red-600 cursor-pointer"
              title="Delete company"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredCompanies,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const STATUS_TABS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'pending', label: 'Pending' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'inactive', label: 'Inactive' },
  ];

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-60">
          Loading companies...
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="text-red-500 text-center py-10">{error}</div>
      </Container>
    );
  }
  return (
    <Container>
      <div className="p-4 md:p-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-none">
              Registered Companies
            </h1>
            <p className="text-sm text-gray-400 mt-2.5 max-w-2xl">
              Manage and monitor all corporate entities registered within the
              Jaiswal Group ecosystem through our centralized administration
              panel.
            </p>
          </div>
          <Link
            to="/companies/registration"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-900 text-white text-sm font-semibold border-0 cursor-pointer transition whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add new company
          </Link>
        </div>

        <DataGrid table={table} recordCount={filteredCompanies.length}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-t-2xl border border-b-0 border-gray-100 gap-4 flex-wrap">
            {/* Search */}
            <div className="relative sm:w-[50%] w-full border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50 ">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
                className="pl-9 pr-4 py-2 outline-none focus:ring-1 focus:ring-emerald-100 focus:border-emerald-300 w-56 transition placeholder-gray-400"
              />
            </div>

            {/* Status filter tabs */}
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl p-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border-0 ${
                    statusFilter === tab.key
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'bg-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Card */}
          <Card className="rounded-t-none border-t-0 border shadow-none">
            <CardTable>
              <ScrollArea>
                <DataGridTable />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
            <CardFooter>
              <DataGridPagination />
            </CardFooter>
          </Card>
        </DataGrid>
      </div>

       <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={closeDeleteConfirm}
          onConfirm={confirmDelete}
          itemLabel={deleteTarget?.name}
          saving={deleteLoading}
        />
    </Container>
  );
};

export default CompanyRegistration;
