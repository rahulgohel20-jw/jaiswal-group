import { useEffect, useMemo, useState } from 'react';
import { notify } from '@/utils/toast';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronRight,
  Eye,
  Filter,
  Loader2,
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
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { OrgTypes } from '../../constants/orgTypes';
import {
  deleteCompany,
  getActiveCompany,
  getCompanyById,
  getOrganizationByType,
} from '../../services/apiServices';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '../../utils/SearchableSelect';

/* -----------------------------------------------------------------------
 * Status badge — rounded-full pill style matching PurchaseRequisitionList
 * -------------------------------------------------------------------- */
const STATUS_TEXT_COLORS = {
  active: 'text-emerald-600',
  pending: 'text-amber-600',
  maintenance: 'text-orange-600',
  inactive: 'text-gray-500',
};

const STATUS_LABELS = {
  active: 'Active',
  pending: 'Pending',
  maintenance: 'Maintenance',
  inactive: 'Inactive',
};

const StatusBadge = ({ status }) => (
  <span
    className={`font-semibold text-xs whitespace-nowrap ${
      STATUS_TEXT_COLORS[status] || 'text-gray-600'
    }`}
  >
    {STATUS_LABELS[status] || status || '—'}
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
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
];

function StatusDropdown({ value, onChange }) {
  return (
    <div className="relative min-w-[190px]">
      <Filter
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none"
      />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full pl-10 pr-8 rounded-xl border border-[#C3C6D1] bg-white text-sm text-[#101828] font-medium focus:ring-2 focus:ring-[#084E92]/15 focus:border-[#084E92]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>

        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const normalizeUnit = (item) => ({
  id: item.id,
  name: item.companyNameEnglish || '',
  code: item.companyCode || '',
  location: item.cityName || '',
  email: item.emailid || item.email || '',
  mobile: item.mobilenumber || '',
  address:
    [item.addressEnglish, item.addressline2].filter(Boolean).join(', ') ||
    item.addressEnglish ||
    '',
  parentName: item.parentName || '',
  parentId: item.parentId || item.parentCompanyId || item.companyId || '',
  shortCode: item.shortCode || '',
  status: item.isActive ? 'active' : 'inactive',
  originalData: item,
});

const UnitListing = () => {
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Units');

  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [companyFilter, setCompanyFilter] = useState('');

  // Defined at component level so the retry button can call it too
  const fetchCompanies = async () => {
    try {
      const res = await getActiveCompany();
      const list = res?.data?.data || [];
      setCompanies(list.filter((item) => item.orgType === 'SUB_COMPANY'));
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  const fetchUnits = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getOrganizationByType(OrgTypes.OUTLET);
      const list = res?.data?.data || res?.data?.content || res?.data || [];
      const outlets = Array.isArray(list) ? list : [];
      setUnits(outlets.map(normalizeUnit));
    } catch (err) {
      console.error(err);
      setError('Failed to load units.');
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchUnits();
  }, []);

  const term = search.trim().toLowerCase();

  const filteredUnits = useMemo(
    () =>
      units.filter((u) => {
        const matchesSearch =
          !term ||
          [u.name, u.code, u.location, u.email, u.mobile].some((field) =>
            String(field ?? '').toLowerCase().includes(term),
          );

        const matchesStatus =
          statusFilter === 'all' || u.status === statusFilter;

        const matchesCompany =
          !companyFilter || String(u.parentId) === String(companyFilter);

        return matchesSearch && matchesStatus && matchesCompany;
      }),
    [units, term, statusFilter, companyFilter],
  );

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [term, statusFilter, companyFilter]);

  const handleViewClick = async (unit) => {
    try {
      const res = await getCompanyById(unit.id);
      const rawData = res?.data?.data || res?.data || unit.originalData || unit;
      const fullUnit = normalizeUnit(rawData);
      navigate('/units/view-unit', {
        state: { unit: fullUnit },
      });
    } catch (err) {
      console.error('Failed to fetch unit details:', err);
      notify.error('Failed to load unit details');
    }
  };

  const handleEdit = async (unit) => {
    try {
      const res = await getCompanyById(unit.id);
      const fullUnit = res?.data?.data || res?.data || null;
      navigate('/units/add-unit', {
        state: { unit: fullUnit },
      });
    } catch (err) {
      console.error('Failed to fetch unit for edit:', err);
      notify.error('Failed to load unit details');
    }
  };

  const openDeleteConfirm = (item) => {
    setDeleteTarget({
      id: item.id,
      itemLabel: item.name,
    });
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
      await fetchUnits();
    } catch (err) {
      console.error(err);
      notify.error('Failed to delete unit. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'sno',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="S.NO"
            column={column}
            className="my-2 text-xs whitespace-nowrap"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2">{String(row.index + 1).padStart(2, '0')}</span>
        ),
        enableSorting: false,
        size: 36,
      },
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="UNIT NAME"
            column={column}
            className="my-2 text-xs whitespace-nowrap"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.name}
            widthClass="max-w-[170px]"
            className="font-semibold text-gray-900"
          />
        ),
        enableSorting: false,
        size: 170,
      },
      {
        id: 'code',
        accessorFn: (row) => row.code,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="UNIT CODE"
            column={column}
            className="my-2 text-xs whitespace-nowrap"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.code} widthClass="max-w-[100px]" />
        ),
        enableSorting: false,
        size: 100,
      },
      {
        id: 'location',
        accessorFn: (row) => row.location,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="LOCATION"
            column={column}
            className="my-2 text-xs whitespace-nowrap"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.location}
            widthClass="max-w-[110px]"
          />
        ),
        enableSorting: false,
        size: 110,
      },
      {
        id: 'email',
        accessorFn: (row) => row.email,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="CONTACT EMAIL"
            column={column}
            className="my-2 text-xs whitespace-nowrap"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.email}
            widthClass="max-w-[160px]"
          />
        ),
        enableSorting: false,
        size: 160,
      },
      {
        id: 'mobile',
        accessorFn: (row) => row.mobile,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="MOBILE NUMBER"
            column={column}
            className="my-2 text-xs whitespace-nowrap"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.mobile}
            widthClass="max-w-[105px]"
          />
        ),
        enableSorting: false,
        size: 105,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="STATUS"
            column={column}
            className="my-2 text-xs whitespace-nowrap"
          />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: false,
        size: 75,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="ACTIONS"
            column={column}
            className="my-2 text-xs whitespace-nowrap"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleViewClick(row.original)}
              className="text-gray-500 hover:text-green-600 cursor-pointer"
              title="View Unit"
            >
              <Eye size={18} />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleEdit(row.original)}
                className="text-gray-500 hover:text-blue-600 cursor-pointer"
                title="Update Unit"
              >
                <SquarePen size={18} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => openDeleteConfirm(row.original)}
                className="text-red-300 hover:text-red-600 cursor-pointer"
                title="Delete Unit"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
        size: 75,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEdit, canDelete],
  );

  const table = useReactTable({
    data: filteredUnits,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Units" />;
  }

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title="Registered Units"
          actions={
            canAdd && (
              <HeaderActionButton to="/units/add-unit">
                Add New Unit
              </HeaderActionButton>
            )
          }
        />

        <PageErrorAlert
          error={error}
          onRetry={() => {
            fetchCompanies();
            fetchUnits();
          }}
        />

        {/* Search + company + status filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search units..."
            />
          </div>

          <div className="w-55 shrink-0">
            <SearchableSelect
              name="company"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              options={companies.map((company) => ({
                value: String(company.id),
                label: company.companyNameEnglish,
              }))}
              placeholder="Select Company"
            />
          </div>

          <div className="w-47.5 shrink-0">
            <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading units…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredUnits.length}
              className="rounded-2xl"
              tableLayout={{
                dense: true,
                width: 'fixed',
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl">
                <CardTable className="w-full overflow-x-hidden">
                  <DataGridTable />
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

export default UnitListing;