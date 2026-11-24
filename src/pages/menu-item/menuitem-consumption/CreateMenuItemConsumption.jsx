import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, ChevronDown, X, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import SearchableSelect from '@/utils/SearchableSelect';
import { notify } from '@/utils/toast';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getUserIdFromToken } from '@/utils/auth';
import {
    getAllKitchenMenuItem,
    getAllRawMaterialUnits,
    getConsumptionConfigById,
    saveOrUpdateConsumptionConfig,
} from '@/services/apiServices';

const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
    }
};

const MultiSelectPopover = ({
    label,
    placeholder = 'Select items...',
    options = [],
    selected = [],
    onChange,
    disabled = false,
    loading = false,
    allLabelPrefix = 'All Items',
    badgeLabelPrefix = 'Selected Items',
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);

    const filteredOptions = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return options;
        return options.filter((o) => (o.label ?? '').toLowerCase().includes(term));
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
            onChange(options.map((o) => String(o.value)));
        }
    };

    return (
        <div className="w-full">
            {label && <label className="block text-xs font-semibold text-[#43474F] mb-1.5">{label}</label>}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div
                        role="button"
                        tabIndex={disabled ? -1 : 0}
                        className={`min-h-10 w-full border rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-1.5 transition-all ${
                            disabled
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                                : 'bg-white cursor-pointer hover:border-gray-400 focus-within:border-[#084E92] focus-within:ring-2 focus-within:ring-[#084E92]/15'
                        } border-[#C3C6D1]`}
                    >
                        {selected.length > 2 ? (
                            <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2 py-0.5 rounded-md">
                                {isAllSelected
                                    ? `${allLabelPrefix} (${options.length})`
                                    : `${badgeLabelPrefix} (${selected.length})`}
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
                                const itemObj = options.find((o) => String(o.value) === String(selectedId));
                                const itemName = itemObj?.label || `Item #${selectedId}`;

                                return (
                                    <span
                                        key={selectedId}
                                        className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2 py-0.5 rounded-md"
                                    >
                                        <span className="truncate max-w-32.5">{itemName}</span>
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
                            placeholder={selected.length === 0 ? (loading ? 'Loading...' : placeholder) : ''}
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
                    className="p-1 w-(--radix-popover-trigger-width) min-w-60 max-h-60 overflow-y-auto bg-white border border-[#C3C6D1] rounded-xl shadow-xl z-50 text-xs"
                >
                    {filteredOptions.length === 0 ? (
                        <p className="px-3 py-3 text-gray-400 text-center">No options found.</p>
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
                                    Select All ({options.length})
                                </label>
                            )}

                            {filteredOptions.map((opt) => {
                                const optId = String(opt.value);
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
                                        <span className="truncate">{opt.label}</span>
                                    </label>
                                );
                            })}
                        </>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
};

const CreateMenuItemConsumption = () => {
    const navigate = useNavigate();
    const { id: editConfigId } = useParams();
    const isEditMode = Boolean(editConfigId);

    const {
        loading: orgScopeLoading,
        isOutletUser,
        units,
        effectiveOutletId,
    } = useOrgScope();

    // Row 1: Bulk Selectors
    const [selectedOutlets, setSelectedOutlets] = useState([]);
    const [selectedMenuItems, setSelectedMenuItems] = useState([]);

    // Row 2: Default Bulk Quantity & Unit
    const [defaultQuantity, setDefaultQuantity] = useState('');
    const [defaultUnitId, setDefaultUnitId] = useState('');

    // Catalogs
    const [menuItems, setMenuItems] = useState([]);
    const [unitsCatalog, setUnitsCatalog] = useState([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(false);
    const [fetchingEditData, setFetchingEditData] = useState(false);
    const [saving, setSaving] = useState(false);

    // Individual breakdown matrix
    const [individualRows, setIndividualRows] = useState([]);

    // Auto-select ONLY for outlet users in create mode
    useEffect(() => {
        if (!isEditMode) {
            if (isOutletUser && effectiveOutletId) {
                setSelectedOutlets([String(effectiveOutletId)]);
            } else if (!isOutletUser) {
                setSelectedOutlets([]);
            }
        }
    }, [isOutletUser, effectiveOutletId, isEditMode]);

    const outletOptions = useMemo(() => {
        return (units || [])
            .filter((u) => u?.id != null && String(u.id).toUpperCase() !== 'ALL')
            .map((u) => ({
                value: String(u.id),
                label: `${u.name}`,
            }));
    }, [units]);

    // Fetch Catalogs
    useEffect(() => {
        let active = true;
        const loadCatalogs = async () => {
            setLoadingCatalogs(true);
            try {
                const [menuRes, unitsRes] = await Promise.all([
                    getAllKitchenMenuItem({ page: 1, size: 2000, isAsc: true }),
                    getAllRawMaterialUnits(),
                ]);

                if (!active) return;

                const mPayload = menuRes?.data?.data ?? menuRes?.data ?? {};
                const mList = Array.isArray(mPayload.items) ? mPayload.items : Array.isArray(mPayload) ? mPayload : [];
                setMenuItems(mList.filter((m) => m.isActive !== false));

                const uList =
                    unitsRes?.data?.data?.['Unit Details'] ||
                    unitsRes?.data?.['Unit Details'] ||
                    unitsRes?.data?.data ||
                    [];
                setUnitsCatalog(Array.isArray(uList) ? uList.filter((u) => u.isActive !== false) : []);
            } catch (err) {
                console.error('Failed to load catalogs:', err);
                notify.error('Failed to load menu items or units');
            } finally {
                if (active) setLoadingCatalogs(false);
            }
        };

        loadCatalogs();
        return () => {
            active = false;
        };
    }, []);

    const menuItemOptions = useMemo(() => {
        return menuItems.map((item) => ({
            value: String(item.id),
            label: item.nameEnglish || item.name || `Item #${item.id}`,
        }));
    }, [menuItems]);

    const unitOptions = useMemo(() => {
        return unitsCatalog.map((u) => ({
            value: String(u.id),
            label: `${u.nameEnglish || u.name || u.unitName}`,
        }));
    }, [unitsCatalog]);

    // In Edit Mode, fetch details by ID and auto-fill the form
    useEffect(() => {
        if (!isEditMode || !editConfigId) return;

        let active = true;
        const loadConfigDetail = async () => {
            setFetchingEditData(true);
            try {
                const res = await getConsumptionConfigById(editConfigId);
                const data = res?.data?.data || res?.data;

                if (!active || !data) return;

                const orgIdStr = String(data.organizationId);
                const menuIdStr = String(data.kitchenMenuItemId);
                const qtyStr = String(data.quantity ?? '');
                const uIdStr = String(data.unitId ?? '');

                setSelectedOutlets([orgIdStr]);
                setSelectedMenuItems([menuIdStr]);
                setDefaultQuantity(qtyStr);
                setDefaultUnitId(uIdStr);

                setIndividualRows([
                    {
                        rowKey: `${orgIdStr}__${menuIdStr}`,
                        id: data.id,
                        organizationId: orgIdStr,
                        kitchenMenuItemId: menuIdStr,
                        quantity: qtyStr,
                        unitId: uIdStr,
                    },
                ]);
            } catch (err) {
                console.error('Failed to load consumption config details:', err);
                notify.error('Failed to load config details');
            } finally {
                if (active) setFetchingEditData(false);
            }
        };

        loadConfigDetail();
        return () => {
            active = false;
        };
    }, [isEditMode, editConfigId]);

    // In Create mode, keep combinations synced as selections change
    useEffect(() => {
        if (isEditMode) return;

        if (selectedOutlets.length === 0 || selectedMenuItems.length === 0) {
            setIndividualRows([]);
            return;
        }

        setIndividualRows((prev) => {
            const nextRows = [];

            selectedOutlets.forEach((orgId) => {
                selectedMenuItems.forEach((menuId) => {
                    const rowKey = `${orgId}__${menuId}`;
                    const existing = prev.find((r) => r.rowKey === rowKey);

                    if (existing) {
                        nextRows.push(existing);
                    } else {
                        nextRows.push({
                            rowKey,
                            organizationId: orgId,
                            kitchenMenuItemId: menuId,
                            quantity: defaultQuantity || '',
                            unitId: defaultUnitId || '',
                        });
                    }
                });
            });

            return nextRows;
        });
    }, [selectedOutlets, selectedMenuItems, isEditMode]);

    const handleApplyDefaultsToAll = () => {
        if (!defaultQuantity && !defaultUnitId) {
            notify.error('Enter a default Quantity or Unit first');
            return;
        }
        setIndividualRows((prev) =>
            prev.map((r) => ({
                ...r,
                quantity: defaultQuantity || r.quantity,
                unitId: defaultUnitId || r.unitId,
            }))
        );
        notify.success('Default values applied to all individual rows');
    };

    const updateIndividualRow = (rowKey, field, value) => {
        setIndividualRows((prev) =>
            prev.map((r) => (r.rowKey === rowKey ? { ...r, [field]: value } : r))
        );
    };

    const removeIndividualRow = (rowKey) => {
        setIndividualRows((prev) => prev.filter((r) => r.rowKey !== rowKey));
    };

    const handleSave = async () => {
        if (individualRows.length === 0) {
            notify.error('No configuration entries to save.');
            return;
        }

        const invalidEntry = individualRows.find(
            (r) => !r.quantity || Number(r.quantity) <= 0 || !r.unitId
        );

        if (invalidEntry) {
            notify.error('All individual rows must have a valid Quantity (> 0) and a selected Unit');
            return;
        }

        setSaving(true);
        const userId = Number(getUserIdFromToken()) || 1;

        try {
            const groupedByOrg = {};
            individualRows.forEach((row) => {
                if (!groupedByOrg[row.organizationId]) {
                    groupedByOrg[row.organizationId] = [];
                }
                groupedByOrg[row.organizationId].push({
                    ...(row.id ? { id: row.id } : {}),
                    kitchenMenuItemId: Number(row.kitchenMenuItemId),
                    quantity: Number(row.quantity),
                    unitId: Number(row.unitId),
                    isActive: true,
                });
            });

            await Promise.all(
                Object.entries(groupedByOrg).map(([orgId, items]) => {
                    const payload = {
                        organizationId: Number(orgId),
                        subOutletId: 0,
                        userId,
                        items,
                    };
                    return saveOrUpdateConsumptionConfig(payload);
                })
            );
            navigate('/menu-item/consumption');
        } catch (err) {
            console.error('Failed to save consumption configs:', err);
            notify.error(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to save configurations');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                <PageHeader
                    title={isEditMode ? 'Edit Menu Item Consumption' : 'Add Menu Item Per-Person Consumption'}
                    description={
                        isEditMode
                            ? 'Update standard per-person consumption quantity and unit for this menu item.'
                            : 'Configure standard per-person standard quantities for menu items across outlets.'
                    }
                    actions={
                        <button
                            type="button"
                            onClick={() => navigate('/menu-item/consumption')}
                            className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to List
                        </button>
                    }
                />

                {fetchingEditData ? (
                    <div className="flex items-center justify-center gap-2 py-20 text-gray-500 text-sm bg-white border border-[#E2E8F0] rounded-2xl">
                        <Loader2 size={18} className="animate-spin text-[#084E92]" />
                        Loading consumption configuration details…
                    </div>
                ) : (
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6 shadow-xs">
                        {/* Row 1: Searchable Multi-Select Outlets & Menu Items */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <MultiSelectPopover
                                label="Unit(s) *"
                                placeholder="Select or search units..."
                                options={outletOptions}
                                selected={selectedOutlets}
                                onChange={setSelectedOutlets}
                                allLabelPrefix="All Units"
                                badgeLabelPrefix="Selected Units"
                                disabled={isEditMode || (isOutletUser && Boolean(effectiveOutletId))}
                            />

                            <MultiSelectPopover
                                label="Menu Item(s) *"
                                placeholder="Select or search menu items..."
                                options={menuItemOptions}
                                selected={selectedMenuItems}
                                onChange={setSelectedMenuItems}
                                allLabelPrefix="All Menu Items"
                                badgeLabelPrefix="Selected Items"
                                disabled={isEditMode}
                                loading={loadingCatalogs}
                            />
                        </div>

                        {/* Row 2: Default Bulk Quantity & Unit */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end bg-[#F8FAFC] p-4 rounded-xl border border-gray-100">
                            <div className="md:col-span-5">
                                <label className="block text-xs font-semibold text-[#43474F] mb-1.5">
                                    {isEditMode ? 'Quantity' : 'Default Quantity'}
                                </label>
                                <input
                                    type="number"
                                    min="0.001"
                                    step="any"
                                    onKeyDown={blockNegativeKeys}
                                    value={defaultQuantity}
                                    onChange={(e) => {
                                        setDefaultQuantity(e.target.value);
                                        if (isEditMode && individualRows[0]) {
                                            updateIndividualRow(individualRows[0].rowKey, 'quantity', e.target.value);
                                        }
                                    }}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    placeholder="e.g. 10"
                                    className="w-full h-10 border border-[#C3C6D1] rounded-lg px-3.5 text-xs text-gray-800 bg-white placeholder-gray-400 outline-none focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/15"
                                />
                            </div>

                            <div className="md:col-span-4">
                                <label className="block text-xs font-semibold text-[rgb(67,71,79)] mb-1.5">
                                    {isEditMode ? 'Unit of measure' : 'Default Uom'}
                                </label>
                                <SearchableSelect
                                    name="defaultUnit"
                                    value={defaultUnitId}
                                    onChange={(e) => {
                                        setDefaultUnitId(e.target.value);
                                        if (isEditMode && individualRows[0]) {
                                            updateIndividualRow(individualRows[0].rowKey, 'unitId', e.target.value);
                                        }
                                    }}
                                    options={unitOptions}
                                    placeholder="Select Unit of Measure"
                                    disabled={loadingCatalogs}
                                />
                            </div>

                            {!isEditMode && (
                                <div className="md:col-span-3">
                                    <button
                                        type="button"
                                        onClick={handleApplyDefaultsToAll}
                                        disabled={individualRows.length === 0}
                                        className="w-full h-10 flex items-center justify-center gap-1.5 px-3 rounded-lg border border-[#084E92] bg-white text-[#084E92] hover:bg-blue-50 text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <RefreshCw size={13} />
                                        Apply to All Rows
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Row 3: Individual Item Breakdown Table */}
                        {individualRows.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                                        Configurations ({individualRows.length})
                                    </h4>
                                    <span className="text-xs text-gray-400">
                                        Customize quantities and units individually per outlet.
                                    </span>
                                </div>

                                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-[#EFF4FF] text-[#00376C] font-semibold uppercase">
                                            <tr>
                                                <th className="px-4 py-3 w-20">S No.</th>
                                                <th className="px-4 py-3">Unit</th>
                                                <th className="px-4 py-3">Menu Item</th>
                                                <th className="px-4 py-3 w-40">Quantity *</th>
                                                <th className="px-4 py-3 w-52">Unit of Measure *</th>
                                                {!isEditMode && <th className="px-4 py-3 w-16 text-center">Action</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {individualRows.map((row, idx) => {
                                                const outletObj = outletOptions.find(
                                                    (o) => String(o.value) === String(row.organizationId)
                                                );
                                                const menuObj = menuItemOptions.find(
                                                    (m) => String(m.value) === String(row.kitchenMenuItemId)
                                                );

                                                return (
                                                    <tr key={row.rowKey} className="hover:bg-slate-50/60 transition">
                                                        <td className="px-4 py-2.5 font-mono text-gray-400">
                                                            {String(idx + 1).padStart(2, '0')}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-medium text-gray-800">
                                                            {outletObj?.label || `Outlet #${row.organizationId}`}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-semibold text-[#084E92]">
                                                            {menuObj?.label || `Item #${row.kitchenMenuItemId}`}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <input
                                                                type="number"
                                                                min="0.001"
                                                                step="any"
                                                                onKeyDown={blockNegativeKeys}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                value={row.quantity}
                                                                onChange={(e) =>
                                                                    updateIndividualRow(row.rowKey, 'quantity', e.target.value)
                                                                }
                                                                placeholder="Qty"
                                                                className="w-full h-8 px-2.5 rounded-lg border border-[#C3C6D1] bg-white text-xs outline-none focus:border-[#084E92]"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <SearchableSelect
                                                                name={`unit_${row.rowKey}`}
                                                                value={row.unitId}
                                                                onChange={(e) =>
                                                                    updateIndividualRow(row.rowKey, 'unitId', e.target.value)
                                                                }
                                                                options={unitOptions}
                                                                placeholder="Select Unit"
                                                            />
                                                        </td>
                                                        {!isEditMode && (
                                                            <td className="px-4 py-2.5 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeIndividualRow(row.rowKey)}
                                                                    className="p-1 text-gray-400 hover:text-red-500 rounded transition cursor-pointer"
                                                                    title="Remove entry"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => navigate('/menu-item/consumption')}
                                className="px-6 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving || orgScopeLoading || individualRows.length === 0}
                                className="px-6 py-2.5 rounded-xl bg-[#084E92] text-white text-xs font-semibold shadow-md hover:bg-[#063b6f] disabled:opacity-60 cursor-pointer"
                            >
                                {saving ? 'Saving...' : isEditMode ? 'Update Consumption' : `Save Consumption (${individualRows.length})`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Container>
    );
};

export default CreateMenuItemConsumption;