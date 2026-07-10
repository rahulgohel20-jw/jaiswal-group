import { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Eye,
  SquarePen,
  Trash2,
  Search,
  X,
  AlertTriangle,
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
import { Link } from "react-router";

const INITIAL_COMPANIES = [
  {
    id: 1,
    name: "Shubh Enterprises",
    code: "CMP-1001",
    location: "Ahmedabad",
    mobile: "+91 98250 12345",
    gstNumber: "24AAACS1234F1Z5",
    status: "active",
  },
  {
    id: 2,
    name: "Nexora Traders",
    code: "CMP-1002",
    location: "Mumbai",
    mobile: "+91 90040 55210",
    gstNumber: "27AAECN5678G1Z2",
    status: "pending",
  },
  {
    id: 3,
    name: "Vertex Fabrics Pvt Ltd",
    code: "CMP-1003",
    location: "Surat",
    mobile: "+91 99789 33421",
    gstNumber: "24AABCV9081H1Z9",
    status: "onboarding",
  },
  {
    id: 4,
    name: "Kiran Distributors",
    code: "CMP-1004",
    location: "Rajkot",
    mobile: "+91 97250 87612",
    gstNumber: null,
    status: "inactive",
  },
  {
    id: 5,
    name: "Prithvi Foods",
    code: "CMP-1005",
    location: "Vadodara",
    mobile: "+91 98980 44567",
    gstNumber: "24AAGCP3456K1Z7",
    status: "active",
  },
];

const STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  onboarding: "bg-blue-50 text-blue-700 ring-blue-200",
  inactive: "bg-gray-100 text-gray-500 ring-gray-200",
};

const STATUS_LABELS = {
  active: "Active",
  pending: "Pending",
  onboarding: "Onboarding",
  inactive: "Inactive",
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
          : status === "onboarding"
          ? "bg-blue-500"
          : "bg-gray-400"
      }`}
    />
    {STATUS_LABELS[status]}
  </span>
);

const DeleteConfirmModal = ({ company, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
      <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Delete company?</h2>
        <p className="text-sm text-gray-500 mt-1.5">
          This will permanently remove{" "}
          <span className="font-semibold text-gray-700">{company.name}</span> from your
          company list. This action cannot be undone.
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

const ViewCompanyModal = ({ company, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">Company Details</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-6 py-5 space-y-4">
        {[
          ["Company Name", company.name],
          ["Company Code", company.code],
          ["Location", company.location],
          ["Mobile Number", company.mobile],
          ["GST Number", company.gstNumber || "—"],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-gray-400">{label}</span>
            <span className="font-semibold text-gray-800">{value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Status</span>
          <StatusBadge status={company.status} />
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

const CompanyRegistration = () => {
  const [companies, setCompanies] = useState(INITIAL_COMPANIES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [viewingCompany, setViewingCompany] = useState(null);
  const [deletingCompany, setDeletingCompany] = useState(null);

  const filteredCompanies = useMemo(
    () =>
      companies.filter((c) => {
        const matchesSearch =
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.location.toLowerCase().includes(search.toLowerCase()) ||
          c.mobile.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || c.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [companies, search, statusFilter],
  );

  const handleDelete = (company) => setDeletingCompany(company);
  const confirmDelete = () => {
    setCompanies((c) => c.filter((co) => co.id !== deletingCompany.id));
    setDeletingCompany(null);
  };

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: ({ column }) => <DataGridColumnHeader title="Company Name" column={column} />,
        cell: ({ row }) => (
          <span className="font-semibold text-gray-800">{row.original.name}</span>
        ),
      },
      {
        id: "code",
        accessorFn: (row) => row.code,
        header: ({ column }) => <DataGridColumnHeader title="Company Code" column={column} />,
        cell: ({ row }) => <span className="text-gray-600">{row.original.code}</span>,
      },
      {
        id: "location",
        accessorFn: (row) => row.location,
        header: ({ column }) => <DataGridColumnHeader title="Location" column={column} />,
        cell: ({ row }) => <span className="text-gray-600">{row.original.location}</span>,
      },
      {
        id: "mobile",
        accessorFn: (row) => row.mobile,
        header: ({ column }) => <DataGridColumnHeader title="Mobile Number" column={column} />,
        cell: ({ row }) => <span className="text-gray-600">{row.original.mobile}</span>,
      },
      {
        id: "gstNumber",
        accessorFn: (row) => row.gstNumber,
        header: ({ column }) => <DataGridColumnHeader title="GST Number" column={column} />,
        cell: ({ row }) =>
          row.original.gstNumber ? (
            <span className="text-gray-700">{row.original.gstNumber}</span>
          ) : (
            <span className="text-gray-300">—</span>
          ),
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => (
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Actions
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewingCompany(row.original)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer bg-white"
              title="View company"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => alert(`Update ${row.original.name}`)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition cursor-pointer bg-white"
              title="Update company"
            >
              <SquarePen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition cursor-pointer bg-white"
              title="Delete company"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredCompanies,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const STATUS_TABS = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "pending", label: "Pending" },
    { key: "onboarding", label: "Onboarding" },
    { key: "inactive", label: "Inactive" },
  ];

  return (
    <Container>
      <div>
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">
                Registered Companies
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Manage and monitor all corporate entities registered within the Jaiswal Group ecosystem through our
                centralized administration panel.
              </p>
            </div>
          </div>
          <Link
            to="/companies/registration"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-900 text-white text-sm font-semibold border-0 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            Add new company
          </Link>
        </div>

        <DataGrid table={table} recordCount={filteredCompanies.length}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-t-2xl border border-b-0 border-gray-100 gap-4 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-100 focus:border-emerald-300 w-56 transition placeholder-gray-400"
              />
            </div>

            {/* Status filter tabs */}
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl p-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border-0 ${
                    statusFilter === tab.key
                      ? "bg-white text-gray-800 shadow-sm"
                      : "bg-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
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

      {viewingCompany && (
        <ViewCompanyModal company={viewingCompany} onClose={() => setViewingCompany(null)} />
      )}

      {deletingCompany && (
        <DeleteConfirmModal
          company={deletingCompany}
          onCancel={() => setDeletingCompany(null)}
          onConfirm={confirmDelete}
        />
      )}
    </Container>
  );
};

export default CompanyRegistration;