export const formatINR = (val) => {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatQty = (val, decimals = 2) => {
  const num = Number(val) || 0;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const roundTo = (num, decimals = 2) => {
  const n = Number(num);
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
};

const pickNum = (...candidates) => {
  for (const val of candidates) {
    if (val !== undefined && val !== null && val !== '' && Number.isFinite(Number(val))) {
      return Number(val);
    }
  }
  return null;
};

const pickStr = (...candidates) => {
  for (const val of candidates) {
    if (typeof val === 'string' && val.trim() !== '') {
      return val.trim();
    }
  }
  return '';
};

const pickArray = (...candidates) => {
  for (const val of candidates) {
    if (Array.isArray(val)) return val;
  }
  return [];
};

/**
 * Groups raw production execution / plan listing records into unique Production Plans,
 * preserving each plan's associated meal shifts (falling back to master meal types when needed).
 */
export const extractPlanCatalog = (execRows = [], masterMealTypes = []) => {
  const mealNameById = new Map();
  (Array.isArray(masterMealTypes) ? masterMealTypes : []).forEach((mt) => {
    const id = Number(mt?.id ?? mt?.mealTypeId ?? 0);
    if (id > 0) {
      mealNameById.set(id, pickStr(mt.name, mt.mealTypeName, `Meal #${id}`));
    }
  });

  const planMap = new Map();

  (Array.isArray(execRows) ? execRows : []).forEach((row) => {
    const id = Number(row?.productionPlanId ?? row?.id ?? 0);
    if (!id) return;

    if (!planMap.has(id)) {
      planMap.set(id, {
        id,
        planCode: pickStr(row.planCode, row.productionPlanCode) || `PP-${id}`,
        productionDate: pickStr(row.productionDate, row.planDate, row.date),
        kitchenName:
          pickStr(
            row.kitchenName,
            row.kitchenLocationName,
            row.subOutletName,
            row.organizationName
          ) || '—',
        organizationName: pickStr(row.organizationName),
        status: pickStr(row.status),
        mealsMap: new Map(),
      });
    }

    const entry = planMap.get(id);
    if (!entry.productionDate) {
      entry.productionDate = pickStr(row.productionDate, row.planDate, row.date);
    }
    if (entry.kitchenName === '—') {
      entry.kitchenName =
        pickStr(
          row.kitchenName,
          row.kitchenLocationName,
          row.subOutletName,
          row.organizationName
        ) || '—';
    }

    // Direct mealTypeId / mealTypeName on the execution row
    const directMealId = Number(row?.mealTypeId ?? 0);
    if (directMealId > 0) {
      const mealName =
        pickStr(row.mealTypeName, mealNameById.get(directMealId)) || `Meal #${directMealId}`;
      entry.mealsMap.set(directMealId, { mealTypeId: directMealId, mealTypeName: mealName });
    }

    // Nested meals/shifts arrays if provided on plan object
    const nestedMeals = pickArray(row?.mealTypes, row?.meals, row?.shifts, row?.mealBreakdown);
    nestedMeals.forEach((m) => {
      const mId = Number(m?.mealTypeId ?? m?.id ?? 0);
      if (mId > 0) {
        const mName =
          pickStr(m.mealTypeName, m.name, mealNameById.get(mId)) || `Meal #${mId}`;
        entry.mealsMap.set(mId, { mealTypeId: mId, mealTypeName: mName });
      }
    });
  });

  const fallbackMeals = (Array.isArray(masterMealTypes) ? masterMealTypes : [])
    .map((mt) => ({
      mealTypeId: Number(mt?.id ?? mt?.mealTypeId ?? 0),
      mealTypeName: pickStr(mt?.name, mt?.mealTypeName),
    }))
    .filter((m) => m.mealTypeId > 0);

  return Array.from(planMap.values()).map(({ mealsMap, ...plan }) => {
    const specificMeals = Array.from(mealsMap.values());
    return {
      ...plan,
      meals: specificMeals.length > 0 ? specificMeals : fallbackMeals,
      hasSpecificMeals: specificMeals.length > 0,
    };
  });
};

const normalizeRecipeRow = (r, idx, actualPax) => {
  const plannedQty = pickNum(r.plannedQty, r.plannedQuantity, 0) ?? 0;
  const actualCookedQty =
    pickNum(
      r.actualCookedQty,
      r.actualQuantity,
      r.actualQty,
      r.cookedQty,
      r.producedQty,
      plannedQty
    ) ?? 0;
  const ratePerUnit =
    pickNum(r.ratePerUnit, r.unitRate, r.rate, r.costPerUnit, r.costPerKg, 0) ?? 0;
  const totalRecipeCost = roundTo(
    pickNum(r.totalRecipeCost, r.totalCost, r.recipeCost) ?? actualCookedQty * ratePerUnit,
    2
  );
  const portionCost = roundTo(
    pickNum(r.portionCost, r.costPerPortion, r.costPerPax) ??
      (actualPax > 0 ? totalRecipeCost / actualPax : 0),
    2
  );
  const qtyVariance = roundTo(
    pickNum(r.qtyVariance, r.varianceQty) ?? actualCookedQty - plannedQty,
    2
  );

  return {
    ...r,
    id: r.id ?? r.productionPlanItemId ?? r.kitchenMenuItemId ?? r.recipeId ?? idx + 1,
    recipeName:
      pickStr(r.recipeName, r.kitchenMenuItemName, r.itemName, r.name) ||
      `Recipe #${idx + 1}`,
    category: pickStr(r.category, r.recipeCategoryName, r.categoryName),
    uom: pickStr(r.uom, r.uomSymbol, r.unitSymbol, r.unitName) || 'kg',
    shiftName: pickStr(r.shiftName, r.mealTypeName),
    plannedQty: roundTo(plannedQty, 2),
    actualCookedQty: roundTo(actualCookedQty, 2),
    ratePerUnit: roundTo(ratePerUnit, 2),
    totalRecipeCost,
    portionCost,
    qtyVariance,
  };
};

const normalizeRawMaterialRow = (m, idx) => {
  const requiredQty =
    pickNum(m.requiredQty, m.requiredQuantity, m.plannedQty, m.plannedQuantity, 0) ?? 0;
  const actualUsedQty =
    pickNum(
      m.actualUsedQty,
      m.actualUsedQuantity,
      m.actualQty,
      m.usedQty,
      m.consumedQty,
      m.issuedQty,
      0
    ) ?? 0;
  const prepWasteQty =
    pickNum(m.prepWasteQty, m.prepWasteQuantity, m.wasteQty, m.wasteQuantity, 0) ?? 0;
  const unitRate =
    pickNum(m.unitRate, m.rate, m.ratePerUnit, m.unitCost, m.avgRate, 0) ?? 0;
  const totalCost = roundTo(
    pickNum(m.totalCost, m.totalMaterialCost, m.materialCost) ?? actualUsedQty * unitRate,
    2
  );
  const prepWasteCost = roundTo(
    pickNum(m.prepWasteCost, m.wasteCost) ?? prepWasteQty * unitRate,
    2
  );
  const qtyVariance = roundTo(
    pickNum(m.qtyVariance, m.varianceQty) ?? actualUsedQty - requiredQty,
    2
  );

  return {
    ...m,
    id: m.id ?? m.rawMaterialId ?? m.materialId ?? m.itemId ?? idx + 1,
    materialName:
      pickStr(m.materialName, m.rawMaterialName, m.ingredientName, m.itemName, m.name) ||
      `Material #${idx + 1}`,
    uom: pickStr(m.uom, m.uomSymbol, m.unitSymbol, m.unitName) || 'kg',
    requiredQty: roundTo(requiredQty, 2),
    actualUsedQty: roundTo(actualUsedQty, 2),
    prepWasteQty: roundTo(prepWasteQty, 2),
    unitRate: roundTo(unitRate, 2),
    totalCost,
    prepWasteCost,
    qtyVariance,
  };
};

/**
 * Normalizes `/production-plan/analytics/costing-summary` response payloads into UI-ready metrics.
 */
export const normalizeCostingSummaryResponse = (rawPayload, context = {}) => {
  const data = rawPayload?.data?.data ?? rawPayload?.data ?? rawPayload ?? {};

  const header = data.header || data.planInfo || data.productionContext || {};
  const paxObj = data.pax || data.universalPax || {};
  const costPerPaxObj = data.costPerPax || {};
  const summaryObj = data.summary || {};
  const breakdownObj = data.costBreakdown || data.costSummary || {};
  const foodObj = data.foodConsumption || data.foodProduction || data.consumption || {};
  const intakeObj = data.perPersonIntake || data.perPaxIntake || {};

  const plannedPax =
    pickNum(
      data.plannedPax,
      data.expectedPlannedPax,
      paxObj.plannedPax,
      paxObj.expectedPlannedPax,
      summaryObj.plannedPax,
      0
    ) ?? 0;
  const actualPax =
    pickNum(
      data.actualPax,
      data.totalActualPax,
      paxObj.actualPax,
      paxObj.totalActualPax,
      summaryObj.actualPax,
      0
    ) ?? 0;

  const rawRecipes = pickArray(
    data.recipes,
    data.recipeCosting,
    data.recipeBreakdown,
    data.recipeCostBreakdown,
    data.recipeItems,
    data.items
  );
  const recipes = rawRecipes.map((r, idx) => normalizeRecipeRow(r, idx, actualPax));

  const rawMaterialsSrc = pickArray(
    data.rawMaterials,
    data.rawMaterialConsumption,
    data.rawMaterialBreakdown,
    data.materials,
    data.ingredients
  );
  const rawMaterials = rawMaterialsSrc.map((m, idx) => normalizeRawMaterialRow(m, idx));

  const summedRmCost = roundTo(
    rawMaterials.reduce((sum, m) => sum + m.totalCost, 0),
    2
  );
  const summedPrepWasteCost = roundTo(
    rawMaterials.reduce((sum, m) => sum + m.prepWasteCost, 0),
    2
  );

  const rawMaterialCost = roundTo(
    pickNum(
      data.rawMaterialCost,
      data.totalRawMaterialCost,
      breakdownObj.rawMaterialCost,
      summaryObj.rawMaterialCost
    ) ?? summedRmCost,
    2
  );
  const prepWasteCost = roundTo(
    pickNum(
      data.prepWasteCost,
      data.totalPrepWasteCost,
      data.preparationWasteCost,
      breakdownObj.prepWasteCost,
      summaryObj.prepWasteCost
    ) ?? summedPrepWasteCost,
    2
  );
  const disposablesCost = roundTo(
    pickNum(
      data.disposablesCost,
      data.disposableCost,
      data.totalDisposablesCost,
      data.packagingCost,
      breakdownObj.disposablesCost,
      summaryObj.disposablesCost
    ) ?? 0,
    2
  );
  const grossProductionCost = roundTo(
    pickNum(
      data.grossProductionCost,
      data.grossCost,
      breakdownObj.grossProductionCost,
      summaryObj.grossProductionCost
    ) ?? rawMaterialCost + prepWasteCost + disposablesCost,
    2
  );

  const leftoverReusedCredit = roundTo(
    pickNum(
      data.leftoverReusedCredit,
      data.leftoverReuseCredit,
      data.reusedLeftoverCredit,
      breakdownObj.leftoverReusedCredit,
      summaryObj.leftoverReusedCredit
    ) ?? 0,
    2
  );
  const leftoverWastageLoss = roundTo(
    pickNum(
      data.leftoverWastageLoss,
      data.leftoverWasteLoss,
      data.wastedLeftoverCost,
      breakdownObj.leftoverWastageLoss,
      summaryObj.leftoverWastageLoss
    ) ?? 0,
    2
  );
  const netMealConsumptionCost = roundTo(
    pickNum(
      data.netMealConsumptionCost,
      data.netMealCost,
      data.netConsumptionCost,
      breakdownObj.netMealConsumptionCost,
      summaryObj.netMealConsumptionCost
    ) ?? grossProductionCost - leftoverReusedCredit + leftoverWastageLoss,
    2
  );

  const plannedTotalCost = pickNum(
    data.plannedTotalCost,
    data.plannedBudgetCost,
    breakdownObj.plannedTotalCost
  );
  const plannedCostPerPax = roundTo(
    pickNum(
      data.plannedCostPerPax,
      costPerPaxObj.planned,
      costPerPaxObj.plannedCostPerPax,
      breakdownObj.plannedCostPerPax,
      summaryObj.plannedCostPerPax
    ) ?? (plannedTotalCost !== null && plannedPax > 0 ? plannedTotalCost / plannedPax : 0),
    2
  );
  const actualCostPerPax = roundTo(
    pickNum(
      data.actualCostPerPax,
      costPerPaxObj.actual,
      costPerPaxObj.actualCostPerPax,
      breakdownObj.actualCostPerPax,
      summaryObj.actualCostPerPax
    ) ?? (actualPax > 0 ? netMealConsumptionCost / actualPax : 0),
    2
  );
  const costDiffPerPax = roundTo(
    pickNum(
      data.costDiffPerPax,
      costPerPaxObj.difference,
      costPerPaxObj.varianceAmount
    ) ?? actualCostPerPax - plannedCostPerPax,
    2
  );
  const costVariancePct = roundTo(
    pickNum(
      data.costVariancePct,
      data.costVariancePercentage,
      costPerPaxObj.variancePct,
      costPerPaxObj.variancePercentage
    ) ??
      (plannedCostPerPax > 0
        ? ((actualCostPerPax - plannedCostPerPax) / plannedCostPerPax) * 100
        : 0),
    2
  );

  const summedProducedKg = roundTo(
    recipes.reduce((sum, r) => sum + r.actualCookedQty, 0),
    2
  );
  const producedKg = roundTo(
    pickNum(
      data.producedKg,
      data.totalProducedQty,
      data.totalActualQty,
      foodObj.producedKg,
      foodObj.producedQty,
      summaryObj.totalActualQty
    ) ?? summedProducedKg,
    2
  );
  const leftoverKg = roundTo(
    pickNum(
      data.leftoverKg,
      data.totalLeftoverQty,
      data.totalClosingQty,
      foodObj.leftoverKg,
      foodObj.leftoverQty,
      summaryObj.totalClosingQty
    ) ?? 0,
    2
  );
  const plateWasteKg = roundTo(
    pickNum(
      data.plateWasteKg,
      data.totalPlateWasteQty,
      data.plateWasteQty,
      foodObj.plateWasteKg,
      foodObj.plateWasteQty
    ) ?? 0,
    2
  );
  const consumedKg = roundTo(
    pickNum(
      data.consumedKg,
      data.totalConsumedQty,
      foodObj.consumedKg,
      foodObj.consumedQty,
      summaryObj.totalConsumedQty
    ) ?? Math.max(0, producedKg - leftoverKg - plateWasteKg),
    2
  );

  const perPaxConsumptionKg = pickNum(
    data.perPaxConsumptionKg,
    summaryObj.perPaxConsumptionKg
  );
  const perPersonFoodG = roundTo(
    pickNum(
      data.perPersonFoodG,
      data.perPaxFoodG,
      intakeObj.foodG,
      intakeObj.foodGrams,
      intakeObj.food
    ) ??
      (perPaxConsumptionKg !== null
        ? perPaxConsumptionKg * 1000
        : actualPax > 0
          ? (consumedKg * 1000) / actualPax
          : 0),
    2
  );
  const perPersonWasteG = roundTo(
    pickNum(
      data.perPersonWasteG,
      data.perPaxWasteG,
      intakeObj.wasteG,
      intakeObj.wasteGrams,
      intakeObj.waste
    ) ?? (actualPax > 0 ? (plateWasteKg * 1000) / actualPax : 0),
    2
  );

  const totalRecipeCostSum = roundTo(
    pickNum(data.totalRecipeCostSum, data.totalRecipeCost) ??
      recipes.reduce((sum, r) => sum + r.totalRecipeCost, 0),
    2
  );
  const totalPortionCostSum = roundTo(
    pickNum(data.totalPortionCostSum, data.totalPortionCost) ??
      recipes.reduce((sum, r) => sum + r.portionCost, 0),
    2
  );
  const totalRawMaterialCostSum = roundTo(
    pickNum(data.totalRawMaterialCostSum) ??
      (rawMaterials.length > 0 ? summedRmCost : rawMaterialCost),
    2
  );

  const rawShifts = pickArray(
    data.shiftBreakdowns,
    data.shifts,
    data.mealBreakdowns,
    data.mealSummaries
  );
  const shiftBreakdowns = rawShifts.map((sh) => normalizeCostingSummaryResponse(sh));

  const availableMeals = pickArray(
    data.availableMeals,
    data.mealTypes,
    rawShifts
  )
    .map((m) => ({
      mealTypeId: Number(m?.mealTypeId ?? m?.id ?? 0),
      mealTypeName: pickStr(m?.mealTypeName, m?.name),
    }))
    .filter((m) => m.mealTypeId > 0 && m.mealTypeName);

  const mealTypeId =
    pickNum(data.mealTypeId, header.mealTypeId, context.mealTypeId) ?? null;
  const mealTypeName =
    pickStr(data.mealTypeName, header.mealTypeName, context.mealTypeName) ||
    (mealTypeId ? `Meal #${mealTypeId}` : 'Whole Day');

  return {
    productionPlanId:
      pickNum(data.productionPlanId, header.productionPlanId, context.productionPlanId) ??
      null,
    planCode: pickStr(data.planCode, header.planCode, context.planCode),
    productionDate: pickStr(
      data.productionDate,
      data.planDate,
      header.productionDate,
      context.productionDate
    ),
    kitchenName: pickStr(
      data.kitchenName,
      data.kitchenLocationName,
      data.organizationName,
      header.kitchenName,
      header.kitchenLocationName,
      context.kitchenName
    ),
    mealTypeId,
    mealTypeName,
    plannedPax,
    actualPax,
    plannedCostPerPax,
    actualCostPerPax,
    costDiffPerPax,
    costVariancePct,
    producedKg,
    leftoverKg,
    plateWasteKg,
    consumedKg,
    perPersonFoodG,
    perPersonWasteG,
    rawMaterialCost,
    prepWasteCost,
    disposablesCost,
    grossProductionCost,
    leftoverReusedCredit,
    leftoverWastageLoss,
    netMealConsumptionCost,
    recipes: recipes.map((r) => ({
      ...r,
      costSharePct:
        totalRecipeCostSum > 0
          ? roundTo((r.totalRecipeCost / totalRecipeCostSum) * 100, 1)
          : 0,
    })),
    totalRecipeCostSum,
    totalPortionCostSum,
    rawMaterials: rawMaterials.map((m) => ({
      ...m,
      costSharePct:
        totalRawMaterialCostSum > 0
          ? roundTo((m.totalCost / totalRawMaterialCostSum) * 100, 1)
          : 0,
    })),
    totalRawMaterialCostSum,
    shiftBreakdowns,
    availableMeals,
  };
};

/**
 * Aggregates multiple normalized meal summaries into a Whole Day costing summary
 * when Whole Day needs client-side rollup across individual meal shifts.
 */
export const aggregateCostingSummaries = (mealSummaries = [], context = {}) => {
  const valid = (Array.isArray(mealSummaries) ? mealSummaries : []).filter(Boolean);
  if (valid.length === 0) return null;

  const plannedPax = valid.reduce((s, c) => s + (c.plannedPax || 0), 0);
  const actualPax = valid.reduce((s, c) => s + (c.actualPax || 0), 0);
  const plannedBudgetTotal = valid.reduce(
    (s, c) => s + (c.plannedPax || 0) * (c.plannedCostPerPax || 0),
    0
  );
  const plannedCostPerPax =
    plannedPax > 0 ? roundTo(plannedBudgetTotal / plannedPax, 2) : 0;

  const rawMaterialCost = roundTo(
    valid.reduce((s, c) => s + (c.rawMaterialCost || 0), 0),
    2
  );
  const prepWasteCost = roundTo(
    valid.reduce((s, c) => s + (c.prepWasteCost || 0), 0),
    2
  );
  const disposablesCost = roundTo(
    valid.reduce((s, c) => s + (c.disposablesCost || 0), 0),
    2
  );
  const grossProductionCost = roundTo(
    rawMaterialCost + prepWasteCost + disposablesCost,
    2
  );
  const leftoverReusedCredit = roundTo(
    valid.reduce((s, c) => s + (c.leftoverReusedCredit || 0), 0),
    2
  );
  const leftoverWastageLoss = roundTo(
    valid.reduce((s, c) => s + (c.leftoverWastageLoss || 0), 0),
    2
  );
  const netMealConsumptionCost = roundTo(
    grossProductionCost - leftoverReusedCredit + leftoverWastageLoss,
    2
  );

  const actualCostPerPax =
    actualPax > 0 ? roundTo(netMealConsumptionCost / actualPax, 2) : 0;
  const costDiffPerPax = roundTo(actualCostPerPax - plannedCostPerPax, 2);
  const costVariancePct =
    plannedCostPerPax > 0
      ? roundTo(((actualCostPerPax - plannedCostPerPax) / plannedCostPerPax) * 100, 2)
      : 0;

  const producedKg = roundTo(valid.reduce((s, c) => s + (c.producedKg || 0), 0), 2);
  const leftoverKg = roundTo(valid.reduce((s, c) => s + (c.leftoverKg || 0), 0), 2);
  const plateWasteKg = roundTo(valid.reduce((s, c) => s + (c.plateWasteKg || 0), 0), 2);
  const consumedKg = roundTo(valid.reduce((s, c) => s + (c.consumedKg || 0), 0), 2);
  const perPersonFoodG =
    actualPax > 0 ? roundTo((consumedKg * 1000) / actualPax, 2) : 0;
  const perPersonWasteG =
    actualPax > 0 ? roundTo((plateWasteKg * 1000) / actualPax, 2) : 0;

  const allRecipes = valid.flatMap((c) =>
    (c.recipes || []).map((r) => ({ ...r, shiftName: r.shiftName || c.mealTypeName }))
  );
  const totalRecipeCostSum = roundTo(
    allRecipes.reduce((s, r) => s + (r.totalRecipeCost || 0), 0),
    2
  );
  const recipes = allRecipes.map((r) => ({
    ...r,
    portionCost: actualPax > 0 ? roundTo((r.totalRecipeCost || 0) / actualPax, 2) : 0,
    costSharePct:
      totalRecipeCostSum > 0
        ? roundTo(((r.totalRecipeCost || 0) / totalRecipeCostSum) * 100, 1)
        : 0,
  }));
  const totalPortionCostSum = roundTo(
    recipes.reduce((s, r) => s + (r.portionCost || 0), 0),
    2
  );

  const matMap = new Map();
  valid.forEach((c) => {
    (c.rawMaterials || []).forEach((m) => {
      const key = `${m.materialName}-${m.uom}`;
      if (!matMap.has(key)) {
        matMap.set(key, { ...m });
      } else {
        const prev = matMap.get(key);
        const requiredQty = roundTo((prev.requiredQty || 0) + (m.requiredQty || 0), 2);
        const actualUsedQty = roundTo(
          (prev.actualUsedQty || 0) + (m.actualUsedQty || 0),
          2
        );
        const prepWasteQty = roundTo((prev.prepWasteQty || 0) + (m.prepWasteQty || 0), 2);
        const totalCost = roundTo((prev.totalCost || 0) + (m.totalCost || 0), 2);
        const prepWasteCostAcc = roundTo(
          (prev.prepWasteCost || 0) + (m.prepWasteCost || 0),
          2
        );
        matMap.set(key, {
          ...prev,
          requiredQty,
          actualUsedQty,
          prepWasteQty,
          totalCost,
          prepWasteCost: prepWasteCostAcc,
          unitRate:
            actualUsedQty > 0 ? roundTo(totalCost / actualUsedQty, 2) : prev.unitRate,
          qtyVariance: roundTo(actualUsedQty - requiredQty, 2),
        });
      }
    });
  });

  const rawMaterialsList = Array.from(matMap.values());
  const totalRawMaterialCostSum = roundTo(
    rawMaterialsList.reduce((s, m) => s + (m.totalCost || 0), 0),
    2
  );
  const rawMaterials = rawMaterialsList.map((m) => ({
    ...m,
    costSharePct:
      totalRawMaterialCostSum > 0
        ? roundTo(((m.totalCost || 0) / totalRawMaterialCostSum) * 100, 1)
        : 0,
  }));

  return {
    productionPlanId: context.productionPlanId ?? valid[0]?.productionPlanId ?? null,
    planCode: context.planCode || valid[0]?.planCode || '',
    productionDate: context.productionDate || valid[0]?.productionDate || '',
    kitchenName: context.kitchenName || valid[0]?.kitchenName || '',
    mealTypeId: null,
    mealTypeName: 'Whole Day',
    plannedPax,
    actualPax,
    plannedCostPerPax,
    actualCostPerPax,
    costDiffPerPax,
    costVariancePct,
    producedKg,
    leftoverKg,
    plateWasteKg,
    consumedKg,
    perPersonFoodG,
    perPersonWasteG,
    rawMaterialCost,
    prepWasteCost,
    disposablesCost,
    grossProductionCost,
    leftoverReusedCredit,
    leftoverWastageLoss,
    netMealConsumptionCost,
    recipes,
    totalRecipeCostSum,
    totalPortionCostSum,
    rawMaterials,
    totalRawMaterialCostSum:
      totalRawMaterialCostSum > 0 ? totalRawMaterialCostSum : rawMaterialCost,
    shiftBreakdowns: valid,
    availableMeals: [],
  };
};
