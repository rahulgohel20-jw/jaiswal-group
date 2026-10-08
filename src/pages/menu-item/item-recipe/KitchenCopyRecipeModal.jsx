import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAllExistingItems,
  getAllRawMaterialUnits,
  getKitchenMenuItemCaptainReceipeByMenuIdAndOrgId,
  getMenuItemRawMaterialByMenuIdAndOrgId,
} from "../../../services/apiServices";
import SearchableSelect from "../../../utils/SearchableSelect";
import { useOrgScope } from "@/hooks/useOrgScope";
import { getOrgIdFromToken } from "../../../utils/auth";
import { notify } from "@/utils/toast";

const normalizeId = (val) => {
  if (val == null || val === "" || val === "undefined" || val === "null") return "";
  if (typeof val === "object") return val.id != null ? String(val.id) : "";
  return String(val).trim();
};

const KitchenCopyRecipeModal = ({
  open,
  onClose,
  onCopy,
  isCaptainRecipe = false,
}) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [ingredients, setIngredients] = useState([]);

  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [allUnits, setAllUnits] = useState([]);

  // Org Scope for Outlet options matching existing logic
  const {
    loading: orgScopeLoading,
    isOutletUser,
    units,
    effectiveOutletId,
  } = useOrgScope();

  const ownOutletId = useMemo(
    () => normalizeId(effectiveOutletId) || normalizeId(getOrgIdFromToken()),
    [effectiveOutletId]
  );

  const outletOptions = useMemo(() => {
    const all = (units || [])
      .filter((u) => u?.id != null && String(u.id).toUpperCase() !== "ALL")
      .map((unit) => ({
        value: String(unit.id),
        label: `${unit.name}${unit.code ? ` (${unit.code})` : ""}`,
      }));

    if (isOutletUser && ownOutletId) {
      const own = all.filter((o) => o.value === ownOutletId);
      return own.length > 0
        ? own
        : [{ value: ownOutletId, label: `Outlet #${ownOutletId}` }];
    }

    return all;
  }, [units, isOutletUser, ownOutletId]);

  // Set default outlet if user is an outlet user
  useEffect(() => {
    if (open && isOutletUser && ownOutletId && !selectedOutletId) {
      setSelectedOutletId(ownOutletId);
    }
  }, [open, isOutletUser, ownOutletId, selectedOutletId]);

  // Normalize unit objects to always have id and nameEnglish
  const normalizeUnit = (u) => {
    if (!u) return null;
    return {
      ...u,
      id: u.id ?? u.unitId,
      nameEnglish:
        u.nameEnglish ||
        u.unitName ||
        u.name ||
        u.unitHierarchy?.nameEnglish ||
        "",
      parentUnit: u.parentUnit ? normalizeUnit(u.parentUnit) : null,
    };
  };

  // 1. Fetch unit list
  useEffect(() => {
    if (!open) return;

    const fetchUnits = async () => {
      try {
        const res = await getAllRawMaterialUnits();
        const rawList =
          res?.data?.data?.["Unit Details"] ||
          res?.data?.["Unit Details"] ||
          res?.data?.data?.units ||
          res?.data?.data ||
          res?.data ||
          [];

        const cleanList = (Array.isArray(rawList) ? rawList : []).map(normalizeUnit);
        setAllUnits(cleanList);
      } catch (error) {
        console.error("Failed to load units", error);
        setAllUnits([]);
      }
    };

    fetchUnits();
  }, [open]);

  // 2. Fetch existing recipes for dropdown (Restored)
  useEffect(() => {
    if (!open) return;

    const fetchRecipes = async () => {
      try {
        setLoadingRecipes(true);
        const res = await getAllExistingItems(isCaptainRecipe);

        const rawData =
          res?.data?.data?.menuItemCaptainReceipes ||
          res?.data?.data?.menuItemCaptainReceipe ||
          res?.data?.data?.kmenuItemCaptainReceipes ||
          res?.data?.data?.kmenuItemCaptainReceipe ||
          res?.data?.data?.menuItemRawMaterials ||
          res?.data?.data?.kmenuItemRawMaterials ||
          res?.data?.data ||
          res?.data ||
          [];

        const list = Array.isArray(rawData) ? rawData : [];

        const mappedRecipes = list.map((item) => {
          const idVal =
            item.menuItemId ??
            item.kmenuItemId ??
            item.id ??
            item.menuItem?.id ??
            "";

          const labelVal =
            item.kmenuItemName ??
            item.menuName ??
            item.nameEnglish ??
            item.name ??
            item.menuItem?.nameEnglish ??
            item.menuItem?.name ??
            `Recipe #${idVal}`;

          return {
            value: String(idVal),
            label: labelVal,
          };
        });

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
  }, [open, isCaptainRecipe]);

  // 3. Fetch ingredients ONLY when BOTH Recipe and Outlet are selected
  useEffect(() => {
    if (!open) return;

    if (!selectedRecipeId || !selectedOutletId) {
      setIngredients([]);
      setSelectedIngredients([]);
      return;
    }

    const fetchIngredients = async () => {
      try {
        setLoadingIngredients(true);

        if (isCaptainRecipe) {
          const res = await getKitchenMenuItemCaptainReceipeByMenuIdAndOrgId(
            Number(selectedRecipeId),
            Number(selectedOutletId),
            true
          );

          const data =
            res?.data?.data?.menuItemCaptainReceipes ||
            res?.data?.data?.menuItemCaptainReceipe ||
            res?.data?.data?.kmenuItemCaptainReceipes ||
            res?.data?.data?.kmenuItemCaptainReceipe ||
            res?.data?.data?.menuItemRawMaterials ||
            res?.data?.data ||
            res?.data ||
            [];

          const list = Array.isArray(data) ? data : [];

          const mappedIngredients = list
            .filter(
              (entry) =>
                entry.kcaptainReceipeMaster ||
                entry.captainReceipeMaster ||
                entry.captainRecipe
            )
            .map((entry) => {
              const master =
                entry.kcaptainReceipeMaster ||
                entry.captainReceipeMaster ||
                entry.captainRecipe ||
                {};

              const unitId = entry.unitId ?? master?.unitId ?? null;

              const matchedUnit = allUnits.find(
                (u) => String(u.id) === String(unitId)
              );

              const resolvedUnit =
                matchedUnit ||
                (unitId
                  ? normalizeUnit({
                      id: unitId,
                      nameEnglish:
                        entry.unitName ||
                        entry.unitHierarchy?.nameEnglish ||
                        master?.unitName ||
                        master?.unitHierarchy?.nameEnglish ||
                        "",
                      parentUnit:
                        entry.unitHierarchy?.parentUnit ||
                        master?.unitHierarchy?.parentUnit ||
                        null,
                    })
                  : null);

              const weightVal =
                entry.weight !== null && entry.weight !== undefined
                  ? entry.weight
                  : (master.weight ?? 0);

              const rateVal = Number(
                entry.rate !== null && entry.rate !== undefined
                  ? entry.rate
                  : (master.rate ?? 0)
              );

              return {
                id: entry.id,
                captainRecipeId: master.id,
                captainReceipeId: master.id,
                name: master.name ?? entry.kmenuItemName ?? `Captain Recipe #${master.id || entry.id}`,
                category: master.category ?? entry.category ?? "",
                weight: weightVal,
                unit: resolvedUnit,
                unitId: unitId ? String(unitId) : "",
                venue: entry.venue || "At Venue",
                rate: rateVal,
              };
            });

          setIngredients(mappedIngredients);
        } else {
          const res = await getMenuItemRawMaterialByMenuIdAndOrgId(
            Number(selectedRecipeId),
            Number(selectedOutletId),
            true
          );

          const data =
            res?.data?.data?.menuItemRawMaterials ||
            res?.data?.data?.kmenuItemRawMaterials ||
            res?.data?.data ||
            [];

          const list = Array.isArray(data) ? data : [];

          const mappedIngredients = list.map((item) => {
            const rawMat = item.rawMaterial || {};
            const rawUnit = item.unit
              ? normalizeUnit(item.unit)
              : rawMat.unit
              ? normalizeUnit(rawMat.unit)
              : null;

            const unitIdVal = rawUnit?.id ?? item.unitId ?? rawMat.unitId ?? "";

            return {
              id: item.id ?? item.rawMaterialId ?? rawMat.id,
              rawMaterialId: item.rawMaterialId ?? rawMat.id,
              name: rawMat.nameEnglish || item.name || `Material #${rawMat.id || item.id}`,
              category:
                rawMat.rawMaterialCat?.nameEnglish ||
                item.category ||
                "",
              weight: item.weight ?? 0,
              unit: rawUnit,
              unitId: unitIdVal ? String(unitIdVal) : "",
              venue: item.venue || "At Venue",
              visible: item.isVisible ?? true,
              rate: Number(item.rate ?? rawMat.supplierRate ?? 0),
            };
          });

          setIngredients(mappedIngredients);
        }

        setSelectedIngredients([]);
      } catch (error) {
        console.error("Failed to load recipe ingredients", error);
        setIngredients([]);
        notify.error("Failed to load ingredients for this outlet");
      } finally {
        setLoadingIngredients(false);
      }
    };

    fetchIngredients();
  }, [open, selectedRecipeId, selectedOutletId, isCaptainRecipe, allUnits]);

  // Sync unit objects as soon as allUnits finishes loading
  useEffect(() => {
    if (allUnits.length === 0 || ingredients.length === 0) return;

    setIngredients((prev) =>
      prev.map((item) => {
        if (!item.unitId) return item;
        const matched = allUnits.find((u) => String(u.id) === String(item.unitId));
        if (matched && (!item.unit || item.unit.nameEnglish !== matched.nameEnglish)) {
          return {
            ...item,
            unit: matched,
          };
        }
        return item;
      })
    );
  }, [allUnits]);

  // Hierarchical Unit Dropdown Resolver
  const getUnitOptions = (ingredientUnit, unitId, unitsList) => {
    if (!Array.isArray(unitsList) || unitsList.length === 0) {
      return ingredientUnit ? [ingredientUnit] : [];
    }

    const currentUnit =
      unitsList.find((u) => String(u.id) === String(unitId || ingredientUnit?.id)) ||
      ingredientUnit;

    if (!currentUnit) {
      return unitsList;
    }

    const parentId = currentUnit.parentUnit?.id ?? null;
    const baseId = parentId ? String(parentId) : String(currentUnit.id);

    const parent = unitsList.find((u) => String(u.id) === baseId);
    const children = unitsList.filter((u) => String(u.parentUnit?.id) === baseId);

    const related = [...(parent ? [parent] : []), ...children];

    const uniqueOptions = related.filter(
      (u, idx, arr) => arr.findIndex((x) => String(x.id) === String(u.id)) === idx
    );

    return uniqueOptions.length > 0 ? uniqueOptions : unitsList;
  };

  const selectedCount = selectedIngredients.length;
  const allSelected =
    ingredients.length > 0 && selectedIngredients.length === ingredients.length;

  const toggleIngredient = (ingredient) => {
    setSelectedIngredients((prev) =>
      prev.includes(ingredient.id)
        ? prev.filter((id) => id !== ingredient.id)
        : [...prev, ingredient.id]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIngredients([]);
    } else {
      setSelectedIngredients(ingredients.map((item) => item.id));
    }
  };

  const updateWeight = (id, value) => {
    setIngredients((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, weight: value } : item
      )
    );
  };

  const updateUnit = (id, chosenUnit) => {
    setIngredients((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              unit: chosenUnit,
              unitId: chosenUnit?.id ? String(chosenUnit.id) : item.unitId,
            }
          : item
      )
    );
  };

  useEffect(() => {
    if (!open) {
      setSelectedRecipeId("");
      setSelectedOutletId("");
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
      outletId: selectedOutletId,
      ingredients: selectedItems,
    });

    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-206.25 rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex h-18.75 items-center justify-between border-b border-gray-200 px-6">
          <div className="flex items-center gap-3">
            <Copy size={22} strokeWidth={2} className="text-[#003b73]" />
            <h2 className="text-[20px] font-semibold text-[#003b73]">
              {isCaptainRecipe ? "Copy Captain Recipe" : "Copy Recipe"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
          >
            <X size={21} />
          </button>
        </div>

        {/* Row 1: Recipe & Outlet Selection */}
        <div className="border-b border-gray-200 px-6 py-5 bg-gray-50/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Recipe Selection */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                Select Recipe <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                name="recipeId"
                value={selectedRecipeId}
                onChange={(e) => {
                  const val =
                    typeof e === "string" || typeof e === "number"
                      ? String(e)
                      : e?.target?.value ?? e?.value ?? "";
                  setSelectedRecipeId(val);
                  setIngredients([]);
                  setSelectedIngredients([]);
                }}
                options={recipes}
                placeholder={
                  loadingRecipes ? "Loading recipes..." : "Select recipe"
                }
                disabled={loadingRecipes}
              />
            </div>

            {/* 2. Unit Selection */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                Select Unit <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                name="outletId"
                value={selectedOutletId}
                onChange={(e) => {
                  const val =
                    typeof e === "string" || typeof e === "number"
                      ? String(e)
                      : e?.target?.value ?? e?.value ?? "";
                  setSelectedOutletId(val);
                  setIngredients([]);
                  setSelectedIngredients([]);
                }}
                options={outletOptions}
                placeholder={
                  orgScopeLoading ? "Loading units..." : "Select unit"
                }
                disabled={orgScopeLoading || (isOutletUser && Boolean(ownOutletId))}
              />
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[52px_1fr_138px_115px] items-center border-b border-gray-200 bg-gray-100 px-2 py-3">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={toggleAll}
              disabled={ingredients.length === 0}
              className={`flex h-4.75 w-4.75 items-center justify-center rounded border transition cursor-pointer ${
                allSelected
                  ? "border-[#00447c] bg-[#00447c]"
                  : "border-gray-300 bg-white"
              }`}
            >
              {allSelected && <Check size={14} className="text-white" />}
            </button>
          </div>

          <div className="text-[13px] font-semibold tracking-wide text-gray-600">
            {isCaptainRecipe ? "Captain Recipe Item" : "Ingredient Name"}
          </div>

          <div className="text-[13px] font-semibold tracking-wide text-gray-600">
            Weight
          </div>

          <div className="text-[13px] font-semibold tracking-wide text-gray-600">
            Unit
          </div>
        </div>

        {/* Ingredients List */}
        <div className="max-h-71.25 overflow-y-auto">
          {loadingIngredients ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Loading items...
            </div>
          ) : ingredients.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              {!selectedRecipeId
                ? "Please select a recipe"
                : !selectedOutletId
                ? "Please select an outlet to view items"
                : "No items found for this recipe and outlet"}
            </div>
          ) : (
            ingredients.map((ingredient) => {
              const isSelected = selectedIngredients.includes(ingredient.id);
              const availableUnits = getUnitOptions(
                ingredient.unit,
                ingredient.unitId,
                allUnits
              );

              const currentUnitName =
                ingredient.unit?.nameEnglish ||
                allUnits.find((u) => String(u.id) === String(ingredient.unitId))
                  ?.nameEnglish;

              return (
                <div
                  key={ingredient.id}
                  className={`grid grid-cols-[52px_1fr_138px_115px] items-center border-b border-gray-100 px-2 py-3 transition ${
                    isSelected ? "bg-[#f7f9fc]" : "bg-white"
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => toggleIngredient(ingredient)}
                      className={`flex h-4.75 w-4.75 items-center justify-center rounded border transition cursor-pointer ${
                        isSelected
                          ? "border-[#00447c] bg-[#00447c]"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check size={14} className="text-white" />}
                    </button>
                  </div>

                  {/* Name */}
                  <div className="text-[14px] text-gray-800 pr-2 truncate">
                    <span className="font-medium">{ingredient.name}</span>
                    {ingredient.category && (
                      <span className="ml-2 text-xs text-gray-400">
                        ({ingredient.category})
                      </span>
                    )}
                  </div>

                  {/* Weight */}
                  <div className="pr-3">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={ingredient.weight ?? ""}
                      onChange={(e) =>
                        updateWeight(ingredient.id, e.target.value)
                      }
                      className="h-8.75 w-25.75 rounded-md border border-gray-200 bg-white px-3 text-right text-[14px] text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                    />
                  </div>

                  {/* Unit Dropdown */}
                  <div>
                    <Select
                      value={ingredient.unitId ? String(ingredient.unitId) : ""}
                      onValueChange={(selectedId) => {
                        const chosen = allUnits.find(
                          (u) => String(u.id) === String(selectedId)
                        );
                        updateUnit(ingredient.id, chosen);
                      }}
                    >
                      <SelectTrigger className="h-8.75 w-26.5 rounded-md border-gray-200 text-[13px]">
                        <SelectValue placeholder="Unit">
                          {currentUnitName || "Unit"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        className="z-99999 min-w-26"
                      >
                        {availableUnits.map((unit) => (
                          <SelectItem key={String(unit.id)} value={String(unit.id)}>
                            {unit.nameEnglish || `Unit ${unit.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex h-18.5 items-center justify-between border-t border-gray-200 px-6 bg-white">
          <div className="flex items-center gap-2 text-[14px] text-gray-600">
            <span className="flex h-6.5 min-w-6.5 items-center justify-center rounded-full bg-[#003b73] px-2 text-[12px] text-white">
              {selectedCount}
            </span>
            <span>items selected</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9.75 rounded-md border border-gray-300 bg-white px-5 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleCopy}
              className="flex h-9.75 items-center gap-2 rounded-md bg-[#00447c] px-5 text-sm font-medium text-white hover:bg-[#003763] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Copy size={17} />
              {isCaptainRecipe ? "Copy Captain Recipes" : "Copy Ingredients"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenCopyRecipeModal;