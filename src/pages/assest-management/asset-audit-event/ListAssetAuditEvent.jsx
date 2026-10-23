import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useOrgScope } from '@/hooks/useOrgScope';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  PauseCircle,
  PlayCircle,
  Plus,
  AlertTriangle,
  CalendarClock,
  X,
  XCircle,
  Loader2,
  Layers,
  Barcode,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  getAllAssetAuditEventsPaginated,
  getAssetUnitLocationsByOrganization,
  getScanReportById,
} from '@/services/apiServices.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Container } from '@/components/common/container';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import SearchableSelect from '@/utils/SearchableSelect';

// Helper to normalize backend response arrays
const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

/**
 * Extracts only the date portion (DD/MM/YYYY) from datetime strings
 */
const formatDateOnly = (dateTimeStr) => {
  if (!dateTimeStr) return '-';
  const trimmed = dateTimeStr.trim();
  if (trimmed.includes(' ')) {
    return trimmed.split(' ')[0];
  }
  return trimmed;
};

/**
 * Parses "DD/MM/YYYY hh:mm:ss A" into a standard Date object
 */
export const parseAuditDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return null;
  const parts = dateTimeStr.trim().split(' ');
  if (parts.length < 2) return new Date(dateTimeStr);

  const [day, month, year] = parts[0].split('/').map(Number);
  const timeParts = parts[1].split(':').map(Number);
  let hours = timeParts[0];
  const minutes = timeParts[1] || 0;
  const seconds = timeParts[2] || 0;
  const modifier = parts[2]?.toUpperCase();

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return new Date(year, month - 1, day, hours, minutes, seconds);
};

export const isAuditWindowExpired = (endDateTimeStr) => {
  const endDate = parseAuditDateTime(endDateTimeStr);
  if (!endDate || isNaN(endDate.getTime())) return false;
  return new Date() > endDate;
};

