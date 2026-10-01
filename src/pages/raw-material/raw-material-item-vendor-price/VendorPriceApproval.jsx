import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    Clock,
    Eye,
    Search,
    XCircle,
    Check,
    ChevronDown,
    X,
} from 'lucide-react';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Container } from '@/components/common/container';
import { SearchBar } from '@/components/common/SearchBar';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageHeader } from '@/components/common/PageHeader';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { getVendorPriceApprovals } from '../../../services/apiServices';
import { useOrgScope } from '../../../hooks/useOrgScope';
import { usePagePermissions } from '@/utils/permissions';

const STATUS_STYLES = {
    PENDING: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700' },
    APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700' },
    REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
};

const inputCls =
    'w-full border border-[#C3C6D1] rounded-xl px-3.5 py-2 text-sm text-gray-800 bg-white ' +
    'placeholder-gray-400 outline-none transition-all duration-150 focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/15 hover:border-gray-400';

const errorInputCls =
    'w-full border border-red-400 rounded-xl px-3.5 py-2 text-sm text-gray-800 bg-white ' +
    'placeholder-gray-400 outline-none transition-all duration-150 focus:border-red-500 focus:ring-2 focus:ring-red-500/15';

const SearchableSelect = ({
    value,
    onChange,
    options = [],
    placeholder = 'Select...',
    disabled = false,
    hasError = false,
    name,
    isClearable = true,
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selectedOption = options.find(
        (option) => String(option.value) === String(value)
    );

    const selectedLabel = selectedOption?.label || '';

    const filteredOptions = options.filter((option) =>
        String(option.label || '')
            .toLowerCase()
            .includes(search.trim().toLowerCase())
    );

    const handleSelect = (option) => {
        const isAlreadySelected = String(value) === String(option.value);
        onChange({
            target: {
                name,
                value: isAlreadySelected ? '' : String(option.value),
            },
        });
        setSearch('');
        setOpen(false);
    };

    const handleClear = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        onChange({
            target: {
                name,
                value: '',
            },
        });
        setSearch('');
        setOpen(false);
    };

    const handleInputChange = (e) => {
        const inputValue = e.target.value;
        setSearch(inputValue);
        setOpen(true);
        if (inputValue !== selectedLabel) {
            onChange({
                target: {
                    name,
                    value: '',
                },
            });
        }
    };

    const handleInputClick = () => {
        if (disabled) return;
        setOpen(true);
        setSearch('');
    };

    const handleOpenChange = (nextOpen) => {
        if (disabled) return;
        setOpen(nextOpen);
        setSearch('');
    };

    const hasValue =
        value !== undefined &&
        value !== null &&
        String(value).trim() !== '' &&
        String(value).trim() !== '0';

    return (
        <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
            <PopoverTrigger asChild>
                <div className="relative w-full group">
                    <Input
                        name={name}
                        value={open ? search : selectedLabel}
                        disabled={disabled}
                        placeholder={placeholder}
                        onClick={handleInputClick}
                        onChange={handleInputChange}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        aria-autocomplete="none"
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        className={
                            hasError
                                ? `${errorInputCls} ${hasValue ? 'pr-14' : 'pr-8'} h-10`
                                : `${inputCls} ${hasValue ? 'pr-14' : 'pr-8'} h-10`
                        }
                    />

                    {hasValue && !disabled && isClearable && (
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleClear}
                            className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition cursor-pointer z-10"
                            title="Clear selection"
                        >
                            <X size={14} />
                        </button>
                    )}

                    <ChevronDown
                        size={16}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${disabled
                                ? 'text-gray-300'
                                : open
                                    ? 'text-[#084E92] rotate-180'
                                    : 'text-gray-400 group-hover:text-gray-600'
                            }`}
                    />
                </div>
            </PopoverTrigger>

            <PopoverContent
                side="bottom"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="p-1.5 w-(--radix-popover-trigger-width) min-w-50 overflow-hidden z-100 bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-slate-200/90 ring-1 ring-black/3"
            >
                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                    {hasValue && isClearable && (
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleClear}
                            className="w-full text-left px-3 py-2 text-xs rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 font-medium transition cursor-pointer mb-1 border-b border-gray-100"
                        >
                            <X size={13} className="shrink-0" />
                            Clear selection
                        </button>
                    )}

                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => {
                            const isSelected = String(value) === String(option.value);

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelect(option)}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 ${isSelected
                                            ? 'bg-blue-50/90 text-[#084E92] font-semibold shadow-xs'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-normal'
                                        }`}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {isSelected ? (
                                        <span className="flex items-center gap-1 text-[11px] text-[#084E92] bg-blue-100/80 px-2 py-0.5 rounded-md font-semibold shrink-0">
                                            <Check className="w-3 h-3 stroke-[2.5]" />
                                            Selected
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })
                    ) : (
                        <div className="px-3 py-4 text-xs text-gray-400 text-center flex flex-col items-center justify-center gap-1">
                            <Search className="w-4 h-4 text-gray-300" />
                            <span>No options found</span>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const StatusBadge = ({ status }) => {
    const key = String(status || 'PENDING').toUpperCase();
    const style = STATUS_STYLES[key] || STATUS_STYLES.PENDING;
    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${style.className}`}
        >
            {style.label}
        </span>
    );
};

const OutletTooltip = ({ outletNames }) => {
    const wrapperRef = useRef(null);
    const [showAbove, setShowAbove] = useState(false);

    const visibleOutlets = outletNames.slice(0, 2);
    const hasMore = outletNames.length > 2;

    const handleMoreHover = () => {
        if (!wrapperRef.current) return;

        const rect = wrapperRef.current.getBoundingClientRect();
        const tooltipHeight = 220;
        const gap = 0;

        setShowAbove(
            window.innerHeight - rect.bottom < tooltipHeight + gap &&
            rect.top > tooltipHeight + gap
        );
    };

    const getDisplayName = (name, index) => {
        if (index === 0) {
            return name.length > 22 ? `${name.slice(0, 22)}...` : name;
        }
        return name.length > 10 ? `${name.slice(0, 10)}...` : name;
    };

    return (
        <div ref={wrapperRef} className="relative flex items-center whitespace-nowrap py-2 max-w-full">
            <div className="flex items-center min-w-0 max-w-full">
                {visibleOutlets.map((name, index) => {
                    const displayName = getDisplayName(name, index);
                    const isTruncated = displayName !== name;

                    return (
                        <React.Fragment key={`${name}-${index}`}>
                            {index > 0 && <span className="text-gray-500 mr-1">,</span>}

                            <div className="relative group/outlet shrink-0">
                                <span className="font-medium text-gray-800 whitespace-nowrap">
                                    {displayName}
                                </span>

                                {isTruncated && (
                                    <div className="invisible opacity-0 group-hover/outlet:visible group-hover/outlet:opacity-100 transition-all duration-200 pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-9999 whitespace-nowrap bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
                                        {name}
                                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900 rotate-45" />
                                    </div>
                                )}
                            </div>
                        </React.Fragment>
                    );
                })}

                {hasMore && (
                    <>
                        <span className="text-gray-500 ml-1">,</span>

                        <div
                            className="relative group/more shrink-0 ml-1"
                            onMouseEnter={handleMoreHover}
                        >
                            <span className="font-bold text-[#084E92] cursor-help whitespace-nowrap">
                                ...
                            </span>

                            <div
                                className={`invisible opacity-0 group-hover/more:visible group-hover/more:opacity-100 transition-all duration-200 pointer-events-auto absolute left-0 z-9999 min-w-48 max-w-64 bg-gray-900/95 text-white rounded-xl p-3 shadow-xl text-xs ${showAbove ? 'bottom-full mb-2' : 'top-full mt-2'
                                    }`}
                            >
                                <p className="font-semibold text-gray-300 border-b border-gray-700/80 pb-1 mb-1.5 text-[11px] uppercase tracking-wider">
                                    Linked Outlets ({outletNames.length})
                                </p>

                                <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                    {outletNames.map((name, idx) => (
                                        <li key={`${name}-${idx}`} className="flex items-start gap-1.5 leading-snug">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                            <span className="wrap-break-word">{name}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div
                                    className={`absolute left-5 w-2.5 h-2.5 bg-gray-900/95 rotate-45 -z-10 ${showAbove ? '-bottom-1' : '-top-1'
                                        }`}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
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

    // Map organization options from useOrgScope
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
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
    });

    // 1. Permanent global stats
    const fetchGlobalStats = useCallback(async () => {
        if (orgScopeLoading || scopeError) return;

        try {
            const res = await getVendorPriceApprovals(1, 1000, '', '');
            const rawMaterials = res?.data?.data?.['Raw Material Details'] || [];

            const groups = new Map();

            const addToGroup = (material, vendor, entry) => {
                if (
                    allowedOutletIdSet &&
                    entry.outletId &&
                    !allowedOutletIdSet.has(String(entry.outletId))
                ) {
                    return;
                }

                const key = [
                    material.id,
                    vendor.vendorId,
                    entry.fromDate,
                    entry.toDate,
                    Number(entry.price),
                    entry.status,
                ].join('|');

                const existing = groups.get(key);

                if (existing) {
                    if (!existing.outletIds.includes(entry.outletId)) {
                        existing.outletIds.push(entry.outletId);
                    }
                } else {
                    groups.set(key, {
                        status: entry.status,
                        outletIds: [entry.outletId],
                    });
                }
            };

            rawMaterials.forEach((material) => {
                (material.vendorPriceConfigs || []).forEach((vendor) => {
                    const outletPrices = vendor.outletPrices || [];

                    if (outletPrices.length > 0) {
                        outletPrices.forEach((outlet) => {
                            addToGroup(material, vendor, {
                                outletId: outlet.organizationId,
                                status: (outlet.status || vendor.status || 'PENDING').toUpperCase(),
                            });
                        });
                    } else {
                        addToGroup(material, vendor, {
                            outletId: vendor.organizationId || null,
                            status: (vendor.status || 'PENDING').toUpperCase(),
                        });
                    }
                });
            });

            const allGroups = Array.from(groups.values());
            setStats({
                total: allGroups.length,
                pending: allGroups.filter((r) => r.status === 'PENDING').length,
                approved: allGroups.filter((r) => r.status === 'APPROVED').length,
                rejected: allGroups.filter((r) => r.status === 'REJECTED').length,
            });
        } catch (err) {
            console.error('Failed to load global approval statistics:', err);
        }
    }, [orgScopeLoading, allowedOutletIdSet]);

    // 2. Fetch data via API based on status & organization filter
    const fetchApprovalData = useCallback(
        async (selectedStatus = statusFilter, selectedOrg = selectedOrgId) => {
            if (orgScopeLoading || scopeError) return;

            try {
                setLoading(true);
                setError(null);

                const normalizedStatus =
                    selectedStatus === 'All Status' ? '' : selectedStatus.toUpperCase();

                const res = await getVendorPriceApprovals(1, 1000, '', normalizedStatus);
                const rawMaterials = res?.data?.data?.['Raw Material Details'] || [];

                const groups = new Map();

                const addToGroup = (material, vendor, entry) => {
                    if (normalizedStatus && entry.status !== normalizedStatus) {
                        return;
                    }

                    // Scope-based enforcement
                    if (
                        allowedOutletIdSet &&
                        entry.outletId &&
                        !allowedOutletIdSet.has(String(entry.outletId))
                    ) {
                        return;
                    }

                    // Organization Filter selection
                    if (selectedOrg && String(entry.outletId) !== String(selectedOrg)) {
                        return;
                    }

                    const key = [
                        material.id,
                        vendor.vendorId,
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
                            id: vendor.id,
                            materialId: material.id,
                            materialName: material.nameEnglish || '',
                            vendorId: vendor.vendorId,
                            vendorName: vendor.vendorName || '',
                            fromDate: entry.fromDate,
                            toDate: entry.toDate,
                            price: entry.price,
                            status: entry.status,
                            outletIds: [entry.outletId],
                            outletNames: [entry.outletName],
                        });
                    }
                };

                rawMaterials.forEach((material) => {
                    (material.vendorPriceConfigs || []).forEach((vendor) => {
                        const outletPrices = vendor.outletPrices || [];

                        if (outletPrices.length > 0) {
                            outletPrices.forEach((outlet) => {
                                addToGroup(material, vendor, {
                                    outletId: outlet.organizationId,
                                    outletName: outlet.organizationName || '',
                                    price: outlet.price ?? vendor.price ?? 0,
                                    fromDate: outlet.fromDate || vendor.fromDate || '',
                                    toDate: outlet.toDate || vendor.toDate || '',
                                    status: (outlet.status || vendor.status || 'PENDING').toUpperCase(),
                                });
                            });
                        } else {
                            addToGroup(material, vendor, {
                                outletId: vendor.organizationId || null,
                                outletName: vendor.organizationName || '',
                                price: vendor.price ?? 0,
                                fromDate: vendor.fromDate || '',
                                toDate: vendor.toDate || '',
                                status: (vendor.status || 'PENDING').toUpperCase(),
                            });
                        }
                    });
                });

                const mapped = Array.from(groups.values()).map((g) => ({
                    ...g,
                    outletIds: g.outletIds.filter((o) => o !== null && o !== undefined),
                    outletName: g.outletNames.filter(Boolean).join(', '),
                }));

                setAllApprovalRows(mapped);
            } catch (err) {
                console.error('Failed to load vendor price approvals:', err);
                setError('Failed to load vendor price approvals');
                setAllApprovalRows([]);
            } finally {
                setLoading(false);
            }
        },
        [statusFilter, selectedOrgId, orgScopeLoading, allowedOutletIdSet]
    );

    useEffect(() => {
        if (!orgScopeLoading) {
            fetchGlobalStats();
        }
    }, [orgScopeLoading, fetchGlobalStats]);

    useEffect(() => {
        if (!orgScopeLoading) {
            fetchApprovalData(statusFilter, selectedOrgId);
        }
    }, [statusFilter, selectedOrgId, orgScopeLoading, fetchApprovalData]);

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

        navigate(`/material/items/approve/${row.materialId}`, {
            state: {
                vendorId: String(row.vendorId),
                configId: row.id,
                outletIds,
                outletId: outletIds[0] ?? '',
                vendorName: row.vendorName,
                outletName: row.outletName,
                price: row.price,
                fromDate: row.fromDate,
                toDate: row.toDate,
            },
        });
    };

    // Pass the row status and vendorId to View Mode
    const handleView = (row) => {
        navigate(`/material/items/view/${row.materialId}`, {
            state: {
                from: 'vendor-price-approval',
                status: row.status,
                vendorId: row.vendorId,
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
                        className="text-[#43474F] font-semibold py-4 text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <span className="text-gray-500 py-2">
                        {String(row.index + 1).padStart(2, '0')}
                    </span>
                ),
                enableSorting: false,
                size: 70,
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
                    const outletNames = (row.original.outletNames || [])
                        .filter(Boolean)
                        .map(String);

                    const fallbackNames =
                        outletNames.length > 0
                            ? outletNames
                            : row.original.outletName
                                ? row.original.outletName
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                : [];

                    if (fallbackNames.length === 0) {
                        return <span className="text-gray-400 py-2">—</span>;
                    }

                    return <OutletTooltip outletNames={fallbackNames} />;
                },
                size: 250,
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
                        className="text-[#43474F] font-semibold py-4 text-sm"
                    />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        {row.original.status !== 'PENDING' ? (
                            <button
                                onClick={() => handleView(row.original)}
                                className="flex items-center gap-1.5 text-xs font-medium text-[#00376C] border border-[#00376C] rounded-lg px-3 py-1.5 hover:bg-blue-50 cursor-pointer transition-colors"
                                title="View Item"
                            >
                                <Eye size={14} />
                                View
                            </button>
                        ) : (
                            canEdit && (
                                <button
                                    onClick={() => handleApprove(row.original)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#00376C] rounded-lg px-3 py-1.5 hover:bg-[#002750] cursor-pointer transition-colors"
                                    title="Review Price"
                                >
                                    Approve
                                </button>
                            )
                        )}
                    </div>
                ),
                size: 130,
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
                />

                <PageErrorAlert
                    error={scopeError || error}
                    onRetry={() => {
                        if (scopeError) {
                            retryScope?.();
                        } else {
                            fetchGlobalStats();
                            fetchApprovalData(statusFilter, selectedOrgId);
                        }
                    }}
                    className="my-3"
                />

                {/* Global Stat Cards */}
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

                {/* Search, Organization Filter (Hidden for outlet users), and Status Filter */}
                <div className="flex flex-col gap-4 mt-6">
                    <div
                        className={`grid grid-cols-1 ${isOutletUser ? 'md:grid-cols-3' : 'md:grid-cols-4'
                            } gap-4`}
                    >
                        {/* Search Input: Spans 2 columns */}
                        <SearchBar
                            value={searchTerm}
                            onChange={handleSearchChange}
                            placeholder="Search by material, vendor or outlet..."
                            wrapperClassName="md:col-span-2"
                        />

                        {/* SearchableSelect for Organization / Outlet: Rendered ONLY if NOT an outlet user */}
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

                        {/* Status Filter */}
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

                {/* Table */}
                <div className="w-full border border-[#C3C6D1] rounded-2xl overflow-hidden">
                    {loading && (
                        <p className="p-4 text-sm text-gray-500">Loading vendor price approvals...</p>
                    )}
                    <DataGrid table={table} recordCount={filteredRows.length} className="rounded-2xl">
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
                </div>
            </div>
        </Container>
    );
};

export default VendorPriceApproval;