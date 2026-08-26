import React, { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getAllExistingRawItems, getAllRawMaterialUnits, getMenuItemCaptainReceipeByMenuId, getMenuItemRawMaterialByMenuId } from "../../../services/apiServices";
import { getOrgIdFromToken, getUserIdFromToken } from "../../../utils/auth";
import SearchableSelect from "../../../utils/SearchableSelect";
import { notify } from "@/utils/toast";
const CopyRecipeModal = ({
    open,
    onClose,
    onCopy,
    isCaptainRecipe = false,
}) => {
    const [selectedRecipeId, setSelectedRecipeId] = useState("");
    const [selectedIngredients, setSelectedIngredients] = useState([]);
    const [ingredients, setIngredients] = useState([]);

    const [recipes, setRecipes] = useState([]);
    const [loadingRecipes, setLoadingRecipes] = useState(false);
    const [loadingIngredients, setLoadingIngredients] = useState(false);
    const [allUnits, setAllUnits] = useState([]);

    const orgId = getOrgIdFromToken();
    const userId = getUserIdFromToken();

    useEffect(() => {
        if (!open) return;

        const fetchUnits = async () => {
            try {
                const res = await getAllRawMaterialUnits();
                const data = res?.data?.data ?? res?.data ?? [];
                setAllUnits(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to load units", error);
                setAllUnits([]);
            }
        };

        fetchUnits();
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const fetchRecipes = async () => {
            try {
                setLoadingRecipes(true);

                const res = await getAllExistingRawItems(isCaptainRecipe);
                const data =
                    res?.data?.data?.ItemDetails ||
                    res?.data?.ItemDetails ||
                    [];
                const mappedRecipes = Array.isArray(data)
                    ? data.map((item) => ({
                        value: String(item.menuItemId),
                        label: item.menuName,
                    }))
                    : [];
                setRecipes(mappedRecipes);
            } catch (error) {
                console.error("Failed to load existing recipes", error);
                setRecipes([]);
                notify.error("Failed to load recipes");
            } finally {
                setLoadingRecipes(false);
            }
        };

        fetchRecipes();
    }, [open, orgId, isCaptainRecipe]);


    useEffect(() => {
        if (!open || !selectedRecipeId) return;

        const fetchIngredients = async () => {
            try {
                setLoadingIngredients(true);

                if (isCaptainRecipe) {
                    const res = await getMenuItemCaptainReceipeByMenuId(selectedRecipeId, false);

                    const data =
                        res?.data?.data?.["menuItemRawMaterials"] ||
                        res?.data?.data ||
                        [];

                    const list = Array.isArray(data) ? data : [];

                    // Show each captain-recipe assignment itself as a row (not its
                    // nested rawMaterial ingredients).
                    const mappedIngredients = list
                        .filter((entry) => entry.captainReceipeMaster)
                        .map((entry) => {
                            const master = entry.captainReceipeMaster;
                            const unitId = entry.unitId ?? master?.unitId ?? "";
                            const matchedUnit = allUnits.find(
                                (u) => String(u.id) === String(unitId)
                            );

                            return {
                                id: entry.id,
                                captainReceipeId: master?.id,
                                name: master?.name ?? "",
                                category: entry.category ?? "",
                                weight: entry.weight ?? 0,
                                unit:
                                    matchedUnit ??
                                    (entry.unitName || entry.unitHierarchy?.nameEnglish
                                        ? {
                                            id: unitId,
                                            nameEnglish:
                                                entry.unitName || entry.unitHierarchy?.nameEnglish,
                                        }
                                        : null),
                                unitId,
                                rate: Number(entry.rate ?? master?.rate ?? 0),
                            };
                        });

                    setIngredients(mappedIngredients);
                } else {
                    const res = await getMenuItemRawMaterialByMenuId(selectedRecipeId, false);

                    const data =
                        res?.data?.data?.["menuItemRawMaterials"] ||
                        res?.data?.data ||
                        [];

                    const list = Array.isArray(data) ? data : [];

                    const mappedIngredients = list.map((item) => ({
                        id: item.rawMaterialId ?? item.rawMaterial?.id,
                        rawMaterialId: item.rawMaterialId ?? item.rawMaterial?.id,
                        name: item.rawMaterial?.nameEnglish ?? item.name ?? "",
                        category:
                            item.rawMaterial?.rawMaterialCat?.nameEnglish ??
                            item.category ??
                            "",
                        weight: item.weight ?? 0,
                        unit: item.unit ?? null,
                        unitId: item.unit?.id ?? "",
                        rate: Number(item.rate ?? 0),
                    }));

                    setIngredients(mappedIngredients);
                }

                setSelectedIngredients([]);
            } catch (error) {
                console.error("Failed to load recipe ingredients", error);
                setIngredients([]);
                notify.error("Failed to load ingredients");
            } finally {
                setLoadingIngredients(false);
            }
        };

        fetchIngredients();
    }, [open, selectedRecipeId, isCaptainRecipe, orgId, userId]);

    const getUnitOptions = (ingredientUnit, allUnits) => {
        if (!ingredientUnit || !Array.isArray(allUnits) || allUnits.length === 0) {
            return ingredientUnit ? [ingredientUnit] : [];
        }

        const parent = ingredientUnit.parentUnit
            ? allUnits.find((u) => u.id === ingredientUnit.parentUnit.id)
            : null;

        const baseId = parent ? parent.id : ingredientUnit.id;
        const children = allUnits.filter((u) => u.parentUnit?.id === baseId);

        const options = [
            ...(parent ? [parent] : []),
            allUnits.find((u) => u.id === baseId) ?? ingredientUnit,
            ...children,
        ];

        return options.filter(
            (u, idx, arr) => arr.findIndex((x) => x.id === u.id) === idx
        );
    };

    const selectedCount = selectedIngredients.length;

    const allSelected =
        ingredients.length > 0 &&
        selectedIngredients.length === ingredients.length;

    const toggleIngredient = (ingredient) => {


        setSelectedIngredients((prev) => {
            if (prev.includes(ingredient.id)) {
                return prev.filter((id) => id !== ingredient.id);
            }

            return [...prev, ingredient.id];
        });
    };
    const toggleAll = () => {
        if (allSelected) {
            setSelectedIngredients([]);
        } else {
            setSelectedIngredients(
                ingredients.map((item) => item.id)
            );
        }
    };

    const updateWeight = (id, value) => {
        setIngredients((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        weight: value,
                    }
                    : item
            )
        );
    };

    const updateUnit = (id, value) => {
        setIngredients((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        unit: value,
                    }
                    : item
            )
        );
    };
    useEffect(() => {
        if (!open) {
            setSelectedRecipeId("");
            setSelectedIngredients([]);
            setIngredients([]);
            setRecipes([]);
        }
    }, [open]);
    const handleCopy = () => {
        const selectedItems = ingredients.filter((item) =>
            selectedIngredients.includes(item.id)
        );

        onCopy?.({
            recipeId: selectedRecipeId,
            ingredients: selectedItems,
        });

        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-206.25 rounded-2xl bg-white shadow-2xl">

                {/* Header */}
                <div className="flex h-18.75 items-center justify-between border-b border-gray-200 px-6">
                    <div className="flex items-center gap-3">
                        <Copy
                            size={22}
                            strokeWidth={2}
                            className="text-[#003b73]"
                        />

                        <h2 className="text-[20px] font-semibold text-[#003b73]">
                            {isCaptainRecipe ? "Copy Captain Recipe" : "Copy Recipe"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                    >
                        <X size={21} />
                    </button>
                </div>

                {/* Recipe Selection */}
                <div className="border-b border-gray-200 px-6 py-6">
                    <label className="mb-2 block text-[12px] font-semibold text-gray-600">
                        Select Recipe to Copy From
                    </label>

                    <SearchableSelect
                        name="recipeId"
                        value={selectedRecipeId}
                        onChange={(e) => {
                            setSelectedRecipeId(e.target.value);

                            // Reset ingredients when recipe changes
                            setIngredients([]);
                            setSelectedIngredients([]);
                        }}
                        options={recipes}
                        placeholder={
                            loadingRecipes
                                ? "Loading recipes..."
                                : "Select recipe"
                        }
                        disabled={loadingRecipes || recipes.length === 0}
                    />
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-[52px_1fr_138px_105px] items-center border-b border-gray-200 bg-gray-100 px-2 py-3">
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={toggleAll}
                            className={`flex h-4.75 w-4.75 items-center justify-center rounded border ${allSelected
                                ? "border-[#00447c] bg-[#00447c]"
                                : "border-gray-300 bg-white"
                                }`}
                        >
                            {allSelected && (
                                <Check size={14} className="text-white" />
                            )}
                        </button>
                    </div>

                    <div className="text-[13px] font-semibold tracking-wide text-gray-600">
                        Ingredient Name
                    </div>

                    <div className="text-[13px] font-semibold tracking-wide text-gray-600">
                        Weight
                    </div>

                    <div className="text-[13px] font-semibold tracking-wide text-gray-600">
                        Unit
                    </div>
                </div>

                {/* Ingredients */}
                <div className="max-h-71.25 overflow-y-auto">
                    {loadingIngredients ? (
                        <div className="px-4 py-6 text-sm text-gray-500 text-center">
                            Loading ingredients...
                        </div>
                    ) : ingredients.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-gray-500 text-center">
                            No ingredients found for this recipe
                        </div>
                    ) :
                        (ingredients.map((ingredient) => {
                            const isSelected = selectedIngredients.includes(
                                ingredient.id
                            );

                            return (
                                <div
                                    key={ingredient.id}
                                    className={`grid grid-cols-[52px_1fr_138px_105px] items-center border-b border-gray-100 px-2 py-3 ${isSelected ? "bg-[#f7f9fc]" : "bg-white"
                                        }`}
                                >
                                    {/* Checkbox */}
                                    <div className="flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => toggleIngredient(ingredient)}
                                            className={`flex h-4.75 w-4.75 items-center justify-center rounded border ${isSelected
                                                ? "border-[#00447c] bg-[#00447c]"
                                                : "border-gray-300 bg-white"
                                                }`}
                                        >
                                            {isSelected && (
                                                <Check size={14} className="text-white" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Name */}
                                    <div className="text-[14px] text-gray-800">
                                        {ingredient.name}
                                    </div>

                                    {/* Weight */}
                                    <div className="pr-3">

                                        <input
                                            type="number"
                                            value={ingredient.weight}
                                            onChange={(e) =>
                                                updateWeight(
                                                    ingredient.id,
                                                    e.target.value
                                                )
                                            }
                                            className="h-8.75 w-25.75 rounded-md border border-gray-200 bg-white px-3 text-right text-[14px] text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                                        />

                                    </div>

                                    {/* Unit */}
                                    <div>
                                        <Select
                                            value={ingredient.unit?.nameEnglish ?? ""}
                                            onValueChange={(value) => {
                                                const options = getUnitOptions(ingredient.unit, allUnits);
                                                const chosen = options.find((u) => u.nameEnglish === value) ?? ingredient.unit;
                                                updateUnit(ingredient.id, chosen);
                                            }}
                                        >
                                            <SelectTrigger className="h-8.75 w-25 rounded-md border-gray-200 text-[13px]">
                                                <SelectValue placeholder="Unit" />
                                            </SelectTrigger>
                                            <SelectContent
                                                position="popper"
                                                side="bottom"
                                                align="start"
                                                sideOffset={4}
                                                className="z-99999 min-w-21.5"
                                            >
                                                {getUnitOptions(ingredient.unit, allUnits).map((unit) => (
                                                    <SelectItem key={unit.id} value={unit.nameEnglish}>
                                                        {unit.nameEnglish}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            );
                        }))}
                </div>

                {/* Footer */}
                <div className="flex h-18.5 items-center justify-between border-t border-gray-200 px-6">
                    <div className="flex items-center gap-2 text-[14px] text-gray-600">
                        <span className="flex h-6.5 min-w-6.5 items-center justify-center rounded-full bg-[#003b73] px-2 text-[12px] text-white">
                            {selectedCount}
                        </span>

                        <span>
                            ingredients selected
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-9.75 rounded-md border border-gray-300 bg-white px-5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            disabled={selectedCount === 0}
                            onClick={handleCopy}
                            className="flex h-9.75 items-center gap-2 rounded-md bg-[#00447c] px-5 text-sm font-medium text-white hover:bg-[#003763] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Copy size={17} />
                            Copy Ingredients
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CopyRecipeModal;