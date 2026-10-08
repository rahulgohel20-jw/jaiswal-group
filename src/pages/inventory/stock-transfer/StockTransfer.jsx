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
  Clock,
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
import { PageHeader } from '@/components/common/PageHeader';
import { CodeCell } from '@/components/common/CodeCell';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { SearchBar } from '@/components/common/SearchBar';
import {
  getTransferList,
  deleteDraftTransfer,
  dispatchTransfer,
  saveTransfer,
  updateDraftTransfer,
} from '@/services/apiServices';
import FifoBatchVisualizerModal from './FifoBatchVisualizerModal';

/* -------------------------------------------------------------------------
 * Status Styling Tokens (DRAFT, APPROVED, IN_TRANSIT, REJECTED, CLOSED)
 * ---------------------------------------------------------------------- */
const STATUS_TEXT_COLORS = {
  DRAFT: 'text-amber-600',
  Draft: 'text-amber-600',
  PENDING: 'text-amber-600',
  Pending: 'text-amber-600',
  APPROVED: 'text-emerald-600',
  Approved: 'text-emerald-600',
  IN_TRANSIT: 'text-blue-600',
  'In Transit': 'text-blue-600',
  REJECTED: 'text-rose-600',
  Rejected: 'text-rose-600',
  CLOSED: 'text-gray-500',
  Closed: 'text-gray-500',
  RECEIVED: 'text-gray-500',
  Received: 'text-gray-500',
  PENDING_DISCREPANCY_APPROVAL: 'text-orange-600',
  'Pending Discrepancy Approval': 'text-orange-600',
  DISCREPANCY_PENDING: 'text-amber-600',
  'Discrepancy Pending': 'text-amber-600',
  DISCREPANCY_RESOLVED: 'text-emerald-600',
  'Discrepancy Resolved': 'text-emerald-600',
};

const UNIT_SYMBOL_MAP = {
  KILOGRAM: 'KG',
  KILOGRAMS: 'KG',
  KG: 'KG',
  GRAM: 'GM',
  GRAMS: 'GM',
  GM: 'GM',
  G: 'GM',
  MILLIGRAM: 'MG',
  MILLIGRAMS: 'MG',
  MG: 'MG',
  LITRE: 'LTR',
  LITRES: 'LTR',
  LITER: 'LTR',
  LITERS: 'LTR',
  LTR: 'LTR',
  L: 'LTR',
  MILLILITRE: 'ML',
  MILLILITRES: 'ML',
  MILLILITER: 'ML',
  MILLILITERS: 'ML',
  ML: 'ML',
  PIECE: 'PCS',
  PIECES: 'PCS',
  PCS: 'PCS',
  PC: 'PCS',
  PACKET: 'PKT',
  PACKETS: 'PKT',
  PKT: 'PKT',
  BOX: 'BOX',
  BOXES: 'BOX',
  BOTTLE: 'BTL',
  BOTTLES: 'BTL',
  CAN: 'CAN',
  CANS: 'CAN',
  BAG: 'BAG',
  BAGS: 'BAG',
  NUMBER: 'NOS',
  NUMBERS: 'NOS',
  NOS: 'NOS',
};

const formatUnit = (uom) => {
  if (!uom) return 'Unit';
  const clean = String(uom).trim().toUpperCase();
  return UNIT_SYMBOL_MAP[clean] || uom;
};

const formatStatusLabel = (status) => {
  if (!status) return 'Draft';
  const s = String(status).toUpperCase().replace(/[\s_]/g, '');
  if (s === 'DRAFT') return 'Draft';
  if (s === 'PENDING' || s === 'SENTFORAPPROVAL' || s === 'PENDINGAPPROVAL') return 'Pending Approval';
  if (s === 'APPROVED') return 'Approved';
  if (s === 'INTRANSIT') return 'In Transit';
  if (s === 'REJECTED') return 'Rejected';
  if (s === 'CLOSED' || s === 'RECEIVED' || s === 'RECIEVED') return 'Closed';
  if (s === 'PENDINGDISCREPANCYAPPROVAL') return 'Discrepancy Approval';
  if (s === 'DISCREPANCYPENDING') return 'Discrepancy Pending';
  if (s === 'DISCREPANCYRESOLVED') return 'Resolved';
  return status;
};

