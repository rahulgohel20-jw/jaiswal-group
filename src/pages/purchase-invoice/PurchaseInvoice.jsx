import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    getSortedRowModel,
} from '@tanstack/react-table';
import {
    ChevronRight,
    FileText,
    Loader2,
    Minus,
    Plus,
    RotateCcw,
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
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

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
        className="inline-block max-w-full truncate text-xs font-semibold text-gray-700"
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
    const { canAdd, canEdit, canDelete, canView } = usePagePermissions('Generate Purchase Invoice');

    /* ---------------- Vendor dropdown ---------------- */
    const [vendors, setVendors] = useState([]);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState('');

    /* ---------------- GRN listing ---------------- */
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [grnError, setGrnError] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

    const [selectedGrnIds, setSelectedGrnIds] = useState([]);
    const [grnDetails, setGrnDetails] = useState({});
    const [otherCosts, setOtherCosts] = useState([]);
    const [sorting, setSorting] = useState([]);

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

    // Helper: extracts a valid positive integer ID or returns null
    const cleanId = (val) => {
        if (val === null || val === undefined || val === '' || val === '0' || Number(val) <= 0) {
            return null;
        }
        return Number(val);
    };

    const resolvedOrgId = useMemo(() => {
        const fromDropdown = cleanId(selectedUnitId);
        if (fromDropdown !== null) return fromDropdown;

        const fromOutlet = cleanId(effectiveOutletId);
        if (fromOutlet !== null) return fromOutlet;

        return null;
    }, [selectedUnitId, effectiveOutletId]);

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

    /* ---------------- Fetch GRN listing (Default & Filtered) ---------------- */
    const fetchGrns = useCallback(async () => {
        setLoading(true);
        setGrnError(null);
        setSelectedGrnIds([]);

        try {
            const params = {};
            if (resolvedOrgId) {
                params.outletId = resolvedOrgId;
            }
            if (selectedVendorId) {
                params.vendorId = Number(selectedVendorId);
            }

            const res = await getEligibleGrns(params);
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
        } finally {
            setLoading(false);
        }
    }, [resolvedOrgId, selectedVendorId]);

    useEffect(() => {
        fetchGrns();
    }, [fetchGrns]);

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

    /* ---------------- Search filter ---------------- */
    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return list;

        return list.filter((item) =>
            (item.grnCode || '').toLowerCase().includes(q) ||
            (item.poCode || '').toLowerCase().includes(q) ||
            (item.vendorName || '').toLowerCase().includes(q) ||
            (item.organizationName || '').toLowerCase().includes(q)
        );
    }, [list, searchQuery]);

    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [searchQuery]);

    /* ---------------- Selection helpers (Vendor constraint enforced) ---------------- */
    const selectedGrnItems = useMemo(
        () => list.filter((item) => selectedGrnIds.includes(item.id)),
        [list, selectedGrnIds]
    );

    const activeVendorId = selectedGrnItems.length > 0 ? selectedGrnItems[0].vendorId : null;
    const activeOrgId = selectedGrnItems.length > 0 ? selectedGrnItems[0].organizationId : null;

    // Check if the current filtered view has homogeneous vendor and unit
    const hasMultipleVendorsOrOrgsInView = useMemo(() => {
        if (filteredRows.length <= 1) return false;
        const firstVendor = filteredRows[0].vendorId;
        const firstOrg = filteredRows[0].organizationId;
        return filteredRows.some(
            (r) => r.vendorId !== firstVendor || r.organizationId !== firstOrg
        );
    }, [filteredRows]);

    const selectableVisibleRows = useMemo(() => {
        if (activeVendorId !== null && activeOrgId !== null) {
            return filteredRows.filter(
                (r) => r.vendorId === activeVendorId && r.organizationId === activeOrgId
            );
        }
        // If nothing is selected and rows have different vendors/units, bulk select cannot pick all
        if (hasMultipleVendorsOrOrgsInView) return [];
        return filteredRows;
    }, [filteredRows, activeVendorId, activeOrgId, hasMultipleVendorsOrOrgsInView]);

    const allVisibleSelected =
        selectableVisibleRows.length > 0 &&
        selectableVisibleRows.every((row) => selectedGrnIds.includes(row.id));
    const someVisibleSelected =
        selectedGrnIds.length > 0;

    const toggleRow = async (rowItem) => {
        const id = rowItem.id;
        const isCurrentlySelected = selectedGrnIds.includes(id);

        if (isCurrentlySelected) {
            setSelectedGrnIds((prev) => prev.filter((x) => x !== id));
            return;
        }

        // Restrict selection to the same vendor
        if (
            (activeVendorId !== null && rowItem.vendorId !== activeVendorId) ||
            (activeOrgId !== null && rowItem.organizationId !== activeOrgId)
        ) {
            toast.warning('You can only select GRNs belonging to the same vendor and unit.');
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
        if (selectedGrnIds.length === 0 && hasMultipleVendorsOrOrgsInView) {
            toast.warning('Cannot select all: list contains different vendors or units. Please filter or select individual rows.');
            return;
        }
        const targetRows = selectableVisibleRows;
        const targetIds = targetRows.map((r) => r.id);

        if (targetIds.length === 0) return;

        if (allVisibleSelected) {
            setSelectedGrnIds((prev) => prev.filter((id) => !targetIds.includes(id)));
            return;
        }

        setSelectedGrnIds((prev) => Array.from(new Set([...prev, ...targetIds])));

        const idsToFetch = targetIds.filter(
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

    /* ---------------- Generate GRN Invoice (Single Row Action) ---------------- */
    const handleSingleRowGenerate = async (grnItem) => {
        try {
            setLoading(true);

            const { detailsByGrnId, otherCostList } = await fetchMultipleGrnDetails([grnItem.id]);
            const rowDetails = detailsByGrnId[grnItem.id] || [];

            navigate('/purchase/purchase-invoice/generate-grn-invoice', {
                state: {
                    selectedGrns: [
                        {
                            ...grnItem,
                            details: rowDetails,
                        },
                    ],
                    otherCosts: otherCostList || [],
                },
            });
        } catch (err) {
            console.error('Failed to prepare GRN details for invoice:', err);
            toast.error(
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                'Failed to load GRN details.'
            );
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = () => {
        setSearchQuery('');
        setSelectedUnitId('');
        setSelectedVendorId('');
    };

    /* ---------------- Columns ---------------- */
    const columns = useMemo(
        () => [
            canAdd && {
                id: 'select',
                header: () => {
                    const isSelectAllDisabled = selectedGrnIds.length === 0 && hasMultipleVendorsOrOrgsInView;

                    return (
                        <button
                            type="button"
                            onClick={toggleAllVisible}
                            disabled={isSelectAllDisabled}
                            className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition ${
                                allVisibleSelected || someVisibleSelected
                                    ? 'bg-[#084E92] border-[#084E92]'
                                    : isSelectAllDisabled
                                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                    : 'bg-white border-gray-300'
                            }`}
                            title={
                                isSelectAllDisabled
                                    ? 'Cannot select all: GRNs belong to different vendors or units'
                                    : allVisibleSelected
                                    ? 'Deselect all'
                                    : 'Select all'
                            }
                        >
                            {(allVisibleSelected || someVisibleSelected) && (
                                <Minus size={12} className="text-white" strokeWidth={3} />
                            )}
                        </button>
                    );
                },
                cell: ({ row }) => {
                    const isChecked = selectedGrnIds.includes(row.original.id);
                    const isMismatched =
                        (activeVendorId !== null && row.original.vendorId !== activeVendorId) ||
                        (activeOrgId !== null && row.original.organizationId !== activeOrgId);

                    return (
                        <button
                            type="button"
                            onClick={() => toggleRow(row.original)}
                            disabled={isMismatched && !isChecked}
                            title={isMismatched ? 'Cannot select GRN from a different vendor or unit' : ''}
                            className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition ${
                                isChecked
                                    ? 'bg-[#084E92] border-[#084E92]'
                                    : isMismatched
                                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-40'
                                    : 'bg-white border-gray-300'
                            }`}
                        >
                            {isChecked && (
                                <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-none stroke-white" strokeWidth={2.5}>
                                    <path d="M3 8.5 6.2 11.5 13 4.5" />
                                </svg>
                            )}
                        </button>
                    );
                },
                enableSorting: false,
                size: 40,
            },
            {
                id: 'sno',
                header: ({ column }) => (
                    <DataGridColumnHeader title="S.NO" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-500 py-2 text-xs">{String(row.index + 1).padStart(2, '0')}</span>
                ),
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
                        className="font-semibold text-[#084E92] text-xs"
                    />
                ),
                size: 150,
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
                cell: ({ row }) => <TruncatedCell value={row.original.grnDate} widthClass="max-w-[120px]" className="text-xs text-gray-600" />,
                size: 110,
            },
            {
                id: 'organizationName',
                accessorFn: (row) => row.organizationName,
                header: ({ column }) => (
                    <DataGridColumnHeader title="UNIT NAME" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <TruncatedCell value={row.original.organizationName} widthClass="max-w-[180px]" className="text-xs text-gray-800" />,
                size: 110,
                enableSorting: false
            },
            {
                id: 'vendorName',
                accessorFn: (row) => row.vendorName,
                header: ({ column }) => (
                    <DataGridColumnHeader title="VENDOR NAME" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <TruncatedCell value={row.original.vendorName} widthClass="max-w-[180px]" className="text-xs text-gray-800 font-medium" />,
                size: 120,
                enableSorting: false
            },
            {
                id: 'createdBy',
                accessorFn: (row) => row.createdBy,
                header: ({ column }) => (
                    <DataGridColumnHeader title="RAISED BY" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <TruncatedCell value={row.original.createdBy} widthClass="max-w-[140px]" className="text-xs text-gray-600" />,
                size: 120,
            },
            {
                id: 'itemsReceived',
                accessorFn: (row) => row.itemsReceived,
                header: ({ column }) => (
                    <DataGridColumnHeader title="ITEMS RECEIVED" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <span className="font-medium text-gray-700 text-xs">{row.original.itemsReceived} Items</span>
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
                size: 90,
            },
            canAdd && {
                id: 'action',
                header: () => <span className="text-xs font-semibold text-gray-500 uppercase">Action</span>,
                cell: ({ row }) => {
                    if (!canAdd) return null;

                    return (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                title="Generate purchase invoice"
                                onClick={() => handleSingleRowGenerate(row.original)}
                                className="flex items-center justify-center w-8 h-8 text-[#084E92] hover:text-blue-900 transition cursor-pointer"
                            >
                                <Plus size={15} strokeWidth={2.5} />
                            </button>
                        </div>
                    );
                },
                enableSorting: false,
                size: 70,
            },
        ].filter(Boolean),
        [
            selectedGrnIds,
            allVisibleSelected,
            someVisibleSelected,
            selectableVisibleRows,
            activeVendorId,
            activeOrgId,
            hasMultipleVendorsOrOrgsInView,
            handleSingleRowGenerate,
            canAdd,
        ]
    );

    const table = useReactTable({
        data: filteredRows,
        columns,
        state: { pagination, sorting, },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
    });

    const outletOptions = useMemo(
        () => units.map((o) => ({ value: String(o.id), label: o.name })),
        [units]
    );

    // Displays vendor company name instead of vendor individual name
    const vendorOptions = useMemo(
        () =>
            vendors.map((v) => ({
                value: String(v.id),
                label: v.companyName || v.fullName || v.vendorName || `Vendor #${v.id}`,
            })),
        [vendors]
    );

    if (!canView) {
        return <AccessDenied pageTitle="Generate Purchase Invoice" />;
    }


    return (
        <Container>
            <div className="mx-auto pt-2 pb-6 space-y-4">
                <PageHeader
                    title="Generate Purchase Invoice"
                />

                {scopeError && (
                    <div className="mb-4 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-[#C0293D]">{scopeError}</span>
                        <button onClick={retryScope} className="text-xs font-semibold text-[#C0293D] underline shrink-0">
                            Retry
                        </button>
                    </div>
                )}

                {/* Filter Toolbar: Search Input -> Unit Filter -> Vendor Filter -> Generate Invoice Button */}
                <div className="my-6">
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${showUnitDropdown ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 items-center`}>
                        {/* 1. Search GRN */}
                        <div className={`relative  ${!canAdd ? "lg:col-span-3 sm:col-span-3" : "lg:col-span-2 sm:col-span-2"}`}>
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search GRN Code, PO Code, Vendor, Unit..."
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#C3C6D1] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
                            />
                        </div>

                        {/* 2. Unit / Outlet Dropdown */}
                        {showUnitDropdown && (
                            <div className="lg:col-span-1">
                                <SearchableSelect
                                    name="outlet"
                                    value={selectedUnitId ? String(selectedUnitId) : ''}
                                    onChange={(val) => {
                                        const raw = val?.target ? val.target.value : (val?.value !== undefined ? val.value : val);
                                        setSelectedUnitId(raw ? String(raw) : '');
                                    }}
                                    options={outletOptions}
                                    placeholder={scopeLoading ? 'Loading units...' : 'All Units'}
                                    disabled={scopeLoading || outletOptions.length === 0}
                                />
                            </div>
                        )}

                        {/* 3. Vendor Dropdown */}
                        <div className="lg:col-span-1">
                            <SearchableSelect
                                name="vendor"
                                value={selectedVendorId}
                                onChange={(val) => {
                                    const raw = val?.target ? val.target.value : (val?.value !== undefined ? val.value : val);
                                    setSelectedVendorId(raw ? String(raw) : '');
                                }}
                                options={vendorOptions}
                                placeholder={vendorsLoading ? 'Loading vendors...' : 'All Vendors'}
                                disabled={vendorsLoading}
                            />
                        </div>

                        {/* 4. Action Controls & Generate Purchase Invoice */}
                        {canAdd && <div className="flex items-center gap-2 lg:col-span-1">
                            <button
                                type="button"
                                onClick={handleGenerateGrnInvoice}
                                disabled={loading || selectedGrnIds.length === 0}
                                className="flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-lg cursor-pointer bg-[#084E92] text-white text-sm font-semibold hover:bg-[#073e77] transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                <FileText size={16} />
                                Generate Purchase Invoice
                            </button>
                        </div>}
                    </div>
                </div>

                {grnError && (
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 text-sm text-[#C0293D]">
                        <span>{grnError}</span>
                        <button
                            type="button"
                            onClick={fetchGrns}
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
                    ) : filteredRows.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-[#98A2B3] text-sm">
                            No GRNs match these filters.
                        </div>
                    ) : (
                        <DataGrid
                            table={table}
                            recordCount={filteredRows.length}
                            className="rounded-2xl"
                            tableLayout={{
                                dense: true,
                                width: 'fixed',
                                cellBorder: true,
                                headerBorder: true,
                                rowBorder: true,
                            }}
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