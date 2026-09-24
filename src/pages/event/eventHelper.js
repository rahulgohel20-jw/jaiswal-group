export const STATUS_STYLES = {
  confirmed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  inquiry:     'bg-blue-50 text-blue-700 border-blue-200',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  completed:   'bg-purple-50 text-purple-700 border-purple-200',
  cancelled:   'bg-rose-50 text-rose-700 border-rose-200',
  tentative:   'bg-amber-50 text-amber-700 border-amber-200',
  active:      'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const STATUS_DOT = {
  confirmed:   'bg-emerald-500',
  inquiry:     'bg-blue-500',
  'in-progress': 'bg-amber-500',
  completed:   'bg-purple-500',
  cancelled:   'bg-rose-500',
  tentative:   'bg-amber-500',
  active:      'bg-emerald-500',
};

export const STATUS_LABELS = {
  confirmed:   'Confirmed',
  inquiry:     'Inquiry',
  'in-progress': 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
  tentative:   'Tentative',
  active:      'Active',
};

export const STATUS_OPTIONS = [
  { value: 'all',         label: 'All Statuses' },
  { value: 'confirmed',   label: 'Confirmed' },
  { value: 'inquiry',     label: 'Inquiry / Tentative' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
];

export const MEAL_TYPES = [
  { value: 'Pure Veg', label: 'Pure Veg' },
  { value: 'Jain / Swaminarayan', label: 'Jain / Swaminarayan' },
  { value: 'Non-Veg', label: 'Non-Veg' },
  { value: 'Mixed', label: 'Mixed (Veg & Non-Veg)' },
];

export const normalizeEvent = (item, index = 0) => {
  if (!item) return null;

  let statusStr = 'inquiry';
  if (typeof item.status === 'number' || typeof item.statusId === 'number') {
    const sId = item.statusId ?? item.status;
    if (sId === 1 || sId === '1') statusStr = 'confirmed';
    else if (sId === 2 || sId === '2') statusStr = 'completed';
    else if (sId === 3 || sId === '3') statusStr = 'cancelled';
    else if (sId === 4 || sId === '4') statusStr = 'in-progress';
    else statusStr = 'inquiry';
  } else if (item.status) {
    statusStr = String(item.status).toLowerCase();
  }

  return {
    id: item.id || item.eventId || item._id || `evt-${index + 1}`,
    eventCode: item.eventCode || item.event_code || item.code || `EVT-${String(item.id || index + 101).padStart(4, '0')}`,
    eventName: item.eventName || item.event_name || item.title || item.eventType || 'Catering Event',
    eventTypeId: item.eventTypeId || item.event_type_id || '',
    eventType: item.eventType || item.eventTypeName || item.event_type || 'General Catering',
    clientName: item.customer_name || item.customerName || item.clientName || item.partyName || 'Valued Client',
    clientMobile: item.mobileno || item.mobileNumber || item.phone || item.contact || '—',
    clientEmail: item.email || item.customerEmail || '—',
    venueName: item.venue || item.venueName || item.hallName || 'Main Banquet Hall',
    venueAddress: item.venueAddress || item.address || '',
    eventStartDate: item.eventStartDateTime || item.startDate || item.date || item.eventDate || '',
    eventEndDate: item.eventEndDateTime || item.endDate || '',
    pax: Number(item.pax || item.expectedPax || item.totalPax || 0),
    minPax: Number(item.minPax || 0),
    mealType: item.mealType || item.mealTypeName || 'Pure Veg',
    budget: Number(item.budget || item.estimatedAmount || item.totalAmount || 0),
    advanceAmount: Number(item.advanceAmount || item.paidAmount || 0),
    managerName: item.managerName || item.manager || 'Admin',
    status: statusStr,
    remarks: item.remark || item.remarks || item.notes || '',
    originalData: item,
  };
};

export const SAMPLE_EVENTS = [
  {
    id: 1,
    eventCode: 'EVT-0101',
    eventName: 'Sharma Royal Wedding & Reception',
    eventType: 'Wedding',
    eventTypeId: 1,
    clientName: 'Rajesh Sharma',
    clientMobile: '+91 98250 12345',
    clientEmail: 'rajesh.sharma@example.com',
    venueName: 'The Grand Heritage Palace, Ahmedabad',
    venueAddress: 'SG Highway, Bodakdev, Ahmedabad',
    eventStartDate: '2026-10-15 18:00',
    eventEndDate: '2026-10-16 01:00',
    pax: 850,
    minPax: 800,
    mealType: 'Pure Veg',
    budget: 650000,
    advanceAmount: 250000,
    managerName: 'Vikram Mehta',
    status: 'confirmed',
    remarks: 'Special live chaat counters, silver service for VIP zone.',
  },
  {
    id: 2,
    eventCode: 'EVT-0102',
    eventName: 'TechCorp Annual Leadership Gala',
    eventType: 'Corporate',
    eventTypeId: 2,
    clientName: 'Ananya Deshmukh (TechCorp)',
    clientMobile: '+91 99044 56789',
    clientEmail: 'ananya@techcorp.in',
    venueName: 'Fortune Landmark Convention Center',
    venueAddress: 'Ashram Road, Ahmedabad',
    eventStartDate: '2026-10-22 10:00',
    eventEndDate: '2026-10-22 17:00',
    pax: 320,
    minPax: 300,
    mealType: 'Mixed',
    budget: 280000,
    advanceAmount: 150000,
    managerName: 'Kavita Dave',
    status: 'in-progress',
    remarks: 'High tea setup at 11:30 AM and executive buffet at 1:30 PM.',
  },
  {
    id: 3,
    eventCode: 'EVT-0103',
    eventName: 'Patel 25th Silver Jubilee Anniversary',
    eventType: 'Anniversary',
    eventTypeId: 3,
    clientName: 'Kishore Patel',
    clientMobile: '+91 98791 23456',
    clientEmail: 'kishore.patel@gmail.com',
    venueName: 'Gulmohar Greens Resort',
    venueAddress: 'Sanand-Sarkhej Road, Ahmedabad',
    eventStartDate: '2026-11-05 19:30',
    eventEndDate: '2026-11-05 23:30',
    pax: 450,
    minPax: 400,
    mealType: 'Jain / Swaminarayan',
    budget: 390000,
    advanceAmount: 100000,
    managerName: 'Rahul Gohel',
    status: 'confirmed',
    remarks: 'Strict Jain catering rules. Special Gujarati sweet delicacies.',
  },
  {
    id: 4,
    eventCode: 'EVT-0104',
    eventName: 'Aarav 1st Birthday Celebration',
    eventType: 'Birthday Party',
    eventTypeId: 4,
    clientName: 'Pooja Verma',
    clientMobile: '+91 97240 88990',
    clientEmail: 'pooja.verma@outlook.com',
    venueName: 'Club O7 Banquet Lawn',
    venueAddress: 'Shela, Bopal, Ahmedabad',
    eventStartDate: '2026-11-18 17:00',
    eventEndDate: '2026-11-18 21:00',
    pax: 150,
    minPax: 140,
    mealType: 'Pure Veg',
    budget: 125000,
    advanceAmount: 50000,
    managerName: 'Dhruvi Shah',
    status: 'inquiry',
    remarks: 'Kids mocktail bar, customized cartoon theme cupcakes & snacks.',
  },
  {
    id: 5,
    eventCode: 'EVT-0105',
    eventName: 'Apex Pharma Product Launch & Dinner',
    eventType: 'Corporate',
    eventTypeId: 2,
    clientName: 'Dr. Sameer Joshi',
    clientMobile: '+91 94260 11223',
    clientEmail: 's.joshi@apexpharma.com',
    venueName: 'Crowne Plaza Sapphire Ballroom',
    venueAddress: 'SP Ring Road, Ahmedabad',
    eventStartDate: '2026-09-12 18:30',
    eventEndDate: '2026-09-12 22:30',
    pax: 200,
    minPax: 180,
    mealType: 'Mixed',
    budget: 195000,
    advanceAmount: 195000,
    managerName: 'Vikram Mehta',
    status: 'completed',
    remarks: 'Cocktail style snacks followed by plated dinner service.',
  },
];
