import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Calendar,
    ChevronDown,
    Eye,
    CheckCircle2,
    RotateCcw,
    Search,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '@/utils/SearchableSelect';
import { OrgTypes } from '../../constants/orgTypes';
import { getOrganizationByType, getAllVendorOutletMappings } from '@/services/apiServices';
import { toast } from 'sonner';
import PurchaseInvoiceDetailsModal from './PurchaseInvoiceDetailsModal';

/* ---------------- dummy invoice data ----------------*/
const DUMMY_INVOICES = [
    { id: 89, invoiceCode: 'PI-2026-OUTLET-0089', vendorInvoiceNumber: 'INV/2026-27/8942', date: '2026-10-24', outletName: 'pdpu-test-abc', vendorName: 'Tata Steel BSL Ltd', status: 'Pending Approval' },
    { id: 88, invoiceCode: 'PI-2026-OUTLET-0088', vendorInvoiceNumber: 'JSL/DEL/99214', date: '2026-10-22', outletName: 'pdpu-test-abc', vendorName: 'Jindal Steel & Power', status: 'Approved' },
    { id: 87, invoiceCode: 'PI-2026-OUTLET-0087', vendorInvoiceNumber: 'AMNS/INV/2026/0411', date: '2026-10-20', outletName: 'Plant-04 West', vendorName: 'ArcelorMittal Nippon', status: 'Pending Approval' },
    { id: 86, invoiceCode: 'PI-2026-OUTLET-0086', vendorInvoiceNumber: 'SAIL-BIL-77821', date: '2026-10-18', outletName: 'Jaiswal Central HQ-01', vendorName: 'Steel Authority of India (SAIL)', status: 'Approved' },
    { id: 85, invoiceCode: 'PI-2026-OUTLET-0085', vendorInvoiceNumber: 'VSL/2026-OCT/102', date: '2026-10-16', outletName: 'pdpu-test-abc', vendorName: 'Vedanta Aluminium Ltd', status: 'Pending Approval' },
    { id: 84, invoiceCode: 'PI-2026-OUTLET-0084', vendorInvoiceNumber: 'INV/2026-27/8804', date: '2026-10-14', outletName: 'Plant-04 West', vendorName: 'Tata Steel BSL Ltd', status: 'Approved' },
    { id: 83, invoiceCode: 'PI-2026-OUTLET-0083', vendorInvoiceNumber: 'RNL-PUM-3312', date: '2026-10-11', outletName: 'pdpu-test-abc', vendorName: 'Ratnamani Metals & Tubes', status: 'Approved' },
    { id: 82, invoiceCode: 'PI-2026-OUTLET-0082', vendorInvoiceNumber: 'JSL/DEL/98811', date: '2026-10-09', outletName: 'Jaiswal Central HQ-01', vendorName: 'Jindal Steel & Power', status: 'Approved' },
    { id: 81, invoiceCode: 'PI-2026-OUTLET-0081', vendorInvoiceNumber: 'AMNS/INV/2026/0398', date: '2026-10-07', outletName: 'Plant-04 West', vendorName: 'ArcelorMittal Nippon', status: 'Rejected' },
    { id: 80, invoiceCode: 'PI-2026-OUTLET-0080', vendorInvoiceNumber: 'VSL/2026-OCT/091', date: '2026-10-05', outletName: 'pdpu-test-abc', vendorName: 'Vedanta Aluminium Ltd', status: 'Approved' },
    { id: 79, invoiceCode: 'PI-2026-OUTLET-0079', vendorInvoiceNumber: 'SAIL-BIL-77690', date: '2026-10-03', outletName: 'Jaiswal Central HQ-01', vendorName: 'Steel Authority of India (SAIL)', status: 'Pending Approval' },
    { id: 78, invoiceCode: 'PI-2026-OUTLET-0078', vendorInvoiceNumber: 'RNL-PUM-3298', date: '2026-10-02', outletName: 'pdpu-test-abc', vendorName: 'Ratnamani Metals & Tubes', status: 'Approved' },
    { id: 77, invoiceCode: 'PI-2026-OUTLET-0077', vendorInvoiceNumber: 'INV/2026-27/8790', date: '2026-09-30', outletName: 'Plant-04 West', vendorName: 'Tata Steel BSL Ltd', status: 'Approved' },
    { id: 76, invoiceCode: 'PI-2026-OUTLET-0076', vendorInvoiceNumber: 'JSL/DEL/98650', date: '2026-09-28', outletName: 'pdpu-test-abc', vendorName: 'Jindal Steel & Power', status: 'Pending Approval' },
];

