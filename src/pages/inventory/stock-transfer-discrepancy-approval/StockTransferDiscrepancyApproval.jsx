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
  CheckCircle2,
  ChevronRight,
  Filter,
  Loader2,
  AlertTriangle,
  ArrowLeftRight,
  FileCheck2,
  Boxes,
} from 'lucide-react';
import { useNavigate } from 'react-router';
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
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { CodeCell } from '@/components/common/CodeCell';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { SearchBar } from '@/components/common/SearchBar';
import {
  getTransferList,
} from '@/services/apiServices';

/* -------------------------------------------------------------------------
 * Status Styling Tokens
 * ---------------------------------------------------------------------- */
const STATUS_TEXT_COLORS = {
  PENDING_DISCREPANCY_APPROVAL: 'text-orange-600',
  'Pending Discrepancy Approval': 'text-orange-600',
  DISCREPANCY_PENDING: 'text-amber-600',
  'Discrepancy Pending': 'text-amber-600',
  DISCREPANCY_RESOLVED: 'text-emerald-600',
  'Discrepancy Resolved': 'text-emerald-600',
  CLOSED: 'text-gray-500',
  Closed: 'text-gray-500',
};

const formatStatusLabel = (status) => {
  if (!status) return 'Discrepancy Approval';
  const s = String(status).toUpperCase().replace(/[\s_]/g, '');
  if (s === 'PENDINGDISCREPANCYAPPROVAL') return 'Discrepancy Approval';
  if (s === 'DISCREPANCYPENDING') return 'Discrepancy Pending';
  if (s === 'DISCREPANCYRESOLVED') return 'Resolved';
  if (s === 'CLOSED' || s === 'RECEIVED' || s === 'RECIEVED') return 'Closed';
  return status;
};

const StatusBadge = ({ status = 'PENDING_DISCREPANCY_APPROVAL' }) => {
  const label = formatStatusLabel(status);
  const key = String(status).toUpperCase();
  const color = STATUS_TEXT_COLORS[key] || STATUS_TEXT_COLORS[status] || 'text-gray-600';
  return (
    <span
      title={label}
      className={`text-xs font-semibold truncate block max-w-[110px] ${color}`}
    >
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

const StockTransferDiscrepancyApproval = () => {
  const navigate = useNavigate();

  // Permissions check
  const { canView } = usePagePermissions([
    'STR Discrepancy Approval',
    'Discrepancy Approval',
    'STR Approval',
    'Stock Transfer Approval',
    'Stock Transfer Request Approval',
    'Stock Transfer',
  ]);

  const {
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    selectedCompanyId,
    effectiveOutletId,
    units = [],
    subOutlets: scopeSubOutlets = [],
    subLocations: scopeSubLocations = [],
    loading: scopeLoading,
    error: scopeError,
    retry: retryScope,
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

  // State
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState('');

  // Fetch Discrepancy Transfers (status: PENDING_DISCREPANCY_APPROVAL)
  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: 'PENDING_DISCREPANCY_APPROVAL',
      };

      if (isCompanyUser && selectedCompanyId) {
        params.companyId = Number(selectedCompanyId);
      } else if (isGroupUser && selectedCompanyId) {
        params.companyId = Number(selectedCompanyId);
      }

      const res = await getTransferList(params);
      const rawList =
        res?.data?.data ??
        res?.data?.content ??
        res?.data?.list ??
        (Array.isArray(res?.data) ? res.data : []);

      const mapped = (Array.isArray(rawList) ? rawList : []).map((t, idx) => {
        const items = Array.isArray(t.items) ? t.items : Array.isArray(t.transferItems) ? t.transferItems : [];
        const discrepancyItems = items.filter(
          (i) =>
            Number(i.shortageQuantity || i.shortQuantity || i.shortQty || 0) > 0 ||
            String(i.status || '').toUpperCase().includes('DISCREPANCY')
        );

        const totalShortQty = discrepancyItems.reduce(
          (sum, i) => sum + Number(i.shortageQuantity || i.shortQuantity || i.shortQty || 0),
          0
        );

        // Find primary reason / remark for discrepancy
        const discrepancyReason =
          discrepancyItems.map((i) => i.reasonCategory || i.reason || i.discrepancyRemarks || i.remarks).filter(Boolean)[0] ||
          t.remarks ||
          '—';

        const fromSubOutletId = t.fromSubOutletId || t.fromSubOutlet?.id || t.fromSubOrgId || null;
        const toSubOutletId = t.toSubOutletId || t.toSubOutlet?.id || t.toSubOrgId || null;
        const fromSubLocationId = t.fromSubLocationId || t.fromSubLocation?.id || null;
        const toSubLocationId = t.toSubLocationId || t.toSubLocation?.id || null;

        const fromSubOutletName =
          t.fromSubOutletName ||
          t.fromSubOutlet?.name ||
          t.fromSubOutlet?.subOutletName ||
          (fromSubOutletId ? subOutletMap[String(fromSubOutletId)] : '') ||
          '';

        const toSubOutletName =
          t.toSubOutletName ||
          t.toSubOutlet?.name ||
          t.toSubOutlet?.subOutletName ||
          (toSubOutletId ? subOutletMap[String(toSubOutletId)] : '') ||
          '';

        const fromSubLocationName =
          t.fromSubLocationName ||
          t.fromSubLocation?.name ||
          t.fromSubLocation?.locationName ||
          t.fromSubLocation?.subLocationName ||
          (fromSubLocationId ? subLocationMap[String(fromSubLocationId)] : '') ||
          '';

        const toSubLocationName =
          t.toSubLocationName ||
          t.toSubLocation?.name ||
          t.toSubLocation?.locationName ||
          t.toSubLocation?.subLocationName ||
          (toSubLocationId ? subLocationMap[String(toSubLocationId)] : '') ||
          '';

        return {
          id: t.id,
          index: idx + 1,
          transferCode: t.transferCode || t.code || `STR-${t.id}`,
          transferDate: t.transferDate
            ? t.transferDate.includes('-')
              ? t.transferDate.split('-').reverse().join('/')
              : t.transferDate
            : '—',
          fromOutlet: t.fromOrganizationName || t.fromOutletName || t.fromOrganization?.name || '—',
          fromOutletId: t.fromOrganizationId || t.fromOutletId || t.fromOrganization?.id,
          fromSubOutlet: fromSubOutletName || '—',
          fromSubOutletId,
          fromSubLocation: fromSubLocationName || '—',
          fromSubLocationId,
          toOutlet: t.toOrganizationName || t.toOutletName || t.toOrganization?.name || '—',
          toOutletId: t.toOrganizationId || t.toOutletId || t.toOrganization?.id,
          toSubOutlet: toSubOutletName || '—',
          toSubOutletId,
          toSubLocation: toSubLocationName || '—',
          toSubLocationId,
          vehicleNumber: t.vehicleNumber || '—',
          driverName: t.driverName || '—',
          driverContact: t.driverContact || '',
          remarks: t.remarks || '—',
          discrepancyReason,
          status: t.status || 'PENDING_DISCREPANCY_APPROVAL',
          itemCount: items.length,
          discrepancyCount: discrepancyItems.length || items.length,
          totalShortQty,
          raw: t,
        };
      });

      setTransfers(mapped);
    } catch (err) {
      console.error('Failed to load discrepancy stock transfers:', err);
      setError('Failed to load discrepancy approval stock transfers. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [isCompanyUser, isGroupUser, selectedCompanyId, subOutletMap, subLocationMap]);

  useEffect(() => {
    if (!scopeLoading && !scopeError) {
      fetchTransfers();
    }
  }, [fetchTransfers, scopeLoading, scopeError]);

  // Filtered rows
  const filteredTransfers = useMemo(() => {
    let rows = transfers;

    if (isOutletUser && effectiveOutletId) {
      rows = rows.filter(
        (r) =>
          !r.fromOutletId ||
          Number(r.fromOutletId) === Number(effectiveOutletId) ||
          Number(r.toOutletId) === Number(effectiveOutletId)
      );
    } else if (selectedOutletId) {
      rows = rows.filter(
        (r) =>
          Number(r.fromOutletId) === Number(selectedOutletId) ||
          Number(r.toOutletId) === Number(selectedOutletId)
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.transferCode?.toLowerCase().includes(q) ||
          r.fromOutlet?.toLowerCase().includes(q) ||
          r.toOutlet?.toLowerCase().includes(q) ||
          r.vehicleNumber?.toLowerCase().includes(q) ||
          r.driverName?.toLowerCase().includes(q)
      );
    }

    return rows;
  }, [
    transfers,
    isOutletUser,
    effectiveOutletId,
    selectedOutletId,
    search,
  ]);

  // Actions
  const handleResolve = useCallback((row) => {
    navigate(`/inventory/stock-transfer-request?id=${row.id}&mode=discrepancy_approval`, {
      state: row.raw || row,
    });
  }, [navigate]);

  const handleView = useCallback((row) => {
    navigate(`/inventory/stock-transfer-detail/${row.id}`, { state: row.raw || row });
  }, [navigate]);

  // Columns definition
  const columns = useMemo(
    () => [
      {
        id: 'index',
        header: ({ column }) => (
          <DataGridColumnHeader title="S.NO" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 font-semibold text-xs">{String(row.index + 1).padStart(2, '0')}</span>
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: 'transferCode',
        accessorFn: (row) => row.transferCode,
        header: ({ column }) => (
          <DataGridColumnHeader title="TRANSFER CODE" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <CodeCell
            code={row.original.transferCode}
            maxWidth="max-w-[125px]"
            onClick={() => handleView(row.original)}
            className="text-xs font-bold text-[#084E92] hover:underline cursor-pointer"
          />
        ),
        enableSorting: false,
        size: 135,
      },
      {
        id: 'transferDate',
        accessorFn: (row) => row.transferDate,
        sortingFn: (rowA, rowB) => {
          const tA = parseDateToTimestamp(rowA.original.transferDate);
          const tB = parseDateToTimestamp(rowB.original.transferDate);
          return tA - tB;
        },
        header: ({ column }) => (
          <DataGridColumnHeader title="DATE" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => <span className="text-gray-700 text-xs font-medium">{row.original.transferDate}</span>,
        enableSorting: false,
        size: 85,
      },
      {
        id: 'fromOutlet',
        accessorFn: (row) => row.fromOutlet,
        header: ({ column }) => (
          <DataGridColumnHeader title="FROM UNIT" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <TruncatedCell value={row.original.fromOutlet} widthClass="max-w-[160px]" className="font-semibold text-gray-900 text-xs" />
            {row.original.fromSubOutlet && row.original.fromSubOutlet !== '—' && (
              <span className="text-[11px] text-gray-500 truncate max-w-[160px]" title={row.original.fromSubOutlet}>Sub: {row.original.fromSubOutlet}</span>
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
          <DataGridColumnHeader title="TO UNIT" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <TruncatedCell value={row.original.toOutlet} widthClass="max-w-[160px]" className="font-semibold text-gray-900 text-xs" />
            {row.original.toSubOutlet && row.original.toSubOutlet !== '—' && (
              <span className="text-[11px] text-gray-500 truncate max-w-[160px]" title={row.original.toSubOutlet}>Sub: {row.original.toSubOutlet}</span>
            )}
          </div>
        ),
        enableSorting: false,
        size: 165,
      },
      {
        id: 'discrepancySummary',
        header: ({ column }) => (
          <DataGridColumnHeader title="SHORTAGE" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
            {row.original.discrepancyCount} {row.original.discrepancyCount === 1 ? 'item' : 'items'} short
          </span>
        ),
        enableSorting: false,
        size: 110,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <StatusBadge status={row.original.status} />
          </div>
        ),
        enableSorting: false,
        size: 115,
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTION" column={column} className="text-[#43474F] font-bold uppercase text-xs text-right pr-2" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5 pr-1">
            <button
              type="button"
              onClick={() => handleView(row.original)}
              className="p-1 text-gray-500 hover:text-[#084E92] hover:bg-blue-50 rounded-lg transition cursor-pointer"
              title="View Transfer Details"
            >
              <Eye size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleResolve(row.original)}
              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
              title="Review & Resolve Discrepancy"
            >
              <CheckCircle2 size={15} />
            </button>
          </div>
        ),
        enableSorting: false,
        size: 75,
      },
    ],
    [handleResolve, handleView]
  );

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [sorting, setSorting] = useState([{ id: 'transferDate', desc: true }]);

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
    return <AccessDenied pageTitle="STR Discrepancy Approval" />;
  }

  const outletSelectOptions = (units || []).map((o) => ({
    value: String(o.id),
    label: `${o.name || `Outlet #${o.id}`}${o.code ? ` (${o.code})` : ''}`,
  }));

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        {/* Page Header */}
        <PageHeader
          title="Area Manager Discrepancy Approval"
          description="Review and resolve stock transfer short quantity discrepancies for pending approvals."
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <StatCard
            label="Pending Discrepancies"
            value={transfers.length}
            icon={AlertTriangle}
            iconBg="#FEF3F2"
            iconColor="#D92D20"
          />
          <StatCard
            label="Filtered Records"
            value={filteredTransfers.length}
            icon={FileCheck2}
            iconBg="#EEF4FE"
            iconColor="#2952E3"
          />
          <StatCard
            label="Active Units with Issues"
            value={new Set(transfers.map((t) => t.toOutletId).filter(Boolean)).size}
            icon={ArrowLeftRight}
            iconBg="#ECFDF3"
            iconColor="#039855"
          />
        </div>

        {/* Filters Bar - Long Search bar & Single Unit Dropdown */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-3.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Long Search Bar */}
            <div className="flex-1 w-full">
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder="Search transfer code, unit, vehicle, driver..."
              />
            </div>

            {/* Single Unit Filter - Only visible for Company and Group users, hidden for Unit users */}
            {!isOutletUser && (
              <div className="w-full sm:w-72 shrink-0">
                <SearchableSelect
                  options={outletSelectOptions}
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  placeholder="All Units"
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <Card className="rounded-2xl border border-[#E7EAF0] shadow-2xs overflow-hidden">
          {scopeError || error ? (
            <div className="p-6">
              <PageErrorAlert
                error={scopeError || error}
                onRetry={scopeError ? retryScope : fetchTransfers}
              />
            </div>
          ) : loading || scopeLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white">
              <Loader2 className="w-8 h-8 animate-spin text-[#084E92] mb-2" />
              <span className="text-xs font-semibold text-gray-600">Loading pending discrepancy transfers...</span>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-gray-900">No Discrepancies Pending Approval</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                All stock transfer discrepancy requests have been resolved or no short quantity transfers currently require approval.
              </p>
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
                <CardFooter className="bg-[#F8FAFC] rounded-b-2xl border-t border-[#E2E8F0] py-2.5">
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </DataGrid>
          )}
        </Card>
      </div>
    </Container>
  );
};

export default StockTransferDiscrepancyApproval;
