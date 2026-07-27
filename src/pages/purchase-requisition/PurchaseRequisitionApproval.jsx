import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Share2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
// Background   #F4F6FB   soft blue-grey
// Surface      #FFFFFF
// Ink          #101828
// Ink-muted    #667085
// Line         #E7EAF0
// Primary      #2952E3   (deep procurement blue)
// Primary-tint #EEF2FE
// Success      #14804A / tint #E7F7EE
// Watch/Amber  #B5590B / tint #FDF1E3
// Danger       #C0293D / tint #FBEAEC
// Display face: "Plus Jakarta Sans" (headings) / Body: "Inter" / Mono for codes: "IBM Plex Mono"

const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
const REQUISITIONS = [
  {
    code: "PR-2024-OUT-001",
    date: "Oct 12, 2023",
    raisedBy: "Ankit Sharma",
    initials: "AS",
    outlet: "Laxmi Nagar Branch",
    status: "approved",
  },
  {
    code: "PR-2024-OUT-002",
    date: "Oct 12, 2023",
    raisedBy: "Priya Singh",
    initials: "PS",
    outlet: "Connaught Place Hub",
    status: "pending",
  },
  {
    code: "PR-2024-OUT-003",
    date: "Oct 11, 2023",
    raisedBy: "Manish Kumar",
    initials: "MK",
    outlet: "Dwarka Sector 12",
    status: "approved",
  },
  {
    code: "PR-2024-0892",
    date: "Oct 24, 2024",
    raisedBy: "Sanjay Kapoor",
    initials: "SK",
    outlet: "Mumbai Central Warehouse - WH01",
    status: "pending",
  },
  {
    code: "PR-2024-OUT-005",
    date: "Oct 10, 2023",
    raisedBy: "Sanjay Verma",
    initials: "SV",
    outlet: "Gurgaon Sector 44",
    status: "pending",
  },
];

