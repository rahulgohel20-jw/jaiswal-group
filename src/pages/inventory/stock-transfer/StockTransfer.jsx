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
  Trash2,
  Download,
  ArrowLeftRight,
  ClipboardList,
  CheckCircle2,
  Send,
  Plus,
  ChevronRight,
  Filter,
  Loader2,
  AlertTriangle,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import SearchableSelect from '@/utils/SearchableSelect';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { useOrgScope } from '@/hooks/useOrgScope';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import {
  getTransferList,
  deleteDraftTransfer,
  dispatchTransfer,
  getAllSubOutlets,
  getOrganizationByType,
} from '@/services/apiServices';
import FifoBatchVisualizerModal from './FifoBatchVisualizerModal';
import { OrgTypes } from '@/constants/orgTypes';

/* -------------------------------------------------------------------------
 * Status Styling Tokens (DRAFT, IN_TRANSIT, REJECTED, CLOSED)
 * ---------------------------------------------------------------------- */
const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  Draft: 'bg-gray-100 text-gray-700 border-gray-200',
  IN_TRANSIT: 'bg-blue-50 text-blue-700 border-blue-200',
  'In Transit': 'bg-blue-50 text-blue-700 border-blue-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  CLOSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

const STATUS_DOT = {
  DRAFT: 'bg-gray-400',
  Draft: 'bg-gray-400',
  IN_TRANSIT: 'bg-blue-500',
  'In Transit': 'bg-blue-500',
  REJECTED: 'bg-rose-500',
  Rejected: 'bg-rose-500',
  CLOSED: 'bg-emerald-500',
  Closed: 'bg-emerald-500',
  RECEIVED: 'bg-emerald-500',
  Received: 'bg-emerald-500',
  PENDING: 'bg-amber-500',
  Pending: 'bg-amber-500',
};

const formatStatusLabel = (status) => {
  if (!status) return 'Draft';
  const s = String(status).toUpperCase().replace(/[\s_]/g, '');
  if (s === 'DRAFT') return 'Draft';
  if (s === 'INTRANSIT') return 'In Transit';
  if (s === 'REJECTED') return 'Rejected';
  if (s === 'CLOSED' || s === 'RECEIVED' || s === 'RECIEVED') return 'Closed';
  if (s === 'PENDING') return 'Pending';
  return status;
};