const STATUS_OPTIONS = ['All Status', 'Pending Approval', 'Approved', 'Rejected'];

const STATUS_STYLES = {
    'Pending Approval': 'bg-amber-50 text-amber-600 border border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    Rejected: 'bg-red-50 text-red-600 border border-red-200',
};

const STATUS_DOT = {
    'Pending Approval': 'bg-amber-500',
    Approved: 'bg-emerald-500',
    Rejected: 'bg-red-500',
};

const StatusBadge = ({ status }) => (
    <span
        className={`inline-flex items-center w-max gap-1.5 font-semibold rounded-full text-[10px] px-2.5 py-1 ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
    >
        <span className={`w-1.5 h-1.5 rounded-full  ${STATUS_DOT[status] || 'bg-gray-400'}`} />
        {status}
    </span>
);

const TruncatedCell = ({ value, widthClass = 'max-w-[180px]', className = 'text-gray-600 text-xs' }) => (
    <span title={value} className={`block truncate ${widthClass} ${className}`}>
        {value || '—'}
    </span>
);

const ChipCell = ({ value }) => (
    <span
        title={value}
        className="inline-block max-w-40 truncate rounded-lg border border-[#E7EAF0] bg-[#F9FAFC] px-3 py-1.5 text-[10px] font-semibold text-gray-700"
    >
        {value || '—'}
    </span>
);

const formatDisplayDate = (iso) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PAGE_SIZE = 10;

const PurchaseInvoiceListing = () => {
    const navigate = useNavigate();

    /* ---------------- Outlet / Vendor filters (real APIs) ---------------- */
    const [outlets, setOutlets] = useState([]);
    const [outletsLoading, setOutletsLoading] = useState(false);
    const [selectedOutletId, setSelectedOutletId] = useState('');

    const [vendorMappings, setVendorMappings] = useState([]);
    const [mappingsLoading, setMappingsLoading] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState('');

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

    useEffect(() => {
        const fetchMappings = async () => {
            setMappingsLoading(true);
            try {
                const res = await getAllVendorOutletMappings();
                const raw = res?.data?.data || res?.data || [];
                setVendorMappings(Array.isArray(raw) ? raw : []);
            } catch (err) {
                console.error('Failed to load vendor-outlet mappings:', err);
                toast.error('Failed to load vendors.');
            } finally {
                setMappingsLoading(false);
            }
        };
        fetchMappings();
    }, []);

    const outletOptions = useMemo(
        () => outlets.map((o) => ({ value: String(o.id), label: o.name })),
        [outlets]
    );

    // Vendors for the selected outlet; every vendor (deduped) when no outlet is chosen
    const vendorOptions = useMemo(() => {
        const seen = new Map();
        vendorMappings
            .filter((m) => !selectedOutletId || String(m.organizationId) === String(selectedOutletId))
            .forEach((m) => {
                if (!seen.has(m.vendorId)) {
                    seen.set(m.vendorId, {
                        value: String(m.vendorId),
                        label: m.vendorCompanyName || m.vendorName || `Vendor #${m.vendorId}`,
                    });
                }
            });
        return Array.from(seen.values());
    }, [vendorMappings, selectedOutletId]);


    useEffect(() => {
        if (selectedVendorId && !vendorOptions.some((v) => v.value === selectedVendorId)) {
            setSelectedVendorId('');
        }
    }, [vendorOptions, selectedVendorId]);

    const selectedOutletLabel = outletOptions.find((o) => o.value === selectedOutletId)?.label;
    const selectedVendorLabel = vendorOptions.find((v) => v.value === selectedVendorId)?.label;

    /* ---------------- other filters ---------------- */
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');

    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [dateRangeOpen, setDateRangeOpen] = useState(false);
    const [draftRange, setDraftRange] = useState(dateRange);

    const openDateRange = () => {
        setDraftRange(dateRange);
        setDateRangeOpen((o) => !o);
    };
    const applyDateRange = () => {
        setDateRange(draftRange);
        setDateRangeOpen(false);
    };
    const clearDateRange = () => {
        setDateRange({ from: '', to: '' });
        setDraftRange({ from: '', to: '' });
        setDateRangeOpen(false);
    };

    const dateRangeLabel =
        dateRange.from && dateRange.to
            ? `${formatDisplayDate(dateRange.from)} - ${formatDisplayDate(dateRange.to)}`
            : 'All dates';

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('All Status');
        setSelectedOutletId('');
        setSelectedVendorId('');
        setDateRange({ from: '', to: '' });
    };


    const [invoices, setInvoices] = useState(DUMMY_INVOICES);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);

    const filteredInvoices = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return invoices.filter((inv) => {
            if (q) {
                const haystack = `${inv.invoiceCode} ${inv.vendorInvoiceNumber} ${inv.vendorName}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            if (statusFilter !== 'All Status' && inv.status !== statusFilter) return false;
            if (selectedOutletLabel && inv.outletName !== selectedOutletLabel) return false;
            if (selectedVendorLabel && inv.vendorName !== selectedVendorLabel) return false;
            if (dateRange.from && inv.date < dateRange.from) return false;
            if (dateRange.to && inv.date > dateRange.to) return false;
            return true;
        });
    }, [invoices, searchQuery, statusFilter, selectedOutletLabel, selectedVendorLabel, dateRange]);


    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [searchQuery, statusFilter, selectedOutletId, selectedVendorId, dateRange]);

    /* ---------------- actions ---------------- */
    const handleView = (invoice) => {
        setSelectedInvoice(invoice);
        setViewModalOpen(true);
    };
    const handleApprove = useCallback((inv) => {
        navigate(`/purchase-invoice/grn-approval/${inv.id}`, { state: { invoice: inv } });
    }, [navigate]);

    /* ---------------- columns ---------------- */
    const columns = useMemo(
        () => [
            {
                id: 'invoiceCode',
                accessorFn: (row) => row.invoiceCode,
                header: ({ column }) => (
                    <DataGridColumnHeader title="INVOICE CODE" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <TruncatedCell
                        value={row.original.invoiceCode}
                        widthClass="max-w-[200px]"
                        className="font-semibold text-[#084E92] text-xs"
                    />
                ),
                size: 180,
            },
            {
                id: 'vendorInvoiceNumber',
                accessorFn: (row) => row.vendorInvoiceNumber,
                header: ({ column }) => (
                    <DataGridColumnHeader title="VENDOR INVOICE NUMBER" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <ChipCell value={row.original.vendorInvoiceNumber} />,
                size: 180,
            },
            {
                id: 'date',
                accessorFn: (row) => row.date,
                header: ({ column }) => (
                    <DataGridColumnHeader title="DATE" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <TruncatedCell value={formatDisplayDate(row.original.date)} widthClass="max-w-[120px]" />
                ),
                size: 110,
            },
            {
                id: 'outletName',
                accessorFn: (row) => row.outletName,
                header: ({ column }) => (
                    <DataGridColumnHeader title="OUTLET NAME" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <ChipCell value={row.original.outletName} />,
                size: 150,
            },
            {
                id: 'vendorName',
                accessorFn: (row) => row.vendorName,
                header: ({ column }) => (
                    <DataGridColumnHeader title="VENDOR NAME" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <TruncatedCell
                        value={row.original.vendorName}
                        widthClass="max-w-[220px]"
                        className="font-medium text-[#101828] text-xs"
                    />
                ),
                size: 180,
            },
            {
                id: 'status',
                accessorFn: (row) => row.status,
                header: ({ column }) => (
                    <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
                size: 150,
            },
            {
                id: 'action',
                header: () => <span className="text-xs font-semibold text-gray-500 uppercase">Action</span>,
                cell: ({ row }) => {
                    const inv = row.original;
                    return (
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => handleView(inv)}
                                className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded-lg border border-[#E7EAF0] bg-white text-xs font-semibold text-[#101828] hover:bg-gray-50 transition"
                            >
                                <Eye size={13} />
                                View
                            </button>
                            {inv.status === 'Approved' ? (
                                <button
                                    type="button"
                                    disabled
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold cursor-default"
                                >
                                    <CheckCircle2 size={13} />
                                    Approved
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleApprove(inv.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded-lg bg-[#084E92] text-white text-xs font-semibold hover:bg-[#073e77] transition"
                                >
                                    <CheckCircle2 size={13} />
                                    Approve
                                </button>
                            )}
                        </div>
                    );
                },
                enableSorting: false,
                size: 180,
            },
        ],
        [handleApprove]
    );

    const table = useReactTable({
        data: filteredInvoices,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <Container>
            <div className="mx-auto p-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                    <h1
                        className="text-[28px] font-bold text-[#101828]"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                        Purchase Invoice Listing
                    </h1>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#084E92] text-sm font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#084E92]" />
                        Showing {filteredInvoices.length} Record{filteredInvoices.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Filter bar */}
                <div className="bg-white rounded-2xl border border-[#E7EAF0] p-4 mb-6">
                    <div className="grid lg:grid-cols-6 gap-3 md:grid-cols-3">
                        <div className="relative flex-1 col-span-2">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search Invoice Code, Vendor Invoice Number, Vendor Name"
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#C3C6D1] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
                            />
                        </div>

                        {/* Date range */}
                        <div className="relative col-span-1">
                            <button
                                type="button"
                                onClick={openDateRange}
                                className="flex items-center gap-2 h-10 px-3.5 w-full min-w-0 justify-between rounded-lg border border-[#C3C6D1] bg-white text-sm text-[#101828] hover:bg-gray-50 transition"
                            >
                                <p className="flex items-center gap-2 min-w-0 flex-1">
                                    <Calendar size={15} className="text-gray-500 shrink-0" />

                                    <span
                                        title={dateRangeLabel}
                                        className="text-sm truncate min-w-0"
                                    >
                                        {dateRangeLabel}
                                    </span>
                                </p>

                                <ChevronDown size={14} className="text-gray-400 shrink-0" />
                            </button>

                            {dateRangeOpen && (
                                <div className="absolute z-20 mt-2 w-72 bg-white border border-[#E7EAF0] rounded-xl shadow-lg p-4 right-0">
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">From</label>
                                            <input
                                                type="date"
                                                value={draftRange.from}
                                                onChange={(e) => setDraftRange((r) => ({ ...r, from: e.target.value }))}
                                                className="w-full h-9 px-2 rounded-lg border border-[#E7EAF0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">To</label>
                                            <input
                                                type="date"
                                                value={draftRange.to}
                                                onChange={(e) => setDraftRange((r) => ({ ...r, to: e.target.value }))}
                                                className="w-full h-9 px-2 rounded-lg border border-[#E7EAF0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={clearDateRange}
                                            className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            onClick={applyDateRange}
                                            className="px-3 py-1.5 rounded-lg bg-[#084E92] text-white text-sm font-semibold hover:bg-[#073e77] transition"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="col-span-1">
                            <SearchableSelect
                                name="outlet"
                                value={selectedOutletId}
                                onChange={(e) => setSelectedOutletId(e.target.value)}
                                options={outletOptions}
                                placeholder={outletsLoading ? 'Loading...' : 'All Outlets'}
                                disabled={outletsLoading}
                            />
                        </div>

                        <div className="col-span-1">
                            <SearchableSelect
                                name="vendor"
                                value={selectedVendorId}
                                onChange={(e) => setSelectedVendorId(e.target.value)}
                                options={vendorOptions}
                                placeholder={mappingsLoading ? 'Loading...' : 'All Vendors'}
                                disabled={mappingsLoading}
                            />
                        </div>

                        {/* Status — static list */}
                        <div className='flex gap-3 '>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-10 w-44 border-[#C3C6D1] rounded-lg">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <button
                                type="button"
                                onClick={resetFilters}
                                title="Reset filters"
                                className="flex items-center justify-center cursor-pointer h-10 w-10 rounded-lg border border-[#C3C6D1] bg-white text-gray-500 hover:bg-gray-50 transition"
                            >
                                <RotateCcw size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table — DataGrid, same pattern as PurchaseInvoice.jsx */}
                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
                    {filteredInvoices.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-[#98A2B3] text-sm">
                            No invoices match these filters.
                        </div>
                    ) : (
                        <DataGrid
                            table={table}
                            recordCount={filteredInvoices.length}
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

            <PurchaseInvoiceDetailsModal
                invoice={selectedInvoice}
                open={viewModalOpen}
                onClose={() => {
                    setViewModalOpen(false);
                    setSelectedInvoice(null);
                }}
            />

        </Container>
    );
};

export default PurchaseInvoiceListing;
