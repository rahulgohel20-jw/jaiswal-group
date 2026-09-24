import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Container } from "@/components/common/container";
import { CheckCircle2, ChevronRight, QrCode, Search, Trash2, X } from 'lucide-react';
import { getActiveCompany, getAllAssets, getAssetCategories, getAssignedAssetsByOrgAndSubOutlet, getAssignmentsByAssetId } from '../../../services/apiServices';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import QRCode from 'react-qr-code'
import { createPortal } from 'react-dom'
import SearchableSelect from '../../../utils/SearchableSelect';


const ASSET_QR_BASE_URL = 'https://app.justerp.in';

const getAssetQRUrl = (asset) =>
    `${ASSET_QR_BASE_URL}/assets/edit-asset/${encodeURIComponent(asset.id)}`;

const toTitleCase = (str) => {
    if (!str) return str;
    return str
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Single source of truth for label layout. Rendered once for the on-screen
 * 2in x 1in preview and once (unchanged) inside the print block, so preview
 * and print output can never drift apart.
 */
const AssetLabel = ({ asset, qrSize = 68 }) => (
    <div className="asset-label w-48 h-24 bg-white box-border flex items-center p-[0.04in] m-0 overflow-hidden break-inside-avoid">
        <div className="w-[0.86in] h-[0.86in] shrink-0 flex items-center justify-center p-0.5">
            <QRCode value={getAssetQRUrl(asset)} size={qrSize} level='M' />
        </div>

        <div className="flex-1 min-w-0 h-full pl-[0.06in] overflow-hidden flex flex-col justify-center gap-[0.05in]">
            <div className="text-[5pt] font-bold leading-[1.1]">Jaiswal Group</div>
            {asset.organizationname && asset.organizationname !== 'Jaiswal Group' 
             ? <div className="text-[5pt] font-normal leading-[1.1] uppercase">{asset.organizationname}</div>
             : <div className="text-[5pt] font-normal leading-[1.1] uppercase">Head Office</div>}
            <div className="text-[5pt] font-semibold leading-[1.1]">{asset.categoryName}</div>
            <div className="text-[5pt] font-semibold leading-[1.1]">{toTitleCase(asset.name) || '-'}</div>
            <div className="text-[5pt] font-normal leading-[1.1]">{asset.code || '-'}</div>
        </div>
    </div>
);
const AssetSearchDropdown = ({ label, placeholder, options, onSelect, loading }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return options;
        return options.filter(
            (o) =>
                (o.name ?? '').toLowerCase().includes(term) ||
                (o.code ?? '').toLowerCase().includes(term)
        );
    }, [options, query]);

    const handlePick = (option) => {
        onSelect(option);
        setQuery('');
        setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <label className="text-xs font-medium text-[#475569] mb-1.5 block">{label}</label>

            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    value={query}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    placeholder={loading ? 'Loading assets...' : placeholder}
                    className="w-full h-11 pl-9 pr-8 border border-[#C3C6D1] rounded-lg text-sm outline-none focus:border-[#084E92]"
                />
                {query && (
                    <X
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-red-500"
                        onClick={() => setQuery('')}
                    />
                )}
            </div>

            {open && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-[#C3C6D1] rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {loading && <p className="px-3 py-2 text-sm text-gray-400">Loading...</p>}

                    {!loading && filteredOptions.length === 0 && (
                        <p className="px-3 py-2 text-sm text-gray-400">No assets found.</p>
                    )}

                    {!loading &&
                        filteredOptions.map((option) => (
                            <button
                                type="button"
                                key={option.id}
                                onClick={() => handlePick(option)}
                                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-[#F4F7FF]"
                            >
                                <span className="text-sm font-medium text-[#1B1B1F] capitalize">{option.name}</span>
                                <span className="text-xs text-gray-400">
                                    {option.code}
                                </span>
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
};



const ExportAssetsQR = () => {
    const { canView } = usePagePermissions('Export Assets QR');

    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const [tab, setTab] = useState('selected');
    const [orgFilter, setOrgFilter] = useState('');
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [organization, setOrganization] = useState([])
    const [orgLoading, setOrgLoading] = useState(false);
    const [allAssets, setAllAssets] = useState([])

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

    const fetchAssignedAssets = async (organizationId) => {
        try {
            setAssetsLoading(true);

            const assetRes = await getAssignedAssetsByOrgAndSubOutlet(
                organizationId,
                0
            );

            const rawAssets =
                assetRes?.data?.data ?? assetRes?.data ?? assetRes ?? [];

            const normalizedAssets = rawAssets.map((item) => {
                const asset = item.assetDetails;
                const assignment = item.assignDetails;

                return {
                    id: asset.id,
                    name: asset.itemName,
                    code: asset.assetCode,

                    organizationId:
                        assignment?.companiesId ??
                        asset.assignOrganizationId,

                    organizationname:
                        assignment?.companiesName ??
                        asset.organizationname ??
                        '',

                    subOutletId:
                        assignment?.subOutletId ??
                        asset.subOutletId ??
                        null,

                    suboutletname:
                        assignment?.suboutletname ??
                        asset.suboutletname ??
                        '',

                    categoryId:
                        asset.categoryId ??
                        asset.category?.id,

                    categoryName:
                        asset.categoryName ??
                        asset.category?.categoryName ??
                        asset.category?.name ??
                        asset.assetCategoryName ??
                        '',
                    department: asset.department,
                    location: asset.assetLocationName,

                    quantity:
                        assignment?.quantity ??
                        asset.totalQuantity ??
                        0,
                };
            });

            setAssets(normalizedAssets);
        } catch (error) {
            console.error('Error fetching assigned assets:', error);
            setAssets([]);
        } finally {
            setAssetsLoading(false);
        }
    };
    useEffect(() => {
        const fetchOrganization = async () => {
            try {
                setOrgLoading(true);
                const orgRes = await getActiveCompany();
                const rawOrg =
                    orgRes?.data?.data ?? orgRes?.data ?? orgRes ?? [];

                const normalizedOrganization = (Array.isArray(rawOrg)
                    ? rawOrg
                    : Object.values(rawOrg)
                ).map((c) => ({
                    id: c.id,
                    name: c.companyNameEnglish ?? c.name,
                }));

                setOrganization(normalizedOrganization);
            } catch (error) {
                console.error(error);
            } finally {
                setOrgLoading(false);
            }
        }
        fetchOrganization()
    }, [])

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                setAssetsLoading(true);
                const assetRes = await getAllAssets();
                const rawAssets =
                    assetRes?.data?.data ?? assetRes?.data ?? assetRes ?? [];

                const normalizedAssets = (Array.isArray(rawAssets)
                    ? rawAssets
                    : Object.values(rawAssets)
                ).map((a) => ({
                    id: a.id,
                    name: a.itemName,
                    code: a.assetCode ?? a.code,
                    organizationname: a.organizationname ?? '',
                    organizationId: a.assignOrganizationId ?? null,
                    suboutletname: a.suboutletname ?? '',
                    subOutletId: a.subOutletId ?? null,

                    // Keep these if other UI parts use them
                    unitName: a.organizationname ?? '',
                    categoryId: a.categoryId ?? a.category?.id,
                    categoryName: a.categoryName ?? a.categoryName,
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
    }, []);

    const normalizeLocationValue = (value) => {
        return String(value ?? '')
            .trim()
            .toLowerCase();
    };

    const getAssetLocationKey = (asset) => {
        return [
            normalizeLocationValue(asset.name),
            normalizeLocationValue(asset.organizationname),
            normalizeLocationValue(asset.suboutletname),
        ].join('|');
    };
    const handleSelectAsset = async (asset) => {
        try {
            setAssetsLoading(true);

            // Call assignment API only after selecting the asset
            const assignmentRes = await getAssignmentsByAssetId(asset.id);

            const rawAssignments =
                assignmentRes?.data?.data ??
                assignmentRes?.data ??
                assignmentRes ??
                [];

            const assignments = Array.isArray(rawAssignments)
                ? rawAssignments
                : Object.values(rawAssignments);

            if (assignments.length === 0) {
                setSelectedAssets((prev) => {
                    const alreadySelected = prev.some(
                        (item) =>
                            String(item.id) === String(asset.id) &&
                            !item.isAssigned
                    );

                    if (alreadySelected) {
                        return prev;
                    }

                    return [
                        ...prev,
                        {
                            ...asset,
                            isAssigned: false,

                            assignmentId: null,
                            availableQuantity:
                                asset.availableQuantity ??
                                asset.availableQty ??
                                asset.totalQuantity ??
                                asset.quantity ??
                                0,
                            rowKey:
                                `${asset.id}-unassigned-${Date.now()}-${Math.random()}`,
                        },
                    ];
                });
                return;
            }

            const assignmentRows = assignments.map((assignment, index) => ({
                ...asset,

                isAssigned: true,

                assignmentId:
                    assignment.id ??
                    assignment.assignmentId ??
                    assignment.assignId ??
                    null,

                organizationId:
                    assignment.companiesId ??
                    assignment.organizationId ??
                    asset.organizationId ??
                    null,

                organizationname:
                    assignment.companiesName ??
                    assignment.organizationName ??
                    asset.organizationname ??
                    '',

                subOutletId:
                    assignment.subOutletId ??
                    assignment.suboutletId ??
                    asset.subOutletId ??
                    null,

                suboutletname:
                    assignment.suboutletname ??
                    assignment.subOutletName ??
                    assignment.subOutletNameEnglish ??
                    '',

                quantity:
                    assignment.quantity ??
                    assignment.assignedQuantity ??
                    0,

                availableQuantity:
                    assignment.availableQuantity ??
                    assignment.availableQty ??
                    0,
                assignmentIndex: index,
                rowKey: `${asset.id}-${assignment.id ?? index
                    }-${Date.now()}-${Math.random()}`,
            }));

            const groupedAssignments = new Map();

            assignmentRows.forEach((row) => {
                const locationKey =
                    getAssetLocationKey(row);

                if (!groupedAssignments.has(locationKey)) {
                    groupedAssignments.set(
                        locationKey,
                        {
                            ...row,
                            assignmentId: row.assignmentId,
                            quantity: row.quantity ?? 0,
                            availableQuantity: row.availableQuantity ?? 0,
                            rowKey:
                                `${asset.id}-${locationKey}-${Date.now()}-${Math.random()}`,
                        }
                    );
                    return;
                }

                const existing = groupedAssignments.get(locationKey);

                existing.quantity =
                    Number(existing.quantity ?? 0) +
                    Number(row.quantity ?? 0);
                existing.availableQuantity =
                    Number(existing.availableQuantity ?? 0) + Number(row.availableQuantity ?? 0);
            });


            const uniqueAssignmentRows =
                Array.from(
                    groupedAssignments.values()
                );
            // Add all assignments as separate printable rows
            setSelectedAssets((prev) => {

                const newRows = uniqueAssignmentRows.filter((newRow) => {

                    const newKey = getAssetLocationKey(newRow);
                    return !prev.some(
                        (existing) =>
                            getAssetLocationKey(existing) === newKey
                    );
                }
                );

                return [
                    ...prev,
                    ...newRows
                ];
            });

        } catch (error) {
            console.error('Error fetching asset assignments:', error);
        } finally {
            setAssetsLoading(false);
        }
    };

    const getOrganizationAssets = () => {
        if (!orgFilter) {
            return [];
        }

        return assets.filter(
            (asset) =>
                String(asset.organizationId) === String(orgFilter)
        );
    };


    const isAllOrganizationAssetsSelected = () => {
        const orgAssets = getOrganizationAssets();

        if (orgAssets.length === 0) {
            return false;
        }

        return orgAssets.every((asset) =>
            selectedAssets.some(
                (selected) =>
                    getAssetLocationKey(selected) ===
                    getAssetLocationKey(asset)
            )
        );
    };
    const printableAssets = useMemo(() => {
        if (!selectedAssets.length) return [];
        return selectedAssets.flatMap((asset) => {
            const quantity = Math.max(
                1,
                Number(asset.quantity ?? 1)
            );

            return Array.from({ length: quantity }, (_, index) => ({
                ...asset,
                printIndex: index,
            }));
        });
    }, [selectedAssets]);
    const handleSelectAllOrgazination = (checked) => {
        const orgAssets = getOrganizationAssets();

        if (!checked) {
            setSelectedAssets((prev) =>
                prev.filter(
                    (selected) =>
                        !orgAssets.some(
                            (asset) =>
                                getAssetLocationKey(selected) ===
                                getAssetLocationKey(asset)
                        )
                )
            );

            return;
        }

        setSelectedAssets((prev) => {
            const existingLocationKeys = new Set(
                prev.map((item) => getAssetLocationKey(item))
            );

            const newAssets = orgAssets
                .filter((asset) => {
                    const locationKey = getAssetLocationKey(asset);

                    return !existingLocationKeys.has(locationKey);
                })
                .map((asset) => ({
                    ...asset,

                    // Make sure quantity is available for printing
                    quantity: Math.max(
                        1,
                        Number(asset.quantity ?? 1)
                    ),

                    rowKey:
                        `${asset.id}-${asset.organizationId}-${asset.subOutletId ?? 'no-suboutlet'}-${Date.now()}-${Math.random()}`,
                }));

            return [...prev, ...newAssets];
        });
    };

    const openDeleteConfirm = (row) => {
        setDeleteTarget({
            rowKey: row.rowKey,
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
        setSelectedAssets((prev) => prev.filter((a) => a.rowKey !== deleteTarget.rowKey));
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    };

    const organizationOptions = [
        {
            value: '',
            label: "All Organizations",
        },
        ...organization.map((org) => ({
            value: org.id,
            label: org.companyNameEnglish || org.name || "-",
        })),
    ];

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
            
               html,
               body {
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

            {/* Normal UI — hidden while printing */}
            <div className="print:hidden">
                <Container>
                    <div className='p-4 md:p-6'>
                        <div className="flex items-center gap-1.5 sm:text-xs text-[10px] text-gray-400 mb-2">
                            <span>Dashboard</span>
                            <ChevronRight size={12} />
                            <span>Asset Management</span>
                            <ChevronRight size={12} />
                            <span className="text-[#084E92] font-medium">Export Assets QR</span>
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold">
                                Export Assets QR
                            </h1>

                            <p className="text-[#737781] mt-1 text-sm">
                                Generate and export high-resolution QR codes for registered assets for inventory tracking.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-5 mt-6 items-stretch lg:h-[calc(100vh-13rem)]">
                            {/* Select Assets */}
                            <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col h-full min-h-0">
                                <h2 className="text-base font-semibold text-[#1B1B1F] py-4 border-b-2 border-[#E2E8F099]">Select Assets</h2>

                                <div className="grid grid-cols-2 gap-1 bg-[#F4F7FF] rounded-lg p-1 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setTab('all')}
                                        className={`py-1.5 cursor-pointer rounded-md text-sm font-medium transition ${tab === 'all' ? 'bg-white text-[#1B1B1F] shadow-sm' : 'text-gray-400 hover:text-[#43474F]'
                                            }`}
                                    >
                                        All Assets
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTab('selected')}
                                        className={`py-1.5 cursor-pointer rounded-md text-sm font-medium transition ${tab === 'selected' ? 'bg-[#084E92] text-white shadow-sm' : 'text-gray-400 hover:text-[#43474F]'
                                            }`}
                                    >
                                        Selected Assets
                                    </button>
                                </div>

                                <div className="mt-4">
                                    <AssetSearchDropdown
                                        label="Search Assets"
                                        placeholder="Search by name or asset code"
                                        options={assets}
                                        onSelect={handleSelectAsset}
                                        loading={assetsLoading}
                                    />
                                </div>

                                <div className="mt-4">
                                    <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                        Organization Filter
                                    </label>

                                    <SearchableSelect
                                        name="organization"
                                        value={orgFilter}
                                        onChange={(e) => {
                                            const selectedOrg = e.target.value;

                                            setOrgFilter(selectedOrg);

                                            if (selectedOrg) {
                                                fetchAssignedAssets(Number(selectedOrg));
                                            } else {
                                                setAssets(allAssets);
                                            }
                                        }}
                                        options={organizationOptions}
                                        placeholder={orgLoading ? "Loading organizations..." : "Select Organization"}
                                        disabled={orgLoading}
                                    />
                                    <div className="flex items-center gap-2 mt-3">
                                        <input
                                            type="checkbox"
                                            checked={isAllOrganizationAssetsSelected()}
                                            onChange={(e) =>
                                                handleSelectAllOrgazination(e.target.checked)
                                            }
                                            disabled={
                                                !orgFilter ||
                                                getOrganizationAssets().length === 0 ||
                                                assetsLoading
                                            }
                                            className="h-4 w-4 rounded border-gray-300 text-[#084E92] focus:ring-[#084E92] cursor-pointer disabled:cursor-not-allowed"
                                        />

                                        <span className="text-sm font-medium text-[#334155]">
                                            Organization According Select All for Print
                                        </span>

                                        {orgFilter && getOrganizationAssets().length > 0 && (
                                            <span className="text-xs text-gray-400">
                                                ({getOrganizationAssets().length} assets)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {tab === 'all' && (
                                    <div className="my-4 flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                                        {assets.map((a) => (
                                            <button
                                                key={a.id}
                                                type="button"
                                                onClick={() => handleSelectAsset(a)}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#E5E7EB] hover:border-[#084E92] hover:bg-[#F4F7FF] text-left"
                                            >
                                                <span>
                                                    <span className="block text-sm font-medium text-[#1B1B1F] capitalize">{a.name}</span>
                                                    <span className="text-xs text-[#64748B]">{a.code}</span>
                                                </span>
                                                <span className="text-xs font-medium text-[#084E92]">Add</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="border-t border-[#C3C6D1] mt-auto pt-4 flex gap-2">
                                    <button
                                        type="button"
                                        disabled={selectedAssets.length === 0}
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
                                            {printableAssets.length} asset{printableAssets.length === 1 ? '' : 's'} ready for QR export.
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
                                            No assets selected yet. Search or browse on the left to add assets.
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
                                                        <p className="text-sm text-gray-600 capitalize mb-1"> {a.organizationname && a.organizationname !== 'Jaiswal Group' ? <span className='uppercase'> {(a.organizationname)} </span> : 'HEAD OFFICE'}</p>
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