/**
 * Comprehensive Mock Data for the entire Jaiswal ERP Food & Production Module.
 * Matches all Figma specifications and screenshots accurately.
 */

export const INITIAL_PLANS = [
  {
    id: 1,
    planCode: 'PP-2026-0148',
    date: '27 Oct 2026',
    shift: 'Day Shift',
    site: 'Main Site',
    kitchen: 'Central Kitchen',
    progress: 65,
    plannedQty: '320 meals',
    completedQty: '220 meals',
    status: 'IN_PROGRESS',
    meals: [
      { mealType: 'Lunch', time: '12:00 PM - 02:00 PM', planned: 250, completed: 240 },
      { mealType: 'Dinner', time: '07:00 PM - 09:00 PM', planned: 250, completed: 240 }
    ]
  },
  {
    id: 2,
    planCode: 'PP-2026-0147',
    date: '27 Oct 2026',
    shift: 'Evening Shift',
    site: 'City Center Site',
    kitchen: 'City Center Kitchen',
    progress: 75,
    plannedQty: '180 meals',
    completedQty: '120 meals',
    status: 'IN_PROGRESS',
    meals: [
      { mealType: 'Dinner', time: '07:00 PM - 09:30 PM', planned: 180, completed: 120 }
    ]
  },
  {
    id: 3,
    planCode: 'PP-2026-0146',
    date: '26 Oct 2026',
    shift: 'Day Shift',
    site: 'Main Site',
    kitchen: 'Production Kitchen',
    progress: 100,
    plannedQty: '250 meals',
    completedQty: '250 meals',
    status: 'COMPLETED',
    meals: [
      { mealType: 'Breakfast', time: '07:00 AM - 09:00 AM', planned: 100, completed: 100 },
      { mealType: 'Lunch', time: '12:30 PM - 02:30 PM', planned: 150, completed: 150 }
    ]
  },
  {
    id: 4,
    planCode: 'PP-2026-0111',
    date: '17 Oct 2026',
    shift: 'Day Shift',
    site: 'Central Kitchen',
    kitchen: 'Main Kitchen',
    progress: 60,
    plannedQty: '400 meals',
    completedQty: '240 meals',
    status: 'IN_PROGRESS',
    meals: [
      { mealType: 'Lunch', time: '12:00 PM - 02:30 PM', planned: 400, completed: 240 }
    ]
  },
  {
    id: 5,
    planCode: 'PP-2026-0100',
    date: '16 Oct 2026',
    shift: 'Night Shift',
    site: 'Tata Motors',
    kitchen: 'Plant Canteen',
    progress: 85,
    plannedQty: '500 meals',
    completedQty: '425 meals',
    status: 'IN_PROGRESS',
    meals: [
      { mealType: 'Dinner', time: '08:00 PM - 10:30 PM', planned: 250, completed: 225 },
      { mealType: 'Midnight Snack', time: '01:00 AM - 02:30 AM', planned: 250, completed: 200 }
    ]
  }
];

export const MOCK_MENU_PLANS = [
  {
    id: 'MP-01',
    name: 'Summer Special Menu 2025',
    outlet: 'Main Kitchen',
    duration: '01 Apr 2025 - 30 Apr 2025',
    menuItems: 12,
    plannedDemand: '1,200 Pax',
    status: 'Approved'
  },
  {
    id: 'MP-02',
    name: 'Corporate Executive Plan 2026',
    outlet: 'Central Kitchen',
    duration: '01 May 2026 - 31 May 2026',
    menuItems: 16,
    plannedDemand: '2,500 Pax',
    status: 'Approved'
  }
];

export const MOCK_DESTINATION_OUTLETS = [
  {
    id: 1,
    selected: true,
    outlet: 'Outlet - Ahmedabad',
    subLocation: 'Main Kitchen',
    plannedPax: 250,
    deliveryTime: '11:00 AM',
    transferRequired: true,
    notes: 'Veg items only'
  },
  {
    id: 2,
    selected: true,
    outlet: 'Outlet - Surat',
    subLocation: 'Cold Storage',
    plannedPax: 180,
    deliveryTime: '12:30 PM',
    transferRequired: false,
    notes: '-'
  },
  {
    id: 3,
    selected: false,
    outlet: 'Outlet - Vadodara',
    subLocation: 'Main Kitchen',
    plannedPax: 200,
    deliveryTime: '03:00 PM',
    transferRequired: true,
    notes: 'Keep chilled'
  },
  {
    id: 4,
    selected: false,
    outlet: 'Outlet - Rajkot',
    subLocation: 'Dry Store',
    plannedPax: 150,
    deliveryTime: '04:30 PM',
    transferRequired: false,
    notes: '-'
  }
];

