import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Container } from "@/components/common/container";
import { PageHeader } from '@/components/common/PageHeader';
import { CheckCircle2, QrCode, Trash2, X, ChevronDown } from 'lucide-react';
import {
    getAllAssets,
    getAssignedAssetsByOrgAndSubOutlet,
    getAssignmentsByAssetId,
    getOrganizationByType,
    getChildrenByParentId,
    getAllSubOutletsByOrganization,
} from '../../../services/apiServices';
import { OrgTypes } from '@/constants/orgTypes';
import { getOrgIdFromToken } from '@/utils/auth';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import QRCode from 'react-qr-code';
import { createPortal } from 'react-dom';
import SearchableSelect from '../../../utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ASSET_QR_BASE_URL = 'https://app.justerp.in';

const getAssetQRUrl = (asset) =>
    `${ASSET_QR_BASE_URL}/assets/edit-asset/${encodeURIComponent(asset.id)}`;

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

const normalizeSubOutlet = (item) => ({
    id: item.id,
    name: item.subOutletName || item.name || `Sub-Outlet #${item.id}`,
    code: item.companyCode || '',
    organizationId: item.organizationId,
    status: item.isActive !== false ? 'active' : 'inactive',
});

const AssetLabel = ({ asset, qrSize = 68 }) => (
    <div className="asset-label w-48 h-24 bg-white box-border flex items-center p-[0.04in] m-0 overflow-hidden break-inside-avoid">
        <div className="w-[0.86in] h-[0.86in] shrink-0 flex items-center justify-center p-0.5">
            <QRCode value={getAssetQRUrl(asset)} size={qrSize} level='M' />
        </div>

        <div className="flex-1 min-w-0 h-full pl-[0.06in] overflow-hidden flex flex-col justify-center gap-[0.05in]">
            <div className="text-[5pt] font-bold leading-[1.1]">Jaiswal Group</div>
            {asset.organizationname && asset.organizationname !== 'Jaiswal Group'
                ? <div className="text-[5pt] font-normal leading-[1.1] uppercase">{asset.organizationname}</div>
                : asset.organizationname === 'Jaiswal Group'
                    ? <div className="text-[5pt] font-normal leading-[1.1] uppercase">Head Office</div>
                    : ''
            }
            <div className="text-[5pt] font-normal leading-[1.1]">{asset.remarks || ""}</div>
            <div className="text-[5pt] font-semibold leading-[1.1]">{asset.categoryName || '-'}</div>
            <div className="text-[5pt] font-semibold leading-[1.1]">{toTitleCase(asset.name) || '-'}</div>
            <div className="text-[5pt] font-normal leading-[1.1]">{asset.code || '-'}</div>
        </div>
    </div>
);

