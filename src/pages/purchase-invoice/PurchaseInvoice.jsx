import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    ChevronRight,
    FileText,
    Loader2,
    Minus,
    Search,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import SearchableSelect from '@/utils/SearchableSelect';
import { toast } from 'sonner';
import { getAllActiveVendors, getEligibleGrnDetails, getEligibleGrns } from '../../services/apiServices';
import { useNavigate } from 'react-router';
import { useOrgScope } from '../../hooks/useOrgScope';

const STATUS_TEXT_COLORS = {
    OPEN: 'text-emerald-600',
    Open: 'text-emerald-600',
    open: 'text-emerald-600',
    CLOSED: 'text-emerald-600',
    Closed: 'text-emerald-600',
    closed: 'text-emerald-600',
    CANCELLED: 'text-rose-600',
    Cancelled: 'text-rose-600',
    cancelled: 'text-rose-600',
};

const StatusBadge = ({ status }) => {
    const display = status || 'Closed';
    const color = STATUS_TEXT_COLORS[status] || 'text-gray-600';
    return (
        <span className={`font-semibold text-xs whitespace-nowrap capitalize ${color}`}>
            {display.toLowerCase()}
        </span>
    );
};

const TruncatedCell = ({
    value,
    widthClass = 'max-w-[180px]',
    className = 'text-gray-600',
}) => (
    <span title={value} className={`block truncate ${widthClass} ${className}`}>
        {value || '—'}
    </span>
);

const PoCodeCell = ({ value }) => (
    <span
        title={value}
        className="inline-block max-w-40 truncate rounded-lg border border-[#E7EAF0] bg-[#F9FAFC] px-3 py-1.5 text-xs font-semibold text-gray-700"
    >
        {value || '—'}
    </span>
);

