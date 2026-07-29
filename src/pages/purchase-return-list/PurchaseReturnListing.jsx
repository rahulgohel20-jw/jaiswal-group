import { useState, useMemo } from "react";
import {
  FileText,
  ScanLine,
  Plus,
  Eye,
  SquarePen,
  Trash2,
  Search,
  SlidersHorizontal,
  FileSearch,
  ChevronUp,
  Printer,
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
import ScanPurchaseModel from "../../pages/stock-purchase/models/ScanAndPurchase.models";

// Replace with real data (e.g. from an API hook)
const INITIAL_PURCHASES = [];

const PAYMENT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Select Type" },
  { value: "supplier", label: "Supplier" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "sales_return", label: "Sales Return" },
];

const STATUS_STYLES = {
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  cancelled: "bg-red-50 text-red-600 ring-red-200",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ring-inset capitalize ${STATUS_STYLES[status]}`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        status === "completed"
          ? "bg-emerald-500"
          : status === "pending"
          ? "bg-amber-500"
          : "bg-red-500"
      }`}
    />
    {status}
  </span>
);

const selectCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 bg-white outline-none " +
  "focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 transition appearance-none cursor-pointer";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 bg-white outline-none " +
  "placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 transition";

const FilterLabel = ({ children, dot }) => (
  <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1.5">
    {children}
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
  </label>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-5">
      <FileSearch className="w-9 h-9 text-gray-300" strokeWidth={1.5} />
    </div>
    <p className="text-sm font-bold text-gray-700">No Purchase Found</p>
    <p className="text-xs text-gray-400 mt-1 text-center max-w-xs">
      Try adjusting your filters or search criteria to find what you're looking for.
    </p>
  </div>
);

const DEFAULT_FILTERS = {
  startDate: "",
  endDate: "",
  from: "all",
  invoiceNo: "",
  payment: "all",
  status: "all",
  type: "all",
};

const PurchaseReturnList = () => {
  const [purchases] = useState(INITIAL_PURCHASES);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [scanModalOpen, setScanModalOpen] = useState(false);

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const filteredPurchases = useMemo(
    () =>
      purchases.filter((p) => {
        const matchesInvoice =
          !filters.invoiceNo ||
          p.invoiceNo.toLowerCase().includes(filters.invoiceNo.toLowerCase());
        const matchesFrom = filters.from === "all" || p.from === filters.from;
        const matchesPayment = filters.payment === "all" || p.payment === filters.payment;
        const matchesStatus = filters.status === "all" || p.status === filters.status;
        const matchesType = filters.type === "all" || p.type === filters.type;
        const matchesStart = !filters.startDate || p.invoiceDate >= filters.startDate;
        const matchesEnd = !filters.endDate || p.invoiceDate <= filters.endDate;
        return (
          matchesInvoice &&
          matchesFrom &&
          matchesPayment &&
          matchesStatus &&
          matchesType &&
          matchesStart &&
          matchesEnd
        );
      }),
    [purchases, filters],
  );

  const columns = useMemo(
    () => [
      {
        id: "invoiceNo",
        accessorFn: (row) => row.invoiceNo,
        header: ({ column }) => <DataGridColumnHeader title="Invoice No." column={column} />,
        cell: ({ row }) => (
          <span className="font-semibold text-gray-800">{row.original.invoiceNo}</span>
        ),
      },
      {
        id: "supplier",
        accessorFn: (row) => row.supplier,
        header: ({ column }) => <DataGridColumnHeader title="Supplier" column={column} />,
        cell: ({ row }) => <span className="text-gray-600">{row.original.supplier}</span>,
      },
      {
        id: "invoiceDate",
        accessorFn: (row) => row.invoiceDate,
        header: ({ column }) => <DataGridColumnHeader title="Invoice Date" column={column} />,
        cell: ({ row }) => <span className="text-gray-600">{row.original.invoiceDate}</span>,
      },
      {
        id: "amount",
        accessorFn: (row) => row.amount,
        header: ({ column }) => <DataGridColumnHeader title="Amount" column={column} />,
        cell: ({ row }) => (
          <span className="text-gray-700 font-medium">
            Rs. {Number(row.original.amount).toFixed(2)}
          </span>
        ),
      },
      {
        id: "payment",
        accessorFn: (row) => row.payment,
        header: ({ column }) => <DataGridColumnHeader title="Payment" column={column} />,
        cell: ({ row }) => (
          <span className="text-gray-600 capitalize">{row.original.payment}</span>
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
              onClick={() => alert(`View ${row.original.invoiceNo}`)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer bg-white"
              title="View purchase"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => alert(`Edit ${row.original.invoiceNo}`)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition cursor-pointer bg-white"
              title="Edit purchase"
            >
              <SquarePen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => alert(`Delete ${row.original.invoiceNo}`)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition cursor-pointer bg-white"
              title="Delete purchase"
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
    data: filteredPurchases,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Container>
      <div className="p-4 md:p-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-gray-900 leading-none">Purchase Return List</h1>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => alert("Export purchases")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              <FileText className="w-4 h-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => setScanModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-sky-200 text-sm font-semibold text-sky-900 hover:bg-sky-50 transition cursor-pointer bg-white"
            >
              <ScanLine className="w-4 h-4" />
              Scan &amp; Purchase
            </button>
            <Link
              to="/purchase/add-purchase"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-800 text-white text-sm font-semibold border-0 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              Create New Purchase
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white shrink-0"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 mb-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <FilterLabel dot>Start Date</FilterLabel>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilter("startDate", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <FilterLabel>End Date</FilterLabel>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilter("endDate", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <FilterLabel>From</FilterLabel>
              <select
                value={filters.from}
                onChange={(e) => setFilter("from", e.target.value)}
                className={selectCls}
              >
                <option value="all">All</option>
                <option value="supplier">Supplier</option>
                <option value="purchase_order">Purchase Order</option>
              </select>
            </div>
            <div>
              <FilterLabel>Invoice No.</FilterLabel>
              <input
                value={filters.invoiceNo}
                onChange={(e) => setFilter("invoiceNo", e.target.value)}
                placeholder="Enter invoice number"
                className={inputCls}
              />
            </div>
          </div>

          {showMoreFilters && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <FilterLabel>Payment</FilterLabel>
                <select
                  value={filters.payment}
                  onChange={(e) => setFilter("payment", e.target.value)}
                  className={selectCls}
                >
                  {PAYMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FilterLabel>Status</FilterLabel>
                <select
                  value={filters.status}
                  onChange={(e) => setFilter("status", e.target.value)}
                  className={selectCls}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FilterLabel>Type</FilterLabel>
                <select
                  value={filters.type}
                  onChange={(e) => setFilter("type", e.target.value)}
                  className={selectCls}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowMoreFilters((v) => !v)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              {showMoreFilters ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Filters
                </>
              ) : (
                <>
                  <SlidersHorizontal className="w-4 h-4" />
                  More Filters
                </>
              )}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              Clear
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-sky-900 hover:bg-sky-800 text-white text-sm font-semibold border-0 cursor-pointer transition"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>

        {/* Table / Empty state */}
        {filteredPurchases.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <EmptyState />
          </div>
        ) : (
          <DataGrid table={table} recordCount={filteredPurchases.length}>
            <Card>
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

      {scanModalOpen && (
        <ScanPurchaseModel
          onClose={() => setScanModalOpen(false)}
          onAddPurchase={(purchase) => {
            setScanModalOpen(false);
          }}
        />
      )}
    </Container>
  );
};

export default PurchaseReturnList;