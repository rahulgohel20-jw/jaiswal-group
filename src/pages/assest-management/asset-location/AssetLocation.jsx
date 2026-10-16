import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  SquarePen,
  Trash2,
  Filter,
  Loader2,
  Download,
  Plus,
} from "lucide-react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { Container } from "@/components/common/container";
import { usePagePermissions } from "@/utils/permissions";
import { AccessDenied } from "@/components/common/AccessDenied";
import { HeaderActionButton } from "@/components/common/HeaderActionButton";
import { PageHeader } from "@/components/common/PageHeader";
import SearchableSelect from "../../../utils/SearchableSelect";
import { notify } from "@/utils/toast";
import { PageErrorAlert } from "@/components/common/PageErrorAlert";
import { SearchBar } from "@/components/common/SearchBar";
import DeleteConfirmModal from "@/utils/DeleteConfirmModal";
import { useOrgScope } from "@/hooks/useOrgScope";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AssetUnitLocationModal from "./AssetUnitLocationModal";
import {
  deleteAssetUnitLocationById,
  getAllAssetUnitLocations,
} from "../../../services/apiServices";
import MasterExportModal from "../../../utils/MasterExportModal";

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
    className={`font-semibold text-xs whitespace-nowrap uppercase ${
      STATUS_TEXT_COLORS[status] || "text-gray-600"
    }`}
  >
    {STATUS_LABELS[status] || status || "—"}
  </span>
);

