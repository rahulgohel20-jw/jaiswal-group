import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container } from '@/components/common/container';
import {
    ChevronDown,
    Trash2,
    Users,
    X,
    AlertCircle,
    Check,
    Save,
    ArrowLeft,
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    getAllActiveVendors,
    getAllRawMaterialCategory,
    getAllSubCategoryByCategoryId,
    getRawMaterialById,
    getVendorPricesByRawMaterialId,
    saveBulkVendorPrice,
    approveVendorPricing,
    rejectVendorPricing,
    getAllRawMaterial,
    getAllRawMaterialItems,
    getVendorOutletMappingByVendorId,
    getAllVendorPriceConfigurations,
} from '../../../services/apiServices';
import SearchableSelect from '../../../utils/SearchableSelect';
import { useOrgScope } from '../../../hooks/useOrgScope';
import { getUserIdFromToken } from '../../../utils/auth';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { SearchBar } from '@/components/common/SearchBar';

const formatDateForBackend = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    return '';
};

const formatDateToInputValue = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return '';
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const generateRowId = (seed) =>
    `${seed}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const blurOnWheel = (e) => e.currentTarget.blur();

const isRowPending = (row) =>
    String(row.initialStatus || row.status).toUpperCase() === 'PENDING';

const STATUS_STYLES = {
    PENDING: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700' },
    APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700' },
    REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
};

const StatusBadge = ({ status }) => {
    const key = String(status || 'PENDING').toUpperCase();
    const style = STATUS_STYLES[key] || STATUS_STYLES.PENDING;
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${style.className}`}>
            {style.label}
        </span>
    );
};

const APPROVAL_STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approve' },
    { value: 'REJECTED', label: 'Reject' },
];

const StatusSelect = ({ status, onChange }) => (
    <Select value={String(status || 'PENDING').toUpperCase()} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-28 border-[#C3C6D1] rounded-md text-xs font-medium bg-white">
            <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
            {APPROVAL_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

const isValidPricingEntry = (status) => {
    const normStatus = String(status || 'PENDING').trim().toUpperCase();
    return normStatus !== 'APPROVED';
};

const RawMaterialMultiSelect = ({
    options = [],
    selected = [],
    onChange,
    disabled = false,
    hasError = false,
    loading = false,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);

    const filteredOptions = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return options;
        return options.filter((o) => (o.nameEnglish ?? o.name ?? o.label ?? '').toLowerCase().includes(term));
    }, [options, query]);

    const isSelected = (id) => selected.includes(String(id));

    const toggleOption = (id) => {
        const strId = String(id);
        if (isSelected(strId)) {
            onChange(selected.filter((s) => s !== strId));
        } else {
            onChange([...selected, strId]);
        }
    };

    const removeOption = (id) => {
        const strId = String(id);
        onChange(selected.filter((s) => s !== strId));
    };

    const isAllSelected = options.length > 0 && selected.length === options.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            onChange([]);
        } else {
            onChange(options.map((o) => String(o.id ?? o.value)));
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    className={`min-h-10 w-full border rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-1.5 transition-all ${disabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                            : 'bg-white cursor-pointer hover:border-gray-400 focus-within:border-[#084E92] focus-within:ring-2 focus-within:ring-[#084E92]/15'
                        } ${hasError ? 'border-red-500! bg-red-50/20' : 'border-[#C3C6D1]'}`}
                >
                    {selected.length > 2 ? (
                        <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2 py-0.5">
                            {isAllSelected
                                ? `All Materials (${options.length})`
                                : `Selected Materials (${selected.length})`}
                            {!disabled && (
                                <X
                                    size={12}
                                    className="cursor-pointer hover:text-red-500 ml-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange([]);
                                    }}
                                />
                            )}
                        </span>
                    ) : (
                        selected.map((selectedId) => {
                            const matObj = options.find((o) => String(o.id ?? o.value) === String(selectedId));
                            const matName = matObj?.nameEnglish || matObj?.name || matObj?.label || `Material #${selectedId}`;

                            return (
                                <span
                                    key={selectedId}
                                    className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2 py-0.5 rounded"
                                >
                                    <span className="truncate max-w-32">{matName}</span>
                                    {!disabled && (
                                        <X
                                            size={12}
                                            className="cursor-pointer hover:text-red-500 shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeOption(selectedId);
                                            }}
                                        />
                                    )}
                                </span>
                            );
                        })
                    )}

                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        disabled={disabled}
                        placeholder={
                            selected.length === 0
                                ? loading
                                    ? 'Loading materials...'
                                    : 'Select Raw Materials...'
                                : ''
                        }
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!open) setOpen(true);
                        }}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (!open) setOpen(true);
                        }}
                        className="flex-1 min-w-20 bg-transparent text-sm text-gray-800 outline-none border-none p-0.5 placeholder:text-gray-400 cursor-text"
                    />

                    <div className="flex items-center gap-1 ml-auto shrink-0">
                        {selected.length > 0 && !disabled && (
                            <X
                                size={14}
                                className="text-gray-400 hover:text-red-500 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange([]);
                                    setQuery('');
                                }}
                            />
                        )}
                        <ChevronDown
                            size={16}
                            className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                    </div>
                </div>
            </PopoverTrigger>

            <PopoverContent
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="p-1 w-(--radix-popover-trigger-width) min-w-64 max-h-60 overflow-y-auto bg-white border border-[#C3C6D1] rounded-xl shadow-xl z-50 text-xs"
            >
                {filteredOptions.length === 0 ? (
                    <p className="px-3 py-3 text-gray-400 text-center">No raw materials found.</p>
                ) : (
                    <>
                        {options.length > 0 && !query.trim() && (
                            <label className="flex items-center gap-2 px-3 py-2 font-semibold text-[#00376C] hover:bg-blue-50/70 rounded cursor-pointer border-b border-gray-100 mb-1">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={toggleSelectAll}
                                    className="accent-[#00376C] rounded"
                                />
                                All Materials ({options.length})
                            </label>
                        )}

                        {filteredOptions.map((opt) => {
                            const optId = String(opt.id ?? opt.value);
                            return (
                                <label
                                    key={optId}
                                    className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-blue-50/70 rounded cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected(optId)}
                                        onChange={() => toggleOption(optId)}
                                        className="accent-[#00376C] rounded"
                                    />
                                    <span className="truncate">{opt.nameEnglish || opt.name || opt.label}</span>
                                </label>
                            );
                        })}
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
};

