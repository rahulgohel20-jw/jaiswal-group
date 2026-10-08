import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Barcode,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
  ListFilter,
} from "lucide-react";
import {
  getCoreRowModel,
  useReactTable,
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
import { PageErrorAlert } from "@/components/common/PageErrorAlert";
import { SearchBar } from "@/components/common/SearchBar";
import SearchableSelect from "../../../utils/SearchableSelect";
import { useOrgScope } from "@/hooks/useOrgScope";
import { notify } from "@/utils/toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getAllSubOutletsByOrganization,
  getAllSubLocationsByOrganizationId,
  getAllRawMaterial,
  listBatchesForBarcode,
  generateBarcodeForBatch,
} from "../../../services/apiServices";
import { useExportReport } from "@/hooks/useExportReport";

const extractArray = (res) => {
  if (!res) return [];
  const raw = res?.data?.data ?? res?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const TruncatedCell = ({
  value,
  widthClass = "max-w-[160px]",
  className = "text-gray-700",
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value || "-"}
  </span>
);

/* -----------------------------------------------------------------------
 * Multi-Select Component for Raw Materials
 * -------------------------------------------------------------------- */
const RawMaterialMultiSelect = ({
  options = [],
  selected = [],
  onChange,
  disabled = false,
  hasError = false,
  loading = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) =>
      (o.nameEnglish ?? o.name ?? o.label ?? "").toLowerCase().includes(term)
    );
  }, [options, query]);

  const isSelected = (id) => selected.includes(Number(id));

  const toggleOption = (id) => {
    const numId = Number(id);
    if (isSelected(numId)) {
      onChange(selected.filter((s) => s !== numId));
    } else {
      onChange([...selected, numId]);
    }
  };

  const isAllSelected =
    options.length > 0 && selected.length === options.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map((o) => Number(o.id ?? o.value)));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={`min-h-10 w-full border rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-1.5 transition-all ${
            disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
              : "bg-white cursor-pointer hover:border-gray-400 focus-within:border-[#084E92] focus-within:ring-2 focus-within:ring-[#084E92]/15"
          } ${hasError ? "border-red-500! bg-red-50/20" : "border-[#C3C6D1]"}`}
        >
          {selected.length > 2 ? (
            <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2 py-0.5 rounded">
              {isAllSelected
                ? `All Materials (${options.length})`
                : `Selected Materials (${selected.length})`}
              {!disabled && (
                <X
                  size={12}
                  className="cursor-pointer hover:text-red-500 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                />
              )}
            </span>
          ) : (
            selected.map((selectedId) => {
              const matObj = options.find(
                (o) => Number(o.id ?? o.value) === Number(selectedId)
              );
              const matName =
                matObj?.nameEnglish ||
                matObj?.name ||
                matObj?.label ||
                `Material #${selectedId}`;

              return (
                <span
                  key={selectedId}
                  className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2 py-0.5 rounded"
                >
                  <span className="truncate max-w-28">{matName}</span>
                  {!disabled && (
                    <X
                      size={12}
                      className="cursor-pointer hover:text-red-500 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(selected.filter((s) => s !== selectedId));
                      }}
                    />
                  )}
                </span>
              );
            })
          )}

          <input
            type="text"
            value={query}
            disabled={disabled}
            placeholder={
              selected.length === 0
                ? loading
                  ? "Loading raw materials..."
                  : "Select Raw Materials *"
                : ""
            }
            onClick={(e) => {
              e.stopPropagation();
              if (!open) setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            className="flex-1 min-w-24 bg-transparent text-sm text-gray-800 outline-none border-none p-0.5 placeholder:text-gray-400 cursor-text"
          />

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {selected.length > 0 && !disabled && (
              <X
                size={14}
                className="text-gray-400 hover:text-red-500 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                  setQuery("");
                }}
              />
            )}
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-1 w-(--radix-popover-trigger-width) min-w-64 max-h-60 overflow-y-auto bg-white border border-[#C3C6D1] rounded-xl shadow-xl z-50 text-xs"
      >
        {filteredOptions.length === 0 ? (
          <p className="px-3 py-3 text-gray-400 text-center">
            No raw materials found.
          </p>
        ) : (
          <>
            {options.length > 0 && !query.trim() && (
              <label className="flex items-center gap-2 px-3 py-2 font-semibold text-[#00376C] hover:bg-blue-50/70 rounded cursor-pointer border-b border-gray-100 mb-1">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="accent-[#00376C] rounded"
                />
                All Materials ({options.length})
              </label>
            )}

            {filteredOptions.map((opt) => {
              const optId = Number(opt.id ?? opt.value);
              return (
                <label
                  key={optId}
                  className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-blue-50/70 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected(optId)}
                    onChange={() => toggleOption(optId)}
                    className="accent-[#00376C] rounded"
                  />
                  <span className="truncate">
                    {opt.nameEnglish || opt.name || opt.label}
                  </span>
                </label>
              );
            })}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

/* -----------------------------------------------------------------------
 * Main RawMaterialBarcode Screen
 * -------------------------------------------------------------------- */
const RawMaterialBarcode = () => {
  const { canView } = usePagePermissions("Raw Material Barcode");
  const { exporting, exportReport } = useExportReport();

  const {
    loading: orgScopeLoading,
    showUnitDropdown,
    effectiveOutletId,
    isOutletUser,
    units: scopeUnits,
    selfOrg,
  } = useOrgScope();

  // Filter States
  const [outletId, setOutletId] = useState("");
  const [subOutletId, setSubOutletId] = useState("");
  const [subLocationId, setSubLocationId] = useState("");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);

  // Option states
  const [subOutlets, setSubOutlets] = useState([]);
  const [subLocations, setSubLocations] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Table & Data States
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalRecords, setTotalRecords] = useState(0);

  // Outlet options formatted from useOrgScope
  const outletOptions = useMemo(() => {
    let list = Array.isArray(scopeUnits) ? scopeUnits : [];
    list = list.filter((u) => u?.id != null && String(u.id).toUpperCase() !== "ALL");

    if (list.length === 0 && selfOrg?.id) {
      list = [selfOrg];
    }

    return list.map((unit) => {
      const name =
        unit.companyNameEnglish ||
        unit.companyName ||
        unit.name ||
        `Outlet #${unit.id}`;
      const code = unit.companyCode || unit.code || "";
      return {
        value: String(unit.id),
        label: code ? `${name} (${code})` : name,
      };
    });
  }, [scopeUnits, selfOrg]);

  // Auto-select ONLY for strict outlet users; keep empty for company/admin/main users
  useEffect(() => {
    if (orgScopeLoading) return;

    if (isOutletUser && !showUnitDropdown && effectiveOutletId) {
      setOutletId(String(effectiveOutletId));
    } else {
      setOutletId("");
      setSubOutletId("");
      setSubLocationId("");
    }
  }, [orgScopeLoading, isOutletUser, showUnitDropdown, effectiveOutletId]);

  // Load Sub Outlets ONLY when outletId is selected
  useEffect(() => {
    if (!outletId || outletId === "0" || (showUnitDropdown && !outletId)) {
      setSubOutlets([]);
      setSubOutletId("");
      return;
    }

    let isMounted = true;
    const fetchSubOutlets = async () => {
      try {
        const res = await getAllSubOutletsByOrganization(outletId);
        if (!isMounted) return;
        setSubOutlets(extractArray(res));
      } catch (err) {
        console.error("Failed to load sub outlets:", err);
        if (isMounted) setSubOutlets([]);
      }
    };
    fetchSubOutlets();

    return () => {
      isMounted = false;
    };
  }, [outletId, showUnitDropdown]);

  // Load Sub Locations ONLY when outletId is selected
  useEffect(() => {
    if (!outletId || outletId === "0" || (showUnitDropdown && !outletId)) {
      setSubLocations([]);
      setSubLocationId("");
      return;
    }

    let isMounted = true;
    const fetchSubLocations = async () => {
      try {
        const res = await getAllSubLocationsByOrganizationId(outletId);
        if (!isMounted) return;

        let list = extractArray(res);
        if (subOutletId) {
          list = list.filter(
            (loc) =>
              String(loc.subOutletId || loc.subUnitId) === String(subOutletId)
          );
        }
        setSubLocations(list);
      } catch (err) {
        console.error("Failed to load sub locations:", err);
        if (isMounted) setSubLocations([]);
      }
    };
    fetchSubLocations();

    return () => {
      isMounted = false;
    };
  }, [outletId, subOutletId, showUnitDropdown]);

  // Load Raw Materials
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoadingMaterials(true);
        const res = await getAllRawMaterial();
        const list =
          res?.data?.data?.["Raw Material Details"] ||
          res?.data?.data ||
          extractArray(res);
        setRawMaterials(list);
      } catch (err) {
        console.error("Failed to load raw materials:", err);
      } finally {
        setLoadingMaterials(false);
      }
    };
    fetchMaterials();
  }, []);

  // Fetch Barcode Batches
  const fetchBatches = useCallback(
    async (pageIndex = pagination.pageIndex, pageSize = pagination.pageSize) => {
      if (!outletId) {
        notify.error("Please select a Unit first");
        return;
      }
      if (selectedMaterialIds.length === 0) {
        notify.error("Please select at least one Raw Material");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const payload = {
          batchCode: "",
          batchId: 0,
          batchNumber: "",
          itemIds: selectedMaterialIds,
          organizationId: Number(outletId) || 0,
          search: search.trim(),
          subLocationId: Number(subLocationId) || 0,
          subOutletId: Number(subOutletId) || 0,
        };

        const pageParams = {
          pageNumber: pageIndex,
          pageSize: pageSize,
        };

        const res = await listBatchesForBarcode(payload, pageParams);
        const data = res?.data?.data ?? [];
        setBatches(Array.isArray(data) ? data : []);
        setTotalRecords(res?.data?.totalElements ?? res?.data?.totalRecords ?? 0);
        setHasQueried(true);
      } catch (err) {
        console.error("Failed to load barcode batches:", err);
        setError("Failed to fetch stock batches for barcode generation.");
        setBatches([]);
        setTotalRecords(0);
      } finally {
        setLoading(false);
      }
    },
    [outletId, subOutletId, subLocationId, selectedMaterialIds, search, pagination.pageIndex, pagination.pageSize]
  );

  const handleListClick = () => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setRowSelection({});
    fetchBatches(0, pagination.pageSize);
  };

  const handlePaginationChange = (updater) => {
    setPagination((old) => {
      const next = typeof updater === "function" ? updater(old) : updater;
      if (hasQueried) {
        fetchBatches(next.pageIndex, next.pageSize);
      }
      return next;
    });
  };

  const handleOutletChange = (val) => {
    setOutletId(val);
    setSubOutletId("");
    setSubLocationId("");
    setBatches([]);
    setTotalRecords(0);
    setHasQueried(false);
    setRowSelection({});
  };

  const handleSubOutletChange = (val) => {
    setSubOutletId(val);
    setSubLocationId("");
    setBatches([]);
    setTotalRecords(0);
    setHasQueried(false);
    setRowSelection({});
  };

  const handleSubLocationChange = (val) => {
    setSubLocationId(val);
    setBatches([]);
    setTotalRecords(0);
    setHasQueried(false);
    setRowSelection({});
  };

  const handleRawMaterialChange = (ids) => {
    setSelectedMaterialIds(ids);
    setBatches([]);
    setTotalRecords(0);
    setHasQueried(false);
    setRowSelection({});
  };

  const selectedRowsList = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((idx) => batches[Number(idx)])
      .filter(Boolean);
  }, [rowSelection, batches]);

  // Execute Generate Barcode via useExportReport with the required payload shape
  const handleGenerateBarcode = async () => {
    if (selectedRowsList.length === 0) {
      notify.error("Please select at least one batch to generate barcodes");
      return;
    }

    const batchIds = selectedRowsList
      .map((row) => Number(row.batchId ?? row.id ?? row.stockBatchId))
      .filter(Boolean);

    const itemIds = Array.from(
      new Set(
        selectedRowsList
          .map((row) => Number(row.rawMaterialId ?? row.itemId ?? row.itemMasterId))
          .filter(Boolean)
      )
    );

    const payload = {
      batchIds: batchIds,
      copiesPerBatch: 1,
      itemIds: itemIds.length > 0 ? itemIds : selectedMaterialIds,
      organizationId: Number(outletId) || 0,
      printByQuantity: false,
      subLocationId: Number(subLocationId) || 0,
      subOutletId: Number(subOutletId) || 0,
    };

    await exportReport(payload, {
      apiCaller: generateBarcodeForBatch,
      fileName: `barcode_batch_${Date.now()}.pdf`,
      openInNewTab: true,
      errorMessage: "Failed to generate barcode.",
    });
  };

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center px-1">
            <input
              type="checkbox"
              checked={table.getIsAllPageRowsSelected()}
              ref={(el) => {
                if (el) el.indeterminate = table.getIsSomePageRowsSelected();
              }}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              className="accent-[#00376C] rounded cursor-pointer h-4 w-4"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center px-1">
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
              className="accent-[#00376C] rounded cursor-pointer h-4 w-4"
            />
          </div>
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: "rawMaterialName",
        accessorFn: (row) =>
          row.rawMaterialNameEnglish || row.rawMaterialName || row.itemName || "",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="RAW MATERIAL NAME"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={
              row.original.rawMaterialNameEnglish ||
              row.original.rawMaterialName ||
              row.original.itemName
            }
            widthClass="max-w-[180px]"
            className="font-semibold text-[#084E92] text-xs"
          />
        ),
        size: 150,
      },
      {
        id: "batchCode",
        accessorFn: (row) => row.batchCode || row.batchNumber || "",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="BATCH CODE / NO."
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
            {row.original.batchCode || row.original.batchNumber || "-"}
          </span>
        ),
        size: 180,
      },
      {
        id: "subOutletName",
        accessorFn: (row) => row.subOutletName || row.subUnitName || "",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="SUB UNIT"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.subOutletName || row.original.subUnitName}
            widthClass="max-w-[130px]"
            className="text-xs text-gray-700"
          />
        ),
        size: 130,
      },
      {
        id: "subLocationName",
        accessorFn: (row) => row.subLocationName || row.locationName || "",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="SUB LOCATION"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.subLocationName || row.original.locationName}
            widthClass="max-w-[130px]"
            className="text-xs text-gray-700"
          />
        ),
        size: 130,
      },
      {
        id: "quantity",
        accessorFn: (row) => row.remainingQuantity ?? row.availableQuantity ?? "",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="QTY"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-medium text-gray-800">
            {row.original.remainingQuantity ?? row.original.availableQuantity ?? "0"}
          </span>
        ),
        size: 80,
      },
      {
        id: "expiryDate",
        accessorFn: (row) => row.expiryDate || row.expDate || "",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="EXPIRY DATE"
            column={column}
            className="my-2 text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-gray-600 whitespace-nowrap">
            {row.original.expiryDate || row.original.expDate || "-"}
          </span>
        ),
        size: 100,
      },
    ],
    []
  );

  const table = useReactTable({
    data: batches,
    columns,
    state: {
      pagination,
      rowSelection,
    },
    enableRowSelection: true,
    manualPagination: true,
    pageCount: Math.ceil(totalRecords / pagination.pageSize),
    onRowSelectionChange: setRowSelection,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Raw Material Barcode" />;
  }

  const isListButtonDisabled = !outletId || selectedMaterialIds.length === 0 || loading;

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-4">
        {/* Page Header */}
        <PageHeader
          title="Raw Material Barcode"
          description="Filter stock batches and select items to generate and print barcodes."
          actions={
            <HeaderActionButton
              onClick={handleGenerateBarcode}
              disabled={selectedRowsList.length === 0 || exporting}
              icon={exporting ? Loader2 : Barcode}
              iconClassName={exporting ? "animate-spin" : ""}
              label={
                exporting
                  ? "Generating..."
                  : selectedRowsList.length > 0
                  ? `Generate Barcode (${selectedRowsList.length})`
                  : "Generate Barcode"
              }
              className="h-10 px-4 text-sm"
            />
          }
        />

        <PageErrorAlert error={error} onRetry={() => fetchBatches(pagination.pageIndex, pagination.pageSize)} />

        {/* First Row: 4 Cascading Searchable Fields + List Button */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* 1. Unit (Required) */}
            <div className="lg:col-span-3">
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Unit <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                name="outletId"
                value={outletId}
                disabled={!showUnitDropdown || orgScopeLoading}
                onChange={(e) => handleOutletChange(e.target.value)}
                options={outletOptions}
                placeholder="Select Unit *"
              />
            </div>

            {/* 2. Sub Unit */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Sub Unit
              </label>
              <SearchableSelect
                name="subOutletId"
                value={subOutletId}
                disabled={!outletId}
                onChange={(e) => handleSubOutletChange(e.target.value)}
                options={subOutlets.map((so) => ({
                  value: String(so.id),
                  label: so.subOutletName || so.name || `Sub Unit #${so.id}`,
                }))}
                placeholder="All Sub Units"
              />
            </div>

            {/* 3. Sub Location */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Sub Location
              </label>
              <SearchableSelect
                name="subLocationId"
                value={subLocationId}
                disabled={!outletId}
                onChange={(e) => handleSubLocationChange(e.target.value)}
                options={subLocations.map((sl) => ({
                  value: String(sl.id),
                  label: sl.locationName || sl.name || `Sub Location #${sl.id}`,
                }))}
                placeholder="All Sub Locations"
              />
            </div>

            {/* 4. Raw Material (Multi-select, Required) */}
            <div className="lg:col-span-4">
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Raw Material <span className="text-red-500">*</span>
              </label>
              <RawMaterialMultiSelect
                options={rawMaterials}
                selected={selectedMaterialIds}
                loading={loadingMaterials}
                hasError={Boolean(outletId && selectedMaterialIds.length === 0)}
                onChange={handleRawMaterialChange}
              />
            </div>

            {/* 5. List Button */}
            <div className="lg:col-span-1">
              <button
                type="button"
                onClick={handleListClick}
                disabled={isListButtonDisabled}
                className={`h-10 w-full inline-flex items-center justify-center gap-1.5 px-4 text-xs font-semibold rounded-xl transition cursor-pointer ${
                  isListButtonDisabled
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-[#084E92] text-white hover:bg-[#00376C] shadow-xs"
                }`}
                title={
                  !outletId
                    ? "Select a Unit"
                    : selectedMaterialIds.length === 0
                    ? "Select Raw Material"
                    : "Click to list stock batches"
                }
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ListFilter size={15} />
                )}
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Search */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-55">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search batches by batch code or number..."
            />
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={18} className="animate-spin text-[#084E92]" />
              Loading stock batches…
            </div>
          ) : !hasQueried ? (
            <div className="h-40 flex flex-col justify-center items-center p-4 text-center">
              <AlertCircle size={28} className="text-[#084E92] mb-2" />
              <h4 className="font-semibold text-sm text-[#00376C]">
                Ready to Fetch Batches
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mt-0.5">
                Select a Unit and Raw Material(s), then click the <strong>List</strong> button to load stock batches.
              </p>
            </div>
          ) : batches.length === 0 ? (
            <div className="h-40 flex flex-col justify-center items-center p-4 text-center">
              <h4 className="font-semibold text-sm text-[#00376C]">
                No batches found
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                No active stock batches matched your current filters.
              </p>
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={totalRecords}
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
    </Container>
  );
};

export default RawMaterialBarcode;