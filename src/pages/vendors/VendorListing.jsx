import { useState, useMemo } from "react";
import {
  Handshake,
  Eye,
  SquarePen,
  Plus,
  Trash2,
  Search,
  X,
  AlertTriangle,
  SlidersHorizontal,
  Download,
  CheckCircle2,
  Hourglass,
  TrendingUp,
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

const INITIAL_VENDORS = [
  {
    id: 1,
    name: "Aditya Jaiswal",
    code: "VND-2024-0042",
    createdOn: "12 Oct, 2023",
    email: "aditya.j@jaiswalgroup.com",
    company: "Jaiswal India Pvt Ltd",
    mobile: "+91 98250 12345",
    category: "management",
    kycStatus: "verified",
    kycView: 'View Details',
  },
  {
    id: 2,
    name: "Priya Sharma",
    code: "VND-2024-0089",
    createdOn: "05 Nov, 2023",
    email: "p.sharma@jaiswalgroup.com",
    company: "Jaiswal India Pvt Ltd",
    mobile: "+91 90040 55210",
    category: "finance",
    kycStatus: "pending",
    kycView: 'Review KYC',
  },
  {
    id: 3,
    name: "Rahul Varma",
    code: "VND-2024-0112",
    createdOn: "20 Dec, 2023",
    email: "rahul.v@jaiswalgroup.com",
    company: "Jaiswal India Pvt Ltd",
    mobile: "+91 99789 33421",
    category: "operations",
    kycStatus: "verified",
     kycView: 'Re-verify',
  },
  {
    id: 4,
    name: "Sneha Patel",
    code: "VND-2024-0155",
    createdOn: "09 Jan, 2024",
    email: "sneha.p@jaiswalgroup.com",
    company: "Jaiswal India Pvt Ltd",
    mobile: "+91 97250 87612",
    category: "logistics",
    kycStatus: "rejected",
    kycView: 'View Details',
  },
  {
    id: 5,
    name: "Vikram Mehta",
    code: "VND-2024-0201",
    createdOn: "15 Jan, 2024",
    email: "v.mehta@jaiswalgroup.com",
    company: "Jaiswal India Pvt Ltd",
    mobile: "+91 98980 44567",
    category: "it_support",
    kycStatus: "pending",
    kycView: 'Review KYC',
  },
];

const STATUS_STYLES = {
  verified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  rejected: "bg-red-50 text-red-600 ring-red-200",
};

const STATUS_LABELS = {
  verified: "Verified",
  pending: "Pending",
  rejected: "Rejected",
};

const CATEGORY_LABELS = {
  management: "Management",
  finance: "Finance",
  operations: "Operations",
  logistics: "Logistics",
  it_support: "IT Support",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        status === "verified"
          ? "bg-emerald-500"
          : status === "pending"
          ? "bg-amber-500"
          : "bg-red-500"
      }`}
    />
    {STATUS_LABELS[status]}
  </span>
);

const CategoryBadge = ({ category }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200">
    {CATEGORY_LABELS[category]}
  </span>
);

const DeleteConfirmModal = ({ vendor, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
      <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Delete vendor?</h2>
        <p className="text-sm text-gray-500 mt-1.5">
          This will permanently remove{" "}
          <span className="font-semibold text-gray-700">{vendor.name}</span> from your
          vendor list. This action cannot be undone.
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

const ViewVendorModal = ({ vendor, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">Vendor Details</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-6 py-5 space-y-4">
        {[
          ["Vendor Name", vendor.name],
          ["Vendor Code", vendor.code],
          ["Company", vendor.company],
          ["Category", CATEGORY_LABELS[vendor.category]],
          ["Email Address", vendor.email],
          ["Mobile Number", vendor.mobile],
          ["Created On", vendor.createdOn],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm gap-4">
            <span className="text-gray-400 shrink-0">{label}</span>
            <span className="font-semibold text-gray-800 text-right break-all">{value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">KYC Status</span>
          <StatusBadge status={vendor.kycStatus} />
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

// Truncates long text within a fixed-width box, revealing the full value on hover
const TruncatedCell = ({ value, widthClass = "max-w-[180px]", className = "text-gray-600" }) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, valueColor = "text-gray-900" }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3.5">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold leading-none mt-1 ${valueColor}`}>{value}</p>
    </div>
  </div>
);

const CATEGORY_OPTIONS = [
  { key: "all", label: "All categories" },
  { key: "management", label: "Management" },
  { key: "finance", label: "Finance" },
  { key: "operations", label: "Operations" },
  { key: "logistics", label: "Logistics" },
  { key: "it_support", label: "IT Support" },
];

const KYC_OPTIONS = [
  { key: "all", label: "All KYC statuses" },
  { key: "verified", label: "Verified" },
  { key: "pending", label: "Pending" },
  { key: "rejected", label: "Rejected" },
];