const TableOutletMultiSelect = ({
    options = [],
    selected = [],
    onChange,
    disabled = false,
    error = false,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);

    const filteredOptions = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return options;
        return options.filter((o) => (o.name ?? '').toLowerCase().includes(term));
    }, [options, query]);

    const isSelected = (id) => selected.includes(String(id));

    const toggleOption = (id) => {
        const strId = String(id);
        if (isSelected(strId)) {
            onChange(selected.filter((s) => s !== strId));
        } else {
            onChange([...selected, strId]);
        }
    };

    const isAllSelected = options.length > 0 && selected.length === options.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            onChange([]);
        } else {
            onChange(options.map((o) => String(o.id)));
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    className={`min-h-9.5 w-full min-w-55 border rounded-lg px-2.5 py-1 flex flex-wrap items-center gap-1.5 transition-all ${disabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                            : 'bg-white cursor-pointer hover:border-[#00376C] focus-within:border-[#00376C]'
                        } ${error ? 'border-red-500! bg-red-50/20' : 'border-[#C3C6D1]'}`}
                >
                    {selected.length > 3 ? (
                        <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-[11px] font-semibold px-2 py-0.5 rounded-md">
                            {isAllSelected
                                ? `All Units (${options.length})`
                                : `Selected Units (${selected.length})`}
                            {!disabled && (
                                <X
                                    size={11}
                                    className="cursor-pointer hover:text-red-500 ml-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange([]);
                                    }}
                                />
                            )}
                        </span>
                    ) : (
                        selected.map((selectedId) => {
                            const unitObj = options.find((o) => String(o.id) === String(selectedId));
                            const unitName = unitObj?.name || `Unit #${selectedId}`;

                            return (
                                <span
                                    key={selectedId}
                                    className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-[11px] font-medium px-2 py-0.5 rounded-md"
                                >
                                    <span className="truncate max-w-30">{unitName}</span>
                                    {!disabled && (
                                        <X
                                            size={11}
                                            className="cursor-pointer hover:text-red-500 shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onChange(selected.filter((s) => s !== String(selectedId)));
                                            }}
                                        />
                                    )}
                                </span>
                            );
                        })
                    )}

                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        disabled={disabled}
                        placeholder={
                            options.length === 0
                                ? 'No mapped unit'
                                : selected.length === 0
                                    ? 'Select or search unit...'
                                    : ''
                        }
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!open) setOpen(true);
                        }}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (!open) setOpen(true);
                        }}
                        className="flex-1 min-w-17.5 bg-transparent text-xs text-gray-800 outline-none border-none p-0.5 placeholder:text-gray-400 cursor-text"
                    />

                    <div className="flex items-center gap-1 ml-auto shrink-0">
                        {selected.length > 0 && !disabled && (
                            <X
                                size={13}
                                className="text-gray-400 hover:text-red-500 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange([]);
                                    setQuery('');
                                }}
                            />
                        )}
                        <ChevronDown
                            size={14}
                            className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                    </div>
                </div>
            </PopoverTrigger>

            <PopoverContent
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="p-1 w-(--radix-popover-trigger-width) min-w-60 max-h-60 overflow-y-auto bg-white border border-[#C3C6D1] rounded-lg shadow-xl z-50 text-xs"
            >
                {filteredOptions.length === 0 ? (
                    <p className="px-3 py-2 text-gray-400 text-center">
                        {options.length === 0 ? 'No mapped units available for you.' : 'No units found.'}
                    </p>
                ) : (
                    <>
                        {options.length > 0 && !query.trim() && (
                            <label className="flex items-center gap-2 px-3 py-2 font-semibold text-[#00376C] hover:bg-blue-50/70 rounded cursor-pointer border-b border-gray-100 mb-1">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={toggleSelectAll}
                                    className="accent-[#00376C] rounded"
                                />
                                All Units ({options.length})
                            </label>
                        )}

                        {filteredOptions.map((opt) => (
                            <label
                                key={opt.id}
                                className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-blue-50/70 rounded cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected(opt.id)}
                                    onChange={() => toggleOption(opt.id)}
                                    className="accent-[#00376C] rounded"
                                />
                                <span className="truncate">{opt.name}</span>
                            </label>
                        ))}
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
};

const extractRowsFromMaterial = (item, isApproval, isView, appVendorId, appConfigId, targetStatusFilter, targetOutletIds) => {
    const rows = [];
    const vendorList = Array.isArray(item.vendorPriceConfigs)
        ? item.vendorPriceConfigs
        : Array.isArray(item.suppliers)
            ? item.suppliers
            : Array.isArray(item)
                ? item
                : [];

    const materialId = String(item.id || item.rawMaterialId || '');
    const materialName = item.nameEnglish || item.name || item.rawMaterialNameEnglish || `Material #${materialId}`;

    vendorList.forEach((s, configIdx) => {
        const sId = String(s.vendorId ?? s.supplierId ?? s.id);
        const configId = String(s.id ?? '');
        const vendorName = s.vendorName || s.fullName || s.name || 'Unknown Supplier';

        if (isApproval || isView) {
            if (appVendorId && sId !== appVendorId) return;
            if (appConfigId && configId && configId !== appConfigId) return;
        }

        const outletPrices = Array.isArray(s.outletPrices) ? s.outletPrices : [];

        if (outletPrices.length > 0) {
            outletPrices.forEach((op, opIdx) => {
                const outletOrgId = String(op.organizationId ?? op.outletId ?? '');
                const backendOutletName = op.organizationName || op.outletName || '';
                const status = String(op.status || s.status || 'PENDING').trim().toUpperCase();
                const from = op.fromDate || s.fromDate || s.from || '';
                const to = op.toDate || s.toDate || s.to || '';
                const price = op.price != null ? op.price : s.price ?? '';
                const remarks = op.remarks || s.remarks || '';

                if (targetStatusFilter && status !== targetStatusFilter) {
                    return;
                }

                if ((isApproval || isView) && targetOutletIds && targetOutletIds.size > 0) {
                    if (!targetOutletIds.has(outletOrgId)) {
                        return;
                    }
                }

                if (!isApproval && !isView && !isValidPricingEntry(status, from, to, price)) {
                    return;
                }

                rows.push({
                    id: s.id || 0,
                    outletPriceId: op.id || 0,
                    rowId: generateRowId(`srv-${s.id}-${op.id ?? opIdx}`),
                    rawMaterialId: materialId || String(s.rawMaterialId || ''),
                    rawMaterialName: materialName || s.rawMaterialNameEnglish || '',
                    supplierId: sId,
                    name: vendorName,
                    outletIds: outletOrgId ? [outletOrgId] : [],
                    outletNames: backendOutletName ? [backendOutletName] : [],
                    initialStatus: status,
                    status: status,
                    rejectReason: remarks,
                    remarks: remarks,
                    from: formatDateToInputValue(from),
                    to: formatDateToInputValue(to),
                    price: price,
                    isExistingMapping: true,
                });
            });
        } else {
            const outletIds = s.organizationId != null
                ? [String(s.organizationId)]
                : s.outletId != null
                    ? [String(s.outletId)]
                    : [];
            const fallbackName = s.organizationName || s.outletName || '';
            const status = String(s.status || 'PENDING').trim().toUpperCase();
            const from = s.fromDate || s.from || '';
            const to = s.toDate || s.to || '';
            const price = s.price ?? '';
            const remarks = s.remarks || '';

            if (targetStatusFilter && status !== targetStatusFilter) {
                return;
            }

            if ((isApproval || isView) && targetOutletIds && targetOutletIds.size > 0) {
                const hasMatchingOutlet = outletIds.some((id) => targetOutletIds.has(String(id)));
                if (!hasMatchingOutlet) {
                    return;
                }
            }

            if (!isApproval && !isView && !isValidPricingEntry(status, from, to, price)) {
                return;
            }

            rows.push({
                id: s.id || 0,
                outletPriceId: 0,
                rowId: generateRowId(`srv-${s.id ?? configIdx}`),
                rawMaterialId: materialId || String(s.rawMaterialId || ''),
                rawMaterialName: materialName || s.rawMaterialNameEnglish || '',
                supplierId: sId,
                name: vendorName,
                outletIds,
                outletNames: fallbackName ? [fallbackName] : [],
                initialStatus: status,
                status: status,
                rejectReason: remarks,
                remarks: remarks,
                from: formatDateToInputValue(from),
                to: formatDateToInputValue(to),
                price: price,
                isExistingMapping: true,
            });
        }
    });

    return rows;
};

