// ============================================
// File: src/pages/purchase-order-requests/PurchaseOrderRequest.jsx
//
// Shows the full PO pipeline as tabs:
//
//   Awaiting PO       — PR approved, PO not yet generated (from the PR endpoint)
//   Draft             — PO saved but not yet sent           (rawStatus PENDING)
//   Sent for Approval — PO generated, awaiting approver      (rawStatus SENT_FOR_APPROVAL)
//   Approved          — approver has signed off, vendor fulfilling
//                        (rawStatus IN_PROGRESS or APPROVED — both read as "Approved" here)
//   Partially Received— some quantity has come in            (rawStatus PARTIALLY_RECEIVED)
//   Closed            — fully received / done                (rawStatus CLOSED)
//   Rejected          — approver rejected the PO              (rawStatus REJECTED)
//
// Two independent fetches, on purpose:
//  - Approved-PR fetch (Awaiting PO tab): status is always APPROVED and
//    doesn't depend on which PO tab is open, so it's fetched once per
//    outlet selection only — NOT on every tab switch.
//  - PO fetch: fires per active tab (rawStatus derived from GROUP_TO_STATUSES)
//    and results are cached per tab so switching tabs doesn't lose data
//    for tabs already visited this session.
// ============================================

import { useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronRight,
  ClipboardList,
  Package,
  CircleCheck,
  CircleX,
  Plus,
  Search,
} from 'lucide-react';
import { Link } from 'react-router';
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

// Reverse of PO_STATUS_GROUP: group key -> array of rawStatus values that
// belong to it. Built once from the existing status->group map so it never
// drifts out of sync with poStatus.js.
const GROUP_TO_STATUSES = Object.entries(PO_STATUS_GROUP).reduce((acc, [status, group]) => {
  (acc[group] = acc[group] || []).push(status);
  return acc;
}, {});

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
  'TO BE GENERATED': 'bg-gray-100 text-gray-600',
  Draft: 'bg-yellow-100 text-yellow-700',
  'Sent for Approval': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  Approved: 'bg-green-100 text-green-700',
  'Partially Received': 'bg-purple-100 text-purple-700',
  Closed: 'bg-gray-200 text-gray-700',
  Rejected: 'bg-red-100 text-red-700',
};

const StatusBadge = ({ status }) => (
  <span
    className={`px-3 py-1 rounded-full text-xs font-semibold ${
      STATUS_BADGE_STYLES[status] || 'bg-gray-100 text-gray-600'
    }`}
  >
    {(status || '').toUpperCase()}
  </span>
);

// Only rendered for GROUP / SUB_COMPANY — same dropdown used on the PR list page.
function UnitDropdown({ units, selectedUnitId, onChange }) {
  const options = units.map((u) => ({ value: u.id, label: u.name }));
  return (
    <div className="w-56 shrink-0">
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

// One tab per pipeline stage — no counts, just a clean segmented control.
// Active tab gets a filled pill instead of the old underline-only look.
function GroupTabs({ groups, active, onChange }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto bg-[#F8FAFC] border-b border-[#E2E8F0] px-2 py-2">
      {groups.map((g) => {
        const isActive = active === g.key;
        return (
          <button
            key={g.key}
            type="button"
            onClick={() => onChange(g.key)}
            className={`shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition cursor-pointer whitespace-nowrap ${
              isActive
                ? 'bg-white text-[#084E92] shadow-sm border border-[#E2E8F0]'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60 border border-transparent'
            }`}
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
}

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

  // Real POs — fetched per active tab (see the PO effect below) and
  // cached per tab so switching tabs doesn't lose data already fetched.
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
  const [activeGroup, setActiveGroup] = useState('AWAITING_PO');
  const [rejectingId, setRejectingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [poCache, setPoCache] = useState({});

  // Manual/full refresh (used by the error banner's Retry and after a
  // reject/delete action) — refetches both the PR-approved list and
  // whichever PO tab is currently active.
  const loadData = () => {
    if (!selectedUnitId) return;
    fetchApprovedRequestsByOutlet(selectedUnitId);
    if (activeGroup !== 'AWAITING_PO') {
      fetchByOutletandStatus(selectedUnitId, GROUP_TO_STATUSES[activeGroup] || []);
    }
  };

  // Fetch approved PRs once per outlet selection — this data only feeds
  // the Awaiting PO tab and never changes when switching to
  // Draft / Sent for Approval / etc., so it must NOT re-run on every tab
  // click.
  useEffect(() => {
    if (!selectedUnitId) return;
    fetchApprovedRequestsByOutlet(selectedUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnitId]);

  // Fetch POs for whichever tab is active.
  useEffect(() => {
    if (!selectedUnitId) return;
    if (activeGroup !== 'AWAITING_PO') {
      fetchByOutletandStatus(selectedUnitId, GROUP_TO_STATUSES[activeGroup] || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnitId, activeGroup]);

  // Cache whatever the hook just fetched under the group that was active
  // when the fetch was issued, so previously-visited tabs keep their data
  // after switching away.
  useEffect(() => {
    if (activeGroup === 'AWAITING_PO') return;
    setPoCache((prev) => ({ ...prev, [activeGroup]: poRawList }));
  }, [poRawList, activeGroup]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, activeGroup, selectedUnitId]);

  // Clear the per-tab cache whenever the outlet changes so stale data from
  // one outlet never leaks into another.
  useEffect(() => {
    setPoCache({});
  }, [selectedUnitId]);

  const handleReject = async (row) => {
    setRejectingId(row.id);
    try {
      await rejectRequest(row.id, { actionBy: getUsernameFromToken() });
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setRejectingId(null);
    }
  };

  // Only ever called on a DRAFT (PENDING) row — nothing has been sent to
  // an approver yet, so deleting it outright is safe. Once a PO moves to
  // Sent for Approval or beyond, this action isn't offered at all.
  const handleDelete = async (row) => {
    setDeletingId(row.id);
    try {
      await remove(row.id);
      setPoCache((prev) => ({
        ...prev,
        DRAFT: (prev.DRAFT || []).filter((p) => p.id !== row.id),
      }));
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  // ---- Merge the PR-awaiting-PO rows with every cached PO, tagging each
  // with which tab ("group") it belongs in ----
  const combinedList = useMemo(() => {
    const prRows = prList.map((r) => ({
      ...r,
      stage: STAGE.PR_NO_PO,
      group: 'AWAITING_PO',
      displayStatus: 'TO BE GENERATED',
    }));

    const poRows = Object.values(poCache)
      .flat()
      .map((p) => ({
        ...p,
        stage: STAGE.PO,
        group: PO_STATUS_GROUP[p.rawStatus] || 'DRAFT',
        displayStatus: getPoStatusLabel(p.rawStatus),
      }));

    return [...prRows, ...poRows];
  }, [prList, poCache]);

  const columns = [
    {
      accessorKey: 'prCode',
      header: ({ column }) => (
        <DataGridColumnHeader title="PR CODE" column={column} className="text-[#43474F] font-semibold" />
      ),
      size: 140,
    },
    {
      accessorKey: 'poCode',
      header: ({ column }) => (
        <DataGridColumnHeader title="PO CODE" column={column} className="text-[#43474F] font-semibold" />
      ),
      cell: ({ row }) =>
        row.original.poCode === 'TO BE GENERATED' ? (
          <span className="px-3 py-1 rounded-full bg-gray-100 text-xs">TO BE GENERATED</span>
        ) : (
          row.original.poCode
        ),
      size: 170,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <DataGridColumnHeader title="DATE" column={column} className="text-[#43474F] font-semibold" />
      ),
      size: 120,
    },
    {
      accessorKey: 'outlet',
      header: ({ column }) => (
        <DataGridColumnHeader title="OUTLET NAME" column={column} className="text-[#43474F] font-semibold" />
      ),
      cell: ({ row }) => <TruncatedCell value={row.original.outlet} widthClass="max-w-[190px] py-3" />,
    },
    {
      accessorKey: 'raisedBy',
      header: ({ column }) => (
        <DataGridColumnHeader title="RAISED BY" column={column} className="text-[#43474F] font-semibold" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
            {(row.original.raisedBy || '?').slice(0, 2).toUpperCase()}
          </div>
          {row.original.raisedBy}
        </div>
      ),
      size: 190,
    },
    {
      accessorKey: 'displayStatus',
      header: ({ column }) => (
        <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-semibold" />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.displayStatus} />,
      size: 130,
    },
    {
      id: 'actions',
      header: ({ column }) => (
        <DataGridColumnHeader title="ACTIONS" column={column} className="text-[#43474F] font-semibold py-6" />
      ),
      cell: ({ row }) => {
        const original = row.original;
        const isRejecting = rejectingId === original.id;

        if (original.group === 'AWAITING_PO') {
          return (
            <div className="flex gap-2">
              <Link to="/purchase/create-purchase-order-requests" state={original}>
                <button className="bg-[#084E92] text-white px-4 py-1 rounded-lg text-xs cursor-pointer">
                  Generate PO
                </button>
              </Link>
              <button
                type="button"
                disabled={isRejecting}
                onClick={() => handleReject(original)}
                className="border px-4 py-1 rounded-lg text-xs cursor-pointer disabled:opacity-50"
              >
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          );
        }

        if (original.group === 'DRAFT') {
          const isDeleting = deletingId === original.id;
          return (
            <div className="flex gap-2">
              <Link to={`/purchase/edit-purchase-order/${original.id}`} state={original}>
                <button className="bg-[#084E92] text-white px-4 py-1 rounded-lg text-xs cursor-pointer">
                  Continue PO
                </button>
              </Link>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(original)}
                className="border border-red-200 text-red-600 px-4 py-1 rounded-lg text-xs cursor-pointer disabled:opacity-50 hover:bg-red-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          );
        }

        if (original.group === 'PENDING_APPROVAL') {
          // The requester who generated this PO has no approval rights —
          // approve/reject only happens on the Purchase Order Approval
          // screen. View-only here.
          return (
            <Link to={`/purchase/purchase-order-detail/${original.id}`} state={original}>
              <button className="border px-4 py-1 rounded-lg text-xs cursor-pointer">View</button>
            </Link>
          );
        }

        // APPROVED / RECEIVING / CLOSED / REJECTED — read-only from this
        // list; receiving progress, rejection reason, etc. live on the
        // detail page.
        return (
          <Link to={`/purchase/purchase-order-detail/${original.id}`} state={original}>
            <button className="border px-4 py-1 rounded-lg text-xs cursor-pointer">View</button>
          </Link>
        );
      },
      size: 230,
    },
  ];

  // ---- Stats above the table still show counts (dashboard summary) —
  // just the tab bar itself no longer does. ----
  const groupCounts = useMemo(() => {
    return combinedList.reduce((acc, item) => {
      acc[item.group] = (acc[item.group] || 0) + 1;
      return acc;
    }, {});
  }, [combinedList]);

  const filteredRequests = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return combinedList
      .filter((item) => item.group === activeGroup)
      .filter((item) => {
        if (!keyword) return true;
        return (
          (item.prCode || '').toLowerCase().includes(keyword) ||
          (item.raisedBy || '').toLowerCase().includes(keyword) ||
          (item.poCode || '').toLowerCase().includes(keyword)
        );
      });
  }, [combinedList, search, activeGroup]);

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

  const STATS = [
    {
      title: 'Total Requests',
      value: String(combinedList.length),
      icon: <ClipboardList size={22} className="text-blue-600 p-1 bg-blue-100 rounded" />,
    },
    {
      title: 'Awaiting PO',
      value: String(groupCounts.AWAITING_PO || 0),
      icon: <Package size={22} className="text-orange-500 p-1 bg-orange-100 rounded" />,
    },
    {
      title: 'Draft',
      value: String(groupCounts.DRAFT || 0),
      icon: <CircleCheck size={22} className="text-yellow-600 p-1 bg-yellow-100 rounded" />,
    },
    {
      title: 'Sent for Approval',
      value: String(groupCounts.PENDING_APPROVAL || 0),
      icon: <CircleX size={22} className="text-blue-500 p-1 bg-blue-100 rounded" />,
    },
  ];

  const loading = prLoading || poLoading;
  const error = prError || poError;

  return (
    <Container>
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Purchase</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Purchase Order Requests</span>
        </div>

        <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">Purchase Order Requests</h1>
            <p className="text-[#737781] mt-1 md:w-[90%]">
              Review approved purchase requisitions and track purchase orders through generation and approval.
            </p>
          </div>

          <div className="flex gap-3 self-end">
            <Link to="/purchase/create-purchase-order">
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
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 flex items-center justify-between">
            {scopeError}
            <button onClick={retryScope} className="text-xs font-semibold underline shrink-0 ml-3">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 py-8 text-[#43474F]">
          {STATS.map((item) => (
            <div key={item.title} className="border border-[#C3C6D1] rounded-2xl p-4">
              <div className="flex justify-between items-center pb-2">
                <p>{item.icon}</p>
              </div>
              <h1 className="text-sm text-[#43474F]">{item.title}</h1>
              <h2 className="text-xl font-bold">{item.value}</h2>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="relative pr-4 py-2 border border-[#C3C6D1] rounded-lg w-full">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by PR Code, PO Code, or Raised By..."
                className="w-full pl-10 outline-none"
              />
            </div>

            {showUnitDropdown && (
              <UnitDropdown units={units} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              type="button"
              onClick={loadData}
              className="ml-auto font-semibold underline cursor-pointer bg-transparent border-0"
            >
              Retry
            </button>
          </div>
        )}

        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden">
          {!selectedUnitId ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">
              Select an outlet to view purchase order requests.
            </div>
          ) : loading || scopeLoading ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">
              Loading purchase orders...
            </div>
          ) : (
            <>
              <GroupTabs groups={PO_GROUPS} active={activeGroup} onChange={setActiveGroup} />
              {filteredRequests.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm text-gray-400">
                  Nothing in this stage right now.
                </div>
              ) : (
                <DataGrid table={table} recordCount={filteredRequests.length} className="rounded-b-2xl">
                  <Card className="rounded-none border-t-0 rounded-b-2xl">
                    <CardTable>
                      <ScrollArea>
                        <DataGridTable />
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </CardTable>

                    <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
                      <DataGridPagination />
                    </CardFooter>
                  </Card>
                </DataGrid>
              )}
            </>
          )}
        </div>
      </div>
    </Container>
  );
};

export default PurchaseOrderRequest;