import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Filter,
  Loader2,
  RefreshCw,
  MapPin,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router";
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
import { PageErrorAlert } from "@/components/common/PageErrorAlert";
import { SearchBar } from "@/components/common/SearchBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUnassignedAssets } from "../../../services/apiServices";

const STATUS_COLORS = {
  "IN USE": "bg-blue-50 text-blue-700 border-blue-200",
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MAINTENANCE: "bg-amber-50 text-amber-700 border-amber-200",
  SCRAP: "bg-red-50 text-red-700 border-red-200",
  DAMAGED: "bg-rose-50 text-rose-700 border-rose-200",
};

const CONDITION_COLORS = {
  NEW: "text-emerald-600 bg-emerald-50 border-emerald-200",
  GOOD: "text-blue-600 bg-blue-50 border-blue-200",
  FAIR: "text-amber-600 bg-amber-50 border-amber-200",
  POOR: "text-red-600 bg-red-50 border-red-200",
};

const TruncatedCell = ({
  value,
  widthClass = "max-w-full",
  className = "text-gray-800 font-medium",
}) => (
  <span
    title={value || "—"}
    className={`block truncate text-xs ${className} ${widthClass}`}
  >
    {value || "—"}
  </span>
);

const extractAssetsArray = (res) => {
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

const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
};