const VendorPriceAssociation = () => {
    const { canView } = usePagePermissions('Vendor Price Association');
    const navigate = useNavigate();
    const location = useLocation();
    const { id: paramMaterialId } = useParams();

    const isViewOnly = location.pathname.includes('/view/');
    const isApprovalMode = location.pathname.includes('/approve/');

    const approvalVendorId = location.state?.vendorId != null ? String(location.state.vendorId) : '';
    const approvalConfigId = location.state?.configId != null ? String(location.state.configId) : '';
    const stateStatus = location.state?.status != null ? String(location.state.status).toUpperCase() : '';

    const targetStatusFilter = useMemo(() => {
        if (stateStatus === 'APPROVED' || stateStatus === 'REJECTED') {
            return stateStatus;
        }
        return '';
    }, [stateStatus]);

    const passedOutletIds = useMemo(() => {
        const ids = location.state?.outletIds;
        if (Array.isArray(ids) && ids.length > 0) {
            return new Set(ids.map(String));
        }
        return null;
    }, [location.state?.outletIds]);

    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState('');
    const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);

    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [materialError, setMaterialError] = useState('');

    const [supplierOptions, setSupplierOptions] = useState([]);
    const [selectedSupplierIds, setSelectedSupplierIds] = useState([]);
    const [supplierRows, setSupplierRows] = useState([]);
    const [supplierSearch, setSupplierSearch] = useState('');
    const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
    const [supplierErrors, setSupplierErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const vendorOutletCacheRef = useRef(new Map());
    const [, setMappingVersion] = useState(0);

    const cachedMaterialsRef = useRef(new Map());

    const {
        loading: outletsLoading,
        isOutletUser,
        isCompanyUser,
        units: outlets,
        effectiveOutletId,
    } = useOrgScope();

    const outletList = useMemo(() => {
        return (outlets || [])
            .filter((outlet) => String(outlet?.id).toUpperCase() !== 'ALL')
            .map((outlet) => ({
                id: String(outlet.id),
                name: outlet.code ? `${outlet.name} (${outlet.code})` : outlet.name,
            }));
    }, [outlets]);

    const outletUserOutletId = isOutletUser ? String(effectiveOutletId ?? '') : '';

    const userAccessibleOutletIds = useMemo(() => {
        if (isOutletUser && outletUserOutletId) {
            return new Set([String(outletUserOutletId)]);
        }
        if (isCompanyUser && Array.isArray(outlets) && outlets.length > 0) {
            const valid = outlets
                .filter((o) => o?.id != null && String(o.id).toUpperCase() !== 'ALL')
                .map((o) => String(o.id));
            if (valid.length > 0) return new Set(valid);
        }
        return null;
    }, [isOutletUser, isCompanyUser, outletUserOutletId, outlets]);

    const isVendorMappedToOutlet = (vendorId, outletId) => {
        const mappedSet = vendorOutletCacheRef.current.get(String(vendorId));
        return mappedSet ? mappedSet.has(String(outletId)) : false;
    };

    const ensureVendorOutletMappingsLoaded = async (vendorIds = []) => {
        const missingIds = vendorIds
            .map(String)
            .filter((id) => id && !vendorOutletCacheRef.current.has(id));

        if (missingIds.length === 0) return;

        try {
            const responses = await Promise.all(
                missingIds.map((vId) =>
                    getVendorOutletMappingByVendorId(vId)
                        .then((res) => ({ vId, data: res?.data?.data || res?.data || [] }))
                        .catch(() => ({ vId, data: [] }))
                )
            );

            responses.forEach(({ vId, data }) => {
                const list = Array.isArray(data) ? data : [];
                const orgIds = new Set(list.map((m) => String(m.organizationId ?? m.outletId ?? '')));
                vendorOutletCacheRef.current.set(vId, orgIds);
            });

            setMappingVersion((v) => v + 1);
        } catch (err) {
            console.error('Failed to load vendor outlet mappings:', err);
        }
    };

    useEffect(() => {
        if (isViewOnly || isApprovalMode) return;

        const initData = async () => {
            try {
                const [catRes, vendorRes] = await Promise.all([
                    getAllRawMaterialCategory(),
                    getAllActiveVendors(),
                ]);
                const catData =
                    catRes?.data?.data?.['Raw Material Category Details'] ||
                    catRes?.data?.data ||
                    [];
                setCategories(catData.filter((i) => i.isActive === true));
                setSupplierOptions(vendorRes?.data?.data || []);
            } catch (err) {
                console.error('Failed to load initial lookups:', err);
            }
        };
        initData();
    }, [isViewOnly, isApprovalMode]);

    useEffect(() => {
        if (isViewOnly || isApprovalMode) return;
        if (!selectedCategoryId) {
            setSubCategories([]);
            setSelectedSubCategoryId('');
            return;
        }
        const loadSubs = async () => {
            try {
                const res = await getAllSubCategoryByCategoryId(selectedCategoryId);
                const subData = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
                setSubCategories(subData.filter((i) => i.isActive === true));
            } catch (err) {
                console.error('Failed to fetch subcategories:', err);
                setSubCategories([]);
            }
        };
        loadSubs();
    }, [selectedCategoryId, isViewOnly, isApprovalMode]);

    useEffect(() => {
        if (isViewOnly || isApprovalMode) {
            setLoadingMaterials(false);
            return;
        }

        const fetchMaterials = async () => {
            try {
                setLoadingMaterials(true);
                let list = [];

                if (selectedCategoryId) {
                    const res = await getAllRawMaterialItems(
                        Number(selectedCategoryId),
                        0,
                        true
                    );
                    list =
                        res?.data?.data?.['Raw Material Details'] ||
                        res?.data?.data ||
                        res?.data?.['Raw Material Details'] ||
                        (Array.isArray(res?.data) ? res.data : []);
                } else {
                    const res = await getAllRawMaterial();
                    list = res?.data?.data?.['Raw Material Details'] || res?.data?.data || [];
                }

                let filtered = list;
                if (selectedSubCategoryId) {
                    filtered = filtered.filter(
                        (m) =>
                            String(m.subCategoryId || m.rawMaterialSubCatId || m.rawMaterialSubCat?.id) ===
                            String(selectedSubCategoryId)
                    );
                }
                setRawMaterials(filtered);
            } catch (err) {
                console.error('Failed to load raw materials:', err);
                setRawMaterials([]);
            } finally {
                setLoadingMaterials(false);
            }
        };

        fetchMaterials();
    }, [selectedCategoryId, selectedSubCategoryId, isViewOnly, isApprovalMode]);

    useEffect(() => {
        if (paramMaterialId) {
            setSelectedMaterialIds([String(paramMaterialId)]);
        }
    }, [paramMaterialId]);

    useEffect(() => {
        if (selectedMaterialIds.length === 0) {
            setSupplierRows([]);
            return;
        }

        const currentSelectedSet = new Set(selectedMaterialIds.map(String));

        const idsToFetch = Array.from(currentSelectedSet).filter(
            (id) => !cachedMaterialsRef.current.has(id)
        );

        const loadMissingMaterials = async () => {
            try {
                setMaterialError('');

                if (idsToFetch.length > 0) {
                    const responses = await Promise.all(
                        idsToFetch.map(async (id) => {
                            if (isViewOnly || isApprovalMode) {
                                try {
                                    const res = await getAllVendorPriceConfigurations({
                                        rawMaterialId: Number(id),
                                        pageSize: 100,
                                    });
                                    const configs = res?.data?.data?.vendorPriceConfigurations || [];
                                    const sample = configs[0] || {};
                                    const matName = sample.rawMaterialNameEnglish || `Material #${id}`;

                                    setRawMaterials((prev) => {
                                        if (prev.some((m) => String(m.id) === String(id))) return prev;
                                        return [...prev, { id: String(id), nameEnglish: matName }];
                                    });

                                    return {
                                        id,
                                        data: {
                                            id,
                                            nameEnglish: matName,
                                            vendorPriceConfigs: configs,
                                        },
                                    };
                                } catch (err) {
                                    console.error(`Failed to fetch vendor prices for raw material ${id}:`, err);
                                    return { id, data: null };
                                }
                            }

                            try {
                                const res = await getRawMaterialById(id);
                                return { id, data: res?.data?.data?.['Raw Material Details']?.[0] || null };
                            } catch {
                                return { id, data: null };
                            }
                        })
                    );

                    responses.forEach(({ id, data }) => {
                        if (data) {
                            cachedMaterialsRef.current.set(String(id), data);
                        }
                    });
                }

                const vendorIdsToLoad = new Set();
                currentSelectedSet.forEach((matId) => {
                    const matData = cachedMaterialsRef.current.get(matId);
                    if (!matData) return;
                    const vList = matData.vendorPriceConfigs || matData.suppliers || [];
                    vList.forEach((v) => {
                        const vId = String(v.vendorId ?? v.supplierId ?? v.id);
                        if (vId) vendorIdsToLoad.add(vId);
                    });
                });

                if (vendorIdsToLoad.size > 0) {
                    await ensureVendorOutletMappingsLoaded(Array.from(vendorIdsToLoad));
                }

                let allRows = [];
                const seenPairs = new Set();

                currentSelectedSet.forEach((matId) => {
                    const matData = cachedMaterialsRef.current.get(matId);
                    if (!matData) return;

                    const extracted = extractRowsFromMaterial(
                        matData,
                        isApprovalMode,
                        isViewOnly,
                        approvalVendorId,
                        approvalConfigId,
                        targetStatusFilter,
                        passedOutletIds
                    );

                    extracted.forEach((r) => {
                        const targetOutletId = r.outletIds[0] || '';
                        const pairKey = `${r.rawMaterialId}__${r.supplierId}__${targetOutletId}`;

                        if (!isApprovalMode && !isViewOnly && targetOutletId && seenPairs.has(pairKey)) {
                            return;
                        }
                        if (targetOutletId) seenPairs.add(pairKey);
                        allRows.push(r);
                    });
                });

                if (userAccessibleOutletIds) {
                    allRows = allRows.filter(
                        (r) =>
                            r.outletIds.length === 0 ||
                            (r.outletIds || []).some((oid) => userAccessibleOutletIds.has(String(oid)))
                    );
                }

                if (isOutletUser && outletUserOutletId) {
                    const seenVendors = new Set();
                    const deduplicated = [];
                    allRows.forEach((r) => {
                        const vKey = `${r.rawMaterialId}__${r.supplierId}`;
                        if (!seenVendors.has(vKey)) {
                            seenVendors.add(vKey);
                            const isMapped = isVendorMappedToOutlet(r.supplierId, outletUserOutletId);
                            deduplicated.push({
                                ...r,
                                outletIds: isMapped ? [String(outletUserOutletId)] : [],
                                outletNames: isMapped
                                    ? [outletList.find((o) => String(o.id) === String(outletUserOutletId))?.name || '']
                                    : [],
                                isNotMappedForUser: !isMapped,
                            });
                        }
                    });
                    allRows = deduplicated;
                }

                setSupplierRows(allRows);
            } catch (err) {
                console.error('Failed to load raw material details:', err);
            }
        };

        loadMissingMaterials();
    }, [
        selectedMaterialIds,
        userAccessibleOutletIds,
        isOutletUser,
        outletUserOutletId,
        outletList,
        isApprovalMode,
        isViewOnly,
        approvalVendorId,
        approvalConfigId,
        targetStatusFilter,
        passedOutletIds,
    ]);

    const toggleSupplierSelection = (supplierId) => {
        setSelectedSupplierIds((prev) =>
            prev.includes(supplierId)
                ? prev.filter((id) => id !== supplierId)
                : [...prev, supplierId]
        );
    };

    const handleAddSupplier = async () => {
        if (selectedSupplierIds.length === 0 || isViewOnly || isApprovalMode) return;
        if (selectedMaterialIds.length === 0) {
            setMaterialError('Please select at least one Raw Material first');
            return;
        }

        await ensureVendorOutletMappingsLoaded(selectedSupplierIds);

        setSupplierRows((prev) => {
            const newRows = [];
            const currentOutletName =
                outletList.find((o) => String(o.id) === String(outletUserOutletId))?.name || '';

            selectedMaterialIds.forEach((matId) => {
                const cachedData = cachedMaterialsRef.current.get(String(matId));
                const matObj = rawMaterials.find((m) => String(m.id) === String(matId)) || cachedData;
                const matName = matObj?.nameEnglish || matObj?.name || `Material #${matId}`;

                selectedSupplierIds.forEach((supplierId) => {
                    const supplierAlreadyAdded = prev.some(
                        (r) => String(r.supplierId) === String(supplierId) && String(r.rawMaterialId) === String(matId)
                    );
                    if (supplierAlreadyAdded) return;

                    const supplier = supplierOptions.find((s) => String(s.id) === String(supplierId));
                    const isMappedToUserOutlet = isOutletUser && outletUserOutletId
                        ? isVendorMappedToOutlet(supplierId, outletUserOutletId)
                        : true;

                    newRows.push({
                        id: 0,
                        outletPriceId: 0,
                        rowId: generateRowId(`${matId}-${supplierId}`),
                        rawMaterialId: String(matId),
                        rawMaterialName: matName,
                        supplierId: String(supplierId),
                        name: supplier?.fullName || supplier?.name || 'Unknown Supplier',
                        outletIds: isOutletUser && outletUserOutletId && isMappedToUserOutlet
                            ? [String(outletUserOutletId)]
                            : [],
                        outletNames: isOutletUser && currentOutletName && isMappedToUserOutlet
                            ? [currentOutletName]
                            : [],
                        initialStatus: 'PENDING',
                        status: 'PENDING',
                        rejectReason: '',
                        remarks: '',
                        from: '',
                        to: '',
                        price: '',
                        isExistingMapping: false,
                        isNotMappedForUser: isOutletUser && !isMappedToUserOutlet,
                    });
                });
            });

            return [...prev, ...newRows];
        });

        setSelectedSupplierIds([]);
        setSupplierSearch('');
        setSupplierDropdownOpen(false);
    };

    const updateSupplierOutlets = (rowId, newOutletIds) => {
        if (isOutletUser || isViewOnly) return;

        setSupplierErrors((prevErr) => {
            const next = { ...prevErr };
            delete next[rowId];
            return next;
        });

        setSupplierRows((prev) =>
            prev.map((row) => {
                if (row.rowId !== rowId) return row;
                const names = newOutletIds.map(
                    (oid) => outletList.find((o) => String(o.id) === String(oid))?.name || `Outlet #${oid}`
                );
                return { ...row, outletIds: newOutletIds, outletNames: names };
            })
        );
    };

    const updateSupplierRow = (rowId, field, value) => {
        if (field === 'price' || field === 'rejectReason') {
            setSupplierErrors((prevErr) => {
                const next = { ...prevErr };
                delete next[rowId];
                delete next[`${rowId}_reason`];
                return next;
            });
        }
        setSupplierRows((prev) =>
            prev.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row))
        );
    };

    const removeSupplierRow = (rowId) => {
        if (isViewOnly || isApprovalMode) return;
        setSupplierRows((prev) => prev.filter((row) => row.rowId !== rowId));
        setSupplierErrors((prevErr) => {
            const next = { ...prevErr };
            delete next[rowId];
            return next;
        });
    };

    const getOutletOptionsForRow = (row) => {
        const vendorMappedOutlets = vendorOutletCacheRef.current.get(String(row.supplierId)) || new Set();

        const takenBySameVendorAndMaterial = new Set();
        supplierRows.forEach((r) => {
            if (
                r.rowId !== row.rowId &&
                String(r.supplierId) === String(row.supplierId) &&
                String(r.rawMaterialId) === String(row.rawMaterialId)
            ) {
                (r.outletIds || []).forEach((outId) => takenBySameVendorAndMaterial.add(String(outId)));
            }
        });

        return outletList.filter((outlet) => {
            const outletIdStr = String(outlet.id);

            if (!vendorMappedOutlets.has(outletIdStr)) return false;

            if (userAccessibleOutletIds && !userAccessibleOutletIds.has(outletIdStr)) {
                return false;
            }

            const isTaken = takenBySameVendorAndMaterial.has(outletIdStr);
            const isCurrentlySelectedInThisRow = (row.outletIds || []).includes(outletIdStr);

            return !isTaken || isCurrentlySelectedInThisRow;
        });
    };

    const handleApprovalDecision = async () => {
        const unreasonedRejections = supplierRows.filter(
            (r) =>
                isRowPending(r) &&
                String(r.status).toUpperCase() === 'REJECTED' &&
                !r.rejectReason?.trim()
        );

        if (unreasonedRejections.length > 0) {
            const reasonErrs = {};
            unreasonedRejections.forEach((r) => {
                reasonErrs[`${r.rowId}_reason`] = 'Rejection reason is required';
            });
            setSupplierErrors((prev) => ({ ...prev, ...reasonErrs }));
            return;
        }

        const approveIds = supplierRows
            .filter((r) => isRowPending(r) && String(r.status).toUpperCase() === 'APPROVED')
            .map((r) => r.outletPriceId || r.id)
            .filter(Boolean);

        const rejectGroups = new Map();
        supplierRows
            .filter((r) => isRowPending(r) && String(r.status).toUpperCase() === 'REJECTED')
            .forEach((r) => {
                const priceId = r.outletPriceId || r.id;
                if (!priceId) return;
                const remarks = r.rejectReason.trim();
                if (!rejectGroups.has(remarks)) rejectGroups.set(remarks, []);
                rejectGroups.get(remarks).push(priceId);
            });

        if (approveIds.length === 0 && rejectGroups.size === 0) return;

        try {
            setIsSubmitting(true);
            const calls = [];

            if (approveIds.length > 0) {
                calls.push(approveVendorPricing(approveIds));
            }

            rejectGroups.forEach((ids, remarks) => {
                calls.push(rejectVendorPricing(ids, remarks));
            });

            await Promise.all(calls);
            navigate('/material/vendor-price-approval');
        } catch (err) {
            console.error('Failed to submit pricing decisions:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveBulkPricing = async () => {
        if (selectedMaterialIds.length === 0) {
            setMaterialError('Raw Material is required');
            return;
        }

        if (supplierRows.length === 0) {
            setMaterialError('Please add at least one vendor price association row');
            return;
        }

        if (isOutletUser && outletUserOutletId) {
            const unmappedRows = supplierRows.filter(
                (r) => !isVendorMappedToOutlet(r.supplierId, outletUserOutletId)
            );
            if (unmappedRows.length > 0) {
                const errs = {};
                unmappedRows.forEach((r) => {
                    errs[r.rowId] = 'Vendor is not mapped to your unit. Remove this row.';
                });
                setSupplierErrors((prev) => ({ ...prev, ...errs }));
                return;
            }
        }

        const effectiveRows = supplierRows.map((row) => ({
            ...row,
            outletIds: isOutletUser ? [String(outletUserOutletId)] : row.outletIds || [],
        }));

        const invalidPriceRows = effectiveRows.filter(
            (r) => r.price === '' || isNaN(Number(r.price)) || Number(r.price) <= 0
        );
        if (invalidPriceRows.length > 0) {
            const errs = {};
            invalidPriceRows.forEach((r) => {
                errs[r.rowId] = 'Valid positive price is required';
            });
            setSupplierErrors((prev) => ({ ...prev, ...errs }));
            return;
        }

        const missingOutletRows = effectiveRows.filter(
            (row) => !row.outletIds || row.outletIds.length === 0
        );
        if (missingOutletRows.length > 0) {
            const errs = {};
            missingOutletRows.forEach((row) => {
                errs[row.rowId] = 'At least one unit is required';
            });
            setSupplierErrors((prev) => ({ ...prev, ...errs }));
            return;
        }

        const unmappedOutletErrs = {};
        effectiveRows.forEach((row) => {
            const invalidOutlets = (row.outletIds || []).filter(
                (oid) => !isVendorMappedToOutlet(row.supplierId, oid)
            );
            if (invalidOutlets.length > 0) {
                unmappedOutletErrs[row.rowId] = 'One or more selected units are not mapped to this vendor.';
            }
        });

        if (Object.keys(unmappedOutletErrs).length > 0) {
            setSupplierErrors((prev) => ({ ...prev, ...unmappedOutletErrs }));
            return;
        }

        const vendorOutletPairs = new Set();
        const duplicateErrs = {};
        effectiveRows.forEach((row) => {
            (row.outletIds || []).forEach((outId) => {
                const pairKey = `${row.rawMaterialId}__${row.supplierId}__${outId}`;
                if (vendorOutletPairs.has(pairKey)) {
                    duplicateErrs[row.rowId] = 'Duplicate vendor-outlet mapping found for this raw material.';
                }
                vendorOutletPairs.add(pairKey);
            });
        });

        if (Object.keys(duplicateErrs).length > 0) {
            setSupplierErrors((prev) => ({ ...prev, ...duplicateErrs }));
            return;
        }

        try {
            setIsSubmitting(true);
            const currentUserId = Number(getUserIdFromToken()) || 0;

            const materialVendorGroups = {};
            effectiveRows.forEach((row) => {
                const matId = Number(row.rawMaterialId);
                const vId = Number(row.supplierId);

                if (!materialVendorGroups[matId]) materialVendorGroups[matId] = {};
                if (!materialVendorGroups[matId][vId]) materialVendorGroups[matId][vId] = [];

                materialVendorGroups[matId][vId].push(row);
            });

            const requests = [];

            Object.entries(materialVendorGroups).forEach(([matId, vendorMap]) => {
                Object.entries(vendorMap).forEach(([vId, rows]) => {
                    const primaryRow = rows[0];

                    const outletPrices = rows.flatMap((r) =>
                        (r.outletIds || []).map((outId) => ({
                            id: Number(r.outletPriceId) || 0,
                            organizationId: Number(outId),
                            price: Number(r.price) || 0,
                            fromDate: formatDateForBackend(r.from),
                            toDate: formatDateForBackend(r.to),
                        }))
                    );

                    const payload = {
                        id: Number(primaryRow.id) || 0,
                        vendorId: Number(vId),
                        userId: currentUserId,
                        rawMaterialIds: [Number(matId)],
                        price: Number(primaryRow.price) || 0,
                        fromDate: formatDateForBackend(primaryRow.from),
                        toDate: formatDateForBackend(primaryRow.to),
                        outletPrices,
                    };

                    requests.push(saveBulkVendorPrice(payload));
                });
            });

            await Promise.all(requests);
            navigate('/material/vendor-price-approval');
        } catch (err) {
            console.error('Failed to submit vendor prices:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredSuppliers = supplierOptions.filter((item) =>
        (item.fullName || item.name || '').toLowerCase().includes(supplierSearch.trim().toLowerCase())
    );

    if (!canView) {
        return <AccessDenied pageTitle="Vendor Price Association" />;
    }

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                <PageHeader
                    title={
                        isApprovalMode
                            ? 'Review Raw Material Vendor Price'
                            : isViewOnly
                                ? 'View Vendor Price Association'
                                : 'Vendor Price Association'
                    }
                    description={
                        isApprovalMode
                            ? targetStatusFilter
                                ? `Review ${targetStatusFilter.toLowerCase()} vendor outlet pricing for your outlet.`
                                : 'Review vendor outlet pricing. Only pending entries can be approved or rejected.'
                            : isViewOnly
                                ? targetStatusFilter
                                    ? `View ${targetStatusFilter.toLowerCase()} vendor outlet pricing records.`
                                    : 'View all raw material vendor pricing associations across outlets.'
                                : 'Configure raw material vendor associations and outlet pricing across multiple materials.'
                    }
                    actions={
                        <button
                            type="button"
                            onClick={() => navigate('/material/vendor-price-approval')}
                            className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0 shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {'Back to Vendor Price Approval'}
                        </button>
                    }
                />

                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
                    <h3 className="text-sm font-semibold text-[#00376C] border-b border-gray-100 pb-2.5 mb-4">
                        Select Raw Material
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">Category Filter</label>
                            <SearchableSelect
                                name="categoryId"
                                value={selectedCategoryId}
                                disabled={isApprovalMode || isViewOnly}
                                isClearable={true}
                                onChange={(e) => {
                                    setSelectedCategoryId(String(e.target.value));
                                    setSelectedSubCategoryId('');
                                }}
                                options={categories.map((c) => ({
                                    value: String(c.id),
                                    label: c.nameEnglish,
                                }))}
                                placeholder="All Categories"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">Sub Category Filter</label>
                            <SearchableSelect
                                name="subCategoryId"
                                value={selectedSubCategoryId}
                                disabled={isApprovalMode || isViewOnly || !selectedCategoryId}
                                isClearable={true}
                                onChange={(e) => {
                                    setSelectedSubCategoryId(String(e.target.value));
                                }}
                                options={subCategories.map((s) => ({
                                    value: String(s.id),
                                    label: s.nameEnglish,
                                }))}
                                placeholder={!selectedCategoryId ? 'Select Category First' : 'All Sub Categories'}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                Raw Material <span className="text-red-500">*</span>
                            </label>
                            <RawMaterialMultiSelect
                                options={rawMaterials}
                                selected={selectedMaterialIds}
                                disabled={isApprovalMode || isViewOnly}
                                loading={loadingMaterials}
                                hasError={Boolean(materialError)}
                                onChange={(newIds) => {
                                    setSelectedMaterialIds(newIds);
                                    setMaterialError('');
                                }}
                            />
                            {materialError && (
                                <p className="text-red-500 text-xs mt-1 font-medium">{materialError}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
                    <h3 className="font-semibold text-[#00376C] mb-4">Vendor Association</h3>

                    {!isViewOnly && !isApprovalMode && (
                        <div className="flex gap-3 w-full justify-between flex-col sm:flex-row mb-4">
                            <div className="flex-1 min-w-0">
                                <Popover
                                    open={supplierDropdownOpen}
                                    onOpenChange={setSupplierDropdownOpen}
                                    modal={false}
                                >
                                    <PopoverTrigger asChild>
                                        <div className="w-full">
                                            <SearchBar
                                                value={
                                                    selectedSupplierIds.length > 0
                                                        ? `${selectedSupplierIds.length} vendor${selectedSupplierIds.length > 1 ? 's' : ''} selected`
                                                        : supplierSearch
                                                }
                                                placeholder="Search and select vendor..."
                                                onClick={() => setSupplierDropdownOpen(true)}
                                                onChange={(e) => {
                                                    setSupplierSearch(e.target.value);
                                                    setSupplierDropdownOpen(true);
                                                }}
                                                onClear={() => {
                                                    setSupplierSearch('');
                                                    setSelectedSupplierIds([]);
                                                }}
                                            />
                                        </div>
                                    </PopoverTrigger>

                                    <PopoverContent
                                        side="bottom"
                                        align="start"
                                        sideOffset={4}
                                        onOpenAutoFocus={(e) => e.preventDefault()}
                                        className="p-0 w-(--radix-popover-trigger-width) overflow-hidden z-100 bg-white"
                                    >
                                        <div className="max-h-60 overflow-y-auto">
                                            {filteredSuppliers.map((item) => {
                                                const isChecked = selectedSupplierIds.includes(item.id);
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => toggleSupplierSelection(item.id)}
                                                        className={`w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm hover:bg-blue-50 cursor-pointer ${isChecked ? 'bg-blue-50 text-[#00376C] font-medium' : 'text-gray-700'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            readOnly
                                                            className="pointer-events-none accent-[#00376C]"
                                                        />
                                                        <span className="flex-1 min-w-0 truncate">
                                                            {item.fullName || item.name}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                            {filteredSuppliers.length === 0 && (
                                                <div className="px-3 py-3 text-sm text-gray-500 text-center">
                                                    No vendors found
                                                </div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <HeaderActionButton
                                onClick={handleAddSupplier}
                                disabled={selectedSupplierIds.length === 0 || selectedMaterialIds.length === 0}
                                icon={Users}
                                label="Add Vendor"
                                className="h-10 px-5 text-sm"
                            />
                        </div>
                    )}

                    <div className="border rounded-xl min-h-40 overflow-hidden">
                        {supplierRows.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#EEF4FF] text-[#00376C]">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 font-medium">Raw Material</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Vendor Name</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Outlets</th>
                                            <th className="text-left px-4 py-2.5 font-medium">From</th>
                                            <th className="text-left px-4 py-2.5 font-medium">To</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Price</th>
                                            <th className="text-left px-4 py-2.5 font-medium">Status</th>
                                            {!isViewOnly && !isApprovalMode && <th className="px-4 py-2.5" />}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supplierRows.map((row) => {
                                            const isPending = isRowPending(row);
                                            const isRejectedSelected = String(row.status).toUpperCase() === 'REJECTED';
                                            const isRejectedRow = String(row.initialStatus || row.status).toUpperCase() === 'REJECTED';

                                            const visibleOutletIds = userAccessibleOutletIds
                                                ? (row.outletIds || []).filter((oid) => userAccessibleOutletIds.has(String(oid)))
                                                : (row.outletIds || []);

                                            return (
                                                <React.Fragment key={row.rowId}>
                                                    <tr className={`border-t ${isRejectedRow ? 'bg-red-50/20 hover:bg-red-50/30' : 'hover:bg-gray-50/50'}`}>
                                                        <td className="px-4 py-2.5 font-medium text-gray-800">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-[#00376C]">
                                                                    {row.rawMaterialName}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-2.5 font-medium">{row.name}</td>
                                                        <td className="px-4 py-2.5 min-w-55">
                                                            {isOutletUser && row.isNotMappedForUser ? (
                                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                                                                    <AlertCircle size={14} className="shrink-0 text-red-500" />
                                                                    <span>Not Mapped with this Outlet</span>
                                                                </div>
                                                            ) : isOutletUser || isViewOnly || isApprovalMode ? (
                                                                <div className="w-full border rounded-md px-3 py-1.5 bg-gray-100 text-gray-600 text-xs">
                                                                    {visibleOutletIds.length > 0 ? (
                                                                        visibleOutletIds
                                                                            .map((oid) => {
                                                                                const fromList = outletList.find((o) => String(o.id) === String(oid))?.name;
                                                                                const name = fromList || `Outlet #${oid}`;
                                                                                const mapped = isVendorMappedToOutlet(row.supplierId, oid);
                                                                                return mapped ? name : `${name} (Not Mapped)`;
                                                                            })
                                                                            .join(', ')
                                                                    ) : (
                                                                        <span className="text-red-500 font-medium">Not Mapped</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <TableOutletMultiSelect
                                                                    options={getOutletOptionsForRow(row)}
                                                                    selected={visibleOutletIds}
                                                                    onChange={(newOutlets) => updateSupplierOutlets(row.rowId, newOutlets)}
                                                                    disabled={outletsLoading}
                                                                    error={Boolean(supplierErrors[row.rowId])}
                                                                />
                                                            )}
                                                            {supplierErrors[row.rowId] && !supplierErrors[row.rowId]?.includes('Price') && (
                                                                <p className="mt-1 text-xs text-red-500 font-medium">
                                                                    {supplierErrors[row.rowId]}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <input
                                                                type="date"
                                                                disabled={isViewOnly || isApprovalMode}
                                                                value={row.from}
                                                                onChange={(e) => updateSupplierRow(row.rowId, 'from', e.target.value)}
                                                                className="w-full border rounded-md px-2 py-1.5 outline-none text-xs disabled:bg-gray-100"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <input
                                                                type="date"
                                                                disabled={isViewOnly || isApprovalMode}
                                                                value={row.to}
                                                                onChange={(e) => updateSupplierRow(row.rowId, 'to', e.target.value)}
                                                                className="w-full border rounded-md px-2 py-1.5 outline-none text-xs disabled:bg-gray-100"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="any"
                                                                disabled={isViewOnly || isApprovalMode}
                                                                value={row.price}
                                                                onWheel={blurOnWheel}
                                                                onChange={(e) => updateSupplierRow(row.rowId, 'price', e.target.value)}
                                                                placeholder="₹ 0.00"
                                                                className={`w-full border rounded-md px-2 py-1.5 outline-none text-xs disabled:bg-gray-100 ${supplierErrors[row.rowId]?.includes('Price')
                                                                        ? 'border-red-500 bg-red-50/20'
                                                                        : 'border-[#C3C6D1]'
                                                                    }`}
                                                            />
                                                            {supplierErrors[row.rowId]?.includes('Price') && (
                                                                <p className="text-[10px] text-red-500 font-medium mt-0.5">
                                                                    {supplierErrors[row.rowId]}
                                                                </p>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-2.5">
                                                            {isApprovalMode && isPending ? (
                                                                <StatusSelect
                                                                    status={row.status}
                                                                    onChange={(value) => updateSupplierRow(row.rowId, 'status', value)}
                                                                />
                                                            ) : (
                                                                <StatusBadge status={row.status} />
                                                            )}
                                                        </td>

                                                        {!isViewOnly && !isApprovalMode && (
                                                            <td className="px-4 py-2.5 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeSupplierRow(row.rowId)}
                                                                    className="text-gray-400 hover:text-red-500 cursor-pointer"
                                                                    title="Remove vendor"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>

                                                    {isApprovalMode && isPending && isRejectedSelected && (
                                                        <tr className="bg-red-50/40">
                                                            <td colSpan={8} className="px-4 py-2">
                                                                <div className="flex flex-col gap-1 max-w-xl">
                                                                    <label className="text-[11px] font-semibold text-red-700 flex items-center gap-1">
                                                                        <AlertCircle size={12} />
                                                                        Reason for Rejection <span className="text-red-600">*</span>
                                                                    </label>
                                                                    <textarea
                                                                        rows={2}
                                                                        value={row.rejectReason || ''}
                                                                        onChange={(e) => updateSupplierRow(row.rowId, 'rejectReason', e.target.value)}
                                                                        placeholder="Specify reason for rejecting this vendor price..."
                                                                        className={`w-full text-xs p-2 rounded-md border outline-none bg-white placeholder:text-gray-400 resize-none ${supplierErrors[`${row.rowId}_reason`]
                                                                                ? 'border-red-500 ring-1 ring-red-400'
                                                                                : 'border-red-200 focus:border-red-400'
                                                                            }`}
                                                                    />
                                                                    {supplierErrors[`${row.rowId}_reason`] && (
                                                                        <span className="text-[10px] text-red-600 font-medium">
                                                                            {supplierErrors[`${row.rowId}_reason`]}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}

                                                    {isRejectedRow && (!isApprovalMode || !isPending) && (
                                                        <tr className="bg-red-50/50">
                                                            <td colSpan={8} className="px-4 py-2.5">
                                                                <div className="flex flex-col gap-1 max-w-xl">
                                                                    <span className="text-[11px] font-semibold text-red-700 flex items-center gap-1">
                                                                        <AlertCircle size={13} />
                                                                        Reason for Rejection
                                                                    </span>
                                                                    <p className="text-xs text-gray-800 bg-white border border-red-200 rounded-md p-2 whitespace-pre-wrap wrap-break-word">
                                                                        {row.remarks?.trim() || row.rejectReason?.trim() || 'No reason provided'}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="h-32 flex flex-col justify-center items-center p-4">
                                <h4 className="font-semibold text-[#00376C]">No records found</h4>
                                <p className="text-sm text-gray-500">
                                    {targetStatusFilter
                                        ? `No ${targetStatusFilter.toLowerCase()} vendor pricing records exist for this raw material.`
                                        : selectedMaterialIds.length > 0
                                            ? 'Add vendors above to associate pricing.'
                                            : 'Select raw materials above to view or link vendor pricing.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t p-4 flex justify-end gap-3 border-[#C3C6D1]">
                    <HeaderActionButton
                        variant="outline"
                        onClick={() => navigate(-1)}
                        label={isViewOnly ? 'Close' : 'Cancel'}
                        icon={null}
                    />

                    {isApprovalMode && (
                        <HeaderActionButton
                            onClick={handleApprovalDecision}
                            disabled={isSubmitting || supplierRows.length === 0}
                            label={isSubmitting ? 'Submitting...' : 'Submit Decision'}
                            icon={Check}
                        />
                    )}

                    {!isViewOnly && !isApprovalMode && (
                        <HeaderActionButton
                            onClick={handleSaveBulkPricing}
                            disabled={isSubmitting || selectedMaterialIds.length === 0 || supplierRows.length === 0}
                            label={isSubmitting ? 'Saving...' : 'Save Bulk Vendor Prices'}
                            icon={Save}
                        />
                    )}
                </div>
            </div>
        </Container>
    );
};

export default VendorPriceAssociation;