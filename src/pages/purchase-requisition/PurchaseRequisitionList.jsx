import React, { useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { Container } from "@/components/common/container";
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { Link, useNavigate } from 'react-router';
import { Container } from '@/components/common/container';

/* -------------------------------------------------------------------------
 * Shared style tokens & primitives
 * Kept in sync with the rest of the Purchase Requisition module (see
 * PurchaseRequisition.jsx / AddAsset.jsx) so every list screen matches.
 * ---------------------------------------------------------------------- */

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const SectionCard = ({ children, className = '' }) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}
  >
    {children}
  </div>
);

const Breadcrumb = ({ items }) => (
  <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
    {items.map((item, i) => (
      <span key={item} className="flex items-center gap-1.5">
        {i > 0 && <span className="text-gray-300">/</span>}
        <span
          className={i === items.length - 1 ? 'text-[#084E92] font-medium' : ''}
        >
          {item}
        </span>
      </span>
    ))}
  </nav>
);

const STATUS_STYLES = {
  Approved: 'bg-emerald-50 text-emerald-600',
  'Send for Approval': 'bg-amber-50 text-amber-600',
  'In Review': 'bg-blue-50 text-blue-600',
  Draft: 'bg-red-50 text-red-600',
};

const STATUS_DOT = {
  Approved: 'bg-emerald-500',
  'Send for Approval': 'bg-amber-500',
  'In Review': 'bg-blue-500',
  Draft: 'bg-red-500',
};

// Statuses a requisition can still be edited in; approved/pending ones are read-only.
const EDITABLE_STATUSES = new Set(['Draft', 'In Review']);

const StatusBadge = ({ status, size = 'md' }) => (
  <span
    className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${
      size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'
    } ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-500'}`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`}
    />
    {status}
  </span>
);

const IconButton = ({ icon: Icon, onClick, tone = 'default', title }) => {
  const toneCls =
    tone === 'danger'
      ? 'text-gray-400 hover:text-red-500'
      : tone === 'edit'
        ? 'text-gray-400 hover:text-blue-500'
        : 'text-gray-400 hover:text-green-600 ';
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer bg-transparent border-0 ${toneCls}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};

/* -------------------------------------------------------------------------
 * View details modal
 * Mirrors the "Purchase Requisition Details" design: header with doc icon
 * + close, PR number / status row, an Origin Details section, a notes
 * card, and a Print / Cancel / Download PDF footer.
 * ---------------------------------------------------------------------- */

