import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  Filter,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { Container } from "@/components/common/container";
import { Card, CardFooter, CardTable } from "@/components/ui/card";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import SearchableSelect from "@/utils/SearchableSelect";
import { getPurchaseRequisitionsByOutlet } from "@/services/apiServices";
import { useOrgScope } from "@/hooks/useOrgScope";
import { OrgTypes } from "@/constants/orgTypes";
import { PR_STATUS, PR_STATUS_LIST, getStatusLabel } from './utils/prStatus';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";

// Statuses visible to an approver, and which of those still allow action.
const APPROVER_VISIBLE_STATUSES = [
  PR_STATUS.SENT_FOR_APPROVAL,
  PR_STATUS.IN_PROGRESS,
  PR_STATUS.APPROVED,
  PR_STATUS.REJECTED,
];
const ACTIONABLE_STATUSES = [PR_STATUS.SENT_FOR_APPROVAL, PR_STATUS.IN_PROGRESS];

// "ALL" is a UI-only sentinel — not sent to the API as a real status.
const ALL_STATUS = "ALL";
const STATUS_FILTER_OPTIONS = [
  { value: ALL_STATUS, label: "All statuses" },
  ...PR_STATUS_LIST.filter((s) => APPROVER_VISIBLE_STATUSES.includes(s.value)),
];

const STATUS_META = {
  [PR_STATUS.SENT_FOR_APPROVAL]: { bg: "#EEF2FE", fg: "#2952E3" },
  [PR_STATUS.IN_PROGRESS]: { bg: "#FDF1E3", fg: "#B5590B" },
  [PR_STATUS.APPROVED]: { bg: "#E7F7EE", fg: "#14804A" },
  [PR_STATUS.REJECTED]: { bg: "#FBEAEC", fg: "#C0293D" },
};

// Truncates long text within a fixed-width box, revealing the full value on hover
// (mirrors TruncatedCell from UserManagementList.jsx)
const TruncatedCell = ({
  value,
  widthClass = "max-w-[180px]",
  className = "text-[#475467]",
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

const mapPr = (pr) => ({
  id: pr.id,
  code: pr.prCode,
  date: pr.prDate,
  requiredDate: pr.prRequiredDate,
  remarks: pr.remarks,
  status: pr.status,
  outletId: pr.outletId,
  outlet: pr.outletName ?? `Outlet #${pr.outletId}`,
  raisedBy: pr.createdByName ?? pr.updatedByName ?? pr.actionBy ?? pr.updatedBy ?? pr.createdBy ?? '',
  createdBy: pr.createdBy,
  createdByName: pr.createdByName,
  updatedBy: pr.updatedBy,
  updatedByName: pr.updatedByName,
  details: pr.details ?? [],
});

const parseDateToTime = (dateStr, createdAt, id) => {
  if (createdAt) {
    const match = String(createdAt).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?)?/i);
    if (match) {
      let [, d, m, y, h = '0', min = '0', ampm] = match;
      let hour = parseInt(h, 10);
      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
        if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
      }
      return new Date(y, m - 1, d, hour, parseInt(min, 10)).getTime();
    }
    const t = new Date(createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (dateStr) {
    const match = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const [, d, m, y] = match;
      return new Date(y, m - 1, d).getTime();
    }
    const t = new Date(dateStr).getTime();
    if (!isNaN(t)) return t;
  }
  return Number(id) || 0;
};

const sortByDateDesc = (a, b) => {
  const timeA = parseDateToTime(a.date, a.createdAt, a.id);
  const timeB = parseDateToTime(b.date, b.createdAt, b.id);
  if (timeB !== timeA) return timeB - timeA;
  return (Number(b.id) || 0) - (Number(a.id) || 0);
};

