import React, { useState, useEffect, useCallback, useMemo } from "react";
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

import { useOrgScope } from "../../../hooks/useOrgScope";
import { getOrgIdFromToken, getUserIdFromToken } from "../../../utils/auth";
import {
  addKitchenCaptainReceipeMaster,
  getAllRawMaterialItems,
  getAllRawMaterialUnits,
  getAllSubOutlets,
  getKitchenCaptainReceipeById,
} from "../../../services/apiServices";
import SearchableSelect from "../../../utils/SearchableSelect";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition-all duration-150 focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/15 hover:border-gray-300";

const errorInputCls =
  "w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition-all duration-150 focus:border-red-500 focus:ring-2 focus:ring-red-500/15";

const label = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

const ErrorText = ({ children }) =>
  children ? <p className="text-red-500 text-xs mt-1">{children}</p> : null;

const CreateKitchenCaptainRecipe = ({
  open,
  onClose,
  onSuccess,
  initialData = null,
  isViewOnly = false,
  orgId: propOrgId = null,
}) => {
  const {
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    effectiveOutletId,
    units: scopedOutlets,
  } = useOrgScope();

  // Outlet dropdown options:
  // - If Group User: shows all outlets resolved in scope
  // - If Company User: shows only outlets belonging to this company (resolved by useOrgScope)
  const orgOptions = useMemo(() => {
    if (!Array.isArray(scopedOutlets)) return [];

    return scopedOutlets
      .filter((o) => o?.id != null && String(o.id).toUpperCase() !== "ALL")
      .map((unit) => ({
        value: String(unit.id ?? unit.organizationId),
        label: unit.name || unit.organizationName || `Outlet #${unit.id}`,
      }));
  }, [scopedOutlets]);

  const [form, setForm] = useState({
    name: "",
    weight: "",
    rate: "",
    unitId: "",
    outletId: "",
    subOutletId: "",
  });
  const [errors, setErrors] = useState({});
  const [ingredients, setIngredients] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  const [rawMaterialOptions, setRawMaterialOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [subOutletOptions, setSubOutletOptions] = useState([]);

  // Quick add local state
  const [quick, setQuick] = useState({
    rawItemId: "",
    outletId: "",
    qty: "",
    unitId: "",
    unitName: "",
    rate: "",
  });
  const [quickError, setQuickError] = useState("");

  const userId = getUserIdFromToken?.() || 0;

  const availableRawMaterialOptions = useMemo(() => {
    return rawMaterialOptions.filter(
      (material) =>
        !ingredients.some((ing) => String(ing.rawItemId) === String(material.value))
    );
  }, [rawMaterialOptions, ingredients]);

  const fetchSubOutlets = useCallback(async (selectedOutletId) => {
    if (!selectedOutletId) {
      setSubOutletOptions([]);
      return;
    }
    try {
      if (typeof getAllSubOutlets === "function") {
        const res = await getAllSubOutlets(selectedOutletId);
        const list = res?.data?.data?.["Sub Outlet Details"] || res?.data?.data || [];
        setSubOutletOptions(
          list.map((item) => ({
            value: String(item.id),
            label: item.nameEnglish || item.name || item.subOutletName || "",
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load sub-outlets:", err);
      setSubOutletOptions([]);
    }
  }, []);

  const fetchRawMaterials = useCallback(async () => {
    try {
      const res = await getAllRawMaterialItems(0, 0, true, "");
      const list = res?.data?.data?.["Raw Material Details"] || [];
      setRawMaterialOptions(
        list.map((item) => ({
          value: String(item.id),
          label: item.nameEnglish || "",
          unitId: item.unitId ?? item.unit?.id,
          unitName: item.unit?.nameEnglish || item.unitName || "",
          rate: item.supplierRate ?? item.rate ?? 0,
          vendorPriceConfigs: item.vendorPriceConfigs || [],
        }))
      );
    } catch (err) {
      console.error("Failed to load raw materials:", err);
    }
  }, []);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await getAllRawMaterialUnits();
      const list = res?.data?.data?.["Unit Details"] || [];
      setUnitOptions(
        list.map((item) => ({
          value: String(item.id),
          label: item.nameEnglish || "",
          symbol: item.symbolEnglish || "",
          status: item.isActive ? "Active" : "Inactive",
        }))
      );
    } catch (err) {
      console.error("Failed to load units:", err);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchRawMaterials();
      fetchUnits();
    }
  }, [open, fetchRawMaterials, fetchUnits]);

  const populateRecipeData = useCallback(
    (data) => {
      if (!data) return;

      // In edit mode: pick the outlet ID saved with the recipe
      let targetOutletId = "";
      if (isOutletUser) {
        targetOutletId = String(effectiveOutletId || getOrgIdFromToken() || "");
      } else {
        targetOutletId = data.orgId ? String(data.orgId) : data.outletId ? String(data.outletId) : "";
      }

      const subOutletVal =
        data.subOutletId && Number(data.subOutletId) !== 0 ? String(data.subOutletId) : "";

      setForm({
        name: data.name || "",
        weight: data.weight ?? "",
        rate: data.rate ?? "",
        unitId: data.unitId ? String(data.unitId) : "",
        outletId: targetOutletId,
        subOutletId: subOutletVal,
      });

      if (targetOutletId) {
        fetchSubOutlets(targetOutletId);
      }

      const itemsList = data.krawMaterial || data.rawItems || data.rawMaterial || [];

      setIngredients(
        itemsList.map((ri) => ({
          id: ri.id || -1,
          rawItemId: String(ri.rawItemId),
          name: ri.rawItemName || ri.name || "",
          unitId: ri.unitId ? String(ri.unitId) : "",
          unitName: ri.unitName || "",
          qty: ri.qty ?? 0,
          rate: ri.rate ?? 0,
        }))
      );
    },
    [isOutletUser, effectiveOutletId, fetchSubOutlets]
  );

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      const recipeId = typeof initialData === "object" ? initialData.id : initialData;

      if (initialData.krawMaterial && Array.isArray(initialData.krawMaterial)) {
        populateRecipeData(initialData);
      } else if (recipeId && typeof getKitchenCaptainReceipeById === "function") {
        setLoadingRecipe(true);
        getKitchenCaptainReceipeById(recipeId)
          .then((res) => {
            const recipeData = res?.data?.data || res?.data;
            populateRecipeData(recipeData || initialData);
          })
          .catch((err) => {
            console.error("Failed to fetch recipe by ID:", err);
            populateRecipeData(initialData);
          })
          .finally(() => {
            setLoadingRecipe(false);
          });
      } else {
        populateRecipeData(initialData);
      }
    } else {
      // Create Mode:
      // Outlet users get their current outlet pre-filled (invisible in UI).
      // Company or Group users start empty so they can choose from the options.
      const initialOutlet = isOutletUser
        ? String(effectiveOutletId || getOrgIdFromToken() || "")
        : "";

      setForm({
        name: "",
        weight: "",
        rate: "",
        unitId: "",
        outletId: initialOutlet,
        subOutletId: "",
      });

      if (initialOutlet) {
        fetchSubOutlets(initialOutlet);
      }

      setIngredients([]);
      setSubOutletOptions([]);
    }

    setErrors({});
    setFilterText("");
    setQuick({
      rawItemId: "",
      outletId: isOutletUser ? String(effectiveOutletId || getOrgIdFromToken() || "") : "",
      qty: "",
      unitId: "",
      unitName: "",
      rate: "",
    });
  }, [
    initialData,
    open,
    populateRecipeData,
    isOutletUser,
    effectiveOutletId,
    fetchSubOutlets,
  ]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "outletId") {
      setForm((prev) => ({ ...prev, outletId: value, subOutletId: "" }));
      fetchSubOutlets(value);
      setQuick((prev) => ({ ...prev, outletId: value }));
    }
  };

  const resolveOutletPrice = (material, targetOutletId) => {
    if (!material) return 0;
    if (!targetOutletId) return material.rate ?? 0;

    for (const vendor of material.vendorPriceConfigs || []) {
      const outletPrices = vendor.outletPrices || [];
      if (outletPrices.length > 0) {
        const found = outletPrices.find(
          (op) =>
            String(op.organizationId || op.outletId) === String(targetOutletId) &&
            String(op.status || vendor.status || "").toUpperCase() === "APPROVED"
        );
        if (found && found.price != null) {
          return Number(found.price);
        }
      } else if (
        String(vendor.organizationId) === String(targetOutletId) &&
        String(vendor.status || "").toUpperCase() === "APPROVED"
      ) {
        return Number(vendor.price ?? 0);
      }
    }

    return material.rate ?? 0;
  };

  const handleSelectRawMaterial = (e) => {
    const id = e.target.value;
    const material = rawMaterialOptions.find((m) => String(m.value) === String(id));
    const activeOutlet = quick.outletId || form.outletId;
    const resolvedPrice = resolveOutletPrice(material, activeOutlet);

    setQuick((prev) => ({
      ...prev,
      rawItemId: id,
      unitId: material?.unitId ? String(material.unitId) : "",
      unitName: material?.unitName || "",
      rate: resolvedPrice !== undefined ? String(resolvedPrice) : "",
    }));
    setQuickError("");
  };

  const handleSelectQuickOutlet = (e) => {
    const selectedOutletId = e.target.value;
    const material = rawMaterialOptions.find((m) => String(m.value) === String(quick.rawItemId));
    const resolvedPrice = resolveOutletPrice(material, selectedOutletId);

    setQuick((prev) => ({
      ...prev,
      outletId: selectedOutletId,
      rate: resolvedPrice !== undefined ? String(resolvedPrice) : prev.rate,
    }));
    setQuickError("");
  };

  const handleAddIngredient = () => {
    if (!quick.rawItemId) return setQuickError("Select a raw material");
    if (!quick.qty || Number(quick.qty) <= 0) return setQuickError("Enter a valid weight/qty");

    if (ingredients.some((i) => String(i.rawItemId) === String(quick.rawItemId))) {
      return setQuickError("This ingredient is already added");
    }

    const material = rawMaterialOptions.find((m) => String(m.value) === String(quick.rawItemId));
    setIngredients((prev) => [
      ...prev,
      {
        id: -1,
        rawItemId: quick.rawItemId,
        name: material?.label || "",
        unitId: quick.unitId,
        unitName: quick.unitName,
        qty: quick.qty,
        rate: quick.rate !== "" ? Number(quick.rate) : (material?.rate ?? 0),
      },
    ]);

    setQuick({
      rawItemId: "",
      outletId: form.outletId || (isOutletUser ? String(effectiveOutletId || getOrgIdFromToken() || "") : ""),
      qty: "",
      unitId: "",
      unitName: "",
      rate: "",
    });
    setQuickError("");
    if (errors.ingredients) setErrors((prev) => ({ ...prev, ingredients: "" }));
  };

  const handleResetQuick = () => {
    setQuick({
      rawItemId: "",
      outletId: form.outletId || (isOutletUser ? String(effectiveOutletId || getOrgIdFromToken() || "") : ""),
      qty: "",
      unitId: "",
      unitName: "",
      rate: "",
    });
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

    // Non-outlet users MUST select an outlet
    if (!isOutletUser && !form.outletId) {
      errs.outletId = "Outlet selection is required";
    }

    if (ingredients.length === 0) errs.ingredients = "Add at least one ingredient";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);

      // Outlet user uses effectiveOutletId/token; Company or Group user uses chosen form.outletId
      const targetOrgId = isOutletUser
        ? Number(effectiveOutletId || getOrgIdFromToken() || 0)
        : Number(form.outletId);

      const payload = {
        id: initialData?.id ? Number(initialData.id) : -1,
        name: form.name.trim(),
        orgId: targetOrgId,
        rate: Number(form.rate),
        rawItems: ingredients.map((ing) => ({
          id: ing.id && Number(ing.id) > 0 ? Number(ing.id) : -1,
          qty: Number(ing.qty),
          rate: Number(ing.rate),
          rawItemId: Number(ing.rawItemId),
          unitId: Number(ing.unitId),
        })),
        subOutletId: form.subOutletId ? Number(form.subOutletId) : 0,
        unitId: Number(form.unitId),
        userid: Number(userId) || 0,
        weight: Number(form.weight),
      };

      await addKitchenCaptainReceipeMaster(payload);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      setErrors((prev) => ({ ...prev, submit: "Failed to save recipe" }));
    } finally {
      setSaving(false);
    }
  };

  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(filterText.trim().toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="bg-blue-50 rounded-xl p-2.5">
              <UtensilsCrossed size={20} className="text-[#084E92]" />
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
          {loadingRecipe ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500">
              <RefreshCw className="animate-spin mb-2 text-[#084E92]" size={24} />
              <p className="text-sm">Loading recipe details...</p>
            </div>
          ) : (
            <>
              {/* Basic Info */}
              <div className="border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    onWheel={e => e.currentTarget.blur()}
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
                    onWheel={e => e.currentTarget.blur()}
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

              {/* Outlet & Sub-Outlet Selection (Outlet is HIDDEN for Outlet Users) */}
              <div
                className={`border border-gray-200 rounded-xl p-4 bg-gray-50/50 grid gap-4 ${
                  !isOutletUser ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                }`}
              >
                {!isOutletUser && (
                  <div>
                    <label className={label}>Unit*</label>
                    <SearchableSelect
                      name="outletId"
                      value={form.outletId}
                      onChange={handleFormChange}
                      options={orgOptions}
                      placeholder={
                        isCompanyUser ? "Select Company Unit" : "Select Unit"
                      }
                      disabled={isViewOnly}
                      hasError={!!errors.outletId}
                      isClearable={true}
                    />
                    <ErrorText>{errors.outletId}</ErrorText>
                  </div>
                )}

                {/* <div>
                  <label className={label}>Sub Outlet</label>
                  <SearchableSelect
                    name="subOutletId"
                    value={form.subOutletId}
                    onChange={handleFormChange}
                    options={subOutletOptions}
                    placeholder={
                      form.outletId || isOutletUser
                        ? "Select Sub Outlet"
                        : "Select Outlet first"
                    }
                    disabled={isViewOnly || (!form.outletId && !isOutletUser)}
                    isClearable={true}
                  />
                </div> */}
              </div>

              {/* Quick Add Ingredient */}
              {!isViewOnly && (
                <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[#084E92] font-semibold text-sm mb-3">
                    <Zap size={16} />
                    Quick Add Ingredient
                  </div>
                  <div
                    className={`grid gap-3 items-end ${
                      !isOutletUser
                        ? "grid-cols-1 md:grid-cols-[1.5fr_1.2fr_100px_100px_110px_auto_auto]"
                        : "grid-cols-1 md:grid-cols-[2fr_120px_120px_130px_auto_auto]"
                    }`}
                  >
                    <div>
                      <label className="block text-xs font-semibold text-[#084E92] uppercase mb-1">
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

                    {!isOutletUser && (
                      <div>
                        <label className="block text-xs font-semibold text-[#084E92] uppercase mb-1">
                          Unit (Fetch Rate)
                        </label>
                        <SearchableSelect
                          name="quickOutletId"
                          value={quick.outletId}
                          onChange={handleSelectQuickOutlet}
                          options={orgOptions}
                          placeholder="Select Unit"
                          isClearable={true}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-[#084E92] uppercase mb-1">
                        Weight
                      </label>
                      <input
                        type="number"
                        value={quick.qty}
                        onWheel={e => e.currentTarget.blur()}
                        onChange={(e) => setQuick((prev) => ({ ...prev, qty: e.target.value }))}
                        placeholder="Weight"
                        className={`${inputCls} h-10.5`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#084E92] uppercase mb-1">
                        Unit
                      </label>
                      <input
                        value={quick.unitName || "Auto"}
                        disabled
                        className={`${inputCls} h-10.5 bg-gray-100 text-gray-500 cursor-not-allowed`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#084E92] uppercase mb-1">
                        Rate (₹)
                      </label>
                      <input
                        type="number"
                        value={quick.rate}
                        onWheel={e => e.currentTarget.blur()}
                        onChange={(e) => setQuick((prev) => ({ ...prev, rate: e.target.value }))}
                        placeholder="Rate"
                        className={`${inputCls} h-10.5`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="bg-[#00376C] text-white cursor-pointer rounded-lg px-4 h-10.5 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#002750] transition-colors"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={handleResetQuick}
                      className="border border-gray-200 bg-white cursor-pointer rounded-lg h-10.5 w-10.5 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                  <ErrorText>{quickError}</ErrorText>
                </div>
              )}

              {/* Ingredients Table */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Recipe Ingredients
                  </span>
                  <div className="relative w-64">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      placeholder="Filter ingredients..."
                      className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm bg-white outline-none focus:border-[#084E92]"
                    />
                  </div>
                </div>

                {ingredients.length > 0 && (
                  <div className="grid grid-cols-[40px_1fr_120px_100px_110px_70px] px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 bg-gray-100/70">
                    <span>#</span>
                    <span>Ingredient Name</span>
                    <span>Unit</span>
                    <span>Qty / Wt</span>
                    <span>Rate</span>
                    <span className="text-right">Act</span>
                  </div>
                )}

                {filteredIngredients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="bg-gray-200 rounded-full p-4 mb-3">
                      <Archive size={22} className="text-gray-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      No ingredients added yet
                    </p>
                    <p className="text-sm text-gray-500">
                      Use the Quick Add section above to build your recipe.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white divide-y divide-gray-100">
                    {filteredIngredients.map((ing, idx) => (
                      <div
                        key={`${ing.rawItemId}-${idx}`}
                        className="grid grid-cols-[40px_1fr_120px_100px_110px_70px] items-center px-4 py-2.5 text-sm"
                      >
                        <span className="text-gray-500">{idx + 1}</span>
                        <span className="text-gray-800 font-semibold capitalize">
                          {ing.name}
                        </span>
                        <span className="text-gray-500">{ing.unitName}</span>
                        <input
                          type="number"
                          value={ing.qty}
                          disabled={isViewOnly}
                          onChange={(e) =>
                            handleIngredientFieldChange(idx, "qty", e.target.value)
                          }
                          onWheel={e => e.currentTarget.blur()}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-[#084E92]"
                        />
                        <input
                          type="number"
                          value={ing.rate}
                          disabled={isViewOnly}
                          onWheel={e => e.currentTarget.blur()}
                          onChange={(e) =>
                            handleIngredientFieldChange(idx, "rate", e.target.value)
                          }
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-[#084E92] ml-2"
                        />
                        {!isViewOnly && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(idx)}
                              className="text-red-500 cursor-pointer hover:bg-red-50 rounded-lg p-1.5 transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <ErrorText>{errors.ingredients}</ErrorText>
          <ErrorText>{errors.submit}</ErrorText>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-300 cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          {!isViewOnly && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loadingRecipe}
              className="bg-[#00376C] text-white cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-[#002750] disabled:opacity-60 transition"
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

export default CreateKitchenCaptainRecipe;