// Status Badges
const STATUS_CONFIG = {
  NOT_STARTED: {
    label: 'Not Started',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  STARTED: {
    label: 'Started',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: PlayCircle,
  },
  PAUSED: {
    label: 'Paused',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: PauseCircle,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: X,
  },
};

const AuditStatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Clock,
  };
  const Icon = config.icon;

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 w-fit ${config.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

const AuditEventReportDrawer = ({ eventId, onClose, onNavigateAction }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getScanReportById(eventId);
        const data = res?.data?.data || res?.data;
        if (isMounted) setReport(data);
      } catch (err) {
        if (isMounted) setError('Failed to load audit event report.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchReport();
    return () => {
      isMounted = false;
    };
  }, [eventId]);

  if (!eventId) return null;

  const isExpired = report ? isAuditWindowExpired(report.auditEndDateTime) : false;
  const isCancelledOrDone = report?.status === 'CANCELLED' || report?.status === 'COMPLETED';
  const canStartOrResume =
    !isCancelledOrDone &&
    !isExpired &&
    (report?.status === 'PAUSED' || report?.status === 'NOT_STARTED');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="bg-blue-50/60 border-b border-blue-100 flex items-center justify-between px-5 py-3.5 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#084E92]">
              {report?.eventCode || `Audit Event #${eventId}`}
            </h2>
            <p className="text-xs text-gray-500">Physical Verification Report</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition cursor-pointer bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="w-7 h-7 text-[#084E92] animate-spin" />
              <p className="text-xs text-gray-500">Loading audit report details...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {error}
            </div>
          ) : report ? (
            <>
              {isExpired && !isCancelledOrDone && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-800">
                    <span className="font-semibold">Audit Window Expired:</span> This event reached its scheduled end time. To start or resume scanning, please edit and extend the end date first.
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Status</span>
                  <AuditStatusBadge status={report.status} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-400 block text-[11px] uppercase">Unit</span>
                    <span className="font-semibold text-gray-800">{report.organizationName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px] uppercase">Location</span>
                    <span className="font-semibold text-gray-800">
                      {report.assetUnitLocationName || report.subOutletName || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px] uppercase">Start Time</span>
                    <span className="text-gray-700">{report.auditStartDateTime || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px] uppercase">End Time</span>
                    <span className={`font-medium ${isExpired ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                      {report.auditEndDateTime || '-'}
                    </span>
                  </div>
                </div>
                {report.remarks && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-gray-400 block text-[11px] uppercase">Remarks</span>
                    <span className="text-gray-600">{report.remarks}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-semibold text-blue-700 uppercase">Unique Assets</span>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{report.totalAssetsScanned ?? 0}</p>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase">Total Items Scanned</span>
                  <p className="text-lg font-bold text-emerald-800 mt-0.5">{report.totalItemsScanned ?? 0}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#084E92]" /> Scanned Asset Breakdown
                </h3>
                {!report.assetDetails || report.assetDetails.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 border border-dashed rounded-xl">
                    No physical asset items recorded for this audit yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {report.assetDetails.map((asset) => (
                      <div key={asset.id} className="border border-gray-200 rounded-xl p-3 bg-white space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-bold text-gray-800">{asset.itemName}</span>
                            <span className="text-[11px] text-gray-500 block">
                              {asset.assetCode ? `${asset.assetCode} • ` : ''}
                              {asset.categoryName} ({asset.brandName || 'N/A'})
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-[#084E92]">
                            Qty: {asset.totalScannedQty}
                          </span>
                        </div>

                        {asset.subDetails?.length > 0 && (
                          <div className="pt-2 border-t border-gray-100 space-y-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                              Verified QR Instances:
                            </span>
                            <div className="max-h-28 overflow-y-auto divide-y divide-gray-50">
                              {asset.subDetails.map((sub) => (
                                <div key={sub.id} className="py-1 flex items-center justify-between text-[11px]">
                                  <span className="font-mono text-gray-600 truncate max-w-52.5 flex items-center gap-1">
                                    <Barcode className="w-3 h-3 text-gray-400 shrink-0" />
                                    {sub.uuid}
                                  </span>
                                  <span className="text-gray-400 text-[10px] whitespace-nowrap">
                                    {sub.scanDateTime}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {report && (
          <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 shrink-0 flex items-center gap-2">
            {isExpired && !isCancelledOrDone && (
              <button
                type="button"
                onClick={() =>
                  onNavigateAction(`/assets/asset-audit-event/create/${report.auditEventId}?mode=edit-date`)
                }
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-amber-700 bg-amber-100 hover:bg-amber-200 text-xs font-semibold transition cursor-pointer"
              >
                <CalendarClock className="w-4 h-4" />
                Extend / Edit End Date
              </button>
            )}

            {canStartOrResume && (
              <button
                type="button"
                onClick={() => onNavigateAction(`/assets/asset-audit-event/create/${report.auditEventId}`)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white bg-[#084E92] hover:bg-[#063b6f] text-xs font-semibold transition cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                {report.status === 'PAUSED' ? 'Resume Scanning' : 'Start Audit'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ListAssetAuditEvent = () => {
  const { canAdd, canView } = usePagePermissions('Asset Audit Event');
  const { isOutletUser, isCompanyUser, units, effectiveOutletId } = useOrgScope();

  const [auditEvents, setAuditEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Pagination & Sorting States
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters State
  const [outletInput, setOutletInput] = useState('All');
  const [statusInput, setStatusInput] = useState('All');
  const [locationInput, setLocationInput] = useState('All');
  const [unitLocations, setUnitLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [previewEventId, setPreviewEventId] = useState(null);
  const navigate = useNavigate();

  // Outlet Scope Initialization
  useEffect(() => {
    if (isOutletUser) {
      const targetOutletId = effectiveOutletId || units?.[0]?.id;
      if (targetOutletId) setOutletInput(String(targetOutletId));
    } else if (isCompanyUser && units?.length === 1) {
      setOutletInput(String(units[0].id));
    }
  }, [isOutletUser, isCompanyUser, effectiveOutletId, units]);

  // Reset page index on filter change (not needed on client-side sort)
  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [outletInput, locationInput, statusInput]);

  // Fetch Locations dropdown when Outlet changes
  useEffect(() => {
    setLocationInput('All');
    if (!outletInput || outletInput === 'All') {
      setUnitLocations([]);
      return;
    }

    let cancelled = false;
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        const res = await getAssetUnitLocationsByOrganization(outletInput);
        if (!cancelled) {
          setUnitLocations(extractArray(res));
        }
      } catch (err) {
        if (!cancelled) setUnitLocations([]);
      } finally {
        if (!cancelled) setLoadingLocations(false);
      }
    };
    fetchLocations();
    return () => {
      cancelled = true;
    };
  }, [outletInput]);

  // Server-side fetching for paginated records and server-side filters
  const fetchAuditEvents = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');

      const params = {
        page: pagination.pageIndex,
        size: pagination.pageSize,
      };

      if (outletInput && outletInput !== 'All') {
        params.organizationId = Number(outletInput);
      }

      if (locationInput && locationInput !== 'All') {
        params.assetUnitLocationId = Number(locationInput);
      }

      if (statusInput && statusInput !== 'All') {
        params.status = statusInput;
      }

      const res = await getAllAssetAuditEventsPaginated(params);
      const responseData = res?.data?.data || res?.data || res;
      const content = responseData?.content || extractArray(res);

      setAuditEvents(content);
      setTotalPages(responseData?.totalPages ?? 0);
      setTotalRecords(responseData?.totalElements ?? 0);
    } catch (err) {
      setLoadError('Failed to load audit events.');
    } finally {
      setLoading(false);
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    outletInput,
    locationInput,
    statusInput,
  ]);

  useEffect(() => {
    fetchAuditEvents();
  }, [fetchAuditEvents]);

  // Options memoization
  const outletOptions = useMemo(() => {
    if (!units || units.length === 0) return [];
    return units.map((u) => ({
      value: String(u.id),
      label: u.name || u.companyNameEnglish || `Outlet #${u.id}`,
    }));
  }, [units]);

  const locationOptions = useMemo(() => {
    return (unitLocations ?? []).map((loc) => ({
      value: String(loc.id),
      label: loc.locationName || `Location #${loc.id}`,
    }));
  }, [unitLocations]);

  // Top Statistics Counters
  const stats = useMemo(() => {
    const startedCount = auditEvents.filter((e) => String(e.status || '').toUpperCase() === 'STARTED').length;
    const pausedCount = auditEvents.filter((e) => String(e.status || '').toUpperCase() === 'PAUSED').length;
    const completedCount = auditEvents.filter((e) => String(e.status || '').toUpperCase() === 'COMPLETED').length;
    const cancelledCount = auditEvents.filter((e) => String(e.status || '').toUpperCase() === 'CANCELLED').length;

    return [
      {
        title: 'Total Audits',
        value: String(totalRecords),
        icon: <Calendar size={18} />,
        iconBg: 'bg-[#D5E3FF]',
        iconColor: 'text-[#00376C]',
      },
      {
        title: 'Started',
        value: String(startedCount),
        icon: <PlayCircle size={18} />,
        iconBg: 'bg-[#E0F2FE]',
        iconColor: 'text-[#0369A1]',
      },
      {
        title: 'Paused',
        value: String(pausedCount),
        icon: <PauseCircle size={18} />,
        iconBg: 'bg-[#FFEDD5]',
        iconColor: 'text-[#C2410C]',
      },
      {
        title: 'Completed',
        value: String(completedCount),
        icon: <CheckCircle2 size={18} />,
        iconBg: 'bg-[#DCFCE7]',
        iconColor: 'text-[#15803D]',
      },
      {
        title: 'Cancelled',
        value: String(cancelledCount),
        icon: <XCircle size={18} />,
        iconBg: 'bg-[#FEE2E2]',
        iconColor: 'text-[#B91C1C]',
      },
    ];
  }, [totalRecords, auditEvents]);

  const columns = useMemo(() => [
    {
      id: 'sno',
      header: ({ column }) => <DataGridColumnHeader title="S.NO" column={column} className="my-2 text-xs" />,
      cell: ({ row }) => (
        <span className="text-gray-500 py-2 text-xs">
          {String(pagination.pageIndex * pagination.pageSize + row.index + 1).padStart(2, '0')}
        </span>
      ),
      size: 40,
      enableSorting: false,
    },
    {
      id: 'id',
      accessorFn: (row) => row.id,
      header: ({ column }) => <DataGridColumnHeader title="EVENT ID" column={column} className="my-2 text-xs" />,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setPreviewEventId(row.original.id)}
          className="font-semibold text-xs text-[#084E92] hover:underline cursor-pointer"
        >
          {row.original.eventCode || `EVT-${String(row.original.id).padStart(4, '0')}`}
        </button>
      ),
      size: 110,
      enableSorting: true,
      sortingFn: 'basic',
    },
    {
      id: 'subOutletName',
      accessorFn: (row) => row.organizationName || row.subOutletName || row.subOutletId,
      header: ({ column }) => <DataGridColumnHeader title="UNIT" column={column} className="my-2 text-xs" />,
      cell: ({ row }) => (
        <span className="text-xs text-gray-800 font-medium truncate block max-w-35">
          {row.original.organizationName || row.original.subOutletName || `Unit #${row.original.organizationId}`}
        </span>
      ),
      size: 130,
      enableSorting: false,
    },
    {
      id: 'assetUnitLocationName',
      accessorFn: (row) => row.assetUnitLocationName || row.assetUnitLocationId,
      header: ({ column }) => <DataGridColumnHeader title="LOCATION" column={column} className="my-2 text-xs" />,
      cell: ({ row }) => (
        <span className="text-xs text-gray-800 font-medium truncate block max-w-35">
          {row.original.assetUnitLocationName || '-'}
        </span>
      ),
      size: 130,
      enableSorting: false,
    },
    {
      id: 'auditStartDateTime',
      accessorFn: (row) => row.auditStartDateTime,
      header: ({ column }) => <DataGridColumnHeader title="START DATE" column={column} className="my-2 text-xs whitespace-nowrap" />,
      cell: ({ row }) => (
        <span className="text-gray-600 font-medium text-xs py-1 whitespace-nowrap">
          {formatDateOnly(row.original.auditStartDateTime)}
        </span>
      ),
      size: 110,
      enableSorting: true,
      // Date comparator for chronological sorting
      sortingFn: (rowA, rowB, columnId) => {
        const dateA = parseAuditDateTime(rowA.getValue(columnId))?.getTime() || 0;
        const dateB = parseAuditDateTime(rowB.getValue(columnId))?.getTime() || 0;
        return dateA - dateB;
      },
    },
    {
      id: 'auditEndDateTime',
      accessorFn: (row) => row.auditEndDateTime,
      header: ({ column }) => <DataGridColumnHeader title="END DATE" column={column} className="my-2 text-xs whitespace-nowrap" />,
      cell: ({ row }) => {
        const isExpired = isAuditWindowExpired(row.original.auditEndDateTime);
        return (
          <span className={`text-xs font-medium py-1 whitespace-nowrap ${isExpired ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            {formatDateOnly(row.original.auditEndDateTime)}
            {isExpired && ' (Expired)'}
          </span>
        );
      },
      size: 120,
      enableSorting: true,
      // Date comparator for chronological sorting
      sortingFn: (rowA, rowB, columnId) => {
        const dateA = parseAuditDateTime(rowA.getValue(columnId))?.getTime() || 0;
        const dateB = parseAuditDateTime(rowB.getValue(columnId))?.getTime() || 0;
        return dateA - dateB;
      },
    },
    {
      id: 'status',
      accessorFn: (row) => row.status,
      header: ({ column }) => <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />,
      cell: ({ row }) => <AuditStatusBadge status={row.original.status || 'NOT_STARTED'} />,
      size: 110,
      enableSorting: false,
    },
    {
      id: 'remarks',
      accessorFn: (row) => row.remarks,
      header: ({ column }) => <DataGridColumnHeader title="REMARKS" column={column} className="my-2 text-xs" />,
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 py-1 truncate block max-w-30" title={row.original.remarks}>
          {row.original.remarks || '-'}
        </span>
      ),
      size: 110,
      enableSorting: false,
    },
    {
      id: 'actions',
      header: ({ column }) => <DataGridColumnHeader title="ACTIONS" column={column} className="my-2 text-xs whitespace-nowrap" />,
      cell: ({ row }) => {
        const event = row.original;
        const isExpired = isAuditWindowExpired(event.auditEndDateTime);
        const isCancelledOrDone = event.status === 'CANCELLED' || event.status === 'COMPLETED';

        return (
          <div className="flex items-center gap-2 py-1 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setPreviewEventId(event.id)}
              title="View Report & Scans"
              className="text-gray-500 hover:text-blue-600 transition cursor-pointer"
            >
              <Eye size={17} />
            </button>

            {!isCancelledOrDone &&
              !isExpired &&
              (event.status === 'PAUSED' ||
                event.status === 'NOT_STARTED' ||
                event.status === 'STARTED') && (
                <button
                  type="button"
                  onClick={() => navigate(`/assets/asset-audit-event/create/${event.id}`)}
                  title={event.status === 'PAUSED' ? 'Resume Scanning' : 'Start Scanning'}
                  className="text-gray-500 hover:text-green-600 transition cursor-pointer"
                >
                  <PlayCircle size={17} />
                </button>
              )}

            {!isCancelledOrDone && isExpired && (
              <button
                type="button"
                onClick={() => navigate(`/assets/asset-audit-event/create/${event.id}?mode=edit-date`)}
                title="Expired: Extend End Date to Resume"
                className="text-amber-500 hover:text-amber-600 transition cursor-pointer"
              >
                <CalendarClock size={17} />
              </button>
            )}
          </div>
        );
      },
      size: 80,
      enableSorting: false,
    },
  ], [pagination.pageIndex, pagination.pageSize, navigate]);

  const table = useReactTable({
    data: auditEvents,
    columns,
    pageCount: totalPages,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true,
    manualSorting: false, // Enables TanStack client-side sorting on table data
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!canView) return <AccessDenied pageTitle="Asset Audit Event" />;

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        <PageHeader
          title="Asset Audit Events"
          actions={
            canAdd && (
              <HeaderActionButton to="/assets/asset-audit-event/create" icon={<Plus className="w-3.5 h-3.5" />}>
                Create New Audit Event
              </HeaderActionButton>
            )
          }
        />

        <PageErrorAlert error={loadError} onRetry={fetchAuditEvents} className="my-3" />

        {/* 1. Statistics Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-[#43474F]">
          {stats.map((item) => (
            <div
              key={item.title}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-3 flex items-center justify-between shadow-2xs"
            >
              <div className={`w-8 h-8 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                {item.icon}
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-[11px] font-semibold text-[#00376C] truncate">{item.title}</span>
                <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{item.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 2. Filters (Unit, Location, Status) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
          {!isOutletUser && (
            <div>
              <SearchableSelect
                name="outletFilter"
                value={outletInput === 'All' ? '' : outletInput}
                onChange={(e) => setOutletInput(e.target.value || 'All')}
                placeholder="All Units"
                options={outletOptions}
                isClearable={true}
              />
            </div>
          )}

          <div className={isOutletUser ? 'sm:col-span-2' : ''}>
            <SearchableSelect
              name="locationFilter"
              value={locationInput === 'All' ? '' : locationInput}
              onChange={(e) => setLocationInput(e.target.value || 'All')}
              placeholder={
                loadingLocations
                  ? 'Loading...'
                  : outletInput === 'All'
                    ? 'Select Unit First'
                    : 'All Locations'
              }
              options={locationOptions}
              disabled={outletInput === 'All' || loadingLocations}
              isClearable={true}
            />
          </div>

          <div>
            <Select value={statusInput} onValueChange={(val) => setStatusInput(val)}>
              <SelectTrigger className="w-full h-10 px-3 bg-white border border-[#C3C6D1] rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#084E92] focus:border-[#084E92]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg text-xs">
                <SelectItem value="All" className="text-xs cursor-pointer">All Status</SelectItem>
                <SelectItem value="NOT_STARTED" className="text-xs cursor-pointer">Not Started</SelectItem>
                <SelectItem value="STARTED" className="text-xs cursor-pointer">Started</SelectItem>
                <SelectItem value="PAUSED" className="text-xs cursor-pointer">Paused</SelectItem>
                <SelectItem value="COMPLETED" className="text-xs cursor-pointer">Completed</SelectItem>
                <SelectItem value="CANCELLED" className="text-xs cursor-pointer">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 3. DataGrid Table */}
        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden bg-white">
          <DataGrid table={table} recordCount={totalRecords} isLoading={loading}>
            <Card className="rounded-t-none border-t-0 rounded-2xl">
              <CardTable className="w-full overflow-x-hidden">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 text-[#084E92] animate-spin" />
                    <p className="text-sm font-medium text-gray-500">Loading audit events...</p>
                  </div>
                ) : (
                  <DataGridTable />
                )}
              </CardTable>
              {!loading && (
                <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
                  <DataGridPagination />
                </CardFooter>
              )}
            </Card>
          </DataGrid>
        </div>

        {/* 4. Report Drawer */}
        {previewEventId && (
          <AuditEventReportDrawer
            eventId={previewEventId}
            onClose={() => setPreviewEventId(null)}
            onNavigateAction={(path) => {
              setPreviewEventId(null);
              navigate(path);
            }}
          />
        )}
      </div>
    </Container>
  );
};

export default ListAssetAuditEvent;