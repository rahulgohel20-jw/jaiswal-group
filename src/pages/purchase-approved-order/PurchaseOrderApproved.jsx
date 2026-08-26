// ============================================
// File: src/pages/purchase-order/PurchaseOrderApproval.jsx
// ============================================

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
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
  Pencil,
  Clock3,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import SearchableSelect from '@/utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import { OrgTypes } from '@/constants/orgTypes';
import { usePurchaseOrders } from '../purchase-order-requests/utils/usePurchaseOrders';
import { PO_STATUS, PO_STATUS_LIST, getPoStatusLabel } from '../purchase-order-requests/utils/poStatus';
import { getUsernameFromToken } from '../../utils/auth';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

// Statuses visible to an approver, which of those still allow Approve/Reject,
// and which are editable (approver can still adjust an in-progress PO).
const APPROVER_VISIBLE_STATUSES = [
  PO_STATUS.SENT_FOR_APPROVAL,
  PO_STATUS.IN_PROGRESS,
  PO_STATUS.APPROVED,
  PO_STATUS.REJECTED,
];
const ACTIONABLE_STATUSES = [PO_STATUS.SENT_FOR_APPROVAL, PO_STATUS.IN_PROGRESS];
const EDITABLE_STATUSES = [];

const ALL_STATUS = 'ALL';
const STATUS_FILTER_OPTIONS = [
  { value: ALL_STATUS, label: 'All Statuses' },
  ...APPROVER_VISIBLE_STATUSES.map((status) => ({
    value: status,
    label: getPoStatusLabel(status),
  })),
];

const STATUS_META = {
  [PO_STATUS.SENT_FOR_APPROVAL]: { bg: '#EEF2FE', fg: '#2952E3' },
  [PO_STATUS.IN_PROGRESS]: { bg: '#FEF6E7', fg: '#B7791F' },
  [PO_STATUS.APPROVED]: { bg: '#E7F7EE', fg: '#14804A' },
  [PO_STATUS.REJECTED]: { bg: '#FBEAEC', fg: '#C0293D' },
};

