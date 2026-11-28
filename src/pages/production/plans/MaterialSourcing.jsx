import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import {
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  PlusCircle,
  Search,
  Eye,
  Boxes,
  Layers,
  FileCheck2,
  FileText,
  Loader2,
  Building2,
  Calendar,
  Store,
  ChevronDown,
  Utensils,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PlanStepper } from './components/PlanStepper';
import { KpiCard } from '@/components/production/KpiCard';
import { QtyInput } from '@/components/production/QtyInput';
import { CreatePurchaseRequisitionModal } from './components/CreatePurchaseRequisitionModal';
import { IngredientDetailsModal } from './components/IngredientDetailsModal';
import { MOCK_BOM_INGREDIENTS } from '../mockData/productionMockData';
import {
  saveProductionPlan,
  generateProductionPlanStoreIndent,
  saveProductionPlanStoreIndent,
  GetAllStoreByOrg,
} from '@/services/apiServices';
import { getUserIdFromToken } from '@/utils/auth';
import { notify } from '@/utils/toast';

export const MaterialSourcing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { planId = '1' } = useParams();

  const state = location.state || {};
  const savedPlan = state.savedPlan || {};

  const planCode = savedPlan.planCode || state.planCode || `PP-${new Date().getFullYear()}-001`;
  const productionDate =
    savedPlan.productionDate || state.productionDate || new Date().toISOString().split('T')[0];
  const producingKitchen =
    savedPlan.productionsuboutletName ||
    savedPlan.productionLocationName ||
    state.producingKitchen ||
    'Main Kitchen';
  const productionLocationId = Number(
    savedPlan.productionLocationId ||
    state.productionLocationId ||
    state.selectedPlan?.productionLocationId ||
    0
  );
  const productionsuboutletId = Number(
    savedPlan.productionsuboutletId || state.productionsuboutletId || 29
  );
  const organizationId = Number(
    savedPlan.organizationId || state.organizationId || state.selectedPlan?.organizationId || 40
  );
  const organizationName = savedPlan.organizationName || state.organizationName || 'PDEU';
  const subOutletId = Number(
    savedPlan.subOutletId || state.subOutletId || state.selectedPlan?.subOutletId || 0
  );

  const defaultApprovedStoreName =
    savedPlan.issueStoreName ||
    state.issueStoreName ||
    state.issueStore ||
    savedPlan.productionsuboutletName ||
    state.selectedPlan?.subOutletName ||
    state.selectedPlan?.storeName ||
    'PDEU - Store';

  const [mealType, setMealType] = useState(
    savedPlan.mealTypeName || state.recipes?.[0]?.mealTypeName || 'Breakfast'
  );
  const [issueStore, setIssueStore] = useState(defaultApprovedStoreName);
  const [selectedStoreId, setSelectedStoreId] = useState(productionsuboutletId || 29);
  const [storeOptions, setStoreOptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // PR generation state (Global PR)
  const [generatedPR, setGeneratedPR] = useState(null);

  // Helper to map an indent item from the API response
  const mapIndentItem = (it, idx) => {
    const reqQty = Number(
      it.totalRequiredQty ??
      it.recipeRequiredQty ??
      it.requiredQty ??
      it.quantity ??
      it.plannedQty ??
      0
    );
    const shortfall = Number(it.shortfallQty ?? 0);
    // Calculate available store qty accurately:
    // If it.totalAvailableQty > 0, use it. Otherwise calculate as reqQty - shortfall (e.g. Avocado: 200 - 189 = 11 KG)
    const calculatedAvailable = Math.max(0, reqQty - shortfall);
    const availStock =
      Number(it.totalAvailableQty) > 0
        ? Number(it.totalAvailableQty)
        : Number(it.availableStock ?? it.availableQty ?? calculatedAvailable);

    const issueQty = Number(
      it.totalAllocatedIssueQty ?? it.issueQty ?? Math.min(availStock, reqQty)
    );
    const rate = Number(it.estimatedUnitRate ?? it.unitRate ?? it.rate ?? it.price ?? 0);
    const cost = Number(it.estimatedTotalCost ?? it.estimatedCost ?? reqQty * rate);
    const isShortfall = it.isShortfall !== undefined ? Boolean(it.isShortfall) : shortfall > 0;

    return {
      id: it.id || it.rawMaterialId || idx + 1,
      rawMaterialId: it.rawMaterialId || it.kitchenMenuItemRawMaterialId || idx + 1,
      ingredient:
        it.rawMaterialName || it.ingredientName || it.materialName || `Item ${idx + 1}`,
      category: it.categoryName || it.category || 'General',
      issueStore: it.issueStore || it.issueStoreName || defaultApprovedStoreName,
      issueStoreId: it.issueStoreId || selectedStoreId || productionsuboutletId || 29,
      requiredQty: reqQty,
      baseUom:
        it.canonicalUomSymbol ||
        it.canonicalUomName ||
        it.baseUom ||
        it.uomName ||
        it.unitName ||
        'KG',
      canonicalUomId: it.canonicalUomId || it.uomId || 1,
      availableStore: availStock,
      issueQty: issueQty,
      shortfall: shortfall,
      isShortfall: isShortfall,
      rate: rate,
      estimatedCost: cost,
      status: isShortfall ? 'SHORTFALL' : 'FULLY_AVAILABLE',
      mealTypeId: it.mealTypeId,
      mealTypeName: it.mealTypeName,
      storeSplits: it.storeSplits || [],
      batches:
        Array.isArray(it.batches) && it.batches.length > 0
          ? it.batches
          : [
            {
              batchNo: it.batchNo || `B-${new Date().getFullYear()}-${100 + idx}`,
              expiryDate: it.expiryDate || '2026-12-31',
              availableStock: `${availStock} ${it.canonicalUomSymbol || it.canonicalUomName || it.baseUom || 'KG'
                }`,
              stockAge: it.stockAge || '15 Days',
            },
          ],
    };
  };

  // Helper to initialize ingredients from savedPlan or fallback
  const initializeIngredients = useMemo(() => {
    // 1. From savedPlan store indents if already populated by saveProductionPlan response
    const apiIndents =
      savedPlan?.storeIndents ||
      state.storeIndents ||
      savedPlan?.storeIndent ||
      savedPlan?.indents;
    if (Array.isArray(apiIndents) && apiIndents.length > 0) {
      return apiIndents.map(mapIndentItem);
    }

    // 2. Synthesize from additional materials if passed
    const synthesized = [];
    (state.additionalMaterials || []).forEach((am, aIdx) => {
      synthesized.push({
        id: `am-${aIdx}`,
        rawMaterialId: am.rawMaterialId || 200 + aIdx,
        ingredient: am.materialName,
        category: am.materialType || 'Additional RM',
        requiredQty: Number(am.quantity) || 2,
        baseUom: am.unitName || 'KG',
        canonicalUomId: 1,
        availableStore: 20,
        issueQty: Number(am.quantity) || 2,
        shortfall: 0,
        isShortfall: false,
        rate: 80,
        estimatedCost: (Number(am.quantity) || 2) * 80,
        status: 'FULLY_AVAILABLE',
        batches: [
          {
            batchNo: `B-ADD-${aIdx}`,
            expiryDate: '2026-12-31',
            availableStock: `20 ${am.unitName || 'KG'}`,
            stockAge: '8 Days',
          },
        ],
      });
    });

    if (synthesized.length > 0) {
      return [...synthesized, ...MOCK_BOM_INGREDIENTS];
    }

    return MOCK_BOM_INGREDIENTS;
  }, [savedPlan, state.storeIndents, state.additionalMaterials]);

  const [ingredients, setIngredients] = useState(initializeIngredients);
  const [selectedItemIds, setSelectedItemIds] = useState(
    () => new Set(initializeIngredients.map((item) => item.id))
  );

  // Modals state
  const [isPRModalOpen, setIsPRModalOpen] = useState(false);
  const [isViewingPR, setIsViewingPR] = useState(false);
  const [selectedIngredientForModal, setSelectedIngredientForModal] = useState(null);

  // Call API to generate store indents using strict 4-field payload schema
  const fetchStoreIndents = async (storeId, matchedStoreObj = null, activeStoreName = null) => {
    setLoading(true);
    try {
      const matched =
        matchedStoreObj ||
        storeOptions.find(
          (s) => String(s.id) === String(storeId) || s.name === (activeStoreName || issueStore)
        );
      const targetStoreId = Number(storeId ?? matched?.id ?? selectedStoreId ?? 0);
      const currentStoreName = activeStoreName || matched?.name || issueStore;

      const isSubOutlet = Number(subOutletId || savedPlan?.subOutletId) > 0;
      let targetSubOutletIds = [0];
      let targetSubLocationIds = [0];

      if (isSubOutlet) {
        // Subunit level: store is at stockInLocationId / storeSubLocationIds
        const locId = Number(
          matched?.subLocationId ||
          (matched?.isSubUnit ? (matched?.storeId || matched?.id) : 0) ||
          targetStoreId ||
          0
        );
        targetSubLocationIds = locId > 0 ? [locId] : [0];
        targetSubOutletIds = [0];
      } else {
        // Unit level: store is at stockInSubOutletId / storeSubOutletIds
        const outId = Number(
          matched?.subOutletId ||
          (!matched?.isSubUnit ? (matched?.storeId || matched?.id) : 0) ||
          targetStoreId ||
          0
        );
        targetSubOutletIds = outId > 0 ? [outId] : [0];
        targetSubLocationIds = [0];
      }

      const payload = {
        mealTypeId: Number(
          savedPlan.mealTypeId || state.mealTypeId || state.recipes?.[0]?.mealTypeId || 1
        ),
        productionPlanId: Number(savedPlan?.id || state.productionPlanId || planId || 0),
        storeSubLocationIds: targetSubLocationIds,
        storeSubOutletIds: targetSubOutletIds,
      };

      const res = await generateProductionPlanStoreIndent(payload);
      const data = res?.data?.data || res?.data;
      const apiItems = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.indents)
            ? data.indents
            : Array.isArray(data?.storeIndents)
              ? data.storeIndents
              : null;

      if (Array.isArray(apiItems)) {
        // Update stock availability and store on existing raw materials
        // NEVER overwrite or delete the production plan's raw materials list!
        setIngredients((prevIngredients) => {
          return prevIngredients.map((existingItem) => {
            const matchedApiItem = apiItems.find(
              (it) =>
                (it.rawMaterialId && Number(it.rawMaterialId) === Number(existingItem.rawMaterialId)) ||
                (it.kitchenMenuItemRawMaterialId && Number(it.kitchenMenuItemRawMaterialId) === Number(existingItem.rawMaterialId)) ||
                (it.id && Number(it.id) === Number(existingItem.id)) ||
                (it.rawMaterialName && it.rawMaterialName.trim().toLowerCase() === existingItem.ingredient.trim().toLowerCase()) ||
                (it.ingredientName && it.ingredientName.trim().toLowerCase() === existingItem.ingredient.trim().toLowerCase()) ||
                (it.materialName && it.materialName.trim().toLowerCase() === existingItem.ingredient.trim().toLowerCase())
            );

            const reqQty = Number(existingItem.requiredQty || 0);

            if (matchedApiItem) {
              const shortfallFromApi = Number(matchedApiItem.shortfallQty ?? 0);
              const calculatedAvailable = Math.max(0, reqQty - shortfallFromApi);
              const availStock =
                Number(matchedApiItem.totalAvailableQty) > 0
                  ? Number(matchedApiItem.totalAvailableQty)
                  : Number(matchedApiItem.availableStock ?? matchedApiItem.availableQty ?? calculatedAvailable);

              const issueQty = Number(
                matchedApiItem.totalAllocatedIssueQty ?? matchedApiItem.issueQty ?? Math.min(availStock, reqQty)
              );
              const shortfall = Math.max(0, reqQty - issueQty);
              const isShortfall = shortfall > 0;

              return {
                ...existingItem,
                issueStore: currentStoreName,
                issueStoreId: targetStoreId,
                availableStore: availStock,
                issueQty: issueQty,
                shortfall: shortfall,
                isShortfall: isShortfall,
                status: isShortfall ? 'SHORTFALL' : 'FULLY_AVAILABLE',
                batches:
                  Array.isArray(matchedApiItem.batches) && matchedApiItem.batches.length > 0
                    ? matchedApiItem.batches
                    : existingItem.batches,
              };
            } else {
              // Not available in this store (stock is 0), but raw material stays!
              return {
                ...existingItem,
                issueStore: currentStoreName,
                issueStoreId: targetStoreId,
                availableStore: 0,
                issueQty: 0,
                shortfall: reqQty,
                isShortfall: reqQty > 0,
                status: reqQty > 0 ? 'SHORTFALL' : 'FULLY_AVAILABLE',
                batches: [],
              };
            }
          });
        });

        notify.success(`Stock availability updated for store ${currentStoreName}.`);
      }
    } catch (err) {
      console.warn('generateProductionPlanStoreIndent API response:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load stores from API
  useEffect(() => {
    let isMounted = true;
    const fetchStores = async () => {
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
          const list = res?.data?.data || res?.data || [];
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
          const currentMatch =
            merged.find((o) => o.name === issueStore) ||
            merged.find((o) => Number(o.id) === Number(state.issueStoreId || state.stockInSubOutletId || state.stockInLocationId || productionsuboutletId)) ||
            merged[0];
          if (currentMatch) {
            setIssueStore(currentMatch.name);
            setSelectedStoreId(currentMatch.id);
          }
        }
      } catch (err) {
        console.error('Failed to load stores:', err);
      }
    };

    fetchStores();
    return () => {
      isMounted = false;
    };
  }, [organizationId, subOutletId, productionsuboutletId, issueStore, state.issueStoreId, state.stockInSubOutletId, state.stockInLocationId]);

  const handleIssueStoreChange = (newStoreName) => {
    setIssueStore(newStoreName);
    const matched = storeOptions.find((s) => s.name === newStoreName);
    const newStoreId = matched ? (matched.storeId || matched.id) : selectedStoreId;
    if (matched) {
      setSelectedStoreId(matched.id);
    }
    setIngredients((prev) =>
      prev.map((item) => ({
        ...item,
        issueStore: newStoreName,
        issueStoreId: newStoreId,
      }))
    );
    notify.info(`Issue Store switched to ${newStoreName}. Updating stock...`);
    fetchStoreIndents(newStoreId, matched, newStoreName);
  };

  const handleItemStoreChange = (itemId, newStoreName) => {
    const matched = storeOptions.find((s) => s.name === newStoreName);
    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          issueStore: newStoreName,
          issueStoreId: matched ? (matched.storeId || matched.id) : item.issueStoreId,
        };
      })
    );
  };

  const handleRecalculateStock = () => {
    fetchStoreIndents(selectedStoreId);
  };

  const handleIssueQtyChange = (id, newQty) => {
    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const val = Number(newQty) || 0;
        const shortfall = Math.max(0, Number(item.requiredQty) - val);
        return {
          ...item,
          issueQty: val,
          shortfall,
          isShortfall: shortfall > 0,
          status: shortfall > 0 ? 'SHORTFALL' : 'FULLY_AVAILABLE',
        };
      })
    );
  };

  const filteredIngredients = ingredients.filter((item) => {
    const matchesSearch = item.ingredient.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryOptions = useMemo(() => {
    const cats = new Set(ingredients.map((it) => it.category).filter(Boolean));
    return Array.from(cats);
  }, [ingredients]);

  const filteredIds = useMemo(
    () => filteredIngredients.map((it) => it.id),
    [filteredIngredients]
  );

  const isAllSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedItemIds.has(id));
  const isIndeterminate =
    !isAllSelected && filteredIds.some((id) => selectedItemIds.has(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleToggleSelectItem = (id) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenPRModal = (isViewOnly = false) => {
    if (isViewOnly) {
      setIsViewingPR(true);
      setIsPRModalOpen(true);
      return;
    }
    const selectedCount = ingredients.filter((it) => selectedItemIds.has(it.id)).length;
    if (selectedCount === 0) {
      notify.warning('Please select at least one ingredient to create a purchase requisition.');
      return;
    }
    setIsViewingPR(false);
    setIsPRModalOpen(true);
  };

  const totalIngredientsCount = ingredients.length;
  const shortfallCount = ingredients.filter((item) => item.shortfall > 0).length;
  const availableCount = totalIngredientsCount - shortfallCount;
  const availabilityPct =
    totalIngredientsCount > 0 ? ((availableCount / totalIngredientsCount) * 100).toFixed(1) : '100';
  const totalBomCost =
    savedPlan.totalEstimatedCost ??
    ingredients.reduce((sum, item) => sum + (Number(item.estimatedCost) || 0), 0);

  // Save Store Indents / Confirm & Execute Production
  const handleSaveStoreIndent = async (isConfirm = false) => {
    setSaving(true);
    try {
      const isSubOutletMenuPlan = Number(subOutletId || savedPlan?.subOutletId) > 0;
      const matchedStore = storeOptions.find(
        (s) => String(s.id) === String(selectedStoreId) || s.name === issueStore
      );
      const currentStoreId = Number(selectedStoreId || matchedStore?.id || 0);

      let resolvedStockInSubOutletId = 0;
      let resolvedStockInLocationId = 0;

      if (isSubOutletMenuPlan) {
        // Subunit level: store will be at stockInLocationId for the sub unit
        resolvedStockInLocationId = Number(
          matchedStore?.subLocationId ||
          (matchedStore?.isSubUnit ? (matchedStore?.storeId || matchedStore?.id) : 0) ||
          currentStoreId ||
          savedPlan?.stockInLocationId ||
          state.stockInLocationId ||
          0
        );
        resolvedStockInSubOutletId = 0;
      } else {
        // Unit level: pass stockInSubOutletId when menu plan is at unit level, so we get stock of store of unit
        resolvedStockInSubOutletId = Number(
          matchedStore?.subOutletId ||
          (!matchedStore?.isSubUnit ? (matchedStore?.storeId || matchedStore?.id) : 0) ||
          currentStoreId ||
          savedPlan?.stockInSubOutletId ||
          state.stockInSubOutletId ||
          0
        );
        resolvedStockInLocationId = 0;
      }

      // 1. Format storeIndents strictly matching the requested payload schema
      const formattedStoreIndents = ingredients.map((ing) => {
        const matchedItemStore =
          storeOptions.find((s) => s.name === ing.issueStore) || matchedStore;
        const itemSubOutletId = isSubOutletMenuPlan
          ? 0
          : Number(
              matchedItemStore?.subOutletId ||
              (!matchedItemStore?.isSubUnit ? (matchedItemStore?.storeId || matchedItemStore?.id) : 0) ||
              resolvedStockInSubOutletId
            );
        const itemSubLocationId = isSubOutletMenuPlan
          ? Number(
              matchedItemStore?.subLocationId ||
              (matchedItemStore?.isSubUnit ? (matchedItemStore?.storeId || matchedItemStore?.id) : 0) ||
              resolvedStockInLocationId
            )
          : 0;

        const reqQty = Number(ing.requiredQty || ing.recipeRequiredQty || 0);
        const availQty = Number(ing.availableStore || 0);
        const issueQty = Number(ing.issueQty || 0);
        const shortfall = Number(ing.shortfall != null ? ing.shortfall : Math.max(0, reqQty - issueQty));
        const rate = Number(ing.rate || ing.estimatedUnitRate || 0);
        const totalCost = Number(ing.estimatedCost != null ? ing.estimatedCost : reqQty * rate);
        const shortfallCost = Number(
          ing.estimatedShortfallCost != null ? ing.estimatedShortfallCost : shortfall * rate
        );

        return {
          additionalRequiredQty: Number(ing.additionalRequiredQty || 0),
          canonicalUomId: Number(ing.canonicalUomId || 1),
          disposableRequiredQty: Number(ing.disposableRequiredQty || 0),
          estimatedShortfallCost: shortfallCost,
          estimatedTotalCost: totalCost,
          estimatedUnitRate: rate,
          id: typeof ing.id === 'number' ? ing.id : Number(ing.storeIndentId || 0),
          isShortfall: Boolean(shortfall > 0),
          mealTypeId: Number(
            ing.mealTypeId ||
            savedPlan.mealTypeId ||
            state.mealTypeId ||
            state.recipes?.[0]?.mealTypeId ||
            1
          ),
          rawMaterialId: Number(ing.rawMaterialId || 0),
          recipeRequiredQty: Number(ing.recipeRequiredQty || reqQty),
          remarks: String(ing.remarks || ''),
          shortfallQty: shortfall,
          storeAllocations: [
            {
              allocatedIssueQty: issueQty,
              availableQtySnapshot: availQty,
              id: 0,
              remarks: String(ing.allocationRemarks || ''),
              storeOrganizationId: Number(organizationId || 0),
              storeSubLocationId: Number(itemSubLocationId || 0),
              storeSubOutletId: Number(itemSubOutletId || 0),
              storeType: 'STORE',
            },
          ],
          totalAllocatedIssueQty: issueQty,
          totalAvailableQty: availQty,
          totalRequiredQty: reqQty,
        };
      });

      const currentUserId = Number(
        getUserIdFromToken() || savedPlan?.userId || state.userId || 0
      );
      const targetPlanId = Number(
        savedPlan?.id || state.productionPlanId || (planId !== '1' ? planId : 0) || 0
      );
      const planStatus = isConfirm ? 'EXECUTE' : 'DRAFT';

      // 2. Build full production plan payload matching schema
      const fullPlanPayload = {
        id: targetPlanId,
        organizationId: Number(organizationId || savedPlan?.organizationId || 0),
        subOutletId: Number(subOutletId || savedPlan?.subOutletId || 0),
        productionLocationId: Number(productionLocationId || savedPlan?.productionLocationId || 0),
        productionsuboutletId: Number(
          productionsuboutletId || savedPlan?.productionsuboutletId || 0
        ),
        stockInOrganizationId: Number(savedPlan?.stockInOrganizationId || organizationId || 0),
        stockInSubOutletId: resolvedStockInSubOutletId,
        stockInLocationId: resolvedStockInLocationId,
        menuPlanId: Number(savedPlan?.menuPlanId || state.selectedPlan?.menuPlanId || 0),
        menuPlanDayId: Number(savedPlan?.menuPlanDayId || state.selectedPlan?.menuPlanDayId || 0),
        menuPlanDayShiftId: Number(savedPlan?.menuPlanDayShiftId || 0),
        mealTypeId: Number(
          savedPlan?.mealTypeId || state.mealTypeId || state.recipes?.[0]?.mealTypeId || 1
        ),
        priority: state.priority || savedPlan?.priority || 'High',
        producingKitchenId: Number(productionLocationId || productionsuboutletId || savedPlan?.producingKitchenId || 0),
        productionKitchenId: Number(productionLocationId || productionsuboutletId || savedPlan?.productionKitchenId || 0),
        productionStartTime: state.startTime || savedPlan?.productionStartTime || '08:00',
        productionCompletionTime: state.expectedCompletion || savedPlan?.productionCompletionTime || '14:00',
        productionNotes: state.notes || savedPlan?.productionNotes || '',
        rawMaterialIssueStoreId: Number(selectedStoreId || state.issueStoreId || resolvedStockInSubOutletId || resolvedStockInLocationId || 0),
        rawMaterialIssueStoreName: issueStore || '',
        rawMaterialIssueSubOutletId: resolvedStockInSubOutletId,
        rawMaterialIssueLocationId: resolvedStockInLocationId,
        supervisorId: Number(state.supervisorId || savedPlan?.supervisorId || 0),
        productionDate: productionDate || savedPlan?.productionDate,
        servingDate: productionDate || savedPlan?.servingDate,
        status: planStatus,
        remarks: savedPlan?.remarks || state.notes || '',
        userId: currentUserId,
        items: savedPlan?.items || [],
        additionalMaterials: savedPlan?.additionalMaterials || [],
        storeIndents: formattedStoreIndents,
      };

      let savePlanRes = null;
      try {
        savePlanRes = await saveProductionPlan(fullPlanPayload);
      } catch (e) {
        console.warn('saveProductionPlan note:', e);
      }

      const resolvedPlanId = Number(
        savePlanRes?.data?.data?.id ||
        savePlanRes?.data?.id ||
        targetPlanId
      );

      // Call /production-plan/store-indent/save ONLY if user clicks Confirm & Execute Production
      if (isConfirm) {
        const storeIndentSavePayload = {
          productionPlanId: resolvedPlanId,
          storeIndents: formattedStoreIndents,
          userId: currentUserId,
        };

        try {
          await saveProductionPlanStoreIndent(storeIndentSavePayload);
        } catch (e2) {
          console.error('saveProductionPlanStoreIndent error:', e2);
          throw e2;
        }

        notify.success('Production plan confirmed & executed successfully!');
        navigate('/production/plans');
      } else {
        notify.success('Production plan saved as draft.');
      }
    } catch (err) {
      console.error('Failed to save store indent / production plan:', err);
      notify.error(err?.response?.data?.message || err?.message || 'Failed to save production plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container>
      <div className="space-y-6 pb-16 pt-2">
        {/* Page Header */}
        <PageHeader
          title="Material Sourcing and BOM Explosion"
          backTo={`/production/plans/${planId}/allocation`}
          actions={
            <HeaderActionButton
              onClick={() => handleSaveStoreIndent(false)}
              icon={Save}
              label={saving ? 'Saving...' : 'Save Sourcing'}
              variant="outline"
              disabled={saving}
            />
          }
        />

        {/* Stepper */}
        <PlanStepper
          currentStep={3}
          onStepClick={(num) => {
            const pId = Number(savedPlan?.id || state.productionPlanId || (planId !== '1' ? planId : 0) || 0);
            if (num === 1) {
              if (pId > 0) {
                navigate(`/production/plans/edit/${pId}`, { state });
              } else {
                navigate('/production/plans/create', { state });
              }
            }
            if (num === 2) navigate(`/production/plans/${pId || planId}/allocation`, { state });
          }}
        />

        {/* BOM Summary KPIs with Kitchen & Date info */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              BOM Summary & Sourcing Status
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Layers}
              label="Total Ingredients"
              value={totalIngredientsCount}
              tone="default"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Fully Available"
              value={availableCount}
              subtext={`${availabilityPct}%`}
              tone="emerald"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Shortfalls"
              value={shortfallCount}
              tag={
                generatedPR
                  ? `PR: ${generatedPR.prCode}`
                  : shortfallCount > 0
                    ? 'Action Req.'
                    : 'None'
              }
              tone={shortfallCount > 0 ? 'rose' : 'emerald'}
            />
            <KpiCard
              icon={Boxes}
              label="Estimated RM Cost"
              value={`₹${totalBomCost.toLocaleString('en-IN')}`}
              tone="default"
            />
          </div>
        </div>

        {/* Sleek Filters Bar without double border: Search, Category, Issue Store, Meal Type */}
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ingredient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-gray-300 focus:outline-none focus:border-[#084E92] transition"
            />
          </div>

          {/* Category */}
          <div className="relative min-w-[170px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 shadow-2xs hover:border-gray-300 focus:border-[#084E92] focus:outline-none appearance-none cursor-pointer transition"
            >
              <option value="All">All Categories ({ingredients.length})</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Issue Store */}
          <div className="relative min-w-[200px]">
            <div className="flex items-center h-9 pl-2.5 pr-8 rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-gray-300 focus-within:border-[#084E92] transition">
              <Store size={14} className="text-[#084E92] shrink-0 mr-1.5" />
              <span className="text-[11px] text-gray-500 font-medium mr-1 shrink-0">Store:</span>
              <select
                value={issueStore}
                onChange={(e) => handleIssueStoreChange(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-gray-800 focus:outline-none appearance-none cursor-pointer truncate"
              >
                {storeOptions && storeOptions.length > 0 ? (
                  storeOptions.map((st) => (
                    <option key={st.id || st.name} value={st.name || st.label || st}>
                      {st.name || st.label || st}
                    </option>
                  ))
                ) : (
                  <>
                    <option value={issueStore}>{issueStore}</option>
                    <option value="PDEU - Store">PDEU - Store</option>
                    <option value="Main Store">Main Store</option>
                    <option value="Central Cold Storage">Central Cold Storage</option>
                  </>
                )}
              </select>
            </div>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Consolidated Ingredient Requirements Table */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold text-gray-900">
                  Consolidated Ingredient Requirements (Store Indent)
                </h3>
                <span className="text-xs text-gray-500 font-medium">
                  ({selectedItemIds.size} of {ingredients.length} selected)
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Review required quantities, available stock at {issueStore}, and adjust issue allocations.
              </p>
            </div>

            {/* Create Purchase Requisition Button aligned at the same level */}
            <div className="flex flex-wrap items-center gap-2">
              {generatedPR && (
                <button
                  type="button"
                  onClick={() => handleOpenPRModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#084E92] bg-blue-50 border border-blue-200 hover:bg-blue-100 transition shadow-2xs cursor-pointer"
                >
                  <FileCheck2 size={15} />
                  <span>
                    View Generated PR: <strong>{generatedPR.prCode}</strong>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    PENDING
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenPRModal(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
              >
                <PlusCircle size={14} />
                {generatedPR ? 'Create Purchase Requisition Again' : 'Create Purchase Requisition'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                <Loader2 size={24} className="animate-spin text-[#084E92]" />
                <span>Loading store indents and stock availability...</span>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider whitespace-nowrap">
                    <th className="sticky left-0 bg-slate-50 z-20 py-2.5 px-2 w-8 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={handleToggleSelectAll}
                        className="rounded border-gray-300 text-[#084E92] focus:ring-[#084E92] cursor-pointer"
                        title={isAllSelected ? 'Deselect All' : 'Select All'}
                      />
                    </th>
                    <th className="sticky left-8 bg-slate-50 z-20 py-2.5 px-2.5 text-left whitespace-nowrap border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                      Ingredient
                    </th>
                    <th className="py-2.5 px-1.5 text-left whitespace-nowrap">Category</th>
                    <th className="py-2.5 px-1.5 text-left whitespace-nowrap">Issue Store</th>
                    <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Req. Qty</th>
                    <th className="py-2.5 px-1 text-center whitespace-nowrap">UOM</th>
                    <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Avail. Qty</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap min-w-[90px]">Issue Qty</th>
                    <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Shortfall</th>
                    <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Rate (₹)</th>
                    <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Est. Cost (₹)</th>
                    <th className="py-2.5 px-1.5 text-center whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-1 text-center whitespace-nowrap w-8">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredIngredients.map((item) => {
                    const isShortfall = item.shortfall > 0 || item.status === 'SHORTFALL';
                    const isSelected = selectedItemIds.has(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={`group hover:bg-slate-50/50 transition ${
                          !isSelected ? 'opacity-60 bg-gray-50/30' : ''
                        }`}
                      >
                        <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 py-2 px-2 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectItem(item.id)}
                            className="rounded border-gray-300 text-[#084E92] focus:ring-[#084E92] cursor-pointer"
                          />
                        </td>
                        <td className="sticky left-8 bg-white group-hover:bg-slate-50 z-10 py-2 px-2.5 font-bold text-gray-900 whitespace-nowrap border-r border-slate-100 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                          {item.ingredient}
                        </td>
                        <td className="py-2 px-1.5 text-gray-600 font-medium whitespace-nowrap text-[11px]">
                          {item.category}
                        </td>
                        <td className="py-2 px-1.5 whitespace-nowrap">
                          <select
                            value={item.issueStore || issueStore}
                            onChange={(e) => handleItemStoreChange(item.id, e.target.value)}
                            className="h-7 w-24 px-1 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-800 focus:border-[#084E92] focus:outline-none truncate cursor-pointer shadow-2xs hover:border-gray-300"
                            title={item.issueStore || issueStore}
                          >
                            {storeOptions && storeOptions.length > 0 ? (
                              storeOptions.map((st) => (
                                <option key={st.id || st.name} value={st.name || st.label || st}>
                                  {st.name || st.label || st}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value={item.issueStore || issueStore}>
                                  {item.issueStore || issueStore}
                                </option>
                                <option value="PDEU - Store">PDEU - Store</option>
                                <option value="Main Store">Main Store</option>
                                <option value="Central Cold Storage">Central Cold Storage</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td className="py-2 px-1.5 text-right font-bold text-gray-900 whitespace-nowrap">
                          {item.requiredQty}
                        </td>
                        <td className="py-2 px-1 text-center text-gray-500 font-medium whitespace-nowrap text-[11px]">
                          {item.baseUom}
                        </td>
                        <td className="py-2 px-1.5 text-right font-medium text-gray-700 whitespace-nowrap">
                          {item.availableStore}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <input
                            type="number"
                            min={0}
                            value={item.issueQty ?? ''}
                            disabled={!isSelected}
                            placeholder="0"
                            onChange={(e) =>
                              handleIssueQtyChange(
                                item.id,
                                e.target.value === '' ? 0 : Number(e.target.value)
                              )
                            }
                            className="h-8 w-20 px-2 rounded-lg border border-[#C3C6D1] bg-white text-xs font-semibold text-center text-gray-800 focus:outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92] disabled:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed transition"
                          />
                        </td>
                        <td
                          className={`py-2 px-1.5 text-right font-bold whitespace-nowrap ${
                            isShortfall ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {item.shortfall}
                        </td>
                        <td className="py-2 px-1.5 text-right font-semibold text-gray-800 whitespace-nowrap">
                          ₹{item.rate}
                        </td>
                        <td className="py-2 px-1.5 text-right font-bold text-gray-900 whitespace-nowrap">
                          ₹{Number(item.estimatedCost || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-1.5 text-center whitespace-nowrap">
                          {isShortfall ? (
                            <span className="text-[10px] font-bold text-rose-600 tracking-wide uppercase px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200">
                              SHORTFALL
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600 tracking-wide uppercase px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                              AVAILABLE
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-1 text-center whitespace-nowrap w-8">
                          <button
                            type="button"
                            title="View Ingredient Details"
                            onClick={() => setSelectedIngredientForModal(item)}
                            className="p-1 rounded-lg text-gray-400 hover:text-[#084E92] hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/production/plans')}
            className="px-4 py-2.5 rounded-xl border border-rose-300 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/production/plans/${planId}/allocation`, { state })}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              Back to Recipe Allocation
            </button>
            <button
              type="button"
              onClick={() => handleSaveStoreIndent(false)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer"
            >
              <Save size={14} />
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSaveStoreIndent(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
            >
              {saving ? 'Executing...' : 'Confirm & Execute Production'}
              <CheckCircle2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreatePurchaseRequisitionModal
        isOpen={isPRModalOpen}
        onClose={() => {
          setIsPRModalOpen(false);
          setIsViewingPR(false);
        }}
        items={ingredients.filter((item) => selectedItemIds.has(item.id))}
        shortfalls={ingredients.filter((item) => item.shortfall > 0)}
        planInfo={{
          planCode,
          organizationId,
          organizationName,
          selectedStoreId,
          storeId: selectedStoreId,
          productionsuboutletId,
          productionsuboutletName: producingKitchen,
          productionDate,
          subOutletId: selectedStoreId || productionsuboutletId || subOutletId,
          subOutletName: issueStore,
          issueStore,
        }}
        generatedPR={isViewingPR ? generatedPR : null}
        onPRGenerated={(pr) => {
          setGeneratedPR(pr);
          setIsViewingPR(true);
        }}
      />

      <IngredientDetailsModal
        isOpen={Boolean(selectedIngredientForModal)}
        ingredient={selectedIngredientForModal}
        ingredientName={selectedIngredientForModal?.ingredient || selectedIngredientForModal || 'Paneer'}
        productionPlanId={Number(savedPlan?.id || state.productionPlanId || (planId !== '1' ? planId : 0) || 0)}
        onClose={() => setSelectedIngredientForModal(null)}
      />
    </Container>
  );
};

export default MaterialSourcing;
