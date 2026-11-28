import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  X,
  FileText,
  Calendar,
  Building2,
  Tag,
  Loader2,
  UtensilsCrossed,
  Scale,
  Coins,
  ChevronDown,
  ChevronUp,
  ChefHat,
  Plus,
  Trash2,
  Info,
  Sparkles,
  Package,
  Layers,
  Pencil,
  Check,
} from 'lucide-react';
import SearchableSelect from '@/utils/SearchableSelect';
import {
  getRecipeCosting,
  calculateRecipeCosting,
  getRawMaterialUsage,
  getAllRawMaterial,
  getAllRawMaterialItems,
  getAllRawMaterialCategory,
  getRawMaterialByCategory,
} from '@/services/apiServices';
import { notify } from '@/utils/toast';

const resolveItemImage = (item) => {
  if (Array.isArray(item?.files) && item.files.length > 0) {
    const validFiles = item.files.filter((f) => f && f.path);
    if (validFiles.length > 0) {
      return validFiles[validFiles.length - 1].path;
    }
  }
  return item?.recipeImageUrl || item?.imageUrl || item?.image || '';
};

const extractPortionUnitId = (obj) => {
  if (!obj) return null;
  const candidate =
    obj.perPersonConsumptionUnitId ??
    obj.perPersonPortionUnitId ??
    obj.portionUnitId ??
    obj.consumptionUnitId ??
    obj.recipeCostingData?.perPersonConsumptionUnitId ??
    obj.recipeCostingData?.perPersonPortionUnitId ??
    obj.recipeCostingData?.portionUnitId ??
    null;

  return candidate !== null && candidate !== undefined && !isNaN(Number(candidate)) && Number(candidate) > 0
    ? Number(candidate)
    : null;
};

// Formats YYYY-MM-DD -> dd/MM/yyyy for backend Spring requirements
const formatForBackend = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  return dateStr;
};

