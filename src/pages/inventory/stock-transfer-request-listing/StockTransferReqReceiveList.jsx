import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Search,
  CheckCircle2,
  ChevronRight,
  Filter,
  Loader2,
  Layers,
  ArrowDownLeft,
  Truck,
  AlertTriangle,
  FileCheck,
  Eye,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import SearchableSelect from '@/utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getTransferList } from '@/services/apiServices';
import FifoBatchVisualizerModal from '../stock-transfer/FifoBatchVisualizerModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { CodeCell } from '@/components/common/CodeCell';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { SearchBar } from '@/components/common/SearchBar';

/* -------------------------------------------------------------------------
 * Status Styling Tokens (IN_TRANSIT, REJECTED, CLOSED)
 * ---------------------------------------------------------------------- */
const STATUS_TEXT_COLORS = {
  IN_TRANSIT: 'text-blue-600',
  'In Transit': 'text-blue-600',
  REJECTED: 'text-rose-600',
  Rejected: 'text-rose-600',
  CLOSED: 'text-emerald-600',
  Closed: 'text-emerald-600',
  RECEIVED: 'text-emerald-600',
  Received: 'text-emerald-600',
  RECIEVED: 'text-emerald-600',
  Recieved: 'text-emerald-600',
  PARTIALLY_ACCEPTED: 'text-purple-600',
  'Partially Accepted': 'text-purple-600',
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
  if (!status) return 'In Transit';
  const s = String(status).toUpperCase().replace(/[\s_]/g, '');
  if (s === 'INTRANSIT') return 'In Transit';
  if (s === 'REJECTED') return 'Rejected';
  if (s === 'CLOSED' || s === 'RECEIVED' || s === 'RECIEVED') return 'Closed';
  if (s === 'PARTIALLYACCEPTED') return 'Partially Accepted';
  if (s === 'PENDINGDISCREPANCYAPPROVAL') return 'Discrepancy Approval';
  if (s === 'DISCREPANCYPENDING') return 'Discrepancy Pending';
  if (s === 'DISCREPANCYRESOLVED') return 'Resolved';
  return status;
};

const StatusBadge = ({ status = 'In Transit' }) => {
  const label = formatStatusLabel(status);
  const key = String(status).toUpperCase();
  const color = STATUS_TEXT_COLORS[key] || STATUS_TEXT_COLORS[status] || 'text-gray-600';
  return (
    <span
      title={label}
      className={`text-xs font-semibold truncate block max-w-[105px] ${color}`}
    >
      {label}
    </span>
  );
};

const TruncatedCell = ({ value, widthClass = 'max-w-[160px]', className = 'text-gray-700' }) => (
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

const VarianceCell = ({ variance, unit = '' }) => {
  if (variance === null || variance === undefined) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  const val = Number(variance);
  if (val === 0) {
    return <span className="text-gray-500 font-semibold text-xs">0 {unit}</span>;
  }
  return (
    <span className={`text-xs font-bold ${val < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
      {val > 0 ? `+${val}` : val} {unit}
    </span>
  );
};

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

const StockTransferReqReceiveList = () => {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [sorting, setSorting] = useState([]);

  // Outlets, Sub-units & Filter states
  const [subUnits, setSubUnits] = useState([]);
  const [selectedFromOutletId, setSelectedFromOutletId] = useState('');
  const [selectedFromSubOutletId, setSelectedFromSubOutletId] = useState('');
  const [selectedToOutletId, setSelectedToOutletId] = useState('');
  const [selectedToSubOutletId, setSelectedToSubOutletId] = useState('');

  // Visualizer modal state
  const [visualizerModalOpen, setVisualizerModalOpen] = useState(false);
  const [selectedVisualizerItem, setSelectedVisualizerItem] = useState(null);

  // Permission hooks
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions([
    'STR Received',
    'Stock Transfer Request Received',
    'Stock Transfer Receive',
    'STR Receive',
    'Stock Transfer Request',
  ]);

  // Scope hooks
  const {
    loading: scopeLoading,
    error: scopeError,
    retry: retryScope,
    isOutletUser,
    isCompanyUser,
    units,
    subOutlets: scopeSubOutlets,
    subLocations: scopeSubLocations,
    selectedUnitId,
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

  const fromOutletOptions = useMemo(() => {
    return displayOutletOptions.filter(
      (opt) => !isOutletUser || (effectiveOutletId && String(opt.value) !== String(effectiveOutletId))
    );
  }, [displayOutletOptions, isOutletUser, effectiveOutletId]);

  // From Sub-outlet options (dependent on selectedFromOutletId or selectedUnitId)
  const fromSubOutletOptions = useMemo(() => {
    const targetId = selectedFromOutletId || (isOutletUser ? effectiveOutletId : '');
    if (!targetId) return [];
    return (getSubOutlets(targetId) || []).map((s) => ({
      value: String(s.id),
      label: s.subOutletName || s.name || `Sub-Outlet #${s.id}`,
    }));
  }, [getSubOutlets, selectedFromOutletId, isOutletUser, effectiveOutletId]);

  // To Sub-outlet options: for outlet user based on effectiveOutletId; for others based on selectedToOutletId or selectedUnitId
  const toSubOutletOptions = useMemo(() => {
    const targetId = isOutletUser ? effectiveOutletId : (selectedToOutletId || selectedUnitId || effectiveOutletId);
    if (!targetId) return [];
    return (getSubOutlets(targetId) || []).map((s) => ({
      value: String(s.id),
      label: s.subOutletName || s.name || `Sub-Outlet #${s.id}`,
    }));
  }, [getSubOutlets, isOutletUser, effectiveOutletId, selectedToOutletId, selectedUnitId]);

  // Fetch Receive Transfers from API
  const fetchReceiveTransfers = useCallback(async () => {
    if (scopeLoading || scopeError) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      // For outlet users: limited to transfers incoming to their outlet (toOrganizationId)
      if (isOutletUser && effectiveOutletId) {
        params.toOrganizationId = Number(effectiveOutletId);
      } else if (selectedToOutletId) {
        params.toOrganizationId = Number(selectedToOutletId);
      } else if (selectedUnitId) {
        params.toOrganizationId = Number(selectedUnitId);
      }

      if (selectedFromOutletId) {
        params.fromOrganizationId = Number(selectedFromOutletId);
      }

      const res = await getTransferList(params);
      const rawList = res?.data?.data || res?.data?.content || res?.data || [];
      const list = Array.isArray(rawList) ? rawList : [];

      // Filter: only show transfers that have actually been dispatched (IN_TRANSIT) or completed/rejected.
      // Exclude requests that are DRAFT, PENDING / SENT FOR APPROVAL, or APPROVED (not yet dispatched).
      const dispatchedList = list.filter((item) => {
        if (item.isDraft) return false;
        const s = String(item.status || '').toUpperCase().replace(/[\s_]/g, '');
        if (
          s === 'DRAFT' ||
          s === 'PENDING' ||
          s === 'SENTFORAPPROVAL' ||
          s === 'PENDINGAPPROVAL' ||
          s === 'APPROVED'
        ) {
          return false;
        }
        return true;
      });

      const normalized = dispatchedList.map((item) => {
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
        const variance = totalAccQty > 0 ? totalAccQty - totalReqQty : null;

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
          status: item.status || 'In Transit',
          transferDate: item.transferDate || item.createdAt || '—',
          vehicleNumber: item.vehicleNumber || '—',
          driverName: item.driverName || '—',
          driverContact: item.driverContact || '—',
          itemsCount: itemsArr.length || 1,
          primaryItemName: itemsArr[0]?.itemName || itemsArr[0]?.rawMaterialName || 'Raw Material Item',
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
          variance,
          unit: itemsArr[0]?.unitName || itemsArr[0]?.unit || 'Units',
          raw: item,
        };
      });

      setTransfers(normalized);
    } catch (err) {
      console.error('Failed to fetch incoming stock transfers:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load transfer receive list');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [scopeLoading, scopeError, isOutletUser, effectiveOutletId, selectedToOutletId, selectedFromOutletId, selectedUnitId, subOutletMap, subLocationMap]);

  useEffect(() => {
    if (!scopeLoading && !scopeError) {
      fetchReceiveTransfers();
    }
  }, [fetchReceiveTransfers, scopeLoading, scopeError]);

  // Stat counts (IN_TRANSIT, CLOSED, REJECTED)
  const stats = useMemo(() => {
    const total = transfers.length;
    const inTransit = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'INTRANSIT';
    }).length;
    const closed = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'CLOSED' || s === 'RECEIVED' || s === 'RECIEVED' || s === 'PARTIALLYACCEPTED';
    }).length;
    const rejected = transfers.filter((t) => {
      const s = String(t.status || '').toUpperCase().replace(/[\s_]/g, '');
      return s === 'REJECTED';
    }).length;
    return { total, inTransit, closed, rejected };
  }, [transfers]);

  // Filtered rows
  const filteredTransfers = useMemo(() => {
    let rows = transfers;

    // 1. Outlet user locked to Destination Outlet = effectiveOutletId
    if (isOutletUser && effectiveOutletId) {
      rows = rows.filter(
        (r) => !r.toOrganizationId || Number(r.toOrganizationId) === Number(effectiveOutletId)
      );
    } else if (selectedToOutletId) {
      rows = rows.filter(
        (r) => !r.toOrganizationId || Number(r.toOrganizationId) === Number(selectedToOutletId)
      );
    } else if (selectedUnitId) {
      rows = rows.filter(
        (r) => !r.toOrganizationId || Number(r.toOrganizationId) === Number(selectedUnitId)
      );
    }

    // 2. From Outlet filter
    if (selectedFromOutletId) {
      rows = rows.filter(
        (r) => !r.fromOrganizationId || Number(r.fromOrganizationId) === Number(selectedFromOutletId)
      );
    }

    // 3. From Sub-Outlet filter
    if (selectedFromSubOutletId) {
      rows = rows.filter(
        (r) =>
          String(r.fromSubOutletId) === String(selectedFromSubOutletId) ||
          r.raw?.fromSubOutletId === Number(selectedFromSubOutletId)
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
          return (
            itemStatus === 'CLOSED' ||
            itemStatus === 'RECEIVED' ||
            itemStatus === 'RECIEVED' ||
            itemStatus === 'PARTIALLYACCEPTED'
          );
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
    selectedToOutletId,
    selectedToSubOutletId,
    selectedFromOutletId,
    selectedFromSubOutletId,
    selectedUnitId,
    statusFilter,
    search,
  ]);

  // Transfer Accept Action -> Redirect to StockTransferRequest in receive mode
  const handleTransferAccept = (row) => {
    navigate(`/inventory/stock-transfer-request?id=${row.id}&mode=receive`, {
      state: {
        id: row.id,
        transferId: row.id,
        mode: 'receive',
        transfer: row.raw || row,
      },
    });
  };

  // Open FIFO Visualizer on Item Click
  const handleOpenVisualizer = (row) => {
    setSelectedVisualizerItem({
      transferItemId: row.transferItemId || row.id,
      itemId: row.primaryItemId,
      itemName: row.primaryItemName,
      fromOutletName: row.fromOutlet,
      toOutletName: row.toOutlet,
      transferQty: row.totalRequestedQuantity || 60,
      unit: row.unit || 'kg',
    });
    setVisualizerModalOpen(true);
  };

  const columns = useMemo(() => {
    const cols = [
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
        size: 85,
      },
      {
        id: 'fromOutlet',
        accessorFn: (row) => row.fromOutlet,
        header: ({ column }) => (
          <DataGridColumnHeader title="FROM OUTLET" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="font-semibold text-xs text-gray-900 truncate max-w-[155px]" title={row.original.fromOutlet}>{row.original.fromOutlet}</div>
            {row.original.fromSubOutlet && (
              <div className="text-[11px] text-gray-500 font-medium truncate max-w-[155px]" title={row.original.fromSubOutlet}>{row.original.fromSubOutlet}</div>
            )}
            {row.original.fromSubLocation && (
              <div className="text-[10px] text-blue-600 font-medium truncate max-w-[155px]" title={row.original.fromSubLocation}>↳ {row.original.fromSubLocation}</div>
            )}
          </div>
        ),
        enableSorting: false,
        size: 160,
      },
    ];

    // Show TO OUTLET column only for company and group users (not visible for outlet users)
    if (!isOutletUser) {
      cols.push({
        id: 'toOutlet',
        accessorFn: (row) => row.toOutlet,
        header: ({ column }) => (
          <DataGridColumnHeader title="TO OUTLET" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="font-semibold text-xs text-gray-900 truncate max-w-[155px]" title={row.original.toOutlet}>{row.original.toOutlet}</div>
            {row.original.toSubOutlet && (
              <div className="text-[11px] text-gray-500 font-medium truncate max-w-[155px]" title={row.original.toSubOutlet}>{row.original.toSubOutlet}</div>
            )}
            {row.original.toSubLocation && (
              <div className="text-[10px] text-blue-600 font-medium truncate max-w-[155px]" title={row.original.toSubLocation}>↳ {row.original.toSubLocation}</div>
            )}
          </div>
        ),
        enableSorting: false,
        size: 160,
      });
    }

    cols.push(
      {
        id: 'itemName',
        accessorFn: (row) => row.primaryItemName,
        header: ({ column }) => (
          <DataGridColumnHeader title="ITEM DESCRIPTION" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#0F172A] block truncate max-w-[105px]" title={row.original.primaryItemName}>
              {row.original.primaryItemName}
            </span>
            {row.original.itemsCount > 1 && (
              <span className="text-[10px] text-gray-400 font-medium">
                +{row.original.itemsCount - 1} more items
              </span>
            )}
          </div>
        ),
        enableSorting: false,
        size: 125,
      },
      {
        id: 'quantity',
        accessorFn: (row) => Number(row.totalRequestedQuantity || 0),
        header: ({ column }) => (
          <DataGridColumnHeader title="TRF QTY" column={column} className="text-xs font-bold" />
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
        id: 'acceptedQuantity',
        accessorFn: (row) => Number(row.totalAcceptedQuantity || 0),
        header: ({ column }) => (
          <DataGridColumnHeader title="RECV QTY" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <span className="font-bold text-xs text-emerald-700 whitespace-nowrap">
            {row.original.totalAcceptedQuantity > 0
              ? `${row.original.totalAcceptedQuantity} ${formatUnit(row.original.unit)}`
              : '—'}
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
          <div className="flex items-center whitespace-nowrap">
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
          const s = String(row.original.status || '').toUpperCase().replace(/[\s_-]/g, '');
          const isInTransit = s === 'INTRANSIT';

          return (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <button
                type="button"
                onClick={() =>
                  navigate(`/inventory/stock-transfer-detail/${row.original.id}`, {
                    state: row.original.raw || row.original,
                  })
                }
                className="p-1 text-gray-500 hover:text-[#084E92] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                title="View Transfer Details"
              >
                <Eye size={15} />
              </button>

              {isInTransit && (canEdit || canAdd) && (
                <button
                  type="button"
                  onClick={() => handleTransferAccept(row.original)}
                  className="p-1 text-[#084E92] hover:text-[#073e77] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                  title="Receive & Verify Stock"
                >
                  <CheckCircle2 size={15} />
                </button>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 75,
      }
    );

    return cols;
  }, [isOutletUser, canEdit, canAdd]);

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
    return <AccessDenied pageTitle="Stock Transfer Request Received" />;
  }

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        {/* Header */}
        <PageHeader
          title="Stock Transfer Request Receive Listing"
        />

        <PageErrorAlert
          error={scopeError || error}
          onRetry={scopeError ? retryScope : fetchReceiveTransfers}
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Incoming Transfers"
            value={stats.total}
            icon={ArrowDownLeft}
            iconBg="#EEF2FE"
            iconColor="#2952E3"
          />
          <StatCard
            label="In Transit"
            value={stats.inTransit}
            icon={Truck}
            iconBg="#FEF6E7"
            iconColor="#B7791F"
          />
          <StatCard
            label="Closed"
            value={stats.closed}
            icon={FileCheck}
            iconBg="#E7F7EE"
            iconColor="#14804A"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={AlertTriangle}
            iconBg="#FBEAEC"
            iconColor="#C0293D"
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
                placeholder="Search by transfer code, item, outlet, vehicle..."
              />
            </div>
            <div className="w-[160px] shrink-0">
              <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
            </div>
          </div>

          {/* Row 2: Location Filters */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOutletUser ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-2.5`}>
            {/* 1. From Outlet Dropdown: for all users (shows sibling outlets for outlet user, descendant outlets for company/group) */}
            <SearchableSelect
              name="fromOutlet"
              value={selectedFromOutletId}
              onChange={(e) => {
                setSelectedFromOutletId(e.target.value);
                setSelectedFromSubOutletId('');
              }}
              options={fromOutletOptions}
              placeholder="From Outlet..."
            />

            {/* 2. From Sub-Outlet: based on selected From Outlet */}
            <SearchableSelect
              name="fromSubOutlet"
              value={selectedFromSubOutletId}
              onChange={(e) => setSelectedFromSubOutletId(e.target.value)}
              options={fromSubOutletOptions}
              disabled={!selectedFromOutletId}
              placeholder={!selectedFromOutletId ? 'Select From Outlet' : 'From Sub-Outlet...'}
            />

            {/* 3. To Outlet Dropdown: only for Company & Group Users (Hidden for Outlet User) */}
            {!isOutletUser && (
              <SearchableSelect
                name="toOutlet"
                value={selectedToOutletId}
                onChange={(e) => {
                  setSelectedToOutletId(e.target.value);
                  setSelectedToSubOutletId('');
                }}
                options={displayOutletOptions}
                placeholder="To Outlet..."
              />
            )}

            {/* 4. To Sub-Outlet: based on effectiveOutletId for outlet users, or selectedToOutletId for others */}
            <SearchableSelect
              name="toSubOutlet"
              value={selectedToSubOutletId}
              onChange={(e) => setSelectedToSubOutletId(e.target.value)}
              options={toSubOutletOptions}
              disabled={!isOutletUser && !selectedToOutletId}
              placeholder={!isOutletUser && !selectedToOutletId ? 'Select To Outlet' : 'To Sub-Outlet...'}
            />
          </div>
        </div>

        {/* Table Card (Maximized height for comfortable viewing) */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden shadow-xs">
          {loading || scopeLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={18} className="animate-spin text-[#084E92]" />
              Loading incoming stock transfers…
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

        {/* FIFO Batch Flow Visualizer Modal */}
        {selectedVisualizerItem && (
          <FifoBatchVisualizerModal
            isOpen={visualizerModalOpen}
            onClose={() => {
              setVisualizerModalOpen(false);
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

export default StockTransferReqReceiveList;
