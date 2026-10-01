import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Search, ChevronRight, ChevronLeft, Eye, Plus } from 'lucide-react';
import { Card, CardTable, CardFooter } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import { Link } from 'react-router';
import OpbStockRequestDetailsModal from './OpbStockRequestDetailsModal';
import { getEmployeeById, getOpbById, getOpbList } from '../../../services/apiServices';
import { useOrgScope } from '../../../hooks/useOrgScope';
import HeaderActionButton from '../../../components/common/HeaderActionButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { SearchBar } from '@/components/common/SearchBar';

const STATUS_TEXT_COLORS = {
    DRAFT: 'text-amber-600',
    POSTED: 'text-emerald-600',
    CANCELLED: 'text-rose-600'
};

const StatusBadge = ({ status }) => {
    const color = STATUS_TEXT_COLORS[status] || 'text-gray-600';
    return (
        <span className={`text-xs font-semibold whitespace-nowrap ${color}`}>
            {status || '—'}
        </span>
    );
};

const Pill = ({ children }) => (
    <span className="inline-block px-2.5 py-1 rounded-md bg-gray-100 text-xs text-gray-600 whitespace-nowrap">
        {children}
    </span>
);
const employeeNameCache = new Map();
const OpbStockCreateRequestListing = () => {

    const {
        loading: orgScopeLoading,
        error: orgScopeError,
        retry: retryScope,
        isOutletUser,
        isCompanyUser,
        effectiveOutletId,
        units: scopedOutlets,
    } = useOrgScope();

    const allowedOutletIdSet = useMemo(() => {
        if (orgScopeLoading) return null;

        if (isOutletUser && effectiveOutletId) {
            return new Set([String(effectiveOutletId)]);
        }

        if (isCompanyUser && Array.isArray(scopedOutlets)) {
            return new Set(
                scopedOutlets
                    .filter((outlet) => outlet?.id != null && String(outlet.id).toUpperCase() !== 'ALL')
                    .map((outlet) => String(outlet.id))
            );
        }

        return null;
    }, [orgScopeLoading, isOutletUser, isCompanyUser, effectiveOutletId, scopedOutlets]);

    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [employeeMap, setEmployeeMap] = useState({});

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim());
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }, 400);

        return () => clearTimeout(timer);
    }, [searchInput]);


    useEffect(() => {
        if (allRequests.length === 0) return;

        const uniqueIds = [...new Set(allRequests.map((r) => r.createdBy).filter(Boolean))];
        const idsToFetch = uniqueIds.filter((id) => !employeeNameCache.has(id));

        const applyMap = () => {
            const map = {};
            uniqueIds.forEach((id) => {
                map[id] = employeeNameCache.get(id) || '-';
            });
            setEmployeeMap(map);
        };

        if (idsToFetch.length === 0) {
            applyMap();
            return;
        }

        (async () => {
            await Promise.all(
                idsToFetch.map(async (id) => {
                    try {
                        const response = await getEmployeeById(id);
                        employeeNameCache.set(id, response?.data?.data?.fullName || '-');
                    } catch (error) {
                        console.error(`Failed to fetch employee ${id}:`, error);
                        employeeNameCache.set(id, '-');
                    }
                })
            );
            applyMap();
        })();
    }, [allRequests]);
    const fetchAllOpb = useCallback(async () => {
        if (orgScopeLoading || orgScopeError) return;
        setLoading(true);
        setError(null);

        try {
            const probe = await getOpbList({ pageNo: 1, pageSize: 1 });
            const total = Number(probe?.data?.totalElements) || 0;

            if (total === 0) {
                setAllRequests([]);
                return;
            }

            const response = await getOpbList({ pageNo: 1, pageSize: total });

            setAllRequests(response?.data?.data || []);
        } catch (error) {
            console.error('Failed to load OPB list:', error);
            setError(error?.response?.data?.message || error?.message || 'Failed to load OPB list');
            setAllRequests([]);
        } finally {
            setLoading(false);
        }
    }, [orgScopeLoading, orgScopeError]);

    useEffect(() => {
        if (!orgScopeLoading && !orgScopeError) {
            fetchAllOpb();
        }
    }, [fetchAllOpb, orgScopeLoading, orgScopeError]);

    const filteredRequests = useMemo(() => {
        if (orgScopeLoading) return [];

        const scopedRequests = allRequests.filter((request) => {
            if (!allowedOutletIdSet) return true;

            return (
                request.organizationId != null &&
                allowedOutletIdSet.has(String(request.organizationId))
            );
        });

        const term = search.toLowerCase();

        if (!term) return scopedRequests;

        return scopedRequests.filter((r) =>
            r.opbCode?.toLowerCase().includes(term) ||
            r.organizationName?.toLowerCase().includes(term) ||
            r.subOutletName?.toLowerCase().includes(term)
        );
    }, [allRequests, search, orgScopeLoading, allowedOutletIdSet]);

    const totalElements = filteredRequests.length;


    const requests = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return filteredRequests.slice(start, start + pagination.pageSize);
    }, [filteredRequests, pagination]);

    const handleViewRequest = async (request) => {
        try {
            const response = await getOpbById(request.id);
            const opbDetails = response?.data?.data;

            if (!opbDetails) {
                return;
            }

            setSelectedRequest(opbDetails);
            setDetailsOpen(true);
        } catch (error) {
            console.error('Failed to fetch OPB details:', error);
        }
    };

    const columns = useMemo(
        () => [
            {
                id: 'srNo',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="S.NO"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-500 text-xs"> {String(
                        pagination.pageIndex * pagination.pageSize +
                        row.index +
                        1
                    ).padStart(2, '0')}</span>
                ),
                enableSorting: false,
                size: 80,
            },
            {
                id: 'opbCode',
                accessorFn: (row) => row.opbCode,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Request Code"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <p className="text-[#084E92] font-medium text-xs">
                        {row.original.opbCode}
                    </p>
                ),
                size: 250,
            },
            {
                id: 'itemType',
                accessorFn: (row) => row.itemType,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Item Type"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700 text-xs">{row.original.itemType}</span>,
                size: 120,
            },
            {
                id: 'itemName',
                accessorFn: (row) => row.itemName,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Item Name"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <p className="text-[#084E92] font-medium text-xs capitalize" >
                        {row.original.itemName}
                    </p>
                ),
                size: 170,
            },
            {
                id: 'createdBy',
                accessorFn: (row) => row.createdBy,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Added By"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-700 text-xs">
                        {employeeMap[row.original.createdBy] || '-'}
                    </span>
                ),
                size: 140,
            },
            {
                id: 'opbDate',
                accessorFn: (row) => row.opbDate,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Created Date"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-500 text-xs">{row.original.opbDate}</span>,
                size: 120,
            },
            {
                id: 'expiryDate',
                accessorFn: (row) => row.expiryDate,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Expiry Date"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-500 text-xs">{row.original.expiryDate}</span>,
                size: 130,
            },
            {
                id: 'batchNumber',
                accessorFn: (row) => row.batchNumber,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Batch Number"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <Pill>{row.original.batchNumber}</Pill>,
                size: 150,
            },
            {
                id: 'unitName',
                accessorFn: (row) => row.unitName,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Unit"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <Pill>{row.original.unitName}</Pill>,
                size: 90,
            },
            {
                id: 'quantity',
                accessorFn: (row) => row.quantity,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="OPB"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700 text-xs">{row.original.quantity}</span>,
                size: 70,
            },
            {
                id: 'organizationName',
                accessorFn: (row) => row.organizationName,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Outlet"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700 text-xs">{row.original.organizationName}</span>,
                size: 150,
            },
            {
                id: 'subOutletName',
                accessorFn: (row) => row.subOutletName,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Sub-Outlet"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <span className="text-gray-700 text-xs">{row.original.subOutletName}</span>,
                size: 150,
            },
            {
                id: 'status',
                accessorFn: (row) => row.status,
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Status"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
                size: 120,
            },
            {
                id: 'actions',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Action"
                        column={column}
                        className="text-[#43474F] font-semibold uppercase text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <button
                        type="button"
                        onClick={() => handleViewRequest(row.original)}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                        <Eye size={18} />
                    </button>
                ),
                enableSorting: false,
                size: 70,
            },
        ],
        [pagination.pageIndex, pagination.pageSize, employeeMap]
    );

    const table = useReactTable({
        data: requests,
        columns,
        state: { pagination },
        manualPagination: true,
        pageCount: Math.max(1, Math.ceil(totalElements / pagination.pageSize)),
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <Container>
            <div className="pt-2 pb-6 space-y-3.5">
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
                    onRetry={orgScopeError ? retryScope : fetchAllOpb}
                />

                {/* Search */}
                <SearchBar
                    isStandalone={true}
                    placeholder="Search by Request Code, Outlet, or Sub-Outlet..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onClear={() => setSearchInput('')}
                />

                {/* Table */}
                <div className="w-full my-4 border border-[#E2E8F0] rounded-2xl overflow-hidden">
                    <DataGrid table={table} recordCount={totalElements} loading={loading} className="rounded-2xl"
                        tableLayout={{
                            width: 'fixed',
                            cellBorder: true,
                            headerBorder: true,
                            rowBorder: true,
                        }}>
                        <Card className="rounded-2xl">
                            <CardTable>
                                <ScrollArea>
                                    <DataGridTable />
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </CardTable>
                            <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
                                <DataGridPagination />
                            </CardFooter>
                        </Card>
                    </DataGrid>
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
