import { useState, useEffect, useCallback, useRef } from 'react';
import { X, FileText, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  calculateRecipeCosting,
  getKitchenMenuItemRecipe,
} from '@/services/apiServices';
import { toInputDate, toMMDDYYYY } from '../types';

export const RecipeBomModal = ({
  isOpen,
  onClose,
  recipe = null,
  salesProduct = 'LUNCH',
  cfGroupName = 'KATHOD CF',
  materialCenters = [],
  defaultMaterialCenterId = 1,
  organizationId = null,
  subOutletId = null,
  isEdit = false,
  editIndex = null,
  onApplyBom,
}) => {
  const [outletRecipes, setOutletRecipes] = useState([]);
  const [selectedOutletRecipeId, setSelectedOutletRecipeId] = useState('');
  const [loadingOutletRecipes, setLoadingOutletRecipes] = useState(false);
  const [isLpgRequired, setIsLpgRequired] = useState(true);
  const [pricingBasis, setPricingBasis] = useState('LAST_PURCHASE');
  const pricingBasisRef = useRef('LAST_PURCHASE');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromDateError, setFromDateError] = useState('');
  const fromDateRef = useRef('');
  const toDateRef = useRef('');
  const [calculating, setCalculating] = useState(false);
  const [recipeUnitInfo, setRecipeUnitInfo] = useState(null);

  // Live Cost Metrics
  const [costPerPerson, setCostPerPerson] = useState('0.000');
  const [costPerKg, setCostPerKg] = useState('0.000');
  const [lpgCost, setLpgCost] = useState('0.000');
  const [recipeMaterialCost, setRecipeMaterialCost] = useState(null);
  const [totalPortionCost, setTotalPortionCost] = useState(null);
  const [perPersonPortionWeight, setPerPersonPortionWeight] = useState(null);
  const [perPersonPortionUnitSymbol, setPerPersonPortionUnitSymbol] = useState('');
  const [perPersonConsumptionQuantity, setPerPersonConsumptionQuantity] = useState(null);
  const [perPersonConsumptionUnitSymbol, setPerPersonConsumptionUnitSymbol] = useState('');
  const [perPersonConsumptionUnitId, setPerPersonConsumptionUnitId] = useState(null);

  // Silently resolve the Material Center based on proposal's selected outlet / default material center
  const resolvedMaterialCenterId =
    recipe?.materialCenterId ||
    defaultMaterialCenterId ||
    (materialCenters[0]?.id ?? 1);

  const fetchCosting = useCallback(
    async (recipeId, mcId, lpgReq, headerId = null, chosenHeader = null, basis = null, fDate = null, tDate = null) => {
      setCalculating(true);
      try {
        const menuItemId =
          recipe?.menuItemId ||
          recipe?.kitchenMenuItemId ||
          recipe?.id ||
          recipeId;

        const step1OrgId = organizationId ? Number(organizationId) : null;
        const step1SubOutletId = subOutletId ? Number(subOutletId) : null;

        const recipeOrgId =
          chosenHeader?.orgId != null && chosenHeader?.orgId !== ''
            ? Number(chosenHeader.orgId)
            : chosenHeader?.organizationId != null && chosenHeader?.organizationId !== ''
            ? Number(chosenHeader.organizationId)
            : recipe?.orgId != null && recipe?.orgId !== ''
            ? Number(recipe.orgId)
            : recipe?.organizationId != null && recipe?.organizationId !== ''
            ? Number(recipe.organizationId)
            : null;

        const basisToUse = basis || pricingBasisRef.current || 'LAST_PURCHASE';
        const isDateRequired = ['WEIGHTED_AVERAGE', 'HIGHEST_PRICE', 'LOWEST_PRICE'].includes(basisToUse);
        const effectiveFromDate = fDate !== null && fDate !== undefined ? fDate : fromDateRef.current;
        const effectiveToDate = tDate !== null && tDate !== undefined ? tDate : toDateRef.current;

        if (isDateRequired && !effectiveFromDate) {
          setFromDateError('From date is mandatory');
          setCalculating(false);
          return;
        }
        setFromDateError('');

        const costingPayload = {
          kitchenMenuItemId: Number(menuItemId),
          materialCenterId: Number(mcId) || 0,
          pricingBasis: basisToUse,
          portionSize: 1, // for the 1 person calculation pass 1 in payload
          isLpgRequired: lpgReq,
          customFuelUtilityCost: null,
          ...(step1OrgId ? { materialCenterOrgId: step1OrgId } : {}),
          ...(step1SubOutletId ? { materialCenterSubOutletId: step1SubOutletId } : {}),
          ...(recipeOrgId != null ? { organizationId: recipeOrgId } : {}),
          ...(headerId ? { recipeHeaderId: Number(headerId) } : {}),
          ...(isDateRequired && effectiveFromDate ? { fromDate: effectiveFromDate } : {}),
          ...(isDateRequired && effectiveToDate ? { toDate: effectiveToDate } : {}),
        };

        const res = await calculateRecipeCosting(costingPayload);

        const data = res?.data?.data ?? res?.data;
        if (data) {
          const parseCost = (...candidates) => {
            for (const val of candidates) {
              if (val !== undefined && val !== null && val !== '' && !isNaN(Number(val))) {
                return Number(val);
              }
            }
            return 0;
          };

          // 1. Cost per Person: map from avgRmcPerDay / costPerPerson / costPerPortion / totalPortionCost / recipeMaterialCost
          const ctp = parseCost(
            data.avgRmcPerDay,
            data.costPerPerson,
            data.costPerPortion,
            data.totalPortionCost,
            data.recipeMaterialCost
          );

          // 2. Cost per KG: map from costPerKg / rawMaterialCostPerKg / effectiveRate
          const perKg = parseCost(
            data.costPerKg,
            data.rawMaterialCostPerKg,
            data.effectiveRate,
            ctp > 0 ? ctp * 5.88 : 0
          );

          // 3. LPG Cost: map from lpgCost / totalOtherCost / fuelUtilityCost
          const lpg = lpgReq
            ? parseCost(
                data.lpgCost,
                data.totalOtherCost,
                data.fuelUtilityCost,
                Array.isArray(data.otherCosts)
                  ? data.otherCosts.find((o) => o.isLpgItem || o.itemType === 'LPG')?.amount
                  : undefined
              )
            : 0;

          setCostPerPerson(ctp.toFixed(3));
          setCostPerKg(perKg.toFixed(3));
          setLpgCost(lpg.toFixed(3));

          const rmc = parseCost(
            data.recipeMaterialCost,
            data.totalIngredientCost,
            data.materialCost,
            perKg
          );
          const tpc = parseCost(
            data.totalPortionCost,
            data.costPerPerson,
            data.costPerPortion,
            ctp
          );
          setRecipeMaterialCost(rmc);
          setTotalPortionCost(tpc);

          const consumptionQty =
            data.perPersonConsumptionQuantity != null
              ? Number(data.perPersonConsumptionQuantity)
              : data.perPersonPortionWeight != null
              ? Number(data.perPersonPortionWeight)
              : data.portionSize != null
              ? Number(data.portionSize)
              : null;

          const consumptionUnitSymbol =
            data.perPersonConsumptionUnitSymbol ||
            data.perPersonPortionUnitSymbol ||
            data.baseRecipeUnitSymbol ||
            data.uomSymbol ||
            '';

          const consumptionUnitId =
            data.perPersonConsumptionUnitId ||
            data.baseRecipeUnitId ||
            data.uomId ||
            null;

          if (consumptionQty != null) {
            setPerPersonConsumptionQuantity(consumptionQty);
            setPerPersonPortionWeight(consumptionQty);
          }
          if (consumptionUnitSymbol) {
            setPerPersonConsumptionUnitSymbol(consumptionUnitSymbol);
            setPerPersonPortionUnitSymbol(consumptionUnitSymbol);
          }
          if (consumptionUnitId) {
            setPerPersonConsumptionUnitId(consumptionUnitId);
          }
        } else if (chosenHeader?.costPrice) {
          const ctp = Number(chosenHeader.costPrice) || 0;
          setCostPerPerson(ctp.toFixed(3));
          setCostPerKg((ctp * 5.88).toFixed(3));
          setLpgCost('0.000');
        }
      } catch (err) {
        console.warn('Recipe costing calculation fallback:', err);
        if (chosenHeader?.costPrice) {
          const ctp = Number(chosenHeader.costPrice) || 0;
          setCostPerPerson(ctp.toFixed(3));
          setCostPerKg((ctp * 5.88).toFixed(3));
        }
      } finally {
        setCalculating(false);
      }
    },
    [organizationId, subOutletId, recipe?.menuItemId, recipe?.kitchenMenuItemId, recipe?.id, recipe?.orgId, recipe?.organizationId]
  );

  useEffect(() => {
    if (!isOpen || !recipe) return;

    const mcId =
      recipe.materialCenterId ||
      defaultMaterialCenterId ||
      (materialCenters[0]?.id ?? 1);

    setIsLpgRequired(recipe.isLpgRequired !== false);
    const initialBasis = recipe.pricingBasis || 'LAST_PURCHASE';
    setPricingBasis(initialBasis);
    pricingBasisRef.current = initialBasis;

    let initialFromDate = toInputDate(recipe.fromDate);
    let initialToDate = toInputDate(recipe.toDate);
    if (['WEIGHTED_AVERAGE', 'HIGHEST_PRICE', 'LOWEST_PRICE'].includes(initialBasis)) {
      if (!initialFromDate) {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        initialFromDate = d.toISOString().split('T')[0];
      }
      if (!initialToDate) {
        initialToDate = new Date().toISOString().split('T')[0];
      }
    }
    setFromDate(initialFromDate);
    setToDate(initialToDate);
    fromDateRef.current = initialFromDate;
    toDateRef.current = initialToDate;
    setFromDateError('');

    // Initial default or recipe values (avoid hardcoded fallbacks)
    const initialCtp = Number(recipe.costPerPerson ?? recipe.costToPlateDaily ?? recipe.costPrice ?? 0);
    const initialLpg = Number(recipe.lpgCost ?? 0);
    const initialPerKg = Number(recipe.costPerKg ?? (initialCtp > 0 ? initialCtp * 5.88 : 0));

    setCostPerPerson(initialCtp.toFixed(3));
    setCostPerKg(Number(initialPerKg).toFixed(3));
    setLpgCost(initialLpg.toFixed(3));

    const initialQty =
      recipe.perPersonConsumptionQuantity != null
        ? Number(recipe.perPersonConsumptionQuantity)
        : recipe.perPersonPortionWeight != null
        ? Number(recipe.perPersonPortionWeight)
        : recipe.quantityPerPerson != null
        ? Number(recipe.quantityPerPerson)
        : null;

    const initialUnitSymbol =
      recipe.perPersonConsumptionUnitSymbol ||
      recipe.perPersonPortionUnitSymbol ||
      recipe.uomSymbol ||
      '';

    const initialUnitId =
      recipe.perPersonConsumptionUnitId ||
      recipe.uomId ||
      null;

    setPerPersonPortionWeight(initialQty);
    setPerPersonConsumptionQuantity(initialQty);
    setPerPersonPortionUnitSymbol(initialUnitSymbol);
    setPerPersonConsumptionUnitSymbol(initialUnitSymbol);
    setPerPersonConsumptionUnitId(initialUnitId);

    // Fetch outlet-wise recipes for this menu item
    const recipeId = recipe.menuItemId || recipe.kitchenMenuItemId || recipe.id;
    if (recipeId) {
      let isMounted = true;
      setLoadingOutletRecipes(true);

      const itemRecipeParams = { menuItemId: Number(recipeId) };
      if (organizationId) {
        itemRecipeParams.orgId = Number(organizationId);
      }
      if (subOutletId) {
        itemRecipeParams.subOutletId = Number(subOutletId);
      }

      getKitchenMenuItemRecipe(itemRecipeParams)
        .then((res) => {
          if (!isMounted) return;
          const payload = res?.data?.data ?? res?.data ?? {};
          const headers = Array.isArray(payload.headers)
            ? payload.headers
            : Array.isArray(payload)
            ? payload
            : [];
          setOutletRecipes(headers);

          // Extract unit of measurement from headers or rawMaterials (e.g. Kilogram = 12)
          const rawUnit =
            payload.rawMaterials?.find((r) => r?.unit?.id)?.unit ||
            payload.rawMaterials?.find((r) => r?.rawMaterial?.unit?.id)?.rawMaterial?.unit ||
            null;
          const headerUnitId = headers[0]?.unitId;
          const headerUnitName = headers[0]?.unitName;
          const unitIdVal = headerUnitId || rawUnit?.id || (rawUnit?.nameEnglish?.toLowerCase() === 'kilogram' ? 12 : null) || 12;
          const unitSymbolVal = rawUnit?.symbolEnglish || (headerUnitName?.toLowerCase() === 'kilogram' ? 'kg' : 'Kg');
          setRecipeUnitInfo({
            uomId: unitIdVal,
            uomSymbol: unitSymbolVal,
            uomName: headerUnitName || rawUnit?.nameEnglish || 'Kilogram',
            unit: rawUnit || (headerUnitId ? { id: headerUnitId, nameEnglish: headerUnitName || 'Kilogram' } : null),
          });

          // Priority 1: previously selected recipeHeaderId
          // Priority 2: matching proposal outlet organizationId
          // Priority 3: first available header
          let chosen = null;
          if (recipe.recipeHeaderId) {
            chosen = headers.find((h) => Number(h.id) === Number(recipe.recipeHeaderId));
          }
          if (!chosen && organizationId) {
            chosen = headers.find((h) => Number(h.orgId) === Number(organizationId));
          }
          if (!chosen && headers.length > 0) {
            chosen = headers[0];
          }

          if (chosen) {
            setSelectedOutletRecipeId(String(chosen.id));
            fetchCosting(recipeId, mcId, recipe.isLpgRequired !== false, chosen.id, chosen, initialBasis, initialFromDate, initialToDate);
          } else {
            setSelectedOutletRecipeId('');
            fetchCosting(recipeId, mcId, recipe.isLpgRequired !== false, null, null, initialBasis, initialFromDate, initialToDate);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.warn('Failed to load outlet recipes:', err);
          setOutletRecipes([]);
          setSelectedOutletRecipeId('');
          fetchCosting(recipeId, mcId, recipe.isLpgRequired !== false, null, null, initialBasis, initialFromDate, initialToDate);
        })
        .finally(() => {
          if (isMounted) {
            setLoadingOutletRecipes(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, recipe?.kitchenMenuItemId ?? recipe?.id]);

  const handleOutletRecipeChange = (e) => {
    const nextHeaderId = e.target.value;
    setSelectedOutletRecipeId(nextHeaderId);
    const chosen = outletRecipes.find((h) => String(h.id) === String(nextHeaderId));
    const recipeId = recipe?.menuItemId || recipe?.kitchenMenuItemId || recipe?.id;
    if (recipeId) {
      fetchCosting(
        recipeId,
        resolvedMaterialCenterId,
        isLpgRequired,
        nextHeaderId ? Number(nextHeaderId) : null,
        chosen,
        pricingBasisRef.current,
        fromDateRef.current,
        toDateRef.current
      );
    }
  };

  const handlePricingBasisChange = (e) => {
    const nextBasis = e.target.value;
    setPricingBasis(nextBasis);
    pricingBasisRef.current = nextBasis;

    let curFrom = fromDateRef.current;
    let curTo = toDateRef.current;
    if (['WEIGHTED_AVERAGE', 'HIGHEST_PRICE', 'LOWEST_PRICE'].includes(nextBasis)) {
      if (!curFrom) {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        curFrom = d.toISOString().split('T')[0];
        setFromDate(curFrom);
        fromDateRef.current = curFrom;
      }
      if (!curTo) {
        curTo = new Date().toISOString().split('T')[0];
        setToDate(curTo);
        toDateRef.current = curTo;
      }
      setFromDateError('');
    } else {
      setFromDateError('');
    }

    const recipeId = recipe?.menuItemId || recipe?.kitchenMenuItemId || recipe?.id;
    const chosen = outletRecipes.find((h) => String(h.id) === String(selectedOutletRecipeId));
    if (recipeId) {
      fetchCosting(
        recipeId,
        resolvedMaterialCenterId,
        isLpgRequired,
        selectedOutletRecipeId ? Number(selectedOutletRecipeId) : null,
        chosen,
        nextBasis,
        curFrom,
        curTo
      );
    }
  };

  const handleFromDateChange = (e) => {
    const val = e.target.value;
    setFromDate(val);
    fromDateRef.current = val;
    if (['WEIGHTED_AVERAGE', 'HIGHEST_PRICE', 'LOWEST_PRICE'].includes(pricingBasisRef.current)) {
      if (!val) {
        setFromDateError('From date is mandatory');
        return;
      }
      setFromDateError('');
    }
    const recipeId = recipe?.menuItemId || recipe?.kitchenMenuItemId || recipe?.id;
    const chosen = outletRecipes.find((h) => String(h.id) === String(selectedOutletRecipeId));
    if (recipeId) {
      fetchCosting(
        recipeId,
        resolvedMaterialCenterId,
        isLpgRequired,
        selectedOutletRecipeId ? Number(selectedOutletRecipeId) : null,
        chosen,
        pricingBasisRef.current,
        val,
        toDateRef.current
      );
    }
  };

  const handleToDateChange = (e) => {
    const val = e.target.value;
    setToDate(val);
    toDateRef.current = val;
    if (['WEIGHTED_AVERAGE', 'HIGHEST_PRICE', 'LOWEST_PRICE'].includes(pricingBasisRef.current) && !fromDateRef.current) {
      setFromDateError('From date is mandatory');
      return;
    }
    const recipeId = recipe?.menuItemId || recipe?.kitchenMenuItemId || recipe?.id;
    const chosen = outletRecipes.find((h) => String(h.id) === String(selectedOutletRecipeId));
    if (recipeId) {
      fetchCosting(
        recipeId,
        resolvedMaterialCenterId,
        isLpgRequired,
        selectedOutletRecipeId ? Number(selectedOutletRecipeId) : null,
        chosen,
        pricingBasisRef.current,
        fromDateRef.current,
        val
      );
    }
  };

  const handleToggleLpg = () => {
    const nextLpg = !isLpgRequired;
    setIsLpgRequired(nextLpg);
    const recipeId = recipe?.menuItemId || recipe?.kitchenMenuItemId || recipe?.id;
    const chosen = outletRecipes.find((h) => String(h.id) === String(selectedOutletRecipeId));
    if (recipeId) {
      fetchCosting(
        recipeId,
        resolvedMaterialCenterId,
        nextLpg,
        selectedOutletRecipeId ? Number(selectedOutletRecipeId) : null,
        chosen,
        pricingBasisRef.current,
        fromDateRef.current,
        toDateRef.current
      );
    } else {
      setLpgCost('0.000');
    }
  };

  const handleResetDefaults = () => {
    setIsLpgRequired(true);
    setPricingBasis('LAST_PURCHASE');
    pricingBasisRef.current = 'LAST_PURCHASE';
    setFromDate('');
    setToDate('');
    fromDateRef.current = '';
    toDateRef.current = '';
    setFromDateError('');
    let chosen = null;
    if (organizationId) {
      chosen = outletRecipes.find((h) => Number(h.orgId) === Number(organizationId));
    }
    if (!chosen && outletRecipes.length > 0) {
      chosen = outletRecipes[0];
    }

    const recipeId = recipe?.menuItemId || recipe?.kitchenMenuItemId || recipe?.id;
    if (chosen) {
      setSelectedOutletRecipeId(String(chosen.id));
      if (recipeId) {
        fetchCosting(recipeId, resolvedMaterialCenterId, true, chosen.id, chosen, 'LAST_PURCHASE', '', '');
      }
    } else {
      setSelectedOutletRecipeId('');
      if (recipeId) {
        fetchCosting(recipeId, resolvedMaterialCenterId, true, null, null, 'LAST_PURCHASE', '', '');
      } else {
        setCostPerPerson('0.000');
        setCostPerKg('0.000');
        setLpgCost('0.000');
      }
    }
  };

  const handleApply = () => {
    const chosen = outletRecipes.find((h) => String(h.id) === String(selectedOutletRecipeId));
    const resolvedUomId = Number(
      perPersonConsumptionUnitId ||
      chosen?.unitId ||
      chosen?.unit?.id ||
      recipeUnitInfo?.unit?.id ||
      recipeUnitInfo?.uomId ||
      recipe?.unit?.id ||
      recipe?.unitId ||
      (recipe?.uomId && recipe?.uomId !== 1 ? recipe?.uomId : null) ||
      recipe?.portionUnitId ||
      12 // Default to 12 (Kilogram)
    );
    const resolvedUomSymbol =
      perPersonConsumptionUnitSymbol ||
      perPersonPortionUnitSymbol ||
      recipeUnitInfo?.uomSymbol ||
      chosen?.unitName ||
      recipe?.uomSymbol ||
      recipe?.portionUnitSymbol ||
      'kg';

    const chosenBasis = pricingBasisRef.current || pricingBasis || 'LAST_PURCHASE';

    if (['WEIGHTED_AVERAGE', 'HIGHEST_PRICE', 'LOWEST_PRICE'].includes(chosenBasis)) {
      if (!fromDate) {
        setFromDateError('From date is mandatory');
        toast.error('From date is mandatory');
        return;
      }
    }

    const finalPortionWeight =
      perPersonConsumptionQuantity != null
        ? Number(perPersonConsumptionQuantity)
        : perPersonPortionWeight != null
        ? Number(perPersonPortionWeight)
        : null;

    if (onApplyBom) {
      onApplyBom({
        recipe,
        isEdit,
        editIndex,
        materialCenterId: resolvedMaterialCenterId,
        isLpgRequired,
        costPerPerson: Number(costPerPerson) || 0,
        costPerKg: Number(costPerKg) || 0,
        lpgCost: Number(lpgCost) || 0,
        recipeMaterialCost: recipeMaterialCost != null ? Number(recipeMaterialCost) : Number(costPerKg) || 0,
        totalPortionCost: totalPortionCost != null ? Number(totalPortionCost) : Number(costPerPerson) || 0,
        recipeHeaderId: selectedOutletRecipeId ? Number(selectedOutletRecipeId) : null,
        selectedOutletRecipe: chosen || null,
        uomId: resolvedUomId,
        uomSymbol: resolvedUomSymbol,
        pricingBasis: chosenBasis,
        fromDate: ['WEIGHTED_AVERAGE', 'HIGHEST_PRICE', 'LOWEST_PRICE'].includes(chosenBasis) ? toMMDDYYYY(fromDate) : null,
        toDate: ['WEIGHTED_AVERAGE', 'HIGHEST_PRICE', 'LOWEST_PRICE'].includes(chosenBasis) ? toMMDDYYYY(toDate) : null,
        perPersonPortionWeight: finalPortionWeight,
        perPersonPortionUnitSymbol: resolvedUomSymbol,
        perPersonConsumptionQuantity: finalPortionWeight,
        perPersonConsumptionUnitSymbol: resolvedUomSymbol,
        perPersonConsumptionUnitId: resolvedUomId,
      });
    }
    onClose();
  };

  if (!isOpen || !recipe) return null;

  const rawItemName =
    recipe.kitchenMenuItemName ||
    recipe.itemName ||
    recipe.foodName ||
    'Selected Recipe';
  const catName = recipe.kitchenMenuCategoryName || recipe.categoryName;
  const itemName =
    catName && !rawItemName.toLowerCase().endsWith(`(${catName.toLowerCase()})`)
      ? `${rawItemName} (${catName})`
      : rawItemName;

  const formatOutletRecipeLabel = (header) => {
    if (!header) return 'Standard / Default Recipe';
    const org = header.orgName || (header.orgId ? `Outlet #${header.orgId}` : 'Standard');
    const parts = [`${org} Recipe`];
    if (header.weight) {
      parts.push(`(${header.weight} ${header.unitName || header.uomSymbol || 'Kg'})`);
    }
    return parts.join(' ');
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center">
              <FileText size={18} />
            </div>
            <h3 className="text-base font-bold text-[#00376C]">
              Bill of Materials Details
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Row 1: Sales Product & CF Group Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#00376C] mb-1.5">
                Sales Product
              </label>
              <input
                type="text"
                readOnly
                value={salesProduct}
                className="w-full h-10 px-3.5 bg-[#F0F5FA] border border-transparent rounded-xl text-xs font-semibold text-gray-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#00376C] mb-1.5">
                CF Group Name
              </label>
              <input
                type="text"
                readOnly
                value={cfGroupName}
                className="w-full h-10 px-3.5 bg-[#F0F5FA] border border-transparent rounded-xl text-xs font-semibold text-gray-800 outline-none"
              />
            </div>
          </div>

          {/* Row 2: Item Name & Outlet Wise Recipe (Sr. No. removed) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#00376C] mb-1.5">
                Item Name
              </label>
              <input
                type="text"
                readOnly
                value={itemName}
                className="w-full h-10 px-3.5 bg-[#F0F5FA] border border-transparent rounded-xl text-xs font-semibold text-gray-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#00376C] mb-1.5 flex items-center justify-between">
                <span>Outlet Wise Recipe</span>
                {loadingOutletRecipes && (
                  <Loader2 size={12} className="animate-spin text-[#084E92]" />
                )}
              </label>
              <select
                value={selectedOutletRecipeId}
                onChange={handleOutletRecipeChange}
                disabled={loadingOutletRecipes}
                className="w-full h-10 px-3.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#084E92] shadow-2xs cursor-pointer disabled:bg-gray-50"
              >
                {loadingOutletRecipes ? (
                  <option value="">Loading recipes...</option>
                ) : outletRecipes.length === 0 ? (
                  <option value="">Standard / Default Recipe</option>
                ) : (
                  outletRecipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatOutletRecipeLabel(r)}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Row 3: Price Selection & LPG Toggle */}
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-[#00376C] mb-1.5">
                Price Selection
              </label>
              <select
                value={pricingBasis}
                onChange={handlePricingBasisChange}
                className="w-full h-10 px-3.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#084E92] shadow-2xs cursor-pointer"
              >
                <option value="LAST_PURCHASE">Last Purchase</option>
                <option value="WEIGHTED_AVERAGE">Weighted Average</option>
                <option value="HIGHEST_PRICE">Highest Price</option>
                <option value="LOWEST_PRICE">Lowest Price</option>
              </select>
            </div>

            <div className="flex items-center gap-3 h-10">
              <span className="text-xs font-semibold text-gray-800">
                LPG Cost Required (If not defined)
              </span>
              <button
                type="button"
                onClick={handleToggleLpg}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                  isLpgRequired ? 'bg-[#084E92]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                    isLpgRequired ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Conditional Date Range for WEIGHTED_AVERAGE, HIGHEST_PRICE, LOWEST_PRICE */}
          {['WEIGHTED_AVERAGE', 'HIGHEST_PRICE', 'LOWEST_PRICE'].includes(pricingBasis) && (
            <div className="grid grid-cols-2 gap-4 pt-1 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-[#00376C] mb-1.5 flex items-center gap-1">
                  <Calendar size={13} className="text-[#084E92]" />
                  <span>From Date</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={handleFromDateChange}
                  className={`w-full h-10 px-3.5 bg-white border rounded-xl text-xs font-semibold text-gray-800 focus:outline-none shadow-2xs cursor-pointer ${
                    fromDateError
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-[#084E92]'
                  }`}
                />
                {fromDateError && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{fromDateError}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#00376C] mb-1.5 flex items-center gap-1">
                  <Calendar size={13} className="text-gray-400" />
                  <span>To Date</span>
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={handleToDateChange}
                  className="w-full h-10 px-3.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#084E92] shadow-2xs cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Row 4: Cost & Consumption Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-[#F0F7FD] border border-[#D8E8F8] rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-semibold text-[#00376C]">Cost per Person</div>
              <div className="text-base font-bold text-[#00376C]">
                {calculating ? (
                  <Loader2 size={16} className="animate-spin text-[#084E92]" />
                ) : (
                  costPerPerson
                )}
              </div>
            </div>

            <div className="bg-[#F0F7FD] border border-[#D8E8F8] rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-semibold text-[#00376C]">Cost per KG</div>
              <div className="text-base font-bold text-[#00376C]">
                {calculating ? (
                  <Loader2 size={16} className="animate-spin text-[#084E92]" />
                ) : (
                  costPerKg
                )}
              </div>
            </div>

            <div className="bg-[#F0F7FD] border border-[#D8E8F8] rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-semibold text-[#00376C]">LPG Cost</div>
              <div className="text-base font-bold text-[#00376C]">
                {calculating ? (
                  <Loader2 size={16} className="animate-spin text-[#084E92]" />
                ) : (
                  lpgCost
                )}
              </div>
            </div>

            <div className="bg-[#F0F7FD] border border-[#D8E8F8] rounded-2xl p-3.5 space-y-1">
              <div className="text-xs font-semibold text-[#00376C]">Qty per Person</div>
              <div className="text-base font-bold text-[#00376C]">
                {calculating ? (
                  <Loader2 size={16} className="animate-spin text-[#084E92]" />
                ) : (
                  `${(perPersonConsumptionQuantity ?? perPersonPortionWeight) != null ? Number(perPersonConsumptionQuantity ?? perPersonPortionWeight).toFixed(3) : '—'} ${perPersonConsumptionUnitSymbol || perPersonPortionUnitSymbol || ''}`.trim() || '—'
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition cursor-pointer"
            >
              Reset Defaults
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#084E92] hover:bg-[#073e77] text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
            >
              <CheckCircle2 size={15} />
              Apply BOM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeBomModal;