const RightDrawerRecipeSnapshot = ({
  isOpen,
  onClose,
  item,
  unitId,
  subUnitId,
  unitName,
  subUnitName,
  targetPax = 1,
  onCostingCalculated,
  productionPlanId = 0,
  onUpdateRecipeRawMaterials,
  categoryTypes = [],
  allRawMaterials = [],
  materialsByType = {},
}) => {
  const [loadingCosting, setLoadingCosting] = useState(false);
  const [costingData, setCostingData] = useState(() => item?.recipeCostingData || null);
  const [imageError, setImageError] = useState(false);
  const [expandedCaptainRecipes, setExpandedCaptainRecipes] = useState({});
  const lastCostingKeyRef = useRef('');

  // Local state for recipe raw materials (master recipe + additional RM)
  const [recipeRawMaterials, setRecipeRawMaterials] = useState(() => {
    return Array.isArray(item?.rawMaterials) && item.rawMaterials.length > 0
      ? item.rawMaterials
      : [];
  });

  // Additional RM form state
  const [showAddRM, setShowAddRM] = useState(false);
  const [newRMCatId, setNewRMCatId] = useState('');
  const [newRMId, setNewRMId] = useState('');
  const [newRMName, setNewRMName] = useState('');
  const [newRMQty, setNewRMQty] = useState('');
  const [newRMUom, setNewRMUom] = useState('kg');
  const [newRMUnitId, setNewRMUnitId] = useState(0);
  const [newRMRate, setNewRMRate] = useState(0);
  const [newRMRemarks, setNewRMRemarks] = useState('');

  // Editing state for recipe raw materials
  const [editingRMId, setEditingRMId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Category-based backend raw material extraction
  const [backendCategoryItems, setBackendCategoryItems] = useState([]);
  const [loadingCategoryRM, setLoadingCategoryRM] = useState(false);
  const [snapshotCategoriesList, setSnapshotCategoriesList] = useState([]);

  // Local Master Data states for category types and raw materials if not passed via props
  const [localCategoryTypes, setLocalCategoryTypes] = useState(categoryTypes || []);
  const [localRawMaterials, setLocalRawMaterials] = useState(allRawMaterials || []);

  // Usage Modal state
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageItem, setUsageItem] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageList, setUsageList] = useState([]);

  const currentItemId = item?.kitchenMenuItemId || item?.id;
  const currentItemIdRef = useRef(currentItemId);

  const itemId = item?.kitchenMenuItemId || item?.id || 0;

  const effectiveOrgId =
    Number(unitId) ||
    Number(item?.organizationId) ||
    Number(item?.materialCenterOrgId) ||
    0;

  const effectivePax =
    Number(item?.actualPax) ||
    Number(item?.plannedPax) ||
    Number(targetPax) ||
    Number(item?.recipeCostingData?.scaledPax) ||
    Number(item?.recipeCostingData?.targetPax) ||
    1;

  const portionQty =
    Number(item?.portionQuantity) ||
    Number(item?.recipeCostingData?.perPersonConsumptionQuantity) ||
    Number(item?.perPersonConsumptionQuantity) ||
    Number(item?.portionSize) ||
    1;

  const portionUnitIdVal = extractPortionUnitId(item);
  const rateBasis = item?.rateSource || item?.recipeCostingData?.pricingBasis || 'LAST_PURCHASE';

  const fromDateStr = item?.rateFromDate || '';
  const toDateStr = item?.rateToDate || '';

  const handleCheckUsage = async (rm) => {
    const rmId = rm.rawMaterialId || rm.id;
    setUsageItem(rm);
    setShowUsageModal(true);
    setUsageLoading(true);
    try {
      const res = await getRawMaterialUsage({
        productionPlanId: Number(productionPlanId || 0),
        rawMaterialId: Number(rmId || 0),
      });
      const data = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(data)
        ? data
        : data?.usages || data?.items || (data && typeof data === 'object' && Object.keys(data).length > 0 ? [data] : []);
      setUsageList(list);
    } catch (err) {
      console.warn('Failed to fetch RM usage:', err);
      setUsageList([]);
    } finally {
      setUsageLoading(false);
    }
  };

  const handleStartEditRM = (ing) => {
    const rawId = ing.rawMaterialId || ing.id;
    setEditingRMId(rawId);
    const grossQty =
      ing.convertedIngredientWeight !== undefined && ing.convertedIngredientWeight !== null
        ? Number(ing.convertedIngredientWeight)
        : Number(ing.requiredQty ?? ing.baseIngredientWeight ?? 0);
    setEditQty(grossQty);
    setEditRate(Number(ing.baseUomRate ?? ing.unitRate ?? ing.rate ?? 0));
    setEditRemarks(ing.remarks || '');
  };

  const handleCancelEditRM = () => {
    setEditingRMId(null);
    setEditQty('');
    setEditRate('');
    setEditRemarks('');
  };

  const handleSaveEditRM = (ing) => {
    const qty = Number(editQty);
    if (isNaN(qty) || qty < 0) {
      notify.error('Please enter a valid quantity');
      return;
    }
    const rate = Number(editRate) || 0;
    const cost = Number((qty * rate).toFixed(2));
    const rawId = ing.rawMaterialId || ing.id;

    let updatedList = [];
    setRecipeRawMaterials((prev) => {
      const updated = prev.map((rm) => {
        const match =
          String(rm.rawMaterialId || rm.id) === String(rawId) ||
          (rm.rawMaterialName && ing.rawMaterialName && rm.rawMaterialName.trim().toLowerCase() === ing.rawMaterialName.trim().toLowerCase());
        if (!match) return rm;
        return {
          ...rm,
          requiredQty: qty,
          convertedIngredientWeight: qty,
          baseIngredientWeight: qty,
          unitRate: rate,
          baseUomRate: rate,
          rate: rate,
          totalMaterialCost: cost,
          amount: cost,
          remarks: editRemarks,
          isEdited: true,
        };
      });

      updatedList = updated;
      if (typeof onUpdateRecipeRawMaterials === 'function') {
        onUpdateRecipeRawMaterials(item.id || item.kitchenMenuItemId, updated);
      }
      return updated;
    });

    notify.success(`Updated ${ing.rawMaterialName} quantity and rate.`);
    setEditingRMId(null);

    const currentAdditionals = updatedList.filter((m) => m.materialSource === 'ADDITIONAL_RM');
    if (currentAdditionals.length > 0) {
      recalculateWithAddons(currentAdditionals);
    }
  };

  const recalculateWithAddons = async (additionals) => {
    if (!itemId) {
      console.warn('Cannot calculate recipe costing: itemId is missing');
      return;
    }
    setLoadingCosting(true);
    try {
      const addOnList = (additionals || []).map((m) => ({
        isScaled: true,
        quantity: Number(m.requiredQty ?? m.quantity ?? 0),
        rawMaterialId: Number(m.rawMaterialId ?? m.id ?? 0),
        unitId: Number(m.uomId ?? m.unitId ?? 0),
        unitRate: Number(m.unitRate ?? m.rate ?? 0),
      }));

      const costingPayload = {
        addOnRawMaterials: addOnList,
        asOfDate: formatForBackend(fromDateStr || new Date().toISOString().split('T')[0]),
        customFuelUtilityCost: 0,
        fromDate: formatForBackend(fromDateStr || ''),
        ingredientRateOverrides: [],
        isLpgRequired: true,
        isOtherCostRequired: true,
        isPerPersonConsumptionBasedCalculate: true,
        kitchenMenuItemId: Number(itemId),
        materialCenterOrgId: effectiveOrgId,
        materialCenterSubLocationId: 0,
        materialCenterSubOutletId: Number(subUnitId || 0),
        organizationId: effectiveOrgId,
        perPersonPortionQuantity: portionQty,
        perPersonPortionUnitId: Number(portionUnitIdVal || 0),
        portionSize: 1,
        pricingBasis: rateBasis || 'LAST_PURCHASE',
        subOutletId: Number(subUnitId || 0),
        targetPax: effectivePax,
        targetWeight: Number(item?.targetWeight || 0),
        targetWeightUnitId: Number(item?.targetWeightUnitId || 0),
        toDate: formatForBackend(toDateStr || ''),
      };

      const res = await calculateRecipeCosting(costingPayload);
      const d = res?.data?.data ?? res?.data;
      if (d) {
        setCostingData(d);
        if (typeof onCostingCalculated === 'function') {
          onCostingCalculated(item, d);
        }

        // Response contains all calculated raw materials, including the raw materials added in addOnIngredients / addOnRawMaterials
        const returnedList = Array.isArray(d.ingredients)
          ? d.ingredients
          : Array.isArray(d.materials)
            ? d.materials
            : Array.isArray(d.rawMaterials)
              ? d.rawMaterials
              : Array.isArray(d.items)
                ? d.items
                : [];

        const returnedAddons = Array.isArray(d.addOnIngredients)
          ? d.addOnIngredients
          : Array.isArray(d.addOnRawMaterials)
            ? d.addOnRawMaterials
            : Array.isArray(d.additionalMaterials)
              ? d.additionalMaterials
              : [];

        const allReturned = [...returnedList, ...returnedAddons];

        if (allReturned.length > 0) {
          const additionalsMap = new Map((additionals || []).map((a) => [String(a.rawMaterialId || a.id), a]));
          returnedAddons.forEach((addon) => {
            const idStr = String(addon.rawMaterialId || addon.materialId || addon.id);
            if (!additionalsMap.has(idStr)) {
              additionalsMap.set(idStr, addon);
            }
          });

          setRecipeRawMaterials((prev) => {
            const updated = prev.map((rm) => {
              const matched = allReturned.find(
                (m) =>
                  String(m.rawMaterialId || m.materialId || m.id) === String(rm.rawMaterialId || rm.id) ||
                  (m.rawMaterialName && rm.rawMaterialName && m.rawMaterialName.trim().toLowerCase() === rm.rawMaterialName.trim().toLowerCase())
              );
              if (matched) {
                const isAddOn = Boolean(
                  matched.isAddOn ||
                  rm.materialSource === 'ADDITIONAL_RM' ||
                  additionalsMap.has(String(matched.rawMaterialId || matched.materialId || matched.id))
                );
                const r = Number(
                  matched.baseUomRate ??
                  matched.effectiveUnitRate ??
                  matched.displayUnitRate ??
                  matched.stockUnitRate ??
                  matched.unitRate ??
                  matched.rate ??
                  rm.unitRate ??
                  0
                );
                const q = Number(
                  rm.isEdited
                    ? rm.requiredQty
                    : (matched.convertedIngredientWeight ??
                      matched.displayQty ??
                      matched.baseIngredientWeight ??
                      matched.quantity ??
                      matched.requiredQty ??
                      rm.requiredQty ??
                      0)
                );
                const c = Number(
                  matched.amount ??
                  matched.totalIngredientCost ??
                  matched.totalMaterialCost ??
                  (q * r) ??
                  rm.totalMaterialCost ??
                  0
                );
                return {
                  ...rm,
                  materialSource: isAddOn ? 'ADDITIONAL_RM' : rm.materialSource || 'RECIPE',
                  unitRate: r,
                  baseUomRate: r,
                  rate: r,
                  requiredQty: q,
                  convertedIngredientWeight: q,
                  totalMaterialCost: c,
                  amount: c,
                  uomSymbol: matched.uomSymbol || matched.displayUomSymbol || matched.unitSymbol || matched.uomName || rm.uomSymbol,
                };
              }
              return rm;
            });

            // If any additional RM returned in response wasn't already in prev, append it
            returnedAddons.forEach((retItem) => {
              const retId = String(retItem.rawMaterialId || retItem.materialId || retItem.id);
              const alreadyExists = updated.some(
                (u) =>
                  String(u.rawMaterialId || u.id) === retId ||
                  (u.rawMaterialName && retItem.rawMaterialName && u.rawMaterialName.trim().toLowerCase() === retItem.rawMaterialName.trim().toLowerCase())
              );
              if (!alreadyExists) {
                const addOnDef = additionalsMap.get(retId) || {};
                const r = Number(retItem.baseUomRate ?? retItem.effectiveUnitRate ?? retItem.displayUnitRate ?? retItem.unitRate ?? addOnDef.unitRate ?? 0);
                const q = Number(retItem.convertedIngredientWeight ?? retItem.displayQty ?? retItem.quantity ?? addOnDef.requiredQty ?? 0);
                const c = Number(retItem.amount ?? retItem.totalIngredientCost ?? retItem.totalMaterialCost ?? (q * r));
                updated.push({
                  id: 0,
                  captainRecipeId: 0,
                  productionPlanItemId: Number(item?.id || 0),
                  rawMaterialId: Number(retId),
                  rawMaterialName: retItem.rawMaterialName || retItem.name || addOnDef.rawMaterialName,
                  rawMaterialCode: retItem.rawMaterialCode || '',
                  rawMaterialCatId: Number(retItem.rawMaterialCatId || addOnDef.rawMaterialCatId || 0),
                  mealTypeId: Number(item?.mealTypeId || 0),
                  materialSource: 'ADDITIONAL_RM',
                  requiredQty: q,
                  convertedIngredientWeight: q,
                  baseIngredientWeight: Number(retItem.baseIngredientWeight ?? q),
                  quantityPerPortion: addOnDef.quantityPerPortion || 0,
                  rateSource: item?.rateSource || 'LAST_PURCHASE',
                  unitRate: r,
                  baseUomRate: r,
                  rate: r,
                  totalMaterialCost: c,
                  amount: c,
                  uomId: Number(retItem.uomId || retItem.displayUomId || retItem.unitId || addOnDef.uomId || 0),
                  uomSymbol: retItem.uomSymbol || retItem.displayUomSymbol || retItem.uomName || addOnDef.uomSymbol || 'kg',
                  remarks: retItem.remarks || addOnDef.remarks || '',
                  isScaled: true,
                  isAddOn: true,
                });
              }
            });

            if (typeof onUpdateRecipeRawMaterials === 'function') {
              onUpdateRecipeRawMaterials(item.id || item.kitchenMenuItemId, updated);
            }
            return updated;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to calculate recipe costing with addons:', err);
    } finally {
      setLoadingCosting(false);
    }
  };

  const handleAddRMToRecipe = () => {
    if (!newRMId && !newRMName) {
      notify.error('Please select a raw material');
      return;
    }
    const qty = Number(newRMQty) || 0;
    if (qty <= 0) {
      notify.error('Please enter a valid quantity greater than 0');
      return;
    }
    const rate = Number(newRMRate) || 0;
    const cost = Number((qty * rate).toFixed(2));
    const effectivePax = Number(item?.actualPax || item?.plannedPax || targetPax || 1);
    const perPortion = effectivePax > 0 ? Number((qty / effectivePax).toFixed(4)) : 0;

    const newRM = {
      id: 0,
      captainRecipeId: 0,
      productionPlanItemId: Number(item?.id || 0),
      rawMaterialId: Number(newRMId) || 0,
      rawMaterialName: newRMName || 'Raw Material',
      rawMaterialCatId: Number(newRMCatId) || 0,
      mealTypeId: Number(item?.mealTypeId || 0),
      materialSource: 'ADDITIONAL_RM',
      requiredQty: qty,
      quantityPerPortion: perPortion,
      rateSource: item?.rateSource || 'LAST_PURCHASE',
      unitRate: rate,
      totalMaterialCost: cost,
      uomId: Number(newRMUnitId) || 0,
      uomSymbol: newRMUom || 'kg',
      remarks: newRMRemarks || '',
      isScaled: true,
    };

    // Get current master ingredients from displayIngredients (or recipeRawMaterials)
    const masterIngs = displayIngredients.filter((m) => m.materialSource !== 'ADDITIONAL_RM');
    const existingAdditionals = (recipeRawMaterials || []).filter((m) => m.materialSource === 'ADDITIONAL_RM');
    const allAdditionals = [...existingAdditionals, newRM];
    const updated = [...masterIngs, ...allAdditionals];

    setRecipeRawMaterials(updated);
    if (typeof onUpdateRecipeRawMaterials === 'function') {
      onUpdateRecipeRawMaterials(item.id || item.kitchenMenuItemId, updated);
    }
    notify.success(`${newRMName} added to recipe as Additional Raw Material.`);
    setNewRMId('');
    setNewRMName('');
    setNewRMQty('');
    setNewRMRate(0);
    setNewRMRemarks('');
    setShowAddRM(false);

    recalculateWithAddons(allAdditionals);
  };

  const handleRemoveAdditionalRM = (rmId) => {
    const remainingAdditionals = (recipeRawMaterials || []).filter(
      (m) => m.materialSource === 'ADDITIONAL_RM' && !(m.rawMaterialId === rmId || m.id === rmId)
    );
    const updated = recipeRawMaterials.filter(
      (m) => !(m.materialSource === 'ADDITIONAL_RM' && (m.rawMaterialId === rmId || m.id === rmId))
    );
    setRecipeRawMaterials(updated);
    if (typeof onUpdateRecipeRawMaterials === 'function') {
      onUpdateRecipeRawMaterials(item.id || item.kitchenMenuItemId, updated);
    }
    notify.info('Additional raw material removed from recipe.');
    recalculateWithAddons(remainingAdditionals);
  };

  const snapshotCategories = useMemo(() => {
    const map = new Map();
    (localRawMaterials || []).forEach((m) => {
      const cName = m.categoryName || m.category;
      const cId = m.catId || m.rawMaterialCatId || cName;
      if (cName && !map.has(String(cName).toLowerCase())) {
        map.set(String(cName).toLowerCase(), { id: cId, name: cName });
      }
    });
    (snapshotCategoriesList || []).forEach((c) => {
      if (c.name && !map.has(String(c.name).toLowerCase())) {
        map.set(String(c.name).toLowerCase(), { id: c.id, name: c.name });
      }
    });
    if (map.size === 0 && Array.isArray(localCategoryTypes) && localCategoryTypes.length > 0) {
      localCategoryTypes.forEach((t) => {
        if (t.name) map.set(String(t.name).toLowerCase(), { id: t.id, name: t.name });
      });
    }
    return Array.from(map.values());
  }, [localRawMaterials, snapshotCategoriesList, localCategoryTypes]);

  // Load category masters for snapshot dropdown when open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    getAllRawMaterialCategory()
      .then((res) => {
        const catData = res?.data?.data ?? res?.data ?? [];
        const catArr = Array.isArray(catData)
          ? catData
          : catData?.["Raw Material Category Details"] || catData?.categories || catData?.items || [];
        if (isMounted && Array.isArray(catArr) && catArr.length > 0) {
          setSnapshotCategoriesList(
            catArr.map((c) => ({
              id: c.id || c.rawMaterialCatId,
              name: c.nameEnglish || c.categoryName || c.name || 'Category',
            }))
          );
        }
      })
      .catch((err) => console.warn('getAllRawMaterialCategory error in snapshot:', err));
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Fetch backend raw materials dynamically when category is selected in snapshot via getRawMaterialByCategory API
  useEffect(() => {
    if (!newRMCatId) {
      setBackendCategoryItems([]);
      return;
    }
    let isMounted = true;
    const matchedCat = snapshotCategories.find(
      (c) =>
        String(c.id) === String(newRMCatId) ||
        String(c.name).toLowerCase() === String(newRMCatId).toLowerCase()
    );
    const catId = matchedCat?.id || newRMCatId;
    if (!catId) return;

    const fetchCatItems = async () => {
      setLoadingCategoryRM(true);
      try {
        const res = await getRawMaterialByCategory({ cat_id_list: catId, page: 0, size: 200 });
        const data = res?.data?.data ?? res?.data ?? [];
        const list = Array.isArray(data)
          ? data
          : data?.["Raw Material Details"] || data?.rawMaterials || data?.items || data?.content || [];
        if (isMounted && Array.isArray(list)) {
          const formatted = list.map((item) => {
            const id = item.id || item.rawMaterialId;
            const name = item.nameEnglish || item.rawMaterialName || item.name || item.materialName || 'Item';
            const uomId = item.unit?.id || item.unitId || item.uomId || 0;
            const uomName =
              item.unit?.nameEnglish ||
              item.unit?.name ||
              item.unit?.symbolEnglish ||
              item.uomName ||
              item.unitName ||
              item.baseUom ||
              'kg';
            const rate = item.supplierRate ?? item.rate ?? item.lastPurchaseRate ?? 0;
            return {
              id,
              rawMaterialId: id,
              name,
              rawMaterialName: name,
              categoryName: item.rawMaterialCat?.nameEnglish || item.categoryName || matchedCat?.name || '',
              catId: item.rawMaterialCat?.id || item.rawMaterialCatId || catId,
              rawMaterialCatId: item.rawMaterialCat?.id || item.rawMaterialCatId || catId,
              uomId,
              unitId: uomId,
              uomName,
              unitName: uomName,
              rate,
            };
          });
          setBackendCategoryItems(formatted);
        }
      } catch (err) {
        console.warn('getRawMaterialByCategory error in snapshot:', err);
      } finally {
        if (isMounted) setLoadingCategoryRM(false);
      }
    };
    fetchCatItems();
    return () => {
      isMounted = false;
    };
  }, [newRMCatId, snapshotCategories]);

  const filteredSnapshotRawMaterials = useMemo(() => {
    if (!newRMCatId) return localRawMaterials;
    if (backendCategoryItems.length > 0) return backendCategoryItems;
    const filterLower = String(newRMCatId).toLowerCase();
    return localRawMaterials.filter((m) => {
      const mCatName = String(m.categoryName || m.category || '').toLowerCase();
      const mTypeName = String(m.typeName || '').toLowerCase();
      const mCatId = String(m.catId || m.rawMaterialCatId || '');
      const mTypeId = String(m.typeId || m.rawMaterialCatTypeId || '');
      return (
        mCatId === String(newRMCatId) ||
        mTypeId === String(newRMCatId) ||
        mCatName === filterLower ||
        mCatName.includes(filterLower) ||
        mTypeName === filterLower ||
        mTypeName.includes(filterLower)
      );
    });
  }, [localRawMaterials, newRMCatId, backendCategoryItems]);

  useEffect(() => {
    if (categoryTypes && categoryTypes.length > 0) setLocalCategoryTypes(categoryTypes);
    if (allRawMaterials && allRawMaterials.length > 0) setLocalRawMaterials(allRawMaterials);
  }, [categoryTypes, allRawMaterials]);

  // Load fallback master data if needed
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      if (!allRawMaterials || allRawMaterials.length === 0) {
        const fetchRMs = async () => {
          let list = [];
          try {
            const res = await getAllRawMaterialItems(null, 0, true, '', '', '', unitId, subUnitId);
            const raw = res?.data?.data?.['Raw Material Details'] || res?.data?.['Raw Material Details'] || res?.data?.data || res?.data || [];
            list = Array.isArray(raw) ? raw : raw?.content || raw?.items || [];
          } catch (e) {
            console.warn('getAllRawMaterialItems fallback note:', e);
          }
          if (list.length === 0) {
            try {
              const res2 = await getAllRawMaterial(1, 200);
              const raw2 = res2?.data?.data?.['Raw Material Details'] || res2?.data?.data || res2?.data || [];
              list = Array.isArray(raw2) ? raw2 : raw2?.content || raw2?.items || [];
            } catch (e2) {
              console.warn('getAllRawMaterial fallback note:', e2);
            }
          }
          if (isMounted && Array.isArray(list) && list.length > 0) {
            const formatted = list.map((m) => {
              const id = m.id || m.rawMaterialId;
              const name = m.nameEnglish || m.rawMaterialName || m.name || m.materialName || 'Item';
              const catId = m.rawMaterialCat?.id || m.rawMaterialCatId || m.category?.id || m.catId || 0;
              const catName =
                m.rawMaterialCat?.nameEnglish ||
                m.rawMaterialCat?.name ||
                m.rawMaterialCategoryName ||
                m.categoryName ||
                m.category?.nameEnglish ||
                m.category?.name ||
                '';
              const typeId = m.rawMaterialCatType?.id || m.rawMaterialCatTypeId || m.typeId || 0;
              const typeName = m.rawMaterialCatType?.nameEnglish || m.rawMaterialCatType?.name || m.typeName || '';
              const uomId = m.unit?.id || m.unitId || m.uomId || 0;
              const uomName = m.unit?.nameEnglish || m.unit?.name || m.unit?.symbolEnglish || m.uomName || m.unitName || 'kg';
              const rate = m.supplierRate ?? m.rate ?? m.lastPurchaseRate ?? 0;
              return {
                id,
                rawMaterialId: id,
                name,
                rawMaterialName: name,
                categoryName: catName,
                catId,
                rawMaterialCatId: catId,
                typeName,
                typeId,
                uomId,
                uomName,
                rate,
              };
            });
            setLocalRawMaterials(formatted);
          }
        };
        fetchRMs();
      }
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, allRawMaterials, unitId, subUnitId]);

  useEffect(() => {
    setImageError(false);
    setExpandedCaptainRecipes({});

    if (currentItemIdRef.current !== currentItemId) {
      currentItemIdRef.current = currentItemId;
      if (Array.isArray(item?.rawMaterials) && item.rawMaterials.length > 0) {
        setRecipeRawMaterials(item.rawMaterials);
      } else {
        setRecipeRawMaterials([]);
      }
    } else if (Array.isArray(item?.rawMaterials) && item.rawMaterials.length > 0) {
      setRecipeRawMaterials(item.rawMaterials);
    }

    if (item?.recipeCostingData) {
      setCostingData(item.recipeCostingData);
    }
  }, [currentItemId, item?.rawMaterials]);

  // Synchronize master and addon ingredients into recipeRawMaterials when costingData arrives
  useEffect(() => {
    if (!costingData) return;

    const rawIngredients = Array.isArray(costingData.ingredients)
      ? costingData.ingredients
      : Array.isArray(costingData.materials)
        ? costingData.materials
        : Array.isArray(costingData.rawMaterials)
          ? costingData.rawMaterials
          : [];

    const rawAddOns = Array.isArray(costingData.addOnIngredients)
      ? costingData.addOnIngredients
      : Array.isArray(costingData.addOnRawMaterials)
        ? costingData.addOnRawMaterials
        : Array.isArray(costingData.additionalMaterials)
          ? costingData.additionalMaterials
          : [];

    if (rawIngredients.length === 0 && rawAddOns.length === 0) return;

    const effectivePax =
      Number(item?.actualPax) ||
      Number(item?.plannedPax) ||
      Number(targetPax) ||
      Number(costingData.scaledPax) ||
      Number(costingData.targetPax) ||
      1;

    const mapItem = (ing, idx, forceAddOn = false) => {
      const isAddOn = Boolean(ing.isAddOn || forceAddOn);
      const qty = Number(
        ing.convertedIngredientWeight !== undefined && ing.convertedIngredientWeight !== null
          ? ing.convertedIngredientWeight
          : ing.displayQty ?? ing.baseIngredientWeight ?? ing.requiredQty ?? 0
      );
      const rate = Number(
        ing.baseUomRate ??
        ing.effectiveUnitRate ??
        ing.displayUnitRate ??
        ing.stockUnitRate ??
        ing.unitRate ??
        ing.rate ??
        0
      );
      const amount = Number(
        ing.amount ??
        ing.totalIngredientCost ??
        ing.totalMaterialCost ??
        (qty * rate) ??
        0
      );

      return {
        id: typeof ing.id === 'number' ? ing.id : 0,
        captainRecipeId: Number(ing.captainRecipeId || 0),
        productionPlanItemId: Number(item?.id || 0),
        rawMaterialId: Number(ing.rawMaterialId || ing.id || idx + 1),
        rawMaterialName: ing.rawMaterialName || ing.name || 'Ingredient',
        rawMaterialCode: ing.rawMaterialCode || '',
        rawMaterialCatId: Number(ing.rawMaterialCatId || ing.catId || ing.categoryId || 0),
        mealTypeId: Number(item?.mealTypeId || 0),
        materialSource: isAddOn ? 'ADDITIONAL_RM' : 'RECIPE',
        requiredQty: qty,
        convertedIngredientWeight: qty,
        baseIngredientWeight: Number(ing.baseIngredientWeight ?? qty),
        quantityPerPortion: Number(
          ing.perPersonConsumptionQuantity ||
          (effectivePax > 0 ? qty / effectivePax : 0)
        ),
        rateSource: ing.rateSource || item?.rateSource || 'LAST_PURCHASE',
        unitRate: rate,
        baseUomRate: rate,
        rate: rate,
        totalMaterialCost: amount,
        amount: amount,
        uomId: Number(ing.uomId || ing.displayUomId || ing.unitId || 0),
        uomSymbol: ing.uomSymbol || ing.displayUomSymbol || ing.uomName || 'kg',
        remarks: ing.remarks || '',
        isAddOn: isAddOn,
      };
    };

    const derivedMaster = rawIngredients.map((ing, idx) => mapItem(ing, idx, false));
    const derivedAddOns = rawAddOns.map((ing, idx) => mapItem(ing, idx, true));
    const returnedAll = [...derivedMaster, ...derivedAddOns];

    setRecipeRawMaterials((prev) => {
      if (prev && prev.length > 0) {
        const prevMap = new Map(
          prev.map((p) => [String(p.rawMaterialId || p.id), p])
        );

        const updated = returnedAll.map((ret) => {
          const retKey = String(ret.rawMaterialId || ret.id);
          const prevItem = prevMap.get(retKey);
          if (prevItem) {
            if (prevItem.isEdited) {
              const q = Number(prevItem.requiredQty);
              const r = Number(prevItem.unitRate);
              const c = Number((q * r).toFixed(2));
              return {
                ...ret,
                materialSource: prevItem.materialSource || ret.materialSource,
                requiredQty: q,
                convertedIngredientWeight: q,
                baseIngredientWeight: q,
                unitRate: r,
                baseUomRate: r,
                rate: r,
                totalMaterialCost: c,
                amount: c,
                remarks: prevItem.remarks || ret.remarks,
                isEdited: true,
              };
            }
            return {
              ...ret,
              materialSource: prevItem.materialSource === 'ADDITIONAL_RM' ? 'ADDITIONAL_RM' : ret.materialSource,
              remarks: prevItem.remarks || ret.remarks,
            };
          }
          return ret;
        });

        // Retain any locally added additional RM not yet returned by backend
        const returnedIds = new Set(updated.map((u) => String(u.rawMaterialId || u.id)));
        const unreturnedAdditionals = prev.filter(
          (p) => p.materialSource === 'ADDITIONAL_RM' && !returnedIds.has(String(p.rawMaterialId || p.id))
        );

        const finalResult = [...updated, ...unreturnedAdditionals];
        if (typeof onUpdateRecipeRawMaterials === 'function') {
          onUpdateRecipeRawMaterials(item.id || item.kitchenMenuItemId, finalResult);
        }
        return finalResult;
      }

      if (typeof onUpdateRecipeRawMaterials === 'function') {
        onUpdateRecipeRawMaterials(item.id || item.kitchenMenuItemId, returnedAll);
      }
      return returnedAll;
    });
  }, [costingData, item?.id, item?.kitchenMenuItemId]);

  const toggleCaptainRecipeExpand = (crKey) => {
    setExpandedCaptainRecipes((prev) => ({
      ...prev,
      [crKey]: !prev[crKey],
    }));
  };

  useEffect(() => {
    if (!isOpen || !item) {
      setCostingData(null);
      lastCostingKeyRef.current = '';
      return;
    }

    if (!itemId) return;

    const currentKey = `${itemId}_${effectiveOrgId}_${subUnitId || 0}_${effectivePax}_${portionQty}_${rateBasis}_${portionUnitIdVal || 0}_${fromDateStr}_${toDateStr}`;

    // If already calculated or fetched for this exact key, prevent duplicate calls
    if (lastCostingKeyRef.current === currentKey) {
      return;
    }
    lastCostingKeyRef.current = currentKey;

    // If item already has valid recipeCostingData, prime state and return without API call
    if (item.recipeCostingData) {
      setCostingData(item.recipeCostingData);
      const hasIngredients = Array.isArray(item.recipeCostingData.ingredients) && item.recipeCostingData.ingredients.length > 0;
      const hasCaptain = Array.isArray(item.recipeCostingData.captainRecipes) && item.recipeCostingData.captainRecipes.length > 0;
      if (hasIngredients || hasCaptain) {
        return;
      }
    }

    const fetchCosting = async () => {
      setLoadingCosting(true);
      try {
        const queryParams = {
          isLpgRequired: false,
          isOtherCostRequired: false,
          isPerPersonConsumptionBasedCalculate: true,
          materialCenterOrgId: effectiveOrgId,
          organizationId: effectiveOrgId,
          perPersonPortionQuantity: portionQty,
          portionSize: 1,
          pricingBasis: rateBasis,
          targetPax: effectivePax,
          ...(subUnitId && Number(subUnitId) > 0
            ? {
              subOutletId: Number(subUnitId),
              materialCenterSubOutletId: Number(subUnitId),
            }
            : {}),
          ...(portionUnitIdVal ? { perPersonPortionUnitId: Number(portionUnitIdVal) } : {}),
          ...(fromDateStr
            ? {
              fromDate: formatForBackend(fromDateStr),
              toDate: formatForBackend(toDateStr || ''),
            }
            : {}),
        };

        const res = await getRecipeCosting(itemId, queryParams);
        const d = res?.data?.data ?? res?.data;
        if (d) {
          setCostingData(d);
          if (typeof onCostingCalculated === 'function') {
            onCostingCalculated(item, d);
          }
        }
      } catch (err) {
        console.error('Failed to load recipe snapshot costing:', err);
      } finally {
        setLoadingCosting(false);
      }
    };

    fetchCosting();
  }, [
    isOpen,
    item?.kitchenMenuItemId || item?.id,
    item?.portionQuantity,
    item?.actualPax,
    item?.plannedPax,
    item?.rateSource,
    item?.rateFromDate,
    item?.rateToDate,
    unitId,
    subUnitId,
    targetPax,
  ]);

  const activeCostData = costingData || item?.recipeCostingData || null;

  const imageUrl = resolveItemImage(item);
  const ingredientsList = useMemo(() => {
    const list = Array.isArray(activeCostData?.ingredients)
      ? activeCostData.ingredients
      : Array.isArray(item?.ingredients)
        ? item.ingredients
        : Array.isArray(item?.rawMaterials)
          ? item.rawMaterials
          : [];
    const addons = Array.isArray(activeCostData?.addOnIngredients)
      ? activeCostData.addOnIngredients
      : Array.isArray(activeCostData?.addOnRawMaterials)
        ? activeCostData.addOnRawMaterials
        : [];
    return [...list, ...addons];
  }, [activeCostData, item]);

  // Accept the array itself, or any of the likely key names
  const captainRecipesList = (() => {
    const src = activeCostData || item || {};
    if (Array.isArray(src.captainRecipes)) return src.captainRecipes;
    if (Array.isArray(src.captainReceipes)) return src.captainReceipes;
    if (Array.isArray(src.captainRecipeList)) return src.captainRecipeList;
    if (Array.isArray(src.captainRecipeResponses)) return src.captainRecipeResponses;
    if (Array.isArray(costingData)) return costingData;
    return [];
  })();

  const totalIngredientCost =
    activeCostData?.totalIngredientCost !== undefined && activeCostData?.totalIngredientCost !== null
      ? Number(activeCostData.totalIngredientCost).toFixed(2)
      : ingredientsList.length > 0
        ? ingredientsList.reduce((acc, ing) => acc + (Number(ing.amount || ing.totalIngredientCost) || 0), 0).toFixed(2)
        : item?.totalIngredientCost !== undefined && item?.totalIngredientCost !== null
          ? Number(item.totalIngredientCost).toFixed(2)
          : '0.00';

  const displayIngredients = useMemo(() => {
    if (recipeRawMaterials && recipeRawMaterials.length > 0) {
      return recipeRawMaterials;
    }
    return ingredientsList.map((ing, idx) => ({
      id: typeof ing.id === 'number' ? ing.id : 0,
      captainRecipeId: Number(ing.captainRecipeId || 0),
      rawMaterialId: ing.rawMaterialId || ing.id || idx + 1,
      rawMaterialName: ing.rawMaterialName || ing.name || 'Ingredient',
      rawMaterialCatId: Number(ing.rawMaterialCatId || ing.catId || 0),
      materialSource: ing.isAddOn ? 'ADDITIONAL_RM' : (ing.materialSource || 'RECIPE'),
      requiredQty: Number(
        ing.convertedIngredientWeight !== undefined && ing.convertedIngredientWeight !== null
          ? ing.convertedIngredientWeight
          : ing.displayQty ?? ing.baseIngredientWeight ?? ing.requiredQty ?? 0
      ),
      unitRate: Number(ing.baseUomRate || ing.rate || 0),
      totalMaterialCost: Number(ing.amount || ing.totalIngredientCost || 0),
      uomSymbol: ing.uomSymbol || ing.uomName || 'kg',
      uomId: Number(ing.uomId || ing.unitId || 0),
    }));
  }, [recipeRawMaterials, ingredientsList]);

  const effectiveDirectCost = useMemo(() => {
    if (recipeRawMaterials && recipeRawMaterials.length > 0) {
      return recipeRawMaterials
        .reduce((sum, ing) => sum + (Number(ing.totalMaterialCost) || 0), 0)
        .toFixed(2);
    }
    return totalIngredientCost;
  }, [recipeRawMaterials, totalIngredientCost]);

  // Uses totalCost (used amount), not the batch cost
  const totalCaptainRecipeCost =
    activeCostData?.totalCaptainRecipeCost != null
      ? Number(activeCostData.totalCaptainRecipeCost).toFixed(2)
      : captainRecipesList.reduce((acc, cr) => acc + (Number(cr.totalCost) || 0), 0).toFixed(2);

  const totalRecipeCost =
    activeCostData?.totalRecipeCost !== undefined && activeCostData?.totalRecipeCost !== null && recipeRawMaterials.length === 0
      ? Number(activeCostData.totalRecipeCost).toFixed(2)
      : (Number(effectiveDirectCost) + Number(totalCaptainRecipeCost)).toFixed(2);

  const rateSourceDisplay = activeCostData?.pricingBasis || item?.rateSource || 'LAST_PURCHASE';

  // Resolved unit and sub-unit labels with fallback cascade
  const resolvedUnitDisplay =
    unitName ||
    item?.organizationName ||
    activeCostData?.organizationName ||
    (unitId ? `Unit #${unitId}` : '—');

  const resolvedSubUnitDisplay =
    subUnitName ||
    item?.subOutletName ||
    activeCostData?.subOutletName ||
    '';

  // Per Person Data resolution from API response
  const perPersonQty =
    activeCostData?.perPersonConsumptionQuantity !== undefined && activeCostData?.perPersonConsumptionQuantity !== null
      ? Number(activeCostData.perPersonConsumptionQuantity).toFixed(2)
      : item?.portionQuantity !== undefined && item?.portionQuantity !== ''
        ? Number(item.portionQuantity).toFixed(2)
        : activeCostData?.portionSize !== undefined && activeCostData?.portionSize !== null
          ? Number(activeCostData.portionSize).toFixed(2)
          : '—';

  const perPersonUnit =
    activeCostData?.perPersonConsumptionUnitSymbol ||
    item?.perPersonConsumptionUnitSymbol ||
    item?.portionUnitSymbol ||
    'g';

  const costPerPersonVal =
    activeCostData?.costPerPerson !== undefined && activeCostData?.costPerPerson !== null
      ? Number(activeCostData.costPerPerson).toFixed(2)
      : item?.costPerPortion !== undefined && item?.costPerPortion !== null
        ? Number(item.costPerPortion).toFixed(2)
        : '0.00';

  const resolvedTargetPax =
    activeCostData?.scaledPax ??
    activeCostData?.targetPax ??
    item?.actualPax ??
    item?.plannedPax ??
    targetPax ??
    1;

  const resolvedScaledWeight =
    activeCostData?.scaledWeight !== undefined && activeCostData?.scaledWeight !== null
      ? Number(activeCostData.scaledWeight).toFixed(2)
      : activeCostData?.displayScaledWeight !== undefined && activeCostData?.displayScaledWeight !== null
        ? Number(activeCostData.displayScaledWeight).toFixed(2)
        : item?.totalPlannedQty !== undefined && item?.totalPlannedQty !== ''
          ? Number(item.totalPlannedQty).toFixed(2)
          : item?.plannedQty !== undefined && item?.plannedQty !== ''
            ? Number(item.plannedQty).toFixed(2)
            : '—';

  const resolvedWeightUnit =
    activeCostData?.scaledWeightUnitSymbol ||
    activeCostData?.displayScaledWeightUnitSymbol ||
    activeCostData?.uomSymbol ||
    item?.scaledWeightUnitSymbol ||
    item?.uomSymbol ||
    item?.unitSymbol ||
    item?.unitName ||
    'kg';

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#084E92]" />
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {item.itemName} – Recipe Snapshot
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-gray-700 flex-1">
          {/* Card Top Banner with Menu Item Image */}
          <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50 flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-gray-100 border border-slate-200/80 overflow-hidden flex items-center justify-center shrink-0">
              {imageUrl && !imageError ? (
                <img
                  src={imageUrl}
                  alt={item.itemName || 'Menu Item'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-50 text-[#084E92]">
                  <UtensilsCrossed size={20} />
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">{item.itemName}</h4>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#084E92] font-semibold text-[10px]">
                  Kitchen Menu Item
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[10px]">
                  {item.categoryName}
                </span>
              </div>
            </div>
          </div>

          {/* Key Indicators */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="border border-gray-100 bg-gray-50/40 rounded-xl p-2.5">
              <span className="text-[10px] text-gray-400 font-semibold flex items-center justify-center gap-1">
                <Tag size={10} /> Rate Source
              </span>
              <span className="font-bold text-gray-800 mt-0.5 block truncate" title={rateSourceDisplay}>
                {rateSourceDisplay}
              </span>
            </div>

            <div className="border border-gray-100 bg-gray-50/40 rounded-xl p-2.5">
              <span className="text-[10px] text-gray-400 font-semibold flex items-center justify-center gap-1">
                <Building2 size={10} /> Unit
              </span>
              <span className="font-bold text-gray-800 mt-0.5 block truncate" title={resolvedUnitDisplay}>
                {resolvedUnitDisplay}
              </span>
              {resolvedSubUnitDisplay && (
                <span className="text-[10px] text-slate-500 block truncate" title={resolvedSubUnitDisplay}>
                  {resolvedSubUnitDisplay}
                </span>
              )}
            </div>

            <div className="border border-gray-100 bg-gray-50/40 rounded-xl p-2.5">
              <span className="text-[10px] text-gray-400 font-semibold flex items-center justify-center gap-1">
                <Calendar size={10} /> Target PAX
              </span>
              <span className="font-bold text-gray-800 mt-0.5 block">
                {resolvedTargetPax} PAX
              </span>
            </div>

            <div className="border border-gray-100 bg-gray-50/40 rounded-xl p-2.5">
              <span className="text-[10px] text-gray-400 font-semibold flex items-center justify-center gap-1">
                <Scale size={10} /> Planned Qty
              </span>
              <span className="font-bold text-gray-800 mt-0.5 block">
                {resolvedScaledWeight} {resolvedWeightUnit}
              </span>
            </div>
          </div>

          {/* A. Ingredients Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-gray-900 text-xs">A. Ingredients Breakdown</h5>
              {loadingCosting && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Loader2 size={11} className="animate-spin text-[#084E92]" />
                  Loading rates...
                </span>
              )}
            </div>

            {/* Direct Ingredients Sub-table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                  <UtensilsCrossed size={12} className="text-[#084E92]" />
                  Direct Raw Materials ({displayIngredients.length})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-500">
                    Subtotal: ₹{effectiveDirectCost}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddRM(!showAddRM)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-[#084E92] bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
                  >
                    <Plus size={11} />
                    Add Additional RM
                  </button>
                </div>
              </div>

              {/* Add Additional RM Form */}
              {showAddRM && (
                <div className="p-3.5 bg-gradient-to-br from-blue-50/70 to-slate-50 border border-blue-200/80 rounded-xl space-y-3 animate-in fade-in duration-150 shadow-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#084E92]" />
                      Add Additional Raw Material to Recipe
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddRM(false)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 rounded"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* Row 1: Category Filter & Raw Material */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-5">
                      <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                        Category Filter
                      </label>
                      <SearchableSelect
                        value={newRMCatId}
                        onChange={(e) => {
                          setNewRMCatId(e.target.value);
                          setNewRMId('');
                          setNewRMName('');
                        }}
                        options={[
                          { value: '', label: 'All Categories' },
                          ...snapshotCategories.map((cat) => ({
                            value: String(cat.id || cat.name),
                            label: cat.name,
                          })),
                        ]}
                        placeholder="All Categories"
                        className="w-full text-xs"
                      />
                    </div>

                    <div className="sm:col-span-7">
                      <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                        Raw Material <span className="text-rose-500">*</span>
                      </label>
                      <SearchableSelect
                        value={newRMId}
                        loading={loadingCategoryRM}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewRMId(val);
                          const matched = filteredSnapshotRawMaterials.find(
                            (m) => String(m.id || m.rawMaterialId) === String(val)
                          );
                          if (matched) {
                            setNewRMName(matched.rawMaterialName || matched.name);
                            setNewRMCatId(matched.catId || matched.rawMaterialCatId || newRMCatId || 0);
                            setNewRMUom(matched.uomName || matched.unitName || matched.uomSymbol || 'kg');
                            setNewRMUnitId(matched.uomId || matched.unitId || 0);
                            setNewRMRate(matched.rate || 0);
                          } else {
                            setNewRMName('');
                            setNewRMUom('kg');
                            setNewRMUnitId(0);
                            setNewRMRate(0);
                          }
                        }}
                        options={filteredSnapshotRawMaterials.map((m) => ({
                          value: String(m.id || m.rawMaterialId),
                          label: `${m.rawMaterialName || m.name}${m.uomName || m.unitName || m.uomSymbol ? ` (${m.uomName || m.unitName || m.uomSymbol})` : ''}`,
                        }))}
                        placeholder={loadingCategoryRM ? "Loading items..." : "Select Raw Material..."}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>

                  {/* Row 2: Quantity */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-12">
                      <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                        Quantity <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Qty"
                          value={newRMQty}
                          onChange={(e) => setNewRMQty(e.target.value)}
                          className="w-full h-8 pl-2.5 pr-12 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:border-[#084E92] focus:outline-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {newRMUom || 'kg'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-blue-100/60">
                    <button
                      type="button"
                      onClick={() => setShowAddRM(false)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRMToRecipe}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#084E92] text-white hover:bg-[#063c70] transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      Add to Recipe
                    </button>
                  </div>
                </div>
              )}

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2 px-3 text-left">Ingredient</th>
                      <th className="py-2 px-3 text-left">Gross Qty</th>
                      <th className="py-2 px-3 text-left">Base UOM Rate</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayIngredients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                          {loadingCosting ? 'Fetching ingredient costs...' : 'No ingredients found for this recipe.'}
                        </td>
                      </tr>
                    ) : (
                      displayIngredients.map((ing, idx) => {
                        const isAdditional = ing.materialSource === 'ADDITIONAL_RM';
                        const rawId = ing.rawMaterialId || ing.id || idx;
                        const isEditing = String(editingRMId) === String(rawId);
                        const grossQtyVal =
                          ing.convertedIngredientWeight !== undefined && ing.convertedIngredientWeight !== null
                            ? Number(ing.convertedIngredientWeight)
                            : Number(ing.requiredQty ?? ing.baseIngredientWeight ?? 0);
                        const unitRateVal = Number(ing.baseUomRate ?? ing.unitRate ?? ing.rate ?? 0);
                        const amountVal = Number(ing.amount ?? ing.totalMaterialCost ?? ing.totalIngredientCost ?? 0);

                        return (
                          <tr
                            key={ing.rawMaterialId || ing.id || idx}
                            className={`hover:bg-slate-50/50 transition ${isEditing ? 'bg-blue-50/40' : ''}`}
                          >
                            <td className="py-2 px-3 font-medium text-slate-800">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{ing.rawMaterialName}</span>
                                {isAdditional ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Additional RM
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-[#084E92] border border-blue-200">
                                    Master Recipe
                                  </span>
                                )}
                                {ing.isEdited && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    Edited
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-gray-500">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={editQty}
                                    onChange={(e) => setEditQty(e.target.value)}
                                    className="h-7 w-20 px-1.5 rounded-lg border border-[#084E92] bg-white text-xs font-semibold text-right focus:outline-none"
                                    autoFocus
                                  />
                                  <span className="text-[10px] text-gray-500 font-medium">{ing.uomSymbol || 'kg'}</span>
                                </div>
                              ) : (
                                `${grossQtyVal.toFixed(3)} ${ing.uomSymbol || 'kg'}`
                              )}
                            </td>
                            <td className="py-2 px-3 text-gray-500">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">₹</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editRate}
                                    onChange={(e) => setEditRate(e.target.value)}
                                    className="h-7 w-16 px-1.5 rounded-lg border border-[#084E92] bg-white text-xs font-semibold text-right focus:outline-none"
                                  />
                                  <span className="text-[10px] text-gray-500">/ {ing.uomSymbol || 'kg'}</span>
                                </div>
                              ) : (
                                `₹${unitRateVal.toFixed(2)} / ${ing.uomSymbol || 'kg'}`
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-gray-800">
                              {isEditing ? (
                                `₹${((Number(editQty) || 0) * (Number(editRate) || 0)).toFixed(2)}`
                              ) : (
                                `₹${amountVal.toFixed(2)}`
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditRM(ing)}
                                    className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition cursor-pointer"
                                    title="Save changes"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditRM}
                                    className="p-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditRM(ing)}
                                    className="p-1 text-slate-400 hover:text-[#084E92] hover:bg-blue-50 rounded transition cursor-pointer"
                                    title="Edit quantity and rate"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCheckUsage(ing)}
                                    className="p-1 text-slate-400 hover:text-[#084E92] hover:bg-blue-50 rounded transition cursor-pointer"
                                    title="Check where this raw material is used across plan"
                                  >
                                    <Info size={13} />
                                  </button>
                                  {isAdditional && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAdditionalRM(ing.rawMaterialId || ing.id)}
                                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
                                      title="Remove additional raw material"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}

                    <tr className="bg-blue-50/50 font-bold text-[#084E92]">
                      <td colSpan={3} className="py-2.5 px-3">
                        Total {captainRecipesList.length > 0 ? 'Direct ' : ''}Ingredient Cost
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ₹{effectiveDirectCost}
                      </td>
                      <td className="py-2.5 px-3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Captain Sub-Recipes Breakdown */}
            {captainRecipesList.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                    <ChefHat size={13} className="text-purple-600" />
                    Captain Sub-Recipes ({captainRecipesList.length})
                  </span>
                  <span className="text-[10px] font-semibold text-purple-700">
                    Subtotal: ₹{totalCaptainRecipeCost}
                  </span>
                </div>

                <div className="border border-purple-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-[11px]">
                    <thead className="bg-purple-50/60 text-purple-900 font-semibold border-b border-purple-100">
                      <tr>
                        <th className="py-2 px-3 text-left">Captain Recipe</th>
                        <th className="py-2 px-3 text-left">Gross Qty</th>
                        <th className="py-2 px-3 text-left">Unit Rate</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                      {captainRecipesList.map((cr, idx) => {
                        const crKey = cr.captainRecipeId || cr.id || idx;
                        const isExpanded = Boolean(expandedCaptainRecipes[crKey]);
                        const subIngredients = Array.isArray(cr.ingredients) ? cr.ingredients : [];

                        const crUnit = cr.uomSymbol || cr.displayUomSymbol || 'kg';
                        const scaled = Number(cr.scaledWeight) || 0;
                        const batchQty = Number(cr.captainBatchWeight) || 0;

                        // Qty used for this menu item
                        const crQty =
                          scaled > 0 ? scaled : Number(cr.displayQty) || Number(cr.baseWeight) || 0;
                        const crRate = Number(cr.currentStockCostPerUnit ?? cr.baseUomRate ?? 0);
                        const crAmount = Number(cr.totalCost ?? 0);
                        const crBatchCost = Number(cr.currentStockBatchCost ?? 0);

                        return (
                          <React.Fragment key={crKey}>
                            <tr
                              className={`hover:bg-purple-50/30 transition-colors ${subIngredients.length > 0 ? 'cursor-pointer' : ''
                                }`}
                              onClick={() => {
                                if (subIngredients.length > 0) {
                                  toggleCaptainRecipeExpand(crKey);
                                }
                              }}
                            >
                              <td className="py-2 px-3 font-semibold text-gray-900">
                                <div className="flex items-center gap-1.5">
                                  {subIngredients.length > 0 && (
                                    <button
                                      type="button"
                                      className="p-0.5 rounded text-purple-600 hover:bg-purple-100 transition"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCaptainRecipeExpand(crKey);
                                      }}
                                    >
                                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    </button>
                                  )}
                                  <span className="truncate" title={cr.captainRecipeName}>
                                    {cr.captainRecipeName || `Captain Recipe #${cr.captainRecipeId || cr.id}`}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-100/70 text-purple-700 shrink-0">
                                    Captain
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-gray-500">
                                <div>
                                  {crQty.toFixed(3)} {crUnit}
                                </div>
                                {batchQty > 0 && (
                                  <div className="text-[9px] text-slate-400">
                                    Batch: {batchQty.toFixed(2)} {cr.captainBatchUomSymbol || crUnit}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-gray-500">
                                <div>
                                  ₹{crRate.toFixed(2)} / {crUnit}
                                </div>
                                {cr.rateSource && (
                                  <div className="text-[9px] text-slate-400">
                                    {String(cr.rateSource).replace(/_/g, ' ')}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-gray-800">
                                <div>₹{crAmount.toFixed(2)}</div>
                                {crBatchCost > 0 && (
                                  <div className="text-[9px] font-normal text-slate-400">
                                    Batch cost ₹{crBatchCost.toFixed(2)}
                                  </div>
                                )}
                              </td>
                            </tr>

                            {/* Nested constituent raw materials if expanded */}
                            {isExpanded && subIngredients.length > 0 && (
                              <tr className="bg-slate-50/80 border-y border-purple-100">
                                <td colSpan={4} className="p-2.5">
                                  <div className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                                      <span className="flex items-center gap-1 text-purple-700">
                                        <UtensilsCrossed size={11} />
                                        Constituent Raw Materials ({subIngredients.length})
                                      </span>
                                      {cr.captainBatchWeight && (
                                        <span className="text-[10px] text-slate-500 font-normal">
                                          Batch: {Number(cr.captainBatchWeight).toFixed(2)}{' '}
                                          {cr.captainBatchUomSymbol || 'kg'}
                                        </span>
                                      )}
                                    </div>
                                    <table className="w-full text-[10px]">
                                      <thead className="text-slate-400 border-b border-slate-100">
                                        <tr>
                                          <th className="py-1 px-1.5 text-left font-semibold">Raw Material</th>
                                          <th className="py-1 px-1.5 text-left font-semibold">Gross Qty</th>
                                          <th className="py-1 px-1.5 text-left font-semibold">Rate</th>
                                          <th className="py-1 px-1.5 text-right font-semibold">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {subIngredients.map((sub, sIdx) => {
                                          const subQty =
                                            sub.convertedIngredientWeight !== undefined &&
                                              sub.convertedIngredientWeight !== null
                                              ? sub.convertedIngredientWeight
                                              : sub.baseIngredientWeight || sub.displayQty || 0;
                                          const subRate =
                                            sub.baseUomRate !== undefined && sub.baseUomRate !== null
                                              ? sub.baseUomRate
                                              : sub.displayUnitRate || sub.stockUnitRate || 0;
                                          const subAmt =
                                            sub.amount !== undefined && sub.amount !== null
                                              ? sub.amount
                                              : sub.totalIngredientCost || 0;

                                          return (
                                            <tr key={sub.rawMaterialId || sIdx} className="hover:bg-slate-50/60">
                                              <td className="py-1 px-1.5 font-medium text-slate-800">
                                                {sub.rawMaterialName}
                                              </td>
                                              <td className="py-1 px-1.5 text-slate-500">
                                                {Number(subQty).toFixed(3)} {sub.uomSymbol || 'kg'}
                                              </td>
                                              <td className="py-1 px-1.5 text-slate-500">
                                                ₹{Number(subRate).toFixed(2)} / {sub.uomSymbol || 'kg'}
                                              </td>
                                              <td className="py-1 px-1.5 text-right font-semibold text-slate-700">
                                                ₹{Number(subAmt).toFixed(2)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      <tr className="bg-purple-50/50 font-bold text-purple-900">
                        <td colSpan={3} className="py-2.5 px-3">
                          Total Captain Recipe Cost
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          ₹{totalCaptainRecipeCost}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Total Combined Recipe Material Cost Card */}
            {captainRecipesList.length > 0 && (
              <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#084E92] uppercase tracking-wider block">
                    Total Recipe Material Cost
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Direct (₹{effectiveDirectCost}) + Captain Sub-Recipes (₹{totalCaptainRecipeCost})
                  </span>
                </div>
                <div className="text-base font-extrabold text-[#084E92]">
                  ₹{totalRecipeCost}
                </div>
              </div>
            )}
          </div>

          {/* B. Per Person Consumption & Cost Breakdown */}
          <div className="space-y-2">
            <h5 className="font-bold text-gray-900 text-xs">B. Per Person Costing Summary</h5>
            <div className="grid grid-cols-2 gap-3">
              {/* Consumption Qty */}
              <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Portion Consumption
                  </span>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {perPersonQty}{' '}
                    <span className="text-xs font-semibold text-slate-500">
                      {perPersonUnit}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                  <Scale size={16} />
                </div>
              </div>

              {/* Cost Per Person */}
              <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">
                    Cost Per Person
                  </span>
                  <div className="text-base font-black text-emerald-700 mt-0.5">
                    ₹{costPerPersonVal}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Coins size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#084E92] hover:bg-[#00376C] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Raw Material Usage Modal */}
      {showUsageModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
                  <Info size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">
                    Raw Material Usage Breakdown
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    {usageItem?.rawMaterialName || 'Raw Material'} (ID: {usageItem?.rawMaterialId || usageItem?.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUsageModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {usageLoading ? (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <Loader2 size={24} className="animate-spin text-[#084E92] mb-2" />
                  <p className="text-xs text-gray-500 font-medium">
                    Fetching recipe, shift, and sub-recipe usages...
                  </p>
                </div>
              ) : usageList.length === 0 ? (
                <div className="py-8 text-center text-gray-500 space-y-1">
                  <Package size={28} className="mx-auto text-gray-300" />
                  <p className="text-xs font-semibold text-gray-700">No Other Usages Found</p>
                  <p className="text-[11px] text-gray-400">
                    This material is only used in the current recipe or no other linked shifts/sub-recipes were returned for plan #{productionPlanId || 0}.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-200 text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Recipe / Item</th>
                        <th className="py-2.5 px-3 text-left">Shift / Meal Type</th>
                        <th className="py-2.5 px-3 text-left">Source / Role</th>
                        <th className="py-2.5 px-3 text-right">Required Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-[11px]">
                      {usageList.map((u, uIdx) => (
                        <tr key={u.id || uIdx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-gray-900">
                            {u.recipeName || u.kitchenMenuItemName || u.captainRecipeName || u.name || 'Recipe'}
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {u.shiftName || u.mealTypeName || 'Primary Shift'}
                          </td>
                          <td className="py-2 px-3 text-gray-500">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-[#084E92] border border-blue-100">
                              {u.source || u.type || (u.captainRecipeName ? 'Captain Sub-Recipe' : 'Direct Recipe')}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-gray-800">
                            {Number(u.quantity || u.requiredQty || u.totalQty || 0).toFixed(3)}{' '}
                            <span className="text-[10px] text-gray-400 font-normal">
                              {u.uomSymbol || u.unitName || usageItem?.uomSymbol || 'kg'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end bg-gray-50/50">
              <button
                type="button"
                onClick={() => setShowUsageModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightDrawerRecipeSnapshot;