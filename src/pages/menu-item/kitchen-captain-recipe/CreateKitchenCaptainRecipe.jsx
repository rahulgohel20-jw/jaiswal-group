import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Search,
  Archive,
  UtensilsCrossed,
  Sparkles,
  Calendar,
  Loader2,
} from "lucide-react";

import { useOrgScope } from "../../../hooks/useOrgScope";
import { getOrgIdFromToken, getUserIdFromToken } from "../../../utils/auth";
import {
  addKitchenCaptainReceipeMaster,
  getAllRawMaterialItems,
  getAllRawMaterial,
  getAllRawMaterialUnits,
  getAllSubOutlets,
  getKitchenCaptainReceipeById,
  getRawMaterialsEffectivePrices,
  getVendorPricesByRawMaterialId,
} from "../../../services/apiServices";
import { formatToDDMMYYYY } from "@/utils/dateUtils";
import SearchableSelect from "../../../utils/SearchableSelect";

const PRICING_METHOD_OPTIONS = [
  { value: "LAST_PURCHASE", label: "Last Purchase" },
  { value: "WEIGHTED_AVERAGE", label: "Average (Weighted)" },
  { value: "LOWEST_PRICE", label: "Min (Lowest Price)" },
  { value: "HIGHEST_PRICE", label: "Max (Highest Price)" },
];

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

  // Pricing & Effective Costing
  const [pricingMethod, setPricingMethod] = useState("LAST_PURCHASE");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [rateLoading, setRateLoading] = useState(false);
  const [calculatingRates, setCalculatingRates] = useState(false);

  const [rawMaterialOptions, setRawMaterialOptions] = useState([]);
  const [rawMaterialPage, setRawMaterialPage] = useState(1);
  const [hasMoreRawMaterials, setHasMoreRawMaterials] = useState(true);
  const [loadingMoreRawMaterials, setLoadingMoreRawMaterials] = useState(false);
  const [rawMaterialsLoading, setRawMaterialsLoading] = useState(false);
  const [unitOptions, setUnitOptions] = useState([]);
  const [subOutletOptions, setSubOutletOptions] = useState([]);

  // Auto-calculated recipe total rate based on ingredients
  const calculatedTotalRate = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const qty = Number(ing.qty || 0);
      const rate = Number(ing.rate || 0);
      const amt = qty * rate;
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [ingredients]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      rate: calculatedTotalRate > 0 ? calculatedTotalRate.toFixed(2) : (prev.rate || "0"),
    }));
  }, [calculatedTotalRate]);

  const captainPerKgRate = useMemo(() => {
    const wt = Number(form.weight || 0);
    if (wt <= 0) return 0;
    return calculatedTotalRate / wt;
  }, [calculatedTotalRate, form.weight]);

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

  const extractRawMaterials = (res) => {
    const payload = res?.data?.data ?? res?.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.["Raw Material Details"])) return payload["Raw Material Details"];
    if (Array.isArray(payload?.rawMaterials)) return payload.rawMaterials;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const fetchRawMaterials = useCallback(async (pageToFetch = 1) => {
    try {
      if (pageToFetch === 1) {
        setRawMaterialsLoading(true);
      } else {
        setLoadingMoreRawMaterials(true);
      }

      let res;
      try {
        res = await getAllRawMaterial(pageToFetch, 20);
      } catch (e) {
        res = await getAllRawMaterialItems(0, 0, true, "", pageToFetch, 20);
      }

      const list = extractRawMaterials(res);

      const newOptions = list.map((item) => ({
        value: String(item.id),
        label: item.nameEnglish || item.name || "",
        unitId: item.unitId ?? item.unit?.id,
        unitName: item.unit?.nameEnglish || item.unitName || "",
        rate: item.supplierRate ?? item.rate ?? 0,
        vendorPriceConfigs: item.vendorPriceConfigs || [],
      }));

      if (pageToFetch === 1) {
        setRawMaterialOptions((prev) => {
          const newIds = new Set(newOptions.map((o) => String(o.value)));
          const kept = prev.filter((o) => !newIds.has(String(o.value)));
          return [...newOptions, ...kept];
        });
      } else {
        setRawMaterialOptions((prev) => {
          const existingIds = new Set(prev.map((o) => String(o.value)));
          const filtered = newOptions.filter((o) => !existingIds.has(String(o.value)));
          return [...prev, ...filtered];
        });
      }

      setRawMaterialPage(pageToFetch);
      setHasMoreRawMaterials(list.length >= 20);
    } catch (err) {
      console.error("Failed to load raw materials:", err);
      if (pageToFetch === 1) setRawMaterialOptions([]);
      setHasMoreRawMaterials(false);
    } finally {
      setRawMaterialsLoading(false);
      setLoadingMoreRawMaterials(false);
    }
  }, []);

  const handleLoadMoreRawMaterials = useCallback(() => {
    if (loadingMoreRawMaterials || rawMaterialsLoading || !hasMoreRawMaterials) return;
    fetchRawMaterials(rawMaterialPage + 1);
  }, [loadingMoreRawMaterials, rawMaterialsLoading, hasMoreRawMaterials, rawMaterialPage, fetchRawMaterials]);

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
          rate: ri.perUnitRate != null && Number(ri.perUnitRate) > 0 ? Number(ri.perUnitRate) : (ri.rate ?? 0),
          perUnitWeight: ri.perUnitWeight ?? 0,
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

  const parseEffectivePriceResponse = (res, rawMatId) => {
    const payload = res?.data?.data ?? res?.data ?? res;
    if (!payload) return null;

    if (Array.isArray(payload)) {
      const matched = payload.find(
        (m) => String(m.rawMaterialId ?? m.materialId ?? m.id) === String(rawMatId)
      ) || payload[0];
      if (matched) {
        const r = matched.effectivePrice ?? matched.effectiveUnitRate ?? matched.rate ?? matched.unitRate ?? matched.price ?? matched.unitPrice ?? matched.cost;
        if (r != null && !isNaN(Number(r)) && Number(r) > 0) return Number(r);
      }
    }

    if (typeof payload === "object") {
      const keyed = payload[rawMatId] ?? payload[String(rawMatId)];
      if (typeof keyed === "number" && keyed > 0) return keyed;
      if (keyed && typeof keyed === "object") {
        const r = keyed.effectivePrice ?? keyed.rate ?? keyed.price ?? keyed.unitPrice;
        if (r != null && !isNaN(Number(r)) && Number(r) > 0) return Number(r);
      }

      const list = payload.effectivePrices || payload.prices || payload.rawMaterials || payload.items || payload.materials;
      if (Array.isArray(list)) {
        const matched = list.find(
          (m) => String(m.rawMaterialId ?? m.materialId ?? m.id) === String(rawMatId)
        ) || list[0];
        if (matched) {
          const r = matched.effectivePrice ?? matched.effectiveUnitRate ?? matched.rate ?? matched.unitRate ?? matched.price ?? matched.unitPrice;
          if (r != null && !isNaN(Number(r)) && Number(r) > 0) return Number(r);
        }
      }

      const directVal = payload.effectivePrice ?? payload.rate ?? payload.price ?? payload.unitPrice;
      if (directVal != null && !isNaN(Number(directVal)) && Number(directVal) > 0) return Number(directVal);
    }

    return null;
  };

  const fetchEffectiveRateForRawMaterial = useCallback(
    async (
      rawMatId,
      targetOutlet = null,
      method = pricingMethod,
      targetToDate = toDate
    ) => {
      if (!rawMatId) return 0;
      setRateLoading(true);
      try {
        const targetOrgId = isOutletUser
          ? Number(effectiveOutletId || getOrgIdFromToken() || 0)
          : Number(targetOutlet || form.outletId || getOrgIdFromToken() || 0);

        const asOf = targetToDate || new Date().toISOString().split("T")[0];

        // 1. Primary endpoint: /api/material-costing/raw-materials/effective-prices
        try {
          const effectivePayload = {
            asOfDate: asOf,
            materialCenterId: 0,
            organizationId: targetOrgId,
            pricingBasis: method,
            rawMaterialIds: [Number(rawMatId)],
            subOutletId: form.subOutletId ? Number(form.subOutletId) : 0,
          };

          let effectiveRes;
          try {
            effectiveRes = await getRawMaterialsEffectivePrices(effectivePayload);
          } catch (firstErr) {
            const altAsOf = formatToDDMMYYYY(asOf);
            if (altAsOf && altAsOf !== asOf) {
              effectiveRes = await getRawMaterialsEffectivePrices({
                ...effectivePayload,
                asOfDate: altAsOf,
              });
            } else {
              throw firstErr;
            }
          }

          const parsedRate = parseEffectivePriceResponse(effectiveRes, rawMatId);
          if (parsedRate != null && parsedRate > 0) {
            return parsedRate;
          }
        } catch (e) {
          console.warn("Effective prices lookup error in captain recipe, trying fallbacks:", e);
        }

        // 2. Fallback: Vendor Price Configurations
        try {
          const vendorRes = await getVendorPricesByRawMaterialId(Number(rawMatId));
          const vendorData = vendorRes?.data?.data ?? vendorRes?.data ?? [];
          const configs = Array.isArray(vendorData?.vendorPriceConfigurations)
            ? vendorData.vendorPriceConfigurations
            : Array.isArray(vendorData)
              ? vendorData
              : [];

          if (configs.length > 0) {
            const validPrices = configs
              .map((c) => Number(c.price ?? c.rate ?? c.unitPrice ?? c.vendorPrice ?? 0))
              .filter((p) => !isNaN(p) && p > 0);

            if (validPrices.length > 0) {
              if (method === "LOWEST_PRICE") return Math.min(...validPrices);
              if (method === "HIGHEST_PRICE") return Math.max(...validPrices);
              if (method === "WEIGHTED_AVERAGE") return Number((validPrices.reduce((a, b) => a + b, 0) / validPrices.length).toFixed(2));
              return validPrices[0];
            }
          }
        } catch {
          // ignore
        }

        // 3. Fallback: Local catalog / resolved outlet price
        const material = rawMaterialOptions.find((m) => String(m.value) === String(rawMatId));
        const resolved = resolveOutletPrice(material, targetOutlet || form.outletId);
        return Number(resolved || 0);
      } catch (err) {
        console.warn("Error resolving effective rate:", err);
        return 0;
      } finally {
        setRateLoading(false);
      }
    },
    [isOutletUser, effectiveOutletId, form.outletId, form.subOutletId, pricingMethod, toDate, rawMaterialOptions]
  );

  const updateAllIngredientRates = useCallback(
    async (method = pricingMethod, curTo = toDate) => {
      if (ingredients.length === 0) return;
      setCalculatingRates(true);
      try {
        const targetOrgId = isOutletUser
          ? Number(effectiveOutletId || getOrgIdFromToken() || 0)
          : Number(form.outletId || getOrgIdFromToken() || 0);

        const asOf = curTo || new Date().toISOString().split("T")[0];
        const rmIds = [
          ...new Set(
            ingredients
              .map((i) => Number(i.rawItemId))
              .filter((id) => !isNaN(id) && id > 0)
          ),
        ];

        if (rmIds.length === 0) return;

        const effectivePayload = {
          asOfDate: asOf,
          materialCenterId: 0,
          organizationId: targetOrgId,
          pricingBasis: method,
          rawMaterialIds: rmIds,
          subOutletId: form.subOutletId ? Number(form.subOutletId) : 0,
        };

        let res;
        try {
          res = await getRawMaterialsEffectivePrices(effectivePayload);
        } catch {
          const altAsOf = formatToDDMMYYYY(asOf);
          if (altAsOf && altAsOf !== asOf) {
            res = await getRawMaterialsEffectivePrices({
              ...effectivePayload,
              asOfDate: altAsOf,
            });
          }
        }

        if (res) {
          setIngredients((prev) =>
            prev.map((ing) => {
              const newRate = parseEffectivePriceResponse(res, ing.rawItemId);
              if (newRate != null && newRate > 0) {
                return {
                  ...ing,
                  rate: newRate,
                };
              }
              return ing;
            })
          );
        }
      } catch (e) {
        console.warn("Failed to bulk update ingredient rates in captain recipe:", e);
      } finally {
        setCalculatingRates(false);
      }
    },
    [ingredients, isOutletUser, effectiveOutletId, form.outletId, form.subOutletId, pricingMethod, toDate]
  );

  const handleSelectRawMaterial = async (e) => {
    const id = e.target.value;
    const material = rawMaterialOptions.find((m) => String(m.value) === String(id));
    const activeOutlet = isOutletUser ? (effectiveOutletId || getOrgIdFromToken()) : quick.outletId;

    setQuick((prev) => ({
      ...prev,
      rawItemId: id,
      unitId: material?.unitId ? String(material.unitId) : "",
      unitName: material?.unitName || "",
      rate: "", // till unit is selected, no price should be fetched
    }));
    setQuickError("");

    // If unit is already selected, fetch rate; otherwise wait until unit is selected
    if (id && activeOutlet) {
      const fetchedRate = await fetchEffectiveRateForRawMaterial(
        id,
        activeOutlet,
        pricingMethod,
        fromDate,
        toDate
      );
      setQuick((prev) => ({
        ...prev,
        rate: fetchedRate != null && fetchedRate > 0 ? String(fetchedRate) : "",
      }));
    }
  };

  const handleSelectQuickOutlet = async (e) => {
    const selectedOutletId = e.target.value;
    setQuick((prev) => ({
      ...prev,
      outletId: selectedOutletId,
      rate: "",
    }));
    setQuickError("");

    // Once unit is selected, fetch rate
    if (quick.rawItemId && selectedOutletId) {
      const fetchedRate = await fetchEffectiveRateForRawMaterial(
        quick.rawItemId,
        selectedOutletId,
        pricingMethod,
        fromDate,
        toDate
      );
      setQuick((prev) => ({
        ...prev,
        rate: fetchedRate != null && fetchedRate > 0 ? String(fetchedRate) : "",
      }));
    }
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
    const totalRate = calculatedTotalRate > 0 ? calculatedTotalRate : Number(form.rate || 0);
    if (totalRate <= 0 && ingredients.length === 0) errs.rate = "Rate is required";
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

      const effectiveRate = calculatedTotalRate > 0 ? Number(calculatedTotalRate.toFixed(2)) : Number(form.rate || 0);
      const wt = Number(form.weight || 0);
      const perKgVal = wt > 0 ? Number((effectiveRate / wt).toFixed(2)) : 0;

      const payload = {
        id: initialData?.id ? Number(initialData.id) : -1,
        name: form.name.trim(),
        orgId: targetOrgId,
        rate: effectiveRate,
        recipeRate: effectiveRate,
        costPerKg: perKgVal,
        costPerPerson: perKgVal,
        rawItems: ingredients.map((ing) => {
          const unitRate = Number(ing.rate || 0);
          const qtyVal = Number(ing.qty || 0);
          const totalAmt = Number((unitRate * qtyVal).toFixed(2));
          return {
            id: ing.id && Number(ing.id) > 0 ? Number(ing.id) : -1,
            qty: qtyVal,
            rate: totalAmt,
            perUnitRate: unitRate,
            perUnitWeight: Number(ing.perUnitWeight || 0),
            rawItemId: Number(ing.rawItemId),
            unitId: Number(ing.unitId),
          };
        }),
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
              <div
                className={`border border-gray-200 rounded-xl p-4 grid gap-4 ${!isOutletUser
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                    : "grid-cols-1 sm:grid-cols-3"
                  }`}
              >
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
                {!isOutletUser && (
                  <div>
                    <label className={label}>Unit / Outlet*</label>
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
              </div>

              {/* Pricing Basis & Date Selection (Above Raw Materials) */}
              <div className="bg-[#F8FAFC] border border-blue-100 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <span>Pricing Basis</span>
                    </label>
                    <select
                      value={pricingMethod}
                      onChange={(e) => setPricingMethod(e.target.value)}
                      disabled={isViewOnly}
                      className="h-10 px-3 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-800 outline-none focus:border-[#084E92] shadow-2xs cursor-pointer"
                    >
                      {PRICING_METHOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {["LOWEST_PRICE", "HIGHEST_PRICE"].includes(pricingMethod) && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                          <Calendar size={12} className="text-[#084E92]" />
                          <span>From Date</span>
                        </label>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="h-10 px-2.5 text-xs border border-gray-200 rounded-xl bg-white outline-none focus:border-[#084E92] shadow-2xs cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" />
                          <span>To Date</span>
                        </label>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="h-10 px-2.5 text-xs border border-gray-200 rounded-xl bg-white outline-none focus:border-[#084E92] shadow-2xs cursor-pointer"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-end pt-5">
                    <button
                      type="button"
                      onClick={() => updateAllIngredientRates(pricingMethod, fromDate, toDate)}
                      disabled={calculatingRates || ingredients.length === 0}
                      className="h-10 px-4 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063b6f] rounded-xl transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Recalculate cost for all raw materials using selected pricing basis"
                    >
                      {calculatingRates ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Calculating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          <span>Recalculate Cost</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Add Ingredient */}
              {!isViewOnly && (
                <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[#084E92] font-semibold text-sm mb-3">
                    Quick Add Ingredient
                  </div>
                  <div
                    className={`grid gap-3 items-end ${!isOutletUser
                      ? "grid-cols-1 md:grid-cols-[1.7fr_1.1fr_85px_85px_95px_105px_auto]"
                      : "grid-cols-1 md:grid-cols-[2fr_90px_90px_100px_110px_auto]"
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
                        placeholder={
                          rawMaterialsLoading && rawMaterialOptions.length === 0
                            ? "Loading materials..."
                            : "Search materials..."
                        }
                        disabled={rawMaterialsLoading && rawMaterialOptions.length === 0}
                        hasMore={hasMoreRawMaterials}
                        loadingMore={loadingMoreRawMaterials}
                        onLoadMore={handleLoadMoreRawMaterials}
                      />
                    </div>

                    {!isOutletUser && (
                      <div>
                        <label className="block text-xs font-semibold text-[#084E92] uppercase mb-1">
                          Unit / Outlet
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
                        <span className="flex items-center gap-1">
                          <span>Rate (₹)</span>
                          {rateLoading && <Loader2 size={11} className="animate-spin text-[#084E92]" />}
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={quick.rate}
                          onWheel={e => e.currentTarget.blur()}
                          onChange={(e) => setQuick((prev) => ({ ...prev, rate: e.target.value }))}
                          placeholder={rateLoading ? "Fetching..." : "Rate"}
                          className={`${inputCls} h-10.5 ${rateLoading ? "pr-7" : ""}`}
                        />
                        {rateLoading && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Loader2 size={12} className="animate-spin text-[#084E92]" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#084E92] uppercase mb-1">
                        Amount (₹)
                      </label>
                      <div className="h-10.5 px-3 flex items-center bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-800">
                        ₹{(Number(quick.qty || 0) * Number(quick.rate || 0)).toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="bg-[#00376C] text-white cursor-pointer rounded-lg px-4 h-10.5 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#002750] transition-colors"
                    >
                      <Plus size={16} />
                      Add
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
                  <div className="grid grid-cols-[36px_1fr_90px_70px_90px_100px_40px] gap-3 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 bg-gray-100/70 items-center">
                    <span>#</span>
                    <span>Ingredient Name</span>
                    <span>Qty / Wt</span>
                    <span className="pl-1">Unit</span>
                    <span>Rate (₹)</span>
                    <span className="text-center">Amount (₹)</span>
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
                    {filteredIngredients.map((ing, idx) => {
                      const amount = (Number(ing.qty || 0) * Number(ing.rate || 0)).toFixed(2);
                      return (
                        <div
                          key={`${ing.rawItemId}-${idx}`}
                          className="grid grid-cols-[36px_1fr_90px_70px_90px_100px_40px] gap-3 items-center px-4 py-2.5 text-sm"
                        >
                          <span className="text-gray-500">{idx + 1}</span>
                          <span className="text-gray-800 font-semibold capitalize truncate pr-1">
                            {ing.name}
                          </span>
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
                          <span className="text-gray-500 text-xs pl-1 font-medium">{ing.unitName || "-"}</span>
                          <input
                            type="number"
                            value={ing.rate}
                            disabled={isViewOnly}
                            onWheel={e => e.currentTarget.blur()}
                            onChange={(e) =>
                              handleIngredientFieldChange(idx, "rate", e.target.value)
                            }
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-[#084E92]"
                          />
                          <span className="text-xs font-bold text-gray-800 text-center">
                            ₹{amount}
                          </span>
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
                      );
                    })}
                  </div>
                )}

                {ingredients.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-[#EFF4FF] border-t border-[#C3C6D1] text-xs font-semibold text-gray-700">
                    <div className="flex flex-wrap items-center gap-5">
                      <span>Total Ingredients: <strong className="text-gray-900">{ingredients.length}</strong></span>
                      <span>Per KG Rate: <strong className="text-emerald-700 font-bold">₹{captainPerKgRate.toFixed(2)}/kg</strong></span>
                      <span>Total Recipe Rate: <strong className="text-[#084E92] font-bold text-sm">₹{calculatedTotalRate.toFixed(2)}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Rate Summary Cards (Below Raw Materials) */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-w-[130px] shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Per KG Rate
                  </span>
                  <span className="text-sm font-bold text-emerald-700 block mt-0.5">
                    ₹{captainPerKgRate.toFixed(2)} / kg
                  </span>
                </div>
                <div className="bg-blue-50/50 border border-[#084E92]/30 rounded-xl px-4 py-2.5 min-w-[140px] shadow-2xs">
                  <span className="text-[10px] font-bold text-[#084E92] uppercase tracking-wider block">
                    Total Recipe Rate
                  </span>
                  <span className="text-base font-extrabold text-[#084E92] block mt-0.5">
                    ₹{calculatedTotalRate.toFixed(2)}
                  </span>
                </div>
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