// ---- PR fetch hook — driven by BOTH the selected unit and the selected
// status. Selecting a specific status in the dropdown sends that status
// straight to getbyoutlet as a single call. "All statuses" is the one case
// that still needs to fan out across all 4 visible statuses and merge,
// since the endpoint only accepts one status per call.
function useRequisitions(effectiveOutletId, statusFilter, filterRowsByScope, scopeLoading) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requisitions, setRequisitions] = useState([]);

  const reload = useCallback(async () => {
    if (scopeLoading) return;
    setLoading(true);
    setError(null);
    try {
      let raw;
      if (statusFilter === ALL_STATUS) {
        const responses = await Promise.all(
          APPROVER_VISIBLE_STATUSES.map((status) =>
            getPurchaseRequisitionsByOutlet(effectiveOutletId, status)
          )
        );
        raw = responses.flatMap((res) => {
          const data = res?.data?.data ?? res?.data ?? res ?? [];
          return Array.isArray(data) ? data : [];
        });
      } else {
        const targetStatus = statusFilter || PR_STATUS.SENT_FOR_APPROVAL;
        const res = await getPurchaseRequisitionsByOutlet(effectiveOutletId, targetStatus);
        const data = res?.data?.data ?? res?.data ?? res ?? [];
        raw = Array.isArray(data) ? data : [];
      }
      const mapped = raw.map(mapPr);
      const scoped = filterRowsByScope ? filterRowsByScope(mapped) : mapped;
      setRequisitions(scoped);
    } catch (err) {
      setError(err?.message || "Failed to load purchase requisitions.");
    } finally {
      setLoading(false);
    }
  }, [effectiveOutletId, statusFilter, filterRowsByScope, scopeLoading]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, error, requisitions, reload };
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] ?? { bg: "#F2F4F7", fg: "#667085" };
  return (
    <span
      style={{ background: meta.bg, color: meta.fg }}
      className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase"
    >
      {getStatusLabel(status)}
    </span>
  );
}

