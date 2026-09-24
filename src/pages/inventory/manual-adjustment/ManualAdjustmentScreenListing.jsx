import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Search,
  ChevronRight,
  Eye,
  Plus,
  Filter,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardTable, CardFooter } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { Link, useNavigate } from 'react-router';
import SearchableSelect from '@/utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import {
  getAdjustmentList,
  getAllSubOutlets,
  getOrganizationByType,
  postAdjustment,
  postBulkAdjustment,
  cancelAdjustment,
} from '@/services/apiServices';
import { OrgTypes } from '@/constants/orgTypes';
import { getOrgIdFromToken, getUserIdFromToken } from '@/utils/auth';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

/* Helper to safely extract string from SearchableSelect event or string */
const extractValue = (e) => {
  if (e && typeof e === 'object' && e.target) {
    return e.target.value !== undefined ? String(e.target.value) : '';
  }
  return e !== undefined && e !== null ? String(e) : '';
};

/* ---------- Badges & UI helpers (Matching PurchaseRequisitionList) ---------- */

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-700',
  Draft: 'bg-gray-100 text-gray-700',
  POSTED: 'bg-emerald-50 text-emerald-600',
  Posted: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-rose-50 text-rose-600',
  Cancelled: 'bg-rose-50 text-rose-600',
  CANCELED: 'bg-rose-50 text-rose-600',
};

const STATUS_DOT = {
  DRAFT: 'bg-gray-400',
  POSTED: 'bg-emerald-500',
  CANCELLED: 'bg-rose-500',
  CANCELED: 'bg-rose-500',
};

const StatusBadge = ({ status = 'DRAFT', size = 'sm' }) => {
  const raw = String(status || 'DRAFT').toUpperCase();
  const displayLabel =
    raw === 'DRAFT'
      ? 'Draft'
      : raw === 'POSTED'
      ? 'Posted'
      : raw === 'CANCELLED' || raw === 'CANCELED'
      ? 'Cancelled'
      : status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${
        size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'
      } ${STATUS_STYLES[raw] || 'bg-gray-100 text-gray-500'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[raw] || 'bg-gray-400'}`} />
      {displayLabel}
    </span>
  );
};

const TruncatedCell = ({
  value,
  widthClass = 'max-w-[180px]',
  className = 'text-gray-600 text-xs',
}) => (
  <span title={value} className={`block truncate ${widthClass} ${className}`}>
    {value}
  </span>
);

const UNIT_BADGE_STYLES = {
  MT: 'bg-gray-100 text-gray-700 border-gray-200',
  PCS: 'bg-blue-50 text-[#084E92] border-blue-200',
  PIECES: 'bg-blue-50 text-[#084E92] border-blue-200',
  BOX: 'bg-amber-50 text-amber-700 border-amber-200',
  KG: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  KILOGRAM: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  KILOGRAMS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LTR: 'bg-purple-50 text-purple-700 border-purple-200',
  LITRE: 'bg-purple-50 text-purple-700 border-purple-200',
  LITRES: 'bg-purple-50 text-purple-700 border-purple-200',
  MTR: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  METER: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  METERS: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  GRAM: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  GRAMS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  G: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const UnitBadge = ({ unit }) => {
  const label = unit || 'Units';
  const key = String(label).toUpperCase().trim();
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-mono font-medium uppercase border whitespace-nowrap ${
        UNIT_BADGE_STYLES[key] || 'bg-gray-100 text-gray-600 border-gray-200'
      }`}
    >
      {label}
    </span>
  );
};

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

/* Single unified adjustment delta cell */
const AdjustmentDeltaCell = ({ delta }) => {
  if (delta === null || delta === undefined || isNaN(delta)) {
    return <span className="text-gray-400 text-xs font-mono">—</span>;
  }
  const num = Number(delta);
  const formatted = Math.abs(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (num > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
        +{formatted}
      </span>
    );
  }
  if (num < 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
        -{formatted}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium font-mono bg-gray-50 text-gray-500 border border-gray-200 whitespace-nowrap">
      0.00
    </span>
  );
};

