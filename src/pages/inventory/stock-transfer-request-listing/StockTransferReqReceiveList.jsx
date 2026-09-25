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
import SearchableSelect from '@/utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getTransferList, getAllSubOutlets, getOrganizationByType } from '@/services/apiServices';
import { OrgTypes } from '@/constants/orgTypes';
import FifoBatchVisualizerModal from '../stock-transfer/FifoBatchVisualizerModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

/* -------------------------------------------------------------------------
 * Status Styling Tokens (IN_TRANSIT, REJECTED, CLOSED)
 * ---------------------------------------------------------------------- */
const STATUS_STYLES = {
  IN_TRANSIT: 'bg-blue-50 text-blue-700 border-blue-200',
  'In Transit': 'bg-blue-50 text-blue-700 border-blue-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  CLOSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECIEVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Recieved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIALLY_ACCEPTED: 'bg-purple-50 text-purple-700 border-purple-200',
  'Partially Accepted': 'bg-purple-50 text-purple-700 border-purple-200',
};

const STATUS_DOT = {
  IN_TRANSIT: 'bg-blue-500',
  'In Transit': 'bg-blue-500',
  REJECTED: 'bg-rose-500',
  Rejected: 'bg-rose-500',
  CLOSED: 'bg-emerald-500',
  Closed: 'bg-emerald-500',
  RECEIVED: 'bg-emerald-500',
  Received: 'bg-emerald-500',
  RECIEVED: 'bg-emerald-500',
  Recieved: 'bg-emerald-500',
  PARTIALLY_ACCEPTED: 'bg-purple-500',
  'Partially Accepted': 'bg-purple-500',
};

const formatStatusLabel = (status) => {
  if (!status) return 'In Transit';
  const s = String(status).toUpperCase().replace(/[\s_]/g, '');
  if (s === 'INTRANSIT') return 'In Transit';
  if (s === 'REJECTED') return 'Rejected';
  if (s === 'CLOSED' || s === 'RECEIVED' || s === 'RECIEVED') return 'Closed';
  if (s === 'PARTIALLYACCEPTED') return 'Partially Accepted';
  return status;
};