const INITIAL_ITEMS = [
  {
    id: 1,
    name: "Basmati Rice (Premium)",
    sku: "GRN-BR-001",
    unit: "KG",
    reqQty: 100,
    apprQty: 100,
    stock: 500,
  },
  {
    id: 2,
    name: "Sunflower Oil (5L)",
    sku: "OIL-SF-005",
    unit: "Bottle",
    reqQty: 50,
    apprQty: 40,
    stock: 120,
  },
  {
    id: 3,
    name: "Table Salt (1kg)",
    sku: "SALT-T-001",
    unit: "Packet",
    reqQty: 200,
    apprQty: 0,
    stock: 15,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function varianceInfo(reqQty, apprQty) {
  if (apprQty === 0) return { label: "Rejected", tone: "danger" };
  const diff = apprQty - reqQty;
  const pct = Math.round((diff / reqQty) * 100);
  if (diff === 0) return { label: "Matched", tone: "success" };
  if (pct <= -15) return { label: `${pct}%`, tone: "watch" };
  return { label: `${pct > 0 ? "+" : ""}${pct}%`, tone: pct < 0 ? "amber" : "success" };
}

const toneStyles = {
  success: { bg: "#E7F7EE", fg: "#14804A", dot: "#14804A" },
  watch: { bg: "#EAF1FE", fg: "#2952E3", dot: "#2952E3" },
  amber: { bg: "#FDF1E3", fg: "#B5590B", dot: "#B5590B" },
  danger: { bg: "#FBEAEC", fg: "#C0293D", dot: "#C0293D" },
};

function StatusPill({ status }) {
  const map = {
    approved: { bg: "#EEF2FE", fg: "#2952E3", label: "Approved" },
    pending: { bg: "#FDF1E3", fg: "#B5590B", label: "Pending" },
  };
  const s = map[status];
  return (
    <span
      style={{ background: s.bg, color: s.fg }}
      className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase"
    >
      {s.label}
    </span>
  );
}

function Avatar({ initials }) {
  const colors = ["#2952E3", "#B5590B", "#14804A", "#8B5CF6", "#DB2777"];
  const idx = initials.charCodeAt(0) % colors.length;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
      style={{ background: colors[idx] }}
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// List View
// ---------------------------------------------------------------------------
function ListView({ onApprove }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return REQUISITIONS;
    const q = query.toLowerCase();
    return REQUISITIONS.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.outlet.toLowerCase().includes(q) ||
        r.raisedBy.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1
          className="text-[28px] font-bold text-[#101828]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Purchase Approval
        </h1>
        <p className="text-[#667085] text-sm mt-1.5 max-w-xl">
          Manage and review pending purchase requisitions from various outlets for final
          authorization.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        <StatCard
          icon={<ClipboardList size={18} />}
          iconBg="#EEF2FE"
          iconFg="#2952E3"
          label="Pending approvals"
          value="24"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          iconBg="#E7F7EE"
          iconFg="#14804A"
          label="Today's approved"
          value="156"
        />
        <StatCard
          icon={<XCircle size={18} />}
          iconBg="#FBEAEC"
          iconFg="#C0293D"
          label="Today's rejected"
          value="12"
        />
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search PR code, outlet or manager..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
          />
        </div>
        <button className="h-11 px-4 rounded-xl border border-[#E7EAF0] bg-white text-sm font-medium text-[#344054] flex items-center gap-2 hover:bg-[#F9FAFC] transition-colors">
          <Filter size={15} />
          Filter
        </button>
        <button
          className="w-11 h-11 rounded-xl border border-[#E7EAF0] bg-white flex items-center justify-center text-[#344054] hover:bg-[#F9FAFC] transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={15} />
        </button>
        <button
          className="w-11 h-11 rounded-xl border border-[#E7EAF0] bg-white flex items-center justify-center text-[#344054] hover:bg-[#F9FAFC] transition-colors"
          aria-label="Export"
        >
          <Share2 size={15} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFC] border-b border-[#E7EAF0]">
              {["PR Code", "Date", "Raised by", "Outlet name", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left font-semibold text-[#667085] text-[11px] uppercase tracking-wide px-5 py-3.5"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr
                key={r.code}
                className={`transition-colors ${
                  i !== filtered.length - 1 ? "border-b border-[#EFF1F5]" : ""
                }`}
              >
                <td className="px-5 py-4">
                  <span
                    className="font-semibold text-[#2952E3] text-[13px]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {r.code}
                  </span>
                </td>
                <td className="px-5 py-4 text-[#475467]">{r.date}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={r.initials} />
                    <span className="text-[#101828] font-medium">{r.raisedBy}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-[#475467]">{r.outlet}</td>
                <td className="px-5 py-4">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-5 py-4">
                  {r.status === "pending" ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApprove(r)}
                        className="px-3.5 py-1.5 cursor-pointer rounded-lg bg-[#14804A] text-white text-xs font-semibold hover:bg-[#106b3d] transition-colors"
                      >
                        Approve
                      </button>
                      <button className="px-3.5 py-1.5 rounded-lg border border-[#F0B4BC] text-[#C0293D] text-xs font-semibold hover:bg-[#FBEAEC] transition-colors">
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-lg bg-[#F2F4F7] text-[#98A2B3] text-xs font-semibold inline-block">
                      Approved
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#E7EAF0]">
          <span className="text-xs text-[#667085]">
            Showing 1–{filtered.length} of 124 requisitions
          </span>
          <div className="flex items-center gap-1.5">
            <button className="w-8 h-8 rounded-lg border border-[#E7EAF0] flex items-center justify-center text-[#98A2B3] hover:bg-[#F9FAFC]">
              <ChevronLeft size={14} />
            </button>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className={`w-8 h-8 rounded-lg text-xs font-semibold ${
                  p === 1
                    ? "bg-[#2952E3] text-white"
                    : "border border-[#E7EAF0] text-[#475467] hover:bg-[#F9FAFC]"
                }`}
              >
                {p}
              </button>
            ))}
            <span className="text-[#98A2B3] text-xs px-1">…</span>
            <button className="w-8 h-8 rounded-lg border border-[#E7EAF0] text-xs font-semibold text-[#475467] hover:bg-[#F9FAFC]">
              25
            </button>
            <button className="w-8 h-8 rounded-lg border border-[#E7EAF0] flex items-center justify-center text-[#98A2B3] hover:bg-[#F9FAFC]">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, iconFg, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7EAF0] px-5 py-4 flex items-center gap-3.5">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg, color: iconFg }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide">
          {label}
        </div>
        <div
          className="text-2xl font-bold text-[#101828] mt-0.5"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail / Approval View
// ---------------------------------------------------------------------------
function ApprovalView({ requisition, onBack }) {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [remarks, setRemarks] = useState("");

  const updateQty = (id, value) => {
    const num = Math.max(0, Number(value) || 0);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, apprQty: num } : it)));
  };

  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const totals = useMemo(
    () => ({
      count: items.length,
      req: items.reduce((s, i) => s + i.reqQty, 0),
      appr: items.reduce((s, i) => s + i.apprQty, 0),
    }),
    [items]
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-[#475467] hover:text-[#101828] mb-5 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to approvals
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-[28px] font-bold text-[#101828]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Purchase Approval View
          </h1>
          <p className="text-[#667085] text-sm mt-1.5 max-w-xl">
            Complete the formal review of this requisition. Ensure all compliance
            benchmarks are met before institutional sign-off.
          </p>
        </div>
        <button className="h-10 px-4 rounded-xl border border-[#E7EAF0] bg-white text-sm font-medium text-[#344054] flex items-center gap-2 hover:bg-[#F9FAFC] transition-colors shrink-0">
          <Download size={15} />
          Download PDF
        </button>
      </div>

      {/* Requisition info card */}
      <div className="bg-white rounded-2xl border border-[#E7EAF0] px-6 py-5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-[#101828] font-semibold text-sm">
            <ClipboardList size={16} className="text-[#2952E3]" />
            Requisition information
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#FDF1E3] text-[#B5590B]">
            PR status: Pending
          </span>
        </div>
        <div className="grid grid-cols-4 gap-6">
          <Field
            label="PR code"
            value={requisition?.code ?? "PR-2024-0892"}
            mono
            accent
          />
          <Field label="PR date" value={requisition?.date ?? "Oct 24, 2024"} />
          <Field
            label="Outlet location"
            value={requisition?.outlet ?? "Mumbai Central Warehouse - WH01"}
          />
          <Field label="Approval date" value="10/25/2024" />
        </div>
        <div className="grid grid-cols-2 gap-6 mt-5 pt-5 border-t border-[#EFF1F5]">
          <div>
            <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide mb-2">
              Raised by
            </div>
            <div className="flex items-center gap-2.5">
              <Avatar initials={requisition?.initials ?? "SK"} />
              <span className="text-[#101828] font-medium text-sm">
                {requisition?.raisedBy ?? "Sanjay Kapoor"}{" "}
                <span className="text-[#98A2B3] font-normal">(Inv. Mgr)</span>
              </span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide mb-2">
              Remarks
            </div>
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter administrative remarks regarding this procurement..."
              className="w-full h-9 px-3 rounded-lg border border-[#E7EAF0] text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
            />
          </div>
        </div>
      </div>

      {/* Search + add item */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]"
          />
          <input
            placeholder="Search item by name or code..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
          />
        </div>
        <button className="h-11 px-4 rounded-xl bg-[#2952E3] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#2444c4] transition-colors shrink-0">
          <Plus size={15} />
          Add item
        </button>
      </div>

      {/* Item table */}
      <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7EAF0]">
          <div className="flex items-center gap-2 text-[#101828] font-semibold text-sm">
            <ClipboardList size={16} className="text-[#2952E3]" />
            Item details list
          </div>
          <div className="flex items-center gap-2">
            <button className="h-9 px-3.5 rounded-lg border border-[#E7EAF0] text-xs font-medium text-[#344054] flex items-center gap-1.5 hover:bg-[#F9FAFC]">
              <Filter size={13} />
              Filter
            </button>
            <button className="h-9 px-3.5 rounded-lg border border-[#E7EAF0] text-xs font-medium text-[#344054] flex items-center gap-1.5 hover:bg-[#F9FAFC]">
              <Download size={13} />
              Export
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFC] border-b border-[#E7EAF0]">
              {["Sr. no.", "Item name", "Unit", "Req. qty", "Appr. qty", "Variance", "Stock avail.", "Action"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left font-semibold text-[#667085] text-[11px] uppercase tracking-wide px-5 py-3.5"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const v = varianceInfo(it.reqQty, it.apprQty);
              const tone = toneStyles[v.tone];
              const fillPct = Math.min(100, Math.round((it.apprQty / it.reqQty) * 100));
              return (
                <tr
                  key={it.id}
                  className={idx !== items.length - 1 ? "border-b border-[#EFF1F5]" : ""}
                >
                  <td className="px-5 py-4 text-[#667085] font-medium">
                    {String(idx + 1).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#101828] font-semibold">{it.name}</div>
                    <div
                      className="text-[11px] text-[#98A2B3] mt-0.5"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      SKU: {it.sku}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[#475467]">{it.unit}</td>
                  <td className="px-5 py-4 text-[#475467]">{it.reqQty.toFixed(2)}</td>
                  <td className="px-5 py-4">
                    <input
                      value={it.apprQty}
                      onChange={(e) => updateQty(it.id, e.target.value)}
                      type="number"
                      min={0}
                      className="w-20 h-9 px-2.5 rounded-lg border border-[#E7EAF0] text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        style={{ background: tone.bg, color: tone.fg }}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase whitespace-nowrap"
                      >
                        {v.label}
                      </span>
                      <div className="w-12 h-1.5 rounded-full bg-[#EFF1F5] overflow-hidden hidden md:block">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${fillPct}%`, background: tone.dot }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[#475467]">{it.stock.toFixed(2)}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => removeItem(it.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#C0293D] hover:bg-[#FBEAEC] transition-colors"
                      aria-label={`Remove ${it.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals footer */}
        <div className="grid grid-cols-3 px-5 py-4 border-t border-[#E7EAF0] bg-[#F9FAFC]">
          <TotalStat label="Total items" value={String(totals.count).padStart(2, "0")} />
          <TotalStat label="Total req. qty" value={totals.req.toFixed(2)} />
          <TotalStat label="Total appr. qty" value={totals.appr.toFixed(2)} />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-3 mt-6">
        <button className="h-11 px-5 rounded-xl border border-[#E7EAF0] bg-white text-sm font-semibold text-[#344054] hover:bg-[#F9FAFC] transition-colors">
          Save
        </button>
        <button className="h-11 px-5 rounded-xl bg-[#2952E3] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[#2444c4] transition-colors">
          <CheckCircle2 size={16} />
          Save & approval
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, mono, accent }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide mb-1.5">
        {label}
      </div>
      <div
        className={`text-sm font-semibold ${accent ? "text-[#2952E3]" : "text-[#101828]"}`}
        style={mono ? { fontFamily: "'IBM Plex Mono', monospace" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function TotalStat({ label, value }) {
  return (
    <div className="text-right px-4">
      <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide mb-1">
        {label}
      </div>
      <div
        className="text-lg font-bold text-[#101828]"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {value}
      </div>
    </div>
  );
}

export default function PurchaseRequisitionApproval() {
  const [view, setView] = useState("list");
  const [active, setActive] = useState(null);

  const openDetail = (req) => {
    setActive(req);
    setView("detail");
  };

  return (
    <div className="min-h-screen w-full" style={{ background: "#F4F6FB" }}>
      <style>{`@import url('${FONT_IMPORT_URL}'); * { font-family: 'Inter', sans-serif; }`}</style>
      {view === "list" ? (
        <ListView onApprove={openDetail} />
      ) : (
        <ApprovalView requisition={active} onBack={() => setView("list")} />
      )}
    </div>
  );
}