const AssetMultiSelect = ({
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
        if (isAllSelected) {
            onChange([]);
        } else {
            onChange([...options]);
        }
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
    const [subOutlets, setSubOutlets] = useState([]);

    // Filter values
    const [company, setCompany] = useState('');
    const [outlet, setOutlet] = useState('');
    const [subOutlet, setSubOutlet] = useState('');

    // Filter loading states
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [loadingOutlets, setLoadingOutlets] = useState(false);
    const [loadingSubOutlets, setLoadingSubOutlets] = useState(false);

    // Assets state
    const [assets, setAssets] = useState([]);
    const [allAssets, setAllAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(false);

    const [pickedAssets, setPickedAssets] = useState([]);
    const [selectedAssets, setSelectedAssets] = useState([]);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

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
        setSubOutlet('');
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
            setSubOutlets([]);
            setSubOutlet('');
            return;
        }

        const fetchSubOutletsData = async () => {
            setLoadingSubOutlets(true);
            try {
                const res = await getAllSubOutletsByOrganization(outlet);
                const list = res?.data?.data || res?.data?.content || res?.data || [];
                setSubOutlets((Array.isArray(list) ? list : []).map(normalizeSubOutlet));
            } catch (err) {
                console.error('Failed to load sub-outlets:', err);
                setSubOutlets([]);
            } finally {
                setLoadingSubOutlets(false);
            }
        };

        fetchSubOutletsData();
    }, [outlet]);

    // Fetch Assigned Assets
    const fetchAssignedAssets = useCallback(async (orgId, subOutletId = 0) => {
        try {
            setAssetsLoading(true);
            const assetRes = await getAssignedAssetsByOrgAndSubOutlet(orgId, Number(subOutletId || 0));
            const rawAssets = assetRes?.data?.data ?? assetRes?.data ?? assetRes ?? [];

            const normalizedAssets = rawAssets.map((item) => {
                const asset = item.assetDetails || {};
                const assignment = item.assignDetails || {};

                return {
                    id: asset.id,
                    name: asset.itemName,
                    code: asset.assetCode,
                    organizationId: assignment?.companiesId ?? asset.assignOrganizationId ?? orgId,
                    organizationname: assignment?.companiesName ?? asset.organizationname ?? '',
                    subOutletId: assignment?.subOutletId ?? asset.subOutletId ?? null,
                    suboutletname: assignment?.suboutletname ?? asset.suboutletname ?? '',
                    categoryId: asset.categoryId ?? asset.category?.id,
                    categoryName: asset.categoryName ?? asset.category?.categoryName ?? asset.category?.name ?? asset.assetCategoryName ?? '',
                    department: asset.department,
                    location: asset.assetLocationName,
                    quantity: assignment?.quantity ?? asset.totalQuantity ?? 0,
                };
            });

            setAssets(normalizedAssets);
            return normalizedAssets;
        } catch (error) {
            console.error('Error fetching assigned assets:', error);
            setAssets([]);
            return [];
        } finally {
            setAssetsLoading(false);
        }
    }, []);

    // Global assets when neither Company nor Outlet is selected
    useEffect(() => {
        if (outlet || company) return;

        const fetchAssets = async () => {
            try {
                setAssetsLoading(true);
                const assetRes = await getAllAssets();
                const rawAssets = assetRes?.data?.data ?? assetRes?.data ?? assetRes ?? [];

                const normalizedAssets = (Array.isArray(rawAssets) ? rawAssets : Object.values(rawAssets)).map((a) => ({
                    id: a.id,
                    name: a.itemName,
                    code: a.assetCode ?? a.code,
                    organizationname: a.organizationname ?? '',
                    organizationId: a.assignOrganizationId ?? null,
                    suboutletname: a.suboutletname ?? '',
                    subOutletId: a.subOutletId ?? null,
                    unitName: a.organizationname ?? '',
                    categoryId: a.categoryId ?? a.category?.id,
                    categoryName: a.categoryName ?? a.category?.name ?? '',
                    department: a.department,
                    location: a.location,
                }));

                setAllAssets(normalizedAssets);
                setAssets(normalizedAssets);
            } catch (err) {
                console.error(err);
            } finally {
                setAssetsLoading(false);
            }
        };

        fetchAssets();
    }, [outlet, company]);

    // Fetch assigned assets whenever Outlet or Company changes
    useEffect(() => {
        if (outlet) {
            fetchAssignedAssets(Number(outlet), subOutlet ? Number(subOutlet) : 0);
        } else if (company) {
            fetchAssignedAssets(Number(company), 0);
        } else if (isGroupUser) {
            setAssets(allAssets);
        }
    }, [outlet, company, subOutlet, fetchAssignedAssets, isGroupUser, allAssets]);

    // Print listeners
    useEffect(() => {
        const onBeforePrint = () => setIsPrinting(true);
        const onAfterPrint = () => setIsPrinting(false);
        window.addEventListener('beforeprint', onBeforePrint);
        window.addEventListener('afterprint', onAfterPrint);
        return () => {
            window.removeEventListener('beforeprint', onBeforePrint);
            window.removeEventListener('afterprint', onAfterPrint);
        };
    }, []);

    const handlePrintLabels = () => {
        setIsPrinting(true);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.print();
            });
        });
    };

    const normalizeLocationValue = (value) => String(value ?? '').trim().toLowerCase();

    const getAssetLocationKey = (asset) => [
        normalizeLocationValue(asset.name),
        normalizeLocationValue(asset.organizationname),
        normalizeLocationValue(asset.suboutletname),
    ].join('|');

    // 1. In AssetMultiSelect, just update pickedAssets directly (no API call inside onChange)
    const handleAssetsMultiSelectChange = (newPickedList) => {
        setPickedAssets(newPickedList);
    };

    // 2. Fetch assignments automatically with a debounce + AbortController
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

                // When All is selected -> no params; otherwise pass array of ids
                const queryParams = isAllSelected ? undefined : pickedAssets.map((a) => a.id);

                const assignmentRes = await getAssignmentsByAssetId(queryParams, {
                    signal: controller.signal,
                });

                const rawAssignments = assignmentRes?.data?.data ?? assignmentRes?.data ?? assignmentRes ?? [];
                const assignments = Array.isArray(rawAssignments) ? rawAssignments : Object.values(rawAssignments);

                // Group assignments by assetId
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
                            const matchesOrg = targetOrgIds.has(assignOrgId);
                            if (!matchesOrg) return false;
                            if (subOutlet) {
                                return String(assign.subOutletId) === String(subOutlet);
                            }
                            return true;
                        });
                    }

                    if (assetAssignments.length === 0) {
                        const fallbackOrgId = asset.organizationId || (outlet || company) || null;
                        const fallbackOrgName =
                            asset.organizationname ||
                            (company ? companies.find((c) => String(c.id) === String(company))?.name : '') ||
                            '';

                        updatedSelected.push({
                            ...asset,
                            isAssigned: false,
                            organizationId: fallbackOrgId,
                            organizationname: fallbackOrgName,
                            assignmentId: null,
                            availableQuantity: asset.availableQuantity ?? asset.totalQuantity ?? 1,
                            quantity: Math.max(1, Number(asset.quantity ?? 1)),
                            rowKey: `${asset.id}-unassigned-${Date.now()}-${Math.random()}`,
                        });
                    } else {
                        const assignmentRows = assetAssignments.map((assignment, index) => ({
                            ...asset,
                            isAssigned: true,
                            assignmentId: assignment.id ?? assignment.assignmentId ?? null,
                            organizationId: assignment.companiesId ?? assignment.organizationId ?? asset.organizationId ?? null,
                            organizationname: assignment.companiesName ?? assignment.organizationName ?? asset.organizationname ?? '',
                            subOutletId: assignment.subOutletId ?? asset.subOutletId ?? null,
                            suboutletname: assignment.suboutletname ?? assignment.subOutletName ?? '',
                            quantity: assignment.quantity ?? assignment.assignedQuantity ?? 1,
                            remarks: assignment.remarks ?? "",
                            availableQuantity: assignment.availableQuantity ?? 0,
                            assignmentIndex: index,
                            rowKey: `${asset.id}-${assignment.id ?? index}-${Date.now()}-${Math.random()}`,
                        }));

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
    }, [pickedAssets, targetOrgIds, subOutlet, outlet, company, assets.length, companies]);
    // Printable assets
    const printableAssets = useMemo(() => {
        let list = selectedAssets;

        if (targetOrgIds && targetOrgIds.size > 0) {
            list = list.filter((asset) => {
                const orgId = String(asset.organizationId);
                return !asset.organizationId || targetOrgIds.has(orgId);
            });
            if (subOutlet) {
                list = list.filter((asset) => String(asset.subOutletId) === String(subOutlet));
            }
        }

        if (!list.length) return [];

        return list.flatMap((asset) => {
            const quantity = Math.max(1, Number(asset.quantity ?? 1));
            return Array.from({ length: quantity }, (_, index) => ({
                ...asset,
                printIndex: index,
            }));
        });
    }, [selectedAssets, targetOrgIds, subOutlet]);

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
                    label:  c.name,
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

    const subOutletOptions = useMemo(
        () =>
            subOutlets
                .filter((s) => s.status === 'active')
                .map((s) => ({
                    value: String(s.id),
                    label: s.name,
                })),
        [subOutlets]
    );

    if (!canView) {
        return <AccessDenied pageTitle="Export Assets QR" />;
    }

    return (
        <>
            <style>{`
                @media print {
                    @page {
                        size: 2in 1in;
                        margin: 0;
                    }
                    html, body {
                        width: 2in !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    #root {
                        display: none !important;
                    }
                    .qr-print-area {
                        display: block !important;
                        width: 2in !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .asset-label {
                        display: flex !important;
                        width: 2in !important;
                        height: 1in !important;
                        min-width: 2in !important;
                        min-height: 1in !important;
                        max-width: 2in !important;
                        max-height: 1in !important;
                        margin: 0 !important;
                        padding: 0.04in !important;
                        box-sizing: border-box !important;
                        overflow: hidden !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .asset-label:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                    .asset-label svg {
                        width: 0.86in !important;
                        height: 0.86in !important;
                        flex-shrink: 0 !important;
                    }
                }
            `}</style>

            <div className="print:hidden">
                <Container>
                    <div className='pt-2 pb-6 mx-auto space-y-4'>
                        <PageHeader title="Export Assets QR" />

                        <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-5 mt-6 items-stretch lg:h-[calc(100vh-13rem)]">
                            {/* Controls Card */}
                            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col h-full min-h-0">
                                <div className="space-y-4">
                                    {/* 1. Company Filter (Main / Group User only) */}
                                    {isGroupUser && (
                                        <div>
                                            <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                                Company 
                                            </label>
                                            <SearchableSelect
                                                name="company"
                                                value={company}
                                                disabled={loadingCompanies}
                                                onChange={(e) => handleCompanyChange(e.target.value)}
                                                options={companyOptions}
                                                placeholder={loadingCompanies ? "Loading companies..." : "Select Company"}
                                                isClearable={true}
                                            />
                                        </div>
                                    )}

                                    {/* 2. Outlet Filter (Optional for Main & Company Users) */}
                                    {!isOutletUser && (
                                        <div>
                                            <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                                Unit 
                                            </label>
                                            <SearchableSelect
                                                name="outlet"
                                                value={outlet}
                                                disabled={(isGroupUser && !company) || loadingOutlets}
                                                onChange={(e) => {
                                                    setOutlet(e.target.value);
                                                    setSubOutlet('');
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

                                    {/* 3. Sub-Outlet Filter (Optional, depends on Outlet)*/}
                                    <div>
                                        <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                            Sub-Unit 
                                        </label>
                                        <SearchableSelect
                                            name="subOutlet"
                                            value={subOutlet}
                                            disabled={!outlet || loadingSubOutlets}
                                            onChange={(e) => {
                                                setSubOutlet(e.target.value);
                                                setPickedAssets([]);
                                                setSelectedAssets([]);
                                            }}
                                            options={subOutletOptions}
                                            placeholder={
                                                !outlet
                                                    ? "Select Unit first"
                                                    : loadingSubOutlets
                                                        ? "Loading sub-units..."
                                                        : "Select Sub-Unit"
                                            }
                                            isClearable={true}
                                        />
                                    </div>

                                    {/* 4. Assets Multi-Select */}
                                    <div>
                                        <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                            Select Assets
                                        </label>
                                        <AssetMultiSelect
                                            options={assets}
                                            selected={pickedAssets}
                                            onChange={handleAssetsMultiSelectChange}
                                            loading={assetsLoading}
                                            disabled={assetsLoading}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-[#C3C6D1] mt-auto pt-4 flex gap-2">
                                    <button
                                        type="button"
                                        disabled={printableAssets.length === 0}
                                        onClick={handlePrintLabels}
                                        className="w-max h-11 cursor-pointer bg-[#084E92] text-white rounded-lg px-4 flex items-center justify-center gap-2 text-sm font-medium hover:bg-[#073e77] transition disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <QrCode size={16} />
                                        Print Labels ({printableAssets.length})
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
                                            <div key={`${a.rowKey}-${a.printIndex}-${index}`} className='flex gap-2 items-center justify-between'>
                                                <div className="flex items-center gap-3 border border-[#E5E7EB] rounded-lg p-3 w-full">
                                                    <div className="w-18 h-18 shrink-0 rounded-lg border border-[#E2E8F0] flex items-center justify-center overflow-hidden">
                                                        <div className="w-14 h-14 shrink-0 rounded-lg p-1 border border-[#E2E8F0] flex items-center justify-center overflow-hidden">
                                                            <QRCode
                                                                value={getAssetQRUrl(a)}
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
                                                        <p className="text-sm text-gray-600 capitalize mb-1">{a.remarks || ""}</p>
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
                <div className="qr-print-area hidden print:block">
                    {printableAssets.map((a, index) => (
                        <AssetLabel
                            key={`print-${a.rowKey}-${a.printIndex}-${index}`}
                            asset={a}
                            qrSize={68}
                        />
                    ))}
                </div>,
                document.body
            )}
        </>
    )
}

export default ExportAssetsQR