const StatusBadge = ({ status = 'Draft' }) => {
  const label = formatStatusLabel(status);
  const key = String(status).toUpperCase();
  const color = STATUS_TEXT_COLORS[key] || STATUS_TEXT_COLORS[status] || 'text-gray-600';
  return (
    <span title={label} className={`text-xs font-semibold truncate block max-w-[105px] ${color}`}>
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
        <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{value}</span>
      </div>
    </div>
  );
}

function StatusDropdown({ value, onChange }) {
  const options = [
    { value: 'ALL', label: 'All Status' },
    { value: 'PENDING', label: 'Pending Approval' },
    { value: 'PENDING_DISCREPANCY_APPROVAL', label: 'Pending Discrepancy Approval' },
    { value: 'APPROVED', label: 'Approved' },
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
        className="h-10 w-full pl-8 pr-7 rounded-xl border border-[#C3C6D1] bg-white text-xs font-semibold text-[#101828] appearance-none focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 focus:border-[#084E92]"
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
  const [error, setError] = useState(null);
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
  const [subUnits, setSubUnits] = useState([]);
  const [selectedFromOutletId, setSelectedFromOutletId] = useState('');
  const [selectedFromSubOutletId, setSelectedFromSubOutletId] = useState('');
  const [selectedToOutletId, setSelectedToOutletId] = useState('');
  const [selectedToSubOutletId, setSelectedToSubOutletId] = useState('');

  // Permissions hook
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions([
    'Stock Transfer Request',
    'Stock Transfer',
    'STR',
  ]);

  // Scope hooks
  const {
    loading: scopeLoading,
    error: scopeError,
    retry: retryScope,
    orgType,
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    showUnitDropdown,
    units,
    subOutlets: scopeSubOutlets,
    subLocations: scopeSubLocations,
    selectedUnitId,
    setSelectedUnitId,
    effectiveOutletId,
    getSubOutlets,
    getSubLocations,
  } = useOrgScope();

  // Fast lookup maps for sub-outlets and sub-locations
  const subOutletMap = useMemo(() => {
    const map = {};
    (scopeSubOutlets || []).forEach((s) => {
      map[String(s.id)] = s.subOutletName || s.name || s.label;
    });
    return map;
  }, [scopeSubOutlets]);

  const subLocationMap = useMemo(() => {
    const map = {};
    (scopeSubLocations || []).forEach((l) => {
      map[String(l.id)] = l.locationName || l.subLocationName || l.name || l.label;
    });
    return map;
  }, [scopeSubLocations]);

  // Available outlets for dropdowns (strictly scoped outlets for logged in user)
  const displayOutletOptions = useMemo(() => {
    return units.map((u) => ({ value: String(u.id), label: `${u.name}${u.code ? ` (${u.code})` : ''}` }));
  }, [units]);

  const toOutletOptions = useMemo(() => {
    return displayOutletOptions.filter(
      (opt) => !isOutletUser || (effectiveOutletId && String(opt.value) !== String(effectiveOutletId))
    );
  }, [displayOutletOptions, isOutletUser, effectiveOutletId]);

  // From Sub-outlet options: for outlet user based on effectiveOutletId; for others based on selectedFromOutletId or selectedUnitId
  const fromSubOutletOptions = useMemo(() => {
    const targetId = isOutletUser ? effectiveOutletId : (selectedFromOutletId || selectedUnitId || effectiveOutletId);
    if (!targetId) return [];
    return (getSubOutlets(targetId) || []).map((s) => ({
      value: String(s.id),
      label: s.subOutletName || s.name || `Sub-Outlet #${s.id}`,
    }));
  }, [getSubOutlets, isOutletUser, effectiveOutletId, selectedFromOutletId, selectedUnitId]);

  // To Sub-outlet options: based on selectedToOutletId
  const toSubOutletOptions = useMemo(() => {
    if (!selectedToOutletId) return [];
    return (getSubOutlets(selectedToOutletId) || []).map((s) => ({
      value: String(s.id),
      label: s.subOutletName || s.name || `Sub-Outlet #${s.id}`,
    }));
  }, [getSubOutlets, selectedToOutletId]);

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

        const fromSubOutletId = item.fromSubOutletId || item.fromSubOutlet?.id || item.fromSubOrgId || null;
        const toSubOutletId = item.toSubOutletId || item.toSubOutlet?.id || item.toSubOrgId || null;
        const fromSubLocationId = item.fromSubLocationId || item.fromSubLocation?.id || null;
        const toSubLocationId = item.toSubLocationId || item.toSubLocation?.id || null;

        const fromSubOutletName =
          item.fromSubOutletName ||
          item.fromSubOutlet?.name ||
          item.fromSubOutlet?.subOutletName ||
          (fromSubOutletId ? subOutletMap[String(fromSubOutletId)] : '') ||
          '';

        const toSubOutletName =
          item.toSubOutletName ||
          item.toSubOutlet?.name ||
          item.toSubOutlet?.subOutletName ||
          (toSubOutletId ? subOutletMap[String(toSubOutletId)] : '') ||
          '';

        const fromSubLocationName =
          item.fromSubLocationName ||
          item.fromSubLocation?.name ||
          item.fromSubLocation?.locationName ||
          item.fromSubLocation?.subLocationName ||
          (fromSubLocationId ? subLocationMap[String(fromSubLocationId)] : '') ||
          '';

        const toSubLocationName =
          item.toSubLocationName ||
          item.toSubLocation?.name ||
          item.toSubLocation?.locationName ||
          item.toSubLocation?.subLocationName ||
          (toSubLocationId ? subLocationMap[String(toSubLocationId)] : '') ||
          '';

        return {
          id: item.id,
          transferCode: item.transferCode || item.code || `TRF-${String(item.id).padStart(4, '0')}`,
          fromOrganizationId: item.fromOrganizationId || item.fromOutletId,
          fromSubOutletId,
          fromSubLocationId,
          fromOutlet: item.fromOrganizationName || item.fromOutletName || item.fromOutlet || '—',
          fromSubOutlet: fromSubOutletName,
          fromSubLocation: fromSubLocationName,
          toOrganizationId: item.toOrganizationId || item.toOutletId,
          toSubOutletId,
          toSubLocationId,
          toOutlet: item.toOrganizationName || item.toOutletName || item.toOutlet || '—',
          toSubOutlet: toSubOutletName,
          toSubLocation: toSubLocationName,
          status: item.isDraft ? 'Draft' : item.status || 'Draft',
          isDraft: Boolean(item.isDraft),
          transferDate: item.transferDate || item.createdAt || '—',
          createdAt: item.createdAt || item.transferDate || '—',
          vehicleNumber: item.vehicleNumber || '—',
          driverName: item.driverName || '—',
          driverContact: item.driverContact || '—',
          itemsCount: itemsArr.length || 1,
          primaryItemName: itemsArr[0]?.itemName || itemsArr[0]?.rawMaterialName || 'Multiple Items',
          primaryItemId: itemsArr[0]?.itemId || itemsArr[0]?.rawMaterialId || itemsArr[0]?.id,
          primaryItemType: itemsArr[0]?.itemType || 'RAW_MATERIAL',
          primaryUnitId: itemsArr[0]?.unitId || itemsArr[0]?.unit?.id || 0,
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
          unit: itemsArr[0]?.unitName || itemsArr[0]?.unitSymbol || itemsArr[0]?.unit || 'Units',
          raw: item,
        };
      });

      setTransfers(normalized);
    } catch (err) {
      console.error('Failed to fetch stock transfers:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load stock transfers');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [
    scopeLoading,
    scopeError,
    isOutletUser,
    effectiveOutletId,
    selectedFromOutletId,
    selectedUnitId,
    subOutletMap,
    subLocationMap,
  ]);

  useEffect(() => {
    if (!scopeLoading && !scopeError) {
      fetchTransfers();
    }
  }, [fetchTransfers, scopeLoading, scopeError]);

  // Counts for stat cards
  const stats = useMemo(() => {
    const total = transfers.length;
    const inTransit = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'INTRANSIT';
    }).length;
    const approved = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'APPROVED';
    }).length;
    const pending = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'PENDING' || s === 'SENTFORAPPROVAL' || s === 'PENDINGAPPROVAL';
    }).length;
    return { total, inTransit, approved, pending };
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
        if (target === 'PENDING') {
          return !r.isDraft && (itemStatus === 'PENDING' || itemStatus === 'SENTFORAPPROVAL' || itemStatus === 'PENDINGAPPROVAL');
        }
        if (target === 'APPROVED') {
          return itemStatus === 'APPROVED';
        }
        if (target === 'INTRANSIT') {
          return itemStatus === 'INTRANSIT';
        }
        if (target === 'REJECTED') {
          return itemStatus === 'REJECTED';
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
        id: 'sno',
        header: ({ column }) => (
          <DataGridColumnHeader title="S.NO" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2 text-xs">{String(row.index + 1).padStart(2, '0')}</span>
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: 'transferCode',
        accessorFn: (row) => row.transferCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="TRANSFER CODE" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <CodeCell
            code={row.original.transferCode}
            maxWidth="max-w-[125px]"
            onClick={() => navigate(`/inventory/stock-transfer-detail/${row.original.id}`)}
          />
        ),
        enableSorting: false,
        size: 135,
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
          <DataGridColumnHeader title="DATE" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => <TruncatedCell value={row.original.transferDate} widthClass="max-w-[85px]" className="text-gray-700 text-xs font-medium" />,
        enableSorting: false,
        size: 90,
      },
      {
        id: 'fromOutlet',
        accessorFn: (row) => row.fromOutlet,
        header: ({ column }) => (
          <DataGridColumnHeader title="FROM UNIT" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="font-semibold text-xs text-gray-900 truncate max-w-[160px]" title={row.original.fromOutlet}>{row.original.fromOutlet}</div>
            {row.original.fromSubOutlet && (
              <div className="text-[11px] text-gray-500 font-medium truncate max-w-[160px]" title={row.original.fromSubOutlet}>{row.original.fromSubOutlet}</div>
            )}
            {row.original.fromSubLocation && (
              <div className="text-[10px] text-blue-600 font-medium truncate max-w-[160px]" title={row.original.fromSubLocation}>↳ {row.original.fromSubLocation}</div>
            )}
          </div>
        ),
        enableSorting: false,
        size: 165,
      },
      {
        id: 'toOutlet',
        accessorFn: (row) => row.toOutlet,
        header: ({ column }) => (
          <DataGridColumnHeader title="TO UNIT" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="font-semibold text-xs text-gray-900 truncate max-w-[160px]" title={row.original.toOutlet}>{row.original.toOutlet}</div>
            {row.original.toSubOutlet && (
              <div className="text-[11px] text-gray-500 font-medium truncate max-w-[160px]" title={row.original.toSubOutlet}>{row.original.toSubOutlet}</div>
            )}
            {row.original.toSubLocation && (
              <div className="text-[10px] text-blue-600 font-medium truncate max-w-[160px]" title={row.original.toSubLocation}>↳ {row.original.toSubLocation}</div>
            )}
          </div>
        ),
        enableSorting: false,
        size: 165,
      },
      {
        id: 'items',
        accessorFn: (row) => row.primaryItemName,
        header: ({ column }) => (
          <DataGridColumnHeader title="ITEMS" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1 min-w-0">
            <span
              className="font-semibold text-xs text-gray-800 truncate max-w-[95px]"
              title={row.original.primaryItemName}
            >
              {row.original.primaryItemName}
            </span>
            {row.original.itemsCount > 1 && (
              <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                +{row.original.itemsCount - 1}
              </span>
            )}
          </div>
        ),
        enableSorting: false,
        size: 120,
      },
      {
        id: 'quantity',
        accessorFn: (row) => Number(row.totalRequestedQuantity || 0),
        header: ({ column }) => (
          <DataGridColumnHeader title="QTY" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <span className="font-bold text-xs text-gray-800 whitespace-nowrap">
            {row.original.totalRequestedQuantity} {formatUnit(row.original.unit)}
          </span>
        ),
        enableSorting: false,
        size: 85,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center min-w-0">
            <StatusBadge status={row.original.status} />
          </div>
        ),
        enableSorting: false,
        size: 110,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTION" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => {
          const item = row.original;
          const rawStatus = (item.status || '').toString().trim().toUpperCase().replace(/[\s_]/g, '');
          const isDraft = rawStatus === 'DRAFT' || Boolean(item.isDraft);
          const isApproved = rawStatus === 'APPROVED';

          return (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <button
                type="button"
                onClick={() => handleView(item)}
                className="p-1 text-gray-500 hover:text-[#084E92] hover:bg-blue-50 rounded-lg transition cursor-pointer"
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
                      className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                      title="Edit Transfer Request"
                    >
                      <Pencil size={15} />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetDeleteTransfer(item);
                        setDeleteModalOpen(true);
                      }}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete Draft"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </>
              )}

              {isApproved && (canEdit || canAdd) && (
                <button
                  type="button"
                  onClick={() => handleDispatch(item)}
                  className="p-1 text-[#084E92] hover:text-[#063b6f] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                  title="Dispatch Transfer"
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 95,
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
      <div className="pt-2 pb-6 space-y-4">
        <PageHeader
          title="Stock Transfer"
          actions={
            canAdd && (
              <HeaderActionButton to="/inventory/stock-transfer-request">
                New Transfer Request
              </HeaderActionButton>
            )
          }
        />

        <PageErrorAlert
          error={scopeError || error}
          onRetry={scopeError ? retryScope : fetchTransfers}
        />

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
            label="Pending Approval"
            value={stats.pending}
            icon={Clock}
            iconBg="#FEF6E7"
            iconColor="#B7791F"
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            icon={CheckCircle2}
            iconBg="#E7F7EE"
            iconColor="#14804A"
          />
          <StatCard
            label="In Transit"
            value={stats.inTransit}
            icon={ClipboardList}
            iconBg="#F4F3FF"
            iconColor="#6938EF"
          />
        </div>

        {/* Filter Bar */}
        <div className="space-y-3">
          {/* Row 1: Search Bar & Status Filter */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder="Search transfer code, item, unit, vehicle..."
              />
            </div>
            <div className="w-[160px] shrink-0">
              <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
            </div>
          </div>

          {/* Row 2: Location Filters (From Unit, From Sub-Unit, To Unit, To Sub-Unit) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOutletUser ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-2.5`}>
            {/* 1. From Unit: only for Company & Group Users */}
            {!isOutletUser && (
              <SearchableSelect
                name="fromOutlet"
                value={selectedFromOutletId}
                onChange={(e) => {
                  setSelectedFromOutletId(e.target.value);
                  setSelectedFromSubOutletId('');
                }}
                options={displayOutletOptions}
                placeholder="From Unit..."
              />
            )}

            {/* 2. From Sub-Unit: based on From Unit */}
            <SearchableSelect
              name="fromSubOutlet"
              value={selectedFromSubOutletId}
              onChange={(e) => setSelectedFromSubOutletId(e.target.value)}
              options={fromSubOutletOptions}
              disabled={!isOutletUser && !selectedFromOutletId}
              placeholder={!isOutletUser && !selectedFromOutletId ? 'Select From Unit' : 'From Sub-Unit...'}
            />

            {/* 3. To Unit: for all users */}
            <SearchableSelect
              name="toOutlet"
              value={selectedToOutletId}
              onChange={(e) => {
                setSelectedToOutletId(e.target.value);
                setSelectedToSubOutletId('');
              }}
              options={toOutletOptions}
              placeholder="To Unit..."
            />

            {/* 4. To Sub-Unit: based on To Unit */}
            <SearchableSelect
              name="toSubOutlet"
              value={selectedToSubOutletId}
              onChange={(e) => setSelectedToSubOutletId(e.target.value)}
              options={toSubOutletOptions}
              disabled={!selectedToOutletId}
              placeholder={!selectedToOutletId ? 'Select To Unit' : 'To Sub-Unit...'}
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
                dense: true,
                width: 'fixed',
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none">
                <CardTable className="w-full overflow-x-auto">
                  <DataGridTable />
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
          itemLabel={targetDeleteTransfer?.transferCode || 'this draft transfer'}
          saving={deleting}
        />
      </div>
    </Container>
  );
};

export default StockTransfer;
