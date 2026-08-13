import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Container } from "@/components/common/container";
import { CheckCircle2, ChevronDown, ChevronRight, QrCode, Search, Trash2, X } from 'lucide-react';
import { getAllAssets, getAssetCategories } from '../../../services/apiServices';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
                                    {option.code} {option.department ? `· ${option.department}` : ''} {option.location ? `- ${option.location}` : ''}
                                </span>
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
};

const ExportAssetsQR = () => {
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const [tab, setTab] = useState('selected');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);



    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setCategoriesLoading(true);
                const categoryRes = await getAssetCategories();
                const rawCategories =
                    categoryRes?.data?.data ?? categoryRes?.data ?? categoryRes ?? [];

                const normalizedCategories = (Array.isArray(rawCategories)
                    ? rawCategories
                    : Object.values(rawCategories)
                ).map((c) => ({
                    id: c.id,
                    name: c.nameEnglish ?? c.name,
                }));

                setCategories(normalizedCategories);
            } catch (err) {
                console.error(err);
            } finally {
                setCategoriesLoading(false);
            }
        };

        fetchCategories();
    }, []);

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
                    categoryId: a.categoryId ?? a.category?.id,
                    department: a.department,
                    location: a.location,
                }));

                setAssets(normalizedAssets);
            } catch (err) {
                console.error(err);
            } finally {
                setAssetsLoading(false);
            }
        };

        fetchAssets();
    }, []);

    const filteredAssets = useMemo(() => {
        if (!categoryFilter) return assets;
        return assets.filter((a) => String(a.categoryId) === String(categoryFilter));
    }, [assets, categoryFilter]);

    const handleSelectAsset = (asset) => {
        setSelectedAssets((prev) => [...prev, { ...asset, rowKey: `${asset.id}-${prev.length}-${Date.now()}` }]);
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

        setDeleteLoading(true);
        setSelectedAssets((prev) => prev.filter((a) => a.rowKey !== deleteTarget.rowKey));
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
        setDeleteLoading(false);
    };

    const qrUrl = assets
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(assets.map((a) => a.assetCode).join(','))}`
        : null;
    return (
        <Container>
            <div className='p-4 md:p-6'>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
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
                    {/* Select Assets                                       */}
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
                                options={filteredAssets}
                                onSelect={handleSelectAsset}
                                loading={assetsLoading}
                            />
                        </div>

                        <div className="mt-4">
                            <label className="text-xs font-medium text-[#475569] mb-1.5 block">
                                Category Filter
                            </label>

                            <Select
                                value={categoryFilter || "all"}
                                onValueChange={(value) =>
                                    setCategoryFilter(value === "all" ? "" : value)
                                }
                                disabled={categoriesLoading}
                            >
                                <SelectTrigger className="w-full h-11 border-[#C3C6D1] rounded-lg">
                                    <SelectValue
                                        placeholder={
                                            categoriesLoading
                                                ? "Loading categories..."
                                                : "All Categories"
                                        }
                                    />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="all">
                                        All Categories
                                    </SelectItem>

                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {tab === 'all' && (
                            <div className="my-4 flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                                {filteredAssets.map((a) => (
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

                        <div className="border-t border-[#C3C6D1] mt-auto pt-4">
                            <button
                                type="button"
                                disabled={selectedAssets.length === 0}
                                className="w-max h-11 cursor-pointer bg-[#084E92] text-white rounded-lg px-4 flex items-center justify-center gap-2 text-sm font-medium hover:bg-[#073e77] transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <QrCode size={16} />
                                Generate ({selectedAssets.length})
                            </button>
                        </div>
                    </div>

                    {/* Selected Assets List                                */}
                    <div className="bg-white rounded-2xl p-5 border border-[#C3C6D1] flex flex-col h-full min-h-0">
                        <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F099]">
                            <div>
                                <h2 className="text-base font-semibold text-[#1B1B1F]">Selected Assets List</h2>
                                <p className="text-sm text-gray-400 mt-0.5">
                                    {selectedAssets.length} asset{selectedAssets.length === 1 ? '' : 's'} ready for QR export.
                                </p>
                            </div>
                            {selectedAssets.length > 0 && (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-[#15803D] bg-emerald-50 px-3 py-1.5 border border-[#BBF7D0] rounded-full my-auto">
                                    <CheckCircle2 size={14} />
                                    Ready to Print
                                </span>
                            )}
                        </div>

                        <div className="mt-4 space-y-3 flex-1 min-h-0 overflow-y-auto   ">
                            {selectedAssets.length === 0 ? (
                                <div className="border border-dashed border-[#C3C6D1] rounded-lg py-12 text-center text-sm text-gray-400">
                                    No assets selected yet. Search or browse on the left to add assets.
                                </div>
                            ) : (
                                selectedAssets.map((a) => (
                                    <div key={a.rowKey} className="flex items-center gap-3 border border-[#E5E7EB] rounded-lg p-3">

                                        <div className="w-14 h-14 shrink-0 rounded-lg border border-[#E2E8F0] flex items-center justify-center overflow-hidden">
                                            <div className="w-11 h-11 shrink-0 rounded-lg p-1 border border-[#E2E8F0] flex items-center justify-center overflow-hidden">
                                                {qrUrl ? (
                                                    <img src={qrUrl} alt={`QR code`} className="w-full h-full object-contain p-1" />
                                                ) : (
                                                    <QrCode className="w-6 h-6 text-gray-300" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="min-w-0 flex-1 my-auto">
                                            <p className="text-sm font-medium text-[#1B1B1F] capitalize truncate mb-2">{a.name}</p>
                                            <p className="text-[10px] text-[#64748B] mt-0.5">
                                                <span className="bg-[#F1F5F9] text-[#64748B] font-bold tracking-wide px-1.5 py-0.5 rounded">
                                                    {a.code}
                                                </span>{' '}
                                                {a.department ? `· ${a.department}` : ''} {a.location ? `- ${a.location}` : ''}
                                            </p>
                                        </div>
                                        <Trash2
                                            size={18}
                                            className="text-red-300 cursor-pointer hover:text-red-700 shrink-0"
                                            onClick={() => openDeleteConfirm(a)}
                                        />
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
    )
}

export default ExportAssetsQR