export const MOCK_RECIPE_ALLOCATIONS = [
  {
    id: 1,
    selected: true,
    recipe: 'Paneer Butter Masala',
    portionSize: '250 g',
    portionGrams: 250,
    totalPlannedQty: '100 kg',
    totalPlannedKg: 100,
    allocatedQty: '85 kg',
    allocatedKg: 85,
    variance: '15 kg',
    destinations: 4,
    transferQty: '0 kg',
    allocations: [
      { id: 1, selected: true, outlet: 'Outlet - Ahmedabad', subLocation: 'Main Kitchen', plannedPax: 250, plannedQty: '25 kg', portionSize: '250 g' },
      { id: 2, selected: true, outlet: 'Outlet - Surat', subLocation: 'Cold Storage', plannedPax: 180, plannedQty: '20 kg', portionSize: '250 g' },
      { id: 3, selected: true, outlet: 'Outlet - Vadodara', subLocation: 'Main Kitchen', plannedPax: 200, plannedQty: '22 kg', portionSize: '250 g' },
      { id: 4, selected: true, outlet: 'Outlet - Rajkot', subLocation: 'Dry Store', plannedPax: 150, plannedQty: '18 kg', portionSize: '250 g' }
    ]
  },
  {
    id: 2,
    selected: false,
    recipe: 'Dal Makhani',
    portionSize: '200 g',
    portionGrams: 200,
    totalPlannedQty: '80 kg',
    totalPlannedKg: 80,
    allocatedQty: '70 kg',
    allocatedKg: 70,
    variance: '10 kg',
    destinations: 3,
    transferQty: '0 kg',
    allocations: [
      { id: 1, selected: true, outlet: 'Outlet - Ahmedabad', subLocation: 'Main Kitchen', plannedPax: 250, plannedQty: '30 kg', portionSize: '200 g' },
      { id: 2, selected: true, outlet: 'Outlet - Surat', subLocation: 'Cold Storage', plannedPax: 180, plannedQty: '25 kg', portionSize: '200 g' },
      { id: 3, selected: true, outlet: 'Outlet - Vadodara', subLocation: 'Main Kitchen', plannedPax: 200, plannedQty: '15 kg', portionSize: '200 g' }
    ]
  },
  {
    id: 3,
    selected: false,
    recipe: 'Tandoori Roti',
    portionSize: '100 g',
    portionGrams: 100,
    totalPlannedQty: '120 kg',
    totalPlannedKg: 120,
    allocatedQty: '105 kg',
    allocatedKg: 105,
    variance: '15 kg',
    destinations: 4,
    transferQty: '0 kg',
    allocations: [
      { id: 1, selected: true, outlet: 'Outlet - Ahmedabad', subLocation: 'Main Kitchen', plannedPax: 250, plannedQty: '35 kg', portionSize: '100 g' },
      { id: 2, selected: true, outlet: 'Outlet - Surat', subLocation: 'Cold Storage', plannedPax: 180, plannedQty: '25 kg', portionSize: '100 g' },
      { id: 3, selected: true, outlet: 'Outlet - Vadodara', subLocation: 'Main Kitchen', plannedPax: 200, plannedQty: '25 kg', portionSize: '100 g' },
      { id: 4, selected: true, outlet: 'Outlet - Rajkot', subLocation: 'Dry Store', plannedPax: 150, plannedQty: '20 kg', portionSize: '100 g' }
    ]
  },
  {
    id: 4,
    selected: false,
    recipe: 'Vegetable Pulao',
    portionSize: '180 g',
    portionGrams: 180,
    totalPlannedQty: '90 kg',
    totalPlannedKg: 90,
    allocatedQty: '80 kg',
    allocatedKg: 80,
    variance: '10 kg',
    destinations: 3,
    transferQty: '0 kg',
    allocations: [
      { id: 1, selected: true, outlet: 'Outlet - Ahmedabad', subLocation: 'Main Kitchen', plannedPax: 250, plannedQty: '30 kg', portionSize: '180 g' },
      { id: 2, selected: true, outlet: 'Outlet - Surat', subLocation: 'Cold Storage', plannedPax: 180, plannedQty: '30 kg', portionSize: '180 g' },
      { id: 3, selected: true, outlet: 'Outlet - Vadodara', subLocation: 'Main Kitchen', plannedPax: 200, plannedQty: '20 kg', portionSize: '180 g' }
    ]
  }
];

