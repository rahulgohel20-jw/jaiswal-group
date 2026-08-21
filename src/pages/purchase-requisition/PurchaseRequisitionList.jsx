// ============================================
// File: src/pages/PurchaseRequisitionList.jsx
// ============================================

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Container } from '@/components/common/container';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import SearchableSelect from '@/utils/searchableSelect';
import { getPurchaseRequisitionsByOutlet, deletePurchaseRequisition } from '@/services/apiServices';
import { useOrgScope } from '@/hooks/useOrgScope';
import { OrgTypes } from '@/constants/orgTypes';
import { PR_STATUS, PR_STATUS_LIST, EDITABLE_STATUSES, getStatusLabel } from './utils/prStatus';
import { getUserIdFromToken } from '../../utils/auth';

/* -------------------------------------------------------------------------
 * Shared style tokens & primitives (unchanged)
 * ---------------------------------------------------------------------- */

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const STATUS_STYLES = {
  Pending: 'bg-red-50 text-red-600',
  'Sent for Approval': 'bg-amber-50 text-amber-600',
  'In Progress': 'bg-blue-50 text-blue-600',
  Approved: 'bg-emerald-50 text-emerald-600',
  Rejected: 'bg-rose-50 text-rose-600',
  Cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_DOT = {
  Pending: 'bg-red-500',
  'Sent for Approval': 'bg-amber-500',
  'In Progress': 'bg-blue-500',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-rose-500',
  Cancelled: 'bg-gray-400',
};

const StatusBadge = ({ status, size = 'md' }) => (
  <span
    className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${
      size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'
    } ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-500'}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`} />
    {status}
  </span>
);

// Truncates long text within a fixed-width box, revealing the full value on hover
// (mirrors TruncatedCell from UserManagementList.jsx)
const TruncatedCell = ({
  value,
  widthClass = 'max-w-[180px]',
  className = 'text-gray-600',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

// Only rendered for GROUP / SUB_COMPANY — mirrors the approval screen's dropdown,
// now searchable so a long outlet list can be typed/filtered.
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

const PAGE_SIZE = 10;

// Normalizes a raw PR record from getPurchaseRequisitionsByOutlet into the
// row shape this page's table/modal expect (mirrors normalizePr from
// usePurchaseRequisitions.js, kept local since this fetch bypasses that hook).
const normalizeRow = (pr) => ({
  id: pr.id,
  prCode: pr.prCode,
  date: pr.prDate,
  requiredDate: pr.prRequiredDate,
  outlet: pr.outletName ?? '',
  outletId: pr.outletId,
  status: getStatusLabel(pr.status),
  rawStatus: pr.status,
  remarks: pr.remarks ?? '',
  notes: pr.remarks ?? '',
  details: pr.details ?? [],
  createdBy: pr.createdBy,
  createdAt: pr.createdAt,
  updatedBy: pr.updatedBy,
  updatedAt: pr.updatedAt,
});

/* -------------------------------------------------------------------------
 * Main page — scoped to the logged-in user's org (GROUP/SUB_COMPANY get an
 * outlet dropdown, OUTLET users only ever see their own outlet's PRs).
 * Fetches by outlet (not by status) since that's the only way to scope the
 * request; status filter is then applied client-side.
 *
 * Table + pagination follow the same DataGrid/DataGridPagination pattern
 * used in UserManagementList.jsx.
 * ---------------------------------------------------------------------- */

const PurchaseRequisitionList = () => {
  const navigate = useNavigate();

  const {
    loading: scopeLoading,
    error: scopeError,
    orgType,
    units,
    selectedUnitId,
    setSelectedUnitId,
    retry: retryScope,
  } = useOrgScope();

  const showUnitDropdown = orgType === OrgTypes.GROUP || orgType === OrgTypes.SUB_COMPANY;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prError, setPrError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(PR_STATUS.PENDING); // default: Pending
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedUnitId) {
      setList([]);
      return;
    }
    setLoading(true);
    setPrError(null);
    try {
      const res = await getPurchaseRequisitionsByOutlet(selectedUnitId, statusFilter);
      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const rows = Array.isArray(raw) ? raw.map(normalizeRow) : [];
      setList(rows);
    } catch (err) {
      setPrError(err?.message || 'Failed to load purchase requisitions.');
    } finally {
      setLoading(false);
    }
  }, [selectedUnitId, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await deletePurchaseRequisition(deleteTarget.id, getUserIdFromToken());
      closeDeleteConfirm();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteSaving(false);
    }
  };

  const openDeleteConfirm = (item) => {
    setDeleteTarget({ id: item.id, itemLabel: item.prCode, actionBy: item.createdBy });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteSaving) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const filteredRows = useMemo(() => {
    let rows = list.filter((r) => r.rawStatus === statusFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) => r.prCode.toLowerCase().includes(q) || r.outlet.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [list, statusFilter, searchQuery]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [searchQuery, statusFilter, selectedUnitId]);

  const handleView = (row) => navigate(`/purchase-requisition/view/${row.id}`);
  const handleEdit = (row) => navigate(`/purchase-requisition/edit/${row.id}`);

  const columns = useMemo(
    () => [
      {
        id: 'prCode',
        accessorFn: (row) => row.prCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="PR CODE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-[#084E92]">{row.original.prCode}</span>
        ),
        size: 140,
      },
      {
        id: 'date',
        accessorFn: (row) => row.date,
        header: ({ column }) => (
          <DataGridColumnHeader title="DATE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.date} widthClass="max-w-[120px]" />,
        size: 130,
      },
      {
        id: 'requiredDate',
        accessorFn: (row) => row.requiredDate,
        header: ({ column }) => (
          <DataGridColumnHeader title="REQUIRED DATE" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.requiredDate} widthClass="max-w-[130px]" />
        ),
        size: 140,
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
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        size: 160,
      },
      {
        id: 'action',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs" />
        ),
        cell: ({ row }) => {
          const original = row.original;
          return (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <button
                type="button"
                onClick={() => handleView(original)}
                className="text-gray-500 hover:text-green-600 cursor-pointer"
                title="View"
              >
                <Eye size={18} />
              </button>
              {EDITABLE_STATUSES.has(original.rawStatus) && (
                <button
                  type="button"
                  onClick={() => handleEdit(original)}
                  className="text-gray-500 hover:text-blue-600 cursor-pointer"
                  title="Edit"
                >
                  <Pencil size={18} />
                </button>
              )}
              {original.rawStatus === PR_STATUS.PENDING && (
                <button
                  type="button"
                  onClick={() => openDeleteConfirm(original)}
                  className="text-red-300 hover:text-red-600 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 110,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Container>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 min-h-screen pb-10">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Purchase</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">Purchase Requisition List</span>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap mt-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-4xl font-semibold">Purchase Requisition List</h1>
            <p className="text-[#43474F] mt-1 text-sm sm:text-base">
              View and manage all purchase requisitions across enterprise departments.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/purchase-requisition/add"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition"
            >
              <Plus className="w-4 h-4" />
              Create Purchase Requisition
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

        <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col gap-4 mt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-55 border border-[#C3C6D1] rounded-lg">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PR Code, Outlet..."
                className="w-full pl-10 pr-3 py-2.5 outline-none rounded-lg text-sm"
              />
            </div>

            {showUnitDropdown && (
              <UnitDropdown units={units} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
            )}

            <div className="w-48 shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={inputCls}
              >
                {PR_STATUS_LIST.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {prError && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {prError}
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
          {loading || scopeLoading ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">
              Loading purchase requisitions...
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredRows.length}
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
                <CardFooter className="bg-[#F9F9FF] rounded-b-2xl">
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </DataGrid>
          )}
        </div>  

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={closeDeleteConfirm}
          onConfirm={confirmDelete}
          itemLabel={deleteTarget?.itemLabel}
          saving={deleteSaving}
        />
      </div>
    </Container>
  );
};

export default PurchaseRequisitionList;