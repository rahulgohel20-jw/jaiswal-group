import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { notify } from '@/utils/toast';
import { Container } from '@/components/common/container';
import SearchableSelect from '@/utils/SearchableSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router';
import { getAllRawMaterialCategory, getAllRawMaterialItems, getAllSubOutlets, saveOpb } from '@/services/apiServices';
import AddRawMaterialCategoryModal from '../../raw-material/row-material-categories/AddRowMaterialCategoryModel';
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
    const [subUnits, setSubUnits] = useState([]);
    const [subUnitsLoading, setSubUnitsLoading] = useState(false);
    const [category, setCategory] = useState('');
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
            units.map((unit) => ({
                value: String(unit.id),
                label: `${unit.name}${unit.code ? ` (${unit.code})` : ''}`,
            })),
        [units]
    );

    useEffect(() => {
        if (isOutletUser && effectiveOutletId) {
            const outletId = String(effectiveOutletId);
            setOutlet(outletId);
            setSelectedUnitId(effectiveOutletId);
        }
    }, [isOutletUser, effectiveOutletId, setSelectedUnitId]);

    useEffect(() => {
        if (!isOutletUser && selectedUnitId) {
            setOutlet(String(selectedUnitId));
        }
    }, [isOutletUser, selectedUnitId]);

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

    const fetchCategories = useCallback(async () => {
        setCategoriesLoading(true);
        setCategoriesError(null);

        try {
            const res = await getAllRawMaterialCategory(0);
            const raw = res?.data?.data?.['Raw Material Category Details'] || [];
            setCategories(Array.isArray(raw) ? raw.map(mapCategory) : []);
        } catch (err) {
            console.error('Failed to load categories:', err);
            setCategoriesError('Failed to load categories');
            notify.error('Failed to load categories');
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
            setCategory({
                value: String(newCategory.id),
                label: newCategory.nameEnglish || newCategory.categoryName || newCategory.name || '',
            });
        }
    };

    const fetchItems = useCallback(async () => {
        if (!category) {
            setItems([]);
            return;
        }

        setItemsLoading(true);

        try {
            const res = await getAllRawMaterialItems(Number(category), 0, '', '');
            const responseData = res?.data?.data || {};
            const rawItems = responseData['Raw Material Details'] || [];

            const mappedItems = rawItems.map((item) => ({
                id: item.id,
                itemType: 'Raw Material',
                itemName: item.nameEnglish || '',
                category: item.rawMaterialCat?.nameEnglish || item.rawMaterialCategoryName || '',
                unit: item.unit?.nameEnglish || item.unitName || '',
                unitId: item.unitId ?? item.unit?.id ?? null,
                allowedUnits: (item.allowedUnits || []).map((u) => ({
                    id: u.id,
                    name: u.nameEnglish,
                })),
                opbStock: item.opbStock ?? 0,
                minStock: item.minStock ?? 0,
                price: item.supplierRate ?? 0,
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
        setSelectedItems((prev) =>
            prev.map((row) =>
                row.rowId === rowId
                    ? { ...row, [field]: value }
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
            <div className="p-4 md:p-6">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <span>Dashboard</span>
                    <ChevronRight size={12} />
                    <span>Inventory</span>
                    <ChevronRight size={12} />
                    <span className="text-[#084E92] font-medium">
                        OPB Stock Create Request
                    </span>
                </div>

                <h1 className="text-2xl font-bold text-[#0F172A]">
                    OPB Stock Create Request
                </h1>

                <div className="bg-white border border-[#E2E8F0] rounded-2xl mt-4 relative">
                    <div className="px-6 py-4 border-b border-[#E2E8F0]">
                        <span className="font-semibold text-[#0F172A]">
                            Details
                        </span>
                    </div>

                    <div className="px-6 py-5 space-y-5">
                        <div className="grid sm:grid-cols-3 gap-4">
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
                                        value={outlet}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setOutlet(value);
                                            setSelectedUnitId(value);
                                            setSubOutlet('');
                                        }}
                                        placeholder={ 'Select Outlet' }
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
                                    Sub-Outlet
                                </label>

                                <SearchableSelect
                                    className="mt-1.5"
                                    options={subOutletOptions}
                                    value={subOutlet}
                                    onChange={(e) => setSubOutlet(e.target.value)}
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
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600">
                                Select Raw Material Category
                            </label>

                            <div className="flex items-center gap-2 mt-1.5">
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

                                <button
                                    type="button"
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-[#084E92] text-white hover:bg-[#084E92]/90 cursor-pointer"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            {categoriesError && (
                                <p className="text-xs text-red-500 mt-1">
                                    {categoriesError}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-600">
                                Search
                            </label>

                            <SearchableSelect
                                className="mt-1.5"
                                options={itemOptions}
                                value=""
                                onChange={(e) => {
                                    const selectedItem = items.find(
                                        (item) =>
                                            String(item.id) ===
                                            String(e.target.value)
                                    );

                                    if (selectedItem) {
                                        handleAddItem(selectedItem);
                                    }
                                }}
                                disabled={!category || itemsLoading}
                                placeholder={
                                    !category
                                        ? 'Select category first'
                                        : itemsLoading
                                            ? 'Loading items...'
                                            : 'Search Raw Material'
                                }
                            />
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