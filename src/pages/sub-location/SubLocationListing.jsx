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
import { Container } from "@/components/common/container";
import { useNavigate, useLocation } from "react-router";
import { usePagePermissions } from "@/utils/permissions";
import { AccessDenied } from "@/components/common/AccessDenied";
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { useOrgScope } from "@/hooks/useOrgScope";
import {
  getAllSubLocations,
  getAllSubLocationsByOrganizationId,
  getSubLocationById,
  deleteSubLocationById,
  getOrganizationByType,
  getAllSubOutlets,
  getAllSubOutletsByOrganization,
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
 * Status badge & Location Type Badge
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

function FilterDropdown({ value, onChange, options, placeholder = "Select" }) {
  return (
    <div className="relative min-w-[150px]">
      <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full pl-10 pr-8 rounded-xl border border-[#C3C6D1] bg-white text-sm text-[#101828] font-medium focus:ring-2 focus:ring-[#084E92]/15 focus:border-[#084E92]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const SubLocationListing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions([
    'Sub Locations',
    'Sub Location',
    'Sub-Locations',
    'Sub-Location',
  ]);

  const {
    isOutletUser,
    showUnitDropdown,
    effectiveOutletId,
    units: scopeUnits,
    selfOrg,
  } = useOrgScope();

  const [subLocations, setSubLocations] = useState([]);
  const [units, setUnits] = useState([]);
  const [subUnits, setSubUnits] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState(
    () => location.state?.organizationId ? String(location.state.organizationId) : ""
  );
  const [subUnitFilter, setSubUnitFilter] = useState(
    () => location.state?.subOutletId ? String(location.state.subOutletId) : location.state?.subUnitId ? String(location.state.subUnitId) : ""
  );

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sync filters if location.state changes
  useEffect(() => {
    if (location.state?.subOutletId || location.state?.subUnitId) {
      setSubUnitFilter(String(location.state.subOutletId || location.state.subUnitId));
    }
    if (location.state?.organizationId) {
      setUnitFilter(String(location.state.organizationId));
    }
  }, [location.state]);

  // Fetch Units (Parent Outlets) only for users with Unit dropdown access
  useEffect(() => {
    if (showUnitDropdown) {
      const fetchUnits = async () => {
        try {
          const res = await getOrganizationByType(OrgTypes.OUTLET);
          const list = extractArray(res);
          setUnits(list);
        } catch (err) {
          console.error("Failed to load units:", err);
        }
      };
      fetchUnits();
    }
  }, [showUnitDropdown]);

  // Fetch Sub Units (Parent Sub Outlets)
  useEffect(() => {
    const fetchSubUnitsList = async () => {
      try {
        if (!showUnitDropdown && effectiveOutletId) {
          const res = await getAllSubOutletsByOrganization(effectiveOutletId);
          const list = extractArray(res);
          setSubUnits(list);
        } else {
          const res = await getAllSubOutlets();
          const list = extractArray(res);
          setSubUnits(list);
        }
      } catch (err) {
        console.error("Failed to load sub units:", err);
      }
    };

    fetchSubUnitsList();
  }, [showUnitDropdown, effectiveOutletId]);

  // Map of unit/sub-unit IDs to names for quick fallback lookup
  const unitMap = useMemo(() => {
    const map = {};
    units.forEach((u) => {
      map[String(u.id)] = u.companyNameEnglish || u.companyCode || `Unit #${u.id}`;
    });
    if (selfOrg?.id) {
      map[String(selfOrg.id)] = selfOrg.companyNameEnglish || selfOrg.companyCode || `Unit #${selfOrg.id}`;
    }
    return map;
  }, [units, selfOrg]);

  const subUnitMap = useMemo(() => {
    const map = {};
    subUnits.forEach((su) => {
      map[String(su.id)] = su.subOutletName || su.name || `Sub Unit #${su.id}`;
    });
    return map;
  }, [subUnits]);

  const normalizeSubLocation = (item) => ({
    id: item.id,
    name: item.locationName || item.name || "",
    shortCode: item.shortCode || "",
    type: item.locationType || item.type || "STORE",
    organizationId: item.organizationId || item.orgId || item.unitId || "",
    subOutletId: item.subOutletId || item.subUnitId || "",
    unitName: item.organizationName || item.unitName || unitMap[String(item.organizationId)] || "",
    subUnitName: item.subOutletName || item.subUnitName || subUnitMap[String(item.subOutletId)] || "",
    contactPerson: item.contactPerson || "",
    contactNumber: item.contactNumber || item.mobile || "",
    email: item.email || "",
    address: item.address || "",
    pincode: item.pincode || "",
    status: item.isActive ? "active" : "inactive",
    originalData: item,
  });

  const fetchSubLocations = async () => {
    setLoading(true);
    setError(null);

    try {
      let res;
      if (!showUnitDropdown && effectiveOutletId) {
        res = await getAllSubLocationsByOrganizationId(effectiveOutletId);
      } else {
        res = await getAllSubLocations();
      }

      const list = extractArray(res);
      setSubLocations(list.map(normalizeSubLocation));
    } catch (err) {
      console.error("Failed to fetch sub locations:", err);
      setError("Failed to load sub locations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubLocations();
  }, [showUnitDropdown, effectiveOutletId, unitMap, subUnitMap]);

  const handleViewClick = async (item) => {
    try {
      const res = await getSubLocationById(item.id);
      const rawData = res?.data?.data || res?.data || item.originalData || item;
      const fullItem = normalizeSubLocation(rawData);
      navigate('/sub-locations/sub-location-details', {
        state: { subLocation: fullItem },
      });
    } catch (err) {
      console.error('Failed to fetch sub location details:', err);
      notify.error('Failed to load sub location details');
    }
  };

  const handleEdit = async (item) => {
    try {
      const res = await getSubLocationById(item.id);
      const fullItem = res?.data?.data || res?.data || item.originalData || null;
      navigate('/sub-locations/add', {
        state: { subLocation: fullItem },
      });
    } catch (err) {
      console.error('Failed to fetch sub location for edit:', err);
      notify.error('Failed to load sub location details');
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

    setDeleteLoading(true);
    try {
      await deleteSubLocationById(deleteTarget.id);
      closeDeleteConfirm();
      fetchSubLocations();
    } catch (err) {
      console.error("Failed to delete sub location:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Sub units available in filter dropdown based on selected unit
  const filteredSubUnitOptions = useMemo(() => {
    let list = subUnits;
    if (showUnitDropdown && unitFilter) {
      list = list.filter((su) => String(su.organizationId || su.orgId) === String(unitFilter));
    }
    return list.map((su) => ({
      value: String(su.id),
      label: su.subOutletName || su.name || `Sub Unit #${su.id}`,
    }));
  }, [subUnits, showUnitDropdown, unitFilter]);

  const filteredSubLocations = useMemo(
    () =>
      subLocations.filter((item) => {
        const searchText = search.toLowerCase();

        const matchSearch =
          (item.name || "").toLowerCase().includes(searchText) ||
          (item.shortCode || "").toLowerCase().includes(searchText) ||
          (item.unitName || "").toLowerCase().includes(searchText) ||
          (item.subUnitName || "").toLowerCase().includes(searchText) ||
          (item.contactPerson || "").toLowerCase().includes(searchText) ||
          (item.contactNumber || "").toLowerCase().includes(searchText) ||
          (item.email || "").toLowerCase().includes(searchText);

        const matchStatus =
          statusFilter === "all" || item.status === statusFilter;

        const matchType =
          typeFilter === "all" ||
          String(item.type).toUpperCase() === String(typeFilter).toUpperCase();

        const matchUnit =
          !showUnitDropdown ||
          !unitFilter ||
          String(item.organizationId) === String(unitFilter);

        const matchSubUnit =
          !subUnitFilter || String(item.subOutletId) === String(subUnitFilter);

        return matchSearch && matchStatus && matchType && matchUnit && matchSubUnit;
      }),
    [subLocations, search, statusFilter, typeFilter, showUnitDropdown, unitFilter, subUnitFilter],
  );

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, statusFilter, typeFilter, unitFilter, subUnitFilter]);

  const columns = useMemo(
    () => [
      {
        id: "sno",
        header: ({ column }) => (
          <DataGridColumnHeader title="S.NO" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2">{String(row.index + 1).padStart(2, '0')}</span>
        ),
        enableSorting: false,
        size: 36,
      },
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="SUB LOCATION NAME" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.name}
            widthClass="max-w-[150px]"
            className="font-semibold text-[#084E92]"
          />
        ),
        size: 150,
      },
      {
        id: "type",
        accessorFn: (row) => row.type,
        header: ({ column }) => (
          <DataGridColumnHeader title="TYPE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-xs text-gray-700 uppercase">
            {row.original.type || "—"}
          </span>
        ),
        enableSorting: false,
        size: 75,
      },
      ...(showUnitDropdown
        ? [
            {
              id: "unitName",
              accessorFn: (row) => row.unitName,
              header: ({ column }) => (
                <DataGridColumnHeader title="PARENT UNIT" column={column} className="my-2 text-xs" />
              ),
              cell: ({ row }) => (
                <TruncatedCell
                  value={row.original.unitName || unitMap[String(row.original.organizationId)]}
                  widthClass="max-w-[120px]"
                />
              ),
              enableSorting: false,
              size: 120,
            },
          ]
        : []),
      {
        id: "subUnitName",
        accessorFn: (row) => row.subUnitName,
        header: ({ column }) => (
          <DataGridColumnHeader title="SUB UNIT / LOCATION" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.subUnitName || subUnitMap[String(row.original.subOutletId)]}
            widthClass="max-w-[130px]"
          />
        ),
        enableSorting: false,
        size: 130,
      },
      {
        id: "contactPerson",
        accessorFn: (row) => row.contactPerson,
        header: ({ column }) => (
          <DataGridColumnHeader title="CONTACT PERSON" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.contactPerson} widthClass="max-w-[110px]" />
        ),
        enableSorting: false,
        size: 110,
      },
      {
        id: "contactNumber",
        accessorFn: (row) => row.contactNumber,
        header: ({ column }) => (
          <DataGridColumnHeader title="CONTACT NO." column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.contactNumber} widthClass="max-w-[100px]" />
        ),
        enableSorting: false,
        size: 100,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: false,
        size: 75,
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
              title="View Sub Location"
            >
              <Eye size={18} />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleEdit(row.original)}
                className="text-gray-500 hover:text-blue-600 cursor-pointer"
                title="Update Sub Location"
              >
                <SquarePen size={18} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => openDeleteConfirm(row.original)}
                className="text-red-300 hover:text-red-600 cursor-pointer"
                title="Delete Sub Location"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
        size: 85,
      },
    ],
    [canEdit, canDelete, showUnitDropdown, unitMap, subUnitMap],
  );

  const table = useReactTable({
    data: filteredSubLocations,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Sub Locations" />;
  }

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title="Sub Location Master"
          actions={
            canAdd && (
              <HeaderActionButton to="/sub-locations/add">
                Add New Sub Location
              </HeaderActionButton>
            )
          }
        />

        <PageErrorAlert
          error={error}
          onRetry={fetchSubLocations}
        />

        {/* Search + Unit + SubUnit + Type + Status filter */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search sub locations..."
            />
          </div>

          {/* Unit Filter (only shown for non-outlet / admin users) */}
          {showUnitDropdown && (
            <div className="w-52 shrink-0">
              <SearchableSelect
                name="unit"
                value={unitFilter}
                onChange={(e) => {
                  setUnitFilter(e.target.value);
                  setSubUnitFilter("");
                }}
                options={units.map((unit) => ({
                  value: String(unit.id),
                  label: unit.companyNameEnglish,
                }))}
                placeholder="Select Unit"
              />
            </div>
          )}

          {/* Sub Unit Filter */}
          <div className="w-52 shrink-0">
            <SearchableSelect
              name="subUnit"
              value={subUnitFilter}
              onChange={(e) => {
                setSubUnitFilter(e.target.value);
              }}
              options={filteredSubUnitOptions}
              placeholder="Select Sub Unit / Location"
            />
          </div>

          {/* Type Filter */}
          <div className="w-40 shrink-0">
            <FilterDropdown
              value={typeFilter}
              onChange={setTypeFilter}
              options={TYPE_OPTIONS}
              placeholder="All Types"
            />
          </div>

          {/* Status Filter */}
          <div className="w-40 shrink-0">
            <FilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              placeholder="All Status"
            />
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading sub locations…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredSubLocations.length}
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

export default SubLocationListing;
