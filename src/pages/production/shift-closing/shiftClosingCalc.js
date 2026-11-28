export const DISPOSITION_OPTIONS = [
  { value: 'WASTAGE', label: 'Wastage (Write-Off)' },
  { value: 'REUSE', label: 'Reuse (Leftover Batch)' },
];

export const roundTo = (num, decimals) => {
  const n = Number(num);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * factor) / factor;
};

export const isKgUnit = (uom) => {
  if (!uom) return false;
  const cleaned = String(uom).trim().toLowerCase();
  return cleaned === 'kg' || cleaned === 'kilogram' || cleaned === 'kilograms' || cleaned === 'kgs';
};

export const hasEnteredClosingQty = (val) => {
  return val !== '' && val !== null && val !== undefined && !Number.isNaN(Number(val));
};

/**
 * Normalizes a `/get` response item into editable row state.
 * Note: `/get` uses `actualQuantity`, `closingQuantity`, `consumedQuantity`
 * while save/submit requests use `actualQty`, `closingQty`, `consumedQty`.
 */
export const normalizeShiftClosingItem = (rawItem, idx, { isUnsavedRecord = false } = {}) => {
  const actualRaw =
    rawItem.actualQuantity ?? rawItem.actualQty ?? rawItem.transferredQuantity ?? rawItem.transferQuantity ?? 0;
  const closingRaw = rawItem.closingQuantity ?? rawItem.closingQty;
  const hasClosing =
    hasEnteredClosingQty(closingRaw) &&
    !(isUnsavedRecord && Number(closingRaw) === 0);

  const actualQty = roundTo(Number(actualRaw) || 0, 3);
  const closingQtyStr = hasClosing ? String(closingRaw) : '';

  const derived = calculateRowMetrics(actualQty, closingQtyStr);

  return {
    ...rawItem,
    localKey: `${rawItem.productionPlanItemId ?? rawItem.id ?? rawItem.recipeId ?? rawItem.kitchenMenuItemId ?? idx}-${rawItem.batchNumber || 'nobatch'}-${idx}`,
    recipeName:
      rawItem.recipeName ||
      rawItem.itemName ||
      rawItem.kitchenMenuItemName ||
      rawItem.name ||
      `Dish #${rawItem.recipeId || rawItem.kitchenMenuItemId || idx + 1}`,
    batchNumber: rawItem.batchNumber ?? rawItem.batchNo ?? '',
    uom: rawItem.uom || rawItem.uomSymbol || rawItem.unitSymbol || rawItem.unitName || 'kg',
    actualQty,
    closingQty: closingQtyStr,
    consumedQty: derived.consumedQty,
    consumptionPct: derived.consumptionPct,
    disposition: rawItem.disposition ? String(rawItem.disposition).toUpperCase() : '',
    remarks: rawItem.remarks ?? '',
  };
};

/**
 * Calculates item-level `consumedQty` (3 decimals) and `consumptionPct` (2 decimals).
 * Blank `closingQty` yields `null` so blank rows are never treated as fully consumed.
 */
export const calculateRowMetrics = (actualQty, closingQtyInput) => {
  const actual = Number(actualQty) || 0;
  if (!hasEnteredClosingQty(closingQtyInput)) {
    return { consumedQty: null, consumptionPct: null };
  }

  const closing = Number(closingQtyInput);
  if (!Number.isFinite(closing)) {
    return { consumedQty: null, consumptionPct: null };
  }

  const consumedQty = roundTo(actual - closing, 3);
  const consumptionPct = actual > 0 ? roundTo((consumedQty / actual) * 100, 2) : 0;

  return { consumedQty, consumptionPct };
};

/**
 * Calculates shift-wide totals and KPI summary metrics.
 * Rows with no leftover entered are excluded from consumed totals.
 */
export const calculateShiftClosingSummary = (items = [], pax = {}) => {
  const paidPax = Math.max(0, Math.round(Number(pax.paidPax) || 0));
  const unpaidPax = Math.max(0, Math.round(Number(pax.unpaidPax) || 0));
  const staffPax = Math.max(0, Math.round(Number(pax.staffPax) || 0));
  const totalActualPax = paidPax + unpaidPax + staffPax;

  let totalActualQty = 0;
  let enteredActualQty = 0;
  let totalClosingQty = 0;
  let totalConsumedQty = 0;
  let totalWastedQty = 0;
  let totalReusedQty = 0;
  let consumedKgQty = 0;

  const uniqueUnits = new Set();

  items.forEach((row) => {
    const actual = Number(row.actualQty) || 0;
    totalActualQty += actual;

    if (row.uom) {
      uniqueUnits.add(String(row.uom).trim().toLowerCase());
    }

    if (hasEnteredClosingQty(row.closingQty)) {
      const closing = Number(row.closingQty) || 0;
      const { consumedQty } = calculateRowMetrics(actual, row.closingQty);

      enteredActualQty += actual;
      totalClosingQty += closing;
      if (consumedQty !== null) {
        totalConsumedQty += consumedQty;
        if (isKgUnit(row.uom)) {
          consumedKgQty += consumedQty;
        }
      }

      const disp = String(row.disposition || '').toUpperCase();
      if (disp === 'WASTAGE') {
        totalWastedQty += closing;
      } else if (disp === 'REUSE') {
        totalReusedQty += closing;
      }
    }
  });

  const roundedActual = roundTo(totalActualQty, 3);
  const roundedClosing = roundTo(totalClosingQty, 3);
  const roundedConsumed = roundTo(totalConsumedQty, 3);
  const roundedWasted = roundTo(totalWastedQty, 3);
  const roundedReused = roundTo(totalReusedQty, 3);

  const consumptionPct =
    enteredActualQty > 0 ? roundTo((roundedConsumed / enteredActualQty) * 100, 2) : 0;

  const perPaxConsumptionKg =
    totalActualPax > 0 ? roundTo(consumedKgQty / totalActualPax, 3) : 0;

  return {
    paidPax,
    unpaidPax,
    staffPax,
    totalActualPax,
    totalActualQty: roundedActual,
    totalClosingQty: roundedClosing,
    totalConsumedQty: roundedConsumed,
    totalWastedQty: roundedWasted,
    totalReusedQty: roundedReused,
    consumptionPct,
    perPaxConsumptionKg,
    hasMixedUnits: uniqueUnits.size > 1,
    unitsList: Array.from(uniqueUnits),
  };
};

/**
 * Validates items and pax before Save Draft (`isSubmit = false`) or Close Shift (`isSubmit = true`).
 * Returns `{ valid: boolean, errors: string[], itemErrors: Record<string, string> }`.
 */
export const validateShiftClosing = (items = [], pax = {}, isSubmit = false) => {
  const errors = [];
  const itemErrors = {};

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('At least one dish is required.');
    return { valid: false, errors, itemErrors };
  }

  const paid = Number(pax.paidPax) || 0;
  const unpaid = Number(pax.unpaidPax) || 0;
  const staff = Number(pax.staffPax) || 0;
  const totalActualPax = paid + unpaid + staff;

  if (paid < 0 || unpaid < 0 || staff < 0) {
    errors.push('Pax counts cannot be negative.');
  }

  if (isSubmit && totalActualPax <= 0) {
    errors.push('Total actual pax must be greater than 0 to close the shift.');
  }

  items.forEach((row) => {
    const actual = Number(row.actualQty) || 0;
    const hasClosing = hasEnteredClosingQty(row.closingQty);

    if (isSubmit && !hasClosing) {
      const msg = `Enter leftover quantity for "${row.recipeName}".`;
      errors.push(msg);
      itemErrors[row.localKey] = 'Leftover qty required';
      return;
    }

    if (hasClosing) {
      const closing = Number(row.closingQty);
      if (Number.isNaN(closing) || closing < 0 || closing > actual) {
        const msg = `Leftover quantity for "${row.recipeName}" must be between 0 and ${actual} ${row.uom || ''}.`.trim();
        errors.push(msg);
        itemErrors[row.localKey] = `Must be 0 – ${actual}`;
        return;
      }

      if (isSubmit && closing > 0) {
        const disp = String(row.disposition || '').toUpperCase();
        if (disp !== 'WASTAGE' && disp !== 'REUSE') {
          const msg = `Select a disposition (Wastage or Reuse) for "${row.recipeName}".`;
          errors.push(msg);
          itemErrors[row.localKey] = 'Disposition required';
        }
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    itemErrors,
  };
};

/**
 * Builds the flat `/save-draft` & `/submit` request payload.
 * Flattens pax and summary fields and strips display-only `recipeName` and `uom`.
 */
export const buildShiftClosingPayload = ({
  shiftClosingId = null,
  context,
  closingDate,
  userId,
  remarks,
  pax,
  items,
}) => {
  const summary = calculateShiftClosingSummary(items, pax);

  const payloadItems = items.map((row) => {
    const hasClosing = hasEnteredClosingQty(row.closingQty);
    const closingVal = hasClosing ? roundTo(Number(row.closingQty), 3) : null;
    const { consumedQty, consumptionPct } = calculateRowMetrics(row.actualQty, row.closingQty);
    const disp = row.disposition ? String(row.disposition).toUpperCase() : null;

    // Strip display-only fields (`recipeName`, `uom`, `localKey`, UI/read aliases)
    const {
      recipeName: _recipeName,
      uom: _uom,
      localKey: _localKey,
      actualQuantity: _actualQuantity,
      closingQuantity: _closingQuantity,
      consumedQuantity: _consumedQuantity,
      ...restItem
    } = row;

    return {
      ...restItem,
      actualQty: roundTo(Number(row.actualQty) || 0, 3),
      closingQty: closingVal,
      consumedQty,
      consumptionPct,
      disposition: hasClosing && closingVal > 0 ? disp : null,
      remarks: (row.remarks || '').trim(),
    };
  });

  return {
    ...(shiftClosingId ? { shiftClosingId: Number(shiftClosingId) } : {}),
    productionPlanId: Number(context.productionPlanId),
    mealTypeId: Number(context.mealTypeId),
    organizationId: Number(context.organizationId),
    subOutletId:
      context.subOutletId !== undefined &&
      context.subOutletId !== null &&
      context.subOutletId !== '' &&
      Number(context.subOutletId) > 0
        ? Number(context.subOutletId)
        : null,
    closingDate,
    userId: Number(userId),
    remarks: (remarks || '').trim(),
    paidPax: summary.paidPax,
    unpaidPax: summary.unpaidPax,
    staffPax: summary.staffPax,
    totalActualPax: summary.totalActualPax,
    totalActualQty: summary.totalActualQty,
    totalClosingQty: summary.totalClosingQty,
    totalConsumedQty: summary.totalConsumedQty,
    totalWastedQty: summary.totalWastedQty,
    totalReusedQty: summary.totalReusedQty,
    consumptionPct: summary.consumptionPct,
    perPaxConsumptionKg: summary.perPaxConsumptionKg,
    items: payloadItems,
  };
};
