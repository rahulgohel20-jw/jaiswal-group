import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
    Building2,
    CheckCircle2,
    ClipboardList,
    Clock,
    Eye,
    Loader2,
    Plus,
    XCircle,
} from 'lucide-react';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Container } from '@/components/common/container';
import { SearchBar } from '@/components/common/SearchBar';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { getAllVendorPriceConfigurations } from '../../../services/apiServices';
import { useOrgScope } from '../../../hooks/useOrgScope';
import { usePagePermissions } from '@/utils/permissions';
import SearchableSelect from '../../../utils/SearchableSelect';

const STATUS_STYLES = {
    PENDING: { label: 'Pending', color: 'text-amber-600' },
    APPROVED: { label: 'Approved', color: 'text-emerald-600' },
    REJECTED: { label: 'Rejected', color: 'text-rose-600' },
};

const StatusBadge = ({ status }) => {
    const key = String(status || 'PENDING').toUpperCase();
    const style = STATUS_STYLES[key] || STATUS_STYLES.PENDING;
    return (
        <span className={`text-xs font-semibold whitespace-nowrap ${style.color}`}>
            {style.label}
        </span>
    );
};

// Clean List Modal (No Search)
const OutletsModal = ({ isOpen, onClose, rowData }) => {
    if (!isOpen || !rowData) return null;

    const outletList = rowData.outletNames || [];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-gray-100">
                <DialogHeader className="pb-3 border-b border-gray-100">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                                <Building2 size={18} />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-base font-bold text-gray-900 truncate">
                                    Assigned Outlets
                                </DialogTitle>
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {rowData.materialName} &bull; {rowData.vendorName}
                                </p>
                            </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-[#084E92] rounded-full border border-blue-100 shrink-0">
                            {outletList.length} Total
                        </span>
                    </div>
                </DialogHeader>

                {/* Numbered Row List */}
                <div className="py-2 max-h-72 overflow-y-auto divide-y divide-gray-100 pr-1">
                    {outletList.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">
                            No outlets assigned.
                        </p>
                    ) : (
                        outletList.map((name, index) => (
                            <div
                                key={`${name}-${index}`}
                                className="flex items-center gap-3 py-2.5 px-2 hover:bg-slate-50/70 rounded-lg transition"
                            >
                                <span className="w-5 h-5 rounded-md bg-gray-100 text-gray-500 text-[11px] font-semibold flex items-center justify-center shrink-0">
                                    {index + 1}
                                </span>
                                <span className="text-xs sm:text-sm font-medium text-gray-800 break-words leading-tight">
                                    {name}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter className="pt-3 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                    >
                        Close
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const VendorPriceApproval = () => {
    const { canEdit, canView } = usePagePermissions('Vendor Price Approval');
    const navigate = useNavigate();

    const {
        loading: orgScopeLoading,
        isOutletUser,
        effectiveOutletId,
        units: scopedOutlets,
        error: scopeError,
        retry: retryScope,
    } = useOrgScope();

    const orgOptions = useMemo(() => {
        if (!Array.isArray(scopedOutlets) || scopedOutlets.length === 0) {
            return [];
        }

        return scopedOutlets
            .filter((o) => o?.id != null && String(o.id).toUpperCase() !== 'ALL')
            .map((unit) => ({
                value: String(unit.id ?? unit.organizationId),
                label: unit.name || unit.organizationName || `Outlet #${unit.id}`,
            }));
    }, [scopedOutlets]);

    const allowedOutletIdSet = useMemo(() => {
        if (orgScopeLoading) return null;

        if (isOutletUser && effectiveOutletId) {
            return new Set([String(effectiveOutletId)]);
        }

        if (orgOptions.length > 0) {
            return new Set(orgOptions.map((o) => String(o.value)));
        }

        return null;
    }, [orgScopeLoading, isOutletUser, effectiveOutletId, orgOptions]);

    const [allApprovalRows, setAllApprovalRows] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [viewingOutletsModal, setViewingOutletsModal] = useState(null);

    const fetchApprovalData = useCallback(
        async (selectedStatus = statusFilter, selectedOrg = selectedOrgId) => {
            if (orgScopeLoading || scopeError) return;

            try {
                setLoading(true);
                setError(null);

                const normalizedStatus =
                    selectedStatus === 'All Status' ? '' : selectedStatus.toUpperCase();

                const queryParams = {};
                if (normalizedStatus) {
                    queryParams.status = normalizedStatus;
                }

                const res = await getAllVendorPriceConfigurations(queryParams);

                const configurations =
                    res?.data?.vendorPriceConfigurations ||
                    res?.data?.data?.vendorPriceConfigurations ||
                    [];

                const groups = new Map();

                const addToGroup = (config, entry) => {
                    if (normalizedStatus && entry.status !== normalizedStatus) {
                        return;
                    }

                    if (
                        allowedOutletIdSet &&
                        entry.outletId &&
                        !allowedOutletIdSet.has(String(entry.outletId))
                    ) {
                        return;
                    }

                    if (selectedOrg && String(entry.outletId) !== String(selectedOrg)) {
                        return;
                    }

                    const key = [
                        config.rawMaterialId,
                        config.vendorId,
                        entry.fromDate,
                        entry.toDate,
                        Number(entry.price),
                        entry.status,
                    ].join('|');

                    const existing = groups.get(key);

                    if (existing) {
                        if (!existing.outletIds.includes(entry.outletId)) {
                            existing.outletIds.push(entry.outletId);
                            existing.outletNames.push(entry.outletName);
                        }
                    } else {
                        groups.set(key, {
                            id: config.id,
                            materialId: config.rawMaterialId,
                            materialName: config.rawMaterialNameEnglish || '',
                            vendorId: config.vendorId,
                            vendorName: config.vendorName || '',
                            fromDate: entry.fromDate,
                            toDate: entry.toDate,
                            price: entry.price,
                            status: entry.status,
                            outletIds: [entry.outletId],
                            outletNames: [entry.outletName],
                        });
                    }
                };

                configurations.forEach((config) => {
                    const outletPrices = config.outletPrices || [];

                    if (outletPrices.length > 0) {
                        outletPrices.forEach((outlet) => {
                            addToGroup(config, {
                                outletId: outlet.organizationId,
                                outletName: outlet.organizationName || '',
                                price: outlet.price ?? config.price ?? 0,
                                fromDate: outlet.fromDate || config.fromDate || '',
                                toDate: outlet.toDate || config.toDate || '',
                                status: (outlet.status || config.status || 'PENDING').toUpperCase(),
                            });
                        });
                    } else {
                        addToGroup(config, {
                            outletId: config.organizationId || null,
                            outletName: config.organizationName || '',
                            price: config.price ?? 0,
                            fromDate: config.fromDate || '',
                            toDate: config.toDate || '',
                            status: (config.status || 'PENDING').toUpperCase(),
                        });
                    }
                });

                const mapped = Array.from(groups.values())
                    .map((g) => ({
                        ...g,
                        outletIds: g.outletIds.filter((o) => o !== null && o !== undefined),
                        outletNames: g.outletNames.filter(Boolean),
                        outletName: g.outletNames.filter(Boolean).join(', '),
                    }))
                    .sort((a, b) => Number(b.id) - Number(a.id));

                setAllApprovalRows(mapped);
            } catch (err) {
                console.error('Failed to load vendor price approvals:', err);
                setError('Failed to load vendor price approvals');
                setAllApprovalRows([]);
            } finally {
                setLoading(false);
            }
        },
        [statusFilter, selectedOrgId, orgScopeLoading, scopeError, allowedOutletIdSet]
    );

    useEffect(() => {
        if (!orgScopeLoading) {
            fetchApprovalData(statusFilter, selectedOrgId);
        }
    }, [statusFilter, selectedOrgId, orgScopeLoading, fetchApprovalData]);

    const stats = useMemo(() => {
        let total = allApprovalRows.length;
        let pending = 0;
        let approved = 0;
        let rejected = 0;

        allApprovalRows.forEach((row) => {
            const statusKey = String(row.status || '').toUpperCase();
            if (statusKey === 'PENDING') pending += 1;
            else if (statusKey === 'APPROVED') approved += 1;
            else if (statusKey === 'REJECTED') rejected += 1;
        });

        return { total, pending, approved, rejected };
    }, [allApprovalRows]);

    const filteredRows = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return allApprovalRows;

        return allApprovalRows.filter((item) => {
            return (
                (item.materialName ?? '').toLowerCase().includes(term) ||
                (item.vendorName ?? '').toLowerCase().includes(term) ||
                (item.outletName ?? '').toLowerCase().includes(term)
            );
        });
    }, [allApprovalRows, searchTerm]);

    const handleOrgChange = (e) => {
        const val = e.target.value;
        setSelectedOrgId(val);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const handleStatusFilterChange = (value) => {
        setStatusFilter(value);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const handleApprove = (row) => {
        const outletIds = (row.outletIds || [])
            .filter((id) => id != null && (!allowedOutletIdSet || allowedOutletIdSet.has(String(id))))
            .map(String);

        navigate(`/material/vendor-price-association/approve/${row.materialId}`, {
            state: {
                materialId: String(row.materialId),
                vendorId: String(row.vendorId),
                configId: row.id,
                outletIds,
                outletId: outletIds[0] ?? '',
                vendorName: row.vendorName,
                outletName: row.outletName,
                price: row.price,
                fromDate: row.fromDate,
                toDate: row.toDate,
                status: row.status,
            },
        });
    };

    const handleView = (row) => {
        const outletIds = (row.outletIds || [])
            .filter((id) => id != null && (!allowedOutletIdSet || allowedOutletIdSet.has(String(id))))
            .map(String);

        navigate(`/material/vendor-price-association/view/${row.materialId}`, {
            state: {
                from: 'vendor-price-approval',
                materialId: String(row.materialId),
                status: row.status,
                vendorId: String(row.vendorId),
                configId: row.id,
                outletIds,
            },
        });
    };

    const columns = useMemo(
        () => [
            {
                id: 'sno',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="S.NO"
                        column={column}
                        className="py-6"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-500 py-2">
                        {String(row.index + 1).padStart(2, '0')}
                    </span>
                ),
                enableSorting: false,
                size: 40,
            },
            {
                accessorKey: 'materialName',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="RAW MATERIAL NAME"
                        column={column}
                        className="text-[#43474F] font-semibold py-4 text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <div className="font-semibold text-gray-800 py-2 capitalize">
                        {row.original.materialName}
                    </div>
                ),
                size: 180,
            },
            {
                accessorKey: 'vendorName',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="VENDOR NAME"
                        column={column}
                        className="text-[#43474F] font-semibold py-4 text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <div className="py-2 text-gray-700">
                        {row.original.vendorName || '—'}
                    </div>
                ),
                size: 150,
            },
            {
                accessorKey: 'outletName',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="OUTLET NAME"
                        column={column}
                        className="text-[#43474F] font-semibold py-4 text-sm"
                    />
                ),
                cell: ({ row }) => {
                    const rawOutlets =
                        row.original.outletNames && row.original.outletNames.length > 0
                            ? row.original.outletNames
                            : (row.original.outletName || '')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);

                    if (rawOutlets.length === 0) {
                        return <span className="text-gray-400 py-2">—</span>;
                    }

                    const visibleOutlets = rawOutlets.slice(0, 2);
                    const remainingCount = rawOutlets.length - 2;

                    return (
                        <div className="flex items-center gap-1.5 py-2 max-w-full">
                            <span
                                className="text-gray-800 font-medium text-xs sm:text-sm truncate"
                                title={rawOutlets.join(', ')}
                            >
                                {visibleOutlets.join(', ')}
                            </span>

                            {remainingCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setViewingOutletsModal({
                                            materialName: row.original.materialName,
                                            vendorName: row.original.vendorName,
                                            outletNames: rawOutlets,
                                        })
                                    }
                                    className="inline-flex items-center text-[#084E92] bg-[#EFF4FF] hover:bg-[#DCE7FC] px-2 py-0.5 rounded-md font-semibold text-[11px] cursor-pointer transition shrink-0 whitespace-nowrap"
                                    title="Click to view all outlets"
                                >
                                    +{remainingCount} more
                                </button>
                            )}
                        </div>
                    );
                },
                size: 260,
            },
            {
                accessorKey: 'price',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="PRICE"
                        column={column}
                        className="text-[#43474F] font-semibold py-4 text-sm"
                    />
                ),
                cell: ({ row }) => <span>₹{Number(row.original.price).toFixed(2)}</span>,
                size: 110,
            },
            {
                accessorKey: 'status',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="STATUS"
                        column={column}
                        className="text-[#43474F] font-semibold py-4 text-sm"
                    />
                ),
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
                size: 120,
            },
            {
                id: 'actions',
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="ACTIONS"
                        column={column}
                        className="py-4"
                    />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        {row.original.status !== 'PENDING' ? (
                            <button
                                type="button"
                                onClick={() => handleView(row.original)}
                                className="text-gray-500 hover:text-green-600 cursor-pointer p-1 rounded hover:bg-green-50 transition"
                                title="View Details"
                            >
                                <Eye size={18} />
                            </button>
                        ) : (
                            canEdit && (
                                <button
                                    type="button"
                                    onClick={() => handleApprove(row.original)}
                                    className="text-emerald-600 hover:text-emerald-700 cursor-pointer p-1 rounded hover:bg-emerald-50 transition"
                                    title="Review / Approve Price"
                                >
                                    <CheckCircle2 size={18} />
                                </button>
                            )
                        )}
                    </div>
                ),
                size: 80,
            },
        ],
        [canEdit, allowedOutletIdSet]
    );

    const STATS = [
        {
            title: 'Total Requests',
            value: `${stats.total}`,
            icon: <ClipboardList size={18} />,
            iconBg: 'bg-[#D5E3FF]',
            iconColor: 'text-[#00376C]',
            color: 'text-[#1B1B1F]',
        },
        {
            title: 'Pending Approval',
            value: `${stats.pending}`,
            icon: <Clock size={18} />,
            iconBg: 'bg-[#FEF9C3]',
            iconColor: 'text-[#CA8A04]',
            color: 'text-[#CA8A04]',
        },
        {
            title: 'Approved',
            value: `${stats.approved}`,
            icon: <CheckCircle2 size={18} />,
            iconBg: 'bg-[#DCFCE7]',
            iconColor: 'text-[#16A34A]',
            color: 'text-[#16A34A]',
        },
        {
            title: 'Rejected',
            value: `${stats.rejected}`,
            icon: <XCircle size={18} />,
            iconBg: 'bg-[#FEE2E2]',
            iconColor: 'text-[#DC2626]',
            color: 'text-[#DC2626]',
        },
    ];

    const table = useReactTable({
        data: filteredRows,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (!canView) {
        return <AccessDenied pageTitle="Vendor Price Approval" />;
    }

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                <PageHeader
                    title="Vendor Price Approval"
                    description="Review vendor pricing submitted per outlet and approve or hold each price before it takes effect."
                    actions={
                        canEdit && (
                            <HeaderActionButton
                                to="/material/vendor-price-association"
                                icon={Plus}
                                label="Associate Vendor Price"
                            />
                        )
                    }
                />

                <PageErrorAlert
                    error={scopeError || error}
                    onRetry={() => {
                        if (scopeError) {
                            retryScope?.();
                        } else {
                            fetchApprovalData(statusFilter, selectedOrgId);
                        }
                    }}
                    className="my-3"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mt-4">
                    {STATS.map((item) => (
                        <div
                            key={item.title}
                            className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs"
                        >
                            <div
                                className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}
                            >
                                {item.icon}
                            </div>
                            <div className="flex flex-col items-end text-right">
                                <span className="text-xs font-semibold text-[#00376C]">{item.title}</span>
                                <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                                    {item.value}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-4 mt-6">
                    <div
                        className={`grid grid-cols-1 ${isOutletUser ? 'md:grid-cols-3' : 'md:grid-cols-4'
                            } gap-4`}
                    >
                        <SearchBar
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onClear={() => {
                                setSearchTerm('');
                                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                            }}
                            placeholder="Search by material, vendor or outlet..."
                            wrapperClassName="md:col-span-2"
                        />

                        {!isOutletUser && (
                            <div>
                                <SearchableSelect
                                    name="organizationId"
                                    value={selectedOrgId}
                                    onChange={handleOrgChange}
                                    options={orgOptions}
                                    placeholder="All Outlets"
                                    isClearable={true}
                                />
                            </div>
                        )}

                        <div className={isOutletUser ? 'md:col-span-1' : ''}>
                            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                                <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl text-sm">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All Status">All Status</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Approved">Approved</SelectItem>
                                    <SelectItem value="Rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-[#98A2B3] text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading...
                        </div>
                    ) : (<DataGrid
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
                            <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
                                <DataGridPagination />
                            </CardFooter>
                        </Card>
                    </DataGrid>
                    )}
                </div>
            </div>

            <OutletsModal
                isOpen={!!viewingOutletsModal}
                onClose={() => setViewingOutletsModal(null)}
                rowData={viewingOutletsModal}
            />
        </Container>
    );
};

export default VendorPriceApproval;