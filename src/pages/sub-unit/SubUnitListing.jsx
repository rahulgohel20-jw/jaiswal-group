import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Eye,
  SquarePen,
  Trash2,
  Search,
  Filter,
  Loader2,
  ChevronRight,
  MapPin,
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
import { useNavigate } from "react-router";
import { usePagePermissions } from "@/utils/permissions";
import { AccessDenied } from "@/components/common/AccessDenied";
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import {
  getAllSubOutlets,
  getSubOutletById,
  deleteSubOutletById,
  getOrganizationByType,
} from "../../services/apiServices";
import { notify } from "@/utils/toast";
import { PageErrorAlert } from "@/components/common/PageErrorAlert";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrgTypes } from "../../constants/orgTypes";
import SearchableSelect from "../../utils/SearchableSelect";

const extractArray = (res) => {
  if (!res) return [];
  const raw = res?.data?.data ?? res?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

/* -----------------------------------------------------------------------
 * Status badge — rounded-full pill style matching PurchaseRequisitionList
 * -------------------------------------------------------------------- */
const STATUS_TEXT_COLORS = {
  active: "text-emerald-600",
  inactive: "text-gray-500",
};

const STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
};

const StatusBadge = ({ status }) => (
  <span
    className={`font-semibold text-xs whitespace-nowrap ${
      STATUS_TEXT_COLORS[status] || "text-gray-600"
    }`}
  >
    {STATUS_LABELS[status] || status || "—"}
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
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "LOCATION", label: "LOCATION" },
  { value: "KITCHEN", label: "KITCHEN" },
  { value: "STORE", label: "STORE" },
];