export const MOCK_BOM_INGREDIENTS = [
  {
    id: 1,
    ingredient: 'Toor Dal',
    category: 'Pulses',
    requiredQty: 25,
    baseUom: 'kg',
    availableStore: 20,
    issueQty: 20,
    shortfall: 5,
    rate: 120,
    estimatedCost: 3000,
    status: 'SHORTFALL',
    batches: [
      { batchNo: 'TD001', expiryDate: '15 May 2026', availableStock: '10 kg', stockAge: '32 days' },
      { batchNo: 'TD002', expiryDate: '20 Jun 2026', availableStock: '10 kg', stockAge: '56 days' }
    ]
  },
  {
    id: 2,
    ingredient: 'Tomato',
    category: 'Vegetables',
    requiredQty: 40,
    baseUom: 'kg',
    availableStore: 38,
    issueQty: 38,
    shortfall: 2,
    rate: 40,
    estimatedCost: 1600,
    status: 'SHORTFALL',
    batches: [
      { batchNo: 'TM101', expiryDate: '28 Oct 2026', availableStock: '38 kg', stockAge: '3 days' }
    ]
  },
  {
    id: 3,
    ingredient: 'Onion',
    category: 'Vegetables',
    requiredQty: 50,
    baseUom: 'kg',
    availableStore: 50,
    issueQty: 50,
    shortfall: 0,
    rate: 30,
    estimatedCost: 1500,
    status: 'FULLY_AVAILABLE',
    batches: [
      { batchNo: 'ON001', expiryDate: '15 May 2026', availableStock: '30 kg', stockAge: '14 days' },
      { batchNo: 'ON002', expiryDate: '20 Jun 2026', availableStock: '20 kg', stockAge: '28 days' }
    ]
  },
  {
    id: 4,
    ingredient: 'Cooking Oil',
    category: 'Oils & Fats',
    requiredQty: 15,
    baseUom: 'L',
    availableStore: 15,
    issueQty: 15,
    shortfall: 0,
    rate: 150,
    estimatedCost: 2250,
    status: 'FULLY_AVAILABLE',
    batches: [
      { batchNo: 'CO201', expiryDate: '15 Dec 2026', availableStock: '15 L', stockAge: '45 days' }
    ]
  },
  {
    id: 5,
    ingredient: 'Paneer',
    category: 'Dairy',
    requiredQty: 20,
    baseUom: 'kg',
    availableStore: 15,
    issueQty: 15,
    shortfall: 5,
    rate: 350,
    estimatedCost: 5250,
    status: 'SHORTFALL',
    batches: [
      { batchNo: 'PN011', expiryDate: '02 Nov 2026', availableStock: '15 kg', stockAge: '2 days' }
    ]
  },
  {
    id: 6,
    ingredient: 'Potato',
    category: 'Vegetables',
    requiredQty: 30,
    baseUom: 'kg',
    availableStore: 30,
    issueQty: 30,
    shortfall: 0,
    rate: 25,
    estimatedCost: 750,
    status: 'FULLY_AVAILABLE',
    batches: [
      { batchNo: 'PT009', expiryDate: '20 Nov 2026', availableStock: '30 kg', stockAge: '10 days' }
    ]
  },
  {
    id: 7,
    ingredient: 'Basmati Rice',
    category: 'Grains',
    requiredQty: 40,
    baseUom: 'kg',
    availableStore: 35,
    issueQty: 35,
    shortfall: 5,
    rate: 90,
    estimatedCost: 3600,
    status: 'SHORTFALL',
    batches: [
      { batchNo: 'BR301', expiryDate: '30 Nov 2026', availableStock: '35 kg', stockAge: '60 days' }
    ]
  },
  {
    id: 8,
    ingredient: 'Wheat Flour',
    category: 'Grains',
    requiredQty: 50,
    baseUom: 'kg',
    availableStore: 50,
    issueQty: 50,
    shortfall: 0,
    rate: 40,
    estimatedCost: 2000,
    status: 'FULLY_AVAILABLE',
    batches: [
      { batchNo: 'WF002', expiryDate: '28 Nov 2026', availableStock: '50 kg', stockAge: '18 days' }
    ]
  }
];