const TruncatedCell = ({
  value,
  widthClass = 'max-w-[180px]',
  className = 'text-[#475467]',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

function StatusPill({ status }) {
  const meta = STATUS_META[status] ?? { bg: '#F2F4F7', fg: '#667085' };
  return (
    <span
      style={{ background: meta.bg, color: meta.fg }}
      className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase"
    >
      {getPoStatusLabel(status)}
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
function UnitDropdown({ units, selectedUnitId, onChange }) {
  const options = units.map((u) => ({ value: u.id, label: u.name }));
  return (
    <div className="min-w-[220px]">
      <SearchableSelect
        name="unit"
        value={selectedUnitId ?? ''}
        onChange={(e) => onChange(e.target.value)}
        options={options}
        placeholder={units.length === 0 ? 'No units available' : 'Select unit...'}
        disabled={units.length === 0}
      />
    </div>
  );
}

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

const PAGE_SIZE = 10;

const PurchaseOrderApproval = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(PO_STATUS.SENT_FOR_APPROVAL);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const {
    loading: scopeLoading,
    error: scopeError,
    orgType,
    units,
    selectedUnitId,
    setSelectedUnitId,
    retry: retryScope,
  } = useOrgScope();

  const {
    list: allPos,
    loading: poLoading,
    error: poError,
    fetchByOutletandStatus,
  } = usePurchaseOrders();

  const showUnitDropdown = orgType === OrgTypes.GROUP || orgType === OrgTypes.SUB_COMPANY;
  const currentUnitId = selectedUnitId || 0;

  const targetStatus = useMemo(() => {
    if (!statusFilter) return PO_STATUS.SENT_FOR_APPROVAL;
    if (statusFilter === ALL_STATUS) return APPROVER_VISIBLE_STATUSES;
    return statusFilter;
  }, [statusFilter]);

  const loadData = () => {
    fetchByOutletandStatus(currentUnitId, targetStatus);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUnitId, targetStatus]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [query, statusFilter, currentUnitId]);

  // Safety net in case the response ever includes something outside
  // the approver-visible set.
  const approverPos = useMemo(
    () => allPos.filter((p) => APPROVER_VISIBLE_STATUSES.includes(p.rawStatus)),
    [allPos],
  );

  const counts = useMemo(() => {
    const c = {};
    APPROVER_VISIBLE_STATUSES.forEach((s) => (c[s] = 0));
    approverPos.forEach((p) => {
      if (c[p.rawStatus] != null) c[p.rawStatus] += 1;
    });
    return c;
  }, [approverPos]);

  const filtered = useMemo(() => {
    let rows = approverPos;
    if (statusFilter !== ALL_STATUS) {
      rows = rows.filter((p) => p.rawStatus === statusFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (p) =>
          (p.poCode || '').toLowerCase().includes(q) ||
          (p.outlet || '').toLowerCase().includes(q) ||
          (p.raisedBy || '').toLowerCase().includes(q) ||
          (p.createdByName || '').toLowerCase().includes(q),
      );
    }
    return rows.slice().sort(sortByDateDesc);
  }, [approverPos, statusFilter, query]);

  // Approve/Reject hand off to the shared create/edit form, tagged with
  // reviewMode so that page shows a decision button (Approve or Reject)
  // instead of Save Draft / Generate.
  const handleApprove = (po) => {
    navigate(`/purchase/edit-purchase-order/${po.id}`, {
      state: { ...po, reviewMode: 'approve' },
    });
  };

  const handleReject = (po) => {
    navigate(`/purchase/edit-purchase-order/${po.id}`, {
      state: { ...po, reviewMode: 'reject' },
    });
  };

  // View goes to the dedicated read-only detail page — used for
  // terminal-state rows (Approved / Rejected) where nothing is editable.
  const handleView = (po) => {
    navigate(`/purchase/purchase-order-detail/${po.id}`);
  };

  // Edit goes to the editable form for IN_PROGRESS rows with approve review mode.
  const handleEdit = (po) => {
    navigate(`/purchase/edit-purchase-order/${po.id}`, {
      state: { ...po, reviewMode: 'approve' },
    });
  };

  const columns = useMemo(
    () => [
      {
        id: 'poCode',
        accessorFn: (row) => row.poCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="PO CODE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span
            className="font-semibold text-[#2952E3] text-[13px]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {row.original.poCode}
          </span>
        ),
        size: 190,
      },
      {
        id: 'date',
        accessorFn: (row) => row.date,
        header: ({ column }) => (
          <DataGridColumnHeader title="PO DATE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.date} widthClass="max-w-[120px]" />,
        size: 130,
      },
      {
        id: 'expectedDeliveryDate',
        accessorFn: (row) => row.expectedDeliveryDate,
        header: ({ column }) => (
          <DataGridColumnHeader title="EXPECTED DELIVERY DATE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.expectedDeliveryDate} widthClass="max-w-[130px]" />
        ),
        size: 180,
      },
      {
        id: 'outlet',
        accessorFn: (row) => row.outlet,
        header: ({ column }) => (
          <DataGridColumnHeader title="OUTLET NAME" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.outlet} widthClass="max-w-[180px]" />,
        size: 190,
      },
      {
        id: 'raisedBy',
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
        id: 'status',
        accessorFn: (row) => row.rawStatus,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <StatusPill status={row.original.rawStatus} />,
        size: 150,
      },
      {
        id: 'action',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => {
          const po = row.original;
          const actionable = ACTIONABLE_STATUSES.includes(po.rawStatus);
          const editable = EDITABLE_STATUSES.includes(po.rawStatus);

          if (actionable) {
            return (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove(po)}
                  className="px-3.5 py-1.5 cursor-pointer rounded-lg bg-[#14804A] text-white text-xs font-semibold hover:bg-[#106b3d] transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(po)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#F0B4BC] text-[#C0293D] text-xs font-semibold hover:bg-[#FBEAEC] transition-colors"
                >
                  Reject
                </button>
              </div>
            );
          }

          if (editable) {
            return (
              <button
                onClick={() => handleEdit(po)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#F5C77E] text-[#B7791F] text-xs font-semibold hover:bg-[#FEF6E7] transition-colors"
              >
                <Pencil size={13} />
                Edit
              </button>
            );
          }

          return (
            <button
              onClick={() => handleView(po)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E7EAF0] text-[#475467] text-xs font-semibold hover:bg-[#F9FAFC] transition-colors"
            >
              <Eye size={13} />
              View
            </button>
          );
        },
        enableSorting: false,
        size: 200,
      },
    ],
    [],
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
          <span className="text-[#084E92] font-medium">Purchase Order Approval</span>
        </div>
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-[#101828]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Purchase Order Approval
          </h1>
          <p className="text-[#667085] text-sm mt-1.5 max-w-xl">
            Manage and review purchase orders awaiting your review.
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          <StatCard icon={<ClipboardList size={18} />} iconBg="#EEF2FE" iconFg="#2952E3" label="Sent for approval" value={counts[PO_STATUS.SENT_FOR_APPROVAL] ?? 0} />
          <StatCard icon={<Clock3 size={18} />} iconBg="#FEF6E7" iconFg="#B7791F" label="In progress" value={counts[PO_STATUS.IN_PROGRESS] ?? 0} />
          <StatCard icon={<CheckCircle2 size={18} />} iconBg="#E7F7EE" iconFg="#14804A" label="Approved" value={counts[PO_STATUS.APPROVED] ?? 0} />
          <StatCard icon={<XCircle size={18} />} iconBg="#FBEAEC" iconFg="#C0293D" label="Rejected" value={counts[PO_STATUS.REJECTED] ?? 0} />
        </div>

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search PO code or outlet..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
            />
          </div>
          {showUnitDropdown && (
            <UnitDropdown units={units} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
          )}
          <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
        </div>

        {poError && !scopeLoading && !poLoading && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 text-sm text-[#C0293D]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{poError}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {scopeLoading || poLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading purchase orders…
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
};

export default PurchaseOrderApproval;