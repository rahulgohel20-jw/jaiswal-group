import React, { useEffect, useState, useRef } from 'react';
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
} from 'lucide-react';
import { getRecipeCosting } from '@/services/apiServices';

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
}) => {
  const [loadingCosting, setLoadingCosting] = useState(false);
  const [costingData, setCostingData] = useState(() => item?.recipeCostingData || null);
  const [imageError, setImageError] = useState(false);
  const [expandedCaptainRecipes, setExpandedCaptainRecipes] = useState({});
  const lastCostingKeyRef = useRef('');

  useEffect(() => {
    setImageError(false);
    setExpandedCaptainRecipes({});
    if (item?.recipeCostingData) {
      setCostingData(item.recipeCostingData);
    }
  }, [item?.kitchenMenuItemId || item?.id]);

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

    const itemId = item.kitchenMenuItemId || item.id;
    if (!itemId) return;

    const portionQty =
      Number(item.portionQuantity) ||
      Number(item.recipeCostingData?.perPersonConsumptionQuantity) ||
      Number(item.perPersonConsumptionQuantity) ||
      Number(item.portionSize) ||
      1;
    const portionUnitIdVal = extractPortionUnitId(item);
    const rateBasis = item.rateSource || item.recipeCostingData?.pricingBasis || 'LAST_PURCHASE';

    const effectiveOrgId =
      Number(unitId) ||
      Number(item.organizationId) ||
      Number(item.materialCenterOrgId) ||
      0;

    const effectivePax =
      Number(item.actualPax) ||
      Number(item.plannedPax) ||
      Number(targetPax) ||
      Number(item.recipeCostingData?.scaledPax) ||
      Number(item.recipeCostingData?.targetPax) ||
      1;

    const fromDateStr = item.rateFromDate || '';
    const toDateStr = item.rateToDate || '';

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

  if (!isOpen || !item) return null;

  const activeCostData = costingData || item?.recipeCostingData || null;

  const imageUrl = resolveItemImage(item);
  const ingredientsList = Array.isArray(activeCostData?.ingredients)
    ? activeCostData.ingredients
    : Array.isArray(item?.ingredients)
    ? item.ingredients
    : Array.isArray(item?.rawMaterials)
    ? item.rawMaterials
    : [];

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

  // Uses totalCost (used amount), not the batch cost
  const totalCaptainRecipeCost =
    activeCostData?.totalCaptainRecipeCost != null
      ? Number(activeCostData.totalCaptainRecipeCost).toFixed(2)
      : captainRecipesList.reduce((acc, cr) => acc + (Number(cr.totalCost) || 0), 0).toFixed(2);

  const totalRecipeCost =
    activeCostData?.recipeMaterialCost !== undefined && activeCostData?.recipeMaterialCost !== null
      ? Number(activeCostData.recipeMaterialCost).toFixed(2)
      : activeCostData?.totalRecipeCost !== undefined && activeCostData?.totalRecipeCost !== null
      ? Number(activeCostData.totalRecipeCost).toFixed(2)
      : (Number(totalIngredientCost) + Number(totalCaptainRecipeCost)).toFixed(2);

  const rateSourceDisplay = activeCostData?.pricingBasis || item?.rateSource || 'LAST_PURCHASE';

  // Resolved unit and sub-unit labels with fallback cascade
  const resolvedUnitDisplay =
    unitName ||
    item.organizationName ||
    activeCostData?.organizationName ||
    (unitId ? `Unit #${unitId}` : '—');

  const resolvedSubUnitDisplay =
    subUnitName ||
    item.subOutletName ||
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
    item?.uomSymbol ||
    'kg';

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
            <div className="space-y-1.5">
              {captainRecipesList.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                    <UtensilsCrossed size={12} className="text-[#084E92]" />
                    Direct Raw Materials ({ingredientsList.length})
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500">
                    Subtotal: ₹{totalIngredientCost}
                  </span>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ingredientsList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 text-xs">
                          {loadingCosting ? 'Fetching ingredient costs...' : 'No ingredients found for this recipe.'}
                        </td>
                      </tr>
                    ) : (
                      ingredientsList.map((ing, idx) => (
                        <tr key={ing.rawMaterialId || idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {ing.rawMaterialName}
                          </td>
                          <td className="py-2 px-3 text-gray-500">
                            {ing.convertedIngredientWeight !== undefined && ing.convertedIngredientWeight !== null
                              ? `${Number(ing.convertedIngredientWeight).toFixed(3)} ${ing.uomSymbol || 'kg'}`
                              : `${Number(ing.baseIngredientWeight || 0).toFixed(3)} ${ing.uomSymbol || 'kg'}`}
                          </td>
                          <td className="py-2 px-3 text-gray-500">
                            ₹{Number(ing.baseUomRate || 0).toFixed(2)} / {ing.uomSymbol || 'kg'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-gray-800">
                            ₹{Number(ing.amount || ing.totalIngredientCost || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}

                    <tr className="bg-blue-50/50 font-bold text-[#084E92]">
                      <td colSpan={3} className="py-2.5 px-3">
                        Total {captainRecipesList.length > 0 ? 'Direct ' : ''}Ingredient Cost
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        ₹{totalIngredientCost}
                      </td>
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
                    Direct (₹{totalIngredientCost}) + Captain Sub-Recipes (₹{totalCaptainRecipeCost})
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
    </div>
  );
};

export default RightDrawerRecipeSnapshot;