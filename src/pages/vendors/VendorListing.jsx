import { useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronRight,
  Eye,
  Handshake,
  Loader2,
  Search,
  SquarePen,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { deleteVendorById, getAllVendors } from '@/services/apiServices';
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
import { extractList, mapVendorToRow } from './vendorHelper';

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

const StatCard = ({
  icon: Icon,
  iconBg = 'bg-[#D5E3FF]',
  iconColor = 'text-[#00376C]',
  label,
  value,
  valueColor = 'text-[#1B1B1F]',
}) => (
  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
    <div
      className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}
    >
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex flex-col items-end text-right">
      <span className="text-xs font-semibold text-[#00376C]">{label}</span>
      <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
        {value}
      </span>
    </div>
  </div>
);

// Safe string helper so null/undefined API values never crash search or render
const str = (val) => String(val ?? '');

const VendorList = () => {
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Vendors');

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, itemLabel }
  const [deleteSaving, setDeleteSaving] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllVendors();
      const list = extractList(res);
      setVendors(list.map(mapVendorToRow));
    } catch (err) {
      console.error(err);
      setError('Failed to load vendors. Please try again.');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const term = search.trim().toLowerCase();

  const filteredVendors = useMemo(
    () =>
      vendors.filter((v) =>
        [v.name, v.vendorCode, v.emailid, v.company].some((field) =>
          str(field).toLowerCase().includes(term),
        ),
      ),
    [vendors, term],
  );

  // Vendors created in the current calendar month.
  // Assumes mapVendorToRow exposes a `createdAt` date field; adjust the name if yours differs.
  const onboardedThisMonth = useMemo(() => {
    const now = new Date();
    return vendors.filter((v) => {
      if (!v.createdAt) return false;
      const d = new Date(v.createdAt);
      return (
        !Number.isNaN(d.getTime()) &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [vendors]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleEdit = (vendor) => {
    navigate('/vendors/add-vendor', {
      state: {
        vendorId: vendor.id,
        isEdit: true,
      },
    });
  };

  const openDeleteConfirm = (vendor) => {
    setDeleteTarget({
      id: vendor.id,
      itemLabel: vendor.name,
    });
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
      await deleteVendorById(deleteTarget.id);
      closeDeleteConfirm();
      await fetchVendors();
    } catch (err) {
      console.error(err);
      setError('Failed to delete vendor. Please try again.');
    } finally {
      setDeleteSaving(false);
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
            className="text-gray-500 font-semibold"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500">
            {String(row.index + 1).padStart(2, '0')}
          </span>
        ),
        enableSorting: false,
        size: 70,
      },
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Vendor Name" column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#084E92] flex items-center justify-center text-xs font-semibold shrink-0">
              {str(row.original.name).charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 leading-none truncate">
                {row.original.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {row.original.vendorCode}
              </p>
            </div>
          </div>
        ),
        size: 200,
      },
      {
        id: 'email',
        accessorFn: (row) => row.emailid,
        header: ({ column }) => (
          <DataGridColumnHeader title="Email Address" column={column} />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.emailid}
            widthClass="max-w-[190px]"
          />
        ),
        size: 200,
      },
      {
        id: 'mobile',
        accessorFn: (row) => row.mobile,
        header: ({ column }) => (
          <DataGridColumnHeader title="Mobile Number" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-gray-600 whitespace-nowrap">
            {row.original.mobile}
          </span>
        ),
        size: 140,
      },
      {
        id: 'company',
        accessorFn: (row) => row.company,
        header: ({ column }) => (
          <DataGridColumnHeader title="Company" column={column} />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.company}
            widthClass="max-w-[170px]"
          />
        ),
        size: 190,
      },
      {
        id: 'actions',
        header: () => (
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Actions
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() =>
                navigate('/vendors/view-vendor', {
                  state: { vendorId: row.original.id },
                })
              }
              className="text-gray-500 hover:text-green-600 cursor-pointer"
              title="View vendor"
            >
              <Eye size={18} />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleEdit(row.original)}
                className="text-gray-500 hover:text-blue-600 cursor-pointer"
                title="Update vendor"
              >
                <SquarePen size={18} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => openDeleteConfirm(row.original)}
                className="text-red-300 hover:text-red-600 cursor-pointer"
                title="Delete vendor"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
        size: 130,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEdit, canDelete],
  );

  const table = useReactTable({
    data: filteredVendors,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
  });

  if (!canView) {
    return <AccessDenied pageTitle="Vendors" />;
  }

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title="Vendor Management List"
          actions={
            canAdd && (
              <HeaderActionButton to="/vendors/add-vendor">
                Add New Vendor
              </HeaderActionButton>
            )
          }
        />

        <PageErrorAlert error={error} onRetry={fetchVendors} />

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <SearchBar
            isStandalone={true}
            value={search}
            onChange={handleSearchChange}
            onClear={() => setSearch('')}
            placeholder="Search by vendor name, code, email..."
          />
        </div>

        {/* Table */}
        <div className="w-full border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading vendors…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredVendors.length}
              tableLayout={{ columnsResizable: true }}
            >
              <Card className="rounded-t-none border-t-0">
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
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        itemLabel={deleteTarget?.itemLabel}
        saving={deleteSaving}
      />
    </Container>
  );
};

export default VendorList;