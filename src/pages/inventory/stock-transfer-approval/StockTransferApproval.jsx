import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Search,
  Eye,
  Pencil,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  Loader2,
  AlertTriangle,
  ArrowLeftRight,
  Clock,
  CheckCheck,
  Ban,
  FileCheck2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import SearchableSelect from '@/utils/SearchableSelect';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { useOrgScope } from '@/hooks/useOrgScope';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { CodeCell } from '@/components/common/CodeCell';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import {
  getTransferList,
  approveTransfer,
  rejectTransfer,
  deleteDraftTransfer,
  getAllSubOutlets,
  getOrganizationByType,
} from '@/services/apiServices';
import { getUserIdFromToken } from '@/utils/auth';
import { OrgTypes } from '@/constants/orgTypes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

/* -------------------------------------------------------------------------
 * Status Styling Tokens (DRAFT, APPROVED, IN_TRANSIT, REJECTED, CLOSED)
 * ---------------------------------------------------------------------- */
const STATUS_STYLES = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  Draft: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IN_TRANSIT: 'bg-blue-50 text-blue-700 border-blue-200',
  'In Transit': 'bg-blue-50 text-blue-700 border-blue-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  CLOSED: 'bg-gray-100 text-gray-700 border-gray-200',
  Closed: 'bg-gray-100 text-gray-700 border-gray-200',
  RECEIVED: 'bg-gray-100 text-gray-700 border-gray-200',
  Received: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_DOT = {
  DRAFT: 'bg-amber-500',
  Draft: 'bg-amber-500',
  PENDING: 'bg-amber-500',
  Pending: 'bg-amber-500',
  APPROVED: 'bg-emerald-500',
  Approved: 'bg-emerald-500',
  IN_TRANSIT: 'bg-blue-500',
  'In Transit': 'bg-blue-500',
  REJECTED: 'bg-rose-500',
  Rejected: 'bg-rose-500',
  CLOSED: 'bg-gray-400',
  Closed: 'bg-gray-400',
  RECEIVED: 'bg-gray-400',
  Received: 'bg-gray-400',
};

const formatStatusLabel = (status) => {
  if (!status) return 'Draft';
  const s = String(status).toUpperCase().replace(/[\s_]/g, '');
  if (s === 'DRAFT' || s === 'PENDING' || s === 'SENTFORAPPROVAL' || s === 'PENDINGAPPROVAL') return 'Draft';
  if (s === 'APPROVED') return 'Approved';
  if (s === 'INTRANSIT') return 'In Transit';
  if (s === 'REJECTED') return 'Rejected';
  if (s === 'CLOSED' || s === 'RECEIVED' || s === 'RECIEVED') return 'Closed';
  return status;
};

