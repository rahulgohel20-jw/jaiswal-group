import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { Calendar, ChevronDown, Eye, Loader2, RotateCcw, Search, ChevronRight, Pen } from 'lucide-react';
import { Container } from '@/components/common/container';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/utils/SearchableSelect';
import { OrgTypes } from '../../constants/orgTypes';
import { getOrganizationByType, getAllActiveVendors, getPurchaseInvoices } from '@/services/apiServices';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['All Status', 'Approved', 'Draft'];
const STATUS_VALUE_MAP = { Draft: 'DRAFT', Approved: 'APPROVED' };
const STATUS_STYLES = {
    DRAFT: 'bg-amber-50 text-amber-600 border border-amber-200',
    APPROVED: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
};
const STATUS_DOT = { DRAFT: 'bg-amber-500', APPROVED: 'bg-emerald-500' };
const PAGE_SIZE = 10;

const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center w-max gap-1.5 font-semibold rounded-full text-[10px] px-2.5 py-1 ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`} />
        {status}
    </span>
);

const TruncatedCell = ({ value, widthClass = 'max-w-[180px]', className = 'text-gray-600 text-xs' }) => (
    <span title={value || ''} className={`block truncate ${widthClass} ${className}`}>
        {value || '—'}
    </span>
);

const ChipCell = ({ value }) => (
    <span title={value || ''} className="inline-block max-w-40 truncate rounded-lg border border-[#E7EAF0] bg-[#F9FAFC] px-3 py-1.5 text-[10px] font-semibold text-gray-700">
        {value || '—'}
    </span>
);

const formatDisplayDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PurchaseInvoiceListing = () => {
    const navigate = useNavigate();

    const [outlets, setOutlets] = useState([]);
    const [outletsLoading, setOutletsLoading] = useState(false);
    const [selectedOutletId, setSelectedOutletId] = useState('');

    const [vendors, setVendors] = useState([]);
    const [vendorLoading, setVendorLoading] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [dateRangeOpen, setDateRangeOpen] = useState(false);
    const [draftRange, setDraftRange] = useState({ from: '', to: '' });

    const [invoices, setInvoices] = useState([]);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [invoicesError, setInvoicesError] = useState(null);
    const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 });
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

    useEffect(() => {
        const fetchOutlets = async () => {
            setOutletsLoading(true);
            try {
                const res = await getOrganizationByType(OrgTypes.OUTLET);
                const raw = res?.data?.data || res?.data?.content || res?.data || [];
                setOutlets(Array.isArray(raw) ? raw.map(o => ({
                    id: o.id,
                    name: o.companyNameEnglish || o.name || `Outlet #${o.id}`,
                })) : []);
            } catch (error) {
                console.error(error);
                toast.error('Failed to load outlets.');
            } finally {
                setOutletsLoading(false);
            }
        };
        fetchOutlets();
    }, []);

    useEffect(() => {
        const fetchVendors = async () => {
            setVendorLoading(true);
            try {
                const res = await getAllActiveVendors();
                const raw = res?.data?.data || res?.data || [];
                setVendors(Array.isArray(raw) ? raw : []);
            } catch (error) {
                console.error(error);
                toast.error('Failed to load vendors.');
            } finally {
                setVendorLoading(false);
            }
        };
        fetchVendors();
    }, []);

    const outletOptions = useMemo(
        () => outlets.map(o => ({ value: String(o.id), label: o.name })),
        [outlets]
    );

    const vendorOptions = useMemo(
        () => vendors.map(v => ({
            value: String(v.id),
            label: v.fullName || v.companyName || v.vendorName || `Vendor #${v.id}`,
        })),
        [vendors]
    );

    const openDateRange = () => {
        setDraftRange(dateRange);
        setDateRangeOpen(prev => !prev);
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

    const dateRangeLabel = dateRange.from && dateRange.to
        ? `${formatDisplayDate(dateRange.from)} - ${formatDisplayDate(dateRange.to)}`
        : 'All dates';

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('All Status');
        setSelectedOutletId('');
        setSelectedVendorId('');
        clearDateRange();
    };

    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [statusFilter, selectedOutletId, selectedVendorId]);

    const normalizeInvoice = useCallback(inv => ({
        ...inv,
        date: inv.invoiceDate,
        outletName: inv.organizationName || `Outlet #${inv.organizationId}`,
        vendorName: inv.vendorName || `Vendor #${inv.vendorId}`,
        grnIds: inv.grnIds || [],
        purchaseOrderIds: inv.purchaseOrderIds || [],
        details: inv.details || [],
        otherCosts: inv.otherCosts || [],
    }), []);

    const fetchInvoices = useCallback(async () => {
        setInvoicesLoading(true);
        setInvoicesError(null);

        try {
            const params = {
                page: pagination.pageIndex,
                size: pagination.pageSize,
                sortBy: 'createdAt',
                direction: 'DESC',
            };

            if (selectedOutletId) params.organizationId = Number(selectedOutletId);
            if (selectedVendorId) params.vendorId = Number(selectedVendorId);
            if (statusFilter !== 'All Status') params.status = STATUS_VALUE_MAP[statusFilter];

            const res = await getPurchaseInvoices(params);
            const body = res?.data || {};
            const rawList = Array.isArray(body.data) ? body.data : [];

            setInvoices(rawList.map(normalizeInvoice));
            setPageInfo({
                totalPages: body.totalPages || 0,
                totalElements: body.totalElements ?? rawList.length,
            });
        } catch (error) {
            console.error('Failed to load purchase invoices:', error);
            setInvoicesError(
                error?.response?.data?.msg ||
                error?.response?.data?.message ||
                'Failed to load purchase invoices.'
            );
        } finally {
            setInvoicesLoading(false);
        }
    }, [
        pagination.pageIndex,
        pagination.pageSize,
        selectedOutletId,
        selectedVendorId,
        statusFilter,
        normalizeInvoice,
    ]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const filteredInvoices = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        return invoices.filter(invoice => {
            if (q) {
                const text = `${invoice.invoiceCode || ''} ${invoice.vendorInvoiceNumber || ''} ${invoice.vendorName || ''} ${invoice.outletName || ''}`.toLowerCase();
                if (!text.includes(q)) return false;
            }

            if (dateRange.from && invoice.date < dateRange.from) return false;
            if (dateRange.to && invoice.date > dateRange.to) return false;

            return true;
        });
    }, [invoices, searchQuery, dateRange]);

    const handleView = useCallback(invoice => {
        navigate(`/purchase/purchase-invoice-details/${invoice.id}`, {
            state: {
                vendorName: invoice.vendorName,
                organizationName: invoice.outletName,
            },
        });
    }, [navigate]);

    const handleEdit = useCallback(invoice => {
        navigate(`/purchase/purchase-invoice/generate-grn/${invoice.id}`);
    }, [navigate]);

    const columns = useMemo(() => [
        {
            id: 'invoiceCode',
            accessorFn: row => row.invoiceCode,
            header: ({ column }) => <DataGridColumnHeader title="INVOICE CODE" column={column} className="my-2 text-xs" />,
            cell: ({ row }) => <TruncatedCell value={row.original.invoiceCode} widthClass="max-w-[200px]" className="font-semibold text-[#084E92] text-xs" />,
            size: 150,
        },
        {
            id: 'vendorInvoiceNumber',
            accessorFn: row => row.vendorInvoiceNumber,
            header: ({ column }) => <DataGridColumnHeader title="VENDOR INVOICE NUMBER" column={column} className="my-2 text-xs" />,
            cell: ({ row }) => <ChipCell value={row.original.vendorInvoiceNumber} />,
            size: 180,
        },
        {
            id: 'date',
            accessorFn: row => row.date,
            header: ({ column }) => <DataGridColumnHeader title="DATE" column={column} className="my-2 text-xs" />,
            cell: ({ row }) => <TruncatedCell value={formatDisplayDate(row.original.date)} widthClass="max-w-[120px]" />,
            size: 110,
        },
        {
            id: 'outletName',
            accessorFn: row => row.outletName,
            header: ({ column }) => <DataGridColumnHeader title="OUTLET NAME" column={column} className="my-2 text-xs" />,
            cell: ({ row }) => <ChipCell value={row.original.outletName} />,
            size: 150,
        },
        {
            id: 'vendorName',
            accessorFn: row => row.vendorName,
            header: ({ column }) => <DataGridColumnHeader title="VENDOR NAME" column={column} className="my-2 text-xs" />,
            cell: ({ row }) => <TruncatedCell value={row.original.vendorName} widthClass="max-w-[220px]" className="font-medium text-[#101828] text-xs" />,
            size: 180,
        },
        {
            id: 'status',
            accessorFn: row => row.status,
            header: ({ column }) => <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />,
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            size: 150,
        },
        {
            id: 'action',
            header: () => <span className="text-xs font-semibold text-gray-500 uppercase">Action</span>,
            cell: ({ row }) => {
                const invoice = row.original;

                return (
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleView(invoice)} className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded-lg border border-[#E7EAF0] bg-white text-xs font-semibold text-[#101828] hover:bg-gray-50 transition">
                            <Eye size={13} />
                        </button>

                        {invoice.status !== 'APPROVED' && invoice.status !== 'Approved' && (
                            <button type="button" onClick={() => handleEdit(invoice)} className="flex items-center cursor-pointer gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold">
                                <Pen size={13} />
                            </button>
                        )}
                    </div>
                );
            },
            enableSorting: false,
            size: 100,
        },
    ], [handleEdit, handleView]);

    const table = useReactTable({
        data: filteredInvoices,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: true,
        pageCount: pageInfo.totalPages || 0,
    });

    return (
        <Container>
            <div className="mx-auto p-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="cursor-pointer hover:text-blue-400" onClick={() => navigate('/')}>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Purchase</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">Purchase Invoice Listing</span>
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap my-2">
                    <h1 className="text-[28px] font-bold text-[#101828]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Purchase Invoice Listing
                    </h1>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#084E92] text-sm font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#084E92]" />
                            Showing {pageInfo.totalElements} Record{pageInfo.totalElements !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="my-6">
                    <div className="grid lg:grid-cols-5 gap-3 md:grid-cols-3">
                        <div className="relative flex-1 col-span-2">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search Invoice Code, Vendor Invoice Number, Vendor Name"
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#C3C6D1] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
                            />
                        </div>


                        <div className="col-span-1">
                            <SearchableSelect
                                name="outlet"
                                value={selectedOutletId}
                                onChange={e => setSelectedOutletId(e.target.value)}
                                options={outletOptions}
                                placeholder={outletsLoading ? 'Loading...' : 'All Outlets'}
                                disabled={outletsLoading}
                            />
                        </div>

                        <div className="col-span-1">
                            <SearchableSelect
                                name="vendor"
                                value={selectedVendorId}
                                onChange={e => setSelectedVendorId(e.target.value)}
                                options={vendorOptions}
                                placeholder={vendorLoading ? 'Loading...' : 'All Vendors'}
                                disabled={vendorLoading}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-10 w-44 border-[#C3C6D1] rounded-lg">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map(status => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <button type="button" onClick={resetFilters} title="Reset filters" className="flex items-center justify-center cursor-pointer h-10 w-10 rounded-lg border border-[#C3C6D1] bg-white text-gray-500 hover:bg-gray-50 transition">
                                <RotateCcw size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
                    {invoicesLoading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading purchase invoices…
                        </div>
                    ) : invoicesError ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-6 px-4 text-sm">
                            <span className="text-[#C0293D]">{invoicesError}</span>
                            <button type="button" onClick={fetchInvoices} className="sm:ml-auto font-semibold text-[#084E92] underline cursor-pointer bg-transparent border-0">
                                Retry
                            </button>
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-[#98A2B3] text-sm">
                            No invoices match these filters.
                        </div>
                    ) : (
                        <DataGrid table={table} recordCount={pageInfo.totalElements} className="rounded-2xl">
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

export default PurchaseInvoiceListing;