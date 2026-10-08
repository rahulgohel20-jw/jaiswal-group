import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { Calendar, ChevronDown, Eye, Loader2, RotateCcw, Search, ChevronRight, Pen } from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
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
import { useOrgScope } from '../../hooks/useOrgScope';

const STATUS_OPTIONS = ['All Status', 'Approved', 'Draft'];
const STATUS_VALUE_MAP = { Draft: 'DRAFT', Approved: 'APPROVED' };
const STATUS_TEXT_COLORS = {
    DRAFT: 'text-amber-600',
    APPROVED: 'text-emerald-600',
};
const PAGE_SIZE = 10;

const StatusBadge = ({ status }) => {
    const color = STATUS_TEXT_COLORS[status] || 'text-gray-600';
    return (
        <span className={`font-semibold text-xs whitespace-nowrap ${color}`}>
            {status || '—'}
        </span>
    );
};

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

    const scope = useOrgScope();
    const {
        loading: scopeLoading,
        error: scopeError,
        showUnitDropdown,
        units,
        selectedUnitId,
        setSelectedUnitId,
        effectiveOutletId,
        filterRowsByScope,
        retry: retryScope,
    } = scope;

    // Helper: extracts a valid positive integer ID or returns null
    const cleanId = (val) => {
        if (val === null || val === undefined || val === '' || val === '0' || Number(val) <= 0) {
            return null;
        }
        return Number(val);
    };

    // 1. If user selected an outlet from dropdown, prioritize it.
    // 2. Otherwise fall back to effectiveOutletId or main group organization ID.
    const resolvedOrgId = useMemo(() => {
        const fromDropdown = cleanId(selectedUnitId);
        if (fromDropdown !== null) return fromDropdown;

        const fromOutlet = cleanId(effectiveOutletId);
        if (fromOutlet !== null) return fromOutlet;

        const fromScope = cleanId(scope?.organizationId || scope?.rootOrgId || scope?.mainOrgId || scope?.userOrgId);
        if (fromScope !== null) return fromScope;

        return null;
    }, [selectedUnitId, effectiveOutletId, scope]);

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
        setSelectedUnitId('');
        setSelectedVendorId('');
        clearDateRange();
    };

    // Reset page to 0 when any filter changes
    useEffect(() => {
        setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
    }, [statusFilter, resolvedOrgId, selectedVendorId]);

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

            // Only attach organizationId if it is a valid ID (> 0)
            if (resolvedOrgId !== null && resolvedOrgId > 0) {
                params.organizationId = resolvedOrgId;
            }

            if (selectedVendorId) {
                params.vendorId = Number(selectedVendorId);
            }

            if (statusFilter !== 'All Status') {
                params.status = STATUS_VALUE_MAP[statusFilter];
            }

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
        resolvedOrgId,
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
            header: ({ column }) => <DataGridColumnHeader title="UNIT NAME" column={column} className="my-2 text-xs" />,
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
      <div className="pt-2 pb-6 mx-auto space-y-4">
        <PageHeader
          title="Purchase Invoice Listing"
          actions={
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#084E92] text-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#084E92]" />
                Showing {pageInfo.totalElements} Record{pageInfo.totalElements !== 1 ? 's' : ''}
              </span>
            </div>
          }
        />

                {scopeError && (
                    <div className="mb-4 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-[#C0293D]">{scopeError}</span>
                        <button onClick={retryScope} className="text-xs font-semibold text-[#C0293D] underline shrink-0">
                            Retry
                        </button>
                    </div>
                )}

                <div className="my-6">
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${showUnitDropdown ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
                        <div className="relative sm:col-span-2 lg:col-span-2">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search Invoice Code, Vendor Invoice Number, Vendor Name"
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#C3C6D1] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
                            />
                        </div>

                        {showUnitDropdown && (
                            <div className="lg:col-span-1">
                                <SearchableSelect
                                    name="outlet"
                                    value={selectedUnitId ? String(selectedUnitId) : ''}
                                    onChange={val => {
                                        // Handles event objects, { value, label } items, and direct string/number values
                                        const raw = val?.target ? val.target.value : (val?.value !== undefined ? val.value : val);
                                        setSelectedUnitId(raw ? String(raw) : '');
                                    }}
                                    options={units.map(u => ({ value: String(u.id), label: u.name }))}
                                    placeholder={units.length === 0 ? 'No units available' : 'All Units'}
                                    disabled={units.length === 0}
                                />
                            </div>
                        )}

                        <div className="lg:col-span-1">
                            <SearchableSelect
                                name="vendor"
                                value={selectedVendorId}
                                onChange={val => {
                                    const raw = val?.target ? val.target.value : (val?.value !== undefined ? val.value : val);
                                    setSelectedVendorId(raw ? String(raw) : '');
                                }}
                                options={vendorOptions}
                                placeholder={vendorLoading ? 'Loading...' : 'All Vendors'}
                                disabled={vendorLoading}
                            />
                        </div>

                        <div className="flex gap-3 lg:col-span-1">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-10 w-full border-[#C3C6D1] rounded-lg">
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