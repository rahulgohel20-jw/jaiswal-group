import { useState, useMemo, Fragment } from "react";
import {
  ArrowLeft,
  Plus,
  SquarePen,
  Store,
  X,
  Check,
  Info,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
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
import { Container } from '@/components/common/container';


const INITIAL_BRANCHES = [
  {
    id: 1,
    name: "ahd",
    gstNumber: null,
    city: "Ahmedabad",
    zipCode: "380009",
    address: "shubh house nr c g road",
    hasGst: false,
    plan: "Yearly Plan",
    planExpiry: "21 February 2026",
    daysLeft: 0,
  },
];

const CITY_OPTIONS = [
  "Ahmedabad",
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Kolkata",
  "Surat",
  "Jaipur",
];

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const PricingModal = ({ onClose, onPay }) => {
  const [plan, setPlan] = useState("yearly");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-base font-bold text-gray-900">Choose your plan</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer bg-white border-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 flex gap-6">
          <div className="flex-1">
            <span className="inline-block border border-emerald-600 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-md mb-4">
              Unlock Tasks Premium
            </span>
            <p className="text-sm font-bold text-gray-900 mb-4 leading-snug">
              Systemise Project Management.<br />Simplify Success.
            </p>
            <ul className="space-y-2.5">
              {[
                "Centralized admin controls for teams across locations",
                "Manage cross-functional projects and track progress easily",
                "Ensure tasks are completed at the right place with location-based tracking",
                "Reward teams with point-based performance scoring",
              ].map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>

          <div className="w-52 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setPlan("yearly")}
              className={`relative w-full text-left border-2 rounded-xl px-4 py-3 transition cursor-pointer bg-white ${
                plan === "yearly" ? "border-primary" : "border-gray-200"
              }`}
            >
              {plan === "yearly" && (
                <span className="absolute text-xs -bottom-2.5 left-3 bg-primary text-white  font-bold px-2 py-0.5 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    plan === "yearly" ? "border-primary" : "border-gray-300"
                  }`}
                >
                  {plan === "yearly" && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-800">Yearly</span>
                <span className="ml-auto text-[11px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                  Save 15%
                </span>
              </div>
              <p className="text-xs text-gray-400 line-through pl-6">₹ 5,882</p>
              <p className="text-base font-bold text-gray-900 pl-6">
                ₹ 5,000 <span className="text-xs font-normal text-gray-400">+ GST</span>
              </p>
            </button>

            {/* Monthly */}
            <button
              type="button"
              onClick={() => setPlan("monthly")}
              className={`w-full text-left border-2 rounded-xl px-4 py-3 transition cursor-pointer bg-white ${
                plan === "monthly" ? "border-primary" : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    plan === "monthly" ? "border-primary" : "border-gray-300"
                  }`}
                >
                  {plan === "monthly" && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-800">Monthly</span>
              </div>
              <p className="text-base font-bold text-gray-900 pl-6">
                ₹ 550 <span className="text-xs font-normal text-gray-400">+ GST</span>
              </p>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => onPay(plan)}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold border-0 cursor-pointer transition"
          >
            Pay now
          </button>
        </div>
      </div>
    </div>
  );
};

const AddBranchForm = ({ onBack, onSave }) => {
  const [form, setForm] = useState({
    name: "",
    city: "",
    zipCode: "",
    address: "",
    hasGst: false,
    gstNumber: "",
  });
  const [showPricing, setShowPricing] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handlePayToAdd = () => setShowPricing(true);

  const handlePay = (plan) => {
    setShowPricing(false);
    onSave({ ...form, plan });
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition border-0 bg-transparent cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-bold text-gray-800">Add Branch</h2>
        </div>

        {/* Form */}
        <div className="px-6 py-6 space-y-5">
          {/* Branch Name */}
          <div>
            <Label required>Branch Name</Label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Enter Branch Name"
              className={inputCls}
            />
          </div>

          {/* City + Zip */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>City</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCityOpen((o) => !o)}
                  className={`${inputCls} flex items-center justify-between cursor-pointer`}
                >
                  <span className={form.city ? "text-gray-800" : "text-gray-400"}>
                    {form.city || "Type to search city..."}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                {cityOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {CITY_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { set("city", c); setCityOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition border-0 bg-transparent cursor-pointer"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label required>Zip Code</Label>
              <input
                value={form.zipCode}
                onChange={(e) => set("zipCode", e.target.value)}
                placeholder="Add Zip Code (6 digits)"
                maxLength={6}
                className={inputCls}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label required>Address</Label>
            <textarea
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Add Address"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* GST */}
          <div>
            <Label required>Do you have GST number?</Label>
            <div className="flex items-center gap-6">
              {[
                { val: true, label: "Yes" },
                { val: false, label: "No" },
              ].map(({ val, label }) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <div
                    onClick={() => set("hasGst", val)}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                      form.hasGst === val ? "border-primary" : "border-gray-300"
                    }`}
                  >
                    {form.hasGst === val && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  {label}
                </label>
              ))}
            </div>
            {form.hasGst && (
              <input
                value={form.gstNumber}
                onChange={(e) => set("gstNumber", e.target.value)}
                placeholder="Enter GST Number"
                className={`${inputCls} mt-3`}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePayToAdd}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold border-0 cursor-pointer transition"
          >
            Pay to add branch
          </button>
        </div>
      </div>

      {showPricing && (
        <PricingModal onClose={() => setShowPricing(false)} onPay={handlePay} />
      )}
    </>
  );
};