const StatusBadge = ({ status = 'Draft' }) => {
  const label = formatStatusLabel(status);
  const key = String(status).toUpperCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
        STATUS_STYLES[key] || STATUS_STYLES[status] || 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[key] || STATUS_DOT[status] || 'bg-amber-500'}`} />
      {label}
    </span>
  );
};

const TruncatedCell = ({ value, widthClass = 'max-w-[170px]', className = 'text-gray-700' }) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value || '—'}
  </span>
);

function StatCard({ label, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        <Icon size={18} />
      </div>
      <div className="flex flex-col items-end text-right">
        <span className="text-xs font-semibold text-[#00376C]">{label}</span>
        <span className="text-lg sm:text-xl font-bold text-[#1B1B1F] mt-0.5">{value}</span>
      </div>
    </div>
  );
}

function StatusDropdown({ value, onChange }) {
  const options = [
    { value: 'ALL', label: 'All Status' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'IN_TRANSIT', label: 'In Transit' },
    { value: 'CLOSED', label: 'Closed' },
  ];

  return (
    <div className="relative w-full">
      <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full pl-8 pr-7 rounded-xl border border-[#E7EAF0] bg-white text-xs font-semibold text-[#101828] appearance-none focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const PAGE_SIZE = 10;

/* Date timestamp parser for accurate ascending/descending date sorting */
const parseDateToTimestamp = (dateStr) => {
  if (!dateStr || dateStr === '—') return 0;
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
    const parts = dateStr.split('/');
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime() || 0;
  }
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? 0 : t;
};

const StockTransferApproval = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('DRAFT');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [sorting, setSorting] = useState([]);

  // Modals state
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [targetApproveTransfer, setTargetApproveTransfer] = useState(null);
  const [approving, setApproving] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRejectTransfer, setTargetRejectTransfer] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Delete draft modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteTransfer, setTargetDeleteTransfer] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Outlets, Sub-units & Filter states
  const [allOutlets, setAllOutlets] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [selectedFromOutletId, setSelectedFromOutletId] = useState('');
  const [selectedFromSubOutletId, setSelectedFromSubOutletId] = useState('');
  const [selectedToOutletId, setSelectedToOutletId] = useState('');
  const [selectedToSubOutletId, setSelectedToSubOutletId] = useState('');

  // Permissions hook
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions([
    'STR Approval',
    'Stock Transfer Approval',
    'Stock Transfer Request',
    'Stock Transfer',
  ]);

  // Scope hooks
  const {
    loading: scopeLoading,
    error: scopeError,
    retry: retryScope,
    isOutletUser,
    isCompanyUser,
    units,
    selectedUnitId,
    effectiveOutletId,
  } = useOrgScope();

  // Load All Outlets
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const res = await getOrganizationByType(OrgTypes.OUTLET);
        const list = res?.data?.data || res?.data?.content || res?.data || [];
        const mapped = (Array.isArray(list) ? list : []).map((o) => ({
          id: o.id,
          name: o.companyNameEnglish || o.name || `Outlet #${o.id}`,
          code: o.companyCode || o.code || '',
        }));
        setAllOutlets(mapped);
      } catch (err) {
        console.error('Failed to load outlets in StockTransferApproval:', err);
      }
    };
    fetchOutlets();
  }, []);

  // Fetch Sub-units
  useEffect(() => {
    const loadSubUnits = async () => {
      try {
        const res = await getAllSubOutlets();
        const raw = res?.data?.data || res?.data || [];
        setSubUnits(Array.isArray(raw) ? raw : []);
      } catch (err) {
        console.error('Failed to load sub-units in StockTransferApproval:', err);
      }
    };
    loadSubUnits();
  }, []);

  // Available outlets for dropdowns
  const displayOutletOptions = useMemo(() => {
    if (isCompanyUser || isOutletUser) {
      return units.map((u) => ({ value: String(u.id), label: `${u.name}${u.code ? ` (${u.code})` : ''}` }));
    }
    if (units.length > 0) {
      return units.map((u) => ({ value: String(u.id), label: `${u.name}${u.code ? ` (${u.code})` : ''}` }));
    }
    return allOutlets.map((o) => ({ value: String(o.id), label: `${o.name}${o.code ? ` (${o.code})` : ''}` }));
  }, [isCompanyUser, isOutletUser, units, allOutlets]);

  const toOutletOptions = useMemo(() => {
    return displayOutletOptions.filter(
      (opt) => !isOutletUser || (effectiveOutletId && String(opt.value) !== String(effectiveOutletId))
    );
  }, [displayOutletOptions, isOutletUser, effectiveOutletId]);

  // From Sub-outlet options
  const fromSubOutletOptions = useMemo(() => {
    const targetId = isOutletUser ? effectiveOutletId : selectedFromOutletId;
    if (!targetId) return [];
    return subUnits
      .filter((s) => String(s.organizationId) === String(targetId))
      .map((s) => ({
        value: String(s.id),
        label: s.subOutletName || s.name || `Sub-Outlet #${s.id}`,
      }));
  }, [subUnits, isOutletUser, effectiveOutletId, selectedFromOutletId]);

  // To Sub-outlet options
  const toSubOutletOptions = useMemo(() => {
    if (!selectedToOutletId) return [];
    return subUnits
      .filter((s) => String(s.organizationId) === String(selectedToOutletId))
      .map((s) => ({
        value: String(s.id),
        label: s.subOutletName || s.name || `Sub-Outlet #${s.id}`,
      }));
  }, [subUnits, selectedToOutletId]);

  // Fetch Transfers from API
  const fetchTransfers = useCallback(async () => {
    if (scopeLoading || scopeError) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (isOutletUser && effectiveOutletId) {
        params.fromOrganizationId = Number(effectiveOutletId);
      } else if (selectedFromOutletId) {
        params.fromOrganizationId = Number(selectedFromOutletId);
      } else if (selectedUnitId) {
        params.fromOrganizationId = Number(selectedUnitId);
      }

      if (statusFilter && statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const res = await getTransferList(params);
      const rawList = res?.data?.data || res?.data?.content || res?.data || [];
      const list = Array.isArray(rawList) ? rawList : [];

      const normalized = list.map((item) => {
        const itemsArr = Array.isArray(item.items)
          ? item.items
          : Array.isArray(item.transferItems)
          ? item.transferItems
          : Array.isArray(item.details)
          ? item.details
          : [];

        const totalReqQty = itemsArr.reduce(
          (acc, it) => acc + Number(it.requestedQuantity ?? it.transferQty ?? it.quantity ?? 0),
          0
        );

        return {
          id: item.id,
          transferCode: item.transferCode || item.code || `TRF-${String(item.id).padStart(4, '0')}`,
          fromOrganizationId: item.fromOrganizationId || item.fromOutletId,
          fromSubOutletId: item.fromSubOutletId || null,
          fromOutlet: item.fromOrganizationName || item.fromOutletName || item.fromOutlet || '—',
          fromSubOutlet:
            item.fromSubOutletId && item.fromSubOutletName && item.fromSubOutletName !== 'Main Store'
              ? item.fromSubOutletName
              : !item.fromSubOutletId
              ? ''
              : item.fromSubOutletName || item.fromSubOutlet || '',
          toOrganizationId: item.toOrganizationId || item.toOutletId,
          toSubOutletId: item.toSubOutletId || null,
          toOutlet: item.toOrganizationName || item.toOutletName || item.toOutlet || '—',
          toSubOutlet:
            item.toSubOutletId && item.toSubOutletName && item.toSubOutletName !== 'Main Store'
              ? item.toSubOutletName
              : !item.toSubOutletId
              ? ''
              : item.toSubOutletName || item.toSubOutlet || '',
          status: item.status || (item.isDraft ? 'Draft' : 'Draft'),
          isDraft: Boolean(item.isDraft),
          transferDate: item.transferDate || item.createdAt || '—',
          createdAt: item.createdAt || item.transferDate || '—',
          vehicleNumber: item.vehicleNumber || '—',
          driverName: item.driverName || '—',
          driverContact: item.driverContact || '—',
          itemsCount: itemsArr.length || 1,
          primaryItemName: itemsArr[0]?.itemName || itemsArr[0]?.rawMaterialName || 'Multiple Items',
          primaryItemId: itemsArr[0]?.itemId || itemsArr[0]?.rawMaterialId || itemsArr[0]?.id,
          transferItemId: itemsArr[0]?.id || itemsArr[0]?.transferItemId,
          totalRequestedQuantity: totalReqQty || item.totalQuantity || item.transferQuantity || 0,
          unit: itemsArr[0]?.unitName || itemsArr[0]?.unitSymbol || itemsArr[0]?.unit || 'Units',
          raw: item,
        };
      });

      setTransfers(normalized);
    } catch (err) {
      console.error('Failed to fetch stock transfers in approval:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load stock transfer requests');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [scopeLoading, scopeError, isOutletUser, effectiveOutletId, selectedFromOutletId, selectedUnitId, statusFilter]);

  useEffect(() => {
    if (!scopeLoading && !scopeError) {
      fetchTransfers();
    }
  }, [fetchTransfers, scopeLoading, scopeError]);

  // Counts for stat cards
  const stats = useMemo(() => {
    const total = transfers.length;
    const drafts = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'DRAFT' || s === 'PENDING' || s === 'SENTFORAPPROVAL' || s === 'PENDINGAPPROVAL' || Boolean(t.isDraft);
    }).length;
    const approved = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'APPROVED';
    }).length;
    const rejected = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'REJECTED';
    }).length;
    return { total, drafts, approved, rejected };
  }, [transfers]);

  // Filtered rows
  const filteredTransfers = useMemo(() => {
    let rows = transfers;

    // 1. Outlet user locked to From Outlet
    if (isOutletUser && effectiveOutletId) {
      rows = rows.filter(
        (r) => !r.fromOrganizationId || Number(r.fromOrganizationId) === Number(effectiveOutletId)
      );
    } else if (selectedFromOutletId) {
      rows = rows.filter(
        (r) => !r.fromOrganizationId || Number(r.fromOrganizationId) === Number(selectedFromOutletId)
      );
    } else if (selectedUnitId) {
      rows = rows.filter(
        (r) => !r.fromOrganizationId || Number(r.fromOrganizationId) === Number(selectedUnitId)
      );
    }

    // 2. From Sub-Outlet filter
    if (selectedFromSubOutletId) {
      rows = rows.filter(
        (r) =>
          String(r.fromSubOutletId) === String(selectedFromSubOutletId) ||
          r.raw?.fromSubOutletId === Number(selectedFromSubOutletId)
      );
    }

    // 3. To Outlet filter
    if (selectedToOutletId) {
      rows = rows.filter(
        (r) => !r.toOrganizationId || Number(r.toOrganizationId) === Number(selectedToOutletId)
      );
    }

    // 4. To Sub-Outlet filter
    if (selectedToSubOutletId) {
      rows = rows.filter(
        (r) =>
          String(r.toSubOutletId) === String(selectedToSubOutletId) ||
          r.raw?.toSubOutletId === Number(selectedToSubOutletId)
      );
    }

    // 5. Status filter
    if (statusFilter !== 'ALL') {
      const target = statusFilter.toUpperCase().replace(/[\s_]/g, '');
      rows = rows.filter((r) => {
        const itemStatus = String(r.status || '').toUpperCase().replace(/[\s_]/g, '');
        if (target === 'DRAFT') {
          return itemStatus === 'DRAFT' || itemStatus === 'PENDING' || itemStatus === 'SENTFORAPPROVAL' || itemStatus === 'PENDINGAPPROVAL' || Boolean(r.isDraft);
        }
        if (target === 'APPROVED') {
          return itemStatus === 'APPROVED';
        }
        if (target === 'REJECTED') {
          return itemStatus === 'REJECTED';
        }
        if (target === 'INTRANSIT') {
          return itemStatus === 'INTRANSIT';
        }
        if (target === 'CLOSED') {
          return itemStatus === 'CLOSED' || itemStatus === 'RECEIVED' || itemStatus === 'RECIEVED';
        }
        return itemStatus === target;
      });
    }

    // 6. Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.transferCode?.toLowerCase().includes(q) ||
          r.fromOutlet?.toLowerCase().includes(q) ||
          r.toOutlet?.toLowerCase().includes(q) ||
          r.primaryItemName?.toLowerCase().includes(q) ||
          r.vehicleNumber?.toLowerCase().includes(q) ||
          r.driverName?.toLowerCase().includes(q)
      );
    }

    return rows;
  }, [
    transfers,
    isOutletUser,
    effectiveOutletId,
    selectedFromOutletId,
    selectedFromSubOutletId,
    selectedToOutletId,
    selectedToSubOutletId,
    selectedUnitId,
    statusFilter,
    search,
  ]);

  // Actions
  const handleEdit = (row) => {
    navigate(`/inventory/stock-transfer-request?id=${row.id}&mode=edit`, { state: row.raw || row });
  };

  const handleDispatch = (row) => {
    navigate(`/inventory/stock-transfer-request?id=${row.id}&mode=dispatch`, { state: row.raw || row });
  };

  const handleView = (row) => {
    navigate(`/inventory/stock-transfer-detail/${row.id}`, { state: row.raw || row });
  };

  const handleOpenApproveModal = (row) => {
    setTargetApproveTransfer(row);
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!targetApproveTransfer?.id) return;
    setApproving(true);
    try {
      const currentUserId = getUserIdFromToken() || (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null);
      await approveTransfer(targetApproveTransfer.id, currentUserId);
      toast.success(`Stock transfer ${targetApproveTransfer.transferCode} approved successfully`);
      setApproveModalOpen(false);
      setTargetApproveTransfer(null);
      fetchTransfers();
    } catch (err) {
      console.error('Failed to approve stock transfer:', err);
      const errMsg = err?.response?.data?.message || err?.response?.data?.msg || 'Failed to approve stock transfer';
      toast.error(errMsg);
    } finally {
      setApproving(false);
    }
  };

  const handleOpenRejectModal = (row) => {
    setTargetRejectTransfer(row);
    setRejectReason('');
    setRejectError('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!targetRejectTransfer?.id) return;
    if (!rejectReason.trim()) {
      setRejectError('Please enter a mandatory reason for rejecting this transfer request.');
      return;
    }
    setRejectError('');
    setRejecting(true);
    try {
      const currentUserId = getUserIdFromToken() || (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null);
      const payload = {
        id: Number(targetRejectTransfer.id),
        reason: rejectReason.trim(),
        userId: currentUserId ? Number(currentUserId) : undefined,
      };
      await rejectTransfer(targetRejectTransfer.id, payload);
      toast.success(`Stock transfer ${targetRejectTransfer.transferCode} rejected successfully`);
      setRejectModalOpen(false);
      setTargetRejectTransfer(null);
      fetchTransfers();
    } catch (err) {
      console.error('Failed to reject stock transfer:', err);
      const errMsg = err?.response?.data?.message || err?.response?.data?.msg || 'Failed to reject stock transfer';
      toast.error(errMsg);
    } finally {
      setRejecting(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!targetDeleteTransfer?.id) return;
    setDeleting(true);
    try {
      await deleteDraftTransfer(targetDeleteTransfer.id);
      toast.success('Draft transfer request deleted successfully');
      setDeleteModalOpen(false);
      setTargetDeleteTransfer(null);
      fetchTransfers();
    } catch (err) {
      console.error('Failed to delete draft transfer:', err);
      const errMsg = err?.response?.data?.message || err?.response?.data?.msg || 'Failed to delete draft transfer';
      toast.error(errMsg);
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'transferCode',
        accessorFn: (row) => row.transferCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="TRANSFER CODE" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <CodeCell
            code={row.original.transferCode}
            maxWidth="max-w-[190px]"
            onClick={() => navigate(`/inventory/stock-transfer-detail/${row.original.id}`)}
          />
        ),
        enableSorting: false,
        size: 195,
        minSize: 180,
      },
      {
        id: 'dateAndTime',
        accessorFn: (row) => row.transferDate,
        sortingFn: (rowA, rowB, columnId) => {
          const valA = parseDateToTimestamp(rowA.getValue(columnId) || rowA.original.createdAt);
          const valB = parseDateToTimestamp(rowB.getValue(columnId) || rowB.original.createdAt);
          return valA - valB;
        },
        header: ({ column }) => (
          <DataGridColumnHeader title="DATE & TIME" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.transferDate} widthClass="max-w-[120px]" />,
        size: 125,
      },
      {
        id: 'fromOutlet',
        accessorFn: (row) => row.fromOutlet,
        header: ({ column }) => (
          <DataGridColumnHeader title="FROM OUTLET" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-gray-900">{row.original.fromOutlet}</div>
            {row.original.fromSubOutlet && (
              <div className="text-[11px] text-gray-400 font-medium">{row.original.fromSubOutlet}</div>
            )}
          </div>
        ),
        size: 160,
      },
      {
        id: 'toOutlet',
        accessorFn: (row) => row.toOutlet,
        header: ({ column }) => (
          <DataGridColumnHeader title="TO OUTLET" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-xs text-gray-900">{row.original.toOutlet}</div>
            {row.original.toSubOutlet && (
              <div className="text-[11px] text-gray-400 font-medium">{row.original.toSubOutlet}</div>
            )}
          </div>
        ),
        size: 160,
      },
      {
        id: 'items',
        accessorFn: (row) => row.primaryItemName,
        header: ({ column }) => (
          <DataGridColumnHeader title="ITEMS" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-gray-800 truncate max-w-[130px]">
              {row.original.primaryItemName}
            </span>
            {row.original.itemsCount > 1 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                +{row.original.itemsCount - 1}
              </span>
            )}
          </div>
        ),
        enableSorting: false,
        size: 150,
      },
      {
        id: 'quantity',
        accessorFn: (row) => Number(row.totalRequestedQuantity || 0),
        header: ({ column }) => (
          <DataGridColumnHeader title="TRANSFER QTY" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <span className="font-bold text-xs text-gray-800">
            {row.original.totalRequestedQuantity} {row.original.unit}
          </span>
        ),
        size: 120,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: false,
        size: 140,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => {
          const item = row.original;
          const rawStatus = (item.status || '').toString().trim().toUpperCase().replace(/[\s_]/g, '');
          const isPending =
            rawStatus === 'DRAFT' ||
            rawStatus === 'PENDING' ||
            rawStatus === 'SENTFORAPPROVAL' ||
            rawStatus === 'PENDINGAPPROVAL' ||
            Boolean(item.isDraft);
          const isApproved = rawStatus === 'APPROVED';

          return (
            <div className="flex items-center gap-1.5">
              {/* View Transfer Details */}
              <button
                type="button"
                onClick={() => handleView(item)}
                className="p-1.5 text-gray-500 hover:text-[#084E92] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                title="View Transfer Details"
              >
                <Eye size={15} />
              </button>

              {/* Actions for Pending / Draft Requests: Edit, Approve, Reject, Delete */}
              {isPending && (
                <>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                      title="Edit Transfer Request"
                    >
                      <Pencil size={15} />
                    </button>
                  )}

                  {(canEdit || canAdd) && (
                    <button
                      type="button"
                      onClick={() => handleOpenApproveModal(item)}
                      className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                      title="Approve Transfer Request"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}

                  {(canEdit || canAdd) && (
                    <button
                      type="button"
                      onClick={() => handleOpenRejectModal(item)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Reject Transfer Request"
                    >
                      <XCircle size={16} />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetDeleteTransfer(item);
                        setDeleteModalOpen(true);
                      }}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete Draft Request"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 160,
      },
    ],
    [canAdd, canEdit, canDelete, canView]
  );

  const table = useReactTable({
    data: filteredTransfers,
    columns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="STR Approval" />;
  }

  return (
    <Container>
      <div className="py-3 md:py-4 pb-6 space-y-4 md:space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span>Dashboard</span>
          <ChevronRight size={11} />
          <span>Inventory</span>
          <ChevronRight size={11} />
          <span className="text-[#084E92] font-semibold">STR Approval</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#101828] font-sans leading-tight">
              Stock Transfer Approval (STR)
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Review, edit, approve, or reject stock transfer requests submitted by outlets and suboutlets.
            </p>
          </div>
          {canAdd && (
            <HeaderActionButton to="/inventory/stock-transfer-request">
              New Transfer Request
            </HeaderActionButton>
          )}
        </div>

        <PageErrorAlert
          error={scopeError || error}
          onRetry={scopeError ? retryScope : fetchTransfers}
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total Requests"
            value={stats.total}
            icon={ArrowLeftRight}
            iconBg="#EEF2FE"
            iconColor="#2952E3"
          />
          <StatCard
            label="Draft Requests"
            value={stats.drafts}
            icon={Clock}
            iconBg="#FEF6E7"
            iconColor="#B7791F"
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            icon={CheckCheck}
            iconBg="#E7F7EE"
            iconColor="#14804A"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={Ban}
            iconBg="#FBEAEC"
            iconColor="#C0293D"
          />
        </div>

        {/* Filter Bar */}
        <div className="space-y-3">
          {/* Row 1: Search Bar & Status Filter */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transfer code, item, outlet, vehicle, driver..."
                className="w-full h-9.5 pl-9 pr-3 rounded-xl border border-[#E7EAF0] bg-white text-xs font-medium text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
              />
            </div>
            <div className="w-[200px] shrink-0">
              <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
            </div>
          </div>

          {/* Row 2: Location Filters (From Outlet, From Sub-Outlet, To Outlet, To Sub-Outlet) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOutletUser ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-2.5`}>
            {/* 1. From Outlet */}
            {!isOutletUser && (
              <SearchableSelect
                name="fromOutlet"
                value={selectedFromOutletId}
                onChange={(e) => {
                  setSelectedFromOutletId(e.target.value);
                  setSelectedFromSubOutletId('');
                }}
                options={displayOutletOptions}
                placeholder="From Outlet..."
              />
            )}

            {/* 2. From Sub-Outlet */}
            <SearchableSelect
              name="fromSubOutlet"
              value={selectedFromSubOutletId}
              onChange={(e) => setSelectedFromSubOutletId(e.target.value)}
              options={fromSubOutletOptions}
              disabled={!isOutletUser && !selectedFromOutletId}
              placeholder={!isOutletUser && !selectedFromOutletId ? 'Select From Outlet' : 'From Sub-Outlet...'}
            />

            {/* 3. To Outlet */}
            <SearchableSelect
              name="toOutlet"
              value={selectedToOutletId}
              onChange={(e) => {
                setSelectedToOutletId(e.target.value);
                setSelectedToSubOutletId('');
              }}
              options={toOutletOptions}
              placeholder="To Outlet..."
            />

            {/* 4. To Sub-Outlet */}
            <SearchableSelect
              name="toSubOutlet"
              value={selectedToSubOutletId}
              onChange={(e) => setSelectedToSubOutletId(e.target.value)}
              options={toSubOutletOptions}
              disabled={!selectedToOutletId}
              placeholder={!selectedToOutletId ? 'Select To Outlet' : 'To Sub-Outlet...'}
            />
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden shadow-xs">
          {loading || scopeLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={18} className="animate-spin text-[#084E92]" />
              Loading transfer requests for approval…
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredTransfers.length}
              className="rounded-2xl"
              tableLayout={{
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none">
                <CardTable>
                  <ScrollArea className="max-h-[60vh] w-full">
                    <div className="min-w-[1100px]">
                      <DataGridTable />
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardTable>
                <CardFooter className="bg-[#F9FAFC] rounded-b-2xl border-t border-[#E7EAF0] py-2.5">
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </DataGrid>
          )}
        </div>

        {/* Approve Confirmation Dialog */}
        <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <DialogHeader className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                <CheckCircle2 size={22} />
              </div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Approve Stock Transfer Request?
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Are you sure you want to approve transfer request ?
                Once approved, the originating outlet can dispatch the items to the destination outlet.
              </DialogDescription>
            </DialogHeader>

            {targetApproveTransfer && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 my-2 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">From Outlet:</span>
                  <span className="font-semibold text-gray-800">{targetApproveTransfer.fromOutlet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">To Outlet:</span>
                  <span className="font-semibold text-gray-800">{targetApproveTransfer.toOutlet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Quantity:</span>
                  <span className="font-bold text-gray-900">
                    {targetApproveTransfer.totalRequestedQuantity} {targetApproveTransfer.unit}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <button
                type="button"
                onClick={() => {
                  setApproveModalOpen(false);
                  setTargetApproveTransfer(null);
                }}
                disabled={approving}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={approving}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                Approve Transfer
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Modal with Mandatory Reason */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <DialogHeader className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-1">
                <AlertTriangle size={22} />
              </div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Reject Stock Transfer Request
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Please provide a mandatory reason for rejecting{' '}
                <strong className="text-gray-800">{targetRejectTransfer?.transferCode}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 my-2">
              <label className="text-xs font-bold text-gray-700 block">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError('');
                }}
                placeholder="Enter detailed reason for rejection..."
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 placeholder:text-gray-400"
              />
              {rejectError && (
                <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                  <AlertTriangle size={12} /> {rejectError}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setTargetRejectTransfer(null);
                  setRejectReason('');
                  setRejectError('');
                }}
                disabled={rejecting}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejecting}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {rejecting ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Reject Transfer
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setTargetDeleteTransfer(null);
          }}
          onConfirm={handleDeleteDraft}
          isLoading={deleting}
          title="Delete Stock Transfer"
          message={`Are you sure you want to delete stock transfer request ${targetDeleteTransfer?.transferCode || ''}? This action cannot be undone.`}
        />
      </div>
    </Container>
  );
};

export default StockTransferApproval;