const UnassignedAssets = () => {
  const navigate = useNavigate();
  const { canView, canAdd, canEdit } = usePagePermissions("Unassigned Assets");

  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rowSelection, setRowSelection] = useState({});

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const normalizeAsset = useCallback((item) => ({
    id: item.id,
    assetCode: item.assetCode || `AST-${item.id}`,
    itemName: item.itemName || "—",
    categoryName: item.categoryName || "—",
    subCategoryName: item.subCategoryName || "",
    statusName: item.statusName ? item.statusName.toUpperCase() : "UNASSIGNED",
    conditionName: item.conditionName ? item.conditionName.toUpperCase() : "FAIR",
    purchaseCost: item.purchaseCost,
    currentValue: item.currentValue ?? item.purchaseCost,
    assetType: item.assetTypeName ?? "-",
    totalQuantity: item.totalQuantity ?? 0,
    availableQuantity: item.availableQuantity ?? 0,
    images: item.images || [],
    originalData: item,
  }), []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUnassignedAssets();
      const rawList = extractAssetsArray(res);
      setAssets(rawList.map(normalizeAsset));
      setRowSelection({});
    } catch (err) {
      console.error("Failed to fetch unassigned assets:", err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.msg ||
          "Failed to load unassigned assets"
      );
    } finally {
      setLoading(false);
    }
  }, [normalizeAsset]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(
      new Set(assets.map((a) => a.categoryName).filter((c) => c && c !== "—"))
    );
    return [
      { value: "all", label: "All Categories" },
      ...unique.map((cat) => ({ value: cat, label: cat })),
    ];
  }, [assets]);

  const filteredData = useMemo(() => {
    return assets.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        item.assetCode.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "all" || item.categoryName === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || item.statusName === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assets, search, categoryFilter, statusFilter]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, categoryFilter, statusFilter]);

  // Column definitions with checkbox column
  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-[#084E92] focus:ring-[#084E92] cursor-pointer"
              checked={table.getIsAllPageRowsSelected()}
              ref={(el) => {
                if (el) el.indeterminate = table.getIsSomePageRowsSelected();
              }}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center py-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-[#084E92] focus:ring-[#084E92] cursor-pointer"
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
            />
          </div>
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: "sno",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="S.NO"
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
        size: 55,
      },
      {
        id: "assetCode",
        accessorFn: (row) => row.assetCode,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="ASSET ID"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-xs text-[#084E92]">
            {row.original.assetCode}
          </span>
        ),
        enableSorting: true,
        size: 110,
      },
      {
        id: "itemName",
        accessorFn: (row) => row.itemName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="ITEM NAME"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col py-1">
            <TruncatedCell
              value={row.original.itemName}
              className="font-medium text-gray-900 text-xs"
            />
            {row.original.subCategoryName && (
              <span className="text-[11px] text-gray-400 truncate">
                {row.original.subCategoryName}
              </span>
            )}
          </div>
        ),
        enableSorting: true,
        size: 220,
      },
      {
        id: "categoryName",
        accessorFn: (row) => row.categoryName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="CATEGORY"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.categoryName}
            className="text-gray-700 text-xs"
          />
        ),
        enableSorting: false,
        size: 170,
      },
      {
        id: "statusName",
        accessorFn: (row) => row.statusName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="STATUS"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => {
          const status = row.original.statusName;
          const style =
            STATUS_COLORS[status] || "bg-gray-100 text-gray-600 border-gray-200";
          return (
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border ${style}`}
            >
              {status}
            </span>
          );
        },
        enableSorting: false,
        size: 110,
      },
      {
        id: "conditionName",
        accessorFn: (row) => row.conditionName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="CONDITION"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => {
          const cond = row.original.conditionName;
          const style =
            CONDITION_COLORS[cond] || "text-gray-600 bg-gray-50 border-gray-200";
          return (
            <span
              className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${style}`}
            >
              {cond}
            </span>
          );
        },
        enableSorting: true,
        size: 110,
      },
      {
        id: "currentValue",
        accessorFn: (row) => row.currentValue ?? row.purchaseCost ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="VALUE"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-xs text-gray-800">
            {formatCurrency(row.original.currentValue ?? row.original.purchaseCost)}
          </span>
        ),
        enableSorting: true,
        size: 110,
      },
      {
        id: "assetType",
        accessorFn: (row) => row.assetType,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="ASSET TYPE"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.assetType}
            className="text-gray-500 text-xs"
          />
        ),
        enableSorting: false,
        size: 140,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getRowId: (row) => String(row.id),
    state: { pagination, sorting, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedAssetIds = useMemo(() => {
    return Object.keys(rowSelection).filter((id) => rowSelection[id]);
  }, [rowSelection]);

  const handleAssignAssetClick = () => {
    navigate('/assets/assign-asset', {
      state: { preSelectedAssetIds: selectedAssetIds },
    });
  };

  if (!canView) {
    return <AccessDenied pageTitle="Unassigned Assets" />;
  }

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title="Unassigned Assets"
          actions={
            <div className="flex items-center gap-3 flex-wrap">
              <HeaderActionButton
                variant="outline"
                onClick={fetchAssets}
                icon={
                  <RefreshCw
                    size={14}
                    className={loading ? "animate-spin" : ""}
                  />
                }
                label="Refresh"
              />

              {/* Assign Asset Button: Enabled only when checkboxes are selected */}
              {canAdd && (
                <button
                  type="button"
                  onClick={handleAssignAssetClick}
                  disabled={selectedAssetIds.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063b6f] transition cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                  Assign Asset {selectedAssetIds.length > 0 && `(${selectedAssetIds.length})`}
                </button>
              )}
            </div>
          }
        />

        <PageErrorAlert error={error} onRetry={fetchAssets} />

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-60">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search by ID, item name, or category..."
            />
          </div>

          <div className="w-52 shrink-0">
            <SearchableSelect
              name="categoryFilter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={categoryOptions}
              placeholder="All Categories"
            />
          </div>

          <div className="relative min-w-37.5 shrink-0">
            <Filter
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-full pl-9 pr-6 rounded-xl border border-[#C3C6D1] bg-white text-xs text-[#101828] font-medium focus:ring-2 focus:ring-[#084E92]/15 focus:border-[#084E92]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Statuses
                </SelectItem>
                <SelectItem value="IN USE" className="text-xs">
                  IN USE
                </SelectItem>
                <SelectItem value="AVAILABLE" className="text-xs">
                  AVAILABLE
                </SelectItem>
                <SelectItem value="MAINTENANCE" className="text-xs">
                  MAINTENANCE
                </SelectItem>
                <SelectItem value="SCRAP" className="text-xs">
                  SCRAP
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading unassigned assets…
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
                <CardTable className="w-full overflow-x-auto">
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
    </Container>
  );
};

export default UnassignedAssets;