const PAGE_SIZE = 10;

const ManualAdjustmentScreenListing = () => {
  const navigate = useNavigate();

  // Permissions
  const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Manual Adjustment');

  // Role Scoping
  const {
    loading: scopeLoading,
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    units: scopeUnits,
    effectiveOutletId,
  } = useOrgScope();

  // Filter States
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [selectedSubOutletId, setSelectedSubOutletId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);

  // Auxiliary dropdown data
  const [allOutlets, setAllOutlets] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [subUnitsLoading, setSubUnitsLoading] = useState(false);

  // Table Data & Loading
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postingId, setPostingId] = useState(null);
  const [bulkPosting, setBulkPosting] = useState(false);

  // Selection state for draft bulk operations
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  // Cancellation Modal state
  const [cancellingItem, setCancellingItem] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Auto-set Outlet for Outlet User once scope is resolved
  useEffect(() => {
    if (!scopeLoading) {
      if (isOutletUser) {
        const orgId = effectiveOutletId || getOrgIdFromToken();
        if (orgId) {
          setSelectedOutletId(String(orgId));
        }
      } else {
        setSelectedOutletId('');
        setSelectedSubOutletId('');
      }
    }
  }, [isOutletUser, effectiveOutletId, scopeLoading]);

  /* 1. Fetch Outlets */
  useEffect(() => {
    const fetchOutlets = async () => {
      setUnitsLoading(true);
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
        console.error('Failed to load outlets:', err);
        setAllOutlets([]);
      } finally {
        setUnitsLoading(false);
      }
    };
    fetchOutlets();
  }, []);

  /* 2. Fetch Sub-Outlets */
  useEffect(() => {
    const fetchSubUnits = async () => {
      setSubUnitsLoading(true);
      try {
        const res = await getAllSubOutlets();
        const raw = res?.data?.data || res?.data?.content || res?.data || [];
        const list = Array.isArray(raw) ? raw : [];
        const mapped = list.map((item) => ({
          id: item.id,
          name: item.subOutletName || item.name || `Sub-Outlet #${item.id}`,
          code: item.subOutletCode || item.code || '',
          organizationId: item.organizationId ?? item.outletId ?? item.outlet?.id,
          status: item.status || (item.isActive !== false ? 'active' : 'inactive'),
        }));
        setSubUnits(mapped);
      } catch (err) {
        console.error('Failed to load sub-outlets:', err);
        setSubUnits([]);
      } finally {
        setSubUnitsLoading(false);
      }
    };
    fetchSubUnits();
  }, []);

  /* Outlet Options based on Role Scope */
  const outletOptions = useMemo(() => {
    if (isCompanyUser) {
      return (scopeUnits || []).map((u) => ({
        value: String(u.id),
        label: `${u.name}${u.code ? ` (${u.code})` : ''}`,
      }));
    }
    if (scopeUnits && scopeUnits.length > 0) {
      return scopeUnits.map((u) => ({
        value: String(u.id),
        label: `${u.name}${u.code ? ` (${u.code})` : ''}`,
      }));
    }
    return allOutlets.map((unit) => ({
      value: String(unit.id),
      label: `${unit.name}${unit.code ? ` (${unit.code})` : ''}`,
    }));
  }, [isCompanyUser, scopeUnits, allOutlets]);

  /* Sub-Outlet Options based on active Outlet */
  const subOutletOptions = useMemo(() => {
    const targetOutletId = isOutletUser
      ? String(effectiveOutletId || getOrgIdFromToken() || selectedOutletId)
      : String(selectedOutletId);

    if (!targetOutletId) return [];

    return subUnits
      .filter(
        (sub) =>
          sub.status === 'active' &&
          String(sub.organizationId) === String(targetOutletId)
      )
      .map((sub) => ({
        value: String(sub.id),
        label: `${sub.name}${sub.code ? ` (${sub.code})` : ''}`,
      }));
  }, [subUnits, selectedOutletId, isOutletUser, effectiveOutletId]);

  /* 3. Fetch Adjustment List from API */
  const fetchAdjustments = useCallback(async () => {
    if (scopeLoading) return;

    const activeOrgId = isOutletUser
      ? (effectiveOutletId || getOrgIdFromToken() || selectedOutletId)
      : selectedOutletId;

    // For Group or Company user, don't call API until an outlet is selected
    if (!isOutletUser && !activeOrgId) {
      setAdjustments([]);
      setTotalRecords(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = {
        page: pagination.pageIndex,
        size: pagination.pageSize,
      };
      if (activeOrgId) params.organizationId = Number(activeOrgId);
      if (selectedSubOutletId) {
        params.subOutletId = Number(selectedSubOutletId);
        params.suboutletId = Number(selectedSubOutletId);
      }
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await getAdjustmentList(params);
      const rawData = res?.data?.data ?? res?.data;
      const list = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.content)
        ? rawData.content
        : Array.isArray(rawData?.list)
        ? rawData.list
        : [];

      const total =
        rawData?.totalElements ??
        rawData?.total ??
        (Array.isArray(rawData) ? rawData.length : list.length);
      setTotalRecords(total);

      // Parse records based on swagger / backend schema
      const mapped = list.map((item, idx) => {
        const actual = Number(
          item.currentStock ??
          item.actualStock ??
          item.previousStock ??
          item.opbStock ??
          0
        );
        const rawQty = Number(
          item.adjustmentQuantity ??
          item.quantity ??
          0
        );
        const adjTypeStr = String(item.adjustmentType || '').trim().toUpperCase();
        const isDeduction =
          adjTypeStr === 'DEDUCTION' ||
          adjTypeStr === 'SUBTRACTION' ||
          adjTypeStr === 'DECREASE' ||
          rawQty < 0;

        const delta = isDeduction ? -Math.abs(rawQty) : Math.abs(rawQty);

        const physical = Number(
          item.afterAdjustmentStock ??
          item.physicalStock ??
          (actual != null ? actual + delta : delta)
        );

        return {
          id: item.id || idx + 1,
          adjustmentCode: item.adjustmentCode || `ADJ-${item.id || idx + 1}`,
          adjustmentDate:
            item.adjustmentDate ||
            item.manageDate ||
            item.createdAt?.slice(0, 10) ||
            '—',
          organizationId: item.organizationId,
          organizationName: item.organizationName || '',
          organizationCode: item.organizationCode || '',
          subOutletId: item.subOutletId,
          subOutletName: item.subOutletName || '',
          itemType: item.itemType || 'RAW_MATERIAL',
          itemId: item.itemId || item.id,
          itemName: item.itemName || `Item #${item.itemId || item.id || idx + 1}`,
          sku: item.sku || item.itemCode || '',
          unit: item.unitName || item.unitSymbol || item.unit || 'Units',
          unitSymbol: item.unitSymbol || '',
          adjustmentType: isDeduction ? 'DEDUCTION' : 'ADDITION',
          quantity: Math.abs(rawQty),
          actualStock: actual,
          currentStock: actual,
          physicalStock: physical,
          afterAdjustmentStock: physical,
          adjustmentQuantity: delta,
          rawAdjustmentQuantity: Math.abs(rawQty),
          status: String(item.status || 'DRAFT').toUpperCase(),
          remarks: item.remarks || item.reason || '—',
          unitRate: Number(item.unitRate || 0),
          totalAmount: Number(item.totalAmount || 0),
          createdAt: item.createdAt || '',
          createdBy: item.createdBy || null,
          createdByName: item.createdByName || '',
          updatedAt: item.updatedAt || '',
          updatedBy: item.updatedBy || null,
          updatedByName: item.updatedByName || '',
        };
      });

      setAdjustments(mapped);
    } catch (err) {
      console.warn('Could not fetch live adjustments from API:', err);
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  }, [
    scopeLoading,
    pagination.pageIndex,
    pagination.pageSize,
    selectedOutletId,
    selectedSubOutletId,
    statusFilter,
    search,
    isOutletUser,
    effectiveOutletId,
  ]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  /* Filter adjustments locally for responsive search & status matching */
  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((row) => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) {
        return false;
      }
      if (selectedSubOutletId && String(row.subOutletId) !== String(selectedSubOutletId)) {
        return false;
      }
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (
        row.itemName?.toLowerCase().includes(term) ||
        row.remarks?.toLowerCase().includes(term) ||
        row.adjustmentCode?.toLowerCase().includes(term) ||
        row.subOutletName?.toLowerCase().includes(term)
      );
    });
  }, [search, statusFilter, selectedSubOutletId, adjustments]);

  /* Clear all filters handler */
  const handleClearFilters = () => {
    setSearch('');
    setSelectedSubOutletId('');
    setStatusFilter('ALL');
    if (!isOutletUser) {
      setSelectedOutletId('');
    }
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      selectedSubOutletId ||
      statusFilter !== 'ALL' ||
      (!isOutletUser && selectedOutletId)
  );

  /* Single Post Handler */
  const handlePost = useCallback(
    async (id) => {
      if (!id) return;
      setPostingId(id);
      try {
        const currentUserId = getUserIdFromToken();
        await postAdjustment(id, currentUserId);
        toast.success('Adjustment posted successfully');
        setSelectedRowIds((prev) => prev.filter((item) => item !== id));
        await fetchAdjustments();
      } catch (err) {
        console.error('Failed to post adjustment:', err);
        const errMsg =
          err?.response?.data?.message ||
          err?.response?.data?.msg ||
          'Failed to post adjustment';
        toast.error(errMsg);
      } finally {
        setPostingId(null);
      }
    },
    [fetchAdjustments]
  );

  /* Bulk Post Handler */
  const handleBulkPost = useCallback(async () => {
    const draftIds = selectedRowIds.filter((id) => {
      const item = adjustments.find((a) => a.id === id);
      return item && String(item.status).toUpperCase() === 'DRAFT';
    });

    if (draftIds.length === 0) {
      toast.error('Please select at least one draft adjustment to post');
      return;
    }

    setBulkPosting(true);
    try {
      const currentUserId = getUserIdFromToken();
      try {
        await postBulkAdjustment({
          ids: draftIds,
          adjustmentIds: draftIds,
          userId: currentUserId,
        });
        toast.success(`${draftIds.length} adjustment(s) posted successfully in bulk`);
      } catch (bulkErr) {
        console.warn('postBulkAdjustment failed, attempting individual post fallback:', bulkErr);
        let successCount = 0;
        for (const id of draftIds) {
          try {
            await postAdjustment(id, currentUserId);
            successCount++;
          } catch (e) {
            console.error(`Failed to post adjustment #${id}:`, e);
          }
        }
        if (successCount > 0) {
          toast.success(`${successCount} of ${draftIds.length} adjustment(s) posted successfully`);
        } else {
          throw bulkErr;
        }
      }
      setSelectedRowIds([]);
      await fetchAdjustments();
    } catch (err) {
      console.error('Failed to post bulk adjustments:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        'Failed to post bulk adjustments';
      toast.error(errMsg);
    } finally {
      setBulkPosting(false);
    }
  }, [selectedRowIds, adjustments, fetchAdjustments]);

  /* Cancel Modal Handlers */
  const handleOpenCancelModal = useCallback((item) => {
    setCancellingItem(item);
    setCancelReason('');
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (!cancellingItem) return;
    if (!cancelReason.trim()) {
      toast.error('Please enter a reason for cancellation');
      return;
    }

    setCancelling(true);
    try {
      const currentUserId = getUserIdFromToken();
      await cancelAdjustment(cancellingItem.id, {
        userId: currentUserId,
        reason: cancelReason.trim(),
      });
      toast.success('Adjustment voucher cancelled successfully');
      setCancellingItem(null);
      setCancelReason('');
      setSelectedRowIds((prev) => prev.filter((id) => id !== cancellingItem.id));
      await fetchAdjustments();
    } catch (err) {
      console.error('Failed to cancel adjustment:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        'Failed to cancel adjustment';
      toast.error(errMsg);
    } finally {
      setCancelling(false);
    }
  }, [cancellingItem, cancelReason, fetchAdjustments]);

  /* Columns definition with styling matching PurchaseRequisitionList.jsx */
  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => {
          const draftRows = table.getRowModel().rows.filter(
            (r) => String(r.original.status).toUpperCase() === 'DRAFT'
          );
          const isAllSelected =
            draftRows.length > 0 &&
            draftRows.every((r) => selectedRowIds.includes(r.original.id));
          const isSomeSelected =
            draftRows.some((r) => selectedRowIds.includes(r.original.id)) && !isAllSelected;

          return (
            <div className="flex items-center justify-center p-1">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeSelected;
                }}
                disabled={draftRows.length === 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    const draftIds = draftRows.map((r) => r.original.id);
                    setSelectedRowIds((prev) => Array.from(new Set([...prev, ...draftIds])));
                  } else {
                    const draftIds = new Set(draftRows.map((r) => r.original.id));
                    setSelectedRowIds((prev) => prev.filter((id) => !draftIds.has(id)));
                  }
                }}
                className="w-4 h-4 rounded text-[#084E92] focus:ring-[#084E92] border-gray-300 cursor-pointer disabled:opacity-30"
                title="Select all draft adjustments"
              />
            </div>
          );
        },
        cell: ({ row }) => {
          const isDraft = String(row.original.status).toUpperCase() === 'DRAFT';
          const isSelected = selectedRowIds.includes(row.original.id);

          if (!isDraft) {
            return <div className="w-4 h-4" />;
          }

          return (
            <div className="flex items-center justify-center p-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRowIds((prev) => [...prev, row.original.id]);
                  } else {
                    setSelectedRowIds((prev) => prev.filter((id) => id !== row.original.id));
                  }
                }}
                className="w-4 h-4 rounded text-[#084E92] focus:ring-[#084E92] border-gray-300 cursor-pointer"
              />
            </div>
          );
        },
        enableSorting: false,
        size: 45,
      },
      {
        id: 'srNo',
        header: ({ column }) => (
          <DataGridColumnHeader title="SR. NO." column={column} className="text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 font-mono text-xs">
            {String(row.index + 1).padStart(2, '0')}
          </span>
        ),
        enableSorting: false,
        size: 70,
      },
      {
        id: 'itemName',
        accessorFn: (row) => row.itemName,
        header: ({ column }) => (
          <DataGridColumnHeader title="ITEM NAME" column={column} className="text-xs" />
        ),
        cell: ({ row }) => (
          <div>
            <span className="font-semibold text-[#084E92] block text-xs">
              {row.original.itemName}
            </span>
            {row.original.subOutletName && (
              <span className="text-[11px] text-gray-400 block truncate max-w-[200px]">
                {row.original.subOutletName}
              </span>
            )}
          </div>
        ),
        size: 210,
      },
      {
        id: 'manageDate',
        accessorFn: (row) => row.adjustmentDate,
        sortingFn: (rowA, rowB, columnId) => {
          const valA = parseDateToTimestamp(rowA.getValue(columnId) || rowA.original.createdAt);
          const valB = parseDateToTimestamp(rowB.getValue(columnId) || rowB.original.createdAt);
          return valA - valB;
        },
        header: ({ column }) => (
          <DataGridColumnHeader title="MANAGE DATE" column={column} className="text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell value={row.original.adjustmentDate} widthClass="max-w-[120px]" />
        ),
        size: 130,
      },
      {
        id: 'unit',
        accessorFn: (row) => row.unit,
        header: ({ column }) => (
          <DataGridColumnHeader title="UNIT" column={column} className="text-xs" />
        ),
        cell: ({ row }) => <UnitBadge unit={row.original.unit} />,
        size: 140,
      },
      {
        id: 'actualStock',
        accessorFn: (row) => row.actualStock,
        header: ({ column }) => (
          <DataGridColumnHeader title="ST BEFORE ADJ" column={column} className="text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-700 text-xs font-mono font-medium">
            {Number(row.original.actualStock || 0).toLocaleString('en-IN', {
               minimumFractionDigits: 2,
               maximumFractionDigits: 2,
             })}
          </span>
        ),
        size: 140,
      },
      {
        id: 'unitRate',
        accessorFn: (row) => row.unitRate,
        header: ({ column }) => (
          <DataGridColumnHeader title="RATE (₹)" column={column} className="text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-800 text-xs font-mono font-medium">
            ₹{Number(row.original.unitRate || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
        size: 110,
      },
      {
        id: 'physicalStock',
        accessorFn: (row) => row.physicalStock,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="ST AFTER ADJ"
            column={column}
            className="text-xs"
          />
        ),
        cell: ({ row }) => (
          <span className="text-gray-900 text-xs font-mono font-semibold">
            {Number(row.original.physicalStock || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
        size: 140,
      },
      {
        id: 'adjustment',
        accessorFn: (row) => row.adjustmentQuantity,
        header: ({ column }) => (
          <DataGridColumnHeader title="ADJUSTMENT" column={column} className="text-xs" />
        ),
        cell: ({ row }) => (
          <AdjustmentDeltaCell delta={row.original.adjustmentQuantity} />
        ),
        size: 130,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="text-xs" />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        size: 120,
      },
      {
        id: 'remarks',
        accessorFn: (row) => row.remarks,
        header: ({ column }) => (
          <DataGridColumnHeader title="REMARKS" column={column} className="text-xs" />
        ),
        cell: ({ row }) => (
          <TruncatedCell
            value={row.original.remarks || '—'}
            widthClass="max-w-[150px]"
          />
        ),
        size: 150,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTIONS" column={column} className="text-xs" />
        ),
        cell: ({ row }) => {
          const statusUpper = String(row.original.status).toUpperCase();
          const isDraft = statusUpper === 'DRAFT';

          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <button
                type="button"
                onClick={() => navigate(`/inventory/manual-adjustment/view/${row.original.id}`)}
                className="text-gray-500 hover:text-green-600 cursor-pointer p-1 rounded hover:bg-green-50 transition"
                title="View Voucher"
              >
                <Eye size={17} />
              </button>
              {isDraft && (canEdit || canAdd) && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePost(row.original.id)}
                    disabled={postingId === row.original.id}
                    className="text-[#084E92] hover:text-[#073e77] cursor-pointer p-1 rounded hover:bg-blue-50 transition disabled:opacity-50"
                    title="Post Adjustment"
                  >
                    {postingId === row.original.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenCancelModal(row.original)}
                    className="text-gray-400 hover:text-rose-600 cursor-pointer p-1 rounded hover:bg-rose-50 transition"
                    title="Cancel Adjustment"
                  >
                    <XCircle size={17} />
                  </button>
                </>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 110,
      },
    ],
    [navigate, postingId, canEdit, canAdd, selectedRowIds, handlePost, handleOpenCancelModal]
  );

  const table = useReactTable({
    data: filteredAdjustments,
    columns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Manual Adjustment" />;
  }

  return (
    <Container>
      <div className="py-3 md:py-4 pb-6 space-y-4 md:space-y-5">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span>Dashboard</span>
          <ChevronRight size={11} />
          <span>Inventory</span>
          <ChevronRight size={11} />
          <span className="text-[#084E92] font-semibold">Manual Adjustment List</span>
        </div>

        {/* Header Title + Action Button */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <h1
              className="text-xl md:text-2xl font-bold text-[#101828] leading-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Manual Adjustment List
            </h1>
            <p className="text-[#667085] text-xs max-w-xl">
              Review and track raw material inventory physical audit reconciliations.
            </p>
          </div>
          {canAdd && (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/inventory/manual-adjustment/create"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white bg-[#084E92] text-xs font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Adjustment
              </Link>
            </div>
          )}
        </div>

        {/* Filter Toolbar (Aligned in single row like PurchaseRequisitionList) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item, remarks, code..."
              className="w-full h-9.5 pl-9 pr-3 rounded-xl border border-[#E7EAF0] bg-white text-xs text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
            />
          </div>

          {!isOutletUser && (
            <div className="min-w-[200px]">
              <SearchableSelect
                name="outlet"
                options={outletOptions}
                value={selectedOutletId}
                onChange={(e) => {
                  const val = extractValue(e);
                  setSelectedOutletId(val);
                  setSelectedSubOutletId('');
                }}
                placeholder={unitsLoading ? 'Loading outlets...' : 'Select outlet...'}
                disabled={unitsLoading}
                isClearable={true}
              />
            </div>
          )}

          <div className="min-w-[190px]">
            <SearchableSelect
              name="subOutlet"
              options={subOutletOptions}
              value={selectedSubOutletId}
              onChange={(e) => setSelectedSubOutletId(extractValue(e))}
              placeholder={
                !selectedOutletId && !isOutletUser
                  ? 'Select an outlet first...'
                  : subUnitsLoading
                  ? 'Loading sub-outlets...'
                  : 'Select sub-outlet...'
              }
              disabled={(!selectedOutletId && !isOutletUser) || subUnitsLoading}
              isClearable={true}
            />
          </div>

          <div className="relative min-w-[150px]">
            <Filter
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9.5 w-full pl-8 pr-7 rounded-xl border border-[#E7EAF0] bg-white text-xs font-semibold text-[#101828] appearance-none focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="POSTED">Posted</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer px-1.5 py-0.5"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Bulk Actions Banner */}
        {selectedRowIds.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50/90 border border-blue-200 rounded-xl px-4 py-2.5 shadow-2xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#084E92] text-white flex items-center justify-center font-bold text-[11px]">
                {selectedRowIds.length}
              </div>
              <div>
                <p className="text-xs font-bold text-[#0F172A]">
                  {selectedRowIds.length} Draft Adjustment{selectedRowIds.length > 1 ? 's' : ''} Selected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedRowIds([])}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer shadow-2xs"
              >
                Deselect
              </button>
              <button
                type="button"
                onClick={handleBulkPost}
                disabled={bulkPosting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] rounded-lg transition shadow-2xs cursor-pointer disabled:opacity-60"
              >
                {bulkPosting ? <Loader2 size={13} className="animate-spin" /> : <Layers size={13} />}
                Post Bulk ({selectedRowIds.length})
              </button>
            </div>
          </div>
        )}

        {/* Data Grid Table (Maximized height for comfortable viewing) */}
        <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden shadow-xs">
          {loading || scopeLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading manual adjustments…
            </div>
          ) : !isOutletUser && !selectedOutletId ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center mb-2">
                <Filter size={18} />
              </div>
              <h3 className="text-xs font-bold text-gray-800">Please Select an Outlet</h3>
              <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm">
                Manual stock adjustments are outlet-specific. Choose an outlet from the filter above to view records.
              </p>
            </div>
          ) : (
            <DataGrid
              table={table}
              recordCount={filteredAdjustments.length}
              className="rounded-2xl"
              tableLayout={{
                width: 'fixed',
                cellBorder: true,
                headerBorder: true,
                rowBorder: true,
              }}
            >
              <Card className="rounded-t-none border-t-0 rounded-2xl shadow-none">
                <CardTable>
                  <ScrollArea className="max-h-[60vh] w-full">
                    <div className="min-w-[1300px]">
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

        {/* Cancellation Reason Modal Dialog */}
        <Dialog
          open={Boolean(cancellingItem)}
          onOpenChange={(open) => {
            if (!open) {
              setCancellingItem(null);
              setCancelReason('');
            }
          }}
        >
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900">
                    Cancel Stock Adjustment
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 mt-0.5">
                    Voucher #{cancellingItem?.adjustmentCode || cancellingItem?.id} • {cancellingItem?.itemName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-3 space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to cancel this draft adjustment? Once cancelled, this voucher will be permanently marked as cancelled and cannot be posted or edited.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter the detailed reason for cancellation..."
                  className="w-full border border-[#E2E8F0] rounded-xl p-3 text-xs outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20 resize-none text-gray-800"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  setCancellingItem(null);
                  setCancelReason('');
                }}
                disabled={cancelling}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {cancelling && <Loader2 size={14} className="animate-spin" />}
                Confirm Cancellation
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Container>
  );
};

export default ManualAdjustmentScreenListing;