export const MOCK_AUTO_PR_LIST = [
  { rawMaterial: 'Paneer', requiredQty: 5, uom: 'kg', vendor: 'Fresh Dairy Co.', requiredBy: '03 Apr 2026', status: 'Draft PR' },
  { rawMaterial: 'Wheat Flour', requiredQty: 5, uom: 'kg', vendor: 'Shree Traders', requiredBy: '03 Apr 2026', status: 'Draft PR' },
  { rawMaterial: 'Fresh Cream', requiredQty: 2, uom: 'kg', vendor: 'Dairy Solutions', requiredBy: '04 Apr 2026', status: 'Draft PR' }
];

export const MOCK_STORE_ISSUES_REGISTER = [
  { issueNo: 'SI-2026-0065', date: '27 Oct 2026', planCode: 'PP-2026-0148', kitchen: 'Central Kitchen', items: 12, totalQty: '48 kg', issuedBy: 'Rahul Patel', status: 'COMPLETED' },
  { issueNo: 'SI-2026-0064', date: '27 Oct 2026', planCode: 'PP-2026-0147', kitchen: 'City Center Kitchen', items: 10, totalQty: '32 kg', issuedBy: 'Amit Shah', status: 'COMPLETED' },
  { issueNo: 'SI-2026-0063', date: '26 Oct 2026', planCode: 'PP-2026-0146', kitchen: 'Production Kitchen', items: 15, totalQty: '56 kg', issuedBy: 'Suresh Kumar', status: 'COMPLETED' },
  { issueNo: 'SI-2026-0062', date: '26 Oct 2026', planCode: 'PP-2026-0145', kitchen: 'Main Kitchen', items: 8, totalQty: '28 kg', issuedBy: 'Rahul Patel', status: 'PENDING' }
];

export const MOCK_STORE_ISSUE_CONFIRMATION_ITEMS = [
  { id: 1, ingredient: 'Toor Dal', requiredQty: 50, uom: 'kg', availableQty: 60, issueQty: 25, isShortfall: true, batchExpiry: 'B-1123 / 20 Nov 2026', rate: 80, issueValue: 4000, status: 'SHORTFALL',
    batches: [
      { batchNo: 'TD001', expiryDate: '15 May 2026', availableStock: '10 kg', stockAge: '32 days' },
      { batchNo: 'TD002', expiryDate: '20 Jun 2026', availableStock: '10 kg', stockAge: '56 days' }
    ]
  },
  { id: 2, ingredient: 'Tomato', requiredQty: 30, uom: 'kg', availableQty: 28, issueQty: 28, isShortfall: false, batchExpiry: 'B-2210 / 18 Nov 2026', rate: 45, issueValue: 1260, status: 'READY' },
  { id: 3, ingredient: 'Onion', requiredQty: 40, uom: 'kg', availableQty: 35, issueQty: 35, isShortfall: false, batchExpiry: 'B-3345 / 25 Nov 2026', rate: 35, issueValue: 1225, status: 'READY' },
  { id: 4, ingredient: 'Cooking Oil', requiredQty: 20, uom: 'L', availableQty: 20, issueQty: 20, isShortfall: false, batchExpiry: 'B-4456 / 15 Dec 2026', rate: 150, issueValue: 3000, status: 'READY' },
  { id: 5, ingredient: 'Paneer', requiredQty: 42, uom: 'kg', availableQty: 25, issueQty: 25, isShortfall: true, batchExpiry: 'B-5567 / 12 Nov 2026', rate: 280, issueValue: 7000, status: 'SHORTFALL' },
  { id: 6, ingredient: 'Potato', requiredQty: 60, uom: 'kg', availableQty: 55, issueQty: 55, isShortfall: false, batchExpiry: 'B-6678 / 22 Nov 2026', rate: 25, issueValue: 1375, status: 'READY' },
  { id: 7, ingredient: 'Basmati Rice', requiredQty: 30, uom: 'kg', availableQty: 30, issueQty: 30, isShortfall: false, batchExpiry: 'B-7789 / 30 Nov 2026', rate: 120, issueValue: 3600, status: 'READY' },
  { id: 8, ingredient: 'Wheat Flour', requiredQty: 52, uom: 'kg', availableQty: 48, issueQty: 48, isShortfall: true, batchExpiry: 'B-8890 / 28 Nov 2026', rate: 40, issueValue: 1920, status: 'SHORTFALL' },
  { id: 9, ingredient: 'Fresh Cream', requiredQty: 10, uom: 'L', availableQty: 8, issueQty: 8, isShortfall: true, batchExpiry: 'B-9901 / 20 Nov 2026', rate: 220, issueValue: 1760, status: 'SHORTFALL' },
  { id: 10, ingredient: 'Spices Mix', requiredQty: 15, uom: 'kg', availableQty: 15, issueQty: 15, isShortfall: false, batchExpiry: 'B-1011 / 18 Dec 2026', rate: 90, issueValue: 1350, status: 'READY' }
];