const ViewRequisitionModal = ({ row, onClose }) => {
  if (!row) return null;

  const handlePrint = () => window.print();
  const handleDownloadPdf = () => {
    // TODO: wire to downloadPurchaseRequisitionPdf(row.id)
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-[#084E92] shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                Purchase Requisition Details
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5 tracking-wide">
                SUPER ADMIN MODULE · ERP 2026 VERSION 4.2
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition cursor-pointer bg-transparent border-0 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* PR Number / Status */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                PR Number
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {row.prCode}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                Status
              </p>
              <div className="mt-1">
                <StatusBadge status={row.status} size="sm" />
              </div>
            </div>
          </div>

          {/* Origin Details */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Origin Details
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 px-4 py-3">
                <p className="text-[11px] text-gray-400">Created Date</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {row.date}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 px-4 py-3">
                <p className="text-[11px] text-gray-400">Required Date</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {row.requiredDate}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 px-4 py-3 col-span-2">
                <p className="text-[11px] text-gray-400">Outlet/Branch</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {row.outlet}
                </p>
                {row.section && (
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
                    {row.section}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl bg-blue-50/50 border border-blue-100 px-4 py-3">
            <p className="text-[11px] font-semibold text-[#084E92] uppercase tracking-wide mb-1.5">
              Internal Requisition Notes
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {row.notes || row.remarks}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * Mock data — stand-in for the requisitions-list API in this demo.
 * ---------------------------------------------------------------------- */

const MOCK_REQUISITIONS = [
  {
    id: 'pr-1',
    prCode: 'PR-2024-001',
    date: 'Oct 12, 2023',
    requiredDate: 'Oct 25, 2023',
    outlet: 'South City Mall',
    section: 'Apparel Section',
    status: 'Approved',
    remarks: 'Quarterly inventory restock',
    notes:
      'This requisition is for the upcoming winter collection inventory replenishment. Pricing has been negotiated based on the master service agreement. All items meet the quality standards of Jaiswal Group retail division. Approval from the regional director is attached in the digital archive.',
  },
  {
    id: 'pr-2',
    prCode: 'PR-2024-002',
    date: 'Oct 14, 2023',
    requiredDate: 'Oct 25, 2023',
    outlet: 'Mumbai Airport Flagship',
    section: 'Electronics Section',
    status: 'Send for Approval',
    remarks: 'Urgent procurement for tec...',
    notes:
      'Urgent procurement for technical equipment ahead of the flagship relaunch. Vendor quotes are attached.',
  },
  {
    id: 'pr-3',
    prCode: 'PR-2024-003',
    date: 'Oct 15, 2023',
    requiredDate: 'Oct 25, 2023',
    outlet: 'Bangalore Tech Park Hub',
    section: 'Facilities Section',
    status: 'In Review',
    remarks: 'Office furniture replacemen...',
    notes:
      'Office furniture replacement for the second floor workspace remodel, pending facilities sign-off.',
  },
  {
    id: 'pr-4',
    prCode: 'PR-2024-004',
    date: 'Oct 18, 2023',
    requiredDate: 'Oct 25, 2023',
    outlet: 'Delhi Connaught Place Store',
    section: 'Admin Section',
    status: 'Draft',
    remarks: 'Stationery and housekeepi...',
    notes:
      'Stationery and housekeeping supplies for the monthly admin order, still pending final line items.',
  },
  {
    id: 'pr-5',
    prCode: 'PR-2024-005',
    date: 'Oct 20, 2023',
    requiredDate: 'Oct 25, 2023',
    outlet: 'Kolkata Head Office',
    section: 'IT Section',
    status: 'Approved',
    remarks: 'Annual IT hardware mainten...',
    notes:
      'Annual IT hardware maintenance contract renewal, approved as part of the FY24 budget cycle.',
  },
];

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------
 * Pagination — now driven by the real table state (page, pageCount, row
 * count) instead of a hardcoded total, same source of truth as the table
 * used in UserManagementList.
 * ---------------------------------------------------------------------- */

const Pagination = ({ page, totalPages, onChange }) => {
  // Compact page list: 1, 2, 3, ..., last (matches the design's "1 2 3 ... 5" pattern)
  const pages = useMemo(() => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const result = [1, 2, 3];
    if (page > 4 && page < totalPages - 1) result.push(page);
    result.push('ellipsis', totalPages);
    return [...new Set(result)];
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer bg-white"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span
            key={`e-${i}`}
            className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-semibold transition cursor-pointer border ${p === page
              ? 'bg-[#084E92] text-white border-[#084E92]'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer bg-white"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

const PurchaseRequisitionList = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState(MOCK_REQUISITIONS);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [viewingRow, setViewingRow] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.prCode.toLowerCase().includes(q) ||
        r.outlet.toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  // Columns are only used to drive the pagination row model here — the
  // table body below is still rendered with the existing custom markup,
  // same split UserManagementList uses between table state and table UI.
  const openDeleteConfirm = (item) => {
    setDeleteTarget({ id: item.id, itemLabel: item.name });
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
      closeDeleteConfirm();
      fetchMenuItems();
    } catch (err) {
      console.error(err);
      notify.error('Failed to delete menu item');
    } finally {
      setDeleteSaving(false);
    }
  };
  const columns = useMemo(
    () => [
      { id: 'prCode', accessorFn: (r) => r.prCode },
      { id: 'date', accessorFn: (r) => r.date },
      { id: 'requiredDate', accessorFn: (r) => r.requiredDate },
      { id: 'outlet', accessorFn: (r) => r.outlet },
      { id: 'status', accessorFn: (r) => r.status },
      { id: 'remarks', accessorFn: (r) => r.remarks },
    ],
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

  // Reset back to page 1 whenever the search narrows/widens the result set,
  // so you can't land on an out-of-range page.
  useMemo(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const pageRows = table.getRowModel().rows.map((r) => r.original);
  const pageCount = table.getPageCount();
  const currentPage = pagination.pageIndex + 1;
  const totalResults = filteredRows.length;
  const firstResultIndex =
    totalResults === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const lastResultIndex = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    totalResults,
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // TODO: wire to getPurchaseRequisitions({ page: currentPage, query: searchQuery })
      await new Promise((res) => setTimeout(res, 500));
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    // TODO: wire to exportPurchaseRequisitions({ query: searchQuery })
  };

  const handleDelete = (id) => {
    setRows((r) => r.filter((row) => row.id !== id));
    // TODO: wire to deletePurchaseRequisition(id)
  };

  return (
    <Container>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 min-h-screen pb-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Purchase</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">
            Purchase Requisition List
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap mt-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-4xl font-semibold">
              Purchase Requisition List
            </h1>
            <p className="text-[#43474F] mt-1 text-sm sm:text-base">
              View and manage all purchase requisitions across enterprise
              departments.
            </p>
          </div>
          <Link
            to="/purchase-requisition/add"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Purchase Requisition
          </Link>
        </div>

        <SectionCard className="mt-5">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 flex-wrap">
            <div className="relative flex-1 min-w-55">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PR Code, Outlet..."
                className={`${inputCls} pl-9`}
              />
            </div>

            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white shrink-0"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>

            <div className="flex items-center gap-2 ml-auto shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh"
                className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer bg-white"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                />
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-sm">
              <thead>
                <tr className="bg-gray-50/70 text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="text-left font-semibold px-4 sm:px-6 py-3">
                    PR Code
                  </th>
                  <th className="text-left font-semibold px-4 py-3">Date</th>
                  <th className="text-left font-semibold px-4 py-3">
                    Required Date
                  </th>
                  <th className="text-left font-semibold px-4 py-3">
                    Outlet Name
                  </th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-left font-semibold px-4 py-3">Remarks</th>
                  <th className="text-left font-semibold px-4 sm:px-6 py-3 w-28">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-gray-400"
                    >
                      No purchase requisitions match your search.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="px-4 sm:px-6 py-4 font-semibold text-[#084E92] whitespace-nowrap">
                        {row.prCode}
                      </td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {row.requiredDate}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-gray-700">{row.outlet}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-4 text-gray-500 max-w-55 truncate">
                        {row.remarks}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center">
                          <IconButton icon={Eye} title="View" onClick={() => setViewingRow(row)} />
                          {EDITABLE_STATUSES.has(row.status) && (
                            <IconButton
                              icon={Pencil}
                              tone="edit"
                              title="Edit"
                              onClick={() =>
                                navigate(`/purchase-requisition/edit/${row.id}`)
                              }
                            />
                          )}
                          <IconButton icon={Trash2} tone="danger" title="Delete" onClick={() => openDeleteConfirm(row)} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between flex-wrap gap-3 px-4 sm:px-6 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {totalResults === 0
                ? 'Showing 0 results'
                : `Showing ${firstResultIndex}-${lastResultIndex} of ${totalResults} results`}
            </p>
            <Pagination
              page={currentPage}
              totalPages={Math.max(pageCount, 1)}
              onChange={(p) =>
                setPagination((prev) => ({ ...prev, pageIndex: p - 1 }))
              }
            />
          </div>
        </SectionCard>

        <ViewRequisitionModal row={viewingRow} onClose={() => setViewingRow(null)} />

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
