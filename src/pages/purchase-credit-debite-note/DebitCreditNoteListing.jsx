import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Eye,
    Loader2,
    RotateCcw,
    Search,
    Pen,
    Plus,
    FileText,
    FileEdit,
    CheckCircle2,
    XCircle,
    SquarePen,
} from 'lucide-react';
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
import { getAllActiveVendors, getAllDebitCreditNotesPaginated } from '@/services/apiServices';
import { toast } from 'sonner';
import { useOrgScope } from '../../hooks/useOrgScope';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

const STATUS_OPTIONS = ['All Status', 'APPROVED', 'DRAFT', 'CANCELLED'];
const NOTE_TYPE_OPTIONS = ['All Types', 'DEBIT_NOTE', 'CREDIT_NOTE'];
const PAGE_SIZE = 10;

const STATUS_TEXT_COLORS = {
    DRAFT: 'text-amber-600',
    APPROVED: 'text-emerald-600',
    CANCELLED: 'text-rose-600',
};

// Helper to format uppercase enum strings to Title Case (e.g., QUANTITY_RETURN -> Quantity Return)
const formatEnumLabel = (val) => {
    if (!val) return '—';
    return String(val)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

function StatCard({ icon, iconBg, iconFg, label, value }) {
    return (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: iconBg, color: iconFg }}
            >
                {icon}
            </div>
            <div className="flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-[#00376C]">{label}</span>
                <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                    {value}
                </span>
            </div>
        </div>
    );
}

const StatusBadge = ({ status }) => {
    const color = STATUS_TEXT_COLORS[status] || 'text-gray-600';
    return (
        <span className={`font-semibold text-xs whitespace-nowrap ${color}`}>
            {status || '—'}
        </span>
    );
};

const NoteTypeBadge = ({ noteType }) => {
    const isDebit = String(noteType).toUpperCase() === 'DEBIT_NOTE';
    const isCredit = String(noteType).toUpperCase() === 'CREDIT_NOTE';

    const colorClass = isDebit
        ? 'text-sky-700 bg-sky-50 border-sky-200'
        : isCredit
        ? 'text-purple-700 bg-purple-50 border-purple-200'
        : 'text-gray-700 bg-gray-50 border-gray-200';

    return (
        <span className={`text-[11px] font-semibold whitespace-nowrap`}>
            {formatEnumLabel(noteType)}
        </span>
    );
};

const TruncatedCell = ({ value, widthClass = 'max-w-full', className = 'text-xs text-gray-800 font-medium' }) => (
    <span title={value || ''} className={`block truncate ${widthClass} ${className}`}>
        {value || '—'}
    </span>
);

const parseDateToTimestamp = (dateStr) => {
    if (!dateStr) return 0;
    const match = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
        const [, d, m, y] = match;
        return new Date(y, m - 1, d).getTime();
    }
    const parsed = new Date(dateStr).getTime();
    return isNaN(parsed) ? 0 : parsed;
};