const VendorList = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [viewingVendor, setViewingVendor] = useState(null);
  const [deletingVendor, setDeletingVendor] = useState(null);

  const filteredVendors = useMemo(
    () =>
      vendors.filter((v) => {
        const matchesSearch =
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.code.toLowerCase().includes(search.toLowerCase()) ||
          v.email.toLowerCase().includes(search.toLowerCase()) ||
          v.company.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === "all" || v.category === categoryFilter;
        const matchesKyc = kycFilter === "all" || v.kycStatus === kycFilter;
        return matchesSearch && matchesCategory && matchesKyc;
      }),
    [vendors, search, categoryFilter, kycFilter],
  );
  
  const handleEdit = (vendor) => {
    navigate('/vendors/update-vendor', { state: { vendor } });
  };

  const handleDelete = (vendor) => setDeletingVendor(vendor);
  const confirmDelete = () => {
    setVendors((v) => v.filter((ven) => ven.id !== deletingVendor.id));
    setDeletingVendor(null);
  };

  const handleExport = (format) => {
    alert(`Exporting ${filteredVendors.length} vendor(s) as ${format.toUpperCase()}`);
  };

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: ({ column }) => <DataGridColumnHeader title="User Name" column={column} />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">
              {row.original.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div>
              <p className="font-semibold text-gray-800 leading-none">{row.original.name}</p>
              <p className="text-xs text-gray-400 mt-1">Created {row.original.createdOn}</p>
            </div>
          </div>
        ),
        size: 220,
      },
      {
        id: "code",
        accessorFn: (row) => row.code,
        header: ({ column }) => <DataGridColumnHeader title="User Code" column={column} />,
        cell: ({ row }) => <span className="text-gray-600 whitespace-nowrap">{row.original.code}</span>,
        size: 130,
      },
      {
        id: "email",
        accessorFn: (row) => row.email,
        header: ({ column }) => <DataGridColumnHeader title="Email Address" column={column} />,
        cell: ({ row }) => <TruncatedCell value={row.original.email} widthClass="max-w-[190px]" />,
        size: 210,
      },
      {
        id: "company",
        accessorFn: (row) => row.company,
        header: ({ column }) => <DataGridColumnHeader title="Company" column={column} />,
        cell: ({ row }) => <TruncatedCell value={row.original.company} widthClass="max-w-[170px]" />,
        size: 190,
      },
      {
        id: "category",
        accessorFn: (row) => row.category,
        header: ({ column }) => <DataGridColumnHeader title="Category" column={column} />,
        cell: ({ row }) => <CategoryBadge category={row.original.category} />,
        size: 130,
      },
      {
        id: "kycStatus",
        accessorFn: (row) => row.kycStatus,
        header: ({ column }) => <DataGridColumnHeader title="KYC Status" column={column} />,
        cell: ({ row }) => <StatusBadge status={row.original.kycStatus} />,
        size: 130,
      },
       {
                id: "kycView",
                accessorFn: (row) => row.kycView,
                header: ({ column }) => <DataGridColumnHeader title="Kyc View" column={column} />,
                cell: ({ row }) => <Link to="/vendor/kyc-information" className={`${row.original.kycView === "Re-verify" ? "text-[#BA1A1A]" : "text-[#084E92]"} font-bold`}>{row.original.kycView} </Link>,
                size: 150,
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
              onClick={() => setViewingVendor(row.original)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer bg-white"
              title="View vendor"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(row.original)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition cursor-pointer bg-white"
              title="Update vendor"
            >
              <SquarePen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition cursor-pointer bg-white"
              title="Delete vendor"
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
    data: filteredVendors,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
  });

  return (
    <Container>
      <div>
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-none">
                Vendor Management List
              </h1>
              <p className="text-md text-gray-400 mt-2.5">
                View and manage all registered enterprise vendors across the Jaiswal Group <br />
                ecosystem.
              </p>
            </div>
          </div>
          <Link
            to="/vendors/add-vendor"
            className="flex items-center bg-[#084E92] gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold border-0 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            Add New Vendor
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Handshake}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            label="Total Vendors"
            value={vendors.length}
          />
          <StatCard
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-500"
            label="Active Vendors"
            value={vendors.filter((v) => v.kycStatus === "verified").length}
            valueColor="text-emerald-600"
          />
          <StatCard
            icon={Hourglass}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            label="Pending KYC"
            value={vendors.filter((v) => v.kycStatus === "pending").length}
            valueColor="text-amber-600"
          />
          <StatCard
            icon={TrendingUp}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            label="Onboarding This Month"
            value="+24"
            valueColor="text-blue-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-6 mb-6 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </span>

          <div>
            <p className="text-[11px] text-gray-400 mb-1">Category</p>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-600 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 transition appearance-none cursor-pointer"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-[11px] text-gray-400 mb-1">KYC Status</p>
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-600 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 transition appearance-none cursor-pointer"
            >
              {KYC_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all");
                setKycFilter("all");
                setSearch("");
              }}
              className="text-sm font-semibold text-sky-700 hover:text-sky-900 transition cursor-pointer bg-white border-0"
            >
              Clear All
            </button>
          </div>
        </div>

        <DataGrid table={table} recordCount={filteredVendors.length}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-t-2xl border border-b-0 border-gray-100 gap-4 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by vendor name, code, email..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-100 focus:border-emerald-300 w-72 transition placeholder-gray-400"
              />
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

      {viewingVendor && (
        <ViewVendorModal vendor={viewingVendor} onClose={() => setViewingVendor(null)} />
      )}

      {deletingVendor && (
        <DeleteConfirmModal
          vendor={deletingVendor}
          onCancel={() => setDeletingVendor(null)}
          onConfirm={confirmDelete}
        />
      )}
    </Container>
  );
};

export default VendorList;