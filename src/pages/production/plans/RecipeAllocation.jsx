import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router';
import {
  Save,
  ArrowLeft,
  ArrowRight,
  Eye,
  Trash2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Package,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PlanStepper } from './components/PlanStepper';
import RightDrawerRecipeSnapshot from '@/pages/production/menu-planning/RightDrawerRecipeSnapshot';
import SearchableSelect from '@/utils/SearchableSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  saveProductionPlan,
  generateProductionPlanStoreIndent,
  GetAllStoreByOrg,
  getAllRawMaterial,
  getAllRawMaterialItems,
  getAllRawMaterialCategoryType,
  getAllRawMaterialCategory,
  getRawMaterialByCategory,
  getRawMaterialByType,
  getAllMealTypes,
} from '@/services/apiServices';
import { notify } from '@/utils/toast';

const RATE_SOURCES = [
  { value: 'LAST_PURCHASE', label: 'Last Purchase' },
  { value: 'WEIGHTED_AVERAGE', label: 'Weighted Average' },
  { value: 'CURRENT_STOCK', label: 'Current Stock' },
  { value: 'HIGHEST_PRICE', label: 'Highest Price' },
  { value: 'LOWEST_PRICE', label: 'Lowest Price' },
];

export const RecipeAllocation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { planId = '1' } = useParams();

  const state = location.state || {};
  const prefillData = state.prefillData || {};

  const incomingPlanId = Number(
    state.productionPlanId ||
    state.savedPlan?.id ||
    prefillData?.id ||
    prefillData?.productionPlanId ||
    (planId !== '1' ? planId : 0) ||
    0
  );
  const [activePlanId, setActivePlanId] = useState(incomingPlanId);

  // Production Plan Header Info
  const planCode = state.planCode || prefillData.planCode || `PP-${new Date().getFullYear()}-001`;
  const productionDate = state.productionDate || prefillData.productionDate || new Date().toISOString().split('T')[0];
  const producingKitchen = state.producingKitchen || prefillData.productionLocationName || 'Main Kitchen';
  const issueStore = state.issueStore || prefillData.issueStoreName || prefillData.issueStore || 'Main Store';
  const organizationId = Number(state.selectedPlan?.organizationId || prefillData.organizationId || state.organizationId || 40);
  const organizationName = state.selectedPlan?.organizationName || prefillData.organizationName || 'PDEU';
  const subOutletId = Number(state.selectedPlan?.subOutletId || prefillData.subOutletId || state.subOutletId || 0);

  // productionsuboutletId vs productionLocationId logic based on outlet vs suboutlet menu plan:
  // - productionsuboutletId: when outlet menu plan is created (subOutletId is 0 or null), pass kitchen id from subOutletId
  // - productionLocationId: when suboutlet menu plan is created (subOutletId > 0), pass kitchen id from subLocationId
  const isSubOutletMenuPlan = Number(subOutletId) > 0;
  const rawKitchenId = Number(
    state.productionKitchenId ||
    state.productionLocationId ||
    prefillData.productionLocationId ||
    state.productionsuboutletId ||
    prefillData.productionsuboutletId ||
    0
  );

  let productionsuboutletId = 0;
  let productionLocationId = 0;

  if (isSubOutletMenuPlan) {
    productionLocationId = Number(state.productionLocationId ?? (prefillData.productionLocationId || rawKitchenId || 0));
    productionsuboutletId = Number(state.productionsuboutletId ?? (prefillData.productionsuboutletId || 0));
  } else {
    productionsuboutletId = Number(state.productionsuboutletId ?? (prefillData.productionsuboutletId || rawKitchenId || 0));
    productionLocationId = Number(state.productionLocationId ?? (prefillData.productionLocationId || 0));
  }

  // Store Resolution for stockInOrganizationId, stockInSubOutletId, stockInLocationId:
  // - When menu plan is at unit level: pass stockInSubOutletId as the store id, stockInLocationId = 0
  // - When menu plan is at subunit level: pass stockInLocationId as the store id, stockInSubOutletId = 0
  // - stockInOrganizationId = organizationId
  const [storeOptions, setStoreOptions] = useState(state.storeOptions || []);
  const [selectedStore, setSelectedStore] = useState(issueStore);

  useEffect(() => {
    let isMounted = true;
    if (!state.storeOptions || state.storeOptions.length === 0) {
      const loadStores = async () => {
        try {
          const promises = [
            GetAllStoreByOrg({ orgId: organizationId, type: 'STORE' }).catch(() => null),
          ];
          if (subOutletId && Number(subOutletId) > 0) {
            promises.push(
              GetAllStoreByOrg({
                orgId: organizationId,
                subOutletId: Number(subOutletId),
                type: 'STORE',
              }).catch(() => null)
            );
          }
          const resList = await Promise.all(promises);
          const merged = [];
          const seen = new Set();
          resList.forEach((res, idx) => {
            if (!res) return;
            const raw = res?.data?.data ?? res?.data ?? [];
            const list = Array.isArray(raw) ? raw : (raw?.content || raw?.items || raw?.stores || []);
            const isSub = idx === 1;
            if (Array.isArray(list) && list.length > 0) {
              list.forEach((st) => {
                const rawId = isSub
                  ? (st.subLocationId ?? st.id ?? st.storeId ?? st.subOutletId)
                  : (st.subOutletId ?? st.id ?? st.storeId ?? st.subLocationId);
                const name = isSub
                  ? (st.subLocationName || st.name || st.storeName || st.subOutletName)
                  : (st.subOutletName || st.name || st.storeName || st.subLocationName);
                if (!name) return;
                const key = String(rawId || name);
                if (seen.has(key)) return;
                seen.add(key);
                merged.push({
                  id: rawId || key,
                  name,
                  isSubUnit: isSub,
                  subOutletId: Number(st.subOutletId ?? (!isSub ? (st.id ?? st.storeId) : 0)) || 0,
                  subLocationId: Number(st.subLocationId ?? (isSub ? (st.id ?? st.storeId) : 0)) || 0,
                  storeId: Number(rawId || 0),
                });
              });
            }
          });
          if (isMounted && merged.length > 0) {
            setStoreOptions(merged);
          }
        } catch (e) {
          console.warn('Failed to load stores in RecipeAllocation:', e);
        }
      };
      loadStores();
    }
    return () => { isMounted = false; };
  }, [organizationId, subOutletId, state.storeOptions]);

  const matchedStore = storeOptions.find(
    (st) => st.name === selectedStore || String(st.id) === String(selectedStore)
  );

  const stockInOrganizationId = Number(
    state.stockInOrganizationId ||
    prefillData.stockInOrganizationId ||
    organizationId ||
    40
  );

  let stockInSubOutletId = 0;
  let stockInLocationId = 0;

  if (isSubOutletMenuPlan) {
    // Menu plan at subunit level: store will be at stockInLocationId for the sub unit
    stockInLocationId = Number(
      state.stockInLocationId ||
      prefillData.stockInLocationId ||
      matchedStore?.subLocationId ||
      (matchedStore?.isSubUnit ? (matchedStore?.storeId || matchedStore?.id) : 0) ||
      state.issueStoreId ||
      state.storeSubLocationIds?.[0] ||
      matchedStore?.id ||
      0
    );
    stockInSubOutletId = 0;
  } else {
    // Menu plan at unit level: pass stockInSubOutletId when menu plan is at unit level, so we get stock of store of unit
    stockInSubOutletId = Number(
      state.stockInSubOutletId ||
      prefillData.stockInSubOutletId ||
      matchedStore?.subOutletId ||
      (!matchedStore?.isSubUnit ? (matchedStore?.storeId || matchedStore?.id) : 0) ||
      state.issueStoreId ||
      state.storeSubOutletIds?.[0] ||
      matchedStore?.id ||
      0
    );
    stockInLocationId = 0;
  }

  // Initial Recipe Items from Prefill Response
  const initialItems = useMemo(() => {
    const rawItems = state.items || prefillData.items || [];
    if (rawItems.length > 0) {
      return rawItems.map((item, idx) => ({
        id: item.id || `item-${idx + 1}`,
        menuPlanDayItemId: item.menuPlanDayItemId || idx + 1,
        kitchenMenuItemId: item.kitchenMenuItemId || idx + 1,
        recipeName: item.recipeName || `Recipe ${idx + 1}`,
        recipeCategoryName: item.recipeCategoryName || 'Main Course',
        mealTypeId: item.mealTypeId || 1,
        mealTypeName: item.mealTypeName || 'Breakfast',
        mealStructureId: item.mealStructureId || null,
        mealStructureName: item.mealStructureName || item.shiftName || item.mealTypeName || 'Breakfast',
        shiftId: item.shiftId || item.menuPlanDayShiftId || null,
        shiftName: item.shiftName || item.mealStructureName || item.mealTypeName || 'Breakfast',
        actualPax: Number(item.plannedPax ?? item.menuPlanPax ?? 300),
        totalPlannedQty: Number(item.totalQty ?? item.expectedQty ?? item.menuPlanQty ?? 30.0),
        unitName: item.portionUnitName || item.unitName || 'kg',
        portionSize: Number(item.portionSize ?? 0.1),
        portionUnitName: item.portionUnitName || 'kg',
        costPerPortion: Number(item.costPerPortion ?? 10.0),
        rateSource: item.rateSource || 'LAST_PURCHASE',
        status: item.status || 'PLANNED',
        remarks: item.remarks || '',
        rawMaterials: Array.isArray(item.rawMaterials) ? item.rawMaterials : [],
        allocations: Array.isArray(item.allocations) && item.allocations.length > 0
          ? item.allocations.map((a, aIdx) => ({
            id: a.id || `alloc-${idx}-${aIdx}`,
            destinationOrganizationId: a.destinationOrganizationId || organizationId,
            destinationOrganizationName: a.destinationOrganizationName || organizationName,
            destinationSubOutletId: a.destinationSubOutletId || null,
            destinationSubOutletName: a.destinationSubOutletName || null,
            destinationLocationId: a.destinationLocationId || null,
            destinationLocationName: a.destinationLocationName || 'Main Kitchen',
            allocatedPax: Number(a.allocatedPax ?? 32),
            allocatedQty: Number(a.allocatedQty ?? 3.2),
            portionSize: Number(a.portionSize ?? item.portionSize ?? 0.1),
            portionUnitName: a.portionUnitName || 'kg',
            requiresTransfer: a.requiresTransfer !== undefined ? Boolean(a.requiresTransfer) : true,
            remarks: a.remarks || '',
          }))
          : (state.destinations || []).map((d, dIdx) => ({
            id: `alloc-${idx}-${dIdx}`,
            destinationOrganizationId: d.destinationOrganizationId || organizationId,
            destinationOrganizationName: d.outlet || organizationName,
            destinationSubOutletId: d.destinationSubOutletId || null,
            destinationSubOutletName: null,
            destinationLocationId: d.destinationLocationId || null,
            destinationLocationName: d.subLocation || 'Main Kitchen',
            allocatedPax: 32,
            allocatedQty: 3.2,
            portionSize: Number(item.portionSize ?? 0.1),
            portionUnitName: 'kg',
            requiresTransfer: d.transferRequired !== undefined ? d.transferRequired : true,
            remarks: d.notes || '',
          })),
      }));
    }

    // Default sample if no items passed
    return [
      {
        id: 'item-1',
        menuPlanDayItemId: 22,
        kitchenMenuItemId: 1,
        recipeName: 'Paneer Tikka',
        recipeCategoryName: 'Starter',
        mealTypeId: 1,
        mealTypeName: 'Breakfast',
        actualPax: 300,
        totalPlannedQty: 30.0,
        unitName: 'kg',
        portionSize: 0.1,
        portionUnitName: 'kg',
        costPerPortion: 10.0,
        rateSource: 'LAST_PURCHASE',
        status: 'PLANNED',
        remarks: '',
        allocations: [
          {
            id: 'alloc-1',
            destinationOrganizationId: 40,
            destinationOrganizationName: 'PDEU',
            destinationSubOutletId: null,
            destinationSubOutletName: null,
            destinationLocationId: null,
            destinationLocationName: 'Main Kitchen',
            allocatedPax: 32,
            allocatedQty: 3.2,
            portionSize: 0.1,
            portionUnitName: 'kg',
            requiresTransfer: true,
            remarks: '',
          },
        ],
      },
    ];
  }, [state.items, prefillData.items, state.destinations, organizationId, organizationName]);

  const [recipes, setRecipes] = useState(initialItems);
  const [expandedRecipeId, setExpandedRecipeId] = useState(initialItems[0]?.id || null);

  // Meal Structure / Shift filtering state
  const [selectedMealStructure, setSelectedMealStructure] = useState('ALL');
  const [mealTypes, setMealTypes] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchTypes = async () => {
      try {
        const res = await getAllMealTypes();
        const data = res?.data?.data ?? res?.data ?? [];
        const list = Array.isArray(data) ? data : data?.items || [];
        if (isMounted) setMealTypes(list);
      } catch (err) {
        console.warn('Failed to load meal types in RecipeAllocation:', err);
      }
    };
    fetchTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  const mealTypesMap = useMemo(() => {
    const map = {};
    mealTypes.forEach((mt) => {
      if (mt && mt.id != null) {
        map[mt.id] = mt;
      }
    });
    return map;
  }, [mealTypes]);

  // Extract meal structures / shifts from day plan shifts, prefill data and recipes
  const mealStructureOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. From Day Plan / Prefill shifts
    const rawShifts =
      state?.dayPlan?.shifts ||
      state?.selectedPlan?.shifts ||
      prefillData?.shifts ||
      [];

    if (Array.isArray(rawShifts) && rawShifts.length > 0) {
      rawShifts.forEach((s) => {
        const val = String(s.mealStructureId || s.mealTypeId || s.id || s.name || '');
        const label =
          s.mealStructureName ||
          s.mealTypeName ||
          s.name ||
          (s.mealTypeId ? mealTypesMap[s.mealTypeId]?.name || `Meal #${s.mealTypeId}` : null);
        if (val && label && !seen.has(val)) {
          seen.add(val);
          list.push({
            value: val,
            label,
            mealTypeId: s.mealTypeId,
            mealStructureId: s.mealStructureId,
          });
        }
      });
    }

    // 2. From Recipe items
    recipes.forEach((r) => {
      const val = String(r.mealStructureId || r.mealTypeId || r.mealTypeName || '');
      const lookupName = r.mealTypeId && mealTypesMap[r.mealTypeId]?.name;
      const label =
        r.mealStructureName ||
        r.mealTypeName ||
        lookupName ||
        (r.mealTypeId ? `Meal #${r.mealTypeId}` : null);

      if (val && label && !seen.has(val)) {
        seen.add(val);
        list.push({
          value: val,
          label,
          mealTypeId: r.mealTypeId,
          mealStructureId: r.mealStructureId,
        });
      }
    });

    return list;
  }, [recipes, state?.dayPlan, state?.selectedPlan, prefillData?.shifts, mealTypesMap]);

  // Check if a recipe matches the selected meal structure / shift
  const isRecipeInMealStructure = (r, filterVal) => {
    if (!filterVal || filterVal === 'ALL') return true;
    const rStructureId = r.mealStructureId != null ? String(r.mealStructureId) : null;
    const rTypeId = r.mealTypeId != null ? String(r.mealTypeId) : null;
    const rStructureName = r.mealStructureName ? String(r.mealStructureName).toLowerCase().trim() : null;
    const rTypeName = r.mealTypeName ? String(r.mealTypeName).toLowerCase().trim() : null;
    const target = String(filterVal).toLowerCase().trim();

    return (
      rStructureId === filterVal ||
      rTypeId === filterVal ||
      rStructureName === target ||
      rTypeName === target
    );
  };

  const filteredRecipes = useMemo(() => {
    if (!selectedMealStructure || selectedMealStructure === 'ALL') {
      return recipes;
    }
    return recipes.filter((r) => isRecipeInMealStructure(r, selectedMealStructure));
  }, [recipes, selectedMealStructure]);

  // Recipe Snapshot Drawer State
  const [selectedSnapshotRecipe, setSelectedSnapshotRecipe] = useState(null);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  // Callback to update raw materials for a specific recipe
  const handleUpdateRecipeRawMaterials = (recipeId, updatedRawMaterials) => {
    setRecipes((prev) =>
      prev.map((r) => {
        const match =
          r.id === recipeId ||
          r.kitchenMenuItemId === recipeId ||
          String(r.id) === String(recipeId) ||
          String(r.kitchenMenuItemId) === String(recipeId);
        if (!match) return r;
        return {
          ...r,
          rawMaterials: updatedRawMaterials,
        };
      })
    );
    setSelectedSnapshotRecipe((prev) => {
      if (!prev) return prev;
      const match =
        prev.id === recipeId ||
        prev.kitchenMenuItemId === recipeId ||
        String(prev.id) === String(recipeId) ||
        String(prev.kitchenMenuItemId) === String(recipeId);
      if (!match) return prev;
      return {
        ...prev,
        rawMaterials: updatedRawMaterials,
      };
    });
  };

  const activeSnapshotRecipe = useMemo(() => {
    if (!selectedSnapshotRecipe) return null;
    const found = recipes.find(
      (r) =>
        r.id === selectedSnapshotRecipe.id ||
        r.kitchenMenuItemId === selectedSnapshotRecipe.kitchenMenuItemId ||
        String(r.id) === String(selectedSnapshotRecipe.id) ||
        String(r.kitchenMenuItemId) === String(selectedSnapshotRecipe.kitchenMenuItemId)
    );
    return found || selectedSnapshotRecipe;
  }, [recipes, selectedSnapshotRecipe]);

  // Category Types & Material Items
  const [categoryTypes, setCategoryTypes] = useState([
    { id: 1, name: 'Raw Material' },
    { id: 2, name: 'Consumables' },
    { id: 3, name: 'Capital Goods' },
  ]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [backendCategoryItems, setBackendCategoryItems] = useState([]);
  const [loadingCategoryRM, setLoadingCategoryRM] = useState(false);
  const [allRawMaterials, setAllRawMaterials] = useState([]);
  const [materialsByType, setMaterialsByType] = useState({});
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Single Unified Additional Materials Section (Buffer RM, Consumables, Capital Goods)
  const [additionalMaterials, setAdditionalMaterials] = useState(
    Array.isArray(state.additionalMaterials) && state.additionalMaterials.length > 0
      ? state.additionalMaterials
      : Array.isArray(prefillData.additionalMaterials)
        ? prefillData.additionalMaterials
        : []
  );
  const [newMatId, setNewMatId] = useState(0);
  const [newMatCatId, setNewMatCatId] = useState(0);
  const [newMatRate, setNewMatRate] = useState(0);
  const [newMatUnitId, setNewMatUnitId] = useState(0);
  const [newMatName, setNewMatName] = useState('');
  const [newMatType, setNewMatType] = useState('Consumables');
  const [newMatQty, setNewMatQty] = useState('');
  const [newMatUom, setNewMatUom] = useState('Pcs');
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  const [saving, setSaving] = useState(false);

  // Helper to extract raw material list from any API structure
  const extractRawMaterials = (res) => {
    if (!res) return [];
    const payload = res?.data?.data ?? res?.data ?? res;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.["Raw Material Details"])) return payload["Raw Material Details"];
    if (Array.isArray(payload?.["rawMaterialDetails"])) return payload["rawMaterialDetails"];
    if (Array.isArray(payload?.["Raw Material Category Type Details"])) return payload["Raw Material Category Type Details"];
    if (Array.isArray(payload?.rawMaterials)) return payload.rawMaterials;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(res?.data?.["Raw Material Details"])) return res.data["Raw Material Details"];
    return [];
  };

  // Fetch Category Types & Materials on Mount
  useEffect(() => {
    let isMounted = true;
    const fetchCategoryTypesAndItems = async () => {
      try {
        setLoadingMaterials(true);
        // 1. Fetch raw material category types
        let fetchedTypes = [];
        try {
          const typesRes = await getAllRawMaterialCategoryType();
          const typesList =
            typesRes?.data?.data?.["Raw Material Category Type Details"] ||
            typesRes?.data?.["Raw Material Category Type Details"] ||
            typesRes?.data?.data ||
            typesRes?.data ||
            [];
          if (isMounted && Array.isArray(typesList) && typesList.length > 0) {
            fetchedTypes = typesList.map((t) => ({
              id: t.id || t.rawMaterialCatTypeId || t.catTypeId,
              name: t.nameEnglish || t.name || t.categoryTypeName || t.typeName || t.categoryType || 'Type',
              nameEnglish: t.nameEnglish || t.name || 'Type',
            }));
            setCategoryTypes(fetchedTypes);
          }
        } catch (e) {
          console.warn('getAllRawMaterialCategoryType note:', e);
        }

        // 1b. Fetch categories for category filter
        try {
          const catRes = await getAllRawMaterialCategory();
          const catData = catRes?.data?.data ?? catRes?.data ?? [];
          const catArr = Array.isArray(catData)
            ? catData
            : catData?.["Raw Material Category Details"] || catData?.categories || catData?.items || [];
          if (isMounted && Array.isArray(catArr) && catArr.length > 0) {
            setCategoriesList(
              catArr.map((c) => ({
                id: c.id || c.rawMaterialCatId,
                name: c.nameEnglish || c.categoryName || c.name || 'Category',
                typeId: c.categoryTypeId || c.rawMaterialCatTypeId || 0,
              }))
            );
          }
        } catch (eCat) {
          console.warn('getAllRawMaterialCategory note:', eCat);
        }

        // 2. Fetch all raw materials
        let rawList = [];
        try {
          const res2 = await getAllRawMaterialItems(null, 0, true, '', '', '', organizationId, subOutletId);
          rawList = extractRawMaterials(res2);
        } catch (e2) {
          console.warn('getAllRawMaterialItems note:', e2);
        }

        if (rawList.length === 0) {
          try {
            const res1 = await getAllRawMaterial(1, 200);
            rawList = extractRawMaterials(res1);
          } catch (e1) {
            console.warn('getAllRawMaterial note:', e1);
          }
        }

        const formattedRawList = rawList.map((item) => {
          const id = item.id || item.rawMaterialId;
          const name = item.nameEnglish || item.rawMaterialName || item.name || item.materialName || 'Item';
          const catId = item.rawMaterialCat?.id || item.rawMaterialCatId || item.category?.id || item.catId || 0;
          const catName =
            item.rawMaterialCat?.nameEnglish ||
            item.rawMaterialCat?.name ||
            item.rawMaterialCategoryName ||
            item.categoryName ||
            item.category?.nameEnglish ||
            item.category?.name ||
            item.catName ||
            '';
          const typeId =
            item.rawMaterialCatType?.id ||
            item.rawMaterialCatTypeId ||
            item.categoryTypeId ||
            item.typeId ||
            0;
          const typeName =
            item.rawMaterialCatType?.nameEnglish ||
            item.rawMaterialCatType?.name ||
            item.typeName ||
            '';
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
            categoryName: catName,
            catId,
            rawMaterialCatId: catId,
            typeName,
            typeId,
            rawMaterialCatTypeId: typeId,
            uomId,
            unitId: uomId,
            uomName,
            unitName: uomName,
            rate,
          };
        });

        if (isMounted && formattedRawList.length > 0) {
          setAllRawMaterials(formattedRawList);
          setMaterialsByType((prev) => ({
            ...prev,
            'Raw Material': formattedRawList,
          }));
        }

        // 3. For consumable and capital goods category types, fetch via getRawMaterialByType
        const typesToIterate = fetchedTypes.length > 0 ? fetchedTypes : categoryTypes;
        typesToIterate.forEach(async (t) => {
          const tId = t.id;
          const tName = t.name || t.nameEnglish || '';
          if (tId) {
            try {
              const res = await getRawMaterialByType(tId);
              const items = extractRawMaterials(res);
              if (isMounted && Array.isArray(items) && items.length > 0) {
                const formatted = items.map((it) => {
                  const itId = it.id || it.rawMaterialId;
                  const itName = it.nameEnglish || it.rawMaterialName || it.name || it.materialName || 'Item';
                  const itCatId = it.rawMaterialCat?.id || it.rawMaterialCatId || it.category?.id || it.catId || 0;
                  const itCatName =
                    it.rawMaterialCat?.nameEnglish ||
                    it.rawMaterialCat?.name ||
                    it.rawMaterialCategoryName ||
                    it.categoryName ||
                    it.category?.nameEnglish ||
                    it.category?.name ||
                    tName;
                  const itUomId = it.unit?.id || it.unitId || it.uomId || 0;
                  const itUomName =
                    it.unit?.nameEnglish ||
                    it.unit?.name ||
                    it.unit?.symbolEnglish ||
                    it.uomName ||
                    it.unitName ||
                    it.baseUom ||
                    'kg';
                  const itRate = it.supplierRate ?? it.rate ?? it.lastPurchaseRate ?? 0;
                  return {
                    id: itId,
                    rawMaterialId: itId,
                    name: itName,
                    rawMaterialName: itName,
                    categoryName: itCatName,
                    catId: itCatId,
                    rawMaterialCatId: itCatId,
                    typeName: tName,
                    typeId: tId,
                    rawMaterialCatTypeId: tId,
                    uomId: itUomId,
                    unitId: itUomId,
                    uomName: itUomName,
                    unitName: itUomName,
                    rate: itRate,
                  };
                });
                setMaterialsByType((prev) => ({
                  ...prev,
                  [tName]: formatted,
                  [tId]: formatted,
                }));
              }
            } catch (e) {
              console.warn(`Could not load items for category type ${tName}:`, e);
            }
          }
        });
      } catch (err) {
        console.error('Failed to load raw material types & items:', err);
      } finally {
        if (isMounted) setLoadingMaterials(false);
      }
    };

    fetchCategoryTypesAndItems();
    return () => {
      isMounted = false;
    };
  }, [organizationId, subOutletId]);

  // Load items when changing material type if not cached yet
  const handleMaterialTypeChange = async (typeName) => {
    setNewMatType(typeName);
    setNewMatName('');
    setNewMatId(null);
    const matchedType = categoryTypes.find((t) => (t.name || t.nameEnglish || '').toLowerCase() === typeName.toLowerCase());
    const typeId = matchedType?.id;
    if (typeId && !materialsByType[typeName] && !materialsByType[typeId]) {
      try {
        const res = await getRawMaterialByType(typeId);
        const items = extractRawMaterials(res);
        if (Array.isArray(items) && items.length > 0) {
          const formatted = items.map((it) => ({
            id: it.id || it.rawMaterialId,
            rawMaterialId: it.rawMaterialId || it.id,
            name: it.nameEnglish || it.rawMaterialName || it.name || it.materialName || 'Item',
            rawMaterialName: it.nameEnglish || it.rawMaterialName || it.name || it.materialName || 'Item',
            categoryName: it.categoryName || it.category?.nameEnglish || it.category?.name || typeName,
            typeName,
            uomName: it.unit?.nameEnglish || it.unit?.name || it.uomName || it.unitName || it.baseUom || 'kg',
            unitName: it.unit?.nameEnglish || it.unit?.name || it.uomName || it.unitName || it.baseUom || 'kg',
            rate: it.supplierRate ?? it.rate ?? it.lastPurchaseRate ?? 0,
          }));
          setMaterialsByType((prev) => ({
            ...prev,
            [typeName]: formatted,
            [typeId]: formatted,
          }));
        }
      } catch (err) {
        console.warn(`Failed to fetch items for ${typeName}:`, err);
      }
    }
  };

  // Build distinct category list from allRawMaterials and categoriesList
  const distinctCategories = useMemo(() => {
    const map = new Map();
    (allRawMaterials || []).forEach((m) => {
      const name = m.categoryName || m.category;
      const id = m.catId || m.rawMaterialCatId || name;
      if (name && !map.has(String(name).toLowerCase())) {
        map.set(String(name).toLowerCase(), { id, name });
      }
    });
    (categoriesList || []).forEach((c) => {
      if (c.name && !map.has(String(c.name).toLowerCase())) {
        map.set(String(c.name).toLowerCase(), { id: c.id, name: c.name });
      }
    });
    return Array.from(map.values());
  }, [allRawMaterials, categoriesList]);

  // Fetch backend raw materials dynamically when category is selected via getRawMaterialByCategory API
  useEffect(() => {
    if (!selectedCategoryFilter) {
      setBackendCategoryItems([]);
      return;
    }
    let isMounted = true;
    const matchedCat = distinctCategories.find(
      (c) =>
        String(c.id) === String(selectedCategoryFilter) ||
        String(c.name).toLowerCase() === String(selectedCategoryFilter).toLowerCase()
    );
    const catId = matchedCat?.id || selectedCategoryFilter;
    if (!catId) return;

    const fetchByCategory = async () => {
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
        console.warn('getRawMaterialByCategory error in RecipeAllocation:', err);
      } finally {
        if (isMounted) setLoadingCategoryRM(false);
      }
    };
    fetchByCategory();
    return () => {
      isMounted = false;
    };
  }, [selectedCategoryFilter, distinctCategories]);

  // Current items for selected material type & category filter
  const currentAvailableItems = useMemo(() => {
    let baseList = [];
    const matchedType = categoryTypes.find(
      (t) => (t.name || t.nameEnglish || '').toLowerCase() === newMatType.toLowerCase()
    );
    const byName = materialsByType[newMatType];
    const byId = matchedType ? materialsByType[matchedType.id] : null;

    if (Array.isArray(byName) && byName.length > 0) baseList = byName;
    else if (Array.isArray(byId) && byId.length > 0) baseList = byId;
    else if (Array.isArray(allRawMaterials) && allRawMaterials.length > 0) {
      const filtered = allRawMaterials.filter((item) => {
        const typeStr = (item.typeName || item.categoryName || '').toLowerCase();
        const search = newMatType.toLowerCase();
        return (
          typeStr.includes(search) ||
          (search.includes('consum') && typeStr.includes('consum')) ||
          (search.includes('capital') && typeStr.includes('capital')) ||
          (search.includes('dispos') && typeStr.includes('dispos')) ||
          (search.includes('raw') && !typeStr.includes('consum') && !typeStr.includes('capital') && !typeStr.includes('dispos'))
        );
      });
      baseList = filtered.length > 0 ? filtered : allRawMaterials;
    } else if (Array.isArray(materialsByType['Raw Material']) && materialsByType['Raw Material'].length > 0) {
      baseList = materialsByType['Raw Material'];
    }

    if (selectedCategoryFilter) {
      if (backendCategoryItems.length > 0) {
        return backendCategoryItems;
      }
      const filterLower = String(selectedCategoryFilter).toLowerCase();
      return baseList.filter((m) => {
        const catName = String(m.categoryName || m.category || '').toLowerCase();
        const catId = String(m.catId || m.rawMaterialCatId || '');
        return (
          catName === filterLower ||
          catName.includes(filterLower) ||
          catId === String(selectedCategoryFilter)
        );
      });
    }

    return baseList;
  }, [materialsByType, newMatType, categoryTypes, allRawMaterials, selectedCategoryFilter, backendCategoryItems]);

  const handleMaterialNameChange = (val) => {
    setNewMatName(val);
    const matched = currentAvailableItems.find(
      (m) => (m.rawMaterialName || m.name || m.materialName)?.toLowerCase() === val.toLowerCase()
    );
    if (matched) {
      setNewMatId(matched.id || matched.rawMaterialId || 0);
      setNewMatCatId(matched.rawMaterialCatId || matched.catId || matched.category?.id || 0);
      setNewMatRate(matched.rate || matched.supplierRate || matched.lastPurchaseRate || 0);
      setNewMatUnitId(matched.uomId || matched.unitId || matched.unit?.id || 0);
      if (matched.uomName || matched.unitName || matched.baseUom) {
        setNewMatUom(matched.uomName || matched.unitName || matched.baseUom);
      }
    } else {
      setNewMatId(0);
      setNewMatCatId(0);
      setNewMatRate(0);
      setNewMatUnitId(0);
    }
  };

  const handleAddMaterialItem = () => {
    if (!newMatName.trim() || !newMatQty) {
      notify.error('Please enter material name and quantity');
      return;
    }

    const qty = Number(newMatQty) || 0;
    const rate = Number(newMatRate) || 0;

    // All outside additional raw materials / consumables / disposables (dish, glass, packaging, etc.)
    // are tagged with materialSource "DISPOSABLE" as required by the backend API schema
    const newEntry = {
      id: 0,
      captainRecipeId: 0,
      productionPlanItemId: 0,
      rawMaterialId: Number(newMatId) || 0,
      rawMaterialCatId: Number(newMatCatId) || 0,
      mealTypeId: Number(recipes[0]?.mealTypeId || prefillData?.mealTypeId || 0),
      materialName: newMatName.trim(),
      materialType: newMatType,
      materialSource: 'DISPOSABLE',
      requiredQty: qty,
      quantity: qty,
      quantityPerPortion: 0,
      uomId: Number(newMatUnitId) || 0,
      unitName: newMatUom || 'Pcs',
      unitRate: rate,
      rateSource: 'LAST_PURCHASE',
      totalMaterialCost: qty * rate,
      remarks: '',
    };

    setAdditionalMaterials((prev) => [...prev, newEntry]);
    setNewMatId(0);
    setNewMatCatId(0);
    setNewMatRate(0);
    setNewMatUnitId(0);
    setNewMatName('');
    setNewMatQty('');
    setShowAddMaterial(false);
    notify.success(`${newMatName} added to additional materials.`);
  };

  const handleRemoveMaterialItem = (id) => {
    setAdditionalMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleExpand = (id) => {
    setExpandedRecipeId((prev) => (prev === id ? null : id));
  };

  // Recipe attribute updates
  const handlePaxChange = (recipeId, val) => {
    const num = Number(val) || 0;
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        const autoQty = Number((num * (Number(r.portionSize) || 0.1)).toFixed(3));
        return {
          ...r,
          actualPax: val,
          totalPlannedQty: autoQty,
        };
      })
    );
  };

  const handleTotalQtyChange = (recipeId, val) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, totalPlannedQty: val } : r))
    );
  };

  const handlePortionChange = (recipeId, val) => {
    const pSize = Number(val) || 0;
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        const autoQty = Number(((Number(r.actualPax) || 0) * pSize).toFixed(3));
        return {
          ...r,
          portionSize: val,
          totalPlannedQty: autoQty > 0 ? autoQty : r.totalPlannedQty,
        };
      })
    );
  };

  const handleRateSourceChange = (recipeId, val) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, rateSource: val } : r))
    );
  };

  const handleDeleteRecipe = (recipeId) => {
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    notify.info('Recipe removed from production plan');
  };

  // Allocation updates for a specific recipe
  const handleAllocPaxChange = (recipeId, allocId, val) => {
    const num = Number(val) || 0;
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        const updatedAllocs = r.allocations.map((a) => {
          if (a.id !== allocId) return a;
          const autoQty = Number((num * (Number(a.portionSize) || Number(r.portionSize) || 0.1)).toFixed(3));
          return {
            ...a,
            allocatedPax: val,
            allocatedQty: autoQty,
          };
        });
        return { ...r, allocations: updatedAllocs };
      })
    );
  };

  const handleAllocQtyChange = (recipeId, allocId, val) => {
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        const updatedAllocs = r.allocations.map((a) =>
          a.id === allocId ? { ...a, allocatedQty: val } : a
        );
        return { ...r, allocations: updatedAllocs };
      })
    );
  };

  const toggleAllocTransfer = (recipeId, allocId) => {
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        const updatedAllocs = r.allocations.map((a) =>
          a.id === allocId ? { ...a, requiresTransfer: !a.requiresTransfer } : a
        );
        return { ...r, allocations: updatedAllocs };
      })
    );
  };

  // Build Payload & Save (conforms to saveProductionPlan API schema)
  const buildSavePayload = (status = 'DRAFT') => {
    const primaryMealTypeId = Number(prefillData?.mealTypeId || recipes[0]?.mealTypeId || 0);

    const formattedItems = recipes.map((r) => {
      const itemMealTypeId = Number(r.mealTypeId || primaryMealTypeId || 0);
      const itemPortionSize = Number(r.portionSize || 0.1);
      const itemPortionUnitId = Number(r.portionUnitId || 0);
      const itemUnitId = Number(r.unitId || 0);

      const itemRawMaterials = Array.isArray(r.rawMaterials) && r.rawMaterials.length > 0
        ? r.rawMaterials.map((rm) => ({
          captainRecipeId: Number(rm.captainRecipeId || 0),
          id: typeof rm.id === 'number' ? rm.id : 0,
          materialSource: rm.materialSource || 'RECIPE',
          mealTypeId: Number(rm.mealTypeId || itemMealTypeId || 0),
          productionPlanItemId: Number(rm.productionPlanItemId || (typeof r.id === 'number' ? r.id : 0)),
          quantityPerPortion: Number(rm.quantityPerPortion || 0),
          rateSource: rm.rateSource || r.rateSource || 'LAST_PURCHASE',
          rawMaterialCatId: Number(rm.rawMaterialCatId || 0),
          rawMaterialId: Number(rm.rawMaterialId || 0),
          remarks: rm.remarks || '',
          requiredQty: Number(rm.requiredQty || 0),
          totalMaterialCost: Number(rm.totalMaterialCost || 0),
          unitRate: Number(rm.unitRate || 0),
          uomId: Number(rm.uomId || 0),
        }))
        : [];

      return {
        id: typeof r.id === 'number' ? r.id : 0,
        kitchenMenuItemId: Number(r.kitchenMenuItemId || 0),
        menuPlanDayItemId: Number(r.menuPlanDayItemId || 0),
        mealTypeId: itemMealTypeId,
        menuPlanPax: Number(r.menuPlanPax || r.actualPax || 0),
        menuPlanQty: Number(r.menuPlanQty || r.totalPlannedQty || 0),
        plannedPax: Number(r.actualPax || r.plannedPax || 0),
        expectedQty: Number(r.expectedQty || r.totalPlannedQty || 0),
        totalQty: Number(r.totalPlannedQty || r.totalQty || 0),
        portionSize: itemPortionSize,
        portionUnitId: itemPortionUnitId,
        unitId: itemUnitId,
        remarks: r.remarks || '',
        rawMaterials: itemRawMaterials,
        allocations: (r.allocations || []).map((a) => ({
          id: typeof a.id === 'number' ? a.id : 0,
          destinationOrganizationId: Number(a.destinationOrganizationId || organizationId || 0),
          destinationSubOutletId: Number(a.destinationSubOutletId || 0),
          destinationLocationId: Number(a.destinationLocationId || 0),
          allocatedPax: Number(a.allocatedPax || 0),
          allocatedQty: Number(a.allocatedQty || 0),
          portionSize: Number(a.portionSize || itemPortionSize),
          portionUnitId: Number(a.portionUnitId || itemPortionUnitId),
          unitId: Number(a.unitId || itemUnitId),
          requiresTransfer: a.requiresTransfer !== undefined ? Boolean(a.requiresTransfer) : true,
          isSelfProduced: a.isSelfProduced !== undefined ? Boolean(a.isSelfProduced) : true,
          remarks: a.remarks || '',
        })),
      };
    });

    const formattedAdditionalMaterials = additionalMaterials.map((m) => {
      const reqQty = Number(m.requiredQty || m.quantity || 0);
      const rate = Number(m.unitRate || m.rate || 0);
      const cost = Number(m.totalMaterialCost || (reqQty * rate));
      const matMealType = Number(m.mealTypeId || primaryMealTypeId || 0);
      const source = m.materialSource || 'DISPOSABLE';

      return {
        id: typeof m.id === 'number' ? m.id : 0,
        captainRecipeId: Number(m.captainRecipeId || 0),
        productionPlanItemId: Number(m.productionPlanItemId || 0),
        rawMaterialId: Number(m.rawMaterialId || 0),
        rawMaterialCatId: Number(m.rawMaterialCatId || m.rawMaterialCategoryId || 0),
        mealTypeId: matMealType,
        materialSource: source,
        requiredQty: reqQty,
        quantityPerPortion: Number(m.quantityPerPortion || 0),
        uomId: Number(m.uomId || m.unitId || 0),
        unitRate: rate,
        rateSource: m.rateSource || 'LAST_PURCHASE',
        totalMaterialCost: cost,
        remarks: m.remarks || '',
      };
    });

    const rawIndents = Array.isArray(state.storeIndents)
      ? state.storeIndents
      : Array.isArray(prefillData?.storeIndents)
        ? prefillData.storeIndents
        : [];

    const formattedStoreIndents = rawIndents.map((si) => ({
      id: typeof si.id === 'number' ? si.id : 0,
      rawMaterialId: Number(si.rawMaterialId || 0),
      canonicalUomId: Number(si.canonicalUomId || si.uomId || si.unitId || 0),
      recipeRequiredQty: Number(si.recipeRequiredQty || 0),
      additionalRequiredQty: Number(si.additionalRequiredQty || 0),
      disposableRequiredQty: Number(si.disposableRequiredQty || 0),
      totalRequiredQty: Number(si.totalRequiredQty || si.requiredQty || 0),
      totalAvailableQty: Number(si.totalAvailableQty || si.availableStore || si.availableQty || 0),
      totalAllocatedIssueQty: Number(si.totalAllocatedIssueQty || si.issueQty || 0),
      shortfallQty: Number(si.shortfallQty || si.shortfall || 0),
      isShortfall: si.isShortfall !== undefined ? Boolean(si.isShortfall) : Number(si.shortfallQty || si.shortfall || 0) > 0,
      mealTypeId: Number(si.mealTypeId || primaryMealTypeId || 0),
      estimatedUnitRate: Number(si.estimatedUnitRate || si.unitRate || si.rate || 0),
      estimatedTotalCost: Number(si.estimatedTotalCost || si.estimatedCost || 0),
      estimatedShortfallCost: Number(si.estimatedShortfallCost || 0),
      remarks: si.remarks || '',
      storeAllocations: Array.isArray(si.storeAllocations)
        ? si.storeAllocations.map((sa) => ({
          id: typeof sa.id === 'number' ? sa.id : 0,
          storeOrganizationId: Number(sa.storeOrganizationId || organizationId || 0),
          storeSubOutletId: Number(sa.storeSubOutletId || subOutletId || 0),
          storeSubLocationId: Number(sa.storeSubLocationId || 0),
          storeType: sa.storeType || 'STORE',
          availableQtySnapshot: Number(sa.availableQtySnapshot || sa.availableQty || 0),
          allocatedIssueQty: Number(sa.allocatedIssueQty || sa.issueQty || 0),
          remarks: sa.remarks || '',
        }))
        : [],
    }));

    const resolvedPlanId = Number(activePlanId || prefillData?.id || state.productionPlanId || 0);

    return {
      id: resolvedPlanId,
      organizationId: Number(organizationId || prefillData?.organizationId || 0),
      subOutletId: Number(subOutletId || prefillData?.subOutletId || 0),
      productionLocationId: Number(productionLocationId || 0),
      productionsuboutletId: Number(productionsuboutletId || 0),
      stockInOrganizationId: Number(stockInOrganizationId || 0),
      stockInSubOutletId: Number(stockInSubOutletId || 0),
      stockInLocationId: Number(stockInLocationId || 0),
      menuPlanId: Number(prefillData?.menuPlanId || state.selectedPlan?.menuPlanId || 0),
      menuPlanDayId: Number(prefillData?.menuPlanDayId || state.selectedPlan?.menuPlanDayId || 0),
      menuPlanDayShiftId: Number(prefillData?.menuPlanDayShiftId || 0),
      mealTypeId: primaryMealTypeId,
      priority: state.priority || prefillData?.priority || 'High',
      producingKitchenId: Number(rawKitchenId || 0),
      productionKitchenId: Number(rawKitchenId || 0),
      productionStartTime: state.startTime || prefillData?.startTime || prefillData?.productionStartTime || '08:00',
      productionCompletionTime: state.expectedCompletion || prefillData?.expectedCompletion || prefillData?.productionCompletionTime || '14:00',
      productionNotes: state.notes || prefillData?.productionNotes || prefillData?.notes || '',
      rawMaterialIssueStoreId: Number(state.issueStoreId || stockInSubOutletId || stockInLocationId || 0),
      rawMaterialIssueStoreName: issueStore || '',
      rawMaterialIssueSubOutletId: Number(stockInSubOutletId || 0),
      rawMaterialIssueLocationId: Number(stockInLocationId || 0),
      supervisorId: Number(state.supervisorId || prefillData?.supervisorId || 0),
      productionDate: productionDate || prefillData?.productionDate || new Date().toISOString().split('T')[0],
      servingDate: productionDate || prefillData?.servingDate || new Date().toISOString().split('T')[0],
      status: status,
      remarks: state.notes || prefillData?.remarks || '',
      userId: Number(prefillData?.userId || 0),
      items: formattedItems,
      additionalMaterials: formattedAdditionalMaterials,
      storeIndents: formattedStoreIndents,
    };
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const payload = buildSavePayload('DRAFT');
      const res = await saveProductionPlan(payload);
      const savedData = res?.data?.data ?? res?.data;
      if (savedData?.id) {
        setActivePlanId(Number(savedData.id));
      }
      notify.success('Production plan recipe allocations saved as draft.');
    } catch (err) {
      console.error('Failed to save draft:', err);
      notify.error(err?.response?.data?.message || 'Failed to save production plan draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (recipes.length === 0) {
      notify.error('Please configure at least one recipe.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildSavePayload('DRAFT');
      const res = await saveProductionPlan(payload);
      const savedData = res?.data?.data ?? res?.data ?? payload;
      const resolvedPlanId = savedData?.id || activePlanId || payload.id || planId;
      if (savedData?.id) {
        setActivePlanId(Number(savedData.id));
      }
      const mealTypeId = recipes[0]?.mealTypeId || 1;

      // 1. Check if store indent is in response
      let storeIndentsData =
        savedData?.storeIndents ||
        savedData?.storeIndent ||
        savedData?.indents ||
        null;

      // 2. Otherwise call api generateProductionPlanStoreIndent with production plan Id and meal type id
      if (!storeIndentsData || (Array.isArray(storeIndentsData) && storeIndentsData.length === 0)) {
        try {
          const indentPayload = {
            mealTypeId: Number(mealTypeId),
            productionPlanId: Number(resolvedPlanId || 0),
            storeSubLocationIds:
              stockInLocationId > 0
                ? [stockInLocationId]
                : (Array.isArray(state.storeSubLocationIds) && state.storeSubLocationIds.length > 0
                  ? state.storeSubLocationIds
                  : [0]),
            storeSubOutletIds:
              stockInSubOutletId > 0
                ? [stockInSubOutletId]
                : (Array.isArray(state.storeSubOutletIds) && state.storeSubOutletIds.length > 0
                  ? state.storeSubOutletIds
                  : [Number(subOutletId || organizationId || 0)]),
          };
          const indentRes = await generateProductionPlanStoreIndent(indentPayload);
          const indentResult = indentRes?.data?.data ?? indentRes?.data;
          storeIndentsData = Array.isArray(indentResult)
            ? indentResult
            : indentResult?.items || indentResult?.indents || indentResult?.storeIndents || null;
        } catch (indentErr) {
          console.warn('generateProductionPlanStoreIndent note:', indentErr);
        }
      }

      notify.success('Step 2 saved. Moving to Material Sourcing & Store Indent.');
      navigate(`/production/plans/${resolvedPlanId || 1}/sourcing`, {
        state: {
          ...state,
          planCode,
          productionDate,
          producingKitchen,
          productionLocationId,
          productionsuboutletId,
          issueStore: selectedStore,
          issueStoreId: isSubOutletMenuPlan ? stockInLocationId : stockInSubOutletId,
          stockInOrganizationId,
          stockInSubOutletId,
          stockInLocationId,
          storeOptions,
          storeSubLocationIds: stockInLocationId > 0 ? [stockInLocationId] : [0],
          storeSubOutletIds: stockInSubOutletId > 0 ? [stockInSubOutletId] : [0],
          savedPlan: {
            ...savedData,
            planCode,
            productionDate,
            producingKitchen,
            productionLocationId,
            productionsuboutletId,
            stockInOrganizationId,
            stockInSubOutletId,
            stockInLocationId,
            issueStore: selectedStore,
            issueStoreId: isSubOutletMenuPlan ? stockInLocationId : stockInSubOutletId,
            organizationId,
            subOutletId,
            items: recipes,
            additionalMaterials,
          },
          recipes,
          mealTypeId,
          additionalMaterials,
          storeIndents: storeIndentsData,
        },
      });
    } catch (err) {
      console.error('Failed to save plan:', err);
      notify.warning('Saved locally. Proceeding to Material Sourcing.');
      const mealTypeId = recipes[0]?.mealTypeId || 1;
      navigate(`/production/plans/${planId}/sourcing`, {
        state: {
          ...state,
          planCode,
          productionDate,
          producingKitchen,
          productionLocationId: Number(productionLocationId || 0),
          productionsuboutletId: Number(productionsuboutletId || 0),
          issueStore,
          recipes,
          additionalMaterials,
          mealTypeId,
        },
      });
    } finally {
      setSaving(false);
    }
  };

  // Selected Shift/Meal Structure Info
  const activeShiftOption = mealStructureOptions.find((o) => o.value === selectedMealStructure);
  const activeMealType =
    selectedMealStructure === 'ALL'
      ? (mealStructureOptions.length > 1 ? 'All Shifts' : (recipes[0]?.mealTypeName || 'All'))
      : activeShiftOption?.label || recipes[0]?.mealTypeName || 'Shift';

  const displayedPlannedPaxSum = filteredRecipes.reduce(
    (sum, r) => sum + (Number(r.actualPax) || 0),
    0
  );

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Page Header */}
        <PageHeader
          title="Recipe and Outlet Allocation"
          description="Distribute planned recipes across production destinations using portion-based quantities."
          backTo="/production/plans/create"
          actions={
            <HeaderActionButton
              onClick={handleSaveDraft}
              icon={Save}
              label={saving ? 'Saving...' : 'Save Draft'}
              variant="outline"
              disabled={saving}
            />
          }
        />

        {/* Stepper */}
        <PlanStepper
          currentStep={2}
          onStepClick={(num) => {
            const pId = Number(activePlanId || prefillData?.id || state.productionPlanId || (planId !== '1' ? planId : 0) || 0);
            if (num === 1) {
              if (pId > 0) {
                navigate(`/production/plans/edit/${pId}`, { state: { ...state, planId: pId, isEdit: true } });
              } else {
                navigate('/production/plans/create', { state });
              }
            }
            if (num === 3) navigate(`/production/plans/${pId || planId}/sourcing`, { state });
          }}
        />

        {/* Shift Header Card with Meal Structure / Shift Dropdown */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-gray-900">
                  {new Date(productionDate).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()} – {activeMealType} Recipes
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  DRAFT
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Producing Kitchen: <strong className="text-gray-800">{producingKitchen}</strong> | Showing: <strong className="text-gray-800">{filteredRecipes.length} of {recipes.length} Recipes</strong> | Planned PAX: <strong className="text-[#084E92]">{displayedPlannedPaxSum}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Meal Structure / Shift Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap flex items-center gap-1">
                <Filter size={13} className="text-slate-400" />
                Shift / Meal Structure:
              </span>
              <Select
                value={selectedMealStructure}
                onValueChange={(val) => {
                  setSelectedMealStructure(val);
                  const matching = val === 'ALL' ? recipes : recipes.filter((r) => isRecipeInMealStructure(r, val));
                  if (matching.length > 0) {
                    setExpandedRecipeId(matching[0].id);
                  }
                }}
              >
                <SelectTrigger className="w-[190px] h-9 border-[#C3C6D1] rounded-xl bg-white text-xs font-medium">
                  <SelectValue placeholder="All Shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-medium">
                    All Shifts ({recipes.length})
                  </SelectItem>
                  {mealStructureOptions.map((opt) => {
                    const count = recipes.filter((r) => isRecipeInMealStructure(r, opt.value)).length;
                    return (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50 transition cursor-pointer shrink-0"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>Save Shift (Draft)</span>
            </button>
          </div>
        </div>

        {/* Recipe Allocation Table matching Screenshot 2 */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-3 text-left">Category</th>
                  <th className="py-3 px-3 text-left">Kitchen Menu Item</th>
                  <th className="py-3 px-3 text-center">Actual Pax</th>
                  <th className="py-3 px-3 text-center">Total Planned Qty</th>
                  <th className="py-3 px-3 text-center">Allocated Qty</th>
                  <th className="py-3 px-3 text-center">Portion</th>
                  <th className="py-3 px-3 text-center">Cost / Portion (₹)</th>
                  <th className="py-3 px-3 text-left">Rate Source</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecipes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400 text-xs">
                      No recipes configured for {activeMealType}.
                    </td>
                  </tr>
                ) : (
                  filteredRecipes.map((recipe) => {
                    const isExpanded = expandedRecipeId === recipe.id;
                    const allocatedQtySum = (recipe.allocations || []).reduce(
                      (sum, a) => sum + (Number(a.allocatedQty) || 0),
                      0
                    );

                    return (
                      <React.Fragment key={recipe.id}>
                        <tr className="hover:bg-slate-50/50 transition">
                          {/* Category Badge */}
                          <td className="py-3.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-[#084E92] border-blue-200">
                              {recipe.recipeCategoryName || 'General'}
                            </span>
                          </td>

                          {/* Recipe Name + Expand Toggle */}
                          <td className="py-3.5 px-3">
                            <button
                              type="button"
                              onClick={() => toggleExpand(recipe.id)}
                              className="group flex items-center gap-2 text-left bg-transparent border-0 p-0 cursor-pointer focus:outline-none"
                              title="Click to view destination allocations"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-gray-900 group-hover:text-[#084E92] transition-colors block text-xs">
                                  {recipe.recipeName}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {isExpanded ? '[-] Hide allocations' : '[+] View allocations'}
                                </span>
                              </div>
                              <span className="text-slate-400 group-hover:text-[#084E92] ml-1">
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </span>
                            </button>
                          </td>

                          {/* Actual Pax */}
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="number"
                              value={recipe.actualPax}
                              onChange={(e) => handlePaxChange(recipe.id, e.target.value)}
                              className="w-16 h-7 px-2 text-xs font-semibold text-slate-800 text-center bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#084E92]"
                            />
                          </td>

                          {/* Total Planned Qty */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                value={recipe.totalPlannedQty}
                                onChange={(e) => handleTotalQtyChange(recipe.id, e.target.value)}
                                className="w-16 h-7 px-2 text-xs font-semibold text-slate-800 text-center bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#084E92]"
                              />
                              <span className="text-[11px] font-medium text-slate-500">
                                {recipe.unitName}
                              </span>
                            </div>
                          </td>

                          {/* Allocated Qty */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="text-xs font-bold text-slate-800">
                              {allocatedQtySum.toFixed(2)} {recipe.unitName}
                            </span>
                          </td>

                          {/* Portion Size */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                value={recipe.portionSize}
                                onChange={(e) => handlePortionChange(recipe.id, e.target.value)}
                                className="w-14 h-7 px-1.5 text-xs font-semibold text-slate-800 text-center bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#084E92]"
                              />
                              <span className="text-[11px] font-medium text-slate-500">
                                {recipe.portionUnitName}
                              </span>
                            </div>
                          </td>

                          {/* Cost / Portion */}
                          <td className="py-3.5 px-3 text-center font-semibold text-slate-800">
                            ₹{Number(recipe.costPerPortion || 0).toFixed(2)}
                          </td>

                          {/* Rate Source */}
                          <td className="py-3.5 px-3">
                            <select
                              value={recipe.rateSource}
                              onChange={(e) => handleRateSourceChange(recipe.id, e.target.value)}
                              className="h-7 px-2 text-[11px] font-medium text-slate-700 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#084E92]"
                            >
                              {RATE_SOURCES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSnapshotRecipe(recipe);
                                  setIsSnapshotOpen(true);
                                }}
                                className="p-1 text-slate-500 hover:text-[#084E92] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="View Recipe Details & Snapshot"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRecipe(recipe.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Remove Recipe"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Per-Outlet Splits Table (Destination Allocations Only) */}
                        {isExpanded && (
                          <tr className="bg-blue-50/20">
                            <td colSpan={9} className="p-4 border-b border-blue-100">
                              <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between text-xs font-bold text-[#084E92]">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#084E92]" />
                                    Destination Splits for {recipe.recipeName}
                                  </span>
                                  <span className="text-[11px] text-gray-500 font-normal">
                                    Total Split Quantity:{' '}
                                    <strong className="text-gray-800">
                                      {allocatedQtySum.toFixed(2)} {recipe.unitName}
                                    </strong>
                                  </span>
                                </div>

                                <div className="border border-gray-100 rounded-lg overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">
                                        <th className="py-2 px-3 text-left">Destination Outlet</th>
                                        <th className="py-2 px-3 text-left">Sub-Location</th>
                                        <th className="py-2 px-3 text-center">Planned PAX</th>
                                        <th className="py-2 px-3 text-center">Planned Quantity</th>
                                        <th className="py-2 px-3 text-center">Portion Size</th>
                                        <th className="py-2 px-3 text-center">Transfer Required</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {(recipe.allocations || []).map((alloc) => (
                                        <tr key={alloc.id} className="hover:bg-slate-50/50">
                                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                                            {alloc.destinationSubOutletName || alloc.destinationOrganizationName || 'Outlet'}
                                          </td>
                                          <td className="py-2.5 px-3 text-gray-500">
                                            {alloc.destinationLocationName || 'Main Kitchen'}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <input
                                              type="number"
                                              value={alloc.allocatedPax}
                                              onChange={(e) =>
                                                handleAllocPaxChange(recipe.id, alloc.id, e.target.value)
                                              }
                                              className="w-16 h-6 px-1 text-center border border-slate-200 rounded text-xs font-semibold focus:border-[#084E92] focus:outline-none"
                                            />
                                          </td>
                                          <td className="py-2.5 px-3 text-center font-bold text-gray-900">
                                            <div className="flex items-center justify-center gap-1">
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={alloc.allocatedQty}
                                                onChange={(e) =>
                                                  handleAllocQtyChange(recipe.id, alloc.id, e.target.value)
                                                }
                                                className="w-16 h-6 px-1 text-center border border-slate-200 rounded text-xs font-semibold focus:border-[#084E92] focus:outline-none"
                                              />
                                              <span className="text-[10px] text-gray-500">{alloc.portionUnitName}</span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 text-center text-gray-600">
                                            {alloc.portionSize} {alloc.portionUnitName}
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={alloc.requiresTransfer}
                                                onChange={() => toggleAllocTransfer(recipe.id, alloc.id)}
                                                className="sr-only peer"
                                              />
                                              <div className="w-7 h-3.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#084E92]" />
                                            </label>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Single Unified Additional Materials Section (Buffer RM, Consumables, Capital Goods) */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                <Package size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Additional Raw Materials & Consumables</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#084E92] border border-blue-200">
                    {additionalMaterials.length} Items Added
                  </span>
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddMaterial(!showAddMaterial)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus size={14} />
              Add Material / Consumable
            </button>
          </div>

          {/* Add Material Input Form */}
          {showAddMaterial && (
            <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                  <div className="p-1 rounded-md bg-[#084E92]/10 text-[#084E92]">
                    <Sparkles size={13} />
                  </div>
                  <span>Add Material, Consumable or Disposable</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(false)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-slate-200/50 transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Row 1: Material Type, Category Filter, Item Name */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Material Category Type Dropdown */}
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Material Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newMatType}
                    onChange={(e) => handleMaterialTypeChange(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:border-[#084E92] focus:outline-none"
                  >
                    {categoryTypes.map((t) => (
                      <option key={t.id || t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter Dropdown with SearchableSelect */}
                <div className="sm:col-span-4">
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Category Filter
                  </label>
                  <SearchableSelect
                    value={selectedCategoryFilter}
                    onChange={(e) => {
                      setSelectedCategoryFilter(e.target.value);
                      setNewMatName('');
                      setNewMatId(0);
                    }}
                    options={[
                      { value: '', label: 'All Categories' },
                      ...distinctCategories.map((c) => ({
                        value: String(c.id || c.name),
                        label: c.name,
                      })),
                    ]}
                    placeholder="All Categories"
                    className="w-full"
                  />
                </div>

                {/* Material Item Selector with SearchableSelect */}
                <div className="sm:col-span-5">
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Item Name <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    value={newMatName}
                    loading={loadingCategoryRM}
                    onChange={(e) => handleMaterialNameChange(e.target.value)}
                    options={currentAvailableItems.map((item) => ({
                      value: item.rawMaterialName || item.name || item.materialName,
                      label: `${item.rawMaterialName || item.name || item.materialName}${item.uomName || item.unitName ? ` (${item.uomName || item.unitName})` : ''}`,
                    }))}
                    placeholder={loadingCategoryRM ? "Loading items..." : `Select ${newMatType}...`}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Row 2: Quantity and Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                <div className="sm:col-span-6">
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Quantity <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Qty"
                      value={newMatQty}
                      onChange={(e) => setNewMatQty(e.target.value)}
                      className="w-full h-9 pl-3 pr-14 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:border-[#084E92] focus:outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {newMatUom || 'Pcs'}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMaterial(false);
                      setNewMatName('');
                      setNewMatQty('');
                    }}
                    className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-semibold text-gray-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMaterialItem}
                    className="h-9 px-5 bg-[#084E92] text-white text-xs font-semibold rounded-lg hover:bg-[#063c70] transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    Add Material
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table of Added Additional Materials */}
          {additionalMaterials.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400">
                    <th className="py-2.5 px-3">Material Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3">UOM</th>
                    <th className="py-2.5 px-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {additionalMaterials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{mat.materialName}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${mat.materialSource === 'CONSUMABLE'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : mat.materialSource === 'CAPITAL_GOODS'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-[#084E92] border-blue-200'
                            }`}
                        >
                          {mat.materialType || (mat.materialSource === 'CONSUMABLE' ? 'Consumable' : 'Raw Material')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900">{mat.quantity}</td>
                      <td className="py-2.5 px-3 text-gray-500">{mat.unitName}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterialItem(mat.id)}
                          className="p-1 text-gray-400 hover:text-rose-500 transition cursor-pointer"
                          title="Remove Material"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              const pId = Number(activePlanId || prefillData?.id || state.productionPlanId || (planId !== '1' ? planId : 0) || 0);
              if (pId > 0) {
                navigate(`/production/plans/edit/${pId}`, { state: { ...state, planId: pId, isEdit: true } });
              } else {
                navigate('/production/plans/create', { state });
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to General Setup
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer"
            >
              <Save size={14} />
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
            >
              {saving ? 'Saving...' : 'Continue to Material Sourcing'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Drawer Recipe Snapshot */}
      {isSnapshotOpen && activeSnapshotRecipe && (
        <RightDrawerRecipeSnapshot
          isOpen={isSnapshotOpen}
          onClose={() => {
            setIsSnapshotOpen(false);
            setSelectedSnapshotRecipe(null);
          }}
          item={{
            ...activeSnapshotRecipe,
            id: activeSnapshotRecipe.kitchenMenuItemId || activeSnapshotRecipe.id,
            itemName: activeSnapshotRecipe.recipeName || activeSnapshotRecipe.itemName,
            categoryName: activeSnapshotRecipe.recipeCategoryName || activeSnapshotRecipe.categoryName,
            rawMaterials: activeSnapshotRecipe.rawMaterials || [],
          }}
          unitId={organizationId}
          subUnitId={subOutletId}
          unitName={organizationName}
          subUnitName={matchedStore?.name || ''}
          targetPax={Number(activeSnapshotRecipe.actualPax || activeSnapshotRecipe.plannedPax || 1)}
          productionPlanId={Number(prefillData?.id || state.selectedPlan?.id || state.productionPlanId || 0)}
          onUpdateRecipeRawMaterials={handleUpdateRecipeRawMaterials}
          categoryTypes={categoryTypes}
          allRawMaterials={allRawMaterials}
          materialsByType={materialsByType}
        />
      )}
    </Container>
  );
};

export default RecipeAllocation;
