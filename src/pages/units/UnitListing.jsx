import { useState, useMemo, useRef, useEffect } from "react";
import {
  Store,
  Eye,
  SquarePen,
  Plus,
  Trash2,
  Search,
  X,
  AlertTriangle,
  SlidersHorizontal,
  Download,
  ChevronDown,
  Check,
  FileSpreadsheet,
  FileText,
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

const INITIAL_UnitS = [
  {
    id: 1,
    name: "Shubh Central Kitchen",
    code: "OUT-2001",
    serviceType: "restaurant",
    location: "Ahmedabad",
    email: "central.abad@shubh.com",
    mobile: "+91 98250 12345",
    status: "active",
  },
  {
    id: 2,
    name: "Nexora Express Counter",
    code: "OUT-2002",
    serviceType: "Unit",
    location: "Mumbai",
    email: "express.mum@nexora.com",
    mobile: "+91 90040 55210",
    status: "pending",
  },
  {
    id: 3,
    name: "Vertex Fine Dine",
    code: "OUT-2003",
    serviceType: "restaurant",
    location: "Surat",
    email: "finedine.surat@vertex.com",
    mobile: "+91 99789 33421",
    status: "maintenance",
  },
  {
    id: 4,
    name: "Kiran Retail Point",
    code: "OUT-2004",
    serviceType: "Unit",
    location: "Rajkot",
    email: "retail.rajkot@kiran.com",
    mobile: "+91 97250 87612",
    status: "active",
  },
  {
    id: 5,
    name: "Prithvi Food Court",
    code: "OUT-2005",
    serviceType: "restaurant",
    location: "Vadodara",
    email: "foodcourt.vad@prithvi.com",
    mobile: "+91 98980 44567",
    status: "active",
  },
  {
    id: 6,
    name: "Shubh Drive-Thru",
    code: "OUT-2006",
    serviceType: "Unit",
    location: "Gandhinagar",
    email: "drivethru.gnr@shubh.com",
    mobile: "+91 98250 67890",
    status: "pending",
  },
  {
    id: 7,
    name: "Nexora Rooftop Grill",
    code: "OUT-2007",
    serviceType: "restaurant",
    location: "Mumbai",
    email: "rooftop.mum@nexora.com",
    mobile: "+91 90040 11223",
    status: "maintenance",
  },
];

const STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  maintenance: "bg-orange-50 text-orange-700 ring-orange-200",
};

const STATUS_LABELS = {
  active: "Active",
  pending: "Pending",
  maintenance: "Maintenance",
};

