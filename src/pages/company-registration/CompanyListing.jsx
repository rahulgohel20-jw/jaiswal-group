import { useEffect, useMemo, useState } from 'react';
import { OrgTypes } from '@/constants/orgTypes';
import { notify } from '@/utils/toast';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import {
  deleteCompany,
  getCompanyById,
  getOrganizationByType,
} from '../../services/apiServices';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';

/* -----------------------------------------------------------------------
 * Status badge
 * -------------------------------------------------------------------- */
const STATUS_STYLES = {
  active:     'bg-emerald-50 text-emerald-700',
  pending:    'bg-amber-50 text-amber-600',
  onboarding: 'bg-blue-50 text-blue-700',
  inactive:   'bg-gray-100 text-gray-500',
};

const STATUS_DOT = {
  active:     'bg-emerald-500',
  pending:    'bg-amber-500',
  onboarding: 'bg-blue-500',
  inactive:   'bg-gray-400',
};

const STATUS_LABELS = {
  active:     'Active',
  pending:    'Pending',
  onboarding: 'Onboarding',
  inactive:   'Inactive',
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 font-semibold rounded-full text-xs px-2.5 py-1 ${
      STATUS_STYLES[status] || 'bg-gray-100 text-gray-500'
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`} />
    {STATUS_LABELS[status] || status}
  </span>
);

// Truncates long text, reveals full value on hover
const TruncatedCell = ({
  value,
  widthClass = 'max-w-[180px]',
  className = 'text-gray-600',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value || '—'}
  </span>
);

const STATUS_OPTIONS = [
  { value: 'all',        label: 'All Status' },
  { value: 'active',     label: 'Active' },
  { value: 'pending',    label: 'Pending' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'inactive',   label: 'Inactive' },
];

function StatusDropdown({ value, onChange }) {
  return (
    <div className="relative min-w-[190px]">
      <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full pl-10 pr-8 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Main component
 * -------------------------------------------------------------------- */
const CompanyListing = () => {
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Companies');

  const [companies,    setCompanies]    = useState([]);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination,   setPagination]   = useState({ pageIndex: 0, pageSize: 10 });
  const [error,        setError]        = useState(null);
  const [loading,      setLoading]      = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget,      setDeleteTarget]      = useState(null);
  const [deleteLoading,     setDeleteLoading]     = useState(false);

  const normalizeCompany = (item) => ({
    id:        item.id,
    name:      item.companyNameEnglish || '',
    code:      item.companyCode        || '',
    location:  item.cityName           || '',
    mobile:    item.mobilenumber       || '',
    gstNumber: item.gstNumber          || '',
    status:    item.isActive ? 'active' : 'inactive',
  });

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await getOrganizationByType(OrgTypes.SUB_COMPANY);
      const list = res?.data?.data || res?.data?.content || res?.data || [];
      setCompanies(list.map(normalizeCompany));
    } catch (err) {
      console.error(err);
      setError('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  /* ---- view / edit ---- */
  const handleViewClick = async (company) => {
    try {
      const res         = await getCompanyById(company.id);
      const fullCompany = res?.data?.data || res?.data || null;
      navigate('/companies/company-details', { state: { company: fullCompany } });
    } catch (err) {
      console.error('Failed to fetch company details:', err);
      notify.error('Failed to load company details');
    }
  };

  const handleEdit = async (company) => {
    try {
      const res         = await getCompanyById(company.id);
      const fullCompany = res?.data?.data || res?.data || null;
      navigate('/companies/registration', { state: { company: fullCompany } });
    } catch (err) {
      console.error('Failed to fetch company for edit:', err);
      notify.error('Failed to load company details');
    }
  };

  /* ---- filter ---- */
  const filteredCompanies = useMemo(() => {
    const q = search.toLowerCase();
    return companies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [companies, search, statusFilter]);

  /* ---- delete ---- */
  const openDeleteConfirm = (item) => {
    setDeleteTarget({ id: item.id, itemLabel: item.name });
    setShowDeleteConfirm(true);
  };
  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteCompany(deleteTarget.id);
      closeDeleteConfirm();
      fetchCompanies();
    } catch (err) {
      console.error('Failed to delete company:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, statusFilter]);

  /* ---- columns ---- */
  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="COMPANY" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.name}
            widthClass="max-w-[200px]"
            className="font-semibold text-[#084E92]"
          />
        ),
        size: 210,
      },
      {
        id: 'code',
        accessorFn: (row) => row.code,
        header: ({ column }) => (
          <DataGridColumnHeader title="COMPANY CODE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.code} widthClass="max-w-[130px]" />
        ),
        size: 140,
      },
      {
        id: 'location',
        accessorFn: (row) => row.location,
        header: ({ column }) => (
          <DataGridColumnHeader title="LOCATION" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.location} widthClass="max-w-[130px]" />
        ),
        size: 140,
      },
      {
        id: 'mobile',
        accessorFn: (row) => row.mobile,
        header: ({ column }) => (
          <DataGridColumnHeader title="MOBILE NUMBER" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.mobile} widthClass="max-w-[140px]" />
        ),
        size: 150,
      },
      {
        id: 'gstNumber',
        accessorFn: (row) => row.gstNumber,
        header: ({ column }) => (
          <DataGridColumnHeader title="GST NUMBER" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.gstNumber} widthClass="max-w-[160px]" />
        ),
        size: 170,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        size: 120,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleViewClick(row.original)}
              className="text-gray-500 hover:text-green-600 cursor-pointer"
              title="View company"
            >
              <Eye size={18} />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleEdit(row.original)}
                className="text-gray-500 hover:text-blue-600 cursor-pointer"
                title="Update company"
              >
                <SquarePen size={18} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => openDeleteConfirm(row.original)}
                className="text-red-300 hover:text-red-600 cursor-pointer"
                title="Delete company"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
        size: 110,
      },
    ],
    [canEdit, canDelete],
  );

  const table = useReactTable({
    data: filteredCompanies,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) return <AccessDenied pageTitle="Companies" />;

  return (
    <Container>
      <div className="mx-auto py-10 p-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div className="flex flex-col gap-1">
            <h1
              className="text-[28px] font-bold text-[#101828]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Registered Companies
            </h1>
            <p className="text-[#667085] text-sm mt-1.5 max-w-xl">
              Manage and monitor all corporate entities registered within the Jaiswal Group ecosystem.
            </p>
          </div>
          {canAdd && (
            <Link
              to="/companies/registration"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add New Company
            </Link>
          )}
        </div>

        {/* Search + status filter */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
            />
          </div>

          <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading companies…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-red-500">
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchCompanies}
                className="font-semibold underline cursor-pointer bg-transparent border-0"
              >
                Retry
              </button>
            </div>
          ) : (
            <DataGrid table={table} recordCount={filteredCompanies.length} className="rounded-2xl">
              <Card className="rounded-t-none border-t-0 rounded-2xl">
                <CardTable>
                  <ScrollArea>
                    <DataGridTable />
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardTable>
                <CardFooter className="bg-[#F9FAFC] rounded-b-2xl">
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </DataGrid>
          )}
        </div>

      </div>

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        itemLabel={deleteTarget?.itemLabel}
        saving={deleteLoading}
      />
    </Container>
  );
};

export default CompanyListing;