const StatusBadge = ({ status = 'In Transit' }) => {
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
        <span className="text-lg sm:text-xl font-bold text-[#1B1B1F] mt-0.5">{value}</span>
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [sorting, setSorting] = useState([]);

  // Outlets, Sub-units & Filter states
  const [allOutlets, setAllOutlets] = useState([]);
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
    isOutletUser,
    isCompanyUser,
    units,
    selectedUnitId ,
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
        console.error('Failed to load outlets in Receive list:', err);
      }
    };
    fetchOutlets();
  }, []);

  // Load Sub-units
  useEffect(() => {
    const loadSubUnits = async () => {
      try {
        const res = await getAllSubOutlets();
        const raw = res?.data?.data || res?.data || [];
        setSubUnits(Array.isArray(raw) ? raw : []);
      } catch (err) {
        console.error('Failed to load sub-units in Receive list:', err);
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

  const fromOutletOptions = useMemo(() => {
    return displayOutletOptions.filter(
      (opt) => !isOutletUser || (effectiveOutletId && String(opt.value) !== String(effectiveOutletId))
    );
  }, [displayOutletOptions, isOutletUser, effectiveOutletId]);

  // From Sub-outlet options (dependent on selectedFromOutletId)
  const fromSubOutletOptions = useMemo(() => {
    if (!selectedFromOutletId) return [];
    return subUnits
      .filter((s) => String(s.organizationId) === String(selectedFromOutletId))
      .map((s) => ({
        value: String(s.id),
        label: s.subOutletName || s.name || `Sub-Outlet #${s.id}`,
      }));
  }, [subUnits, selectedFromOutletId]);

  // To Sub-outlet options: for outlet user based on effectiveOutletId; for others based on selectedToOutletId
  const toSubOutletOptions = useMemo(() => {
    const targetId = isOutletUser ? effectiveOutletId : selectedToOutletId;
    if (!targetId) return [];
    return subUnits
      .filter((s) => String(s.organizationId) === String(targetId))
      .map((s) => ({
        value: String(s.id),
        label: s.subOutletName || s.name || `Sub-Outlet #${s.id}`,
      }));
  }, [subUnits, isOutletUser, effectiveOutletId, selectedToOutletId]);

  // Fetch Receive Transfers from API
  const fetchReceiveTransfers = useCallback(async () => {
    setLoading(true);
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

      // Filter: only dispatched records (status != DRAFT and isDraft != true)
      const dispatchedList = list.filter((item) => {
        if (item.isDraft) return false;
        const s = String(item.status || '').toUpperCase().replace(/[\s_]/g, '');
        return s !== 'DRAFT';
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
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [isOutletUser, effectiveOutletId, selectedToOutletId, selectedFromOutletId, selectedUnitId]);

  useEffect(() => {
    if (!scopeLoading) {
      fetchReceiveTransfers();
    }
  }, [fetchReceiveTransfers, scopeLoading]);

  // Stat counts (IN_TRANSIT, CLOSED, REJECTED)
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
          return itemStatus === 'CLOSED' || itemStatus === 'RECEIVED' || itemStatus === 'RECIEVED';
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
        size: 140,
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
        size: 120,
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
          <div>
            <div className="font-semibold text-xs text-gray-900">{row.original.toOutlet}</div>
            {row.original.toSubOutlet && (
              <div className="text-[11px] text-gray-400 font-medium">{row.original.toSubOutlet}</div>
            )}
          </div>
        ),
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
          <div>
            <span className="text-xs font-bold text-[#0F172A] block truncate max-w-[200px]">
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
        size: 200,
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
        size: 130,
      },
      {
        id: 'acceptedQuantity',
        accessorFn: (row) => Number(row.totalAcceptedQuantity || 0),
        header: ({ column }) => (
          <DataGridColumnHeader title="ACCEPTED QTY" column={column} className="text-xs font-bold" />
        ),
        cell: ({ row }) => (
          <span className="font-bold text-xs text-emerald-700">
            {row.original.totalAcceptedQuantity > 0
              ? `${row.original.totalAcceptedQuantity} ${row.original.unit}`
              : '—'}
          </span>
        ),
        size: 130,
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
          const s = String(row.original.status || '').toUpperCase().replace(/[\s_-]/g, '');
          const isFinished =
            s === 'CLOSED' ||
            s === 'RECEIVED' ||
            s === 'RECIEVED' ||
            s === 'PARTIALLYACCEPTED' ||
            s === 'ACCEPTED' ||
            s === 'REJECTED' ||
            s === 'DRAFT';

          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <button
                type="button"
                onClick={() =>
                  navigate(`/inventory/stock-transfer-detail/${row.original.id}`, {
                    state: row.original.raw || row.original,
                  })
                }
                className="p-1.5 text-gray-500 hover:text-[#084E92] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                title="View Transfer Details"
              >
                <Eye size={16} />
              </button>

              {!isFinished && (canEdit || canAdd) && (
                <button
                  type="button"
                  onClick={() => handleTransferAccept(row.original)}
                  className="p-1.5 text-[#084E92] hover:text-[#073e77] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                  title="Transfer Accept"
                >
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 90,
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
      <div className="py-3 md:py-4 pb-6 space-y-4 md:space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span>Dashboard</span>
          <ChevronRight size={11} />
          <span>Inventory</span>
          <ChevronRight size={11} />
          <span className="text-[#084E92] font-semibold">Stock Transfer Request Receive</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#101828] font-sans leading-tight">
              Stock Transfer Request Receive Listing
            </h1>
          </div>
        </div>

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
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by transfer code, item, outlet, vehicle..."
                className="w-full h-9.5 pl-9 pr-3 rounded-xl border border-[#E7EAF0] bg-white text-xs font-medium text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
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
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none">
                <CardTable>
                  <ScrollArea className="max-h-[60vh] w-full">
                    <div className="min-w-[1250px]">
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
