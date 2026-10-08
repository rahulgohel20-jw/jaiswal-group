import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Plus, Trash2 } from 'lucide-react';
import { notify } from '@/utils/toast';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import SearchableSelect from '@/utils/SearchableSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router';
import { getAllRawMaterialCategory, getAllRawMaterialItems, getAllSubOutlets, getAllSubLocationsBySubOutletId, saveOpb } from '@/services/apiServices';
import AddRawMaterialCategoryModal from '../../raw-material/row-material-categories/AddRowMaterialCategoryModel';
import RawMaterialSearchPicker from '@/components/common/RawMaterialSearchPicker';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getUserIdFromToken } from '../../../utils/auth';

const mapCategory = (item) => ({
    value: String(item.id),
    label: item.nameEnglish || item.categoryName || item.name || item.label,
});
const userId = getUserIdFromToken();
const normalizeSubUnit = (item) => ({
    id: item.id,
    name: item.subOutletName || '',
    code: item.companyCode || '',
    organizationId: item.organizationId,
    status: item.isActive ? 'active' : 'inactive',
    originalData: item,
});

let rowIdCounter = 1;
// Disallow negative numbers and prevent typing '-' or 'e'
const sanitizeNonNegative = (val) => {
    if (val === '') return '';
    const num = Number(val);
    if (isNaN(num) || num < 0) return '0';
    return String(val);
};

const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
    }
};