const ManageBranchForm = ({ branch, onBack, onUpdate }) => {
  const [form, setForm] = useState({
    city: branch.city,
    zipCode: branch.zipCode,
    address: branch.address,
    hasGst: branch.hasGst,
    gstNumber: branch.gstNumber || "",
  });
  const [cityOpen, setCityOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleUpdate = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    onUpdate({ ...branch, ...form });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition border-0 bg-transparent cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-bold text-gray-800">Manage Branch</h2>
      </div>

      {/* Form */}
      <div className="px-6 py-6 space-y-5">
        {/* Branch name (disabled) */}
        <input
          value={branch.name}
          disabled
          className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
        />

        {/* City + Zip */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>City</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCityOpen((o) => !o)}
                className={`${inputCls} flex items-center justify-between cursor-pointer`}
              >
                <span className="text-gray-800">{form.city}</span>
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
              {cityOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {CITY_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { set("city", c); setCityOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition border-0 bg-transparent cursor-pointer"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <Label required>Zip Code</Label>
            <input
              value={form.zipCode}
              onChange={(e) => set("zipCode", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <Label required>Address</Label>
          <textarea
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* GST */}
        <div>
          <Label required>Do you have GST number?</Label>
          <div className="flex items-center gap-6">
            {[
              { val: true, label: "Yes" },
              { val: false, label: "No" },
            ].map(({ val, label }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <div
                  onClick={() => set("hasGst", val)}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                    form.hasGst === val ? "border-primary" : "border-gray-300"
                  }`}
                >
                  {form.hasGst === val && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                {label}
              </label>
            ))}
          </div>
          {form.hasGst && (
            <input
              value={form.gstNumber}
              onChange={(e) => set("gstNumber", e.target.value)}
              placeholder="Enter GST Number"
              className={`${inputCls} mt-3`}
            />
          )}
        </div>

        {/* Plan Details */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Plan Details</p>
          <div className="border border-gray-200 rounded-xl px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-gray-800">{branch.plan}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Expires on {branch.planExpiry}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                  {branch.daysLeft} Days left
                </span>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold border-0 cursor-pointer transition whitespace-nowrap"
                >
                  Upgrade to Premium
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-600 transition cursor-pointer bg-white whitespace-nowrap"
                >
                  <Info className="w-3.5 h-3.5" />
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold border-0 cursor-pointer transition disabled:opacity-60 flex items-center gap-2"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Updating...
            </>
          ) : (
            "Update branch"
          )}
        </button>
      </div>
    </div>
  );
};

const BranchList = ({ branches, onAdd, onEdit }) => {
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const filteredBranches = useMemo(
    () =>
      branches.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          (b.city || "").toLowerCase().includes(search.toLowerCase()) ||
          (b.address || "").toLowerCase().includes(search.toLowerCase()),
      ),
    [branches, search],
  );

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Branch Name" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-gray-800">{row.original.name}</span>
        ),
      },
      {
        id: "gstNumber",
        accessorFn: (row) => row.gstNumber,
        header: ({ column }) => (
          <DataGridColumnHeader title="GST Number" column={column} />
        ),
        cell: ({ row }) =>
          row.original.gstNumber ? (
            <span className="text-gray-700">{row.original.gstNumber}</span>
          ) : (
            <span className="text-gray-300">—</span>
          ),
      },
      {
        id: "city",
        accessorFn: (row) => row.city,
        header: ({ column }) => (
          <DataGridColumnHeader title="City" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-gray-600">{row.original.city}</span>
        ),
      },
      {
        id: "address",
        accessorFn: (row) => row.address,
        header: ({ column }) => (
          <DataGridColumnHeader title="Address" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-gray-600 max-w-xs truncate block">
            {row.original.address}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</span>,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onEdit(row.original)}
            className="w-8 h-8 rounded-lg  border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-blue-500 hover:bg-emerald-50 transition cursor-pointer bg-white"
            title="Edit branch"
          >
            <SquarePen className="w-4 h-4 text-blue-700"  />
          </button>
        ),
        enableSorting: false,
      },
    ],
    [onEdit],
  );

  const table = useReactTable({
    data: filteredBranches,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <DataGrid table={table} recordCount={filteredBranches.length}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white rounded-t-2xl border border-b-0 border-gray-100">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branches..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50 outline-none focus:ring-1 focus:ring-emerald-100 focus:border-emerald-300 w-56 transition placeholder-gray-400"
          />
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-700 transition cursor-pointer bg-white"
        >
          <Plus className="w-4 h-4" />
          Add new branch
        </button>
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
  );
};

const ManageOutlet = ({ onBack }) => {
  const [view, setView] = useState("list"); // 'list' | 'add' | 'edit'
  const [branches, setBranches] = useState(INITIAL_BRANCHES);
  const [editingBranch, setEditingBranch] = useState(null);

  const handleAdd = (formData) => {
    const newBranch = {
      id: Date.now(),
      name: formData.name,
      gstNumber: formData.hasGst ? formData.gstNumber : null,
      city: formData.city,
      zipCode: formData.zipCode,
      address: formData.address,
      hasGst: formData.hasGst,
      plan: formData.plan === "yearly" ? "Yearly Plan" : "Monthly Plan",
      planExpiry: "21 February 2027",
      daysLeft: 365,
    };
    setBranches((b) => [...b, newBranch]);
    setView("list");
  };

  const handleUpdate = (updated) => {
    setBranches((b) => b.map((br) => (br.id === updated.id ? updated : br)));
    setView("list");
    setEditingBranch(null);
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setView("edit");
  };

  return (
    <Fragment>
        <Container>

    <div className="">
      {/* Page back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-blue-600 transition mb-5 border-0 bg-transparent cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
          <Store className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-none">Manage Outlet</h1>
          <p className="text-xs text-gray-400 mt-0.5">Configure your branch locations</p>
        </div>
      </div>

      {/* Views */}
      {view === "list" && (
        <BranchList
          branches={branches}
          onAdd={() => setView("add")}
          onEdit={handleEdit}
        />
      )}

      {view === "add" && (
        <AddBranchForm onBack={() => setView("list")} onSave={handleAdd} />
      )}

      {view === "edit" && editingBranch && (
        <ManageBranchForm
          branch={editingBranch}
          onBack={() => { setView("list"); setEditingBranch(null); }}
          onUpdate={handleUpdate}
        />
      )}
    </div>
        </Container>

    </Fragment>
  );
};

export default ManageOutlet;