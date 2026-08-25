// ============================================
// File: src/pages/purchase-order-requests/PurchaseOrderRequest.jsx
// ============================================

import { useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Filter,
  ChevronRight,
  ClipboardList,
  Package,
  CircleCheck,
  CircleX,
  Plus,
  Search,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import SearchableSelect from '@/utils/searchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import { usePurchaseOrders } from './utils/usePurchaseOrders';
import { OrgTypes } from '@/constants/orgTypes';
import { PO_STATUS_GROUP, PO_GROUPS, getPoStatusLabel } from './utils/poStatus';
import { getUsernameFromToken } from '../../utils/auth';

const STAGE = {
  PR_NO_PO: 'PR_NO_PO',
  PO: 'PO',
};

const AWAITING_PO_GROUP = 'AWAITING_PO';
const ALL_GROUP = 'ALL';

// Reverse of PO_STATUS_GROUP: group key -> array of rawStatus values that
// belong to it. Built once from the existing status->group map so it never
// drifts out of sync with poStatus.js.
const GROUP_TO_STATUSES = Object.entries(PO_STATUS_GROUP).reduce((acc, [status, group]) => {
  (acc[group] = acc[group] || []).push(status);
  return acc;
}, {});

const ALL_PO_STATUSES = Object.keys(PO_STATUS_GROUP);

const TruncatedCell = ({
  value,
  widthClass = 'max-w-[180px]',
  className = 'text-gray-600',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

const STATUS_BADGE_STYLES = {
  'TO BE GENERATED': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400' },
  Draft: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Sent for Approval': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  'In Progress': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  Approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  Rejected: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
};

const StatusBadge = ({ status }) => {
  const style = STATUS_BADGE_STYLES[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${style.bg} ${style.text} ${style.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      {status || '—'}
    </span>
  );
};

// Only rendered for GROUP / SUB_COMPANY — same dropdown used on the PR list page.
function UnitDropdown({ units, selectedUnitId, onChange }) {
  const options = units.map((u) => ({ value: u.id, label: u.name }));
  return (
    <div className="min-w-[220px]">
      <SearchableSelect
        name="unit"
        value={selectedUnitId ?? ''}
        onChange={(e) => onChange(e.target.value)}
        options={options}
        placeholder={units.length === 0 ? 'No outlets available' : 'Select outlet...'}
        disabled={units.length === 0}
      />
    </div>
  );
}

const PO_STATUS_OPTIONS = [
  { value: ALL_GROUP, label: 'All Statuses' },
  ...PO_GROUPS.map((g) => ({ value: g.key, label: g.label })),
];

function MasterStatusDropdown({ value, onChange }) {
  return (
    <div className="relative min-w-[190px]">
      <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full pl-10 pr-8 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
      >
        {PO_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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

const PurchaseOrderRequest = () => {
  const {
    loading: scopeLoading,
    error: scopeError,
    orgType,
    units,
    selectedUnitId,
    setSelectedUnitId,
    retry: retryScope,
  } = useOrgScope();

  // Stage 1: approved PRs with no PO yet.
  const {
    list: prList,
    loading: prLoading,
    error: prError,
    fetchApprovedRequestsByOutlet,
    rejectRequest,
    remove,
  } = usePurchaseOrders();

  // Real POs — fetched per active status group (see the PO effect below) and
  // cached per group so switching filters doesn't lose data already fetched.
  const {
    list: poRawList,
    loading: poLoading,
    error: poError,
    fetchByOutletandStatus,
  } = usePurchaseOrders();

  const showUnitDropdown = orgType === OrgTypes.GROUP || orgType === OrgTypes.SUB_COMPANY;

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState('DRAFT');
  const [rejectingId, setRejectingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [poCache, setPoCache] = useState({});

  const currentUnitId = selectedUnitId || 0;
  const isAwaitingPoOnly = activeGroup === AWAITING_PO_GROUP;
  const isAllGroups = activeGroup === ALL_GROUP;

  // Manual/full refresh (used by the error banner's Retry and after a
  // reject/delete action) — refetches both the PR-approved list and
  // whichever PO group is currently active.
  const loadData = () => {
    if (isAllGroups || isAwaitingPoOnly) {
      fetchApprovedRequestsByOutlet(currentUnitId);
    }
    if (!isAwaitingPoOnly) {
      const statuses = GROUP_TO_STATUSES[activeGroup] || [];
      if (statuses.length > 0) {
        fetchByOutletandStatus(currentUnitId, statuses);
      }
    }
  };

  // ---- Stage 1: Approved PRs with no PO yet (Awaiting PO) ----
  useEffect(() => {
    if (isAllGroups || isAwaitingPoOnly) {
      fetchApprovedRequestsByOutlet(currentUnitId);
    }
  }, [currentUnitId, activeGroup, isAllGroups, isAwaitingPoOnly, fetchApprovedRequestsByOutlet]);

  // ---- Stage 2: POs per group ----
  useEffect(() => {
    if (isAwaitingPoOnly) return;
    const statuses = GROUP_TO_STATUSES[activeGroup] || [];
    if (statuses.length === 0) return;
    fetchByOutletandStatus(currentUnitId, statuses);
  }, [currentUnitId, activeGroup, isAwaitingPoOnly, fetchByOutletandStatus]);

  // Merge freshly-fetched POs into the per-group cache
  useEffect(() => {
    if (isAwaitingPoOnly) return;
    if (!poRawList) return;
    setPoCache((prev) => ({
      ...prev,
      [activeGroup]: poRawList,
    }));
  }, [poRawList, activeGroup, isAwaitingPoOnly]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, activeGroup, currentUnitId]);

  // Clear the per-group cache whenever the outlet changes so stale data never leaks.
  useEffect(() => {
    setPoCache({});
  }, [currentUnitId]);

  const handleReject = async (row) => {
    setRejectingId(row.id);
    try {
      await rejectRequest(row.id, {
        actionBy: getUsernameFromToken(),
        remarks: 'Rejected from Purchase Order Request list',
      });
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setRejectingId(null);
    }
  };

  const openDeleteConfirm = (item) => {
    setDeleteTarget({
      id: item.id,
      itemLabel: item.poCode && item.poCode !== 'TO BE GENERATED' ? item.poCode : `Draft PO #${item.id}`,
    });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteSaving) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await remove(deleteTarget.id, {
        actionBy: getUsernameFromToken(),
      });
      setPoCache((prev) => ({
        ...prev,
        DRAFT: (prev.DRAFT || []).filter((p) => p.id !== deleteTarget.id),
        ALL: (prev.ALL || []).filter((p) => p.id !== deleteTarget.id),
      }));
      closeDeleteConfirm();
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteSaving(false);
    }
  };

  // ---- Current list for the active dropdown option ----
  const combinedList = useMemo(() => {
    const formattedPrs = prList.map((r) => ({
      ...r,
      stage: STAGE.PR_NO_PO,
      group: AWAITING_PO_GROUP,
      displayStatus: 'TO BE GENERATED',
      // Map PR specific fields to universal PO fields for unified columns
      expectedDeliveryDate: r.requiredDate,
    }));

    if (isAwaitingPoOnly) return formattedPrs;

    const currentGroupPos = poCache[activeGroup] || [];
    const formattedPos = currentGroupPos.map((p) => ({
      ...p,
      stage: STAGE.PO,
      group: PO_STATUS_GROUP[p.rawStatus] || 'UNKNOWN',
      displayStatus: getPoStatusLabel(p.rawStatus),
    }));

    if (isAllGroups) {
      return [...formattedPrs, ...formattedPos];
    }

    return formattedPos;
  }, [isAwaitingPoOnly, isAllGroups, prList, poCache, activeGroup]);

  // Unified columns suitable for both PRs (Awaiting PO) and POs
  const columns = useMemo(() => {
    return [
      {
        accessorKey: 'poCode',
        header: ({ column }) => (
          <DataGridColumnHeader title="CODE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) =>
          row.original.stage === STAGE.PR_NO_PO ? (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[#084E92] whitespace-nowrap text-sm">
                {row.original.prCode || '—'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] whitespace-nowrap font-medium text-gray-500 w-fit">
                PR AWAITING PO
              </span>
            </div>
          ) : (
            <span className="font-semibold text-[#084E92] whitespace-nowrap text-sm">
              {row.original.poCode}
            </span>
          ),
        size: 190,
      },
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <DataGridColumnHeader title="DATE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <span className="whitespace-nowrap text-sm text-[#475467]">{row.original.date || '—'}</span>,
        size: 130,
      },
      {
        accessorKey: 'expectedDeliveryDate',
        header: ({ column }) => (
          <DataGridColumnHeader title="DELIVERY DATE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-[#475467]">{row.original.expectedDeliveryDate || '—'}</span>
        ),
        size: 210,
      },
      {
        accessorKey: 'outlet',
        header: ({ column }) => (
          <DataGridColumnHeader title="OUTLET NAME" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.outlet} widthClass="max-w-[200px]" />,
        size: 210,
      },
      {
        accessorKey: 'raisedBy',
        header: ({ column }) => (
          <DataGridColumnHeader title="RAISED BY" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => {
          const raisedBy = row.original.raisedBy || row.original.createdByName;
          const displayName = raisedBy != null && raisedBy !== '' ? String(raisedBy) : '';
          const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '?';
          return (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                {initials}
              </div>
              <span className="text-sm text-gray-700 truncate max-w-[130px]" title={displayName}>
                {displayName || '—'}
              </span>
            </div>
          );
        },
        size: 180,
      },
      {
        accessorKey: 'displayStatus',
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.displayStatus} />,
        size: 170,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => {
          const original = row.original;
          const isRejecting = rejectingId === original.id;

          if (original.stage === STAGE.PR_NO_PO) {
            return (
              <div className="flex gap-2 whitespace-nowrap">
                <Link to="/purchase/create-purchase-order-requests" state={{ ...original, isGeneratePo: true }}>
                  <button className="bg-[#084E92] text-white px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-[#063d73] transition">
                    Generate PO
                  </button>
                </Link>
              </div>
            );
          }

          if (original.group === 'DRAFT') {
            return (
              <div className="flex gap-2 whitespace-nowrap">
                <Link to={`/purchase/edit-purchase-order/${original.id}`} state={original}>
                  <button className="bg-[#084E92] text-white px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-[#063d73] transition">
                    Continue PO
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={() => openDeleteConfirm(original)}
                  className="border border-red-200 text-red-600 px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            );
          }

          return (
            <Link to={`/purchase/purchase-order-detail/${original.id}`} state={original}>
              <button className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-gray-50 transition">
                View
              </button>
            </Link>
          );
        },
        size: 180,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectingId]);

  const groupCounts = useMemo(() => {
    return {
      AWAITING_PO: prList.length,
      DRAFT: (poCache.DRAFT || []).length,
      PENDING_APPROVAL: (poCache.PENDING_APPROVAL || []).length,
      IN_PROGRESS: (poCache.IN_PROGRESS || []).length,
      APPROVED: (poCache.APPROVED || []).length,
      REJECTED: (poCache.REJECTED || []).length,
    };
  }, [prList, poCache]);

  const filteredRequests = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    let rows = combinedList;
    if (keyword) {
      rows = combinedList.filter((item) => {
        return (
          (item.prCode || '').toLowerCase().includes(keyword) ||
          (item.raisedBy || '').toLowerCase().includes(keyword) ||
          (item.createdByName || '').toLowerCase().includes(keyword) ||
          (item.poCode || '').toLowerCase().includes(keyword) ||
          (item.outlet || '').toLowerCase().includes(keyword)
        );
      });
    }
    return rows.slice().sort(sortByDateDesc);
  }, [combinedList, search]);

  const table = useReactTable({
    data: filteredRequests,
    columns,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const loading = prLoading || poLoading;
  const error = prError || poError;

  return (
    <Container>
      <div className="mx-auto py-10 p-6">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Purchase</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Purchase Order Requests</span>
        </div>

        <div className="flex justify-between items-center flex-col sm:flex-row gap-4 mb-2">
          <div>
            <h1 className="text-[28px] font-bold text-[#101828]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Purchase Order Requests
            </h1>
            <p className="text-[#667085] text-sm mt-1.5 max-w-xl">
              Review approved purchase requisitions and track purchase orders through generation and approval.
            </p>
          </div>

          <div className="flex gap-3 self-end sm:self-auto">
            <Link to="/purchase/create-purchase-order-requests">
              <button
                type="button"
                className="px-4 py-2 bg-[#084E92] text-white rounded-lg flex gap-2 items-center cursor-pointer hover:bg-[#073e76] transition"
              >
                <Plus size={16} />
                Create New PO
              </button>
            </Link>
          </div>
        </div>

        {scopeError && (
          <div className="mb-6 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-[#C0293D]">{scopeError}</span>
            <button onClick={retryScope} className="text-xs font-semibold text-[#C0293D] underline shrink-0">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 py-6">
          <StatCard
            icon={<ClipboardList size={18} />}
            iconBg="#EEF2FE"
            iconFg="#2952E3"
            label="Total Requests"
            value={combinedList.length}
          />
          <StatCard
            icon={<Package size={18} />}
            iconBg="#FDF1E3"
            iconFg="#B5590B"
            label="Awaiting PO"
            value={groupCounts.AWAITING_PO || 0}
          />
          <StatCard
            icon={<CircleCheck size={18} />}
            iconBg="#FEF6E7"
            iconFg="#B7791F"
            label="Draft"
            value={groupCounts.DRAFT || 0}
          />
          <StatCard
            icon={<CircleX size={18} />}
            iconBg="#EEF2FE"
            iconFg="#2952E3"
            label="Sent for Approval"
            value={groupCounts.PENDING_APPROVAL || 0}
          />
        </div>

        {/* Search + unit dropdown + status dropdown, aligned in one row */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PR Code, PO Code, or Raised By..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
            />
          </div>

          {showUnitDropdown && (
            <UnitDropdown units={units} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
          )}

          <MasterStatusDropdown value={activeGroup} onChange={setActiveGroup} />
        </div>

        {error && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 text-sm text-[#C0293D]">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadData}
              className="ml-auto font-semibold underline cursor-pointer bg-transparent border-0"
            >
              Retry
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
          {loading || scopeLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading purchase orders…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredRequests.length}
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

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        itemLabel={deleteTarget?.itemLabel}
        saving={deleteSaving}
        title="Delete Purchase Order"
      />
    </Container>
  );
};

export default PurchaseOrderRequest;