import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Container } from "@/components/common/container";
import { PageHeader } from '@/components/common/PageHeader';
import { CheckCircle2, QrCode, Trash2, X, ChevronDown } from 'lucide-react';
import {
    getAssignedAssetsByOrgAndSubOutlet,
    getAssignmentsByAssetId,
    getOrganizationByType,
    getChildrenByParentId,
    getAssetUnitLocationsByOrganization,
    createAssetQrBulk,
    getAssetCategories,
    getActiveAssetBrands,
    getAssetBrands,
    getAllDepartmentMaster,
    getHrmsUsersPaginated,
} from '../../../services/apiServices';
import { OrgTypes } from '@/constants/orgTypes';
import { getOrgIdFromToken, getUserIdFromToken } from '@/utils/auth';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import QRCode from 'react-qr-code';
import { createPortal } from 'react-dom';
import SearchableSelect from '../../../utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toAbsoluteUrl } from '@/lib/helpers';

// Directly encodes the raw UUID for scanner app integration
const getAssetQRValue = (asset) => asset.uuid || String(asset.id || '');

const toTitleCase = (str) => {
    if (!str) return str;
    return str
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

const normalizeCompany = (item) => ({
    id: item.id,
    name: item.companyNameEnglish || item.name || item.organizationName || `Company #${item.id}`,
    code: item.companyCode || item.shortCode || '',
    status: item.isActive !== false ? 'active' : 'inactive',
});

const normalizeOutlet = (item) => ({
    id: item.id,
    name: item.companyNameEnglish || item.name || item.organizationName || `Outlet #${item.id}`,
    code: item.companyCode || item.shortCode || '',
    organizationId: item.parentId || item.organizationId,
    status: item.isActive !== false ? 'active' : 'inactive',
});

const normalizeLocation = (item) => ({
    id: item.id,
    name: item.locationName || item.name || `Location #${item.id}`,
    organizationId: item.organizationId,
    status: item.active !== false && item.isActive !== false ? 'active' : 'inactive',
});

export const getAssetLocationOrCustodian = (asset) => {
    const loc = asset?.assetUnitLocationName || asset?.locationName;
    if (loc && String(loc).trim() !== '' && String(loc).trim() !== '-') {
        return String(loc).trim();
    }
    const custodian = asset?.custodianName || asset?.assignedToName;
    if (custodian && String(custodian).trim() !== '' && String(custodian).trim() !== '-') {
        return String(custodian).trim();
    }
    return '';
};

const AssetLabel = ({ asset, qrSize = 60 }) => (
    <div className="asset-label relative w-48 h-24 bg-white box-border flex items-center justify-between px-[0.04in] py-[0.08in] m-0 overflow-hidden break-inside-avoid border border-gray-200 rounded-md">
        {/* Top-Right Logo */}
        <img
            className="absolute top-2 right-1.5 w-[18px] h-[18px] rounded-full shrink-0 object-cover z-10"
            src={toAbsoluteUrl('/media/app/jaiswal-group-logo.png')}
            alt="Jaiswal Group"
        />

        {/* QR Code */}
        <div className="w-[0.75in] h-[0.75in] shrink-0 flex items-center justify-center">
            <QRCode value={getAssetQRValue(asset)} size={qrSize} level="M" />
        </div>

        {/* Details Column */}
        <div className="flex-1 min-w-0 h-full flex flex-col justify-between pl-1.5 pr-0.5 text-left text-black">
            <div className="text-[6.5pt] font-black leading-[1.08] break-words text-black pr-5">Jaiswal Group</div>
            {asset.organizationname && asset.organizationname !== 'Jaiswal Group' ? (
                <div className="text-[6.5pt] font-bold leading-[1.08] uppercase break-words text-black">{asset.organizationname}</div>
            ) : asset.organizationname === 'Jaiswal Group' ? (
                <div className="text-[6.5pt] font-bold leading-[1.08] uppercase break-words text-black">Head Office</div>
            ) : null}
            {getAssetLocationOrCustodian(asset) ? (
                <div className="text-[6pt] font-bold leading-[1.08] break-words text-black">{getAssetLocationOrCustodian(asset)}</div>
            ) : null}
            {asset.categoryName ? (
                <div className="text-[6pt] font-bold leading-[1.08] break-words text-black">{asset.categoryName}</div>
            ) : null}
            <div className="text-[7pt] font-black leading-[1.08] break-words text-black">{toTitleCase(asset.name) || '-'}</div>
            <div className="text-[7pt] font-black font-mono leading-none break-words tracking-wide text-black">{asset.code || '-'}</div>
        </div>
    </div>
);

export const AssetMultiSelect = ({
    options = [],
    selected = [],
    onChange,
    disabled = false,
    loading = false,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    const filteredOptions = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return options;
        return options.filter((o) =>
            (o.name ?? "").toLowerCase().includes(term) ||
            (o.code ?? "").toLowerCase().includes(term)
        );
    }, [options, query]);

    const isSelected = (id) => selected.some((s) => String(s.id) === String(id));

    const toggleOption = (asset) => {
        if (isSelected(asset.id)) {
            onChange(selected.filter((s) => String(s.id) !== String(asset.id)));
        } else {
            onChange([...selected, asset]);
        }
    };

    const isAllSelected = options.length > 0 && selected.length === options.length;

    const toggleSelectAll = () => {
        onChange(isAllSelected ? [] : [...options]);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    className={`min-h-11 w-full border rounded-lg px-3 py-1.5 flex flex-wrap items-center gap-1.5 transition-all ${disabled
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                            : "bg-white cursor-pointer hover:border-gray-400 focus-within:border-[#084E92]"
                        } border-[#C3C6D1]`}
                >
                    {selected.length > 2 ? (
                        <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2 py-0.5 rounded">
                            {isAllSelected
                                ? `All Assets (${options.length})`
                                : `Selected Assets (${selected.length})`}
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
                        selected.map((item) => (
                            <span
                                key={item.id}
                                className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2 py-0.5 rounded"
                            >
                                <span className="truncate max-w-28">{item.name}</span>
                                {!disabled && (
                                    <X
                                        size={12}
                                        className="cursor-pointer hover:text-red-500 shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onChange(selected.filter((s) => String(s.id) !== String(item.id)));
                                        }}
                                    />
                                )}
                            </span>
                        ))
                    )}

                    <input
                        type="text"
                        value={query}
                        disabled={disabled}
                        placeholder={
                            selected.length === 0
                                ? loading
                                    ? "Loading assets..."
                                    : "Search and select assets..."
                                : ""
                        }
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!open) setOpen(true);
                        }}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (!open) setOpen(true);
                        }}
                        className="flex-1 min-w-24 bg-transparent text-sm text-gray-800 outline-none border-none p-0.5 placeholder:text-gray-400 cursor-text"
                    />

                    <div className="flex items-center gap-1 ml-auto shrink-0">
                        {selected.length > 0 && !disabled && (
                            <X
                                size={14}
                                className="text-gray-400 hover:text-red-500 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange([]);
                                    setQuery("");
                                }}
                            />
                        )}
                        <ChevronDown
                            size={16}
                            className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
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
                    <p className="px-3 py-3 text-gray-400 text-center">No assets found.</p>
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
                                Select All Assets ({options.length})
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
                                    onChange={() => toggleOption(opt)}
                                    className="accent-[#00376C] rounded"
                                />
                                <div className="flex flex-col min-w-0">
                                    <span className="truncate font-medium">{opt.name}</span>
                                    {opt.code && <span className="text-[10px] text-gray-400">{opt.code}</span>}
                                </div>
                            </label>
                        ))}
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
};