function TypeDropdown({ value, onChange }) {
  return (
    <div className="relative min-w-[150px]">
      <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full pl-10 pr-8 rounded-xl border border-[#C3C6D1] bg-white text-sm text-[#101828] font-medium focus:ring-2 focus:ring-[#084E92]/15 focus:border-[#084E92]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>

        <SelectContent>
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatusDropdown({ value, onChange }) {
  return (
    <div className="relative min-w-[160px]">
      <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
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

const SubUnitListing = () => {
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Sub Units');
  const [subUnits, setSubUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [unitFilter, setUnitFilter] = useState("");
  const [units, setUnits] = useState([]);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await getOrganizationByType(OrgTypes.OUTLET);
        const list = extractArray(res);
        setUnits(list);
      } catch (error) {
        console.error("Failed to load units:", error);
      }
    };

    fetchUnits();
  }, []);

  const normalizeSubUnit = (item) => ({
    id: item.id,
    name: item.subOutletName || "",
    code: item.subOutletCode || "",
    type: item.subOutletType || item.type || item.locationType || "LOCATION",
    location: item.cityName || "",
    email: item.email || "",
    mobile: item.contactNumber || "",
    organizationId: item.organizationId || item.orgId || "",
    contactPerson: item.contactPerson || "",
    status: item.isActive ? "active" : "inactive",
    originalData: item,
  });

  const fetchSubUnits = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getAllSubOutlets();
      const list = extractArray(res);
      setSubUnits(list.map(normalizeSubUnit));
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
        const searchText = search.toLowerCase();

        const matchSearch =
          (item.name || "").toLowerCase().includes(searchText) ||
          (item.code || "").toLowerCase().includes(searchText) ||
          (item.type || "").toLowerCase().includes(searchText) ||
          (item.location || "").toLowerCase().includes(searchText) ||
          (item.mobile || "").toLowerCase().includes(searchText) ||
          (item.contactPerson || "").toLowerCase().includes(searchText) ||
          (item.email || "").toLowerCase().includes(searchText);

        const matchStatus =
          statusFilter === "all" || item.status === statusFilter;

        const matchType =
          typeFilter === "all" || item.type === typeFilter;

        const matchUnit =
          !unitFilter ||
          String(item.organizationId) === String(unitFilter);

        return matchSearch && matchStatus && matchType && matchUnit;
      }),
    [subUnits, search, statusFilter, typeFilter, unitFilter],
  );
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, statusFilter, typeFilter, unitFilter]);

  const columns = useMemo(
    () => [
      {
        id: "sno",
        header: ({ column }) => (
          <DataGridColumnHeader title="S.NO" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2 text-xs">{String(row.index + 1).padStart(2, '0')}</span>
        ),
        enableSorting: false,
        size: 36,
      },
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="SUB UNIT NAME" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.name}
            widthClass="max-w-[140px]"
            className="font-semibold text-[#084E92] text-xs"
          />
        ),
        enableSorting: false,
        size: 150,
      },
      {
        id: "type",
        accessorFn: (row) => row.type,
        header: ({ column }) => (
          <DataGridColumnHeader title="TYPE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-gray-700 uppercase whitespace-nowrap">
            {row.original.type || "—"}
          </span>
        ),
        enableSorting: false,
        size: 85,
      },
      {
        id: "location",
        accessorFn: (row) => row.location,
        header: ({ column }) => (
          <DataGridColumnHeader title="LOCATION" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.location} widthClass="max-w-[100px]" className="text-xs text-gray-700" />
        ),
        enableSorting: false,
        size: 110,
      },
      {
        id: "contactPerson",
        accessorFn: (row) => row.contactPerson,
        header: ({ column }) => (
          <DataGridColumnHeader title="CONTACT PERSON" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.contactPerson} widthClass="max-w-[110px]" className="text-xs text-gray-700" />
        ),
        enableSorting: false,
        size: 120,
      },
      {
        id: "email",
        accessorFn: (row) => row.email,
        header: ({ column }) => (
          <DataGridColumnHeader title="EMAIL" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.email} widthClass="max-w-[120px]" className="text-xs text-gray-700" />
        ),
        enableSorting: false,
        size: 130,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap pr-1">
            <StatusBadge status={row.original.status} />
          </div>
        ),
        enableSorting: false,
        size: 75,
      },
      {
        id: "actions",
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() =>
                navigate('/sub-locations', {
                  state: {
                    subOutletId: row.original.id,
                    subOutletName: row.original.name,
                    organizationId: row.original.organizationId,
                  },
                })
              }
              className="p-1 text-gray-500 hover:text-[#084E92] hover:bg-blue-50 rounded-lg transition cursor-pointer"
              title="View Sub Locations"
            >
              <MapPin size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleViewClick(row.original)}
              className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition cursor-pointer"
              title="View sub unit"
            >
              <Eye size={15} />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleEdit(row.original)}
                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                title="Update sub unit"
              >
                <SquarePen size={15} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => openDeleteConfirm(row.original)}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                title="Delete sub unit"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
        size: 100,
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
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title="Registered Sub Units"
          actions={
            canAdd && (
              <HeaderActionButton to="/sub-units/add">
                Add New Sub Unit
              </HeaderActionButton>
            )
          }
        />

        <PageErrorAlert
          error={error}
          onRetry={fetchSubUnits}
        />

        {/* Search + Unit + Type + Status filter */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-55">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search sub units..."
            />
          </div>

          {/* Unit Filter */}
          <div className="w-55 shrink-0">
            <SearchableSelect
              name="unit"
              value={unitFilter}
              onChange={(e) => {
                setUnitFilter(e.target.value);
              }}
              options={units.map((unit) => ({
                value: String(unit.id),
                label: unit.companyNameEnglish,
              }))}
              placeholder="Select Unit"
            />
          </div>

          {/* Type Filter */}
          <div className="w-40 shrink-0">
            <TypeDropdown
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>

          {/* Status Filter */}
          <div className="w-40 shrink-0">
            <StatusDropdown
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>
        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading sub units…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredSubUnits.length}
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

export default SubUnitListing;