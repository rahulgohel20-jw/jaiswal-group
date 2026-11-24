import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    getSortedRowModel,
} from '@tanstack/react-table';
import {
    Loader2,
    Plus,
    Search,
    RotateCcw,
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
import { getAllActiveVendors, getEligibleInvoices } from '../../services/apiServices';
import { useOrgScope } from '../../hooks/useOrgScope';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

const TruncatedCell = ({
    value,
    widthClass = 'max-w-[180px]',
    className = 'text-gray-600',
}) => (
    <span title={value} className={`block truncate ${widthClass} ${className}`}>
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

const DebitCreditEligibleInvoices = () => {
    const navigate = useNavigate();
    const { canView } = usePagePermissions(['Generate Credit Debit Note', 'Debit Credit Note']);

    const [vendors, setVendors] = useState([]);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState('');

    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
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

        if (!showUnitDropdown && Array.isArray(units) && units.length === 1) {
            const singleUnitId = cleanId(units[0]?.id);
            if (singleUnitId !== null) return singleUnitId;
        }

        return null;
    }, [selectedUnitId, effectiveOutletId, showUnitDropdown, units]);

    /* Load Vendors */
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

    /* Load Eligible Invoices */
    const fetchInvoices = useCallback(async () => {
        if (!resolvedOrgId) {
            setList([]);
            return;
        }

        setLoading(true);
        setFetchError(null);

        try {
            const params = {
                organizationId: resolvedOrgId,
                outletId: resolvedOrgId,
            };
            if (selectedVendorId) {
                params.vendorId = Number(selectedVendorId);
            }

            const res = await getEligibleInvoices(params);
            const raw = res?.data?.data ?? res?.data ?? [];
            const rawList = Array.isArray(raw) ? raw : [];

            setList(rawList);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
        } catch (err) {
            console.error('Failed to load eligible invoices:', err);
            setFetchError(
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                err?.message ||
                'Failed to load eligible invoices.'
            );
            setList([]);
        } finally {
            setLoading(false);
        }
    }, [resolvedOrgId, selectedVendorId]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return list;

        return list.filter((item) =>
            (item.invoiceCode || '').toLowerCase().includes(q) ||
            (item.vendorInvoiceNumber || '').toLowerCase().includes(q) ||
            (item.vendorName || '').toLowerCase().includes(q) ||
            (item.organizationName || '').toLowerCase().includes(q)
        );
    }, [list, searchQuery]);

    const handleCreateNote = (invoice) => {
        navigate('/purchase/debit-credit-notes/create', {
            state: {
                selectedInvoice: invoice,
            },
        });
    };

    const columns = useMemo(
        () => [
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
                id: 'invoiceCode',
                accessorFn: (row) => row.invoiceCode,
                header: ({ column }) => (
                    <DataGridColumnHeader title="INVOICE CODE" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <TruncatedCell
                        value={row.original.invoiceCode}
                        widthClass="max-w-[180px]"
                        className="font-semibold text-[#084E92] text-xs"
                    />
                ),
                size: 150,
            },
            {
                id: 'vendorInvoiceNumber',
                accessorFn: (row) => row.vendorInvoiceNumber,
                header: ({ column }) => (
                    <DataGridColumnHeader title="VENDOR BILL NO" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => <span className='text-[11px] font-semibold text-gray-700' >{row.original.vendorInvoiceNumber}</span>,
                size: 150,
            },
            {
                id: 'invoiceDate',
                accessorFn: (row) => row.invoiceDate,
                header: ({ column }) => (
                    <DataGridColumnHeader title="DATE" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <TruncatedCell
                        value={formatDateShort(row.original.invoiceDate)}
                        widthClass="max-w-[120px]"
                        className="text-xs text-gray-600"
                    />
                ),
                size: 110,
            },
            {
                id: 'organizationName',
                accessorFn: (row) => row.organizationName,
                header: ({ column }) => (
                    <DataGridColumnHeader title="UNIT NAME" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <TruncatedCell
                        value={row.original.organizationName}
                        widthClass="max-w-[160px]"
                        className="text-xs text-gray-800"
                    />
                ),
                size: 140,
                enableSorting: false,
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
                        widthClass="max-w-[180px]"
                        className="text-xs text-gray-800 font-medium"
                    />
                ),
                size: 160,
                enableSorting: false,
            },
            {
                id: 'invoiceTotalAmount',
                accessorFn: (row) => row.invoiceTotalAmount,
                header: ({ column }) => (
                    <DataGridColumnHeader title="INVOICE AMT (₹)" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <span className="font-mono text-xs text-gray-700 block">
                        ₹{Number(row.original.invoiceTotalAmount || 0).toFixed(2)}
                    </span>
                ),
                size: 130,
            },
            {
                id: 'netPayableAmount',
                accessorFn: (row) => row.netPayableAmount,
                header: ({ column }) => (
                    <DataGridColumnHeader title="NET PAYABLE (₹)" column={column} className="my-2 text-xs" />
                ),
                cell: ({ row }) => (
                    <span className="font-mono text-xs font-bold text-[#084E92] block ">
                        ₹{Number(row.original.netPayableAmount || 0).toFixed(2)}
                    </span>
                ),
                size: 130,
            },
            {
                id: 'action',
                header: () => <span className="text-xs font-semibold text-gray-500 uppercase">Action</span>,
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            title="Create Credit / Debit Note"
                            onClick={() => handleCreateNote(row.original)}
                            className="flex items-center justify-center  text-[#084E92] hover:text-black-900 transition cursor-pointer"
                        >
                            <Plus size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                ),
                enableSorting: false,
                size: 70,
            },
        ],
        []
    );

    const table = useReactTable({
        data: filteredRows,
        columns,
        state: { pagination, sorting },
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

    const vendorOptions = useMemo(
        () =>
            vendors.map((v) => ({
                value: String(v.id),
                label: v.companyName || v.fullName || v.vendorName || `Vendor #${v.id}`,
            })),
        [vendors]
    );

    if (!canView) {
        return <AccessDenied pageTitle="Generate Credit Debit Note" />;
    }

    return (
        <Container>
            <div className="mx-auto pt-2 pb-6 space-y-4">
                <PageHeader title="Generate Debit Note" />

                {scopeError && (
                    <div className="mb-4 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-[#C0293D]">{scopeError}</span>
                        <button onClick={retryScope} className="text-xs font-semibold text-[#C0293D] underline shrink-0">
                            Retry
                        </button>
                    </div>
                )}

                <div className="my-6">
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${showUnitDropdown ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 items-center`}>
                        <div className="relative sm:col-span-3 lg:col-span-3">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search Invoice Code, Bill No, Vendor, Unit..."
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#C3C6D1] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
                            />
                        </div>

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
                                    placeholder={scopeLoading ? 'Loading units...' : 'Select Unit *'}
                                    disabled={scopeLoading || outletOptions.length === 0}
                                />
                            </div>
                        )}

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

                       
                    </div>
                </div>

                {fetchError && (
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 text-sm text-[#C0293D]">
                        <span>{fetchError}</span>
                        <button
                            type="button"
                            onClick={fetchInvoices}
                            className="ml-auto font-semibold underline cursor-pointer bg-transparent border-0"
                        >
                            Retry
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading eligible invoices…
                        </div>
                    ) : !resolvedOrgId ? (
                        <div className="flex items-center justify-center py-16 text-[#98A2B3] text-sm">
                            Please select a unit first to view eligible purchase invoices.
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-[#98A2B3] text-sm">
                            No eligible invoices found for this vendor.
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

export default DebitCreditEligibleInvoices;