const TruncatedCell = ({
  value,
  widthClass = "max-w-full",
  className = "text-gray-800 font-medium",
}) => (
  <span
    title={value}
    className={`block truncate text-xs ${className} ${widthClass}`}
  >
    {value || "—"}
  </span>
);

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function StatusDropdown({ value, onChange }) {
  return (
    <div className="relative min-w-37.5">
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

const extractLocationsArray = (res) => {
  if (!res) return [];
  const raw =
    res?.data?.data?.content ??
    res?.data?.content ??
    res?.data?.data ??
    res?.data ??
    res ??
    [];
  if (Array.isArray(raw)) return raw;
  return [];
};

const AssetLocation = () => {
  const { canAdd, canEdit, canDelete, canView, canExport } =
    usePagePermissions("Asset Location Master");

  // Destructure scope metadata from useOrgScope
  // Depending on your hook structure, it provides role/scope level, current unit/org IDs, and accessible units
  const {
    units = [],
    loading: scopeLoading,
    userRole,
    scopeLevel, // e.g. "MAIN" | "COMPANY" | "UNIT"
    currentUnitId,
    unitId: fallbackUnitId,
  } = useOrgScope();

  // Determine user level (adjust checks to match your backend role naming conventions)
  const isMainUser =
    scopeLevel === "MAIN" ||
    userRole === "SUPER_ADMIN" ||
    userRole === "MAIN_ADMIN" ||
    userRole === "SUPERADMIN";

  const isUnitUser =
    scopeLevel === "UNIT" ||
    userRole === "UNIT_USER" ||
    userRole === "OUTLET_USER" ||
    (!isMainUser && units.length === 1);

  // Derive active single unit ID for unit/outlet user
  const effectiveUnitId = String(currentUnitId || fallbackUnitId || units[0]?.id || "");

  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("");

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Set default filter for unit/outlet user
  useEffect(() => {
    if (isUnitUser && effectiveUnitId) {
      setUnitFilter(effectiveUnitId);
    }
  }, [isUnitUser, effectiveUnitId]);

  // Set of allowed unit IDs accessible to the current logged-in user
  const allowedUnitIds = useMemo(() => {
    return new Set(units.map((u) => String(u.id)));
  }, [units]);

  // Compute unit options directly from useOrgScope's units
  const unitOptions = useMemo(() => {
    return units.map((u) => ({
      value: String(u.id),
      label: u.name || u.companyNameEnglish || `Unit #${u.id}`,
    }));
  }, [units]);

  // Unit lookup mapping for table display
  const unitMap = useMemo(() => {
    const map = new Map();
    units.forEach((u) => {
      map.set(String(u.id), u.name || u.companyNameEnglish || `Unit #${u.id}`);
    });
    return map;
  }, [units]);

  const normalizeLocation = useCallback(
    (item) => {
      const orgId = String(item.organizationId ?? item.orgId ?? "");
      return {
        id: item.id,
        locationName: item.locationName || item.name || "",
        organizationId: orgId,
        unitName:
          item.organizationName ||
          unitMap.get(orgId) ||
          (orgId ? `Unit #${orgId}` : "—"),
        active: item.active !== false && item.isActive !== false,
        status:
          item.active !== false && item.isActive !== false
            ? "active"
            : "inactive",
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
        originalData: item,
      };
    },
    [unitMap]
  );

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllAssetUnitLocations();
      const rawList = extractLocationsArray(res);
      setLocations(rawList.map(normalizeLocation));
    } catch (err) {
      console.error("Failed to fetch asset unit locations:", err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.msg ||
          "Failed to load asset unit locations"
      );
    } finally {
      setLoading(false);
    }
  }, [normalizeLocation]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setShowAddEditModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowAddEditModal(true);
  };

  const openDeleteConfirm = (item) => {
    setDeleteTarget({
      id: item.id,
      itemLabel: item.locationName,
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
      await deleteAssetUnitLocationById(deleteTarget.id);
      closeDeleteConfirm();
      fetchLocations();
    } catch (err) {
      console.error("Failed to delete asset unit location:", err);
      notify.error(
        err?.response?.data?.message ||
          err?.response?.data?.msg ||
          "Failed to delete asset unit location"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered dataset adhering to Role-Based Access Scopes
  const filteredData = useMemo(() => {
    return locations.filter((item) => {
      const itemOrgId = String(item.organizationId);

      // Scope Check:
      // 1. Unit user: Only their assigned unit ID
      if (isUnitUser) {
        if (effectiveUnitId && itemOrgId !== effectiveUnitId) {
          return false;
        }
      } 
      // 2. Company user: Only units belonging to their company (contained in allowedUnitIds)
      else if (!isMainUser) {
        if (allowedUnitIds.size > 0 && !allowedUnitIds.has(itemOrgId)) {
          return false;
        }
      }
      // 3. Main user: No restrictions; sees all units

      // Search & Filters
      const q = search.toLowerCase();
      const matchSearch =
        (item.locationName || "").toLowerCase().includes(q) ||
        (item.unitName || "").toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchUnit =
        !unitFilter || itemOrgId === String(unitFilter);

      return matchSearch && matchStatus && matchUnit;
    });
  }, [
    locations,
    search,
    statusFilter,
    unitFilter,
    isUnitUser,
    isMainUser,
    effectiveUnitId,
    allowedUnitIds,
  ]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, statusFilter, unitFilter]);

  const columns = useMemo(
    () => [
      {
        id: "sno",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="SR NO"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2 text-xs font-medium">
            {String(row.index + 1).padStart(2, "0")}
          </span>
        ),
        enableSorting: false,
        size: 50,
      },
      {
        id: "locationName",
        accessorFn: (row) => row.locationName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="LOCATION NAME"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.locationName}
            className="font-medium text-gray-800 text-xs"
          />
        ),
        enableSorting: true,
        size: 260,
      },
      {
        id: "unit",
        accessorFn: (row) => row.unitName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="UNIT"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.unitName}
            className="text-gray-700 text-xs"
          />
        ),
        enableSorting: true,
        size: 240,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="STATUS"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap pr-1">
            <StatusBadge status={row.original.status} />
          </div>
        ),
        enableSorting: false,
        size: 80,
      },
      {
        id: "actions",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="ACTION"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {canEdit && (
              <button
                type="button"
                onClick={() => handleEdit(row.original)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                title="Edit Location"
              >
                <SquarePen size={15} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => openDeleteConfirm(row.original)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                title="Delete Location"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
        size: 90,
      },
    ],
    [canEdit, canDelete]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { pagination, sorting },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Asset Location Master" />;
  }

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title="Asset Location Master"
          actions={
            <div className="flex items-center gap-3">
              {canExport && (
                <HeaderActionButton
                  variant="outline"
                  onClick={() => setShowExportModal(true)}
                  icon={<Download className="w-3.5 h-3.5" />}
                  label="Export"
                />
              )}
              {canAdd && (
                <HeaderActionButton
                  type="button"
                  onClick={handleOpenAddModal}
                  icon={<Plus size={15} />}
                  label="Add Unit Location"
                />
              )}
            </div>
          }
        />

        <PageErrorAlert error={error} onRetry={fetchLocations} />

        {/* Search & Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-55">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search by location or unit..."
            />
          </div>

          {/* Unit Filter (Hidden or disabled for Unit/Outlet users) */}
          {!isUnitUser && (
            <div className="w-56 shrink-0">
              <SearchableSelect
                name="unitFilter"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                options={unitOptions}
                placeholder={scopeLoading ? "Loading Units..." : "All Units"}
                disabled={scopeLoading}
              />
            </div>
          )}

          {/* Status Filter */}
          <div className="w-40 shrink-0">
            <StatusDropdown
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>

        {/* DataGrid Table Card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading asset unit locations…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredData.length}
              className="rounded-2xl"
              tableLayout={{
                dense: true,
                width: "fixed",
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

      {/* Add / Edit Modal */}
      <AssetUnitLocationModal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        onSuccess={fetchLocations}
        editData={editingItem}
        units={isUnitUser ? units.filter((u) => String(u.id) === effectiveUnitId) : units}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        itemLabel={deleteTarget?.itemLabel}
        saving={deleteLoading}
      />

      {/* Export Modal */}
      <MasterExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        tableName="asset_unit_location"
        title="Export Asset Unit Locations"
      />
    </Container>
  );
};

export default AssetLocation;