function StatCard({ icon, iconBg, iconFg, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7EAF0] px-5 py-4 flex items-center gap-3.5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconFg }}>
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-bold text-[#101828] mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// Only rendered for GROUP / SUB_COMPANY — OUTLET users never see this.
// Uses the shared SearchableSelect so a long unit list can be typed/filtered.
function UnitDropdown({ units, selectedUnitId, onChange }) {
  const options = units.map((u) => ({ value: u.id, label: u.name }));
  return (
    <div className="min-w-[220px]">
      <SearchableSelect
        name="unit"
        value={selectedUnitId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        options={options}
        placeholder={units.length === 0 ? "No units available" : "Select unit..."}
        disabled={units.length === 0}
      />
    </div>
  );
}

// Drives the status sent to getPurchaseRequisitionsByOutlet directly.
function StatusDropdown({ value, onChange }) {
  return (
    <div className="relative">
      <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 pl-10 pr-8 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3] min-w-[190px]"
      >
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const PAGE_SIZE = 10;

function ListView({ onApprove, onReject, onView }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(PR_STATUS.SENT_FOR_APPROVAL);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const {
    loading: scopeLoading,
    error: scopeError,
    orgType,
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    showUnitDropdown,
    units,
    selectedUnitId,
    setSelectedUnitId,
    effectiveOutletId,
    filterRowsByScope,
    retry: retryScope,
  } = useOrgScope();

  const { loading: prLoading, error: prError, requisitions } = useRequisitions(
    effectiveOutletId,
    statusFilter,
    filterRowsByScope,
    scopeLoading
  );

  // Counts reflect whatever is currently loaded. They're exact when "All
  // statuses" is selected; when one specific status is picked, only that
  // status's card is non-zero, since the others weren't fetched. If you
  // want all three cards always accurate regardless of the dropdown, fetch
  // counts separately (4 parallel calls) instead of deriving from `requisitions`.
  const counts = useMemo(() => {
    const c = {};
    APPROVER_VISIBLE_STATUSES.forEach((s) => (c[s] = 0));
    requisitions.forEach((r) => {
      if (c[r.status] != null) c[r.status] += 1;
    });
    return c;
  }, [requisitions]);

  const filtered = useMemo(() => {
    let rows = requisitions;
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = requisitions.filter(
        (r) =>
          (r.code || "").toLowerCase().includes(q) ||
          (r.outlet || "").toLowerCase().includes(q) ||
          (r.raisedBy || "").toLowerCase().includes(q) ||
          (r.createdByName || "").toLowerCase().includes(q)
      );
    }
    return rows.slice().sort(sortByDateDesc);
  }, [requisitions, query]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [query, statusFilter, selectedUnitId]);

  const columns = useMemo(
    () => [
      {
        id: "code",
        accessorFn: (row) => row.code,
        header: ({ column }) => (
          <DataGridColumnHeader title="PR CODE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span
            className="font-semibold text-[#2952E3] text-[13px]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {row.original.code}
          </span>
        ),
        size: 140,
      },
      {
        id: "date",
        accessorFn: (row) => row.date,
        header: ({ column }) => (
          <DataGridColumnHeader title="DATE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.date} widthClass="max-w-[120px]" />,
        size: 130,
      },
      {
        id: "requiredDate",
        accessorFn: (row) => row.requiredDate,
        header: ({ column }) => (
          <DataGridColumnHeader title="REQUIRED DATE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.requiredDate} widthClass="max-w-[120px]" />,
        size: 140,
      },
      {
        id: "outlet",
        accessorFn: (row) => row.outlet,
        header: ({ column }) => (
          <DataGridColumnHeader title="OUTLET NAME" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.outlet} widthClass="max-w-[180px]" />,
        size: 190,
      },
      {
        id: "raisedBy",
        accessorFn: (row) => row.raisedBy || row.createdByName,
        header: ({ column }) => (
          <DataGridColumnHeader title="RAISED BY" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => {
          const name = row.original.raisedBy || row.original.createdByName;
          return <TruncatedCell value={name || '—'} widthClass="max-w-[140px]" />;
        },
        size: 150,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <StatusPill status={row.original.status} />,
        size: 160,
      },
      {
        id: "action",
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => {
          const r = row.original;
          const actionable = ACTIONABLE_STATUSES.includes(r.status);
          return actionable ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onApprove(r)}
                className="px-3.5 py-1.5 cursor-pointer rounded-lg bg-[#14804A] text-white text-xs font-semibold hover:bg-[#106b3d] transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(r)}
                className="px-3.5 py-1.5 rounded-lg border border-[#F0B4BC] text-[#C0293D] text-xs font-semibold hover:bg-[#FBEAEC] transition-colors"
              >
                Reject
              </button>
            </div>
          ) : (
            <button
              onClick={() => onView(r)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E7EAF0] text-[#475467] text-xs font-semibold hover:bg-[#F9FAFC] transition-colors"
            >
              <Eye size={13} />
              View
            </button>
          );
        },
        enableSorting: false,
        size: 160,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onApprove, onReject, onView],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Container>
      <div className="mx-auto py-10 p-6">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Purchase</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Purchase Requisition Approval</span>
        </div>
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-[#101828]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Purchase Requisition Approval
          </h1>
          <p className="text-[#667085] text-sm mt-1.5 max-w-xl">
            Manage and review purchase requisitions awaiting your review.
          </p>
        </div>

        {scopeError && (
          <div className="mb-6 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-[#C0293D]">{scopeError}</span>
            <button onClick={retryScope} className="text-xs font-semibold text-[#C0293D] underline shrink-0">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-7">
          <StatCard icon={<ClipboardList size={18} />} iconBg="#EEF2FE" iconFg="#2952E3" label="Send for approval" value={counts[PR_STATUS.SENT_FOR_APPROVAL] ?? 0} />
          <StatCard icon={<CheckCircle2 size={18} />} iconBg="#E7F7EE" iconFg="#14804A" label="Approved" value={counts[PR_STATUS.APPROVED] ?? 0} />
          <StatCard icon={<XCircle size={18} />} iconBg="#FBEAEC" iconFg="#C0293D" label="Rejected" value={counts[PR_STATUS.REJECTED] ?? 0} />
        </div>

        {/* Search + unit dropdown + status dropdown, aligned in one row */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search PR code or outlet..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
            />
          </div>
          {showUnitDropdown && (
            <UnitDropdown units={units} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
          )}
          <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
        </div>

        {prError && !scopeLoading && !prLoading && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 text-sm text-[#C0293D]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{prError}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {(scopeLoading || prLoading) ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading requisitions…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filtered.length}
              className="rounded-2xl"
              tableLayout={{
                width: 'fixed',
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl">
                <CardTable>
                  <ScrollArea>
                    <DataGridTable />
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
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
}

export default function PurchaseRequisitionApproval() {
  const navigate = useNavigate();

  const handleApprove = (req) => {
    navigate(`/approve-purchase-requisition/approve/${req.id}`, {
      state: { requisition: req },
    });
  };

  const handleReject = (req) => {
    navigate(`/approve-purchase-requisition/reject/${req.id}`, {
      state: { requisition: req },
    });
  };

  // Approved/Rejected rows route into the existing detail view
  // (PurchaseRequisitionView.jsx) rather than a separate approval-only page.
  const handleView = (req) => {
    navigate(`/purchase-requisition/view/${req.id}`);
  };

  return <ListView onApprove={handleApprove} onReject={handleReject} onView={handleView} />;
}