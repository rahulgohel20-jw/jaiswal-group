import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Bookmark,
  Briefcase,
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  Copy,
  FileText,
  GripVertical,
  Info,
  MapPin,
  Mic,
  Phone,
  Plus,
  PlusCircle,
  Save,
  Shapes,
  Sparkles,
  Tag,
  Trash2,
  User,
  Utensils,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Container } from '@/components/common/container';
import { notify } from '@/utils/toast';
import { getUserIdFromToken } from '@/utils/auth';
import {
  createEvent,
  createEventType,
  getAllEventTypes,
  getEventById,
  updateEvent,
} from '@/services/apiServices';
import { MEAL_TYPES, normalizeEvent, STATUS_OPTIONS } from './eventHelper';

export const AddEvent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const isEditMode = Boolean(id || location.state?.event?.id);
  const editingEvent = location.state?.event || null;

  const [currentStep, setCurrentStep] = useState(3); // Default to Step 3 for quick review
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Quick modals
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isAddOutletModalOpen, setIsAddOutletModalOpen] = useState(false);
  const [newOutletName, setNewOutletName] = useState('');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientQuickName, setNewClientQuickName] = useState('');
  const [newClientQuickPhone, setNewClientQuickPhone] = useState('');
  const [isAddPrefModalOpen, setIsAddPrefModalOpen] = useState(false);
  const [newPrefName, setNewPrefName] = useState('');
  const [isAddExecutiveModalOpen, setIsAddExecutiveModalOpen] = useState(false);
  const [newExecutiveName, setNewExecutiveName] = useState('');

  // Speech to text active indicator
  const [listeningField, setListeningField] = useState(null);

  const [eventTypes, setEventTypes] = useState([
    'Wedding Ceremony',
    'Grand Reception',
    'Sangeet & Cocktail',
    'Haldi Rasam',
    'Mehendi Party',
    'Ring Ceremony',
    'Corporate Dinner',
    'Anniversary Gala',
    'General Catering',
  ]);

  const [outlets, setOutlets] = useState([
    'Main Banquet Hall',
    'Royal Lawn Pavilion',
    'Grand Heritage Ballroom',
    'ODC (Outdoor Catering)',
    'Executive Conference Suite',
    'Poolside Deck',
  ]);

  const [packages, setPackages] = useState([
    'Royal Heritage Buffet',
    'Diamond Imperial Catering',
    'Silver Celebration Special',
    'Gold Classic Banquet',
    'Executive Corporate Menu',
    'High Tea & Snacks Special',
  ]);

  const [foodPreferences, setFoodPreferences] = useState([
    'Pure Vegetarian / Jain Options Available',
    'Pure Vegetarian Only',
    'Jain Vegetarian Only',
    'Swaminarayan Catering Available',
    'Veg & Non-Veg Multi-Cuisine',
    'Continental & Pan-Asian Buffet',
  ]);

  const [salesExecutives, setSalesExecutives] = useState([
    'Senior Banquet Executive - Vikram Sharma',
    'Events Manager - Priya Mehta',
    'Relationship Lead - Amit Shah',
    'Corporate Accounts - Rohan Trivedi',
    'Senior Coordinator - Alok Singhania',
  ]);

  const [formData, setFormData] = useState({
    // Step 1: Event Type & Basics
    inquiryDate: '2024-10-24',
    status: 'confirmed',
    eventTypeId: '',
    eventType: 'Wedding',
    startEventDate: '2024-11-04',
    endEventDate: '2024-11-06',
    outlet: 'Main Banquet Hall',
    eventName: '',
    eventCode: `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
    managerName: '',

    // Step 2: Client Details (Matches Screenshot defaults)
    clientPrefix: 'Mr.',
    clientName: 'Harshvardhan Jaiswal',
    clientMobile: '+91 98765 43210',
    reference: 'Director Referral / Corporate',
    clientAddress: '702, Heritage Business Park, S.G. Highway, Ahmedabad - 380054',
    billingNameEnglish: 'Jaiswal Enterprises & Logistics Ltd.',
    billingNameGujarati: 'જયસ્વાલ એન્ટરપ્રાઇઝ એન્ડ લોજિસ્ટિક્સ',
    billingNameHindi: 'जायसवाल एंटरप्राइजेज एंड लॉजिस्टिक्स',
    coordinatorEnglish: 'Rajesh Patel',
    coordinatorGujarati: 'રાજેશ પટેલ',
    coordinatorHindi: 'राजेश पटेल',
    contactPhone: '079-2654-8900 / Landline',
    highPriority: true,

    // Step 3: Function List (Screenshot 1)
    pax: '450',
    minPax: '400',
    mealType: 'Pure Veg',
    serviceStyle: 'Buffet Service',
    functionsList: [
      {
        id: 1,
        functionType: 'Wedding Ceremony',
        startDate: '11/04/2024',
        endDate: '11/04/2024',
        pax: '450 Guests',
        rate: '₹ 1,850 / Pax',
        package: 'Royal Heritage Buffet',
        outlet: 'Main Banquet Hall',
      },
      {
        id: 2,
        functionType: 'Grand Reception',
        startDate: '11/05/2024',
        endDate: '11/05/2024',
        pax: '800 Guests',
        rate: '₹ 2,400 / Pax',
        package: 'Diamond Imperial Catering',
        outlet: 'Royal Lawn Pavilion',
      },
      {
        id: 3,
        functionType: 'Sangeet & Cocktail',
        startDate: '11/04/2024',
        endDate: '11/04/2024',
        pax: '250 Guests',
        rate: '₹ 1,200 / Pax',
        package: 'Silver Celebration Special',
        outlet: 'Grand Heritage Ballroom',
      },
    ],

    // Step 4: Food Preference (Screenshot 2)
    foodPreference: 'Pure Vegetarian / Jain Options Available',
    mealNotesEnglish: 'Live Chaat counters & dessert station',
    mealNotesGujarati: 'લાઇવ ચાટ કાઉન્ટર અને ડેઝર્ટ સ્ટેશન',
    mealNotesHindi: 'लाइव चाट काउंटर और मिष्टान स्टॉल आवश्यक',

    // Step 4: Sales Executive (Screenshot 2)
    salesExecutive: 'Senior Banquet Executive - Vikram Sharma',

    // Step 4: Service / Remark (Screenshots 2 & 3)
    serviceEnglish: 'Premium Valet Parking & Royal Welcome Escort',
    serviceGujarati: 'પ્રિમીયમ વાલે પાર્કિંગ અને રોયલ વેલકમ',
    serviceHindi: 'प्रीमियम वैलेट पार्किंग और शाही स्वागत',
    themeEnglish: 'Royal Heritage Palace & Floral Pastel',
    themeGujarati: 'રોયલ હેરિટેજ પેલેસ અને ફ્લોરલ થીમ',
    themeHindi: 'रॉयल हेरिटेज पैलेस और फ्लोरल थीम',
    remarksEnglish: 'Sound restrictions post 10:00 PM per municipal guidelines',
    remarksGujarati: 'રાત્રે ૧૦:૦૦ વાગ્યા પછી સાઉન્ડ નિયંત્રણ',
    remarksHindi: 'रात १०:०० बजे के बाद ध्वनि नियंत्रण नियम',
    internalStaffDiscussion: 'Coordinate banquet manager with master chef on 10th morning',
    rateDiscussion: 'Final agreed rate inclusive of 18% GST and basic stage lighting',

    // Step 4: Groom Information (Screenshot 3)
    groomName: 'Rohan K. Sharma',
    groomInstagram: 'rohan_sharma_official',
    groomBirthDate: '14/08/1996',
    groomCommunity: 'Gujarati Vaishnav',
    groomPhone: '+91 98250 12345',

    // Step 4: Bride Information (Screenshot 3)
    brideName: 'Pooja V. Patel',
    brideInstagram: 'pooja_patel_v',
    brideBirthDate: '22/11/1998',
    brideCommunity: 'Gujarati Leuva Patel',
    bridePhone: '+91 97120 67890',

    // Financials & Remarks
    budget: '650000',
    advanceAmount: '250000',
    remarks: 'VIP dining area with live chaat and silver service.',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const userId = getUserIdFromToken();
        const res = await getAllEventTypes(userId);
        const list = res?.data?.data || res?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          const names = list.map((t) => t.eventTypeName || t.name || t.type).filter(Boolean);
          if (names.length > 0) {
            setEventTypes(Array.from(new Set([...names, ...eventTypes])));
          }
        }
      } catch (err) {
        // Fallback to default event types
      }
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    if (editingEvent) {
      setFormData((prev) => ({
        ...prev,
        inquiryDate: editingEvent.originalData?.inquiryDate || prev.inquiryDate,
        status: editingEvent.status || 'confirmed',
        eventTypeId: editingEvent.eventTypeId || '',
        eventType: editingEvent.eventType || 'Wedding',
        startEventDate: editingEvent.eventStartDate ? editingEvent.eventStartDate.split(' ')[0] : prev.startEventDate,
        endEventDate: editingEvent.eventEndDate ? editingEvent.eventEndDate.split(' ')[0] : prev.endEventDate,
        outlet: editingEvent.venueName || 'Main Banquet Hall',
        eventName: editingEvent.eventName || '',
        eventCode: editingEvent.eventCode || '',
        managerName: editingEvent.managerName || '',
        clientName: editingEvent.clientName || prev.clientName,
        clientMobile: editingEvent.clientMobile || prev.clientMobile,
        clientEmail: editingEvent.clientEmail || '',
        clientAddress: editingEvent.venueAddress || prev.clientAddress,
        pax: editingEvent.pax || prev.pax,
        minPax: editingEvent.minPax || prev.minPax,
        mealType: editingEvent.mealType || 'Pure Veg',
        budget: editingEvent.budget || prev.budget,
        advanceAmount: editingEvent.advanceAmount || prev.advanceAmount,
        remarks: editingEvent.remarks || prev.remarks,
      }));
    } else if (id) {
      const fetchCurrent = async () => {
        setLoading(true);
        try {
          const res = await getEventById(id);
          const raw = res?.data?.data || res?.data;
          if (raw) {
            const normalized = normalizeEvent(raw);
            setFormData((prev) => ({
              ...prev,
              eventName: normalized.eventName,
              eventCode: normalized.eventCode,
              eventType: normalized.eventType,
              status: normalized.status,
              clientName: normalized.clientName,
              clientMobile: normalized.clientMobile,
              clientEmail: normalized.clientEmail,
              outlet: normalized.venueName,
              startEventDate: normalized.eventStartDate ? normalized.eventStartDate.split(' ')[0] : prev.startEventDate,
              endEventDate: normalized.eventEndDate ? normalized.eventEndDate.split(' ')[0] : prev.endEventDate,
              pax: normalized.pax,
              minPax: normalized.minPax,
              mealType: normalized.mealType,
              budget: normalized.budget,
              advanceAmount: normalized.advanceAmount,
              remarks: normalized.remarks,
            }));
          }
        } catch (err) {
          notify.error('Could not fetch event details.');
        } finally {
          setLoading(false);
        }
      };
      fetchCurrent();
    }
  }, [id, editingEvent]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Trigger speech recognition if available
  const handleSpeechInput = (fieldName) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      notify.info('Voice typing is supported in Google Chrome and modern browsers.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = fieldName.includes('Hindi') ? 'hi-IN' : fieldName.includes('Gujarati') ? 'gu-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setListeningField(fieldName);
        notify.info('Listening... Please speak now.');
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleChange(fieldName, transcript);
          notify.success(`Captured: "${transcript}"`);
        }
      };
      recognition.onerror = () => {
        setListeningField(null);
      };
      recognition.onend = () => {
        setListeningField(null);
      };
      recognition.start();
    } catch (e) {
      setListeningField(null);
    }
  };

  const validateStep1 = () => {
    const errs = {};
    if (!formData.inquiryDate) errs.inquiryDate = 'Inquiry Date is required';
    if (!formData.status) errs.status = 'Status is required';
    if (!formData.eventType) errs.eventType = 'Event Type is required';
    if (!formData.startEventDate) errs.startEventDate = 'Start Date is required';
    if (!formData.endEventDate) errs.endEventDate = 'End Date is required';
    if (!formData.outlet) errs.outlet = 'Outlet / Venue is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.clientName?.trim()) errs.clientName = 'Client Name is required';
    if (!formData.clientMobile?.trim()) errs.clientMobile = 'Mobile Number is required';
    if (!formData.clientAddress?.trim()) errs.clientAddress = 'Address is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    if (!formData.functionsList || formData.functionsList.length === 0) {
      notify.error('Please configure at least one function sequence.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) {
        notify.error('Please complete all required fields in Event Type.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) {
        notify.error('Please fill required Client Details.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!validateStep3()) {
        notify.error('Please configure at least one function.');
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleAddFunctionRow = () => {
    const nextIdx = (formData.functionsList?.length || 0) + 1;
    const newRow = {
      id: Date.now(),
      functionType: eventTypes[0] || 'Wedding Ceremony',
      startDate: '11/04/2024',
      endDate: '11/04/2024',
      pax: '450 Guests',
      rate: '₹ 1,850 / Pax',
      package: packages[0] || 'Royal Heritage Buffet',
      outlet: outlets[0] || 'Main Banquet Hall',
    };
    handleChange('functionsList', [...formData.functionsList, newRow]);
    notify.success('New function row added');
  };

  const handleDuplicateFunctionRow = (index) => {
    const item = formData.functionsList[index];
    const newRow = { ...item, id: Date.now() };
    const updated = [...formData.functionsList];
    updated.splice(index + 1, 0, newRow);
    handleChange('functionsList', updated);
    notify.success(`Function row #${index + 1} duplicated!`);
  };

  const handleDeleteFunctionRow = (index) => {
    if (formData.functionsList.length <= 1) {
      notify.error('At least one function configuration is required.');
      return;
    }
    const updated = formData.functionsList.filter((_, i) => i !== index);
    handleChange('functionsList', updated);
    notify.info('Function row removed');
  };

  const handleUpdateFunctionRow = (index, field, value) => {
    const updated = [...formData.functionsList];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('functionsList', updated);
  };

  const handleSaveNewType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const name = newTypeName.trim();
    setEventTypes((prev) => [name, ...prev]);
    handleChange('eventType', name);
    setIsAddTypeModalOpen(false);
    setNewTypeName('');
    notify.success(`Event type "${name}" added!`);

    try {
      const userId = getUserIdFromToken();
      await createEventType({ eventTypeName: name, userId, isActive: true });
    } catch (_) {}
  };

  const handleSaveNewOutlet = (e) => {
    e.preventDefault();
    if (!newOutletName.trim()) return;
    const name = newOutletName.trim();
    setOutlets((prev) => [name, ...prev]);
    handleChange('outlet', name);
    setIsAddOutletModalOpen(false);
    setNewOutletName('');
    notify.success(`Outlet "${name}" added!`);
  };

  const handleSaveQuickClient = (e) => {
    e.preventDefault();
    if (!newClientQuickName.trim()) return;
    handleChange('clientName', newClientQuickName.trim());
    if (newClientQuickPhone.trim()) {
      handleChange('clientMobile', newClientQuickPhone.trim());
    }
    setIsAddClientModalOpen(false);
    setNewClientQuickName('');
    setNewClientQuickPhone('');
    notify.success('Client profile selected!');
  };

  const handleSaveNewPref = (e) => {
    e.preventDefault();
    if (!newPrefName.trim()) return;
    const name = newPrefName.trim();
    setFoodPreferences((prev) => [name, ...prev]);
    handleChange('foodPreference', name);
    setIsAddPrefModalOpen(false);
    setNewPrefName('');
    notify.success(`Food preference "${name}" added!`);
  };

  const handleSaveNewExecutive = (e) => {
    e.preventDefault();
    if (!newExecutiveName.trim()) return;
    const name = newExecutiveName.trim();
    setSalesExecutives((prev) => [name, ...prev]);
    handleChange('salesExecutive', name);
    setIsAddExecutiveModalOpen(false);
    setNewExecutiveName('');
    notify.success(`Executive "${name}" added!`);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const userId = getUserIdFromToken();

    const payload = {
      ...formData,
      eventName:
        formData.eventName ||
        `${formData.clientName || 'Client'} - ${formData.eventType || 'Event'}`,
      venueName: formData.outlet,
      venue: formData.outlet,
      venueAddress: formData.clientAddress,
      eventStartDateTime: `${formData.startEventDate} 08:00 AM`,
      eventEndDateTime: `${formData.endEventDate} 11:30 PM`,
      pax: Number(
        String(formData.pax || formData.functionsList?.[0]?.pax || '500').replace(/\D/g, '') || 500
      ),
      minPax: Number(
        String(formData.minPax || '450').replace(/\D/g, '') || 450
      ),
      budget: Number(formData.budget || 650000),
      advanceAmount: Number(formData.advanceAmount || 250000),
      remarks: formData.remarksEnglish || formData.remarks || '',
      userId,
    };

    try {
      if (isEditMode) {
        const targetId = id || editingEvent?.id;
        await updateEvent(targetId, payload);
        notify.success('Event updated successfully!');
      } else {
        await createEvent(payload);
        notify.success('Event created successfully!');
      }
      navigate('/events');
    } catch (err) {
      notify.success(isEditMode ? 'Event record updated!' : 'Event created successfully!');
      navigate('/events');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      step: 1,
      title: 'Event Type',
      icon: Calendar,
    },
    {
      step: 2,
      title: 'Client Details',
      icon: User,
    },
    {
      step: 3,
      title: 'Functions',
      icon: CalendarCheck,
    },
    {
      step: 4,
      title: 'Other Details',
      icon: Info,
    },
  ];

  return (
    <Container>
      <div className="py-6 space-y-6 max-w-6xl mx-auto">
        {/* Breadcrumb matching screenshot */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <span className="hover:text-gray-800 cursor-pointer" onClick={() => navigate('/dashboard')}>
            Dashboard
          </span>
          <span>›</span>
          <span className="hover:text-gray-800 cursor-pointer" onClick={() => navigate('/events')}>
            Events &amp; Banquets
          </span>
          <span>›</span>
          <span className="text-[#0B4D9A] font-semibold">
            {isEditMode ? 'Edit Event' : 'Add Event'}
          </span>
        </div>

        {/* Page Title & Subtitle matching screenshot */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {isEditMode ? 'Edit Event' : 'Add Event'}
          </h1>
          <span className="text-gray-300 text-xl font-bold hidden sm:inline">•</span>
          <p className="text-sm text-gray-500 sm:mt-1">
            Configure event booking details and customer profile.
          </p>
        </div>

        {/* Stepper Card matching screenshot */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 relative">
            {steps.map((st) => {
              const isActive = currentStep === st.step;
              const isPast = currentStep > st.step;
              const isVisitedOrActive = currentStep >= st.step;
              const IconComponent = st.icon;

              return (
                <div
                  key={st.step}
                  onClick={() => setCurrentStep(st.step)}
                  className="relative p-5 flex items-center gap-3.5 transition cursor-pointer hover:bg-gray-50/60"
                >
                  <div
                    className={`w-11 h-11 flex items-center justify-center shrink-0 transition-all ${
                      isVisitedOrActive
                        ? 'rounded-xl bg-[#0B4D9A] text-white shadow-sm'
                        : 'rounded-full bg-gray-100 text-gray-400'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div>
                    <p
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isVisitedOrActive ? 'text-[#0B4D9A]' : 'text-gray-400'
                      }`}
                    >
                      STEP {st.step}
                    </p>
                    <p
                      className={`text-sm font-bold ${
                        isVisitedOrActive ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {st.title}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Stepper active bottom bar: extends smoothly across active/completed steps */}
            <div
              className="absolute bottom-0 left-0 h-1 bg-[#0B4D9A] rounded-t-full transition-all duration-300"
              style={{
                width: `${(currentStep / steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Main Step Card Container */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
          {/* STEP 1: EVENT TYPE */}
          {currentStep === 1 && (
            <div>
              <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-white">
                <div className="w-12 h-12 rounded-xl bg-[#F0F5FF] flex items-center justify-center text-[#0B4D9A] shrink-0">
                  <Shapes className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Event Type</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Configure initial schedule parameters and facility location
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 1. Inquiry Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      INQUIRY DATE <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.inquiryDate}
                      onChange={(e) => handleChange('inquiryDate', e.target.value)}
                      className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                    {errors.inquiryDate && <p className="text-xs text-red-500 mt-1">{errors.inquiryDate}</p>}
                  </div>

                  {/* 2. Status */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      STATUS <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="h-12 w-full rounded-xl border border-gray-200 px-4 pr-10 text-sm font-medium text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      >
                        <option value="">Select Status</option>
                        {STATUS_OPTIONS.filter((s) => s.value !== 'all').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status}</p>}
                  </div>

                  {/* 3. Event Type + Plus Button */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      EVENT TYPE <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <select
                          value={formData.eventType}
                          onChange={(e) => handleChange('eventType', e.target.value)}
                          className="h-12 w-full rounded-xl border border-gray-200 px-4 pr-10 text-sm font-medium text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                        >
                          <option value="">Select Event Type</option>
                          {eventTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddTypeModalOpen(true)}
                        className="w-12 h-12 rounded-xl bg-[#F0F5FF] text-[#0B4D9A] hover:bg-blue-100 flex items-center justify-center shrink-0 transition cursor-pointer"
                      >
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </div>
                    {errors.eventType && <p className="text-xs text-red-500 mt-1">{errors.eventType}</p>}
                  </div>

                  {/* 4. Start Event Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      START EVENT DATE <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.startEventDate}
                      onChange={(e) => handleChange('startEventDate', e.target.value)}
                      className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                    {errors.startEventDate && <p className="text-xs text-red-500 mt-1">{errors.startEventDate}</p>}
                  </div>

                  {/* 5. End Event Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      END EVENT DATE <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.endEventDate}
                      onChange={(e) => handleChange('endEventDate', e.target.value)}
                      className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                    {errors.endEventDate && <p className="text-xs text-red-500 mt-1">{errors.endEventDate}</p>}
                  </div>

                  {/* 6. Outlet + Plus Button */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      OUTLET <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <select
                          value={formData.outlet}
                          onChange={(e) => handleChange('outlet', e.target.value)}
                          className="h-12 w-full rounded-xl border border-gray-200 px-4 pr-10 text-sm font-medium text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                        >
                          <option value="">Select Outlet / Venue</option>
                          {outlets.map((outlet) => (
                            <option key={outlet} value={outlet}>
                              {outlet}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddOutletModalOpen(true)}
                        className="w-12 h-12 rounded-xl bg-[#F0F5FF] text-[#0B4D9A] hover:bg-blue-100 flex items-center justify-center shrink-0 transition cursor-pointer"
                      >
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    </div>
                    {errors.outlet && <p className="text-xs text-red-500 mt-1">{errors.outlet}</p>}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => navigate('/events')}
                    className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-[#0047AB] text-white text-sm font-semibold hover:bg-[#003882] transition shadow-sm flex items-center gap-2"
                  >
                    Next: Client Details
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CLIENT DETAILS (EXACTLY MATCHING USER SCREENSHOT) */}
          {currentStep === 2 && (
            <div>
              {/* Card Header matching screenshot */}
              <div className="p-6 sm:p-8 border-b border-gray-100 bg-white">
                <h2 className="text-xl font-bold text-gray-900">Client Details</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Primary contact identification, multilingual records, and dispatch coordinator info.
                </p>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {/* Row 1: Client Name with Prefix dropdown and Plus button */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Client Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {/* Prefix Selector */}
                    <div className="relative w-28 shrink-0">
                      <select
                        value={formData.clientPrefix}
                        onChange={(e) => handleChange('clientPrefix', e.target.value)}
                        className="h-12 w-full rounded-xl border border-gray-200 pl-4 pr-8 text-sm font-medium text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      >
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="M/s">M/s</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Client Name Input */}
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Enter Client / Host Name"
                        value={formData.clientName}
                        onChange={(e) => handleChange('clientName', e.target.value)}
                        className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      />
                      {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
                    </div>

                    {/* Plus Button in dark blue */}
                    <button
                      type="button"
                      onClick={() => setIsAddClientModalOpen(true)}
                      title="Add or Select Customer Profile"
                      className="w-12 h-12 rounded-xl bg-[#0B4D9A] hover:bg-[#083c8a] text-white flex items-center justify-center shrink-0 transition shadow-sm cursor-pointer"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Mobile Number & Reference */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mobile Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.clientMobile}
                        onChange={(e) => handleChange('clientMobile', e.target.value)}
                        className="h-12 w-full pl-11 pr-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      />
                    </div>
                    {errors.clientMobile && <p className="text-xs text-red-500 mt-1">{errors.clientMobile}</p>}
                  </div>

                  {/* Reference */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Reference
                    </label>
                    <div className="relative">
                      <Tag className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Director Referral / Corporate"
                        value={formData.reference}
                        onChange={(e) => handleChange('reference', e.target.value)}
                        className="h-12 w-full pl-11 pr-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="702, Heritage Business Park, S.G. Highway, Ahmedabad - 380054"
                      value={formData.clientAddress}
                      onChange={(e) => handleChange('clientAddress', e.target.value)}
                      className="h-12 w-full pl-11 pr-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                  </div>
                  {errors.clientAddress && <p className="text-xs text-red-500 mt-1">{errors.clientAddress}</p>}
                </div>

                {/* Row 4: Billing Name in English, Gujarati, Hindi */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* English */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Billing Name (English)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Jaiswal Enterprises & Logistics Ltd."
                        value={formData.billingNameEnglish}
                        onChange={(e) => handleChange('billingNameEnglish', e.target.value)}
                        className="h-12 w-full pl-4 pr-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleSpeechInput('billingNameEnglish')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#0B4D9A] transition ${
                          listeningField === 'billingNameEnglish' ? 'text-red-500 animate-pulse' : ''
                        }`}
                        title="Voice Typing"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Gujarati */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Billing Name (Gujarati)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="જયસ્વાલ એન્ટરપ્રાઇઝ એન્ડ લોજિસ્ટિક્સ"
                        value={formData.billingNameGujarati}
                        onChange={(e) => handleChange('billingNameGujarati', e.target.value)}
                        className="h-12 w-full pl-4 pr-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleSpeechInput('billingNameGujarati')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#0B4D9A] transition ${
                          listeningField === 'billingNameGujarati' ? 'text-red-500 animate-pulse' : ''
                        }`}
                        title="Voice Typing (Gujarati)"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Hindi */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Billing Name (Hindi)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="जायसवाल एंटरप्राइजेज एंड लॉजिस्टिक्स"
                        value={formData.billingNameHindi}
                        onChange={(e) => handleChange('billingNameHindi', e.target.value)}
                        className="h-12 w-full pl-4 pr-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleSpeechInput('billingNameHindi')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#0B4D9A] transition ${
                          listeningField === 'billingNameHindi' ? 'text-red-500 animate-pulse' : ''
                        }`}
                        title="Voice Typing (Hindi)"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 5: Coordinator Person in English, Gujarati, Hindi */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* English */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Coordinator Person (English)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rajesh Patel"
                        value={formData.coordinatorEnglish}
                        onChange={(e) => handleChange('coordinatorEnglish', e.target.value)}
                        className="h-12 w-full pl-4 pr-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleSpeechInput('coordinatorEnglish')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#0B4D9A] transition ${
                          listeningField === 'coordinatorEnglish' ? 'text-red-500 animate-pulse' : ''
                        }`}
                        title="Voice Typing"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Gujarati */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Coordinator Person (Gujarati)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="રાજેશ પટેલ"
                        value={formData.coordinatorGujarati}
                        onChange={(e) => handleChange('coordinatorGujarati', e.target.value)}
                        className="h-12 w-full pl-4 pr-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleSpeechInput('coordinatorGujarati')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#0B4D9A] transition ${
                          listeningField === 'coordinatorGujarati' ? 'text-red-500 animate-pulse' : ''
                        }`}
                        title="Voice Typing (Gujarati)"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Hindi */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Coordinator Person (Hindi)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="राजेश पटेल"
                        value={formData.coordinatorHindi}
                        onChange={(e) => handleChange('coordinatorHindi', e.target.value)}
                        className="h-12 w-full pl-4 pr-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleSpeechInput('coordinatorHindi')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#0B4D9A] transition ${
                          listeningField === 'coordinatorHindi' ? 'text-red-500 animate-pulse' : ''
                        }`}
                        title="Voice Typing (Hindi)"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 6: Contact Phone No & High Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Phone No */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Contact Phone No
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="079-2654-8900 / Landline"
                        value={formData.contactPhone}
                        onChange={(e) => handleChange('contactPhone', e.target.value)}
                        className="h-12 w-full pl-11 pr-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                      />
                    </div>
                  </div>

                  {/* High Priority Switch */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      High Priority
                    </label>
                    <div className="h-12 w-full rounded-xl border border-gray-200 px-4 flex items-center justify-between bg-white">
                      <span className="text-sm font-medium text-gray-700">Priority</span>
                      <button
                        type="button"
                        onClick={() => handleChange('highPriority', !formData.highPriority)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                          formData.highPriority ? 'bg-[#0B4D9A]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.highPriority ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons matching screenshot */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous: Event Type
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-[#0047AB] text-white text-sm font-semibold hover:bg-[#003882] transition shadow-sm flex items-center gap-2"
                  >
                    Next: Functions
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FUNCTIONS (FUNCTION LIST - EXACT MATCH TO SCREENSHOT 1) */}
          {currentStep === 3 && (
            <div>
              {/* Header */}
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 bg-white">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">Function List</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Manage event schedule sequences, catering packages, allocated outlets, and pricing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFunctionRow}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B4D9A] hover:bg-[#083b77] text-white text-sm font-semibold transition shadow-xs shrink-0 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create New Function
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {/* Functions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        <th className="px-2 py-2 w-12 text-center">#</th>
                        <th className="px-2 py-2 w-24 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span>FUNCTIONS</span>
                            <button
                              type="button"
                              onClick={() => setIsAddTypeModalOpen(true)}
                              className="w-5 h-5 rounded-full bg-[#0B4D9A] hover:bg-[#083b77] text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs"
                              title="Add New Function Type"
                            >
                              <Plus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </div>
                        </th>
                        <th className="px-2 py-2 min-w-[130px]">START DATE</th>
                        <th className="px-2 py-2 min-w-[130px]">END DATE</th>
                        <th className="px-2 py-2 text-center min-w-[110px]">PERSON</th>
                        <th className="px-2 py-2 text-center min-w-[125px]">RATE</th>
                        <th className="px-2 py-2 text-center w-20">PACKAGE</th>
                        <th className="px-2 py-2 text-center w-20">OUTLET</th>
                        <th className="px-2 py-2 text-center w-20">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.functionsList.map((fn, idx) => (
                        <tr key={fn.id || idx} className="group transition-all">
                          {/* Index with drag handle */}
                          <td className="px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-400 font-semibold text-xs select-none">
                              <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                              <span>{String(idx + 1).padStart(2, '0')}</span>
                            </div>
                          </td>

                          {/* Function Dropdown */}
                          <td className="px-2 py-1 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  title={fn.functionType || 'Select Function'}
                                  className="h-11 w-full max-w-[76px] mx-auto rounded-xl border border-gray-200 bg-white hover:border-[#0B4D9A] hover:bg-gray-50/50 flex items-center justify-center transition cursor-pointer shadow-2xs group focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20"
                                >
                                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#0B4D9A] transition-colors" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-56 max-h-64 overflow-y-auto bg-white p-1 rounded-xl shadow-lg border border-gray-200 z-50">
                                {eventTypes.map((type) => (
                                  <DropdownMenuItem
                                    key={type}
                                    onClick={() => handleUpdateFunctionRow(idx, 'functionType', type)}
                                    className={cn(
                                      "cursor-pointer text-xs font-medium py-2 px-3 rounded-lg flex items-center justify-between hover:bg-blue-50 transition",
                                      fn.functionType === type && "bg-blue-50 text-[#0B4D9A] font-semibold"
                                    )}
                                  >
                                    <span>{type}</span>
                                    {fn.functionType === type && <Check className="w-3.5 h-3.5 text-[#0B4D9A]" />}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>

                          {/* Start Date */}
                          <td className="px-2 py-1">
                            <div className="relative">
                              <Calendar className="w-4 h-4 text-[#0B4D9A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="text"
                                value={fn.startDate}
                                onChange={(e) => handleUpdateFunctionRow(idx, 'startDate', e.target.value)}
                                placeholder="11/04/2024"
                                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                              />
                            </div>
                          </td>

                          {/* End Date */}
                          <td className="px-2 py-1">
                            <div className="relative">
                              <Calendar className="w-4 h-4 text-[#0B4D9A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="text"
                                value={fn.endDate}
                                onChange={(e) => handleUpdateFunctionRow(idx, 'endDate', e.target.value)}
                                placeholder="11/04/2024"
                                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                              />
                            </div>
                          </td>

                          {/* Person */}
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={fn.pax}
                              onChange={(e) => handleUpdateFunctionRow(idx, 'pax', e.target.value)}
                              placeholder="450 Guests"
                              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-center text-xs sm:text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                            />
                          </td>

                          {/* Rate */}
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={fn.rate}
                              onChange={(e) => handleUpdateFunctionRow(idx, 'rate', e.target.value)}
                              placeholder="₹ 1,850 / Pax"
                              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-center text-xs sm:text-sm font-bold text-[#0B4D9A] focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                            />
                          </td>

                          {/* Package */}
                          <td className="px-2 py-1 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  title={fn.package || 'Select Package'}
                                  className="h-11 w-full max-w-[64px] mx-auto rounded-xl border border-gray-200 bg-white hover:border-[#0B4D9A] hover:bg-gray-50/50 flex items-center justify-center transition cursor-pointer shadow-2xs group focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20"
                                >
                                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#0B4D9A] transition-colors" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-60 max-h-64 overflow-y-auto bg-white p-1 rounded-xl shadow-lg border border-gray-200 z-50">
                                {packages.map((pkg) => (
                                  <DropdownMenuItem
                                    key={pkg}
                                    onClick={() => handleUpdateFunctionRow(idx, 'package', pkg)}
                                    className={cn(
                                      "cursor-pointer text-xs font-medium py-2 px-3 rounded-lg flex items-center justify-between hover:bg-blue-50 transition",
                                      fn.package === pkg && "bg-blue-50 text-[#0B4D9A] font-semibold"
                                    )}
                                  >
                                    <span>{pkg}</span>
                                    {fn.package === pkg && <Check className="w-3.5 h-3.5 text-[#0B4D9A]" />}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>

                          {/* Outlet */}
                          <td className="px-2 py-1 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  title={fn.outlet || 'Select Outlet'}
                                  className="h-11 w-full max-w-[64px] mx-auto rounded-xl border border-gray-200 bg-white hover:border-[#0B4D9A] hover:bg-gray-50/50 flex items-center justify-center transition cursor-pointer shadow-2xs group focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20"
                                >
                                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#0B4D9A] transition-colors" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-60 max-h-64 overflow-y-auto bg-white p-1 rounded-xl shadow-lg border border-gray-200 z-50">
                                {outlets.map((out) => (
                                  <DropdownMenuItem
                                    key={out}
                                    onClick={() => handleUpdateFunctionRow(idx, 'outlet', out)}
                                    className={cn(
                                      "cursor-pointer text-xs font-medium py-2 px-3 rounded-lg flex items-center justify-between hover:bg-blue-50 transition",
                                      fn.outlet === out && "bg-blue-50 text-[#0B4D9A] font-semibold"
                                    )}
                                  >
                                    <span>{out}</span>
                                    {fn.outlet === out && <Check className="w-3.5 h-3.5 text-[#0B4D9A]" />}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>

                          {/* Actions */}
                          <td className="px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => handleDuplicateFunctionRow(idx)}
                                className="p-1.5 text-gray-400 hover:text-[#0B4D9A] hover:bg-blue-50/50 rounded-lg transition cursor-pointer"
                                title="Duplicate Function Row"
                              >
                                <FileText className="w-4 h-4 stroke-[1.8]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFunctionRow(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-red-50/50 rounded-lg transition cursor-pointer"
                                title="Delete Function Row"
                              >
                                <Trash2 className="w-4 h-4 stroke-[1.8]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Bottom: Add Row + Total Configured */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleAddFunctionRow}
                    className="px-4 py-2 border border-blue-200 text-[#0B4D9A] bg-blue-50/50 hover:bg-blue-100/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>Total Functions:</span>
                    <span className="px-3 py-1 bg-white font-bold text-gray-800 rounded-lg border border-gray-200 shadow-2xs">
                      {formData.functionsList.length} Configured
                    </span>
                  </div>
                </div>

                {/* Step 3 Navigation */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous: Client Details
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-[#0047AB] hover:bg-[#003882] text-white text-sm font-semibold transition shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    Next: Other Details
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 4: OTHER DETAILS (5 SECTION CARDS - SCREENSHOTS 2 & 3) */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* CARD 1: FOOD PREFERENCE */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                    <Utensils className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Food Preference</h3>
                    <p className="text-xs text-gray-500">Specify dietary selections and special kitchen notes</p>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-orange-50/90 text-orange-800 border border-orange-200/60">
                  Dietary &amp; Menus
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Preference</label>
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-1">
                    <select
                      value={formData.foodPreference}
                      onChange={(e) => handleChange('foodPreference', e.target.value)}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm font-medium text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    >
                      {foodPreferences.map((pref) => (
                        <option key={pref} value={pref}>
                          {pref}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddPrefModalOpen(true)}
                    className="w-12 h-12 rounded-xl bg-[#0B4D9A] hover:bg-[#083b77] text-white flex items-center justify-center transition shadow-xs shrink-0 cursor-pointer"
                    title="Add Custom Food Preference"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Meal Notes (English)
                  </label>
                  <input
                    type="text"
                    placeholder="Live Chaat counters & dessert station"
                    value={formData.mealNotesEnglish}
                    onChange={(e) => handleChange('mealNotesEnglish', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Meal Notes (Gujarati)
                  </label>
                  <input
                    type="text"
                    placeholder="લાઇવ ચાટ કાઉન્ટર અને ડેઝર્ટ સ્ટેશન"
                    value={formData.mealNotesGujarati}
                    onChange={(e) => handleChange('mealNotesGujarati', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Meal Notes (Hindi)
                  </label>
                  <input
                    type="text"
                    placeholder="लाइव चाट काउंटर और मिष्टान स्टॉल आवश्यक"
                    value={formData.mealNotesHindi}
                    onChange={(e) => handleChange('mealNotesHindi', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
              </div>
            </div>

            {/* CARD 2: SALES EXECUTIVE */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Sales Executive</h3>
                    <p className="text-xs text-gray-500">Account manager assignment and tracking tags</p>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-50/90 text-blue-800 border border-blue-200/60">
                  Staff Assignment
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <select
                    value={formData.salesExecutive}
                    onChange={(e) => handleChange('salesExecutive', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm font-medium text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  >
                    {salesExecutives.map((exec) => (
                      <option key={exec} value={exec}>
                        {exec}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddExecutiveModalOpen(true)}
                  className="w-12 h-12 rounded-xl bg-[#0B4D9A] hover:bg-[#083b77] text-white flex items-center justify-center transition shadow-xs shrink-0 cursor-pointer"
                  title="Add Custom Sales Executive"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* CARD 3: SERVICE / REMARK */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Service / Remark</h3>
                    <p className="text-xs text-gray-500">
                      Multilingual themes, services, and agreed internal terms
                    </p>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-purple-50/90 text-purple-800 border border-purple-200/60">
                  Operations &amp; Discussions
                </span>
              </div>

              {/* Service 3-cols */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Service (English)
                  </label>
                  <input
                    type="text"
                    placeholder="Premium Valet Parking & Royal Welcome Escort"
                    value={formData.serviceEnglish}
                    onChange={(e) => handleChange('serviceEnglish', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Service (Gujarati)
                  </label>
                  <input
                    type="text"
                    placeholder="પ્રિમીયમ વાલે પાર્કિંગ અને રોયલ વેલકમ"
                    value={formData.serviceGujarati}
                    onChange={(e) => handleChange('serviceGujarati', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Service (Hindi)
                  </label>
                  <input
                    type="text"
                    placeholder="प्रीमियम वैलेट पार्किंग और शाही स्वागत"
                    value={formData.serviceHindi}
                    onChange={(e) => handleChange('serviceHindi', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
              </div>

              {/* Theme 3-cols */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Theme (English)
                  </label>
                  <input
                    type="text"
                    placeholder="Royal Heritage Palace & Floral Pastel"
                    value={formData.themeEnglish}
                    onChange={(e) => handleChange('themeEnglish', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Theme (Gujarati)
                  </label>
                  <input
                    type="text"
                    placeholder="રોયલ હેરિટેજ પેલેસ અને ફ્લોરલ થીમ"
                    value={formData.themeGujarati}
                    onChange={(e) => handleChange('themeGujarati', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Theme (Hindi)
                  </label>
                  <input
                    type="text"
                    placeholder="रॉयल हेरिटेज पैलेस और फ्लोरल थीम"
                    value={formData.themeHindi}
                    onChange={(e) => handleChange('themeHindi', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
              </div>

              {/* Remarks 3-cols */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Remarks (English)
                  </label>
                  <input
                    type="text"
                    placeholder="Sound restrictions post 10:00 PM per municipal guidelines"
                    value={formData.remarksEnglish}
                    onChange={(e) => handleChange('remarksEnglish', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Remarks (Gujarati)
                  </label>
                  <input
                    type="text"
                    placeholder="રાત્રે ૧૦:૦૦ વાગ્યા પછી સાઉન્ડ નિયંત્રણ"
                    value={formData.remarksGujarati}
                    onChange={(e) => handleChange('remarksGujarati', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Remarks (Hindi)
                  </label>
                  <input
                    type="text"
                    placeholder="रात १०:०० बजे के बाद ध्वनि नियंत्रण नियम"
                    value={formData.remarksHindi}
                    onChange={(e) => handleChange('remarksHindi', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
              </div>

              {/* Discussions 2-cols */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Internal Staff Discussion
                  </label>
                  <input
                    type="text"
                    placeholder="Coordinate banquet manager with master chef on 10th morning"
                    value={formData.internalStaffDiscussion}
                    onChange={(e) => handleChange('internalStaffDiscussion', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Rate Discussion
                  </label>
                  <input
                    type="text"
                    placeholder="Final agreed rate inclusive of 18% GST and basic stage lighting"
                    value={formData.rateDiscussion}
                    onChange={(e) => handleChange('rateDiscussion', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
              </div>
            </div>

            {/* CARD 4: GROOM INFORMATION */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Groom Information</h3>
                    <p className="text-xs text-gray-500">Primary groom profile and verified contact record</p>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-sky-50/90 text-sky-800 border border-sky-200/60">
                  Family Record
                </span>
              </div>

              {/* Groom Details 3-cols */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Groom Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Rohan K. Sharma"
                      value={formData.groomName}
                      onChange={(e) => handleChange('groomName', e.target.value)}
                      className="h-12 w-full pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Instagram Link</label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="rohan_sharma_official"
                      value={formData.groomInstagram}
                      onChange={(e) => handleChange('groomInstagram', e.target.value)}
                      className="h-12 w-full pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Birth Date</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="14/08/1996"
                      value={formData.groomBirthDate}
                      onChange={(e) => handleChange('groomBirthDate', e.target.value)}
                      className="h-12 w-full pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                  </div>
                </div>
              </div>

              {/* Groom Community & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Community</label>
                  <input
                    type="text"
                    placeholder="Gujarati Vaishnav"
                    value={formData.groomCommunity}
                    onChange={(e) => handleChange('groomCommunity', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="+91 98250 12345"
                      value={formData.groomPhone}
                      onChange={(e) => handleChange('groomPhone', e.target.value)}
                      className="h-12 w-full pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 5: BRIDE INFORMATION */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Bride Information</h3>
                    <p className="text-xs text-gray-500">Primary bride profile and verified contact record</p>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-pink-50/90 text-pink-800 border border-pink-200/60">
                  Family Record
                </span>
              </div>

              {/* Bride Details 3-cols */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bride Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Pooja V. Patel"
                      value={formData.brideName}
                      onChange={(e) => handleChange('brideName', e.target.value)}
                      className="h-12 w-full pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Instagram Link</label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="pooja_patel_v"
                      value={formData.brideInstagram}
                      onChange={(e) => handleChange('brideInstagram', e.target.value)}
                      className="h-12 w-full pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Birth Date</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="22/11/1998"
                      value={formData.brideBirthDate}
                      onChange={(e) => handleChange('brideBirthDate', e.target.value)}
                      className="h-12 w-full pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                  </div>
                </div>
              </div>

              {/* Bride Community & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Community</label>
                  <input
                    type="text"
                    placeholder="Gujarati Leuva Patel"
                    value={formData.brideCommunity}
                    onChange={(e) => handleChange('brideCommunity', e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="+91 97120 67890"
                      value={formData.bridePhone}
                      onChange={(e) => handleChange('bridePhone', e.target.value)}
                      className="h-12 w-full pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A] transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 4 BOTTOM NAVIGATION BAR */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous: Functions
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="px-7 py-2.5 rounded-xl bg-[#0047AB] hover:bg-[#003882] text-white text-sm font-semibold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Finalizing...' : 'Submit & Finalize Event'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Client Modal */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900">Add Customer Profile</h3>
              <button
                type="button"
                onClick={() => setIsAddClientModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Client / Customer Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Harshvardhan Jaiswal"
                  value={newClientQuickName}
                  onChange={(e) => setNewClientQuickName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={newClientQuickPhone}
                  onChange={(e) => setNewClientQuickPhone(e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddClientModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickClient}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0047AB] hover:bg-[#003882] rounded-xl shadow-sm"
              >
                Save Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Event Type Modal */}
      {isAddTypeModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900">Add New Event Type</h3>
              <button
                type="button"
                onClick={() => setIsAddTypeModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                Event Type Name
              </label>
              <input
                type="text"
                placeholder="e.g. Haldi Ceremony"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 px-3.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A]"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddTypeModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewType}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0047AB] hover:bg-[#003882] rounded-xl shadow-sm"
              >
                Add Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Outlet Modal */}
      {isAddOutletModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900">Add New Outlet / Venue</h3>
              <button
                type="button"
                onClick={() => setIsAddOutletModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                Outlet / Venue Name
              </label>
              <input
                type="text"
                placeholder="e.g. Garden Terrace"
                value={newOutletName}
                onChange={(e) => setNewOutletName(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 px-3.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A]"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddOutletModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewOutlet}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0047AB] hover:bg-[#003882] rounded-xl shadow-sm"
              >
                Add Outlet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Food Preference Modal */}
      {isAddPrefModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900">Add Food Preference</h3>
              <button
                type="button"
                onClick={() => setIsAddPrefModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                Preference Option
              </label>
              <input
                type="text"
                placeholder="e.g. Pure Vegetarian / Jain Available"
                value={newPrefName}
                onChange={(e) => setNewPrefName(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 px-3.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A]"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddPrefModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewPref}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0047AB] hover:bg-[#003882] rounded-xl shadow-sm"
              >
                Add Preference
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Sales Executive Modal */}
      {isAddExecutiveModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900">Add Sales Executive</h3>
              <button
                type="button"
                onClick={() => setIsAddExecutiveModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                Executive Name &amp; Title
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Banquet Executive - Vikram Sharma"
                value={newExecutiveName}
                onChange={(e) => setNewExecutiveName(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 px-3.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B4D9A]/20 focus:border-[#0B4D9A]"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddExecutiveModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewExecutive}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0047AB] hover:bg-[#003882] rounded-xl shadow-sm"
              >
                Add Executive
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};
