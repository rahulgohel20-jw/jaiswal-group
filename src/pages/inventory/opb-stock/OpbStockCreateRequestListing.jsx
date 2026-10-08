import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Eye, Plus, Loader2 } from 'lucide-react';
import { Card, CardTable, CardFooter } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import OpbStockRequestDetailsModal from './OpbStockRequestDetailsModal';
import { getOpbById, getOpbList, getAllSubOutlets } from '../../../services/apiServices';
import { useOrgScope } from '../../../hooks/useOrgScope';
import HeaderActionButton from '../../../components/common/HeaderActionButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { SearchBar } from '@/components/common/SearchBar';
import { CodeCell } from '@/components/common/CodeCell';
import SearchableSelect from '@/utils/SearchableSelect';

const STATUS_TEXT_COLORS = {
    DRAFT: 'text-amber-600',
    POSTED: 'text-emerald-600',
    CANCELLED: 'text-rose-600',
    REJECTED: 'text-rose-600',
};

const StatusBadge = ({ status }) => {
    const key = String(status || '').toUpperCase();
    const color = STATUS_TEXT_COLORS[key] || 'text-gray-600';
    return (
        <span className={`text-xs font-semibold whitespace-nowrap ${color}`}>
            {status || '—'}
        </span>
    );
};


const UNIT_SYMBOL_MAP = {
    KILOGRAM: 'KG',
    KILOGRAMS: 'KG',
    KG: 'KG',
    GRAM: 'GM',
    GRAMS: 'GM',
    GM: 'GM',
    LITRE: 'LTR',
    LITRES: 'LTR',
    LTR: 'LTR',
    MILLILITRE: 'ML',
    ML: 'ML',
    PIECE: 'PCS',
    PIECES: 'PCS',
    PCS: 'PCS',
    PACKET: 'PKT',
    PKT: 'PKT',
    BOX: 'BOX',
    BAG: 'BAG',
    NOS: 'NOS',
};

const formatUnit = (unit) => {
    if (!unit) return '';
    const clean = String(unit).trim().toUpperCase();
    return UNIT_SYMBOL_MAP[clean] || unit;
};

const PAGE_SIZE = 10;

const parseDateToTimestamp = (dateStr) => {
    if (!dateStr || dateStr === '—') return 0;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
        const parts = dateStr.split('/');
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime() || 0;
    }
    const t = new Date(dateStr).getTime();
    return isNaN(t) ? 0 : t;
};

const OpbStockCreateRequestListing = () => {
    const {
        loading: orgScopeLoading,
        error: orgScopeError,
        retry: retryScope,
        isOutletUser,
        units,
        effectiveOutletId,
    } = useOrgScope();

    const [requests, setRequests] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Search and Filters
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [subUnits, setSubUnits] = useState([]);
    const [selectedOutletId, setSelectedOutletId] = useState('');
    const [selectedSubOutletId, setSelectedSubOutletId] = useState('');

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [sorting, setSorting] = useState([]);

    // Fetch Sub-Outlets list
    useEffect(() => {
        const loadSubUnits = async () => {
            try {
                const res = await getAllSubOutlets();
                const raw = res?.data?.data || res?.data || [];
                setSubUnits(Array.isArray(raw) ? raw : []);
            } catch (err) {
                console.error('Failed to load sub-units:', err);
            }
        };
        loadSubUnits();
    }, []);

    // Outlet options dropdown
    const outletOptions = useMemo(() => {
        if (!Array.isArray(units)) return [];
        return units
            .filter((u) => u?.id != null && String(u.id).toUpperCase() !== 'ALL')
            .map((u) => ({
                value: String(u.id),
                label: `${u.name}${u.code ? ` (${u.code})` : ''}`,
            }));
    }, [units]);

    // Sub-Outlet options dropdown (filtered by selected or effective outlet)
    const subOutletOptions = useMemo(() => {
        const activeOutletId = isOutletUser ? effectiveOutletId : selectedOutletId;
        if (!activeOutletId) return [];

        return subUnits
            .filter((s) => String(s.organizationId) === String(activeOutletId))
            .map((s) => ({
                value: String(s.id),
                label: s.subOutletName || s.name || `Sub-Outlet #${s.id}`,
            }));
    }, [subUnits, isOutletUser, effectiveOutletId, selectedOutletId]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim());
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }, 400);

        return () => clearTimeout(timer);
    }, [searchInput]);

    // Single server-side API call
    const fetchOpbList = useCallback(async () => {
        if (orgScopeLoading || orgScopeError) return;
        setLoading(true);
        setError(null);

        try {
            const params = {
                pageNo: pagination.pageIndex + 1,
                pageSize: pagination.pageSize,
            };

            const targetOrgId = isOutletUser && effectiveOutletId ? effectiveOutletId : selectedOutletId;
            if (targetOrgId) {
                params.organizationId = Number(targetOrgId);
            }

            if (selectedSubOutletId) {
                params.subOutletId = Number(selectedSubOutletId);
            }

            if (search) {
                params.search = search;
            }

            const response = await getOpbList(params);
            const data = response?.data?.data || response?.data?.content || response?.data || [];
            const total = Number(response?.data?.totalElements ?? response?.data?.total ?? data.length);

            setRequests(Array.isArray(data) ? data : []);
            setTotalElements(total);
        } catch (err) {
            console.error('Failed to load OPB list:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to load OPB list');
            setRequests([]);
            setTotalElements(0);
        } finally {
            setLoading(false);
        }
    }, [
        pagination.pageIndex,
        pagination.pageSize,
        search,
        selectedOutletId,
        selectedSubOutletId,
        orgScopeLoading,
        orgScopeError,
        isOutletUser,
        effectiveOutletId,
    ]);

    useEffect(() => {
        if (!orgScopeLoading && !orgScopeError) {
            fetchOpbList();
        }
    }, [fetchOpbList, orgScopeLoading, orgScopeError]);

    const handleViewRequest = async (request) => {
        try {
            const response = await getOpbById(request.id);
            const opbDetails = response?.data?.data;
            if (opbDetails) {
                setSelectedRequest(opbDetails);
                setDetailsOpen(true);
            }
        } catch (err) {
            console.error('Failed to fetch OPB details:', err);
        }
    };

    const columns = useMemo(
        () => [
            {
                id: 'opbCode',
                accessorFn: (row) => row.opbCode,
                header: ({ column }) => (
                    <DataGridColumnHeader title="REQUEST CODE" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => (
                    <CodeCell
                        code={row.original.opbCode}
                        maxWidth="max-w-[140px]"
                        onClick={() => handleViewRequest(row.original)}
                    />
                ),
                enableSorting: false,
                size: 150,
            },
            {
                id: 'opbDate',
                accessorFn: (row) => row.opbDate,
                sortingFn: (rowA, rowB, columnId) => {
                    const valA = parseDateToTimestamp(rowA.getValue(columnId) || rowA.original.createdAt);
                    const valB = parseDateToTimestamp(rowB.getValue(columnId) || rowB.original.createdAt);
                    return valA - valB;
                },
                header: ({ column }) => (
                    <DataGridColumnHeader title="DATE" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700 text-xs font-medium block truncate max-w-21.25">
                        {row.original.opbDate || '—'}
                    </span>
                ),
                enableSorting: true,
                size: 90,
            },
            {
                id: 'outletLocation',
                header: ({ column }) => (
                    <DataGridColumnHeader title="OUTLET / LOCATION" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => (
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <div
                            className="font-semibold text-xs text-gray-900 truncate max-w-40"
                            title={row.original.organizationName}
                        >
                            {row.original.organizationName || '—'}
                        </div>
                        {row.original.subOutletName && (
                            <div
                                className="text-[11px] text-gray-500 font-medium truncate max-w-40"
                                title={row.original.subOutletName}
                            >
                                {row.original.subOutletName}
                            </div>
                        )}
                        {row.original.subLocationName && (
                            <div
                                className="text-[10px] text-blue-600 font-medium truncate max-w-40"
                                title={row.original.subLocationName}
                            >
                                ↳ {row.original.subLocationName}
                            </div>
                        )}
                    </div>
                ),
                enableSorting: false,
                size: 170,
            },
            {
                id: 'itemName',
                accessorFn: (row) => row.itemName,
                header: ({ column }) => (
                    <DataGridColumnHeader title="ITEM DESCRIPTION" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <span
                            className="text-xs font-bold text-[#0F172A] block truncate max-w-32.5 capitalize"
                            title={row.original.itemName}
                        >
                            {row.original.itemName || '-'}
                        </span>
                    </div>
                ),
                enableSorting: true,
                size: 150,
            },
            {
                id: 'batchNumber',
                accessorFn: (row) => row.batchNumber,
                sortingFn: (rowA, rowB) => {
                    const valA = parseDateToTimestamp(rowA.original.expiryDate);
                    const valB = parseDateToTimestamp(rowB.original.expiryDate);
                    return valA - valB;
                },
                header: ({ column }) => (
                    <DataGridColumnHeader title="BATCH / EXPIRY" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => (
                    <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-xs text-gray-800 whitespace-nowrap">
                            {row.original.batchNumber || '-'}
                        </span>
                        {row.original.expiryDate && (
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                Exp: {row.original.expiryDate}
                            </span>
                        )}
                    </div>
                ),
                enableSorting: true,
                size: 190,
            },
            {
                id: 'quantity',
                accessorFn: (row) => Number(row.quantity || 0),
                header: ({ column }) => (
                    <DataGridColumnHeader title="OPB QTY" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => <span className="text-gray-700 text-xs">{row.original.quantity}</span>,
                size: 70,
            },
            {
                id: 'organizationName',
                accessorFn: (row) => row.organizationName,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Unit"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                enableSorting: false,
                size: 90,
            },
            {
                id: 'createdBy',
                accessorFn: (row) => row.createdByName || row.createdBy,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Sub-Unit"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700 text-xs block truncate max-w-27.5" title={row.original.createdByName || row.original.createdBy}>
                        {row.original.createdByName || row.original.createdBy || '—'}
                    </span>
                ),
                enableSorting: false,
                size: 120,
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
                size: 95,
            },
            {
                id: 'actions',
                header: ({ column }) => (
                    <DataGridColumnHeader title="ACTION" column={column} className="text-xs font-bold" />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-1 whitespace-nowrap">
                        <button
                            type="button"
                            onClick={() => handleViewRequest(row.original)}
                            className="p-1 text-gray-500 hover:text-[#084E92] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="View Request Details"
                        >
                            <Eye size={15} />
                        </button>
                    </div>
                ),
                enableSorting: false,
                size: 65,
            },
        ],
        [pagination.pageIndex, pagination.pageSize]
    );

    const table = useReactTable({
        data: requests,
        columns,
        state: { pagination, sorting },
        manualPagination: true,
        pageCount: Math.max(1, Math.ceil(totalElements / pagination.pageSize)),
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <Container>
            <div className="pt-2 pb-6 space-y-4">
                <PageHeader
                    title="OPB Stock Create Request Listing"
                    actions={
                        <HeaderActionButton
                            to="/inventory/opb-stock-create-request"
                            icon={Plus}
                        >
                            OPB Stock Request
                        </HeaderActionButton>
                    }
                />

                <PageErrorAlert
                    error={orgScopeError || error}
                    onRetry={orgScopeError ? retryScope : fetchOpbList}
                />

                {/* Search */}
                <SearchBar
                    isStandalone={true}
                    placeholder="Search by Request Code, Unit, or Sub-Unit..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onClear={() => setSearchInput('')}
                />

                {/* Table Card */}
                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden shadow-xs">
                    {loading || orgScopeLoading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Loader2 size={18} className="animate-spin text-[#084E92]" />
                            Loading OPB requests…
                        </div>
                    ) : (
                        <DataGrid
                            table={table}
                            recordCount={totalElements}
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
                                    <ScrollArea>
                                        <DataGridTable />
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
            </div>

            <OpbStockRequestDetailsModal
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                request={selectedRequest}
            />
        </Container>
    );
};

export default OpbStockCreateRequestListing;