const SERVICE_TYPE_LABELS = {
  restaurant: "Restaurant",
  Unit: "Unit",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        status === "active"
          ? "bg-emerald-500"
          : status === "pending"
          ? "bg-amber-500"
          : "bg-orange-500"
      }`}
    />
    {STATUS_LABELS[status]}
  </span>
);

const ServiceTypeBadge = ({ type }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200">
    {SERVICE_TYPE_LABELS[type]}
  </span>
);

const DeleteConfirmModal = ({ Unit, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
      <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Delete Unit?</h2>
        <p className="text-sm text-gray-500 mt-1.5">
          This will permanently remove{" "}
          <span className="font-semibold text-gray-700">{Unit.name}</span> from your
          Unit list. This action cannot be undone.
        </p>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-5 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold border-0 cursor-pointer transition"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

const ViewUnitModal = ({ Unit, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">Unit Details</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-6 py-5 space-y-4">
        {[
          ["Unit Name", Unit.name],
          ["Unit Code", Unit.code],
          ["Service Type", SERVICE_TYPE_LABELS[Unit.serviceType]],
          ["Location", Unit.location],
          ["Contact Email", Unit.email],
          ["Mobile Number", Unit.mobile],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm gap-4">
            <span className="text-gray-400 shrink-0">{label}</span>
            <span className="font-semibold text-gray-800 text-right break-all">{value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Status</span>
          <StatusBadge status={Unit.status} />
        </div>
      </div>
      <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

// Generic dropdown used for the filters and export menus
const Dropdown = ({ label, icon: Icon, children, widthClass = "w-48" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 transition cursor-pointer"
      >
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={`absolute right-0 mt-2 ${widthClass} bg-white rounded-xl border border-gray-100 shadow-lg z-20 py-1.5 overflow-hidden`}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
};

const DropdownItem = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer border-0 bg-transparent text-left"
  >
    <span className={active ? "font-semibold text-gray-900" : ""}>{label}</span>
    {active && <Check className="w-3.5 h-3.5 text-blue-600" />}
  </button>
);

// Truncates long text within a fixed-width box, revealing the full value on hover
const TruncatedCell = ({ value, widthClass = "max-w-[180px]", className = "text-gray-600" }) => (
  <span
    title={value}
    className={`block truncate ${widthClass} ${className}`}
  >
    {value}
  </span>
);

const UnitListing = () => {
  const navigate = useNavigate();
  const [Units, setUnits] = useState(INITIAL_UnitS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [viewingUnit, setViewingUnit] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(null);

  const filteredUnits = useMemo(
    () =>
      Units.filter((o) => {
        const matchesSearch =
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          o.code.toLowerCase().includes(search.toLowerCase()) ||
          o.location.toLowerCase().includes(search.toLowerCase()) ||
          o.email.toLowerCase().includes(search.toLowerCase()) ||
          o.mobile.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || o.status === statusFilter;
        const matchesType = typeFilter === "all" || o.serviceType === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
      }),
    [Units, search, statusFilter, typeFilter],
  );

  // Sends the user to the same form used for creating a Unit, but with the
  // row's data attached via router state — the form flips into edit mode
  // (title, copy, and the Save button all switch to "Update") whenever
  // state.unit is present.
  const handleEdit = (Unit) => {
    navigate('/units/update-unit', { state: { unit: Unit } });
  };

  const handleDelete = (Unit) => setDeletingUnit(Unit);
  const confirmDelete = () => {
    setUnits((o) => o.filter((out) => out.id !== deletingUnit.id));
    setDeletingUnit(null);
  };

  const handleExport = (format) => {
    alert(`Exporting ${filteredUnits.length} Unit(s) as ${format.toUpperCase()}`);
  };

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: ({ column }) => <DataGridColumnHeader title="Unit Name" column={column} />,
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.name}
            widthClass="max-w-[160px]"
            className="font-semibold text-gray-800"
          />
        ),
        size: 180,
      },
      {
        id: "code",
        accessorFn: (row) => row.code,
        header: ({ column }) => <DataGridColumnHeader title="Unit Code" column={column} />,
        cell: ({ row }) => <span className="text-gray-600 whitespace-nowrap">{row.original.code}</span>,
        size: 120,
      },
      {
        id: "serviceType",
        accessorFn: (row) => row.serviceType,
        header: ({ column }) => <DataGridColumnHeader title="Service Type" column={column} />,
        cell: ({ row }) => <ServiceTypeBadge type={row.original.serviceType} />,
        size: 130,
      },
      {
        id: "location",
        accessorFn: (row) => row.location,
        header: ({ column }) => <DataGridColumnHeader title="Location" column={column} />,
        cell: ({ row }) => (
          <TruncatedCell value={row.original.location} widthClass="max-w-[120px]" />
        ),
        size: 130,
      },
      {
        id: "email",
        accessorFn: (row) => row.email,
        header: ({ column }) => <DataGridColumnHeader title="Contact Email" column={column} />,
        cell: ({ row }) => (
          <TruncatedCell value={row.original.email} widthClass="max-w-[190px]" />
        ),
        size: 210,
      },
      {
        id: "mobile",
        accessorFn: (row) => row.mobile,
        header: ({ column }) => <DataGridColumnHeader title="Mobile Number" column={column} />,
        cell: ({ row }) => (
          <span className="text-gray-600 whitespace-nowrap">{row.original.mobile}</span>
        ),
        size: 160,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        size: 130,
      },
      {
        id: "actions",
        header: () => (
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Actions
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setViewingUnit(row.original)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer bg-white"
              title="View Unit"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(row.original)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition cursor-pointer bg-white"
              title="Update Unit"
            >
              <SquarePen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition cursor-pointer bg-white"
              title="Delete Unit"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
        enableSorting: false,
        size: 130,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredUnits,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
  });

  const STATUS_OPTIONS = [
    { key: "all", label: "All statuses" },
    { key: "active", label: "Active" },
    { key: "pending", label: "Pending" },
    { key: "maintenance", label: "Maintenance" },
  ];

  const TYPE_OPTIONS = [
    { key: "all", label: "All Units & restaurants" },
    { key: "Unit", label: "Units" },
    { key: "restaurant", label: "Restaurants" },
  ];

  return (
    <Container>
      <div>
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-none">
                Registered Units
              </h1>
              <p className="text-md text-gray-400 mt-2.5">
                Manage and monitor all Units and restaurants registered within the Jaiswal Group ecosystem through our <br />
                centralized administration panel.
              </p>
            </div>
          </div>
          <Link
            to="/units/add-unit"
            className="flex items-center bg-[#084E92] gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold border-0 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            Add New Unit
          </Link>
        </div>

        <DataGrid table={table} recordCount={filteredUnits.length}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-t-2xl border border-b-0 border-gray-100 gap-4 flex-wrap">
            {/* Search - left side */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Unit name or code..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-100 focus:border-emerald-300 w-64 transition placeholder-gray-400"
              />
            </div>

            {/* Filters + Export - right side */}
            <div className="flex items-center gap-2.5">
              <Dropdown label="Status" icon={SlidersHorizontal}>
                {(close) => (
                  <>
                    {STATUS_OPTIONS.map((opt) => (
                      <DropdownItem
                        key={opt.key}
                        label={opt.label}
                        active={statusFilter === opt.key}
                        onClick={() => {
                          setStatusFilter(opt.key);
                          close();
                        }}
                      />
                    ))}
                  </>
                )}
              </Dropdown>

              <Dropdown label="Type" icon={SlidersHorizontal} widthClass="w-56">
                {(close) => (
                  <>
                    {TYPE_OPTIONS.map((opt) => (
                      <DropdownItem
                        key={opt.key}
                        label={opt.label}
                        active={typeFilter === opt.key}
                        onClick={() => {
                          setTypeFilter(opt.key);
                          close();
                        }}
                      />
                    ))}
                  </>
                )}
              </Dropdown>

              <Dropdown label="Export" icon={Download} widthClass="w-44">
                {(close) => (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        handleExport("csv");
                        close();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer border-0 bg-transparent text-left"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                      Export as CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExport("pdf");
                        close();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer border-0 bg-transparent text-left"
                    >
                      <FileText className="w-4 h-4 text-gray-400" />
                      Export as PDF
                    </button>
                  </>
                )}
              </Dropdown>
            </div>
          </div>

          {/* Table Card */}
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
      </div>

      {viewingUnit && (
        <ViewUnitModal Unit={viewingUnit} onClose={() => setViewingUnit(null)} />
      )}

      {deletingUnit && (
        <DeleteConfirmModal
          Unit={deletingUnit}
          onCancel={() => setDeletingUnit(null)}
          onConfirm={confirmDelete}
        />
      )}
    </Container>
  );
};

export default UnitListing;