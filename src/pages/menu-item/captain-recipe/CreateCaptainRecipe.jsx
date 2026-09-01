import { useState, useEffect, useCallback } from "react";
import {
    X,
    Zap,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    Search,
    Archive,
    UtensilsCrossed,
} from "lucide-react";

import SearchableSelect from "../../../utils/SearchableSelect";
import { getOrgIdFromToken } from "../../../utils/auth";
import { addCaptainReceipeMaster, getAllRawMaterialItems, getAllRawMaterialUnits } from "../../../services/apiServices";

const inputCls =
    "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
    "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const errorInputCls =
    "w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
    "placeholder-gray-400 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-300";

const label = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

const ErrorText = ({ children }) =>
    children ? <p className="text-red-500 text-xs mt-1">{children}</p> : null;

const CreateCaptainRecipe = ({ open, onClose, onSuccess, initialData = null, isViewOnly = false }) => {
    const [form, setForm] = useState({ name: "", weight: "", rate: "", unitId: "" });
    const [errors, setErrors] = useState({});
    const [ingredients, setIngredients] = useState([]);
    const [filterText, setFilterText] = useState("");
    const [saving, setSaving] = useState(false);

    const [rawMaterialOptions, setRawMaterialOptions] = useState([]);
    const [unitOptions, setUnitOptions] = useState([]);

    const [quick, setQuick] = useState({ rawItemId: "", qty: "", unitId: "", unitName: "" });
    const [quickError, setQuickError] = useState("");

    const orgId = getOrgIdFromToken() || 0; // adjust to your auth context

    const fetchRawMaterials = useCallback(async () => {
        try {
            const res = await getAllRawMaterialItems(0, 0, true, "");
            const list = res?.data?.data?.["Raw Material Details"] || [];
            setRawMaterialOptions(
                list.map((item) => ({
                    value: item.id,
                    label: item.nameEnglish || "",
                    unitId: item.unitId ?? item.unit?.id,
                    unitName: item.unit?.nameEnglish || item.unitName || "",
                    rate: item.supplierRate,
                }))
            );
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchUnits = useCallback(async () => {
        try {
            const res = await getAllRawMaterialUnits();
            const list = res?.data?.data?.["Unit Details"] || [];
            setUnitOptions(
                list.map((item) => ({
                    value: item.id,
                    label: item.nameEnglish || "",
                    symbol: item.symbolEnglish || "",
                    status: item.isActive ? "Active" : "Inactive",
                }))
            );
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchRawMaterials();
            fetchUnits();
        }
    }, [open, fetchRawMaterials, fetchUnits]);

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || "",
                weight: initialData.weight ?? "",
                rate: initialData.rate ?? "",
                unitId: initialData.unitId ? String(initialData.unitId) : "",
            });
            setIngredients(
                (initialData.rawMaterial || initialData.rawItems || []).map((ri) => ({
                    id: ri.id || 0,
                    rawItemId: ri.rawItemId,
                    name: ri.rawItemName || ri.name || "",
                    unitId: ri.unitId ? String(ri.unitId) : "",
                    unitName: ri.unitName || "",
                    qty: ri.qty,
                    rate: ri.rate,
                }))
            );
        } else {
            setForm({ name: "", weight: "", rate: "", unitId: "" });
            setIngredients([]);
        }
        setErrors({});
        setFilterText("");
        setQuick({ rawItemId: "", qty: "", unitId: "", unitName: "" });
    }, [initialData, open]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleSelectRawMaterial = (e) => {
        const id = e.target.value;
        const material = rawMaterialOptions.find((m) => String(m.value) === String(id));
        setQuick({
            rawItemId: id,
            qty: quick.qty,
            unitId: material?.unitId ? String(material.unitId) : "",
            unitName: material?.unitName || "",
        });
        setQuickError("");
    };

    const handleAddIngredient = () => {
        if (!quick.rawItemId) return setQuickError("Select a raw material");
        if (!quick.qty || Number(quick.qty) <= 0) return setQuickError("Enter a valid quantity");
        if (ingredients.some((i) => String(i.rawItemId) === String(quick.rawItemId))) {
            return setQuickError("This ingredient is already added");
        }
        const material = rawMaterialOptions.find((m) => String(m.value) === String(quick.rawItemId));
        setIngredients((prev) => [
            ...prev,
            {
                id: 0,
                rawItemId: quick.rawItemId,
                name: material?.label || "",
                unitId: quick.unitId,
                unitName: quick.unitName,
                qty: quick.qty,
                rate: material?.rate ?? 0,
            },
        ]);
        setQuick({ rawItemId: "", qty: "", unitId: "", unitName: "" });
        setQuickError("");
        if (errors.ingredients) setErrors((prev) => ({ ...prev, ingredients: "" }));
    };

    const handleResetQuick = () => {
        setQuick({ rawItemId: "", qty: "", unitId: "", unitName: "" });
        setQuickError("");
    };

    const handleIngredientFieldChange = (index, field, value) => {
        setIngredients((prev) =>
            prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
        );
    };

    const handleRemoveIngredient = (index) => {
        setIngredients((prev) => prev.filter((_, i) => i !== index));
    };

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = "Recipe name is required";
        if (form.weight === "" || Number(form.weight) <= 0) errs.weight = "Weight is required";
        if (form.rate === "" || Number(form.rate) <= 0) errs.rate = "Rate is required";
        if (!form.unitId) errs.unitId = "Recipe unit is required";
        if (ingredients.length === 0) errs.ingredients = "Add at least one ingredient";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        try {
            setSaving(true);
            const payload = {
                id: initialData?.id || -1,
                name: form.name.trim(),
                orgId,
                rate: Number(form.rate),
                unitId: Number(form.unitId),
                weight: Number(form.weight),
                rawItems: ingredients.map((ing) => ({
                    id: ing.id || -1,
                    qty: Number(ing.qty),
                    rate: Number(ing.rate),
                    rawItemId: Number(ing.rawItemId),
                    unitId: Number(ing.unitId),
                })),
            };
            await addCaptainReceipeMaster(payload);
            onSuccess?.();
            onClose?.();
        } catch (err) {
            console.error(err);
            setErrors((prev) => ({ ...prev, submit: "Failed to save recipe" }));
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const filteredIngredients = ingredients.filter((ing) =>
        ing.name.toLowerCase().includes(filterText.trim().toLowerCase())
    );
    const availableRawMaterialOptions = rawMaterialOptions.filter(
        (m) => !ingredients.some((ing) => String(ing.rawItemId) === String(m.value))
    );
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-50 rounded-xl p-2.5">
                            <UtensilsCrossed size={20} className="text-blue-700" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {initialData ? "Update Captain Recipe" : "New Captain Recipe"}
                            </h2>
                            <p className="text-sm text-gray-500">
                                Build your recipe by adding raw materials with quantity, weight &amp; rate.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 cursor-pointer hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Recipe basic info */}
                    <div className="border border-gray-200 rounded-xl p-4 grid grid-cols-4 gap-4">
                        <div>
                            <label className={label}>Recipe Name*</label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleFormChange}
                                disabled={isViewOnly}
                                placeholder="Enter recipe name"
                                className={errors.name ? errorInputCls : inputCls}
                            />
                            <ErrorText>{errors.name}</ErrorText>
                        </div>
                        <div>
                            <label className={label}>Weight*</label>
                            <input
                                name="weight"
                                type="number"
                                value={form.weight}
                                onChange={handleFormChange}
                                disabled={isViewOnly}
                                placeholder="0.00"
                                className={errors.weight ? errorInputCls : inputCls}
                            />
                            <ErrorText>{errors.weight}</ErrorText>
                        </div>
                        <div>
                            <label className={label}>Rate*</label>
                            <input
                                name="rate"
                                type="number"
                                value={form.rate}
                                onChange={handleFormChange}
                                disabled={isViewOnly}
                                placeholder="₹ 0.00"
                                className={errors.rate ? errorInputCls : inputCls}
                            />
                            <ErrorText>{errors.rate}</ErrorText>
                        </div>
                        <div>
                            <label className={label}>Recipe Unit*</label>
                            <SearchableSelect
                                name="unitId"
                                value={form.unitId}
                                onChange={handleFormChange}
                                options={unitOptions}
                                placeholder="Select unit"
                                disabled={isViewOnly}
                                hasError={!!errors.unitId}
                            />
                            <ErrorText>{errors.unitId}</ErrorText>
                        </div>
                    </div>

                    {/* Quick Add Ingredient */}
                    {!isViewOnly && (
                        <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm mb-3">
                                <Zap size={16} />
                                Quick Add Ingredient
                            </div>
                            <div className="grid grid-cols-[1fr_140px_140px_auto_auto] gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">
                                        Raw Material
                                    </label>
                                    <SearchableSelect
                                        name="rawItemId"
                                        value={quick.rawItemId}
                                        onChange={handleSelectRawMaterial}
                                        options={availableRawMaterialOptions}
                                        placeholder="Search materials..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">
                                        Quantity
                                    </label>
                                    <input
                                        type="number"
                                        value={quick.qty}
                                        onChange={(e) => setQuick((prev) => ({ ...prev, qty: e.target.value }))}
                                        placeholder="Qty"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">
                                        Unit
                                    </label>
                                    <SearchableSelect
                                        name="unitId"
                                        value={quick.unitId}
                                        onChange={() => { }}
                                        options={
                                            quick.unitId
                                                ? [{ value: quick.unitId, label: quick.unitName || "Unit" }]
                                                : []
                                        }
                                        placeholder="Auto"
                                        disabled
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddIngredient}
                                    className="bg-[#0b2352] text-white cursor-pointer rounded-lg px-4 h-10.5 text-sm font-medium flex items-center gap-1.5 hover:bg-[#0b2352]/90"
                                >
                                    <Plus size={16} />
                                    Add Ingredient
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetQuick}
                                    className="border border-gray-200 cursor-pointer rounded-lg h-10.5 w-10.5 flex items-center justify-center text-gray-500 hover:bg-white"
                                >
                                    <RefreshCw size={15} />
                                </button>
                            </div>
                            <ErrorText>{quickError}</ErrorText>
                        </div>
                    )}

                    {/* Ingredients table */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                            <span className="text-xs font-semibold text-gray-500 uppercase">
                                Recipe Ingredients
                            </span>
                            <div className="relative w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    placeholder="Filter ingredients..."
                                    className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm bg-white outline-none focus:border-blue-400"
                                />
                            </div>
                        </div>

                        {ingredients.length > 0 && (
                            <div className="grid grid-cols-[40px_1fr_100px_90px_100px_70px] px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 bg-gray-100/70">
                                <span>#</span>
                                <span>Ingredient Name</span>
                                <span>Unit</span>
                                <span>Qty</span>
                                <span>Rate</span>
                                <span>Act</span>
                            </div>
                        )}

                        {filteredIngredients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10">
                                <div className="bg-gray-200 rounded-full p-4 mb-3">
                                    <Archive size={22} className="text-gray-500" />
                                </div>
                                <p className="text-sm font-semibold text-gray-800">No ingredients added yet</p>
                                <p className="text-sm text-gray-500">
                                    Use the Quick Add section above to build your recipe.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white">
                                {filteredIngredients.map((ing, idx) => (
                                    <div
                                        key={`${ing.rawItemId}-${idx}`}
                                        className="grid grid-cols-[40px_1fr_100px_90px_100px_70px] items-center px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm"
                                    >
                                        <span className="text-gray-500">{idx + 1}</span>
                                        <span className="text-gray-800">{ing.name}</span>
                                        <span className="text-gray-500">{ing.unitName}</span>
                                        <input
                                            type="number"
                                            value={ing.qty}
                                            disabled={isViewOnly}
                                            onChange={(e) =>
                                                handleIngredientFieldChange(idx, "qty", e.target.value)
                                            }
                                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-400"
                                        />
                                        <input
                                            type="number"
                                            value={ing.rate}
                                            disabled={isViewOnly}
                                            onChange={(e) =>
                                                handleIngredientFieldChange(idx, "rate", e.target.value)
                                            }
                                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-400 ml-2"
                                        />
                                        {!isViewOnly && (
                                            <button
                                                onClick={() => handleRemoveIngredient(idx)}
                                                className="text-red-500 cursor-pointer hover:bg-red-50 rounded p-1.5 ml-2"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <ErrorText>{errors.ingredients}</ErrorText>
                    <ErrorText>{errors.submit}</ErrorText>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="border border-gray-300 cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    {!isViewOnly && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#0b2352] text-white cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-[#0b2352]/90 disabled:opacity-60"
                        >
                            <Save size={16} />
                            {saving ? "Saving..." : "Save Recipe"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateCaptainRecipe;