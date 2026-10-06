import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronRight,
  Search,
  Eye,
  Filter,
  Calendar,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  CircleAlert,
  CircleCheck,
  CheckCircle2,
  FileText,
  Loader2,
  PackageCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import {
  getAllGrnDetailsByStatus,
  getAllGrns,
  getGrnByOutletOrStatus,
  getAllActiveSubOutlets,
  getAllActiveSubLocations,
  getPOByIdAndOpenItem,
} from '@/services/apiServices';
import SearchableSelect from '@/utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { CodeCell } from '@/components/common/CodeCell';
import { SearchBar } from '@/components/common/SearchBar';
import { getOrgIdFromToken } from '@/utils/auth';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const formatDate = (val) => {
  if (!val) return '—';
  const slashMatch = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d.padStart(2, '0')} ${monthName} ${y}`;
  }
  const parsed = new Date(val);
  if (isNaN(parsed.getTime())) return String(val).split(' ')[0] || val;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function UnitDropdown({ units, selectedUnitId, onChange }) {
  const options = [
    { value: '', label: 'All Outlets' },
    ...units.map((u) => ({ value: String(u.id), label: u.name })),
  ];
  return (
    <div className="min-w-[220px]">
      <SearchableSelect
        name="unit"
        value={selectedUnitId ? String(selectedUnitId) : ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        options={options}
        placeholder={units.length === 0 ? 'No outlets available' : 'All Outlets'}
        disabled={units.length === 0}
      />
    </div>
  );
}

const StatCard = ({ icon, iconBg = 'bg-[#D5E3FF]', iconColor = 'text-[#00376C]', label, value }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
    <div
      className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}
    >
      {icon}
    </div>
    <div className="flex flex-col items-end text-right">
      <span className="text-xs font-semibold text-[#00376C]">{label}</span>
      <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{value}</span>
    </div>
  </div>
);

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

const STATUS_MAP = {
  RETURN_REQUESTED: {
    label: 'Return Requested',
    color: 'text-amber-600',
  },
  RETURN_REPLACEMENT_REQUESTED: {
    label: 'Replacement Req.',
    color: 'text-blue-600',
  },
  RETURN_REPLACEMENT_COMPLETED: {
    label: 'Completed',
    color: 'text-emerald-600',
  },
  RETURNED: {
    label: 'Returned',
    color: 'text-amber-600',
  },
  REPLACED: {
    label: 'Replaced',
    color: 'text-blue-600',
  },
};

const StatusBadge = ({ status }) => {
  const normKey = String(status || '').toUpperCase().trim();
  const config = STATUS_MAP[normKey] || {
    label: status || 'Pending',
    color: 'text-gray-600',
  };

  return (
    <span className={`text-xs font-semibold whitespace-nowrap ${config.color}`}>
      {config.label}
    </span>
  );
};

const TruncatedCell = ({
  value,
  widthClass = 'max-w-[150px]',
  className = 'text-gray-600',
  onClick,
}) => (
  <span
    title={value}
    onClick={onClick}
    className={`block truncate ${widthClass} ${className}`}
  >
    {value}
  </span>
);

const ReturnReplacementList = () => {
  const navigate = useNavigate();
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Return and Replacement');
  const { canAdd: canGenerateGrn } = usePagePermissions('Generate GRN');

  const {
    loading: scopeLoading,
    error: scopeError,
    showUnitDropdown,
    units,
    selectedUnitId,
    setSelectedUnitId,
    effectiveOutletId,
    filterRowsByScope,
    retry: retryScope,
  } = useOrgScope();

  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});

  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchReturnReplacements = useCallback(async () => {
    if (scopeLoading || scopeError) return;
    setLoading(true);
    setError(null);
    try {
      const outletOrCompanyId = selectedUnitId && selectedUnitId !== 'ALL'
        ? Number(selectedUnitId)
        : (Number(effectiveOutletId) || Number(getOrgIdFromToken()) || 0);
      const statusParam = statusFilter === 'ALL' ? '' : statusFilter;

      // Fetch details, GRN headers, subOutlets and subLocations concurrently to enrich data
      const [res, grnsRes, subOutletsRes, subLocationsRes] = await Promise.all([
        getAllGrnDetailsByStatus(statusParam, outletOrCompanyId).catch(() => getAllGrnDetailsByStatus(statusParam, 0).catch(() => getAllGrnDetailsByStatus())),
        getGrnByOutletOrStatus(outletOrCompanyId, '').catch(() => getAllGrns().catch(() => null)),
        getAllActiveSubOutlets().catch(() => null),
        getAllActiveSubLocations().catch(() => null),
      ]);

      const raw = res?.data?.data ?? res?.data ?? res ?? [];
      const rawList = Array.isArray(raw) ? raw : [];

      const grnList = Array.isArray(grnsRes?.data?.data ?? grnsRes?.data) ? (grnsRes?.data?.data ?? grnsRes?.data) : [];
      const grnMapByCode = new Map();
      const grnMapById = new Map();
      grnList.forEach((g) => {
        if (g.grnCode) grnMapByCode.set(String(g.grnCode).trim().toLowerCase(), g);
        if (g.code) grnMapByCode.set(String(g.code).trim().toLowerCase(), g);
        if (g.id) grnMapById.set(Number(g.id), g);
      });

      const subOutletsList = Array.isArray(subOutletsRes?.data?.data ?? subOutletsRes?.data)
        ? (subOutletsRes?.data?.data ?? subOutletsRes?.data)
        : [];
      const subOutletsMap = new Map();
      subOutletsList.forEach((s) => {
        if (s.id) subOutletsMap.set(Number(s.id), s.subOutletName || s.name || '');
      });

      const subLocationsList = Array.isArray(subLocationsRes?.data?.data ?? subLocationsRes?.data)
        ? (subLocationsRes?.data?.data ?? subLocationsRes?.data)
        : [];
      const subLocationsMap = new Map();
      subLocationsList.forEach((l) => {
        if (l.id) subLocationsMap.set(Number(l.id), l.subLocationName || l.locationName || l.name || '');
      });

      const list = rawList.map((item, index) => {
        const rawStatus =
          item.returnReplacementStatus ||
          item.status ||
          (Number(item.rejectedQuantity || item.returnQuantity) > 0 ? 'RETURN_REQUESTED' : 'RETURN_REQUESTED');

        const matchedGrn =
          (item.grnCode ? grnMapByCode.get(String(item.grnCode).trim().toLowerCase()) : null) ||
          (item.grnId ? grnMapById.get(Number(item.grnId)) : null);

        const outletNameStr =
          item.outletName ||
          item.organizationName ||
          matchedGrn?.organizationName ||
          matchedGrn?.outletName ||
          item.purchaseOrder?.outletName ||
          item.purchaseOrder?.organizationName ||
          '';

        // Match unit from units list by name if outletId is not directly in item
        let matchedUnitId = undefined;
        if (outletNameStr && Array.isArray(units)) {
          const matched = units.find(
            (u) => (u.name || '').trim().toLowerCase() === outletNameStr.trim().toLowerCase()
          );
          if (matched) {
            matchedUnitId = Number(matched.id);
          }
        }

        const rawOutletId =
          item.outletId ??
          item.organizationId ??
          item.orgId ??
          matchedGrn?.orgId ??
          matchedGrn?.outletId ??
          item.purchaseOrder?.outletId ??
          item.purchaseOrder?.orgId ??
          item.grn?.orgId ??
          item.grn?.outletId ??
          item.purchaseOrder?.organizationId ??
          matchedUnitId;

        const rawSubOutletId =
          item.subOutletId ??
          item.subUnitId ??
          item.subOutlet?.id ??
          matchedGrn?.subOutletId ??
          matchedGrn?.subUnitId ??
          matchedGrn?.subOutlet?.id ??
          item.purchaseOrder?.subOutletId ??
          item.grn?.subOutletId ??
          null;

        const subOutletNameStr =
          item.subOutletName ||
          item.subUnitName ||
          item.locationName ||
          item.subOutlet?.subOutletName ||
          item.subOutlet?.name ||
          matchedGrn?.subOutletName ||
          matchedGrn?.subUnitName ||
          matchedGrn?.locationName ||
          matchedGrn?.subOutlet?.subOutletName ||
          matchedGrn?.subOutlet?.name ||
          (rawSubOutletId ? subOutletsMap.get(Number(rawSubOutletId)) : '') ||
          item.purchaseOrder?.subOutletName ||
          item.purchaseOrder?.subOutlet?.name ||
          item.grn?.subOutletName ||
          '';

        const rawSubLocationId =
          item.subLocationId ??
          item.subLocation?.id ??
          matchedGrn?.subLocationId ??
          matchedGrn?.subLocation?.id ??
          item.purchaseOrder?.subLocationId ??
          item.grn?.subLocationId ??
          null;

        const subLocationNameStr =
          item.subLocationName ||
          item.subLocation?.subLocationName ||
          item.subLocation?.locationName ||
          item.subLocation?.name ||
          matchedGrn?.subLocationName ||
          matchedGrn?.subLocation?.subLocationName ||
          matchedGrn?.subLocation?.locationName ||
          matchedGrn?.subLocation?.name ||
          (rawSubLocationId ? subLocationsMap.get(Number(rawSubLocationId)) : '') ||
          item.purchaseOrder?.subLocationName ||
          item.grn?.subLocationName ||
          '';

        const resolvedGrnId = item.grnId || item.grnHeaderId || item.grn?.id || matchedGrn?.id || item.oldGrnId;

        return {
          id: item.id || index + 1,
          grnDetailId: item.id,
          grnId: resolvedGrnId,
          grnCode: item.grnCode || item.grn?.grnCode || matchedGrn?.grnCode || (resolvedGrnId ? `GRN-#${resolvedGrnId}` : '—'),
          purchaseOrderId: item.purchaseOrderId || item.poId || item.purchaseOrder?.id || matchedGrn?.purchaseOrderId,
          poCode: item.purchaseOrderCode || item.poCode || item.purchaseOrder?.purchaseOrderCode || item.purchaseOrder?.poCode || (item.purchaseOrderId ? `PO-${item.purchaseOrderId}` : '—'),
          prCode: item.prcode || item.prCode || item.purchaseRequisitionCode || item.purchaseOrder?.prcode || '—',
          outletId: rawOutletId !== undefined && rawOutletId !== null ? Number(rawOutletId) : undefined,
          outlet: outletNameStr || (rawOutletId ? `Outlet #${rawOutletId}` : '—'),
          subOutletId: rawSubOutletId != null ? Number(rawSubOutletId) : null,
          subOutletName: subOutletNameStr,
          subLocationId: rawSubLocationId != null ? Number(rawSubLocationId) : null,
          subLocationName: subLocationNameStr,
          rawMaterialId: item.rawMaterialId,
          purchaseOrderDetailId: item.purchaseOrderDetailId,
          itemName: item.rawMaterialName || item.itemName || `Item #${item.rawMaterialId || index + 1}`,
          itemCode: item.rawMaterialCode || item.itemCode || item.hsnCode || `RM-${item.rawMaterialId || index + 1}`,
          uomName: item.uomName || item.unitName || item.uom || 'Unit',
          receivedQuantity: item.receivedQuantity ?? item.acceptedQuantity ?? 0,
          acceptedQuantity: item.acceptedQuantity ?? 0,
          rejectedQuantity: item.rejectedQuantity ?? item.returnQuantity ?? 0,
          returnQuantity: item.rejectedQuantity ?? item.returnQuantity ?? 0,
          status: rawStatus,
          rawStatus: rawStatus,
          remarks: item.remarks || '',
          grnDate: formatDate(item.grnDate || item.createdAt),
          poDate: formatDate(item.poDate || item.purchaseOrder?.poDate),
          raw: item,
        };
      });

      setRecords(list);
    } catch (err) {
      console.error('Failed to fetch return & replacement records:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load return & replacement records.');
    } finally {
      setLoading(false);
    }
  }, [scopeLoading, scopeError, selectedUnitId, effectiveOutletId, statusFilter, units]);

  useEffect(() => {
    if (!scopeLoading && !scopeError) {
      fetchReturnReplacements();
    }
  }, [fetchReturnReplacements, scopeLoading, scopeError]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [search, statusFilter, selectedUnitId]);

  const scopedRecords = records;

  const summary = useMemo(() => {
    const total = scopedRecords.length;
    const returnReq = scopedRecords.filter(
      (r) => String(r.status || '').toUpperCase() === 'RETURN_REQUESTED'
    ).length;
    const replacementReq = scopedRecords.filter(
      (r) => String(r.status || '').toUpperCase() === 'RETURN_REPLACEMENT_REQUESTED'
    ).length;
    const completed = scopedRecords.filter(
      (r) => String(r.status || '').toUpperCase() === 'RETURN_REPLACEMENT_COMPLETED'
    ).length;

    return {
      totalReturns: total,
      returnReq,
      replacementReq,
      completed,
    };
  }, [scopedRecords]);

  const filteredRecords = useMemo(() => {
    let rows = scopedRecords;
    if (statusFilter !== 'ALL') {
      rows = rows.filter(
        (r) => String(r.status || '').toUpperCase() === String(statusFilter).toUpperCase()
      );
    }
    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter(
        (r) =>
          (r.itemName || '').toLowerCase().includes(term) ||
          (r.itemCode || '').toLowerCase().includes(term) ||
          (r.prCode || '').toLowerCase().includes(term) ||
          (r.poCode || '').toLowerCase().includes(term) ||
          (r.grnCode || '').toLowerCase().includes(term) ||
          (r.outlet || '').toLowerCase().includes(term) ||
          (r.subOutletName || '').toLowerCase().includes(term) ||
          (r.subLocationName || '').toLowerCase().includes(term)
      );
    }
    return rows;
  }, [scopedRecords, search, statusFilter]);

  const [checkingPoId, setCheckingPoId] = useState(null);

  const handleAcceptReturn = async (row) => {
    const poId =
      row.purchaseOrderId ||
      row.poId ||
      row.raw?.purchaseOrderId ||
      (row.poCode ? Number(row.poCode.replace(/^.*-(\d+)$/, '$1')) : null);

    if (!poId) {
      toast.error('Purchase order ID not found for this return item.');
      return;
    }

    setCheckingPoId(row.id);
    try {
      const res = await getPOByIdAndOpenItem([Number(poId)]);
      const rawData = res?.data?.data ?? res?.data;
      if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
        const msg = res?.data?.message || res?.data?.msg || 'Purchase Order has no open items or is closed.';
        toast.error(msg);
        return;
      }

      const returnGrnDetailId = row.grnDetailId || row.id;
      const queryParams = new URLSearchParams({
        returnGrnDetailId: String(returnGrnDetailId),
        ...(row.purchaseOrderDetailId ? { purchaseOrderDetailId: String(row.purchaseOrderDetailId) } : {}),
        ...(row.rawMaterialId ? { rawMaterialId: String(row.rawMaterialId) } : {}),
        ...(row.returnQuantity !== undefined && row.returnQuantity !== null ? { returnQty: String(row.returnQuantity) } : {}),
        ...(row.grnCode && row.grnCode !== '—' ? { grnCode: String(row.grnCode) } : {}),
        ...(row.grnId ? { oldGrnId: String(row.grnId) } : {}),
      });

      // Navigate to Generate GRN passing return item parameters
      navigate(`/inventory/generate-grn/generate/${poId}?${queryParams.toString()}`, {
        state: {
          poIds: [Number(poId)],
          poId: Number(poId),
          returnGrnDetailId: returnGrnDetailId,
          purchaseOrderDetailId: row.purchaseOrderDetailId,
          rawMaterialId: row.rawMaterialId,
          returnQty: row.returnQuantity,
          grnCode: row.grnCode,
          oldGrnId: row.grnId,
          subOutletId: row.subOutletId,
          subOutletName: row.subOutletName,
          subLocationId: row.subLocationId,
          subLocationName: row.subLocationName,
          returnItem: row,
        },
      });
    } catch (err) {
      console.error('Failed to verify PO open items:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        err?.message ||
        'Purchase order is closed or has no open items.';
      toast.error(msg);
    } finally {
      setCheckingPoId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'sno',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="S.NO"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 py-2 text-xs">{String(row.index + 1).padStart(2, '0')}</span>
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: 'itemName',
        accessorFn: (row) => row.itemName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Item Description"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="py-1 max-w-[145px]">
            <div
              className="font-bold text-[#084E92] text-xs hover:underline cursor-pointer truncate"
              title={row.original.itemName}
            >
              {row.original.itemName}
            </div>
            {row.original.itemCode && (
              <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate" title={row.original.itemCode}>
                {row.original.itemCode}
              </div>
            )}
          </div>
        ),
        enableSorting: false,
        size: 145,
      },
      {
        id: 'grnCode',
        accessorFn: (row) => row.grnCode,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="GRN Code"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <CodeCell
            code={row.original.grnCode}
            maxWidth="max-w-[125px]"
          />
        ),
        enableSorting: false,
        size: 130,
      },
      {
        id: 'grnDate',
        accessorFn: (row) => row.grnDate,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="GRN Date"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.grnDate || '—'}
            widthClass="max-w-[85px]"
            className="text-gray-600 text-xs font-medium"
          />
        ),
        enableSorting: false,
        size: 85,
      },
      {
        id: 'outlet',
        accessorFn: (row) => row.outlet,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Outlet"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.outlet || '—'}
            widthClass="max-w-[130px]"
            className="text-gray-800 text-xs font-medium"
          />
        ),
        enableSorting: false,
        size: 135,
      },
      {
        id: 'subOutletName',
        accessorFn: (row) => row.subOutletName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Sub Outlet"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.subOutletName || '—'}
            widthClass="max-w-[115px]"
            className="text-gray-700 text-xs font-medium"
          />
        ),
        enableSorting: false,
        size: 120,
      },
      {
        id: 'subLocationName',
        accessorFn: (row) => row.subLocationName,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Sub Location"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.subLocationName || '—'}
            widthClass="max-w-[110px]"
            className="text-gray-700 text-xs font-medium"
          />
        ),
        enableSorting: false,
        size: 115,
      },
      {
        id: 'returnQuantity',
        accessorFn: (row) => row.returnQuantity,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Return Qty"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1 whitespace-nowrap text-xs">
            <span className="font-semibold text-gray-900">{row.original.returnQuantity || 0}</span>
            <span className="text-[11px] text-gray-500 font-medium">{formatUnit(row.original.uomName)}</span>
          </div>
        ),
        enableSorting: false,
        size: 80,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Status"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap pr-1">
            <StatusBadge status={row.original.status} />
          </div>
        ),
        enableSorting: false,
        size: 115,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Action"
            column={column}
            className="text-[#43474F] font-semibold uppercase text-xs"
          />
        ),
        cell: ({ row }) => {
          const normStatus = String(row.original.status || '').toUpperCase().trim();

          if (normStatus === 'RETURN_REPLACEMENT_REQUESTED') {
            const hasPermissionToAccept = canAdd || canEdit || canGenerateGrn;
            if (!hasPermissionToAccept) {
              return (
                <span className="text-gray-400 text-xs">—</span>
              );
            }

            return (
              <div className="flex items-center whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleAcceptReturn(row.original)}
                  disabled={checkingPoId === row.original.id}
                  className="text-[#084E92] hover:text-[#063d73] cursor-pointer p-1 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                  title="Generate GRN for Replacement Item"
                >
                  {checkingPoId === row.original.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileText size={16} />
                  )}
                </button>
              </div>
            );
          }

          return (
            <span className="text-gray-400 text-xs pl-2 font-medium">—</span>
          );
        },
        enableSorting: false,
        size: 55,
      },
    ],
    [navigate, canAdd, canEdit, canGenerateGrn, checkingPoId]
  );

  const table = useReactTable({
    data: filteredRecords,
    columns,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Return and Replacement" />;
  }

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        <PageHeader
          title="Return & Replacement Listing"
        />

        <PageErrorAlert
          error={scopeError || error}
          onRetry={scopeError ? retryScope : fetchReturnReplacements}
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<RotateCcw size={18} />}
            iconBg="bg-[#D5E3FF]"
            iconColor="text-[#00376C]"
            label="Total Returns"
            value={summary.totalReturns}
          />
          <StatCard
            icon={<ArrowUpRight size={18} />}
            iconBg="bg-[#FEF3C7]"
            iconColor="text-[#B45309]"
            label="Return Requested"
            value={summary.returnReq}
          />
          <StatCard
            icon={<RotateCcw size={18} />}
            iconBg="bg-[#E0E7FF]"
            iconColor="text-[#4338CA]"
            label="Replacement Requested"
            value={summary.replacementReq}
          />
          <StatCard
            icon={<CircleCheck size={18} />}
            iconBg="bg-[#DCFCE7]"
            iconColor="text-[#15803D]"
            label="Completed"
            value={summary.completed}
          />
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <SearchBar
              placeholder="Search by Item, PR, PO, GRN, or Outlet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {showUnitDropdown && (
              <UnitDropdown
                units={units}
                selectedUnitId={selectedUnitId}
                onChange={setSelectedUnitId}
              />
            )}

            <div className="relative min-w-[180px]">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 w-full pl-8 pr-7 rounded-xl border border-[#C3C6D1] bg-white text-xs font-semibold text-gray-800 outline-none focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/15 transition cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="RETURN_REPLACEMENT_REQUESTED">Replacement Requested</option>
                <option value="RETURN_REQUESTED">Return Requested</option>
                <option value="RETURN_REPLACEMENT_COMPLETED">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
          {loading && (
            <div className="p-8 text-center flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#084E92]" />
              Loading records...
            </div>
          )}

          {!loading && (
            <DataGrid
              table={table}
              recordCount={filteredRecords.length}
              className="rounded-2xl"
              tableLayout={{
                dense: true,
                width: 'fixed',
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-2xl border-0 shadow-none bg-transparent">
                <CardTable className="w-full overflow-x-hidden">
                  <DataGridTable />
                </CardTable>
                <CardFooter className="bg-[#F8FAFC] border-t border-[#E2E8F0] rounded-b-2xl py-2.5">
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

export default ReturnReplacementList;