const StatusBadge = ({ status = 'Draft' }) => {
  const label = formatStatusLabel(status);
  const key = String(status).toUpperCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
        STATUS_STYLES[key] || STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[key] || STATUS_DOT[status] || 'bg-gray-400'}`} />
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
    { value: 'IN_TRANSIT', label: 'In Transit' },
    { value: 'REJECTED', label: 'Rejected' },
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

const StockTransfer = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [sorting, setSorting] = useState([]);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteTransfer, setTargetDeleteTransfer] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // FIFO visualizer modal state
  const [visualizerOpen, setVisualizerOpen] = useState(false);
  const [selectedVisualizerItem, setSelectedVisualizerItem] = useState(null);

  // Outlets, Sub-units & Filter states
  const [allOutlets, setAllOutlets] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [selectedFromOutletId, setSelectedFromOutletId] = useState('');
  const [selectedFromSubOutletId, setSelectedFromSubOutletId] = useState('');
  const [selectedToOutletId, setSelectedToOutletId] = useState('');
  const [selectedToSubOutletId, setSelectedToSubOutletId] = useState('');

  // Permissions hook
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Stock Transfer Request');

  // Scope hooks
  const {
    loading: scopeLoading,
    orgType,
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    showUnitDropdown,
    units,
    selectedUnitId,
    setSelectedUnitId,
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
        console.error('Failed to load outlets in StockTransfer:', err);
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
        console.error('Failed to load sub-units in StockTransfer:', err);
      }
    };
    loadSubUnits();
  }, []);

  // Available outlets for dropdowns (strictly company outlets for company user, same parent company for outlet user)
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

  // From Sub-outlet options: for outlet user based on effectiveOutletId; for others based on selectedFromOutletId
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

  // To Sub-outlet options: based on selectedToOutletId
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
    setLoading(true);
    try {
      const params = {};
      if (isOutletUser && effectiveOutletId) {
        params.fromOrganizationId = Number(effectiveOutletId);
      } else if (selectedFromOutletId) {
        params.fromOrganizationId = Number(selectedFromOutletId);
      } else if (selectedUnitId) {
        params.fromOrganizationId = Number(selectedUnitId);
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
        const totalAccQty = itemsArr.reduce(
          (acc, it) =>
            acc +
            Number(
              it.receivedQuantity ??
              it.acceptedQuantity ??
              it.baseReceivedQuantity ??
              0
            ),
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
          status: item.status || (item.isDraft ? 'Draft' : 'Pending'),
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
          totalAcceptedQuantity:
            totalAccQty > 0
              ? totalAccQty
              : Number(
                  item.receivedQuantity ??
                  item.acceptedQuantity ??
                  item.totalReceivedQuantity ??
                  item.totalAcceptedQuantity ??
                  0
                ),
          unit: itemsArr[0]?.unitName || itemsArr[0]?.unit || 'Units',
          raw: item,
        };
      });

      setTransfers(normalized);
    } catch (err) {
      console.error('Failed to fetch stock transfers:', err);
      // Fallback empty list if error
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [isOutletUser, effectiveOutletId, selectedFromOutletId, selectedUnitId]);

  useEffect(() => {
    if (!scopeLoading) {
      fetchTransfers();
    }
  }, [fetchTransfers, scopeLoading]);

  // Counts for stat cards
  const stats = useMemo(() => {
    const total = transfers.length;
    const inTransit = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'INTRANSIT' || s === 'PENDING';
    }).length;
    const closed = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'CLOSED' || s === 'RECEIVED' || s === 'RECIEVED';
    }).length;
    const drafts = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'DRAFT' || Boolean(t.isDraft);
    }).length;
    return { total, inTransit, closed, drafts };
  }, [transfers]);

  // Filtered rows
  const filteredTransfers = useMemo(() => {
    let rows = transfers;

    // 1. Outlet user locked to From Outlet = effectiveOutletId
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
        if (target === 'CLOSED') {
          return itemStatus === 'CLOSED' || itemStatus === 'RECEIVED' || itemStatus === 'RECIEVED';
        }
        if (target === 'DRAFT') {
          return itemStatus === 'DRAFT' || Boolean(r.isDraft);
        }
        if (target === 'INTRANSIT') {
          return itemStatus === 'INTRANSIT' || itemStatus === 'PENDING';
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

  const handleDeleteDraft = async () => {
    if (!targetDeleteTransfer?.id) return;
    setDeleting(true);
    try {
      await deleteDraftTransfer(targetDeleteTransfer.id);
      toast.success('Draft transfer deleted successfully');
      setDeleteModalOpen(false);
      setTargetDeleteTransfer(null);
      fetchTransfers();
    } catch (err) {
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
          <Link
            to={`/inventory/stock-transfer-detail/${row.original.id}`}
            className="font-bold text-[#2952E3] text-xs font-mono hover:underline block truncate"
          >
            {row.original.transferCode}
          </Link>
        ),
        enableSorting: false,
        size: 150,
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
            <button
              type="button"
              onClick={() => {
                const qty = Number(row.original.totalRequestedQuantity || 0);
                if (!qty || qty <= 0) {
                  toast.info('Transfer quantity must be greater than 0 to view FIFO batch flow');
                  return;
                }
                setSelectedVisualizerItem({
                  itemId: row.original.primaryItemId,
                  itemType: row.original.primaryItemType || 'RAW_MATERIAL',
                  unitId: row.original.primaryUnitId,
                  transferItemId: row.original.transferItemId,
                  itemName: row.original.primaryItemName,
                  fromOutletName: row.original.fromOutlet,
                  toOutletName: row.original.toOutlet,
                  fromOrganizationId: row.original.fromOrganizationId,
                  fromSubOutletId: row.original.fromSubOutletId,
                  toOrganizationId: row.original.toOrganizationId,
                  toSubOutletId: row.original.toSubOutletId,
                  transferQty: qty,
                  unit: row.original.unit,
                });
                setVisualizerOpen(true);
              }}
              className="text-left font-semibold text-xs text-gray-800 hover:text-[#084E92] hover:underline truncate max-w-[130px] cursor-pointer"
              title="Click to view FIFO batch flow"
            >
              {row.original.primaryItemName}
            </button>
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
        size: 130,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => {
          const item = row.original;
          const rawStatus = (item.status || '').toString().trim().toUpperCase();
          const isDraft = rawStatus === 'DRAFT' || Boolean(item.isDraft);

          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleView(item)}
                className="p-1.5 text-gray-500 hover:text-[#084E92] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                title="View Transfer Details"
              >
                <Eye size={15} />
              </button>

              {isDraft && (
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
                      onClick={() => handleDispatch(item)}
                      className="p-1.5 text-[#084E92] hover:text-[#063b6f] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Dispatch Transfer"
                    >
                      <Send size={15} />
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
                      title="Delete Draft"
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
        size: 150,
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
    return <AccessDenied pageTitle="Stock Transfer Request" />;
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
          <span className="text-[#084E92] font-semibold">Stock Transfer</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#101828] font-sans leading-tight">Stock Transfer</h1>
          </div>
          {canAdd && (
            <HeaderActionButton to="/inventory/stock-transfer-request">
              New Transfer Request
            </HeaderActionButton>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total Transfers"
            value={stats.total}
            icon={ArrowLeftRight}
            iconBg="#EEF2FE"
            iconColor="#2952E3"
          />
          <StatCard
            label="In Transit"
            value={stats.inTransit}
            icon={ClipboardList}
            iconBg="#FEF6E7"
            iconColor="#B7791F"
          />
          <StatCard
            label="Closed"
            value={stats.closed}
            icon={CheckCircle2}
            iconBg="#E7F7EE"
            iconColor="#14804A"
          />
          <StatCard
            label="Draft Requests"
            value={stats.drafts}
            icon={Boxes}
            iconBg="#F2F4F7"
            iconColor="#667085"
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
                placeholder="Search transfer code, item, outlet, vehicle..."
                className="w-full h-9.5 pl-9 pr-3 rounded-xl border border-[#E7EAF0] bg-white text-xs font-medium text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
              />
            </div>
            <div className="w-[160px] shrink-0">
              <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
            </div>
          </div>

          {/* Row 2: Location Filters (From Outlet, From Sub-Outlet, To Outlet, To Sub-Outlet) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOutletUser ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-2.5`}>
            {/* 1. From Outlet: only for Company & Group Users */}
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

            {/* 2. From Sub-Outlet: based on From Outlet */}
            <SearchableSelect
              name="fromSubOutlet"
              value={selectedFromSubOutletId}
              onChange={(e) => setSelectedFromSubOutletId(e.target.value)}
              options={fromSubOutletOptions}
              disabled={!isOutletUser && !selectedFromOutletId}
              placeholder={!isOutletUser && !selectedFromOutletId ? 'Select From Outlet' : 'From Sub-Outlet...'}
            />

            {/* 3. To Outlet: for all users */}
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

            {/* 4. To Sub-Outlet: based on To Outlet */}
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

        {/* Table Card (Maximized height for comfortable viewing) */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden shadow-xs">
          {loading || scopeLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={18} className="animate-spin text-[#084E92]" />
              Loading stock transfers…
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

        {/* Delete Draft Confirm Modal */}
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setTargetDeleteTransfer(null);
          }}
          onConfirm={handleDeleteDraft}
          itemName={targetDeleteTransfer?.transferCode || 'this draft transfer'}
          saving={deleting}
        />

        {/* FIFO Batch Flow Visualizer Modal */}
        {selectedVisualizerItem && (
          <FifoBatchVisualizerModal
            isOpen={visualizerOpen}
            onClose={() => {
              setVisualizerOpen(false);
              setSelectedVisualizerItem(null);
            }}
            transferItemId={selectedVisualizerItem.transferItemId}
            itemId={selectedVisualizerItem.itemId}
            itemType={selectedVisualizerItem.itemType || 'RAW_MATERIAL'}
            unitId={selectedVisualizerItem.unitId ? Number(selectedVisualizerItem.unitId) : undefined}
            fromOrganizationId={selectedVisualizerItem.fromOrganizationId}
            fromSubOutletId={selectedVisualizerItem.fromSubOutletId}
            toOrganizationId={selectedVisualizerItem.toOrganizationId}
            toSubOutletId={selectedVisualizerItem.toSubOutletId}
            itemName={selectedVisualizerItem.itemName}
            fromOutletName={selectedVisualizerItem.fromOutletName}
            toOutletName={selectedVisualizerItem.toOutletName}
            transferQty={selectedVisualizerItem.transferQty != null && selectedVisualizerItem.transferQty !== '' ? Number(selectedVisualizerItem.transferQty) : 0}
            unit={selectedVisualizerItem.unit || 'kg'}
          />
        )}
      </div>
    </Container>
  );
};

export default StockTransfer;
