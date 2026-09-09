import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Eye,
  SquarePen,
  Trash2,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Container } from "@/components/common/container";
import { Link, useNavigate } from "react-router";
import { usePagePermissions } from "@/utils/permissions";
import { AccessDenied } from "@/components/common/AccessDenied";
import {
  getAllSubOutlets,
  getSubOutletById,
  deleteSubOutletById,
} from "../../services/apiServices";
import { notify } from "@/utils/toast";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';

/* -----------------------------------------------------------------------
 * Status badge — rounded-full pill style matching PurchaseRequisitionList
 * -------------------------------------------------------------------- */
const STATUS_STYLES = {
  active:   "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-500",
};

const STATUS_DOT = {
  active:   "bg-emerald-500",
  inactive: "bg-gray-400",
};

const STATUS_LABELS = {
  active:   "Active",
  inactive: "Inactive",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 font-semibold rounded-full text-xs px-2.5 py-1 ${
      STATUS_STYLES[status] || "bg-gray-100 text-gray-500"
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || "bg-gray-400"}`} />
    {STATUS_LABELS[status] || status}
  </span>
);

// Truncates long text, reveals full value on hover
const TruncatedCell = ({
  value,
  widthClass = "max-w-[180px]",
  className = "text-gray-600",
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value || "—"}
  </span>
);

const STATUS_OPTIONS = [
  { value: "all",      label: "All Status" },
  { value: "active",   label: "Active" },
  { value: "inactive", label: "Inactive" },
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

const SubUnitListing = () => {
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Sub Units');
  const [subUnits, setSubUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const normalizeSubUnit = (item) => ({
    id: item.id,
    name: item.subOutletName || "",
    code: item.subOutletCode || "",
    location: item.cityName || "",
    email: item.email || "",
    mobile: item.contactNumber || "",
    contactPerson: item.contactPerson || "",
    status: item.isActive ? "active" : "inactive",
    originalData: item,
  });

  const fetchSubUnits = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getAllSubOutlets();
      const list =
        res?.data?.data ||
        res?.data?.content ||
        res?.data ||
        [];
      const subUnitList = Array.isArray(list) ? list : [];
      setSubUnits(subUnitList.map(normalizeSubUnit));
    } catch (err) {
      console.error(err);
      setError("Failed to load sub units.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubUnits();
  }, []);

  const handleViewClick = async (subUnit) => {
    try {
      const res = await getSubOutletById(subUnit.id);
      const rawData = res?.data?.data || res?.data || subUnit.originalData || subUnit;
      const fullSubUnit = normalizeSubUnit(rawData);
      navigate('/sub-units/sub-unit-details', {
        state: { subUnit: fullSubUnit },
      });
    } catch (err) {
      console.error('Failed to fetch sub unit details:', err);
      notify.error('Failed to load sub unit details');
    }
  };

  const handleEdit = async (subUnit) => {
    try {
      const res = await getSubOutletById(subUnit.id);
      const fullSubUnit = res?.data?.data || res?.data || null;
      navigate('/sub-units/add', {
        state: { subUnit: fullSubUnit },
      });
    } catch (err) {
      console.error('Failed to fetch sub unit for edit:', err);
      notify.error('Failed to load sub unit details');
    }
  };

  const openDeleteConfirm = (subUnit) => {
    setDeleteTarget({
      id: subUnit.id,
      itemLabel: subUnit.name,
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

    setDeleteLoading(true);
    try {
      await deleteSubOutletById(deleteTarget.id);
      closeDeleteConfirm();
      fetchSubUnits();
    } catch (err) {
      console.error("Failed to delete sub unit:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredSubUnits = useMemo(
    () =>
      subUnits.filter((item) => {
        const matchSearch =
          (item.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (item.code || "").toLowerCase().includes(search.toLowerCase()) ||
          (item.location || "").toLowerCase().includes(search.toLowerCase()) ||
          (item.mobile || "").toLowerCase().includes(search.toLowerCase()) ||
          (item.contactPerson || "").toLowerCase().includes(search.toLowerCase()) ||
          (item.email || "").toLowerCase().includes(search.toLowerCase());

        const matchStatus =
          statusFilter === "all" ? true : item.status === statusFilter;

        return matchSearch && matchStatus;
      }),
    [subUnits, search, statusFilter],
  );

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, statusFilter]);

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="SUB UNIT NAME" column={column} className="my-2 text-xs" />
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
        id: "location",
        accessorFn: (row) => row.location,
        header: ({ column }) => (
          <DataGridColumnHeader title="LOCATION" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.location} widthClass="max-w-[140px]" />
        ),
        size: 150,
      },
      {
        id: "contactPerson",
        accessorFn: (row) => row.contactPerson,
        header: ({ column }) => (
          <DataGridColumnHeader title="CONTACT PERSON" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.contactPerson} widthClass="max-w-[150px]" />
        ),
        size: 160,
      },
      {
        id: "mobile",
        accessorFn: (row) => row.mobile,
        header: ({ column }) => (
          <DataGridColumnHeader title="CONTACT NUMBER" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.mobile} widthClass="max-w-[140px]" />
        ),
        size: 150,
      },
      {
        id: "email",
        accessorFn: (row) => row.email,
        header: ({ column }) => (
          <DataGridColumnHeader title="EMAIL" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.email} widthClass="max-w-[180px]" />
        ),
        size: 190,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        size: 120,
      },
      {
        id: "actions",
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleViewClick(row.original)}
              className="text-gray-500 hover:text-green-600 cursor-pointer"
              title="View sub unit"
            >
              <Eye size={18} />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleEdit(row.original)}
                className="text-gray-500 hover:text-blue-600 cursor-pointer"
                title="Update sub unit"
              >
                <SquarePen size={18} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => openDeleteConfirm(row.original)}
                className="text-red-300 hover:text-red-600 cursor-pointer"
                title="Delete sub unit"
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
    data: filteredSubUnits,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Sub Units" />;
  }

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
              Registered Sub Units
            </h1>
            <p className="text-[#667085] text-sm mt-1.5 max-w-xl">
              Manage and monitor all sub units registered within the Jaiswal Group ecosystem.
            </p>
          </div>
          {canAdd && (
            <Link
              to="/sub-units/add"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add New Sub Unit
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
              placeholder="Search sub units..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
            />
          </div>

          <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading sub units…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-red-500">
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchSubUnits}
                className="font-semibold underline cursor-pointer bg-transparent border-0"
              >
                Retry
              </button>
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredSubUnits.length}
              className="rounded-2xl"
            >
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

export default SubUnitListing;