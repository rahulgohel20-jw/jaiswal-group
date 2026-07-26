import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Share2,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 cursor-pointer"
      style={{ background: colors[idx] }}
    >
      {initials}
    </div>
  );
}

function StatCard({ icon, iconBg, iconFg, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7EAF0] px-5 py-4 flex items-center gap-3.5 cursor-pointer">
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
// ListView Component
// ---------------------------------------------------------------------------
export default function ListView({ onOpen }) {
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
      <style>{`@import url('${FONT_IMPORT_URL}'); * { font-family: 'Inter', sans-serif; }`}</style>

      {/* Header */}
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
        <button className="cursor-pointer h-11 px-4 rounded-xl border border-[#E7EAF0] bg-white text-sm font-medium text-[#344054] flex items-center gap-2 hover:bg-[#F9FAFC] transition-colors">
          <Filter size={15} />
          Filter
        </button>
        <button
          className="cursor-pointer w-11 h-11 rounded-xl border border-[#E7EAF0] bg-white flex items-center justify-center text-[#344054] hover:bg-[#F9FAFC] transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={15} />
        </button>
        <button
          className="cursor-pointer w-11 h-11 rounded-xl border border-[#E7EAF0] bg-white flex items-center justify-center text-[#344054] hover:bg-[#F9FAFC] transition-colors"
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
                onClick={() => onOpen(r)}
                className={`cursor-pointer hover:bg-[#F9FAFC] transition-colors ${
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(r);
                        }}
                        className="cursor-pointer px-3.5 py-1.5 rounded-lg bg-[#14804A] text-white text-xs font-semibold hover:bg-[#106b3d] transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer px-3.5 py-1.5 rounded-lg border border-[#F0B4BC] text-[#C0293D] text-xs font-semibold hover:bg-[#FBEAEC] transition-colors"
                      >
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
            Showing 1ΓÇô{filtered.length} of 124 requisitions
          </span>
          <div className="flex items-center gap-1.5">
            <button className="cursor-pointer w-8 h-8 rounded-lg border border-[#E7EAF0] flex items-center justify-center text-[#98A2B3] hover:bg-[#F9FAFC]">
              <ChevronLeft size={14} />
            </button>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className={`cursor-pointer w-8 h-8 rounded-lg text-xs font-semibold ${
                  p === 1
                    ? "bg-[#2952E3] text-white"
                    : "border border-[#E7EAF0] text-[#475467] hover:bg-[#F9FAFC]"
                }`}
              >
                {p}
              </button>
            ))}
            <span className="text-[#98A2B3] text-xs px-1">ΓÇª</span>
            <button className="cursor-pointer w-8 h-8 rounded-lg border border-[#E7EAF0] text-xs font-semibold text-[#475467] hover:bg-[#F9FAFC]">
              25
            </button>
            <button className="cursor-pointer w-8 h-8 rounded-lg border border-[#E7EAF0] flex items-center justify-center text-[#98A2B3] hover:bg-[#F9FAFC]">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}