const formatDisplayDate = (date) => {
    if (!date) return '—';
    const slashMatch = String(date).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) return date;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DebitCreditNoteListing = () => {
    const navigate = useNavigate();
    const { canView, canEdit } = usePagePermissions(['Debit Note Report', 'Debit Note']);

    const [vendors, setVendors] = useState([]);
    const [vendorLoading, setVendorLoading] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [noteTypeFilter, setNoteTypeFilter] = useState('All Types');

    const [notes, setNotes] = useState([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [notesError, setNotesError] = useState(null);
    const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 });
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
    const [sorting, setSorting] = useState([]);

    // Status counts for StatCards
    const [statusCounts, setStatusCounts] = useState({
        TOTAL: 0,
        DRAFT: 0,
        APPROVED: 0,
        CANCELLED: 0,
    });

    const scope = useOrgScope();
    const {
        loading: scopeLoading,
        error: scopeError,
        showUnitDropdown,
        units,
        selectedUnitId,
        setSelectedUnitId,
        retry: retryScope,
    } = scope;

    // Only set orgId if user explicitly chose a positive unit ID from dropdown
    const chosenOrgId = useMemo(() => {
        if (selectedUnitId && Number(selectedUnitId) > 0) {
            return Number(selectedUnitId);
        }
        return null;
    }, [selectedUnitId]);

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
            label: v.companyName || v.fullName || v.vendorName || `Vendor #${v.id}`,
        })),
        [vendors]
    );

    useEffect(() => {
        setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
    }, [statusFilter, noteTypeFilter, chosenOrgId, selectedVendorId]);

    const fetchNotes = useCallback(async () => {
        setNotesLoading(true);
        setNotesError(null);

        try {
            const params = {
                page: pagination.pageIndex,
                size: pagination.pageSize,
            };

            if (chosenOrgId !== null) {
                params.organizationId = chosenOrgId;
            }

            if (selectedVendorId) params.vendorId = Number(selectedVendorId);
            if (statusFilter !== 'All Status') params.status = statusFilter;
            if (noteTypeFilter !== 'All Types') params.noteType = noteTypeFilter;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const res = await getAllDebitCreditNotesPaginated(params);
            const body = res?.data || {};
            const pageData = body.data || {};
            const rawList = Array.isArray(pageData.content) ? pageData.content : [];

            setNotes(rawList);
            setPageInfo({
                totalPages: pageData.totalPages || 0,
                totalElements: pageData.totalElements ?? rawList.length,
            });

            const counts = rawList.reduce((acc, curr) => {
                const s = String(curr.status || '').toUpperCase();
                if (s in acc) acc[s] = (acc[s] || 0) + 1;
                return acc;
            }, { DRAFT: 0, APPROVED: 0, CANCELLED: 0 });

            setStatusCounts({
                TOTAL: pageData.totalElements ?? rawList.length,
                DRAFT: counts.DRAFT,
                APPROVED: counts.APPROVED,
                CANCELLED: counts.CANCELLED,
            });
        } catch (error) {
            console.error('Failed to load debit/credit notes:', error);
            setNotesError(
                error?.response?.data?.msg ||
                error?.response?.data?.message ||
                'Failed to load notes.'
            );
        } finally {
            setNotesLoading(false);
        }
    }, [
        pagination.pageIndex,
        pagination.pageSize,
        chosenOrgId,
        selectedVendorId,
        statusFilter,
        noteTypeFilter,
        searchQuery,
    ]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleView = useCallback((note) => {
        navigate(`/purchase/debit-credit-notes/details/${note.id}`);
    }, [navigate]);

    const handleEdit = useCallback((note) => {
        navigate(`/purchase/debit-credit-notes/edit/${note.id}`);
    }, [navigate]);

    const columns = useMemo(() => [
        {
            id: 'sno',
            header: ({ column }) => (
                <DataGridColumnHeader title="S.NO" column={column} className="my-2 text-xs" />
            ),
            cell: ({ row }) => (
                <span className="text-xs text-gray-500 py-2">{String(row.index + 1).padStart(2, '0')}</span>
            ),
            enableSorting: false,
            size: 60,
        },
        {
            id: 'noteCode',
            accessorFn: row => row.noteCode || `NOTE-${row.id}`,
            header: ({ column }) => <DataGridColumnHeader title="NOTE CODE" column={column} className="my-2 text-xs" />,
            cell: ({ row }) => {
                const note = row.original;
                const code = note.noteCode || `NOTE-${note.id}`;
                return (
                    <button
                        type="button"
                        onClick={() => handleView(note)}
                        title={`View ${code}`}
                        className="font-semibold text-[#084E92] text-xs hover:underline cursor-pointer text-left focus:outline-none transition-colors"
                    >
                        {code}
                    </button>
                );
            },
            enableSorting: true,
            size: 150,
        },
        {
            id: 'organizationId',
            header: ({ column }) => (
                <DataGridColumnHeader title="UNIT" column={column} className="my-2 text-xs" />
            ),
            cell: ({ row }) => (
                <span className="text-xs text-gray-900 font-medium py-2 uppercase">{row.original.organizationName}</span>
            ),
            enableSorting: false,
            size: 150,
        },
        {
            id: 'noteDate',
            accessorFn: row => row.noteDate,
            header: ({ column }) => <DataGridColumnHeader title="DATE" column={column} className="my-2 text-xs" />,
            cell: ({ row }) => <span className="text-xs text-gray-600 font-medium whitespace-nowrap">{formatDisplayDate(row.original.noteDate)}</span>,
            enableSorting: true,
            sortingFn: (rowA, rowB) => {
                const timeA = parseDateToTimestamp(rowA.original.noteDate);
                const timeB = parseDateToTimestamp(rowB.original.noteDate);
                return timeA - timeB;
            },
            size: 100,
        },
        {
            id: 'vendorName',
            accessorFn: row => row.vendorName,
            header: ({ column }) => <DataGridColumnHeader title="VENDOR" column={column} className="my-2 text-xs" />,
            cell: ({ row }) => <TruncatedCell value={row.original.vendorName} className="font-medium text-gray-800 text-xs" />,
            enableSorting: false,
            size: 180,
        },
        {
            id: 'totalAmount',
            accessorFn: row => Number(row.totalAmount || 0),
            header: ({ column }) => <DataGridColumnHeader title="TOTAL (₹)" column={column} className="my-2 text-xs " />,
            cell: ({ row }) => (
                <span className="font-mono text-xs font-semibold text-gray-800 block">
                    ₹{Number(row.original.totalAmount || 0).toFixed(2)}
                </span>
            ),
            enableSorting: true,
            sortingFn: 'basic',
            size: 100,
        },
        {
            id: 'status',
            accessorFn: row => row.status,
            header: ({ column }) => <DataGridColumnHeader title="STATUS" column={column} className="my-2 text-xs" />,
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
            enableSorting: false,
            size: 110,
        },
        {
            id: 'action',
            header: () => <span className="text-xs font-semibold text-gray-500 uppercase">Action</span>,
            cell: ({ row }) => {
                const note = row.original;
                const isDraft = String(note.status).toUpperCase() === 'DRAFT';

                return (
                    <div className="flex items-center gap-2">
                        {canView && (<button
                            type="button"
                            title="View Details"
                            onClick={() => handleView(note)}
                            className="text-gray-500 hover:text-green-600 cursor-pointer"
                        >
                            <Eye size={16} />
                        </button>)}

                        {isDraft && canEdit && (
                            <button
                                type="button"
                                title="Edit Draft Note"
                                onClick={() => handleEdit(note)}
                                className="text-gray-500 hover:text-blue-800 cursor-pointer"
                            >
                                <SquarePen size={16} />
                            </button>
                        )}
                    </div>
                );
            },
            enableSorting: false,
            size: 90,
        },
    ], [handleEdit, handleView, canEdit]);

    const table = useReactTable({
        data: notes,
        columns,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true,
        pageCount: pageInfo.totalPages || 0,
    });

    if (!canView) {
        return <AccessDenied pageTitle="Debit Note Report" />;
    }

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                <PageHeader
                    title="Debit Note Report"
                />

                {/* Stat Cards Section */}
                <div className="grid grid-cols-1 gap-4 mb-7 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={<FileText size={18} />}
                        iconBg="#EEF2FE"
                        iconFg="#2952E3"
                        label="Total Notes"
                        value={statusCounts.TOTAL}
                    />
                    <StatCard
                        icon={<FileEdit size={18} />}
                        iconBg="#FEF6E7"
                        iconFg="#B7791F"
                        label="Draft"
                        value={statusCounts.DRAFT}
                    />
                    <StatCard
                        icon={<CheckCircle2 size={18} />}
                        iconBg="#ECFDF3"
                        iconFg="#027A48"
                        label="Approved"
                        value={statusCounts.APPROVED}
                    />
                    <StatCard
                        icon={<XCircle size={18} />}
                        iconBg="#FEE4E2"
                        iconFg="#D92D20"
                        label="Cancelled"
                        value={statusCounts.CANCELLED}
                    />
                </div>

                {scopeError && (
                    <div className="mb-4 rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-[#C0293D]">{scopeError}</span>
                        <button onClick={retryScope} className="text-xs font-semibold text-[#C0293D] underline shrink-0">
                            Retry
                        </button>
                    </div>
                )}

                {/* Filters */}
                <div className="my-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className={`relative ${showUnitDropdown ? "sm:col-span-2" : "sm:col-span-3"}`}>
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search Note No, Vendor..."
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#C3C6D1] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#2952E3]/30 focus:border-[#2952E3]"
                            />
                        </div>

                        {showUnitDropdown && (
                            <div className="lg:col-span-1">
                                <SearchableSelect
                                    name="outlet"
                                    value={selectedUnitId ? String(selectedUnitId) : ''}
                                    onChange={val => {
                                        const raw = val?.target ? val.target.value : (val?.value !== undefined ? val.value : val);
                                        setSelectedUnitId(raw ? String(raw) : '');
                                    }}
                                    options={units.map(u => ({ value: String(u.id), label: u.name }))}
                                    placeholder={units.length === 0 ? 'No units' : 'All Units'}
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

                        <div className="flex gap-2 lg:col-span-1">
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
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
                    {notesLoading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading notes…
                        </div>
                    ) : notesError ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-6 px-4 text-sm">
                            <span className="text-[#C0293D]">{notesError}</span>
                            <button type="button" onClick={fetchNotes} className="sm:ml-auto font-semibold text-[#084E92] underline cursor-pointer bg-transparent border-0">
                                Retry
                            </button>
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-[#98A2B3] text-sm">
                            No Debit or Credit Notes match these filters.
                        </div>
                    ) : (
                        <DataGrid
                            table={table}
                            recordCount={pageInfo.totalElements}
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

export default DebitCreditNoteListing;