const OpbStockCreateRequest = () => {
    const navigate = useNavigate();

    const {
        loading: orgScopeLoading,
        error: orgScopeError,
        isOutletUser,
        showUnitDropdown,
        units,
        selectedUnitId,
        setSelectedUnitId,
        effectiveOutletId,
    } = useOrgScope();

    const [createdDate, setCreatedDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [outlet, setOutlet] = useState('');
    const [subOutlet, setSubOutlet] = useState('');
    const [subLocation, setSubLocation] = useState('');
    const [subUnits, setSubUnits] = useState([]);
    const [subLocations, setSubLocations] = useState([]);
    const [subUnitsLoading, setSubUnitsLoading] = useState(false);
    const [subLocationsLoading, setSubLocationsLoading] = useState(false);
    const [category, setCategory] = useState('ALL');
    const [categories, setCategories] = useState([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [categoriesError, setCategoriesError] = useState(null);
    const [items, setItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [saving, setSaving] = useState(false);

    const outletOptions = useMemo(
        () =>
            (units || [])
                .filter((unit) => unit?.id != null && String(unit.id).toUpperCase() !== 'ALL')
                .map((unit) => ({
                    value: String(unit.id),
                    label: `${unit.name}${unit.code ? ` (${unit.code})` : ''}`,
                })),
        [units]
    );

    // Check if current outlet value exists in the options list
    const isOutletValid = useMemo(() => {
        return outletOptions.some((opt) => opt.value === String(outlet));
    }, [outletOptions, outlet]);

    useEffect(() => {
        if (orgScopeLoading) return;

        if (isOutletUser && effectiveOutletId) {
            setOutlet(String(effectiveOutletId));
        } else {
            // Group & Company users start with an empty string
            setOutlet('');
        }
    }, [isOutletUser, effectiveOutletId, orgScopeLoading]);

    const fetchSubUnits = useCallback(async () => {
        if (!outlet) {
            setSubUnits([]);
            return;
        }

        setSubUnitsLoading(true);

        try {
            const res = await getAllSubOutlets();

            const list = res?.data?.data || res?.data?.content || res?.data || [];
            const subOutletList = Array.isArray(list) ? list : [];

            const filteredSubOutlets = subOutletList
                .filter((sub) => sub.isActive)
                .filter((sub) => Number(sub.organizationId) === Number(outlet))
                .map(normalizeSubUnit);

            setSubUnits(filteredSubOutlets);
        } catch (err) {
            console.error('Failed to load sub outlets:', err);
            notify.error('Failed to load sub outlets');
            setSubUnits([]);
        } finally {
            setSubUnitsLoading(false);
        }
    }, [outlet]);

    useEffect(() => {
        fetchSubUnits();
    }, [fetchSubUnits]);

    const subOutletOptions = useMemo(
        () =>
            subUnits.map((sub) => ({
                value: String(sub.id),
                label: `${sub.name}${sub.code ? ` (${sub.code})` : ''}`,
            })),
        [subUnits]
    );

    /* Fetch Sub-Locations when Sub-Outlet changes */
    useEffect(() => {
        if (!subOutlet) {
            setSubLocations([]);
            setSubLocation('');
            return;
        }

        let isMounted = true;
        setSubLocationsLoading(true);

        getAllSubLocationsBySubOutletId(subOutlet)
            .then((res) => {
                const raw = res?.data?.data ?? res?.data;
                const list = Array.isArray(raw)
                    ? raw
                    : Array.isArray(raw?.content)
                        ? raw.content
                        : Array.isArray(res?.data?.content)
                            ? res.data.content
                            : [];
                if (isMounted) setSubLocations(list);
            })
            .catch((err) => {
                console.error('Failed to load sub locations:', err);
                if (isMounted) setSubLocations([]);
            })
            .finally(() => {
                if (isMounted) setSubLocationsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [subOutlet]);

    const subLocationOptions = useMemo(
        () =>
            subLocations.map((loc) => ({
                value: String(loc.id),
                label: `${loc.subLocationName || loc.locationName || loc.name || `Sub Location #${loc.id}`}${loc.locationType || loc.type ? ` (${loc.locationType || loc.type})` : ''
                    }`,
            })),
        [subLocations]
    );

    const fetchCategories = useCallback(async () => {
        setCategoriesLoading(true);
        setCategoriesError(null);

        try {
            const res = await getAllRawMaterialCategory(0);
            const raw =
                res?.data?.data?.['Raw Material Category Details'] || [];

            // Define 'mapped' before spreading it
            const mapped = Array.isArray(raw) ? raw.map(mapCategory) : [];

            setCategories([{ value: 'ALL', label: 'All Categories' }, ...mapped]);
        } catch (err) {
            console.error('Failed to load categories:', err);
            setCategoriesError('Failed to load categories');
            notify.error('Failed to load categories');
            setCategories([{ value: 'ALL', label: 'All Categories' }]);
        } finally {
            setCategoriesLoading(false);
        }
    }, []);
        
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleCategorySaved = async (newCategory) => {
        await fetchCategories();

        if (newCategory?.id != null) {
            // Pass string ID rather than an object
            setCategory(String(newCategory.id));
        }
    };

    const fetchItems = useCallback(async () => {
        if (!category) {
            setItems([]);
            return;
        }

        setItemsLoading(true);

        try {
            const catId = category === 'ALL' ? 0 : Number(category);
            const res = await getAllRawMaterialItems(catId, 0, '', '');
            const responseData = res?.data?.data || {};
            const rawItems = responseData['Raw Material Details'] || [];

            const mappedItems = rawItems.map((item) => ({
                id: item.id,
                itemType: 'Raw Material',
                itemName: item.nameEnglish || item.name || '',
                nameEnglish: item.nameEnglish || item.name || '',
                itemCode: item.itemCode || item.code || item.sku || '',
                code: item.itemCode || item.code || item.sku || '',
                category: item.rawMaterialCat?.nameEnglish || item.rawMaterialCategoryName || '',
                unit: item.unit?.nameEnglish || item.unitName || '',
                unitId: item.unitId ?? item.unit?.id ?? null,
                allowedUnits: (item.allowedUnits || []).map((u) => ({
                    id: u.id,
                    name: u.nameEnglish,
                })),
                opbStock: item.opbStock ?? 0,
                currentStock: item.currentStock || item.opbStock || 0,
                minStock: item.minStock ?? 0,
                price: item.supplierRate ?? item.unitRate ?? item.price ?? 0,
                supplierRate: item.supplierRate ?? item.unitRate ?? item.price ?? 0,
                expiryDate: item.expiryDate ?? null,
                originalData: item,
            }));

            setItems(mappedItems);
        } catch (err) {
            console.error('Failed to load items:', err);
            setItems([]);
            notify.error('Failed to load items');
        } finally {
            setItemsLoading(false);
        }
    }, [category]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const itemOptions = useMemo(
        () =>
            items.map((item) => {
                const alreadyAdded = selectedItems.some(
                    (row) => row.itemId === item.id && row.itemType === item.itemType
                );
                return {
                    value: String(item.id),
                    label: `${item.itemName}${alreadyAdded ? ' - Added' : ''} ${item.originalData.currentStock ? `- ${item.originalData.currentStock}` : ''}`,
                    disabled: alreadyAdded,
                };
            }),
        [items, selectedItems]
    );

    const handleAddItem = (item) => {
        setSelectedItems((prev) => {
            const alreadyExists = prev.some(
                (row) => row.itemId === item.id && row.itemType === item.itemType
            );

            if (alreadyExists) return prev;

            const allowedUnits = item.allowedUnits?.length
                ? item.allowedUnits.map((unit) => ({
                    id: unit.id,
                    name: unit.name,
                }))
                : item.unit
                    ? [{ id: item.unitId ?? null, name: item.unit }]
                    : [];

            const newRow = {
                rowId: rowIdCounter++,
                itemId: item.id,
                itemType: 'Raw Material',
                category: item.category || '',
                itemName: item.itemName || '',
                allowedUnits: allowedUnits.map((unit) => ({ ...unit })),
                unit: item.unit || allowedUnits[0]?.name || '',
                unitId: item.unitId ?? allowedUnits[0]?.id ?? null,
                opb: item.opbStock != null ? String(item.opbStock) : '',
                minQty: item.minStock != null ? String(item.minStock) : '1',
                price: item.price ?? 0,
                expiryDate: item.expiryDate || '',
                batchNumber: '',
            };

            return [...prev, newRow];
        });
    };

    const updateItemField = (rowId, field, value) => {
    let sanitizedValue = value;

    if (['opb', 'price', 'minQty'].includes(field)) {
        sanitizedValue = sanitizeNonNegative(value);
    }

    setSelectedItems((prev) =>
        prev.map((row) =>
            row.rowId === rowId
                ? { ...row, [field]: sanitizedValue }
                : row
        )
    );
};

    const handleDeleteItem = (rowId) => {
        setSelectedItems((prev) => prev.filter((row) => row.rowId !== rowId));
    };

    const handleCancel = () => {
        navigate('/inventory/opb-stock-create-request-list');
    };

    const handleSave = async () => {
        const selectedOutletId = Number(outlet || effectiveOutletId);

        if (!selectedOutletId) {
            notify.error('Please select Outlet');
            return;
        }

        if (!selectedItems.length) {
            notify.error('Add at least one item to the OPB stock details');
            return;
        }

        setSaving(true);

        try {
            const payload = {
                items: selectedItems.map((row) => ({
                    batchNumber: row.batchNumber || '',
                    expiryDate: row.expiryDate || '',
                    itemId: Number(row.itemId),
                    itemType: 'RAW_MATERIAL',
                    // minStockAlert: Number(row.minQty) || 0,
                    quantity: Number(row.opb) || 1,
                    remarks: '',
                    unitId: Number(row.unitId) || 0,
                    unitRate: Number(row.price) || 0,
                })),
                opbDate: createdDate,
                organizationId: selectedOutletId,
                postDirectly: true,
                subOutletId: Number(subOutlet) || '',
                subLocationId: subLocation ? Number(subLocation) : null,
            };

            await saveOpb(payload, Number(getUserIdFromToken()));
            navigate('/inventory/opb-stock-create-request-list');
        } catch (err) {
            console.error('Failed to save OPB stock:', err);
            notify.error(
                err?.response?.data?.message ||
                'Failed to save OPB stock request'
            );
        } finally {
            setSaving(false);
        }
    };


    return (
        <Container>
            <div className="mx-auto pt-2 pb-6 space-y-3.5">
                <PageHeader
                    title="OPB Stock Create Request"
                    actions={
                        <button
                            type="button"
                            onClick={() => navigate('/inventory/opb-stock-create-request-list')}
                            className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0 shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to List
                        </button>
                    }
                    className="mb-2"
                />

                <div className="bg-white border border-[#E2E8F0] rounded-2xl mt-4 relative">
                    <div className="px-6 py-4 border-b border-[#E2E8F0]">
                        <span className="font-semibold text-[#0F172A]">
                            Details
                        </span>
                    </div>

                    <div className="px-6 py-5 space-y-5">
                        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOutletUser ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
                            <div>
                                <label className="text-xs font-medium text-gray-600">
                                    Created Date
                                </label>

                                <div className="relative">
                                    <Calendar
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                    />

                                    <input
                                        type="date"
                                        value={createdDate}
                                        onChange={(e) => setCreatedDate(e.target.value)}
                                        className="w-full h-10 border border-[#C3C6D1] rounded-lg pl-9 pr-3 outline-none text-gray-700"
                                    />
                                </div>
                            </div>
                            {
                                !isOutletUser && <div>
                                    <label className="text-xs font-medium text-gray-600">
                                        Outlet
                                    </label>

                                    <SearchableSelect
                                        className="mt-1.5"
                                        options={outletOptions}
                                        value={isOutletValid ? outlet : ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setOutlet(val);
                                            setSubOutlet('');
                                            setSubLocation('');
                                        }}
                                        disabled={orgScopeLoading || outletOptions.length === 0}
                                        placeholder={
                                            orgScopeLoading
                                                ? 'Loading outlets...'
                                                : outletOptions.length === 0
                                                    ? 'No outlets available'
                                                    : 'Select Outlet'
                                        }
                                    />

                                    {orgScopeError && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {orgScopeError}
                                        </p>
                                    )}
                                </div>
                            }


                            <div>
                                <label className="text-xs font-medium text-gray-600">
                                    Sub-Outlet <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                                </label>

                                <SearchableSelect
                                    className="mt-1.5"
                                    options={subOutletOptions}
                                    value={subOutlet}
                                    onChange={(e) => {
                                        setSubOutlet(e.target.value);
                                        setSubLocation('');
                                    }}
                                    disabled={!outlet || subUnitsLoading}
                                    placeholder={
                                        !outlet
                                            ? 'Select Outlet first'
                                            : subUnitsLoading
                                                ? 'Loading sub outlets...'
                                                : 'Select Sub-Outlet'
                                    }
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-600">
                                    Sub-Location <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                                </label>

                                <SearchableSelect
                                    className="mt-1.5"
                                    options={subLocationOptions}
                                    value={subLocation}
                                    onChange={(e) => setSubLocation(e.target.value)}
                                    disabled={!subOutlet || subLocationsLoading}
                                    placeholder={
                                        !subOutlet
                                            ? 'Select Sub-Outlet first'
                                            : subLocationsLoading
                                                ? 'Loading sub locations...'
                                                : 'Select Sub-Location'
                                    }
                                />
                            </div>
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <div>
                                <label className="text-xs font-medium text-gray-600">
                                    Select Raw Material Category
                                </label>

                                <div className="flex items-center gap-2">
                                    <SearchableSelect
                                        className="flex-1"
                                        options={categories}
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        placeholder={
                                            categoriesLoading
                                                ? 'Loading...'
                                                : 'Select Raw Material Category'
                                        }
                                    />
                                </div>

                                {categoriesError && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {categoriesError}
                                    </p>
                                )}
                            </div>

                            <div className="self-end w-full [&_.max-w-lg]:max-w-full [&_input]:h-10 [&_input]:text-sm">
                                <label className="text-xs font-medium text-gray-600">
                                    Select Raw Material
                                </label>
                                <RawMaterialSearchPicker
                                    items={items}
                                    alreadyAddedIds={selectedItems.map((r) => r.itemId)}
                                    onSelect={handleAddItem}
                                    disabled={!category || itemsLoading}
                                    loading={itemsLoading}
                                    placeholder={
                                        !category
                                            ? 'Select category first'
                                            : itemsLoading
                                                ? 'Loading items...'
                                                : 'Search Raw Material by name or code...'
                                    }
                                    label=""
                                    className="w-full"
                                    isSticky={false}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-2xl mt-4 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
                        <span className="font-semibold text-[#0F172A]">
                            OPB Stock Details
                        </span>

                        <span className="px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-[#084E92] text-xs font-medium">
                            {selectedItems.length}{' '}
                            {selectedItems.length === 1 ? 'Item' : 'Items'} Selected
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 text-xs">
                                    <th className="px-6 py-3 text-left font-medium">
                                        Category
                                    </th>
                                    <th className="px-3 py-3 text-left font-medium">
                                        Item Name
                                    </th>
                                    <th className="px-3 py-3 text-left font-medium">
                                        Unit
                                    </th>
                                    <th className="px-3 py-3 text-left font-medium">
                                        OPB
                                    </th>
                                    <th className="px-3 py-3 text-left font-medium">
                                        Min Qty
                                    </th>
                                    <th className="px-3 py-3 text-left font-medium">
                                        Price (₹)
                                    </th>
                                    <th className="px-3 py-3 text-left font-medium">
                                        Expiry Date
                                    </th>
                                    <th className="px-3 py-3 text-left font-medium">
                                        Batch Number
                                    </th>
                                    <th className="px-3 py-3 text-center font-medium">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {selectedItems.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-6 py-8 text-center text-gray-400"
                                        >
                                            No items selected yet — search and add items above.
                                        </td>
                                    </tr>
                                ) : (
                                    selectedItems.map((row) => (
                                        <tr
                                            key={row.rowId}
                                            className="border-t border-[#F1F5F9]"
                                        >
                                            <td className="px-6 py-3 text-gray-700">
                                                {row.category}
                                            </td>

                                            <td className="px-3 py-3 text-[#084E92] font-medium">
                                                {row.itemName}
                                            </td>

                                            <td className="px-3 py-3">
                                                <Select
                                                    value={row.unit}
                                                    onValueChange={(value) => {
                                                        setSelectedItems((prev) =>
                                                            prev.map((r) => {
                                                                if (r.rowId !== row.rowId) {
                                                                    return r;
                                                                }

                                                                const selectedUnit =
                                                                    (r.allowedUnits || []).find(
                                                                        (u) =>
                                                                            u.name === value
                                                                    );

                                                                return {
                                                                    ...r,
                                                                    unit: value,
                                                                    unitId:
                                                                        selectedUnit?.id ??
                                                                        r.unitId,
                                                                };
                                                            })
                                                        );
                                                    }}
                                                >
                                                    <SelectTrigger className="h-9 w-28 border-[#C3C6D1] rounded-lg">
                                                        <SelectValue />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        {(
                                                            row.allowedUnits?.length
                                                                ? row.allowedUnits
                                                                : [
                                                                    {
                                                                        id: row.unitId,
                                                                        name: row.unit,
                                                                    },
                                                                ]
                                                        ).map((u) => (
                                                            <SelectItem
                                                                key={u.id ?? u.name}
                                                                value={u.name}
                                                            >
                                                                {u.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>

                                            <td className="px-3 py-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={row.opb}
                                                    onKeyDown={blockNegativeKeys}
                                                    onWheel={e => e.currentTarget.blur()}
                                                    onChange={(e) =>
                                                        updateItemField(
                                                            row.rowId,
                                                            'opb',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-20 h-9 border border-[#C3C6D1] rounded-lg px-2.5 outline-none"
                                                />
                                            </td>

                                            <td className="px-3 py-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={row.minQty}
                                                    onKeyDown={blockNegativeKeys}
                                                    onWheel={e => e.currentTarget.blur()}
                                                    onChange={(e) =>
                                                        updateItemField(
                                                            row.rowId,
                                                            'minQty',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-20 h-9 border border-[#C3C6D1] rounded-lg px-2.5 outline-none"
                                                />
                                            </td>

                                            <td className="px-3 py-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={row.price}
                                                    onKeyDown={blockNegativeKeys}
                                                    onWheel={e => e.currentTarget.blur()}
                                                    onChange={(e) =>
                                                        updateItemField(
                                                            row.rowId,
                                                            'price',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-20 h-9 border border-[#C3C6D1] rounded-lg px-2.5 outline-none"
                                                />
                                            </td>

                                            <td className="px-3 py-3">
                                                <input
                                                    type="date"
                                                    value={row.expiryDate}
                                                    onChange={(e) =>
                                                        updateItemField(
                                                            row.rowId,
                                                            'expiryDate',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-36 h-9 border border-[#C3C6D1] rounded-lg px-2.5 outline-none text-gray-600"
                                                />
                                            </td>

                                            <td className="px-3 py-3">
                                                <input
                                                    type="text"
                                                    value={row.batchNumber}
                                                    onChange={(e) =>
                                                        updateItemField(
                                                            row.rowId,
                                                            'batchNumber',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="BAT-XXX"
                                                    className="w-28 h-9 border border-[#C3C6D1] rounded-lg px-2.5 outline-none"
                                                />
                                            </td>

                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDeleteItem(row.rowId)
                                                    }
                                                    className="inline-flex items-center justify-center text-red-400 hover:text-red-600 cursor-pointer"
                                                    title="Delete item"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-5">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-6 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || orgScopeLoading}
                        className="px-6 py-2.5 rounded-xl bg-[#084E92] text-white text-sm shadow-md hover:bg-[#084E92]/90 disabled:opacity-60 cursor-pointer"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {isCategoryModalOpen && (
                    <AddRawMaterialCategoryModal
                        isOpen={isCategoryModalOpen}
                        onClose={() => setIsCategoryModalOpen(false)}
                        onSaved={handleCategorySaved}
                    />
                )}
            </div>
        </Container>
    );
};

export default OpbStockCreateRequest;