export const MOCK_EXECUTION_RECIPES = [
  { id: 1, recipe: 'Tomato Basil Shorba', plannedQty: 25.0, actualQty: 25.0, yieldPct: 100, status: 'COMPLETED',
    batchNo: 'BATCH-PP007-01', prepWaste: 1.0, cookingLoss: 2.0, qualityCheck: 'Passed', completionTime: '10:00 AM', remarks: 'Good consistency'
  },
  { id: 2, recipe: 'Veg Spring Roll', plannedQty: 40.0, actualQty: 32.5, yieldPct: 81, status: 'IN_PROGRESS',
    batchNo: 'BATCH-PP007-02', prepWaste: 1.5, cookingLoss: 2.8, qualityCheck: 'Passed', completionTime: '10:30 AM', remarks: 'Crispy skin'
  },
  { id: 3, recipe: 'Shahi Paneer', plannedQty: 52.5, actualQty: 48.0, yieldPct: 91, status: 'IN_PROGRESS',
    batchNo: 'BATCH-PP007-03', prepWaste: 1.2, cookingLoss: 3.3, qualityCheck: 'Passed', completionTime: '11:05 AM', remarks: 'Rich gravy aroma'
  },
  { id: 4, recipe: 'Aloo Gobi Matar', plannedQty: 45.0, actualQty: 41.0, yieldPct: 91, status: 'IN_PROGRESS',
    batchNo: 'BATCH-PP007-04', prepWaste: 1.8, cookingLoss: 2.2, qualityCheck: 'Passed', completionTime: '11:15 AM', remarks: ''
  },
  { id: 5, recipe: 'Dal Tadka', plannedQty: 60.0, actualQty: 55.0, yieldPct: 92, status: 'COMPLETED',
    batchNo: 'BATCH-PP007-05', prepWaste: 0.8, cookingLoss: 4.2, qualityCheck: 'Passed', completionTime: '11:30 AM', remarks: 'Smoky flavor'
  },
  { id: 6, recipe: 'Jeera Rice', plannedQty: 50.0, actualQty: 50.0, yieldPct: 100, status: 'COMPLETED',
    batchNo: 'BATCH-PP007-06', prepWaste: 0.5, cookingLoss: 0.0, qualityCheck: 'Passed', completionTime: '11:45 AM', remarks: 'Fluffy texture'
  },
  { id: 7, recipe: 'Butter Roti', plannedQty: 75.0, actualQty: 60.0, yieldPct: 80, status: 'NOT_STARTED',
    batchNo: 'BATCH-PP007-07', prepWaste: 2.0, cookingLoss: 13.0, qualityCheck: 'Passed', completionTime: '12:00 PM', remarks: ''
  },
  { id: 8, recipe: 'Gulab Jamun', plannedQty: 25.0, actualQty: 20.0, yieldPct: 80, status: 'NOT_STARTED',
    batchNo: 'BATCH-PP007-08', prepWaste: 0.6, cookingLoss: 4.4, qualityCheck: 'Passed', completionTime: '12:15 PM', remarks: ''
  }
];

