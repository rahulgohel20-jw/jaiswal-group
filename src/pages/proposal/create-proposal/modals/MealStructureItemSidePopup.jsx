import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Scale,
  Banknote,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getEligibleSlotRecipes,
  saveMenuItemsBatch,
  deleteProposalMenuItem,
  getSlotMenuItems,
} from '@/services/apiServices';
import { extractArray } from '../types';
import { RecipeBomModal } from './RecipeBomModal';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';

const DEFAULT_MATERIAL_CENTERS = [
  { id: 1, name: 'Kitchen', materialCenterName: 'Kitchen' },
  { id: 2, name: 'Main Store', materialCenterName: 'Main Store' },
];

export const MealStructureItemSidePopup = ({
  isOpen,
  onClose,
  slot,
  shift,
  proposalId,
  organizationId,
  subOutletId,
  effectiveDate,
  defaultMaterialCenterId,
  defaultSupplyDays = 30,
  onSaveApply,
}) => {
  const [recipes, setRecipes] = useState([]);
  const [materialCenters] = useState(DEFAULT_MATERIAL_CENTERS);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirm modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // Selected recipe in top dropdown
  const [selectedRecipeId, setSelectedRecipeId] = useState('');

  // Table items configured for this meal structure item
  const [tableItems, setTableItems] = useState([]);
  const [initialItems, setInitialItems] = useState([]);

  // BOM Details Modal state for selecting/editing particular recipe
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [selectedRecipeForBom, setSelectedRecipeForBom] = useState(null);
  const [bomModalMode, setBomModalMode] = useState({ isEdit: false, editIndex: null });

  // Clean slot title to avoid duplicate category parentheses like "Cold Soup (Starters) (Starters)"
  const displaySlotName = useMemo(() => {
    if (!slot?.slotName) return 'Meal Item';
    const name = String(slot.slotName).trim();
    const cat = slot.kitchenMenuCategoryName ? String(slot.kitchenMenuCategoryName).trim() : '';
    if (cat && name.toLowerCase().endsWith(`(${cat.toLowerCase()})`)) {
      return name;
    }
    return cat ? `${name} (${cat})` : name;
  }, [slot?.slotName, slot?.kitchenMenuCategoryName]);

  // Load eligible recipes mapped to this slot's kitchenMenuCategory based on kitchenMenuCategoryId and mealTypeId
  useEffect(() => {
    if (!isOpen || !slot) return;

    let isMounted = true;
    const fetchEligible = async () => {
      const catId = slot.kitchenMenuCategoryId ? Number(slot.kitchenMenuCategoryId) : null;
      const mTypeId = shift?.mealTypeId ? Number(shift.mealTypeId) : null;

      if (!catId || !mTypeId) {
        console.warn('Missing required params for getEligibleSlotRecipes:', {
          kitchenMenuCategoryId: catId,
          mealTypeId: mTypeId,
        });
        return;
      }

      setLoadingEligible(true);
      try {
        const params = {
          kitchenMenuCategoryId: catId,
          mealTypeId: mTypeId,
        };
        if (organizationId) {
          params.organizationId = Number(organizationId);
        }
        if (subOutletId) {
          params.subOutletId = Number(subOutletId);
        }

        const res = await getEligibleSlotRecipes(params);
        if (!isMounted) return;

        const list = extractArray(res);
        setRecipes(list);
      } catch (err) {
        console.warn('Failed to load eligible recipes for category:', err);
        if (isMounted) setRecipes([]);
      } finally {
        if (isMounted) setLoadingEligible(false);
      }
    };

    fetchEligible();

    return () => {
      isMounted = false;
    };
  }, [isOpen, slot?.id, slot?.kitchenMenuCategoryId, shift?.mealTypeId, organizationId, subOutletId]);

  // Load existing items for this slot
  useEffect(() => {
    if (!isOpen || !slot) return;

    const loadExistingItems = async () => {
      setLoadingItems(true);
      try {
        let itemsList = [];
        if (slot.id && typeof slot.id === 'number') {
          try {
            const res = await getSlotMenuItems(slot.id);
            itemsList = extractArray(res);
          } catch (e) {
            console.warn('getSlotMenuItems fallback to slot.items:', e);
          }
        }
        if (itemsList.length === 0 && Array.isArray(slot.items) && slot.items.length > 0) {
          itemsList = slot.items;
        }

        const normalized = itemsList.map((it, idx) => {
          const days = Number(it.supplyDays ?? defaultSupplyDays ?? 30);
          const ctp = Number(
            it.avgRmcPerDay ||
            it.costToPlateDaily ||
            it.costPerPerson ||
            it.portionCost ||
            (it.monthlyRmcCost && days ? Number((it.monthlyRmcCost / days).toFixed(2)) : 0) ||
            0
          );
          const cp = Number(it.monthlyRmcCost ?? it.rmcMonthCost ?? it.costPriceMonthly ?? (ctp * days));
          const lpg = Number(it.monthlyLpgCost ?? it.lpgCost ?? 0);
          const perKg = Number(it.costPerKg ?? 0);
          const rawItemName = it.foodName || it.kitchenMenuItemName || it.itemName || 'Recipe Item';
          const itCat = it.kitchenMenuCategoryName || it.categoryName;
          const displayItemName = itCat && !rawItemName.toLowerCase().endsWith(`(${itCat.toLowerCase()})`)
            ? `${rawItemName} (${itCat})`
            : rawItemName;
          const portionQty = Number(
            it.perPersonConsumptionQuantity ??
            it.perPersonPortionWeight ??
            it.portionSize ??
            it.quantityPerPerson ??
            1
          );
          const unitSymbol =
            it.perPersonConsumptionUnitSymbol ||
            it.perPersonPortionUnitSymbol ||
            it.uomSymbol ||
            'kg';
          return {
            id: it.id || `item_${idx + 1}`,
            isNew: false,
            kitchenMenuItemId: it.kitchenMenuItemId || it.recipeId,
            itemName: displayItemName,
            supplyDays: days,
            quantityPerPerson: portionQty,
            perPersonPortionWeight: portionQty,
            perPersonConsumptionQuantity: portionQty,
            uomSymbol: unitSymbol,
            perPersonPortionUnitSymbol: unitSymbol,
            perPersonConsumptionUnitSymbol: unitSymbol,
            costPriceMonthly: cp,
            costToPlateDaily: ctp,
            lpgCost: lpg,
            materialCenterId: it.materialCenterId || defaultMaterialCenterId || 1,
            unit: it.unit || null,
            uomId: Number(
              it.perPersonConsumptionUnitId ||
              it.unit?.id ||
              it.unitId ||
              (it.uomId && it.uomId !== 1 ? it.uomId : null) ||
              it.portionUnitId ||
              12
            ),
            isLpgRequired: it.isLpgRequired !== false,
            costPerKg: perKg,
            recipeMaterialCost: it.recipeMaterialCost != null ? Number(it.recipeMaterialCost) : (it.totalIngredientCost != null ? Number(it.totalIngredientCost) : ctp),
            totalPortionCost: it.totalPortionCost != null ? Number(it.totalPortionCost) : (it.costPerPerson != null ? Number(it.costPerPerson) : ctp),
            recipeHeaderId: it.recipeHeaderId || null,
            proposalShiftId: Number(
              it.proposalShiftId ||
              slot?.proposalShiftId ||
              slot?.shiftId ||
              shift?.id ||
              shift?.shiftId ||
              0
            ),
            dayOfWeek: it.dayOfWeek || 'MONDAY',
            ingredientRateOverrides: it.ingredientRateOverrides || [],
            remarks: it.remarks || '',
            userId: it.userId || 1,
            pricingBasis: it.pricingBasis || 'LAST_PURCHASE',
            lpgCostPerDay: it.lpgCostPerDay != null ? Number(it.lpgCostPerDay) : (lpg && days ? Number((lpg / days).toFixed(4)) : 0),
            fuelUtilityCost: it.fuelUtilityCost != null ? Number(it.fuelUtilityCost) : lpg,
            monthlyLpgCost: it.monthlyLpgCost != null ? Number(it.monthlyLpgCost) : lpg,
            monthlyRmcCost: it.monthlyRmcCost != null ? Number(it.monthlyRmcCost) : cp,
            avgRmcPerDay: it.avgRmcPerDay != null ? Number(it.avgRmcPerDay) : ctp,
            totalCost: it.totalCost != null ? Number(it.totalCost) : Number((cp + lpg).toFixed(2)),
          };
        });

        setTableItems(normalized);
        setInitialItems(normalized);
      } finally {
        setLoadingItems(false);
      }
    };

    loadExistingItems();
  }, [isOpen, slot, defaultSupplyDays, defaultMaterialCenterId]);

  // Open BOM modal when user selects a recipe from the dropdown
  const handleOpenBomForRecipe = (recipeItem, isEdit = false, editIndex = null) => {
    setSelectedRecipeForBom(recipeItem);
    setBomModalMode({ isEdit, editIndex });
    setIsBomModalOpen(true);
  };

  // Called when user clicks "Apply BOM" in the RecipeBomModal
  const handleApplyBom = ({
    recipe,
    isEdit,
    editIndex,
    materialCenterId,
    isLpgRequired,
    costPerPerson,
    costPerKg,
    lpgCost,
    recipeMaterialCost,
    totalPortionCost,
    recipeHeaderId,
    selectedOutletRecipe,
    uomId,
    uomSymbol,
    pricingBasis,
    fromDate,
    toDate,
    perPersonPortionWeight,
    perPersonPortionUnitSymbol,
    perPersonConsumptionQuantity,
    perPersonConsumptionUnitSymbol,
    perPersonConsumptionUnitId,
  }) => {
    const days = Number(defaultSupplyDays || 30);
    const cp = Number((costPerPerson * days).toFixed(2));
    const monthlyLpg = Number((lpgCost * days).toFixed(2));
    const resolvedUomId = Number(
      perPersonConsumptionUnitId ||
      uomId ||
      selectedOutletRecipe?.unit?.id ||
      selectedOutletRecipe?.unitId ||
      recipe.unit?.id ||
      recipe.unitId ||
      (recipe.uomId && recipe.uomId !== 1 ? recipe.uomId : null) ||
      recipe.portionUnitId ||
      12 // Default to 12 (Kilogram)
    );
    const resolvedUomSymbol =
      perPersonConsumptionUnitSymbol ||
      perPersonPortionUnitSymbol ||
      uomSymbol ||
      recipe.perPersonConsumptionUnitSymbol ||
      recipe.perPersonPortionUnitSymbol ||
      recipe.portionUnitSymbol ||
      recipe.uomSymbol ||
      'kg';

    const portion =
      perPersonConsumptionQuantity != null && perPersonConsumptionQuantity !== ''
        ? Number(perPersonConsumptionQuantity)
        : perPersonPortionWeight != null && perPersonPortionWeight !== ''
        ? Number(perPersonPortionWeight)
        : Number(recipe.perPersonConsumptionQuantity || recipe.perPersonPortionWeight || recipe.portionQty || recipe.portionSize || recipe.quantity || 1);

    if (isEdit && editIndex !== null) {
      setTableItems((prev) => {
        const updated = [...prev];
        const target = { ...updated[editIndex] };
        target.materialCenterId = materialCenterId;
        target.costToPlateDaily = costPerPerson;
        target.avgRmcPerDay = costPerPerson;
        target.costPriceMonthly = Number((costPerPerson * (target.supplyDays || days)).toFixed(2));
        target.monthlyRmcCost = target.costPriceMonthly;
        target.lpgCostPerDay = lpgCost;
        target.lpgCost = Number((lpgCost * (target.supplyDays || days)).toFixed(2));
        target.monthlyLpgCost = target.lpgCost;
        target.isLpgRequired = isLpgRequired;
        target.costPerKg = costPerKg;
        if (recipeMaterialCost != null) target.recipeMaterialCost = Number(recipeMaterialCost);
        if (totalPortionCost != null) target.totalPortionCost = Number(totalPortionCost);
        if (pricingBasis) target.pricingBasis = pricingBasis;
        if (fromDate) target.fromDate = fromDate;
        if (toDate) {
          target.toDate = toDate;
        }
        if (recipeHeaderId) target.recipeHeaderId = recipeHeaderId;
        if (selectedOutletRecipe) target.selectedOutletRecipe = selectedOutletRecipe;
        if (selectedOutletRecipe?.unit || recipe.unit) target.unit = selectedOutletRecipe?.unit || recipe.unit;
        target.uomId = resolvedUomId;
        target.uomSymbol = resolvedUomSymbol;
        target.perPersonPortionWeight = portion;
        target.perPersonConsumptionQuantity = portion;
        target.quantityPerPerson = portion;
        target.perPersonPortionUnitSymbol = resolvedUomSymbol;
        target.perPersonConsumptionUnitSymbol = resolvedUomSymbol;
        target.perPersonConsumptionUnitId = resolvedUomId;
        updated[editIndex] = target;
        return updated;
      });
      toast.success(`"${targetName(recipe)}" BOM updated.`);
    } else {
      // Check if recipe already added
      const recipeId = recipe.kitchenMenuItemId ?? recipe.id;
      if (tableItems.some((it) => String(it.kitchenMenuItemId) === String(recipeId))) {
        toast.info('This recipe is already in the list.');
        return;
      }

      const rawItemName =
        recipe.kitchenMenuItemName ||
        recipe.itemName ||
        recipe.foodName ||
        'New Recipe';
      const catName = recipe.kitchenMenuCategoryName || recipe.categoryName;
      const itemName =
        catName && !rawItemName.toLowerCase().endsWith(`(${catName.toLowerCase()})`)
          ? `${rawItemName} (${catName})`
          : rawItemName;

      const newItem = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        isNew: true,
        kitchenMenuItemId: recipeId,
        recipeHeaderId: recipeHeaderId || null,
        selectedOutletRecipe: selectedOutletRecipe || null,
        unit: selectedOutletRecipe?.unit || recipe.unit || null,
        itemName,
        supplyDays: days,
        quantityPerPerson: portion,
        perPersonPortionWeight: portion,
        perPersonConsumptionQuantity: portion,
        uomSymbol: resolvedUomSymbol,
        perPersonPortionUnitSymbol: resolvedUomSymbol,
        perPersonConsumptionUnitSymbol: resolvedUomSymbol,
        perPersonConsumptionUnitId: resolvedUomId,
        costPriceMonthly: cp,
        costToPlateDaily: costPerPerson,
        avgRmcPerDay: costPerPerson,
        lpgCost: monthlyLpg,
        lpgCostPerDay: lpgCost,
        monthlyLpgCost: monthlyLpg,
        monthlyRmcCost: cp,
        materialCenterId: materialCenterId || defaultMaterialCenterId || 1,
        uomId: resolvedUomId,
        isLpgRequired,
        costPerKg,
        proposalShiftId: Number(
          slot?.proposalShiftId ||
          slot?.shiftId ||
          shift?.id ||
          shift?.shiftId ||
          shift?.proposalShiftId ||
          0
        ),
        proposalMenuSlotId: Number(slot?.id ?? slot?.slotId ?? slot?.proposalMenuSlotId ?? 0),
        recipeMaterialCost: recipeMaterialCost != null ? Number(recipeMaterialCost) : Number(costPerPerson || 0),
        totalPortionCost: totalPortionCost != null ? Number(totalPortionCost) : Number(costPerPerson || 0),
        pricingBasis: pricingBasis || 'LAST_PURCHASE',
        fromDate: fromDate || null,
        toDate: toDate || null,
      };

      setTableItems((prev) => [...prev, newItem]);
      setSelectedRecipeId('');
      toast.success(`"${newItem.itemName}" added with BOM.`);
    }
  };

  const targetName = (r) =>
    r?.kitchenMenuItemName || r?.itemName || r?.foodName || 'Recipe';

  // Construct exact item payload for /api/proposal-menu/items/batch-save
  const buildBatchSaveItem = (item, newSupplyDays) => {
    const days = Math.max(1, Math.min(30, Number(newSupplyDays) || 1));
    const ctp = Number(item.costToPlateDaily ?? item.avgRmcPerDay ?? 0);
    const monthlyRmc = Number((ctp * days).toFixed(2));
    const dailyLpg = Number(
      item.lpgCostPerDay ?? (item.lpgCost && item.supplyDays ? item.lpgCost / item.supplyDays : 0)
    );
    const monthlyLpg = Number(
      (item.isLpgRequired !== false ? (dailyLpg ? dailyLpg * days : item.lpgCost || 0) : 0).toFixed(2)
    );
    const fuelUtility = Number((item.fuelUtilityCost ?? monthlyLpg).toFixed(2));
    const totalCostVal = Number((monthlyRmc + monthlyLpg).toFixed(2));

    const step1OrgId = organizationId ? Number(organizationId) : 0;
    const step1SubOutletId = subOutletId ? Number(subOutletId) : 0;

    const isRealNumericId =
      typeof item.id === 'number'
        ? item.id > 0
        : typeof item.id === 'string' &&
          !item.id.startsWith('temp_') &&
          !item.id.startsWith('item_') &&
          !isNaN(Number(item.id)) &&
          Number(item.id) > 0;
    const realId = isRealNumericId ? Number(item.id) : 0;

    const overrides = Array.isArray(item.ingredientRateOverrides)
      ? item.ingredientRateOverrides.map((ov) => ({
          rawMaterialId: Number(ov.rawMaterialId || ov.materialId || 0),
          unitRate: Number(ov.unitRate || ov.rate || 0),
          uomId: Number(ov.unit?.id || (ov.uomId && ov.uomId !== 1 ? ov.uomId : null) || ov.unitId || 12),
        }))
      : [];

    return {
      avgRmcPerDay: ctp,
      dayOfWeek: item.dayOfWeek || 'MONDAY',
      fuelUtilityCost: fuelUtility,
      id: realId,
      ingredientRateOverrides: overrides,
      isLpgRequired: item.isLpgRequired !== false,
      kitchenMenuItemId: Number(item.kitchenMenuItemId || item.recipeId || item.menuItemId || 0),
      lpgCostPerDay: dailyLpg,
      materialCenterOrgId: step1OrgId || Number(item.materialCenterOrgId || item.materialCenterId || defaultMaterialCenterId || 0),
      materialCenterSubLocationId: step1SubOutletId || Number(item.materialCenterSubLocationId || 0),
      materialCenterSubOutletId: step1SubOutletId || Number(item.materialCenterSubOutletId || 0),
      monthlyLpgCost: monthlyLpg,
      monthlyRmcCost: monthlyRmc,
      recipeMaterialCost:
        item.recipeMaterialCost != null
          ? Number(item.recipeMaterialCost)
          : item.totalIngredientCost != null
          ? Number(item.totalIngredientCost)
          : Number(ctp || 0),
      totalPortionCost:
        item.totalPortionCost != null
          ? Number(item.totalPortionCost)
          : item.costPerPerson != null
          ? Number(item.costPerPerson)
          : Number(ctp || 0),
      portionSize: Number(
        item.perPersonConsumptionQuantity ??
        item.perPersonPortionWeight ??
        item.quantityPerPerson ??
        item.portionSize ??
        1
      ),
      perPersonPortionWeight:
        item.perPersonConsumptionQuantity != null
          ? Number(item.perPersonConsumptionQuantity)
          : item.perPersonPortionWeight != null
          ? Number(item.perPersonPortionWeight)
          : item.quantityPerPerson != null
          ? Number(item.quantityPerPerson)
          : undefined,
      perPersonConsumptionQuantity:
        item.perPersonConsumptionQuantity != null
          ? Number(item.perPersonConsumptionQuantity)
          : item.perPersonPortionWeight != null
          ? Number(item.perPersonPortionWeight)
          : item.quantityPerPerson != null
          ? Number(item.quantityPerPerson)
          : undefined,
      perPersonPortionUnitSymbol: item.perPersonConsumptionUnitSymbol || item.perPersonPortionUnitSymbol || item.uomSymbol || undefined,
      perPersonConsumptionUnitSymbol: item.perPersonConsumptionUnitSymbol || item.perPersonPortionUnitSymbol || item.uomSymbol || undefined,
      perPersonConsumptionUnitId: item.perPersonConsumptionUnitId || item.uomId || undefined,
      pricingBasis: item.pricingBasis || 'LAST_PURCHASE',
      proposalMenuSlotId: Number(slot?.id ?? slot?.slotId ?? slot?.proposalMenuSlotId ?? 0),
      proposalShiftId: Number(
        item.proposalShiftId ||
        slot?.proposalShiftId ||
        slot?.shiftId ||
        shift?.id ||
        shift?.shiftId ||
        shift?.proposalShiftId ||
        0
      ),
      remarks: item.remarks || '',
      supplyDays: days,
      totalCost: totalCostVal,
      uomId: Number(
        item.perPersonConsumptionUnitId ||
        item.unit?.id ||
        item.selectedOutletRecipe?.unit?.id ||
        item.selectedOutletRecipe?.unitId ||
        (item.uomId && item.uomId !== 1 ? item.uomId : null) ||
        item.unitId ||
        item.portionUnitId ||
        12
      ),
      userId: Number(item.userId || 1),
    };
  };

  // Modify row inline values and autocalculate CP per month & LPG cost without API call
  const handleItemFieldChange = (index, field, value) => {
    const currentItem = tableItems[index];
    if (!currentItem) return;

    if (field === 'supplyDays') {
      if (value === '') {
        setTableItems((prev) => {
          const updated = [...prev];
          if (!updated[index]) return prev;
          updated[index] = {
            ...updated[index],
            supplyDays: '',
            costPriceMonthly: 0,
            monthlyRmcCost: 0,
            lpgCost: 0,
            monthlyLpgCost: 0,
            totalCost: 0,
          };
          return updated;
        });
        return;
      }

      const numVal = Number(value);
      if (numVal > 30) {
        toast.error('Supply days cannot exceed 30 days.');
      }
      const days = Math.max(1, Math.min(30, numVal || 1));
      const ctp = Number(currentItem.costToPlateDaily ?? currentItem.avgRmcPerDay ?? 0);
      const newMonthlyRmc = Number((ctp * days).toFixed(2));
      const dailyLpg = Number(
        currentItem.lpgCostPerDay != null
          ? currentItem.lpgCostPerDay
          : (currentItem.lpgCost && currentItem.supplyDays ? Number(currentItem.lpgCost) / Number(currentItem.supplyDays) : 0)
      );
      const newMonthlyLpg = Number(
        (currentItem.isLpgRequired !== false ? (dailyLpg ? dailyLpg * days : 0) : 0).toFixed(2)
      );
      const newTotalCost = Number((newMonthlyRmc + newMonthlyLpg).toFixed(2));

      // Update state locally and autocalculate CP monthly and LPG cost
      setTableItems((prev) => {
        const updated = [...prev];
        if (!updated[index]) return prev;
        updated[index] = {
          ...updated[index],
          supplyDays: days,
          costPriceMonthly: newMonthlyRmc,
          monthlyRmcCost: newMonthlyRmc,
          lpgCost: newMonthlyLpg,
          monthlyLpgCost: newMonthlyLpg,
          lpgCostPerDay: dailyLpg,
          totalCost: newTotalCost,
        };
        return updated;
      });
    } else if (field === 'materialCenterId') {
      setTableItems((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], materialCenterId: Number(value) };
        }
        return updated;
      });
    } else if (field === 'quantityPerPerson') {
      setTableItems((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          const num = Number(value) || 0;
          updated[index] = {
            ...updated[index],
            quantityPerPerson: num,
            perPersonConsumptionQuantity: num,
            perPersonPortionWeight: num,
          };
        }
        return updated;
      });
    }
  };

  const handleSupplyDaysBlur = (index) => {
    const item = tableItems[index];
    if (!item) return;
    const days = Math.max(1, Math.min(30, Number(item.supplyDays) || 1));
    if (item.supplyDays !== days) {
      handleItemFieldChange(index, 'supplyDays', days);
    }
  };

  // Remove item from table
  const handleDeleteItemClick = (item, index) => {
    setDeleteTarget({ item, index });
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    const { item, index } = deleteTarget;
    setDeletingItem(true);
    try {
      if (!item.isNew && item.id && typeof item.id === 'number') {
        try {
          await deleteProposalMenuItem(item.id, 1);
        } catch (err) {
          console.warn('Delete backend item error:', err);
        }
      }
      setTableItems((prev) => prev.filter((_, idx) => idx !== index));
      toast.success('Item removed.');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete backend item error:', err);
      toast.error('Failed to remove item.');
    } finally {
      setDeletingItem(false);
    }
  };

  // Reset changes to initial state
  const handleReset = () => {
    setTableItems([...initialItems]);
    toast.info('Changes reset to initial state.');
  };

  // Aggregated totals matching Image 2
  const totals = useMemo(() => {
    const totalDays = tableItems.reduce((acc, it) => acc + (Number(it.supplyDays) || 0), 0);
    const totalQty = tableItems.reduce((acc, it) => acc + (Number(it.perPersonConsumptionQuantity ?? it.perPersonPortionWeight ?? it.quantityPerPerson) || 0), 0);
    const totalCp = tableItems.reduce((acc, it) => acc + (Number(it.costPriceMonthly) || 0), 0);
    const totalCtp = tableItems.reduce((acc, it) => acc + (Number(it.avgRmcPerDay ?? it.costToPlateDaily) || 0), 0);
    const totalLpg = tableItems.reduce((acc, it) => acc + (Number(it.lpgCost) || 0), 0);

    const count = tableItems.length || 1;
    const avgWeight = totalQty > 0 ? (totalQty / count).toFixed(3) : '0.000';
    const average = totalDays > 0 ? (totalCp / totalDays).toFixed(4) : '0.0000';
    const avgCostDay = tableItems.length > 0 && totalCtp > 0 ? (totalCtp / count).toFixed(4) : '0.0000';

    return {
      totalDays,
      totalQty: totalQty > 0 ? totalQty.toFixed(4) : '0.0000',
      totalCp: totalCp.toFixed(2),
      totalCpFormatted: totalCp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalCtp: totalCtp.toFixed(2),
      totalCtpFormatted: totalCtp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalLpg: totalLpg.toFixed(2),
      totalLpgFormatted: totalLpg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      avgWeight,
      average,
      avgCostDay,
    };
  }, [tableItems]);

  // Save & Apply multiple recipes via /api/proposal-menu/slots/{slotId}/items/batch-save
  const handleSaveApply = async () => {
    if (tableItems.length === 0) {
      toast.error('Please add at least one recipe before saving.');
      return;
    }

    setSaving(true);
    try {
      const slotId = Number(slot?.id ?? slot?.slotId ?? slot?.proposalMenuSlotId ?? 0);
      const batchPayload = tableItems.map((item) => buildBatchSaveItem(item, item.supplyDays));
      const res = await saveMenuItemsBatch(slotId, batchPayload);
      const savedList = extractArray(res) || [];
      let updatedItems = [...tableItems];
      if (Array.isArray(savedList) && savedList.length > 0) {
        updatedItems = tableItems.map((it, idx) => {
          const matched =
            savedList.find(
              (s) =>
                (s.kitchenMenuItemId && s.kitchenMenuItemId === it.kitchenMenuItemId) ||
                (s.id && s.id === it.id)
            ) || savedList[idx];
          if (matched) {
            const resCtp = Number(matched.avgRmcPerDay ?? it.avgRmcPerDay ?? it.costToPlateDaily ?? 0);
            return {
              ...it,
              id: matched.id || it.id,
              isNew: false,
              costToPlateDaily: resCtp,
              avgRmcPerDay: resCtp,
              costPriceMonthly: Number(matched.monthlyRmcCost ?? it.costPriceMonthly),
              monthlyRmcCost: Number(matched.monthlyRmcCost ?? it.costPriceMonthly),
              monthlyLpgCost: Number(matched.monthlyLpgCost ?? it.lpgCost),
              lpgCost: Number(matched.monthlyLpgCost ?? it.lpgCost),
              lpgCostPerDay: Number(matched.lpgCostPerDay ?? it.lpgCostPerDay),
              totalCost: Number(matched.totalCost ?? it.totalCost),
              pricingBasis: matched.pricingBasis || it.pricingBasis || 'LAST_PURCHASE',
            };
          }
          return it;
        });
        setTableItems(updatedItems);
      }

      toast.success(`Items saved and applied for ${displaySlotName}.`);
      if (onSaveApply) {
        await onSaveApply(updatedItems);
      }
      onClose();
    } catch (err) {
      console.error('Failed to batch save slot items:', err);
      toast.error('Failed to save items. Please check recipe details.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl h-full shadow-2xl flex flex-col border-l border-gray-100 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="min-w-0 pr-3">
            <h2 className="text-sm font-bold text-gray-900 truncate" title={`Configure Meal Structure Item: ${displaySlotName}`}>
              Configure Meal Structure Item: {displaySlotName}
            </h2>
            {/* <p className="text-xs text-gray-400">
              Add and configure recipes mapped with this category
            </p> */}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top Recipe Selection Bar */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              Item Name <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                {loadingEligible ? (
                  <div className="h-10 px-3 flex items-center gap-2 border border-gray-200 rounded-xl text-xs text-gray-400 bg-gray-50">
                    <Loader2 size={14} className="animate-spin text-[#084E92]" />
                    Loading recipes...
                  </div>
                ) : (
                  <select
                    value={selectedRecipeId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedRecipeId(val);
                      if (val) {
                        const found = recipes.find(
                          (r) => String(r.kitchenMenuItemId ?? r.id) === String(val)
                        );
                        if (found) {
                          handleOpenBomForRecipe(found, false, null);
                        }
                      }
                    }}
                    className="w-full h-10 px-3.5 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:border-[#084E92] shadow-2xs cursor-pointer truncate"
                  >
                    <option value="">
                      {recipes.length === 0
                        ? 'Select Item Name'
                        : 'Select Item Name'}
                    </option>
                    {recipes.map((r, idx) => {
                      const itemVal = r.kitchenMenuItemId ?? r.id ?? idx;
                      const rawName =
                        r.kitchenMenuItemName ||
                        r.itemName ||
                        r.foodName ||
                        (r.kitchenMenuItemId ? `Item #${r.kitchenMenuItemId}` : `Recipe #${idx + 1}`);
                      const catName = r.kitchenMenuCategoryName || r.categoryName;
                      const label =
                        catName && !rawName.toLowerCase().endsWith(`(${catName.toLowerCase()})`)
                          ? `${rawName} (${catName})`
                          : rawName;

                      return (
                        <option key={itemVal} value={itemVal}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!selectedRecipeId) {
                    toast.error('Please select an item first.');
                    return;
                  }
                  const found = recipes.find(
                    (r) => String(r.kitchenMenuItemId ?? r.id) === String(selectedRecipeId)
                  );
                  if (found) {
                    handleOpenBomForRecipe(found, false, null);
                  }
                }}
                disabled={!selectedRecipeId || loadingEligible}
                className="w-10 h-10 rounded-xl bg-[#084E92] hover:bg-[#073e77] text-white flex items-center justify-center transition shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
                title="Configure Recipe BOM"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Table matching UI layout */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-2xs bg-white">
            {loadingItems ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                <Loader2 size={20} className="animate-spin text-[#084E92]" />
                <p className="text-xs">Loading items...</p>
              </div>
            ) : tableItems.length === 0 ? (
              <div className="py-14 text-center text-gray-400 text-xs italic bg-white px-4">
                No items added yet. Select an item above to configure its BOM and add.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[700px] text-left border-collapse text-xs table-auto">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-3 whitespace-nowrap">ITEM NAME</th>
                      <th className="py-3 px-2 text-center whitespace-nowrap">SUPPLY DAYS</th>
                      <th className="py-2.5 px-2 text-center leading-tight whitespace-nowrap">
                        <div>QUANTITY PER</div>
                        <div className="text-[9px] font-medium text-gray-400">PERSON</div>
                      </th>
                      <th className="py-3 px-2 text-center whitespace-nowrap">UNIT</th>
                      <th className="py-2.5 px-2.5 text-right leading-tight whitespace-nowrap">
                        <div>C. P. PER</div>
                        <div className="text-[9px] font-medium text-gray-400">(MONTHLY)</div>
                      </th>
                      <th className="py-2.5 px-2.5 text-right leading-tight whitespace-nowrap">
                        <div>C. T. P. PER</div>
                        <div className="text-[9px] font-medium text-gray-400">(PER DAY)</div>
                      </th>
                      <th className="py-3 px-2.5 text-right whitespace-nowrap">LPG COST</th>
                      <th className="py-3 px-2.5 text-center whitespace-nowrap">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {tableItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3 px-3 font-bold text-gray-900 truncate max-w-[140px]" title={item.itemName}>
                          {item.itemName}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={item.supplyDays}
                            onChange={(e) => handleItemFieldChange(idx, 'supplyDays', e.target.value)}
                            onBlur={() => handleSupplyDaysBlur(idx)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            className="w-12 h-8 text-center rounded-lg border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#084E92] bg-white"
                          />
                        </td>
                        <td className="py-3 px-2 text-center text-gray-800 font-medium whitespace-nowrap">
                          {Number(item.perPersonConsumptionQuantity ?? item.perPersonPortionWeight ?? item.quantityPerPerson ?? 0).toFixed(3)}
                        </td>
                        <td className="py-3 px-2 text-center text-gray-600 whitespace-nowrap">
                          {item.perPersonConsumptionUnitSymbol || item.perPersonPortionUnitSymbol || item.uomSymbol || 'kg'}
                        </td>
                        <td className="py-3 px-2.5 text-right text-gray-900 font-semibold whitespace-nowrap">
                          {Number(item.costPriceMonthly || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-2.5 text-right text-gray-900 font-semibold whitespace-nowrap">
                          {Number(item.avgRmcPerDay ?? item.costToPlateDaily ?? 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-2.5 text-right text-gray-900 font-semibold whitespace-nowrap">
                          {Number(item.lpgCost || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenBomForRecipe(item, true, idx)}
                              className="w-7 h-7 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center transition cursor-pointer"
                              title="Edit BOM Details"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItemClick(item, idx)}
                              className="w-7 h-7 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot>
                    <tr className="bg-white border-t border-gray-200 font-bold text-xs text-[#084E92]">
                      <td className="py-3 px-3 uppercase tracking-wide font-bold">TOTAL</td>
                      <td className="py-3 px-2 text-center font-bold">{totals.totalDays}</td>
                      <td className="py-3 px-2 text-center font-bold">{totals.totalQty}</td>
                      <td className="py-3 px-2 text-center">—</td>
                      <td className="py-3 px-2.5 text-right font-bold">{totals.totalCpFormatted}</td>
                      <td className="py-3 px-2.5 text-right font-bold">{totals.totalCtpFormatted}</td>
                      <td className="py-3 px-2.5 text-right font-bold">{totals.totalLpgFormatted}</td>
                      <td className="py-3 px-2.5 text-center">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Summary Cards - Simple & Small */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 block">Average</span>
                <span className="text-sm font-bold text-gray-900 mt-0.5 block">{totals.average}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center text-gray-400 shadow-2xs shrink-0">
                <Scale size={15} />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 block">Avg. Cost Per Day</span>
                <span className="text-sm font-bold text-[#084E92] mt-0.5 block">{totals.avgCostDay}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center text-[#084E92] shadow-2xs shrink-0">
                <Banknote size={15} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-white flex items-center justify-end">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveApply}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Save &amp; Apply
            </button>
          </div>
        </div>
      </div>

      {/* Bill of Materials Details Modal matching User Screenshot */}
      {isBomModalOpen && selectedRecipeForBom && (
        <RecipeBomModal
          isOpen={isBomModalOpen}
          onClose={() => {
            setIsBomModalOpen(false);
            setSelectedRecipeForBom(null);
          }}
          recipe={selectedRecipeForBom}
          salesProduct={shift?.shiftName || 'LUNCH'}
          cfGroupName={slot?.kitchenMenuCategoryName || slot?.slotName || 'KATHOD CF'}
          organizationId={organizationId}
          materialCenters={materialCenters}
          defaultMaterialCenterId={defaultMaterialCenterId}
          subOutletId={subOutletId}
          isEdit={bomModalMode.isEdit}
          editIndex={bomModalMode.editIndex}
          onApplyBom={handleApplyBom}
        />
      )}

      {/* Delete Item Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!deletingItem) setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteItem}
        title="Delete Item"
        itemLabel={deleteTarget?.item?.itemName || 'Item'}
        saving={deletingItem}
      />
    </div>
  );
};

export default MealStructureItemSidePopup;