const formatDateShort = (val) => {
    if (!val) return '—';
    const slashMatch = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
        const [, d, m, y] = slashMatch;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[parseInt(m, 10) - 1] || m;
        return `${d.padStart(2, '0')} ${monthName} ${y}`;
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const PAGE_SIZE = 10;

const PurchaseInvoice = () => {
    const navigate = useNavigate();

    /* ---------------- Vendor dropdown ---------------- */
    const [vendors, setVendors] = useState([]);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState(null);

    /* ---------------- GRN listing ---------------- */
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [grnError, setGrnError] = useState(null);
    const [searched, setSearched] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

    const [selectedGrnIds, setSelectedGrnIds] = useState([]);
    const [grnDetails, setGrnDetails] = useState({});
    const [otherCosts, setOtherCosts] = useState([]);

    const {
        loading: scopeLoading,
        error: scopeError,
        showUnitDropdown,
        units,
        selectedUnitId,
        setSelectedUnitId,
        effectiveOutletId,
        retry: retryScope,
    } = useOrgScope();

    /* ---------------- Fetch vendors ---------------- */
    useEffect(() => {
        const fetchVendors = async () => {
            setVendorsLoading(true);
            try {
                const res = await getAllActiveVendors();
                const raw = res?.data?.data || res?.data || [];
                setVendors(Array.isArray(raw) ? raw : []);
            } catch (err) {
                console.error('Failed to load vendors', err);
                toast.error('Failed to load vendors.');
            } finally {
                setVendorsLoading(false);
            }
        };
        fetchVendors();
    }, []);

    /* ---------------- Search GRN ---------------- */
    const handleSearchGrn = useCallback(async () => {
        const targetOutletId = selectedUnitId || effectiveOutletId;

        if (!targetOutletId || !selectedVendorId) {
            toast.error('Please select unit and vendor.');
            return;
        }

        setLoading(true);
        setGrnError(null);
        setSelectedGrnIds([]);
        setGrnDetails({});
        setOtherCosts([]);

        try {
            const res = await getEligibleGrns({
                outletId: Number(targetOutletId),
                vendorId: Number(selectedVendorId),
            });

            const raw = res?.data?.data ?? res?.data ?? [];
            const rawList = Array.isArray(raw) ? raw : [];

            const detailsMap = {};

            const normalized = rawList.map((g) => {
                const details = Array.isArray(g.eligibleGrnDetailResponseDtos)
                    ? g.eligibleGrnDetailResponseDtos
                    : [];

                if (details.length > 0) {
                    detailsMap[g.grnId] = details;
                }

                return {
                    id: g.grnId,
                    grnId: g.grnId,
                    grnCode: g.grnCode || `GRN-${g.grnId}`,
                    poCode: Array.isArray(g.poCode)
                        ? g.poCode.join(', ')
                        : (g.poCode || details[0]?.poCode || '—'),
                    grnDate: formatDateShort(g.grnDate),
                    rawDate: g.grnDate,
                    createdBy: g.createdBy || '—',
                    vendorId: g.vendorId,
                    vendorName: g.vendorName || '—',
                    organizationId: g.organizationId,
                    organizationName: g.organizationName || '—',
                    status: g.status || 'OPEN',
                    details,
                    itemsReceived: details.length,
                };
            });

            setList(normalized);
            setGrnDetails(detailsMap);
            setSearched(true);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
        } catch (err) {
            console.error('Failed to load GRN listing:', err);
            setGrnError(
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                err?.message ||
                'Failed to load GRN list.'
            );
            setList([]);
            setGrnDetails({});
            setSearched(true);
        } finally {
            setLoading(false);
        }
    }, [selectedUnitId, effectiveOutletId, selectedVendorId]);

    /* ---------------- Single multi-GRN fetch helper ---------------- */
    const fetchMultipleGrnDetails = useCallback(async (ids) => {
        if (!ids || ids.length === 0) return { detailsByGrnId: {}, otherCostList: [] };

        const joinedIds = ids.join(',');
        const res = await getEligibleGrnDetails(joinedIds);

        const responseData = res?.data?.data || {};
        const detailDtos = Array.isArray(responseData.eligibleGrnDetailResponseDtos)
            ? responseData.eligibleGrnDetailResponseDtos
            : (Array.isArray(responseData) ? responseData : []);
        const otherCostList = Array.isArray(responseData.otherCostResponseDtos)
            ? responseData.otherCostResponseDtos
            : [];

        // Group details by grnId
        const detailsByGrnId = {};
        ids.forEach((id) => {
            detailsByGrnId[id] = [];
        });

        detailDtos.forEach((item) => {
            if (item && item.grnId) {
                if (!detailsByGrnId[item.grnId]) {
                    detailsByGrnId[item.grnId] = [];
                }
                detailsByGrnId[item.grnId].push(item);
            }
        });

        return { detailsByGrnId, otherCostList };
    }, []);

    /* ---------------- search filter ---------------- */
    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return list;

        return list.filter((item) =>
            (item.grnCode || '').toLowerCase().includes(q)
        );
    }, [list, searchQuery]);

    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [searchQuery]);

    /* ---------------- Selection helpers ---------------- */
    const allVisibleSelected =
        filteredRows.length > 0 && filteredRows.every((row) => selectedGrnIds.includes(row.id));
    const someVisibleSelected = filteredRows.some((row) => selectedGrnIds.includes(row.id));

    const toggleRow = async (id) => {
        const isCurrentlySelected = selectedGrnIds.includes(id);

        if (isCurrentlySelected) {
            setSelectedGrnIds((prev) => prev.filter((x) => x !== id));
            return;
        }

        // Add to selection
        setSelectedGrnIds((prev) => [...prev, id]);

        // If details already fetched, skip API
        if (grnDetails[id] && grnDetails[id].length > 0) {
            return;
        }

        try {
            const { detailsByGrnId, otherCostList } = await fetchMultipleGrnDetails([id]);
            const newDetails = detailsByGrnId[id] || [];

            setGrnDetails((prev) => ({
                ...prev,
                [id]: newDetails,
            }));

            if (otherCostList.length > 0) {
                setOtherCosts((prev) => [...prev, ...otherCostList]);
            }

            setList((prev) =>
                prev.map((grn) =>
                    grn.id === id
                        ? {
                            ...grn,
                            details: newDetails,
                            poCode: newDetails[0]?.poCode || grn.poCode || '—',
                            itemsReceived: newDetails.length,
                        }
                        : grn
                )
            );
        } catch (err) {
            console.error(`Failed to load details for GRN ${id}:`, err);
            toast.error(
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                'Failed to load GRN details.'
            );
            setSelectedGrnIds((prev) => prev.filter((x) => x !== id));
        }
    };

    const toggleAllVisible = async () => {
        const visibleIds = filteredRows.map((r) => r.id);

        if (allVisibleSelected) {
            setSelectedGrnIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
            return;
        }

        setSelectedGrnIds((prev) => Array.from(new Set([...prev, ...visibleIds])));

        // Find IDs that do not have their details loaded yet
        const idsToFetch = visibleIds.filter(
            (id) => !grnDetails[id] || grnDetails[id].length === 0
        );

        if (!idsToFetch.length) return;

        try {
            // One single call for all missing IDs
            const { detailsByGrnId, otherCostList } = await fetchMultipleGrnDetails(idsToFetch);

            setGrnDetails((prev) => ({
                ...prev,
                ...detailsByGrnId,
            }));

            if (otherCostList.length > 0) {
                setOtherCosts((prev) => [...prev, ...otherCostList]);
            }

            setList((prev) =>
                prev.map((grn) => {
                    const rowDetails = detailsByGrnId[grn.id];
                    if (!rowDetails) return grn;

                    return {
                        ...grn,
                        details: rowDetails,
                        poCode: rowDetails[0]?.poCode || grn.poCode || '—',
                        itemsReceived: rowDetails.length,
                    };
                })
            );
        } catch (err) {
            console.error('Failed to load selected GRN details:', err);
            toast.error('Failed to load details for selected GRNs.');
        }
    };

    /* ---------------- Generate GRN Invoice ---------------- */
    const handleGenerateGrnInvoice = async () => {
        if (selectedGrnIds.length === 0) {
            toast.error('Select at least one GRN to generate an invoice.');
            return;
        }

        try {
            setLoading(true);

            // ALWAYS call the API for all selected GRN IDs (e.g. "26,27")
            const { detailsByGrnId, otherCostList } = await fetchMultipleGrnDetails(selectedGrnIds);

            // Update local state with fresh data from backend
            setGrnDetails((prev) => ({
                ...prev,
                ...detailsByGrnId,
            }));
            setOtherCosts(otherCostList);

            // Combine the fresh details into each selected GRN item
            const detailedGrns = list
                .filter((g) => selectedGrnIds.includes(g.id))
                .map((grn) => ({
                    ...grn,
                    details: detailsByGrnId[grn.id] || [],
                }));

            navigate('/purchase/purchase-invoice/generate-grn-invoice', {
                state: {
                    selectedGrns: detailedGrns,
                    otherCosts: otherCostList || [],
                },
            });
        } catch (err) {
            console.error('Failed to prepare GRN details:', err);
            toast.error(
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                'Failed to load selected GRN details.'
            );
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- Columns ---------------- */
    const columns = useMemo(
        () => [
            {
                id: 'select',
                header: () => (
                    <button
                        type="button"
                        onClick={toggleAllVisible}
                        className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition ${
                            allVisibleSelected || someVisibleSelected
                                ? 'bg-[#084E92] border-[#084E92]'
                                : 'bg-white border-gray-300'
                        }`}
                        title={allVisibleSelected ? 'Deselect all' : 'Select all'}
                    >
                        {(allVisibleSelected || someVisibleSelected) && (
                            <Minus size={12} className="text-white" strokeWidth={3} />
                        )}
                    </button>
                ),
                cell: ({ row }) => {
                    const checked = selectedGrnIds.includes(row.original.id);
                    return (
                        <button
                            type="button"
                            onClick={() => toggleRow(row.original.id)}
                            className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition ${
                                checked ? 'bg-[#084E92] border-[#084E92]' : 'bg-white border-gray-300'
                            }`}
                        >
                            {checked && (
                                <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-none stroke-white" strokeWidth={2.5}>
                                    <path d="M3 8.5 6.2 11.5 13 4.5" />
                                </svg>
                            )}
                        </button>
                    );
                },
                enableSorting: false,
                size: 50,
            },
            {
                id: 'sno',
                header: ({ column }) => (
                    <DataGridColumnHeader title="S.NO" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-500 py-2">{String(row.index + 1).padStart(2, '0')}</span>
                ),
                enableSorting: false,
                size: 70,
                minSize: 60,
            },
            {
                id: 'grnCode',
                accessorFn: (row) => row.grnCode,
                header: ({ column }) => (
                    <DataGridColumnHeader title="GRN CODE" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <TruncatedCell
                        value={row.original.grnCode}
                        widthClass="max-w-[260px]"
                        className="font-semibold text-[#084E92]"
                    />
                ),
                size: 180,
            },
            {
                id: 'poCode',
                accessorFn: (row) => row.poCode,
                header: ({ column }) => (
                    <DataGridColumnHeader title="PO CODE" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <PoCodeCell value={row.original.poCode} />,
                size: 180,
            },
            {
                id: 'grnDate',
                accessorFn: (row) => row.grnDate,
                header: ({ column }) => (
                    <DataGridColumnHeader title="GRN DATE" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <TruncatedCell value={row.original.grnDate} widthClass="max-w-[120px]" />,
                size: 130,
            },
            {
                id: 'organizationName',
                accessorFn: (row) => row.organizationName,
                header: ({ column }) => (
                    <DataGridColumnHeader title="UNIT NAME" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <TruncatedCell value={row.original.organizationName} widthClass="max-w-[180px]" />,
                size: 160,
            },
            {
                id: 'createdBy',
                accessorFn: (row) => row.createdBy,
                header: ({ column }) => (
                    <DataGridColumnHeader title="RAISED BY" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <TruncatedCell value={row.original.createdBy} widthClass="max-w-[140px]" />,
                size: 150,
            },
            {
                id: 'itemsReceived',
                accessorFn: (row) => row.itemsReceived,
                header: ({ column }) => (
                    <DataGridColumnHeader title="ITEMS RECEIVED" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <span className="font-medium text-gray-700">{row.original.itemsReceived} Items</span>
                ),
                size: 140,
            },
            {
                id: 'status',
                accessorFn: (row) => row.status,
                header: ({ column }) => (
                    <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
                size: 130,
            },
        ],
        [selectedGrnIds, allVisibleSelected, someVisibleSelected, filteredRows]
    );

    const table = useReactTable({
        data: filteredRows,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const outletOptions = units.map((o) => ({ value: String(o.id), label: o.name }));
    const vendorOptions = vendors.map((v) => ({ value: String(v.id), label: v.fullName }));

    return (
        <Container>
            <div className="mx-auto pt-2 pb-6 space-y-4">
                <PageHeader
                    title="Purchase Invoice"
                />

                {scopeError && (
                    <div className="mb-4 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-[#C0293D]">{scopeError}</span>
                        <button onClick={retryScope} className="text-xs font-semibold text-[#C0293D] underline shrink-0">
                            Retry
                        </button>
                    </div>
                )}

                {/* Search GRN card */}
                <div className="bg-white rounded-2xl border border-[#E7EAF0] p-6 mb-6">
                    <div className="flex items-center gap-2 mb-5">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Search size={16} className="text-[#084E92]" />
                        </span>
                        <h2 className="text-base font-bold text-[#101828]">Search GRN</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-5">
                        <div className="col-span-2">
                            <label className="text-sm font-semibold text-[#101828] mb-1.5 block">
                                Unit <span className="text-red-500">*</span>
                            </label>
                            {showUnitDropdown ? (
                                <SearchableSelect
                                    name="outlet"
                                    value={selectedUnitId ? String(selectedUnitId) : ''}
                                    onChange={(e) =>
                                        setSelectedUnitId(e.target.value ? Number(e.target.value) : null)
                                    }
                                    options={outletOptions}
                                    placeholder={scopeLoading ? 'Loading units...' : 'Select unit'}
                                    disabled={scopeLoading || outletOptions.length === 0}
                                />
                            ) : (
                                <div className="h-10.5 flex items-center px-3.5 rounded-xl border border-[#E7EAF0] bg-gray-50 text-sm text-[#101828] font-medium">
                                    {units[0]?.name || (scopeLoading ? 'Loading…' : '—')}
                                </div>
                            )}
                        </div>

                        <div className="col-span-2">
                            <label className="text-sm font-semibold text-[#101828] mb-1.5 block">
                                Vendor <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                name="vendor"
                                value={selectedVendorId ? String(selectedVendorId) : ''}
                                onChange={(e) =>
                                    setSelectedVendorId(e.target.value ? Number(e.target.value) : null)
                                }
                                options={vendorOptions}
                                placeholder={
                                    vendorsLoading
                                        ? 'Loading vendors...'
                                        : vendorOptions.length
                                            ? 'Select vendor'
                                            : 'No vendors'
                                }
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleSearchGrn}
                            disabled={loading}
                            className="flex items-center h-max lg:w-full shrink-0 w-max self-end gap-2 px-4 py-3 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition disabled:opacity-60"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            Search GRN
                        </button>
                    </div>
                </div>

                {/* GRN Listing card */}
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <FileText size={16} className="text-[#084E92]" />
                        </span>
                        <h2 className="text-base font-bold text-[#101828]">GRN Listing</h2>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative min-w-60">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search GRN code..."
                                className="w-full h-10.5 pl-10 pr-4 rounded-xl border border-[#E7EAF0] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
                            />
                        </div>

                        {selectedGrnIds.length > 0 && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 text-[#084E92] text-sm font-semibold">
                                {selectedGrnIds.length} GRN{selectedGrnIds.length > 1 ? 's' : ''} Selected
                            </span>
                        )}

                        <button
                            type="button"
                            onClick={handleGenerateGrnInvoice}
                            disabled={loading || selectedGrnIds.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer border border-[#E7EAF0] bg-[#084E92] text-white text-sm font-semibold hover:bg-blue-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileText size={16} />
                            Generate GRN Invoice
                        </button>
                    </div>
                </div>

                {grnError && (
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 text-sm text-[#C0293D]">
                        <span>{grnError}</span>
                        <button
                            type="button"
                            onClick={handleSearchGrn}
                            className="ml-auto font-semibold underline cursor-pointer bg-transparent border-0"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Table card */}
                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading goods received notes…
                        </div>
                    ) : !searched ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Search size={22} />
                            Select a unit and vendor, then click Search GRN.
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-[#98A2B3] text-sm">
                            No GRNs found for this unit and vendor.
                        </div>
                    ) : (
                        <DataGrid
                            table={table}
                            recordCount={filteredRows.length}
                            className="rounded-2xl"
                        >
                            <Card className="rounded-t-none border-t-0 rounded-2xl">
                                <CardTable>
                                    <ScrollArea>
                                        <DataGridTable />
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>
                                </CardTable>
                                <CardFooter className="bg-[#F9FAFC] rounded-b-2xl">
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

export default PurchaseInvoice;