export const MOCK_PREP_WASTE_ENTRIES = [
  { id: 1, ingredient: 'Potato', wasteType: 'Peeling', totalQty: 3.2, wasteQty: 0.4, usableQty: 2.8 },
  { id: 2, ingredient: 'Onion', wasteType: 'Trimming', totalQty: 1.1, wasteQty: 0.2, usableQty: 0.9 },
  { id: 3, ingredient: 'Tomato', wasteType: 'Spoiled', totalQty: 0.8, wasteQty: 0.1, usableQty: 0.7 },
  { id: 4, ingredient: 'Paneer', wasteType: 'Trimming', totalQty: 1.2, wasteQty: 0.2, usableQty: 1.0 },
  { id: 5, ingredient: 'Fresh Coriander', wasteType: 'Cleaning', totalQty: 0.6, wasteQty: 0.1, usableQty: 0.5 },
  { id: 6, ingredient: 'Mixed Vegetables', wasteType: 'Trimming', totalQty: 1.5, wasteQty: 0.3, usableQty: 1.2 }
];

export const MOCK_FOOD_TRANSFERS_REGISTER = [
  { transferNo: 'TF-2026-0148', date: '27 Oct 2026', planCode: 'PP-2026-0148', fromKitchen: 'Central Kitchen', toOutlet: 'Main Outlet', itemCount: 8, qty: '48 kg', status: 'COMPLETED' },
  { transferNo: 'TF-2026-0147', date: '27 Oct 2026', planCode: 'PP-2026-0147', fromKitchen: 'City Center Kitchen', toOutlet: 'Restaurant Outlet', itemCount: 12, qty: '32 kg', status: 'COMPLETED' },
  { transferNo: 'TF-2026-0146', date: '26 Oct 2026', planCode: 'PP-2026-0146', fromKitchen: 'Production Kitchen', toOutlet: 'Banquet Hall', itemCount: 10, qty: '56 kg', status: 'COMPLETED' },
  { transferNo: 'TF-2026-0145', date: '26 Oct 2026', planCode: 'PP-2026-0145', fromKitchen: 'Main Kitchen', toOutlet: 'Cafeteria', itemCount: 6, qty: '28 kg', status: 'PENDING' }
];

export const MOCK_DISPATCH_ITEMS = [
  { id: 1, item: 'Tomato Basil Shorba', batchNo: 'BATCH-PP007-01', transferQty: '8.5 kg', containerCount: 5, temp: '65°C', status: 'Ready' },
  { id: 2, item: 'Veg Spring Roll', batchNo: 'BATCH-PP007-02', transferQty: '6.0 kg', containerCount: 4, temp: '68°C', status: 'Ready' },
  { id: 3, item: 'Shahi Paneer', batchNo: 'BATCH-PP007-03', transferQty: '5.5 kg', containerCount: 4, temp: '70°C', status: 'Ready' },
  { id: 4, item: 'Aloo Gobi Matar', batchNo: 'BATCH-PP007-04', transferQty: '10.0 kg', containerCount: 6, temp: '72°C', status: 'Ready' },
  { id: 5, item: 'Dal Tadka', batchNo: 'BATCH-PP007-05', transferQty: '8.0 kg', containerCount: 5, temp: '70°C', status: 'Ready' },
  { id: 6, item: 'Jeera Rice', batchNo: 'BATCH-PP007-06', transferQty: '7.5 kg', containerCount: 5, temp: '68°C', status: 'Ready' },
  { id: 7, item: 'Butter Roti', batchNo: 'BATCH-PP007-07', transferQty: '12.0 kg', containerCount: 7, temp: '65°C', status: 'Ready' },
  { id: 8, item: 'Gulab Jamun', batchNo: 'BATCH-PP007-08', transferQty: '6.0 kg', containerCount: 4, temp: '62°C', status: 'Ready' }
];

export const MOCK_PLATE_WASTE_REGISTER = [
  { wasteNo: 'PW-2026-0018', date: '21 Oct 2026', planCode: 'PP-2026-0148', mealType: 'Lunch', quantity: '5 items', recordedBy: 'Rahul Patel' },
  { wasteNo: 'PW-2026-0017', date: '20 Oct 2026', planCode: 'PP-2026-0147', mealType: 'Dinner', quantity: '12 items', recordedBy: 'Amit Shah' },
  { wasteNo: 'PW-2026-0016', date: '18 Oct 2026', planCode: 'PP-2026-0146', mealType: 'Lunch', quantity: '8 items', recordedBy: 'Suresh Kumar' },
  { wasteNo: 'PW-2026-0015', date: '17 Oct 2026', planCode: 'PP-2026-0145', mealType: 'Breakfast', quantity: '15 items', recordedBy: 'Rahul Patel' }
];
