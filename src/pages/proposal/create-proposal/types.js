export const PROPOSAL_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ISSUED: 'ISSUED',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};

export const PROPOSAL_STEPS = [
  { id: 1, key: 'basic', title: 'Proposal Details', description: 'Basic information and reference unit.' },
  { id: 2, key: 'assets', title: 'Assets', description: 'Equipment and asset allocation with monthly cost.' },
  { id: 3, key: 'manpower', title: 'Manpower', description: 'Workforce headcount, statutory wage zones, and role payroll.' },
  { id: 4, key: 'otherCost', title: 'Overhead Expense', description: 'Cost factor lines, responsibility allocation, and overheads.' },
  { id: 5, key: 'shift', title: 'Shift & Service Details', description: 'Meal shifts, pricing structures, and item cost details.' },
  { id: 6, key: 'terms', title: 'Terms & Conditions', description: 'Contractual agreements, annexures, and document generation.' },
];

export const INITIAL_ASSETS = [];

export const INITIAL_BASIC_DETAILS = {
  title: '',
  proposalNumber: '',
  proposalType: 'INSTITUTIONAL',
  proposalTypeId: null,
  clientName: '',
  clientContactPerson: '',
  clientPhone: '',
  clientEmail: '',
  proposalDate: new Date().toISOString().split('T')[0],
  validityDate: '',
  foodPreference: 'SUBSIDIZED',
  paymentMode: 'BANK_TRANSFER',
  serviceStartDate: '',
  serviceEndDate: '',
  stateId: '',
  organizationId: '',
  subOutletId: '',
  remarks: '',
  specialNotes: '',
  wageZone: 'Zone A',
  supplyDaysPerMonth: 30,
  status: PROPOSAL_STATUS.DRAFT,
};

export const INITIAL_MANPOWER = {
  stateId: '',
  roles: [],
};

export const INITIAL_SHIFT_SERVICE = {
  supplyDaysPerYear: '',
  supplyDaysPerMonth: 30,
  pricingMethod: '',
  perHeadGrams: '',
  shifts: [],
};

export const INITIAL_OTHER_COSTS = [];

export const INITIAL_TERMS = [];

export const INITIAL_ATTACHMENTS = [];

// Calculation utility helpers
export const calculateTotalCost = (rmCost, inflation, manpowerCost = 0, overheadCost = 0, assetCost = 0) => {
  const rm = Number(rmCost) || 0;
  const mp = Number(manpowerCost) || 0;
  const ov = Number(overheadCost) || 0;
  const ast = Number(assetCost) || 0;
  const base = rm + mp + ov + ast;
  const inf = Number(inflation) || 0;
  return Number((base * (1 + inf / 100)).toFixed(2));
};

export const calculateProposedRate = (totalCost, profit) => {
  const tc = Number(totalCost) || 0;
  const pr = Number(profit) || 0;
  return Number((tc * (1 + pr / 100)).toFixed(2));
};

export const extractArray = (res) => {
  if (!res) return [];
  const raw = res?.data?.data ?? res?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(raw?.list)) return raw.list;
  if (Array.isArray(raw?.rows)) return raw.rows;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data)) return res.data;
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(raw)) {
      if (Array.isArray(raw[key])) return raw[key];
    }
  }
  return [];
};

// Date helper: converts YYYY-MM-DD (native date input) -> DD/MM/YYYY (API payload)
export const toApiDate = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal !== 'string') return '';
  const trimmed = dateVal.trim();
  if (!trimmed) return '';
  // If already DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  // If YYYY-MM-DD or ISO string
  const clean = trimmed.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return trimmed;
};

// Date helper: converts DD/MM/YYYY or MM-DD-YYYY -> YYYY-MM-DD (native date input)
export const toInputDate = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal !== 'string') return '';
  const trimmed = dateVal.trim();
  if (!trimmed) return '';
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // If MM-DD-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [month, day, year] = trimmed.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // If DD/MM/YYYY
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return trimmed.split('T')[0] || '';
};

// Date helper: converts YYYY-MM-DD or ISO -> DD/MM/YYYY (API payload for Recipe Costing Criteria)
export const toMMDDYYYY = (dateVal) => {
  return toApiDate(dateVal);
};

export const toDDMMYYYY = toApiDate;

// Helper to reliably extract raw material cost from shift object or food cost summary
export const extractShiftRmCost = (s, matched = null) => {
  if (matched?.rawMaterialCostPerPlate != null && Number(matched.rawMaterialCostPerPlate) > 0) {
    return Number(Number(matched.rawMaterialCostPerPlate).toFixed(3));
  }
  if (!s) return 0;
  if (s.rawMaterialCost != null && Number(s.rawMaterialCost) > 0) {
    return Number(Number(s.rawMaterialCost).toFixed(3));
  }
  if (s.rawMaterialCostPerPlate != null && Number(s.rawMaterialCostPerPlate) > 0) {
    return Number(Number(s.rawMaterialCostPerPlate).toFixed(3));
  }
  if (s.rmCost != null && Number(s.rmCost) > 0) {
    return Number(Number(s.rmCost).toFixed(3));
  }
  if (s.ratePerPlate != null && Number(s.ratePerPlate) > 0) {
    return Number(Number(s.ratePerPlate).toFixed(3));
  }
  return 0;
};

// Helper to construct bulk shift payload item with all 42 required keys
export const buildShiftBulkItem = (shift, matchedSummary = {}, supplyDays = 26, allMealTypes = []) => {
  const s = shift || {};
  const m = matchedSummary || {};

  const headCount = Number(
    s.headCount !== undefined && s.headCount !== null && s.headCount !== ''
      ? s.headCount
      : s.headcount !== undefined && s.headcount !== null && s.headcount !== ''
        ? s.headcount
        : m.headCount ?? m.headcount ?? 0
  ) || 0;

  const guaranteedPax = Number(s.guaranteedPax ?? m.guaranteedPax ?? 0) || 0;

  const rawMaterialCostPerPlate = extractShiftRmCost(s, m);

  const manpowerCostPerPlate = Number(
    s.manpowerCost !== undefined && s.manpowerCost !== null && s.manpowerCost !== ''
      ? Number(s.manpowerCost)
      : m.manpowerCostPerPlate != null
        ? Number(m.manpowerCostPerPlate)
        : s.manpowerCostPerPlate ?? 0
  ) || 0;

  const overheadCostPerPlate = Number(
    s.overheadCost !== undefined && s.overheadCost !== null && s.overheadCost !== ''
      ? Number(s.overheadCost)
      : m.overheadCostPerPlate != null
        ? Number(m.overheadCostPerPlate)
        : s.overheadCostPerPlate ?? 0
  ) || 0;

  const assetCostPerPlate = Number(
    s.assetCost !== undefined && s.assetCost !== null && s.assetCost !== ''
      ? Number(s.assetCost)
      : s.dailyAssetCost !== undefined && s.dailyAssetCost !== null && s.dailyAssetCost !== ''
        ? Number(s.dailyAssetCost)
        : m.dailyAssetCost != null
          ? Number(m.dailyAssetCost)
          : m.assetCostPerPlate != null
            ? Number(m.assetCostPerPlate)
            : m.assetCost != null
              ? Number(m.assetCost)
              : s.assetCostPerPlate ?? 0
  ) || 0;

  const inflationPercentage = Number(s.inflationPercentage ?? s.inflation ?? m.inflationPercentage ?? 0) || 0;
  const inflationAmountPerPlate = Number(
    m.inflationAmountPerPlate != null
      ? m.inflationAmountPerPlate
      : s.inflationAmountPerPlate != null
        ? s.inflationAmountPerPlate
        : (rawMaterialCostPerPlate * inflationPercentage) / 100
  ) || 0;

  const profitPercentage = Number(s.profitPercentage ?? s.profit ?? m.profitPercentage ?? 0) || 0;

  const baseCostPerPlate = Number(
    m.baseCostPerPlate != null
      ? m.baseCostPerPlate
      : s.baseCostPerPlate != null
        ? s.baseCostPerPlate
        : rawMaterialCostPerPlate
  ) || 0;

  const totalShiftCost = Number(
    s.totalCost != null && s.totalCost !== ''
      ? Number(s.totalCost)
      : m.totalShiftCost != null
        ? Number(m.totalShiftCost)
        : m.totalCost != null
          ? Number(m.totalCost)
          : calculateTotalCost(rawMaterialCostPerPlate, inflationPercentage, manpowerCostPerPlate, overheadCostPerPlate, assetCostPerPlate)
  ) || 0;

  const profitAmountPerPlate = Number(
    m.profitAmountPerPlate != null
      ? m.profitAmountPerPlate
      : s.profitAmountPerPlate != null
        ? s.profitAmountPerPlate
        : (totalShiftCost * profitPercentage) / 100
  ) || 0;

  const proposedRate = Number(
    s.proposedRate != null && s.proposedRate !== ''
      ? Number(s.proposedRate)
      : m.proposedRate != null
        ? Number(m.proposedRate)
        : calculateProposedRate(totalShiftCost, profitPercentage)
  ) || 0;

  const quotedRate = Number(s.quotedRate ?? m.quotedRate ?? proposedRate) || 0;
  const contractedRate = Number(s.contractedRate ?? m.contractedRate ?? quotedRate) || 0;
  const marginPerPlate = Number(
    m.marginPerPlate != null
      ? m.marginPerPlate
      : s.marginPerPlate != null
        ? s.marginPerPlate
        : profitAmountPerPlate > 0
          ? profitAmountPerPlate
          : Math.max(0, proposedRate - totalShiftCost)
  ) || 0;

  const safeSupplyDays = Number(supplyDays) > 0 ? Number(supplyDays) : 26;
  const monthlySaleQuantity = Number(m.monthlySaleQuantity ?? s.monthlySaleQuantity ?? (headCount * safeSupplyDays)) || 0;

  const dailyFoodCost = Number(m.dailyFoodCost ?? s.dailyFoodCost ?? (rawMaterialCostPerPlate * headCount)) || 0;
  const dailyManpowerCost = Number(m.dailyManpowerCost ?? s.dailyManpowerCost ?? (manpowerCostPerPlate * headCount)) || 0;
  const dailyAssetCost = Number(m.dailyAssetCost ?? s.dailyAssetCost ?? (assetCostPerPlate * headCount)) || 0;
  const dailyMarginValue = Number(m.dailyMarginValue ?? s.dailyMarginValue ?? (marginPerPlate * headCount)) || 0;
  const dailyTotalValue = Number(m.dailyTotalValue ?? s.dailyTotalValue ?? (proposedRate * headCount)) || 0;

  const monthlyRawMaterialCost = Number(m.monthlyRawMaterialCost ?? s.monthlyRawMaterialCost ?? (dailyFoodCost * safeSupplyDays)) || 0;
  const monthlyManpowerCost = Number(m.monthlyManpowerCost ?? s.monthlyManpowerCost ?? (dailyManpowerCost * safeSupplyDays)) || 0;
  const monthlyOverheadCost = Number(
    m.monthlyOverheadCost ?? s.monthlyOverheadCost ?? (overheadCostPerPlate * headCount * safeSupplyDays)
  ) || 0;
  const monthlyAssetCost = Number(m.monthlyAssetCost ?? s.monthlyAssetCost ?? (dailyAssetCost * safeSupplyDays)) || 0;
  const monthlyFuelCost = Number(m.monthlyFuelCost ?? s.monthlyFuelCost ?? 0) || 0;
  const fuelCostPerPlate = Number(m.fuelCostPerPlate ?? s.fuelCostPerPlate ?? 0) || 0;

  const mealTypeId = Number(s.mealTypeId ?? m.mealTypeId ?? 0) || 0;
  let mealTypeName = String(s.mealTypeName || m.mealTypeName || '').trim();
  if (!mealTypeName && mealTypeId && Array.isArray(allMealTypes)) {
    const foundMeal = allMealTypes.find((mt) => Number(mt.id ?? mt.mealTypeId) === mealTypeId);
    if (foundMeal) {
      mealTypeName = String(foundMeal.mealTypeName || foundMeal.name || '').trim();
    }
  }

  const shiftId = Number(
    typeof s.id === 'number' && s.id > 0 && s.id < 1000000000000
      ? s.id
      : typeof s.shiftId === 'number' && s.shiftId > 0 && s.shiftId < 1000000000000
        ? s.shiftId
        : typeof m.shiftId === 'number' && m.shiftId > 0 && m.shiftId < 1000000000000
          ? m.shiftId
          : 0
  );

  return {
    assetCost: assetCostPerPlate,
    assetCostPerPlate,
    avgPortionWeightGrams: Number(m.avgPortionWeightGrams ?? s.avgPortionWeightGrams ?? 0) || 0,
    baseCostPerPlate,
    combinedShiftCostPerPlate: totalShiftCost,
    contractedRate,
    dailyAssetCost,
    dailyFoodCost,
    dailyManpowerCost,
    dailyMarginValue,
    dailyTotalValue,
    fuelCostPerPlate,
    guaranteedPax,
    headCount,
    inflationAmountPerPlate,
    inflationPercentage,
    manpowerCost: manpowerCostPerPlate,
    manpowerCostPerPlate,
    marginPerPlate,
    mealTypeId,
    mealTypeName,
    monthlyAssetCost,
    monthlyFuelCost,
    monthlyManpowerCost,
    monthlyOverheadCost,
    monthlyRawMaterialCost,
    monthlySaleQuantity,
    overheadCost: overheadCostPerPlate,
    overheadCostPerPlate,
    profitAmountPerPlate,
    profitPercentage,
    proposedRate,
    quotedRate,
    ratePerPlate: rawMaterialCostPerPlate,
    rawMaterialCost: rawMaterialCostPerPlate,
    rawMaterialCostPerPlate,
    shiftId,
    shiftName: String(s.shiftName || m.shiftName || ''),
    totalPortionCostSum: Number(m.totalPortionCostSum ?? s.totalPortionCostSum ?? 0) || 0,
    totalPortionGrams: Number(m.totalPortionGrams ?? s.totalPortionGrams ?? 0) || 0,
    totalShiftCost,
    weightedCostPerPlate: Number(m.weightedCostPerPlate ?? s.weightedCostPerPlate ?? rawMaterialCostPerPlate) || 0,
  };
};