const CUSTODIAN_TYPE_OPTIONS = [
    { value: 'USER', label: 'User' },
    { value: 'DEPT', label: 'Department' },
];

const ExportAssetsQR = () => {
    const { canView } = usePagePermissions('Export Assets QR');

    const {
        loading: scopeLoading,
        isOutletUser,
        isCompanyUser,
        isGroupUser,
        units: scopedOutlets,
        effectiveOutletId,
        selfOrg,
    } = useOrgScope();

    // Cascading dropdown lists
    const [companies, setCompanies] = useState([]);
    const [outlets, setOutlets] = useState([]);
    const [locations, setLocations] = useState([]);

    // Filter values
    const [company, setCompany] = useState('');
    const [outlet, setOutlet] = useState('');
    const [location, setLocation] = useState('');
    const [custodianType, setCustodianType] = useState('');
    const [custodianValue, setCustodianValue] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [brandId, setBrandId] = useState('');

    // Additional filter dropdown lists & loading states
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [brands, setBrands] = useState([]);
    const [loadingBrands, setLoadingBrands] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [hrmsUsers, setHrmsUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingUsersMore, setLoadingUsersMore] = useState(false);
    const [hasMoreUsers, setHasMoreUsers] = useState(false);
    const userPageRef = useRef(0);
    const hasMoreUsersRef = useRef(false);
    const loadingUsersMoreRef = useRef(false);

    // Filter loading states
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [loadingOutlets, setLoadingOutlets] = useState(false);
    const [loadingLocations, setLoadingLocations] = useState(false);

    // Assets state
    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(false);

    const [pickedAssets, setPickedAssets] = useState([]);
    const [selectedAssets, setSelectedAssets] = useState([]);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Printing & QR states
    const [isPrinting, setIsPrinting] = useState(false);
    const [generatingQrs, setGeneratingQrs] = useState(false);
    const [generatedPrintItems, setGeneratedPrintItems] = useState([]);

    // All valid Organization IDs for current filter
    // If Outlet is selected -> only that Outlet
    // If only Company is selected -> Company ID AND all child Outlet IDs under that Company
    const targetOrgIds = useMemo(() => {
        if (outlet) return new Set([String(outlet)]);
        if (company) {
            const ids = new Set([String(company)]);
            (outlets || []).forEach((o) => ids.add(String(o.id)));
            return ids;
        }
        return null;
    }, [outlet, company, outlets]);

    // Initial Scope Setup
    useEffect(() => {
        if (scopeLoading) return;

        if (isGroupUser) {
            const fetchCompanies = async () => {
                setLoadingCompanies(true);
                try {
                    const res = await getOrganizationByType(OrgTypes.SUB_COMPANY);
                    const list = res?.data?.data || res?.data?.content || res?.data || [];
                    setCompanies(Array.isArray(list) ? list.map(normalizeCompany) : []);
                } catch (err) {
                    console.error('Failed to load companies:', err);
                    setCompanies([]);
                } finally {
                    setLoadingCompanies(false);
                }
            };
            fetchCompanies();
        } else if (isCompanyUser) {
            const userCompanyId = selfOrg?.id || getOrgIdFromToken();
            if (userCompanyId) {
                setCompany(String(userCompanyId));
                if (selfOrg) {
                    setCompanies([normalizeCompany(selfOrg)]);
                }
            }
            const mappedOutlets = (scopedOutlets || []).map(normalizeOutlet);
            setOutlets(mappedOutlets);
            if (mappedOutlets.length === 1) {
                setOutlet(String(mappedOutlets[0].id));
            }
        } else if (isOutletUser) {
            if (selfOrg?.parentId || selfOrg?.parentOrganizationId) {
                setCompany(String(selfOrg.parentId || selfOrg.parentOrganizationId));
            }
            const targetOutletId = effectiveOutletId || selfOrg?.id || getOrgIdFromToken();
            if (targetOutletId) {
                setOutlet(String(targetOutletId));
            }
            setOutlets((scopedOutlets || []).map(normalizeOutlet));
        }
    }, [scopeLoading, isGroupUser, isCompanyUser, isOutletUser, selfOrg, scopedOutlets, effectiveOutletId]);

    // Handle Company change (Group User)
    const handleCompanyChange = async (newCompanyId) => {
        setCompany(newCompanyId);
        setOutlet('');
        setLocation('');
        setCustodianValue('');
        setPickedAssets([]);
        setSelectedAssets([]);

        if (!newCompanyId) {
            setOutlets([]);
            return;
        }

        setLoadingOutlets(true);
        try {
            const res = await getChildrenByParentId(newCompanyId);
            const list = res?.data?.data || res?.data?.content || res?.data || [];
            const mapped = (Array.isArray(list) ? list : []).map(normalizeOutlet);
            setOutlets(mapped);
            if (mapped.length === 1) {
                setOutlet(String(mapped[0].id));
            }
        } catch (err) {
            console.error('Failed to load outlets for company:', err);
            setOutlets([]);
        } finally {
            setLoadingOutlets(false);
        }
    };

    // Fetch Sub-Outlets when Outlet changes
    useEffect(() => {
        if (!outlet) {
            setLocations([]);
            setLocation('');
            return;
        }

        const fetchLocationsData = async () => {
            setLoadingLocations(true);
            try {
                const res = await getAssetUnitLocationsByOrganization(outlet);
                const list = res?.data?.data || res?.data?.content || res?.data || [];
                setLocations((Array.isArray(list) ? list : []).map(normalizeLocation));
            } catch (err) {
                console.error('Failed to load locations:', err);
                setLocations([]);
            } finally {
                setLoadingLocations(false);
            }
        };

        fetchLocationsData();
    }, [outlet]);

    // Load Categories on mount
    useEffect(() => {
        let cancelled = false;
        const fetchCategories = async () => {
            setLoadingCategories(true);
            try {
                const res = await getAssetCategories();
                const raw = res?.data?.data ?? res?.data?.content ?? res?.data ?? [];
                const list = Array.isArray(raw) ? raw : [];
                if (!cancelled) {
                    setCategories(list.filter((c) => c.active !== false && c.isActive !== false));
                }
            } catch (err) {
                console.error('Failed to load asset categories:', err);
                if (!cancelled) setCategories([]);
            } finally {
                if (!cancelled) setLoadingCategories(false);
            }
        };

        fetchCategories();
        return () => {
            cancelled = true;
        };
    }, []);

    // Load Brands on mount
    useEffect(() => {
        let cancelled = false;
        const fetchBrands = async () => {
            setLoadingBrands(true);
            try {
                let res = await getActiveAssetBrands();
                let raw = res?.data?.data ?? res?.data?.content ?? res?.data ?? [];
                if (!Array.isArray(raw) || raw.length === 0) {
                    res = await getAssetBrands();
                    raw = res?.data?.data ?? res?.data?.content ?? res?.data ?? [];
                }
                const list = Array.isArray(raw) ? raw : [];
                if (!cancelled) {
                    setBrands(list.filter((b) => b.active !== false && b.isActive !== false));
                }
            } catch (err) {
                console.error('Failed to load asset brands:', err);
                if (!cancelled) setBrands([]);
            } finally {
                if (!cancelled) setLoadingBrands(false);
            }
        };

        fetchBrands();
        return () => {
            cancelled = true;
        };
    }, []);

    // Fetch Departments when Custodian Type is DEPT
    const fetchDepartments = useCallback(async () => {
        try {
            setLoadingDepartments(true);
            const res = await getAllDepartmentMaster();
            const raw = res?.data?.data ?? res?.data;
            const list = Array.isArray(raw?.['Department Details'])
                ? raw['Department Details']
                : Array.isArray(raw?.departmentDetails)
                ? raw.departmentDetails
                : Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.content)
                ? raw.content
                : Array.isArray(res?.data)
                ? res.data
                : [];
            setDepartments(list.filter((d) => d.active !== false && d.isActive !== false));
        } catch (err) {
            console.error('Failed to load departments:', err);
            setDepartments([]);
        } finally {
            setLoadingDepartments(false);
        }
    }, []);

    useEffect(() => {
        if (custodianType === 'DEPT' && departments.length === 0) {
            fetchDepartments();
        }
    }, [custodianType, departments.length, fetchDepartments]);

    // Active Company & Outlet for HRMS Users
    const activeCompanyId = useMemo(() => {
        return company || (isCompanyUser && (selfOrg?.id || getOrgIdFromToken()) ? String(selfOrg?.id || getOrgIdFromToken()) : '');
    }, [company, isCompanyUser, selfOrg]);

    const activeOutletId = useMemo(() => {
        return outlet || (isOutletUser && (effectiveOutletId || selfOrg?.id || getOrgIdFromToken()) ? String(effectiveOutletId || selfOrg?.id || getOrgIdFromToken()) : '');
    }, [outlet, isOutletUser, effectiveOutletId, selfOrg]);

    // Fetch HRMS Users when Custodian Type is USER
    const fetchUsersPage = useCallback(async (pageToFetch = 0, isInitial = false) => {
        if (loadingUsersMoreRef.current) return;
        try {
            if (isInitial) {
                setLoadingUsers(true);
            } else {
                loadingUsersMoreRef.current = true;
                setLoadingUsersMore(true);
            }

            const params = {
                page: pageToFetch,
                pageSize: 50,
                size: 50,
            };
            if (activeCompanyId) {
                params.companyId = Number(activeCompanyId);
            }
            if (activeOutletId) {
                params.outletId = Number(activeOutletId);
            }

            const res = await getHrmsUsersPaginated(params);
            const raw = res?.data?.data ?? res?.data;
            const content = Array.isArray(raw?.content)
                ? raw.content
                : Array.isArray(raw)
                ? raw
                : Array.isArray(res?.data?.content)
                ? res.data.content
                : [];
            const isLast = raw?.last ?? (content.length < 50);

            setHrmsUsers((prev) => {
                if (pageToFetch === 0) {
                    return content;
                }
                const existingIds = new Set(prev.map((u) => String(u.id)));
                const newItems = content.filter((u) => !existingIds.has(String(u.id)));
                return [...prev, ...newItems];
            });

            userPageRef.current = pageToFetch;
            hasMoreUsersRef.current = !isLast;
            setHasMoreUsers(!isLast);
        } catch (err) {
            console.error('Failed to load HRMS users:', err);
        } finally {
            if (isInitial) setLoadingUsers(false);
            loadingUsersMoreRef.current = false;
            setLoadingUsersMore(false);
        }
    }, [activeCompanyId, activeOutletId]);

    useEffect(() => {
        if (custodianType === 'USER') {
            userPageRef.current = 0;
            hasMoreUsersRef.current = true;
            fetchUsersPage(0, true);
        }
    }, [custodianType, activeCompanyId, activeOutletId, fetchUsersPage]);

    const handleLoadMoreUsers = useCallback(() => {
        if (hasMoreUsersRef.current && !loadingUsersMoreRef.current) {
            fetchUsersPage(userPageRef.current + 1, false);
        }
    }, [fetchUsersPage]);

    // ALWAYS Fetch Assigned Assets by Org and Location (Never getAllAssets)
    const fetchAssignedAssets = useCallback(async (orgId, locationId = 0, filters = {}) => {
        if (!orgId) {
            setAssets([]);
            return [];
        }

        try {
            setAssetsLoading(true);
            const assetRes = await getAssignedAssetsByOrgAndSubOutlet(
                Number(orgId),
                Number(locationId || 0),
                filters
            );
            const rawAssets = assetRes?.data?.data ?? assetRes?.data ?? assetRes ?? [];
            const rawList = Array.isArray(rawAssets) ? rawAssets : Object.values(rawAssets);

            const uniqueMap = new Map();

            rawList.forEach((item) => {
                const asset = item.assetDetails || item;
                const assignment = item.assignDetails || {};
                const assetId = asset.id;
                if (!assetId) return;

                const rowQty = Number(assignment?.quantity ?? asset.quantity ?? asset.totalQuantity ?? 1);
                const locId = assignment?.assetUnitLocationId ?? assignment?.locationId ?? asset?.assetUnitLocationId ?? asset?.locationId ?? null;
                const locName = assignment?.assetUnitLocationName ?? assignment?.locationName ?? asset?.assetUnitLocationName ?? asset?.locationName ?? '';
                const itemCustodianType = assignment?.custodianType ?? asset?.custodianType ?? item?.custodianType ?? null;
                const itemCustodianValue = assignment?.custodianValue ?? asset?.custodianValue ?? item?.custodianValue ?? null;
                const custodianName = assignment?.custodianName ?? assignment?.assignedToName ?? asset?.custodianName ?? asset?.assignedToName ?? item?.custodianName ?? item?.assignedToName ?? '';

                if (!uniqueMap.has(String(assetId))) {
                    uniqueMap.set(String(assetId), {
                        id: asset.id,
                        name: asset.itemName || asset.name,
                        code: asset.assetCode || asset.code,
                        organizationId: assignment?.companiesId ?? asset.assignOrganizationId ?? orgId,
                        organizationname: assignment?.companiesName ?? asset.organizationname ?? '',
                        assetUnitLocationId: locId,
                        assetUnitLocationName: locName,
                        custodianType: itemCustodianType,
                        custodianValue: itemCustodianValue,
                        custodianName,
                        categoryId: asset.categoryId ?? asset.category?.id ?? assignment?.categoryId ?? item?.categoryId,
                        categoryName: asset.categoryName ?? asset.category?.categoryName ?? asset.category?.name ?? asset.assetCategoryName ?? assignment?.categoryName ?? item?.categoryName ?? '',
                        brandId: asset.brandId ?? asset.brand?.id ?? assignment?.brandId ?? item?.brandId,
                        brandName: asset.brandName ?? asset.brand?.brandName ?? asset.brand?.name ?? assignment?.brandName ?? item?.brandName ?? '',
                        department: asset.department,
                        quantity: rowQty,
                    });
                } else {
                    const existing = uniqueMap.get(String(assetId));
                    existing.quantity += rowQty;
                }
            });

            return Array.from(uniqueMap.values());
        } catch (error) {
            console.error('Error fetching assigned assets:', error);
            return [];
        } finally {
            setAssetsLoading(false);
        }
    }, []);

    // Trigger getAssignedAssetsByOrgAndSubOutlet whenever Outlet, Company, Location, or optional filters change
    useEffect(() => {
        // Only use token org if the user is an outlet user; otherwise wait for outlet selection
        const activeOrgId = outlet || (isOutletUser ? getOrgIdFromToken() : (isCompanyUser ? company : ''));
        if (!activeOrgId) {
            setAssets([]);
            return;
        }

        // When a custodian type is selected, do not call API until custodianValue is also selected
        if (custodianType && !custodianValue) {
            setAssets([]);
            return;
        }

        let isCurrent = true;

        const filters = {};
        if (brandId) filters.brandId = brandId;
        if (categoryId) filters.categoryId = categoryId;
        if (custodianType && custodianValue) {
            filters.custodianType = custodianType;
            filters.custodianValue = custodianValue;
        }

        fetchAssignedAssets(Number(activeOrgId), location ? Number(location) : 0, filters).then((data) => {
            if (isCurrent) {
                setAssets(data);
            }
        });

        return () => {
            isCurrent = false; // Discards previous slow responses
        };
    }, [outlet, company, location, isOutletUser, isCompanyUser, brandId, categoryId, custodianType, custodianValue, fetchAssignedAssets]);

    const normalizeLocationValue = (value) => String(value ?? '').trim().toLowerCase();

    const getAssetLocationKey = (asset) => [
        normalizeLocationValue(asset.name),
        normalizeLocationValue(asset.organizationname),
        normalizeLocationValue(asset.assetUnitLocationName || asset.assetLocationName || asset.location),
        normalizeLocationValue(asset.custodianName),
    ].join('|');

    // Debounced assignment processor
    useEffect(() => {
        if (pickedAssets.length === 0) {
            setSelectedAssets([]);
            return;
        }

        const controller = new AbortController();

        const timer = setTimeout(async () => {
            try {
                setAssetsLoading(true);
                const isAllSelected = assets.length > 0 && pickedAssets.length === assets.length;
                const queryParams = isAllSelected ? undefined : pickedAssets.map((a) => a.id);

                const assignmentRes = await getAssignmentsByAssetId(queryParams, {
                    signal: controller.signal,
                });

                const rawAssignments = assignmentRes?.data?.data ?? assignmentRes?.data ?? assignmentRes ?? [];
                const assignments = Array.isArray(rawAssignments) ? rawAssignments : Object.values(rawAssignments);

                const assignmentsByAsset = new Map();
                assignments.forEach((assign) => {
                    const aId = String(assign.assetId);
                    if (!assignmentsByAsset.has(aId)) {
                        assignmentsByAsset.set(aId, []);
                    }
                    assignmentsByAsset.get(aId).push(assign);
                });

                const updatedSelected = [];

                for (const asset of pickedAssets) {
                    let assetAssignments = assignmentsByAsset.get(String(asset.id)) || [];

                    if (targetOrgIds && targetOrgIds.size > 0) {
                        assetAssignments = assetAssignments.filter((assign) => {
                            const assignOrgId = String(assign.companiesId ?? assign.organizationId);
                            if (!targetOrgIds.has(assignOrgId)) return false;
                            if (location) {
                                return String(assign.assetUnitLocationId ?? assign.locationId ?? '') === String(location);
                            }
                            return true;
                        });
                    }

                    if (custodianType) {
                        assetAssignments = assetAssignments.filter((assign) => {
                            const cType = assign.custodianType ?? asset.custodianType;
                            return String(cType || '').toUpperCase() === String(custodianType).toUpperCase();
                        });
                    }

                    if (custodianValue) {
                        assetAssignments = assetAssignments.filter((assign) => {
                            const cVal = assign.custodianValue ?? asset.custodianValue;
                            return String(cVal || '') === String(custodianValue);
                        });
                    }

                    if (assetAssignments.length === 0) {
                        updatedSelected.push({
                            ...asset,
                            isAssigned: false,
                            organizationId: asset.organizationId || outlet || company || null,
                            organizationname: asset.organizationname || '',
                            assignmentId: null,
                            custodianType: asset.custodianType ?? null,
                            custodianValue: asset.custodianValue ?? null,
                            custodianName: asset.custodianName ?? asset.assignedToName ?? '',
                            availableQuantity: asset.availableQuantity ?? asset.totalQuantity ?? 1,
                            quantity: Math.max(1, Number(asset.quantity ?? 1)),
                            rowKey: `${asset.id}-unassigned-${Date.now()}-${Math.random()}`,
                        });
                    } else {
                        const assignmentRows = assetAssignments.map((assignment, index) => {
                            const custodianType = assignment.custodianType ?? asset.custodianType ?? null;
                            const custodianValue = assignment.custodianValue ?? asset.custodianValue ?? null;
                            const custodianName = assignment.custodianName ?? assignment.assignedToName ?? asset.custodianName ?? asset.assignedToName ?? '';

                            return {
                                ...asset,
                                isAssigned: true,
                                assignmentId: assignment.id ?? assignment.assignmentId ?? null,
                                organizationId: assignment.companiesId ?? assignment.organizationId ?? asset.organizationId ?? null,
                                organizationname: assignment.companiesName ?? assignment.organizationName ?? asset.organizationname ?? '',
                                assetUnitLocationId: assignment.assetUnitLocationId ?? assignment.locationId ?? asset.assetUnitLocationId ?? asset.locationId ?? null,
                                assetUnitLocationName: assignment.assetUnitLocationName ?? assignment.locationName ?? asset.assetUnitLocationName ?? asset.locationName ?? '',
                                custodianType,
                                custodianValue,
                                custodianName,
                                quantity: assignment.quantity ?? assignment.assignedQuantity ?? 1,
                                remarks: assignment.remarks ?? "",
                                availableQuantity: assignment.availableQuantity ?? 0,
                                assignmentIndex: index,
                                rowKey: `${asset.id}-${assignment.id ?? index}-${Date.now()}-${Math.random()}`,
                            };
                        });

                        const groupedAssignments = new Map();
                        assignmentRows.forEach((row) => {
                            const locationKey = getAssetLocationKey(row);
                            if (!groupedAssignments.has(locationKey)) {
                                groupedAssignments.set(locationKey, { ...row });
                            } else {
                                const existing = groupedAssignments.get(locationKey);
                                existing.quantity = Number(existing.quantity ?? 0) + Number(row.quantity ?? 0);
                            }
                        });

                        updatedSelected.push(...Array.from(groupedAssignments.values()));
                    }
                }

                setSelectedAssets(updatedSelected);
            } catch (error) {
                if (error?.name !== 'CanceledError' && error?.name !== 'AbortError') {
                    console.error("Error processing asset assignments:", error);
                }
            } finally {
                setAssetsLoading(false);
            }
        }, 350);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [pickedAssets, targetOrgIds, location, outlet, company, assets.length, custodianType, custodianValue]);

    // Flat list of units to be printed based on selected quantities
    const printableAssets = useMemo(() => {
        let list = selectedAssets;

        if (targetOrgIds && targetOrgIds.size > 0) {
            list = list.filter((asset) => {
                const orgId = String(asset.organizationId);
                return !asset.organizationId || targetOrgIds.has(orgId);
            });
            if (location) {
                list = list.filter((asset) => String(asset.assetUnitLocationId) === String(location));
            }
        }

        if (custodianType) {
            list = list.filter((asset) => String(asset.custodianType ?? '').toUpperCase() === String(custodianType).toUpperCase());
        }
        if (custodianValue) {
            list = list.filter((asset) => String(asset.custodianValue ?? '') === String(custodianValue));
        }
        if (categoryId) {
            list = list.filter((asset) => String(asset.categoryId ?? '') === String(categoryId));
        }
        if (brandId) {
            list = list.filter((asset) => String(asset.brandId ?? '') === String(brandId));
        }

        if (!list.length) return [];

        return list.flatMap((asset) => {
            const quantity = Math.max(1, Number(asset.quantity ?? 1));
            return Array.from({ length: quantity }, (_, index) => ({
                ...asset,
                printIndex: index,
            }));
        });
    }, [selectedAssets, targetOrgIds, location, custodianType, custodianValue, categoryId, brandId]);

    const handlePrintLabels = async () => {
        if (printableAssets.length === 0) return;

        setGeneratingQrs(true);
        try {
            // Group quantities per assetId
            const itemsMap = new Map();
            printableAssets.forEach((item) => {
                const qty = itemsMap.get(item.id) || 0;
                itemsMap.set(item.id, qty + 1);
            });

            const requestItems = Array.from(itemsMap.entries()).map(([assetId, qty]) => ({
                assetId: Number(assetId),
                qty: Number(qty),
            }));

            const payload = {
                createdBy: Number(getUserIdFromToken?.() || 0),
                organizationId: Number(outlet || company || getOrgIdFromToken() || 0),
                assetSubLocationId: location ? Number(location) : null,
                items: requestItems,
            };

            const res = await createAssetQrBulk(payload);
            const records = res?.data?.data || [];

            // Queue returned UUIDs per assetId
            const uuidQueues = new Map();
            records.forEach((row) => {
                const key = String(row.assetId);
                if (!uuidQueues.has(key)) {
                    uuidQueues.set(key, []);
                }
                uuidQueues.get(key).push(row.uuid);
            });

            // Assign unique UUID to each printed item
            const assetsWithUuids = printableAssets.map((asset) => {
                const queue = uuidQueues.get(String(asset.id));
                const assignedUuid = queue && queue.length > 0 ? queue.shift() : null;

                return {
                    ...asset,
                    uuid: assignedUuid,
                };
            });

            setGeneratedPrintItems(assetsWithUuids);
            setIsPrinting(true);

            setTimeout(() => {
                window.print();
                setIsPrinting(false);
            }, 50);
        } catch (err) {
            console.error('Error generating asset QRs:', err);
        } finally {
            setGeneratingQrs(false);
        }
    };

    const openDeleteConfirm = (row) => {
        setDeleteTarget({
            rowKey: row.rowKey,
            assetId: row.id,
            name: `${row.name}`,
        });
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        if (deleteLoading) return;
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        setSelectedAssets((prev) => {
            const remaining = prev.filter((a) => a.rowKey !== deleteTarget.rowKey);
            const hasMoreOfSameAsset = remaining.some((a) => String(a.id) === String(deleteTarget.assetId));
            if (!hasMoreOfSameAsset) {
                setPickedAssets((current) => current.filter((p) => String(p.id) !== String(deleteTarget.assetId)));
            }
            return remaining;
        });
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    };

    // Dropdown Select Options
    const companyOptions = useMemo(
        () =>
            companies
                .filter((c) => c.status === 'active')
                .map((c) => ({
                    value: String(c.id),
                    label: c.name,
                })),
        [companies]
    );

    const outletOptions = useMemo(
        () =>
            outlets
                .filter((o) => o.status === 'active')
                .map((o) => ({
                    value: String(o.id),
                    label: o.name,
                })),
        [outlets]
    );

    const locationOptions = useMemo(
        () =>
            locations
                .filter((l) => l.status === 'active')
                .map((l) => ({
                    value: String(l.id),
                    label: l.name,
                })),
        [locations]
    );

    const categoryOptions = useMemo(
        () =>
            categories.map((c) => ({
                value: String(c.id),
                label: c.name || c.categoryName || `Category #${c.id}`,
            })),
        [categories]
    );

    const brandOptions = useMemo(
        () =>
            brands.map((b) => ({
                value: String(b.id),
                label: b.name || b.brandName || `Brand #${b.id}`,
            })),
        [brands]
    );

    const departmentOptions = useMemo(
        () =>
            departments.map((d) => {
                const name = d.departmentName || d.name || d.deptName || `Department #${d.id}`;
                const code = d.departmentCode || d.shortCode || '';
                return {
                    value: String(d.id),
                    label: code ? `${name} (${code})` : name,
                };
            }),
        [departments]
    );

    const userOptions = useMemo(
        () =>
            (hrmsUsers || []).map((u) => {
                const name =
                    u.empname ||
                    u.empName ||
                    u.fullName ||
                    [u.firstName, u.lastName].filter(Boolean).join(' ') ||
                    u.name ||
                    u.userName ||
                    u.email ||
                    `User #${u.id}`;
                const code = u.empcode || u.empCode || u.employeeCode || u.code || '';
                const designation = u.designationName || u.designation || u.departmentName || '';
                const nameWithCode = code ? `${name} - ${code}` : name;
                return {
                    value: String(u.id),
                    label: designation ? `${nameWithCode} (${designation})` : nameWithCode,
                };
            }),
        [hrmsUsers]
    );

    if (!canView) {
        return <AccessDenied pageTitle="Export Assets QR" />;
    }

    return (
        <>
            <style>{`
    @media print {
        @page {
            /* Exact 4in width (2 labels x 2in) by 1in height - 0 gap, 0 margin */
            size: 4in 1in;
            margin: 0;
        }
        html, body {
            width: 4in !important;
            height: 1in !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        #root {
            display: none !important;
        }
        .qr-print-area {
            display: flex !important;
            flex-wrap: wrap !important;
            width: 4in !important;
            height: 1in !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important; /* Zero gap between labels */
            box-sizing: border-box !important;
        }
        .asset-label {
            display: flex !important;
            align-items: center !important;
            width: 2in !important;
            height: 1in !important;
            min-width: 2in !important;
            min-height: 1in !important;
            max-width: 2in !important;
            max-height: 1in !important;
            margin: 0 !important;
            padding: 0.08in 0.04in !important;
            box-sizing: border-box !important;
            border: 1px solid #cbd5e1 !important; /* Sharp pure black border for clear separation */
            border-radius: 6px !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            overflow: hidden !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }
        .asset-label * {
            color: #000000 !important;
        }

        /* Prevent double border in the middle where the two labels meet */
        .asset-label:nth-child(2n) {
            border-left: none !important;
            page-break-after: always !important;
            break-after: page !important;
        }
        .asset-label:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
        }
        .asset-label svg {
            width: 0.75in !important;
            height: 0.75in !important;
            flex-shrink: 0 !important;
        }
    }
`}</style>

            <div className="print:hidden">
                <Container>
                    <div className="pt-2 pb-6 mx-auto space-y-4">
                        <PageHeader title="Export Assets QR" />

                        <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-5 mt-6 items-stretch lg:h-[calc(100vh-13rem)]">
                            {/* Controls Card */}
                            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col h-full min-h-0">
                                <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0">
                                    {/* 1. Company Filter */}
                                    {isGroupUser && (
                                        <div>
                                            <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                                Company
                                            </label>
                                            <SearchableSelect
                                                name="company"
                                                value={company}
                                                disabled={loadingCompanies || generatingQrs}
                                                onChange={(e) => handleCompanyChange(e.target.value)}
                                                options={companyOptions}
                                                placeholder={loadingCompanies ? "Loading companies..." : "Select Company"}
                                                isClearable={true}
                                            />
                                        </div>
                                    )}

                                    {/* 2. Outlet Filter */}
                                    {!isOutletUser && (
                                        <div>
                                            <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                                Unit
                                            </label>
                                            <SearchableSelect
                                                name="outlet"
                                                value={outlet}
                                                disabled={(isGroupUser && !company) || loadingOutlets || generatingQrs}
                                                onChange={(e) => {
                                                    setOutlet(e.target.value);
                                                    setLocation('');
                                                    setCustodianValue('');
                                                    setPickedAssets([]);
                                                    setSelectedAssets([]);
                                                }}
                                                options={outletOptions}
                                                placeholder={
                                                    loadingOutlets
                                                        ? "Loading outlets..."
                                                        : isGroupUser && !company
                                                            ? "Select Company first"
                                                            : "Select Unit"
                                                }
                                                isClearable={true}
                                            />
                                        </div>
                                    )}

                                    {/* 3. Sub-Outlet Location Filter */}
                                    <div>
                                        <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                            Location
                                        </label>
                                        <SearchableSelect
                                            name="location"
                                            value={location}
                                            disabled={!outlet || loadingLocations || generatingQrs}
                                            onChange={(e) => {
                                                setLocation(e.target.value);
                                                setPickedAssets([]);
                                                setSelectedAssets([]);
                                            }}
                                            options={locationOptions}
                                            placeholder={
                                                !outlet
                                                    ? "Select Unit first"
                                                    : loadingLocations
                                                        ? "Loading locations..."
                                                        : "Select Location"
                                            }
                                            isClearable={true}
                                        />
                                    </div>

                                    {/* 4. Custodian Type Filter */}
                                    <div>
                                        <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                            Custodian Type
                                        </label>
                                        <SearchableSelect
                                            name="custodianType"
                                            value={custodianType}
                                            disabled={generatingQrs}
                                            onChange={(e) => {
                                                setCustodianType(e.target.value);
                                                setCustodianValue('');
                                                setPickedAssets([]);
                                                setSelectedAssets([]);
                                            }}
                                            options={CUSTODIAN_TYPE_OPTIONS}
                                            placeholder="Select Custodian Type"
                                            isClearable={true}
                                        />
                                    </div>

                                    {/* 5. Custodian Value Filter */}
                                    <div>
                                        <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                            {custodianType === 'DEPT' ? 'Department' : custodianType === 'USER' ? 'User' : 'Custodian'}
                                        </label>
                                        {custodianType === 'DEPT' ? (
                                            <SearchableSelect
                                                name="custodianValue"
                                                value={custodianValue}
                                                disabled={loadingDepartments || generatingQrs}
                                                onChange={(e) => {
                                                    setCustodianValue(e.target.value);
                                                    setPickedAssets([]);
                                                    setSelectedAssets([]);
                                                }}
                                                options={departmentOptions}
                                                placeholder={loadingDepartments ? "Loading departments..." : "Select Department"}
                                                isClearable={true}
                                            />
                                        ) : custodianType === 'USER' ? (
                                            <SearchableSelect
                                                name="custodianValue"
                                                value={custodianValue}
                                                disabled={(loadingUsers && userOptions.length === 0) || generatingQrs}
                                                onChange={(e) => {
                                                    setCustodianValue(e.target.value);
                                                    setPickedAssets([]);
                                                    setSelectedAssets([]);
                                                }}
                                                options={userOptions}
                                                placeholder={
                                                    loadingUsers && userOptions.length === 0
                                                        ? "Loading users..."
                                                        : "Select User"
                                                }
                                                hasMore={hasMoreUsers}
                                                loadingMore={loadingUsersMore}
                                                onLoadMore={handleLoadMoreUsers}
                                                isClearable={true}
                                            />
                                        ) : (
                                            <SearchableSelect
                                                name="custodianValue"
                                                value=""
                                                disabled={true}
                                                onChange={() => {}}
                                                options={[]}
                                                placeholder="Select Custodian Type first"
                                                isClearable={false}
                                            />
                                        )}
                                    </div>

                                    {/* 6. Assets Category Filter */}
                                    <div>
                                        <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                            Asset Category
                                        </label>
                                        <SearchableSelect
                                            name="category"
                                            value={categoryId}
                                            disabled={loadingCategories || generatingQrs}
                                            onChange={(e) => {
                                                setCategoryId(e.target.value);
                                                setPickedAssets([]);
                                                setSelectedAssets([]);
                                            }}
                                            options={categoryOptions}
                                            placeholder={loadingCategories ? "Loading categories..." : "Select Category"}
                                            isClearable={true}
                                        />
                                    </div>

                                    {/* 7. Assets Brand Filter */}
                                    <div>
                                        <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                            Asset Brand
                                        </label>
                                        <SearchableSelect
                                            name="brand"
                                            value={brandId}
                                            disabled={loadingBrands || generatingQrs}
                                            onChange={(e) => {
                                                setBrandId(e.target.value);
                                                setPickedAssets([]);
                                                setSelectedAssets([]);
                                            }}
                                            options={brandOptions}
                                            placeholder={loadingBrands ? "Loading brands..." : "Select Brand"}
                                            isClearable={true}
                                        />
                                    </div>

                                    {/* 8. Assets Multi-Select */}
                                    <div>
                                        <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                            Select Assets
                                        </label>
                                        <AssetMultiSelect
                                            options={assets}
                                            selected={pickedAssets}
                                            onChange={setPickedAssets}
                                            loading={assetsLoading}
                                            disabled={assetsLoading || generatingQrs}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-[#C3C6D1] mt-auto pt-4 flex gap-2">
                                    <button
                                        type="button"
                                        disabled={printableAssets.length === 0 || generatingQrs}
                                        onClick={handlePrintLabels}
                                        className="w-max h-11 cursor-pointer bg-[#084E92] text-white rounded-lg px-4 flex items-center justify-center gap-2 text-sm font-medium hover:bg-[#073e77] transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <QrCode size={16} />
                                        {generatingQrs ? 'Generating QRs...' : `Print Labels (${printableAssets.length})`}
                                    </button>
                                </div>
                            </div>

                            {/* Selected Assets List */}
                            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col h-full min-h-0">
                                <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F099]">
                                    <div>
                                        <h2 className="text-base font-semibold text-[#1B1B1F]">Selected Assets List</h2>
                                        <p className="text-sm text-gray-400 mt-0.5">
                                            {printableAssets.length} label{printableAssets.length === 1 ? '' : 's'} ready for QR export.
                                        </p>
                                    </div>
                                    {printableAssets.length > 0 && (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-[#15803D] bg-emerald-50 px-3 py-1.5 border border-[#BBF7D0] rounded-full my-auto">
                                            <CheckCircle2 size={14} />
                                            Ready to Print
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 space-y-3 flex-1 min-h-0 overflow-y-auto">
                                    {printableAssets.length === 0 ? (
                                        <div className="border border-dashed border-[#C3C6D1] rounded-lg py-12 text-center text-sm text-gray-400">
                                            No assets selected yet. Use the dropdown on the left to pick assets.
                                        </div>
                                    ) : (
                                        printableAssets.map((a, index) => (
                                            <div key={`${a.rowKey}-${a.printIndex}-${index}`} className="flex gap-2 items-center justify-between">
                                                <div className="flex items-center gap-3 border border-[#E5E7EB] rounded-lg p-3 w-full">
                                                    <div className="w-18 h-18 shrink-0 rounded-lg border border-[#E2E8F0] flex items-center justify-center overflow-hidden">
                                                        <div className="w-14 h-14 shrink-0 rounded-lg p-1 border border-[#E2E8F0] flex items-center justify-center overflow-hidden">
                                                            <QRCode
                                                                value={getAssetQRValue(a)}
                                                                size={44}
                                                                level="M"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="min-w-0 flex-1 my-auto">
                                                        <p className="text-sm text-gray-600 capitalize mb-1">Jaiswal Group</p>
                                                        <p className="text-sm text-gray-600 capitalize mb-1">
                                                            {a.organizationname && a.organizationname !== 'Jaiswal Group' ? (
                                                                <span className='uppercase'>{a.organizationname}</span>
                                                            ) : a.organizationname === 'Jaiswal Group' ? 'HEAD OFFICE' : ''}
                                                        </p>
                                                        {getAssetLocationOrCustodian(a) ? (
                                                            <p className="text-sm text-gray-600 capitalize mb-1">{getAssetLocationOrCustodian(a)}</p>
                                                        ) : null}
                                                        <p className="text-sm text-gray-600 capitalize mb-1">{a.categoryName}</p>
                                                        <p className="text-sm font-medium text-[#1B1B1F] capitalize truncate mb-1">{toTitleCase(a.name) || '-'}</p>
                                                        <span className="bg-[#F1F5F9] text-[#64748B] font-bold tracking-wide px-1.5 py-0.5 rounded text-xs">
                                                            {a.code}
                                                        </span>
                                                    </div>
                                                    <Trash2
                                                        size={18}
                                                        className="text-red-300 cursor-pointer hover:text-red-700 shrink-0"
                                                        onClick={() => openDeleteConfirm(a)}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DeleteConfirmModal
                        isOpen={showDeleteConfirm}
                        onClose={closeDeleteConfirm}
                        onConfirm={confirmDelete}
                        itemLabel={deleteTarget?.name}
                        saving={deleteLoading}
                    />
                </Container>
            </div>

            {isPrinting && createPortal(
                <div className="qr-print-area hidden print:flex print:flex-wrap">
                    {generatedPrintItems.map((a, index) => (
                        <AssetLabel
                            key={`print-${a.rowKey}-${a.printIndex}-${index}`}
                            asset={a}
                            qrSize={60}
                        />
                    ))}
                </div>,
                document.body
            )}
        </>
    )
}

export default ExportAssetsQR