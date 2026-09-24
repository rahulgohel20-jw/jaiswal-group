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
    Printer,
    Search,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import SearchableSelect from '@/utils/SearchableSelect';
import { OrgTypes } from '../../constants/orgTypes';
import {
    getOrganizationByType,
} from '@/services/apiServices';
import { toast } from 'sonner';
import { getAllActiveVendors, getEligibleGrnDetails, getEligibleGrns } from '../../services/apiServices';
import { useNavigate } from 'react-router';

const STATUS_STYLES = {
    OPEN: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    Open: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    open: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    CLOSED: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    Closed: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    closed: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    CANCELLED: 'bg-red-50 text-red-600 border border-red-200',
    Cancelled: 'bg-red-50 text-red-600 border border-red-200',
    cancelled: 'bg-red-50 text-red-600 border border-red-200',
};

const STATUS_DOT = {
    OPEN: 'bg-emerald-500',
    Open: 'bg-emerald-500',
    open: 'bg-emerald-500',
    CLOSED: 'bg-emerald-500',
    Closed: 'bg-emerald-500',
    closed: 'bg-emerald-500',
    CANCELLED: 'bg-red-500',
    Cancelled: 'bg-red-500',
    cancelled: 'bg-red-500',
};

const StatusBadge = ({ status }) => {
    const display = status || 'Closed';
    return (
        <span
            className={`inline-flex items-center gap-1.5 font-semibold rounded-full text-xs px-2.5 py-1 capitalize ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`} />
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

// PO Code renders as a light badge/chip, matching the reference screen
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
    /* ---------------- Outlet dropdown ---------------- */
    const [outlets, setOutlets] = useState([]);
    const [outletsLoading, setOutletsLoading] = useState(false);
    const [selectedOutletId, setSelectedOutletId] = useState(null);

    /* ---------------- Vendor dropdown (via vendor-outlet-mapping/get-all) ---------------- */
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
    const [detailsLoadingIds, setDetailsLoadingIds] = useState([]);

    /* ---------------- Fetch outlets ---------------- */
    useEffect(() => {
        const fetchOutlets = async () => {
            setOutletsLoading(true);
            try {
                const res = await getOrganizationByType(OrgTypes.OUTLET);
                const raw = res?.data?.data || res?.data?.content || res?.data || [];
                const list = Array.isArray(raw) ? raw : [];
                setOutlets(
                    list.map((o) => ({
                        id: o.id,
                        name: o.companyNameEnglish || o.name || `Outlet #${o.id}`,
                    }))
                );
            } catch (err) {
                console.error('Failed to load outlets:', err);
                toast.error('Failed to load outlets.');
            } finally {
                setOutletsLoading(false);
            }
        };
        fetchOutlets();
    }, []);

    /* ---------------- Fetch vendor ---------------- */

    useEffect(() => {
        const fetchVendors = async () => {
            setVendorsLoading(true);
            try {
                const res = await getAllActiveVendors();
                const raw = res?.data?.data || res?.data || [];
                setVendors(Array.isArray(raw) ? raw : []);
            } catch (err) {
                console.error('Failed to load vendor', err);
                toast.error('Failed to load vendors.');
            } finally {
                setVendorsLoading(false);
            }
        };
        fetchVendors();
    }, []);

    /* ---------------- Search GRN ---------------- */

   const handleSearchGrn = useCallback(async () => {
    if (!selectedOutletId || !selectedVendorId) {
        toast.error('Please select outlet and vendor.');
        return;
    }

    setLoading(true);
    setGrnError(null);
    setSelectedGrnIds([]);
    setGrnDetails({});

    try {
        const res = await getEligibleGrns({
            outletId: Number(selectedOutletId),
            vendorId: Number(selectedVendorId),
        });

        const raw = res?.data?.data ?? res?.data ?? [];
        const rawList = Array.isArray(raw) ? raw : [];

        const normalized = rawList.map((g) => {
            const details = Array.isArray(g.eligibleGrnDetailResponseDtos)
                ? g.eligibleGrnDetailResponseDtos
                : [];

            return {
                id: g.grnId,
                grnId: g.grnId,

                grnCode: g.grnCode || `GRN-${g.grnId}`,

                poCode: Array.isArray(g.poCode)
                    ? g.poCode.join(', ')
                    : (g.poCode || '—'),

                grnDate: formatDateShort(g.grnDate),
                rawDate: g.grnDate,

                createdBy: g.createdBy || '—',

                vendorId: g.vendorId,
                vendorName: g.vendorName || '—',

                organizationId: g.organizationId,
                organizationName: g.organizationName || '—',

                status: g.status || 'OPEN',

                // Already coming from first API
                details,

                // Number of eligible GRN detail items
                itemsReceived: details.length,
            };
        });

        setList(normalized);

        // Store all details immediately
        const detailsMap = {};

        normalized.forEach((grn) => {
            detailsMap[grn.id] = grn.details;
        });

        setGrnDetails(detailsMap);

        setSearched(true);
        setPagination((p) => ({
            ...p,
            pageIndex: 0,
        }));
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
}, [selectedOutletId, selectedVendorId]);

    /* ---------------- search filter (search box within listing card) ---------------- */
    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return list;

        return list.filter(
            (item) =>
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
        const alreadySelected = selectedGrnIds.includes(id);

        // Unselect
        if (alreadySelected) {
            setSelectedGrnIds((prev) =>
                prev.filter((x) => x !== id)
            );

            return;
        }

        // Select immediately
        setSelectedGrnIds((prev) => [...prev, id]);

        // Don't call API again if details are already loaded
        if (grnDetails[id]) {
            return;
        }

        try {
            setDetailsLoadingIds((prev) => [...prev, id]);

            const res = await getEligibleGrnDetails(id);
            const details = res?.data?.data ?? [];
            setGrnDetails((prev) => ({
                ...prev,
                [id]: Array.isArray(details) ? details : [],
            }));

            // Update list row with detail information
            setList((prev) =>
                prev.map((grn) =>
                    grn.id === id
                        ? {
                            ...grn,
                            details: Array.isArray(details)
                                ? details
                                : [],
                            poCode:
                                details?.[0]?.poCode || '—',
                            itemsReceived:
                                Array.isArray(details)
                                    ? details.length
                                    : 0,
                        }
                        : grn
                )
            );
        } catch (err) {
            console.error(
                `Failed to load details for GRN ${id}:`,
                err
            );

            toast.error(
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                'Failed to load GRN details.'
            );

            // If API failed, remove selection
            setSelectedGrnIds((prev) =>
                prev.filter((x) => x !== id)
            );
        } finally {
            setDetailsLoadingIds((prev) =>
                prev.filter((x) => x !== id)
            );
        }
    };
    const toggleAllVisible = async () => {
        if (allVisibleSelected) {
            const visibleIds = filteredRows.map((r) => r.id);

            setSelectedGrnIds((prev) =>
                prev.filter((id) => !visibleIds.includes(id))
            );

            return;
        }

        const visibleIds = filteredRows.map((r) => r.id);

        setSelectedGrnIds((prev) =>
            Array.from(new Set([...prev, ...visibleIds]))
        );

        const idsToFetch = visibleIds.filter(
            (id) => !grnDetails[id]
        );

        if (!idsToFetch.length) return;

        try {
            setDetailsLoadingIds((prev) => [
                ...prev,
                ...idsToFetch,
            ]);

            const responses = await Promise.all(
                idsToFetch.map(async (id) => {
                    const res = await getEligibleGrnDetails(id);

                    return {
                        id,
                        details: res?.data?.data ?? [],
                    };
                })
            );

            const detailsMap = {};

            responses.forEach(({ id, details }) => {
                detailsMap[id] = Array.isArray(details)
                    ? details
                    : [];
            });

            setGrnDetails((prev) => ({
                ...prev,
                ...detailsMap,
            }));

            setList((prev) =>
                prev.map((grn) => {
                    const details = detailsMap[grn.id];

                    if (!details) return grn;

                    return {
                        ...grn,
                        details,
                        poCode: details?.[0]?.poCode || '—',
                        itemsReceived: details.length,
                    };
                })
            );
        } catch (err) {
            console.error(
                'Failed to load selected GRN details:',
                err
            );

            toast.error(
                'Failed to load details for one or more GRNs.'
            );
        } finally {
            setDetailsLoadingIds((prev) =>
                prev.filter((id) => !idsToFetch.includes(id))
            );
        }
    };


    const handleGenerateGrnInvoice = async () => {
        if (selectedGrnIds.length === 0) {
            toast.error('Select at least one GRN to generate an invoice.');
            return;
        }

        try {
            setLoading(true);

            const selectedGrns = list.filter((g) =>
                selectedGrnIds.includes(g.id)
            );

            const detailedGrns = await Promise.all(
                selectedGrns.map(async (grn) => {
                    const res = await getEligibleGrnDetails(grn.grnId);

                    const details = res?.data?.data ?? [];

                    return {
                        ...grn, // IMPORTANT: keeps organizationId/vendorId/etc.

                        details: Array.isArray(details)
                            ? details
                            : [],
                    };
                })
            );

            navigate('/purchase/purchase-invoice/generate-grn-invoice', {
                state: {
                    selectedGrns: detailedGrns,
                },
            });
        } catch (err) {
            console.error('Failed to load GRN details:', err);

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
                        className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition ${allVisibleSelected || someVisibleSelected
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
                            className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition ${checked ? 'bg-[#084E92] border-[#084E92]' : 'bg-white border-gray-300'
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
                    <DataGridColumnHeader title="OUTLET NAME" column={column} className="my-2 text-xs" />
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

    const outletOptions = outlets.map((o) => ({ value: String(o.id), label: o.name }));
    const vendorOptions = vendors.map((v) => ({ value: String(v.id), label: v.fullName }));

    return (
        <Container>
            <div className="mx-auto px-4">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className='cursor-pointer hover:text-blue-400' onClick={() => navigate('/')}>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Purchase</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">Purchase Invoice</span>
                </div>

                {/* Page header */}
                <div className="flex items-start justify-between gap-4 flex-wrap my-2">
                    <h1
                        className="text-[28px] font-bold text-[#101828]"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        Purchase Invoice
                    </h1>

                </div>

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
                                Outlet <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                name="outlet"
                                value={selectedOutletId ? String(selectedOutletId) : ''}
                                onChange={(e) =>
                                    setSelectedOutletId(e.target.value ? Number(e.target.value) : null)
                                }
                                options={outletOptions}
                                placeholder={outletsLoading ? 'Loading outlets...' : 'Select outlet'}
                                disabled={outletsLoading}
                            />
                        </div>

                        <div className='col-span-2'>
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
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer border border-[#E7EAF0] bg-gray-100 text-sm font-semibold text-[#101828] hover:bg-gray-200 transition"
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
                            Select an outlet and vendor, then click Search GRN.
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-[#98A2B3] text-sm">
                            No GRNs found for this outlet and vendor.
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
