import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ChevronDown,
  Map,
  MapPin,
  User,
  X,
  Check,
  Briefcase,
  Landmark,
  Truck,
  FileText,
  RefreshCw,
  UploadCloud,
  Plus,
  ClipboardList,
} from 'lucide-react';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

const selectCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 appearance-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const Select = ({ value, onChange, options, placeholder, disabled }) => (
  <div className="relative">
    <select value={value} onChange={onChange} className={selectCls} disabled={disabled}>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 shrink-0 cursor-pointer border-0 p-0"
    style={{ backgroundColor: checked ? '#084E92' : '#D1D5DB' }}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle, open, onToggle }) => (
  <div
    className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 cursor-pointer select-none"
    onClick={onToggle}
  >
    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1">
      <h2 className="text-sm font-bold text-gray-800 leading-none">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
    >
      <ChevronDown
        className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      />
    </button>
  </div>
);

const SubHeading = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-3.5 h-3.5 text-blue-500" />
    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</h3>
  </div>
);

// Multi-file drag & drop uploader for supporting documents (GST cert, PAN, etc).
const DocumentUpload = ({ files, onAdd, onRemove }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          onAdd(e.dataTransfer.files);
        }}
        className={`w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition ${
          dragActive ? 'border-blue-400 bg-blue-50/60' : 'border-gray-300 bg-[#F7F9FF] hover:border-gray-400'
        }`}
      >
        <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-blue-400">
          <UploadCloud className="w-4 h-4" />
        </div>
        <p className="text-sm text-gray-600 font-medium">Click to upload or drag and drop</p>
        <p className="text-xs text-gray-400">Supported: PDF, DOCX, JPG, PNG (Max 10MB per file)</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => onAdd(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
            >
              <span className="text-gray-700 truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-gray-400 hover:text-red-500 cursor-pointer bg-transparent border-0 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Shared card used for both Billing and Shipping addresses.
const AddressCard = ({ title, icon: Icon, values, onChange, action, disabled }) => (
  <div className="border border-gray-200 rounded-xl p-5 space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#084E92]" />
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      {action}
    </div>

    <div>
      <Label>Attention</Label>
      <input
        value={values.attention}
        onChange={(e) => onChange('attention', e.target.value)}
        placeholder="Contact person name"
        className={inputCls}
        disabled={disabled}
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Country</Label>
        <input
          value={values.country}
          onChange={(e) => onChange('country', e.target.value)}
          placeholder="Country"
          className={inputCls}
          disabled={disabled}
        />
      </div>
      <div>
        <Label>State</Label>
        <input
          value={values.state}
          onChange={(e) => onChange('state', e.target.value)}
          placeholder="State"
          className={inputCls}
          disabled={disabled}
        />
      </div>
    </div>

    <div>
      <Label>Address Line 1</Label>
      <input
        value={values.addressLine1}
        onChange={(e) => onChange('addressLine1', e.target.value)}
        placeholder="Building, Street Name"
        className={inputCls}
        disabled={disabled}
      />
    </div>
    <div>
      <Label>Address Line 2</Label>
      <input
        value={values.addressLine2}
        onChange={(e) => onChange('addressLine2', e.target.value)}
        placeholder="Locality, Landmark"
        className={inputCls}
        disabled={disabled}
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>City</Label>
        <input
          value={values.city}
          onChange={(e) => onChange('city', e.target.value)}
          placeholder="City"
          className={inputCls}
          disabled={disabled}
        />
      </div>
      <div>
        <Label>Pincode</Label>
        <input
          value={values.pincode}
          onChange={(e) => onChange('pincode', e.target.value)}
          placeholder="6 Digits"
          maxLength={6}
          className={inputCls}
          disabled={disabled}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Latitude</Label>
        <input
          value={values.latitude}
          onChange={(e) => onChange('latitude', e.target.value)}
          placeholder="19.0760"
          className={inputCls}
          disabled={disabled}
        />
      </div>
      <div>
        <Label>Longitude</Label>
        <input
          value={values.longitude}
          onChange={(e) => onChange('longitude', e.target.value)}
          placeholder="72.8777"
          className={inputCls}
          disabled={disabled}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Phone Number</Label>
        <input
          value={values.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          placeholder="+91 00000 00000"
          maxLength={10}
          className={inputCls}
          disabled={disabled}
        />
      </div>
      <div>
        <Label>Alternate Phone Number</Label>
        <input
          value={values.altPhone}
          onChange={(e) => onChange('altPhone', e.target.value)}
          placeholder="+91 00000 00000"
          maxLength={10}
          className={inputCls}
          disabled={disabled}
        />
      </div>
    </div>
  </div>
);

// Loads Leaflet (OpenStreetMap, no API key needed) once and lets the user click
// or drag a pin to pick a location — coordinates flow back to the form on confirm.
const MapPickerModal = ({ initialLat, initialLng, onConfirm, onClose }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [coords, setCoords] = useState({
    lat: initialLat ? parseFloat(initialLat) : 23.0225,
    lng: initialLng ? parseFloat(initialLng) : 72.5714,
  });
  const [loaded, setLoaded] = useState(!!(typeof window !== 'undefined' && window.L));

  useEffect(() => {
    if (window.L) {
      setLoaded(true);
      return;
    }
    let cancelled = false;

    if (!document.querySelector('link[data-leaflet]')) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      cssLink.setAttribute('data-leaflet', 'true');
      document.head.appendChild(cssLink);
    }

    const existingScript = document.querySelector('script[data-leaflet]');
    if (existingScript) {
      existingScript.addEventListener('load', () => !cancelled && setLoaded(true));
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.setAttribute('data-leaflet', 'true');
      script.onload = () => !cancelled && setLoaded(true);
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstance.current) return;

    const L = window.L;
    const map = L.map(mapRef.current).setView([coords.lat, coords.lng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map);

    const updateFromLatLng = (latlng) => {
      setCoords({ lat: latlng.lat, lng: latlng.lng });
      marker.setLatLng(latlng);
    };

    map.on('click', (e) => updateFromLatLng(e.latlng));
    marker.on('dragend', () => updateFromLatLng(marker.getLatLng()));

    mapInstance.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pick Location on Map</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Click on the map or drag the pin to set coordinates.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          {!loaded && (
            <div className="h-80 flex items-center justify-center text-sm text-gray-400">
              Loading map...
            </div>
          )}
          <div ref={mapRef} className={loaded ? 'h-80 w-full' : 'h-0 w-full overflow-hidden'} />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              Lat: <span className="font-semibold text-gray-800">{coords.lat.toFixed(6)}</span>
            </span>
            <span>
              Lng: <span className="font-semibold text-gray-800">{coords.lng.toFixed(6)}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(coords)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition"
            >
              <Check className="w-4 h-4" />
              Use This Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const UNITS_BY_COMPANY = {
  'Jaiswal Foods Ltd': ['Main Kitchen', 'Cold Storage', 'Central Bakery'],
  'Jaiswal Hospitality': ['PDPU', 'LDRP'],
  'Jaiswal Group': ['Main Pastry Unit', 'Corporate Warehouse', 'Head Office'],
};
const COMPANIES = Object.keys(UNITS_BY_COMPANY);

const DEFAULT_ADDRESS = {
  attention: '',
  country: 'India',
  state: 'Maharashtra',
  addressLine1: '',
  addressLine2: '',
  city: '',
  pincode: '',
  latitude: '',
  longitude: '',
  phone: '',
  altPhone: '',
};

const makeBank = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  reAccountNumber: '',
  ifsc: '',
});

const DEFAULT_FORM = {
  // Personal information
  title: 'Mr.',
  firstName: '',
  middleName: '',
  lastName: '',
  vendorCode: 'VEND-2023-001',
  displayName: '',
  tradeName: '', // vendor's own business/company name shown in Personal Info
  email: '',
  company: '', // internal Jaiswal entity
  unit: '',
  password: '',
  mobile: '',
  altMobile: '',

  // Business details
  gstin: '',
  gstCompanyName: '', // registered company name, from GST lookup
  registeredName: '',
  msmeRegistered: false,
  msmeType: '',
  msmeNumber: '',
  currency: 'INR - Indian Rupee',
  accountsPayable: 'Trade Creditors',
  openingBalance: '',
  paymentTerms: 'Due on Receipt',
  tdsApplicability: 'No TDS',
  documents: [],

  // Address
  sameAsBilling: false,
  billing: { ...DEFAULT_ADDRESS },
  shipping: { ...DEFAULT_ADDRESS },

  // Bank details
  banks: [makeBank()],

  // Remarks
  remarks: '',
};

// Splits the listing's single "name" field into first/middle/last as a
// best-effort guess, since the form collects those separately.
const splitName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
};

// Maps a row from the vendor listing table onto the shape this form uses.
// The listing's mock data doesn't carry every field this form has (bank
// details, GST, MSME, documents, etc.) so anything missing just falls back
// to the defaults.
const mapVendorToForm = (vendor) => ({
  ...DEFAULT_FORM,
  ...splitName(vendor.name),
  vendorCode: vendor.code ?? DEFAULT_FORM.vendorCode,
  displayName: vendor.name ?? '',
  tradeName: vendor.company ?? '',
  email: vendor.email ?? '',
  company: vendor.company ?? '',
  unit: vendor.unit ?? '',
  mobile: vendor.mobile ?? '',
  altMobile: vendor.altMobile ?? '',
  gstin: vendor.gstin ?? '',
  billing: {
    ...DEFAULT_ADDRESS,
    addressLine1: vendor.addressLine1 ?? '',
    addressLine2: vendor.addressLine2 ?? '',
    country: vendor.country ?? 'India',
    state: vendor.state ?? 'Maharashtra',
    city: vendor.city ?? '',
    pincode: vendor.pincode ?? '',
    latitude: vendor.latitude ?? '',
    longitude: vendor.longitude ?? '',
  },
  shipping: { ...DEFAULT_ADDRESS },
  banks: [makeBank()],
});

const SECTIONS = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
  ADDRESS: 'address',
  BANK: 'bank',
  REMARKS: 'remarks',
};

const VendorRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // If we arrived here via the edit action, the vendor row is passed in
  // location.state. Its presence is what puts the page into edit mode.
  const editingVendor = location.state?.vendor ?? null;
  const isEditMode = !!editingVendor;

  // True accordion: at most one section open at a time, and clicking the
  // currently open section closes it (so "all closed" is a valid state).
  const [openSection, setOpenSection] = useState(SECTIONS.PERSONAL);
  const toggleSection = (key) => setOpenSection((prev) => (prev === key ? null : key));

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [gstFetched, setGstFetched] = useState(!!editingVendor?.gstin);
  const [fetchingGst, setFetchingGst] = useState(false);

  const [form, setForm] = useState(() =>
    editingVendor ? mapVendorToForm(editingVendor) : DEFAULT_FORM,
  );

  // If the user navigates here again with a different vendor (e.g. clicking
  // edit on another row without leaving the app), refresh the form.
  useEffect(() => {
    setForm(editingVendor ? mapVendorToForm(editingVendor) : DEFAULT_FORM);
    setGstFetched(!!editingVendor?.gstin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingVendor?.id]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setBillingField = (key, val) => setForm((f) => ({ ...f, billing: { ...f.billing, [key]: val } }));
  const setShippingField = (key, val) => setForm((f) => ({ ...f, shipping: { ...f.shipping, [key]: val } }));
  const toggleSameAsBilling = () => setForm((f) => ({ ...f, sameAsBilling: !f.sameAsBilling }));

  const addBank = () => setForm((f) => ({ ...f, banks: [...f.banks, makeBank()] }));
  const removeBank = (id) => setForm((f) => ({ ...f, banks: f.banks.filter((b) => b.id !== id) }));
  const setBankField = (id, key, val) =>
    setForm((f) => ({
      ...f,
      banks: f.banks.map((b) => (b.id === id ? { ...b, [key]: val } : b)),
    }));

  const handleAddDocuments = (fileList) => {
    const list = Array.from(fileList || []);
    if (list.length === 0) return;
    setForm((f) => ({ ...f, documents: [...f.documents, ...list] }));
  };
  const removeDocument = (idx) =>
    setForm((f) => ({ ...f, documents: f.documents.filter((_, i) => i !== idx) }));

  // Changing company invalidates whatever unit was picked before, since
  // units are scoped to a company.
  const setCompany = (val) => setForm((f) => ({ ...f, company: val, unit: '' }));
  const unitOptions = UNITS_BY_COMPANY[form.company] || [];

  const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');
  const displayNameOptions = [fullName, form.tradeName ? `${fullName} (${form.tradeName})` : null].filter(
    Boolean,
  );

  const handleFetchGst = () => {
    if (!form.gstin || fetchingGst) return;
    setFetchingGst(true);
    // TODO: replace with a real GST lookup API call.
    setTimeout(() => {
      setForm((f) => ({
        ...f,
        gstCompanyName: f.gstCompanyName || f.tradeName || '',
      }));
      setGstFetched(true);
      setFetchingGst(false);
    }, 700);
  };

  const handleSubmit = () => {
    if (isEditMode) {
      // TODO: wire up to the update API call.
      alert(`Updated ${fullName || 'vendor'}`);
    } else {
      // TODO: wire up to the create API call.
      alert(`Saved ${fullName || 'vendor'}`);
    }
    navigate('/vendors');
  };

  const handleSaveAndAddAnother = () => {
    alert(`Saved ${fullName || 'vendor'}`);
    setForm(DEFAULT_FORM);
    setGstFetched(false);
    setOpenSection(SECTIONS.PERSONAL);
  };

  const shippingValues = form.sameAsBilling ? form.billing : form.shipping;

  return (
    <div className="mx-4 min-h-screen">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
          {isEditMode ? 'Update Vendor' : 'Vendor Registration'}
        </h1>
        <p className="text-[#43474F]">
          {isEditMode
            ? `Update the account details for ${editingVendor?.name ?? 'this vendor'}.`
            : 'Onboard a new vendor to the Jaiswal ERP ecosystem with comprehensive business and financial details.'}
        </p>
      </div>

      {/* Personal Information */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={User}
          title="Personal Information"
          open={openSection === SECTIONS.PERSONAL}
          onToggle={() => toggleSection(SECTIONS.PERSONAL)}
        />

        {openSection === SECTIONS.PERSONAL && (
          <div className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label required>First Name</Label>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-300 transition">
                  <select
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    className="px-2.5 text-sm bg-gray-50 border-r border-gray-200 outline-none cursor-pointer"
                  >
                    <option>Mr.</option>
                    <option>Mrs.</option>
                    <option>Ms.</option>
                  </select>
                  <input
                    value={form.firstName}
                    onChange={(e) => setField('firstName', e.target.value)}
                    placeholder="Enter First Name"
                    className="flex-1 min-w-0 px-3.5 py-2.5 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <Label>Middle Name</Label>
                <input
                  value={form.middleName}
                  onChange={(e) => setField('middleName', e.target.value)}
                  placeholder="Enter Middle Name"
                  className={inputCls}
                />
              </div>

              <div>
                <Label required>Last Name</Label>
                <input
                  value={form.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  placeholder="Enter Last Name"
                  className={inputCls}
                />
              </div>
            </div>

        <div className={`grid ${isEditMode ? "grid-cols-3" : "grid-cols-2"} gap-4`}>
             { isEditMode &&  <div>
                <Label>Vendor Code (Auto Generated)</Label>
                <input
                  value={form.vendorCode}
                  disabled
                  className={inputCls}
                />
              </div>
              }

              <div>
                <Label>Display Name</Label>
                <Select
                  value={form.displayName}
                  onChange={(e) => setField('displayName', e.target.value)}
                  placeholder="Select display name"
                  options={displayNameOptions}
                />
              </div>

              <div>
                <Label>Company Name</Label>
                <input
                  value={form.tradeName}
                  onChange={(e) => setField('tradeName', e.target.value)}
                  placeholder="Vendor's business name"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label required>Email Address</Label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="example@jaiswalgroup.com"
                  className={inputCls}
                />
              </div>
              <div>
                <Label required>Mobile Number</Label>
                <input
                  value={form.mobile}
                  onChange={(e) => setField('mobile', e.target.value)}
                  placeholder="+91 00000 00000"
                  maxLength={10}
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Alternate Mobile Number</Label>
                <input
                  value={form.altMobile}
                  onChange={(e) => setField('altMobile', e.target.value)}
                  placeholder="+91 00000 00000"
                  maxLength={10}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Company & Unit — placed directly below the Email row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Company</Label>
                <Select
                  value={form.company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Select company"
                  options={COMPANIES}
                />
              </div>
              <div>
                <Label required>Unit</Label>
                <Select
                  value={form.unit}
                  onChange={(e) => setField('unit', e.target.value)}
                  placeholder={form.company ? 'Select unit' : 'Select a company first'}
                  options={unitOptions}
                />
              </div>
            </div>

            {isEditMode && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Password</Label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Business Details */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={Briefcase}
          title="Business Details"
          open={openSection === SECTIONS.BUSINESS}
          onToggle={() => toggleSection(SECTIONS.BUSINESS)}
        />

        {openSection === SECTIONS.BUSINESS && (
          <div className="px-6 py-6 space-y-6">
            <div className="space-y-4">
              <SubHeading icon={FileText} title="GST Information" />

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label required>GSTIN / UIN</Label>
                  <input
                    value={form.gstin}
                    onChange={(e) => setField('gstin', e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5"
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFetchGst}
                  disabled={!form.gstin || fetchingGst}
                  className="h-[42px] px-4 rounded-lg border border-[#084E92] text-[#084E92] text-sm font-semibold flex items-center gap-1.5 shrink-0 bg-white hover:bg-blue-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fetchingGst ? 'animate-spin' : ''}`} />
                  {fetchingGst ? 'Fetching...' : 'Fetch Details'}
                </button>
              </div>

              {gstFetched && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>Company Name</Label>
                    <input
                      value={form.gstCompanyName}
                      onChange={(e) => setField('gstCompanyName', e.target.value)}
                      placeholder="Company Name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <Label>Registered Name</Label>
                    <input
                      value={form.registeredName}
                      onChange={(e) => setField('registeredName', e.target.value)}
                      placeholder="Registration Name"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center max-w-1/3 justify-between border border-gray-200 rounded-lg px-4 py-3">
                <span className="text-sm font-medium text-gray-700">This vendor is MSME Registered</span>
                <Toggle checked={form.msmeRegistered} onChange={(v) => setField('msmeRegistered', v)} />
              </div>

              {form.msmeRegistered && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>MSME/Udyam Registration Type</Label>
                    <Select
                      value={form.msmeType}
                      onChange={(e) => setField('msmeType', e.target.value)}
                      placeholder="Select the Registration type"
                      options={['Micro', 'Small', 'Medium']}
                    />
                  </div>
                  <div>
                    <Label>MSME/Udyam Registration Number</Label>
                    <input
                      value={form.msmeNumber}
                      onChange={(e) => setField('msmeNumber', e.target.value)}
                      placeholder="Enter the registration number"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Currency</Label>
                  <Select
                    value={form.currency}
                    onChange={(e) => setField('currency', e.target.value)}
                    placeholder="Select currency"
                    options={['INR - Indian Rupee', 'USD - US Dollar', 'EUR - Euro']}
                  />
                </div>
                <div>
                  <Label>Accounts Payable</Label>
                  <Select
                    value={form.accountsPayable}
                    onChange={(e) => setField('accountsPayable', e.target.value)}
                    placeholder="Select account"
                    options={['Trade Creditors', 'Sundry Creditors', 'Accrued Expenses']}
                  />
                </div>
                <div>
                  <Label>Opening Balance (₹)</Label>
                  <input
                    value={form.openingBalance}
                    onChange={(e) => setField('openingBalance', e.target.value)}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Terms</Label>
                  <Select
                    value={form.paymentTerms}
                    onChange={(e) => setField('paymentTerms', e.target.value)}
                    placeholder="Select terms"
                    options={['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60']}
                  />
                </div>
                <div>
                  <Label>TDS Applicability</Label>
                  <Select
                    value={form.tdsApplicability}
                    onChange={(e) => setField('tdsApplicability', e.target.value)}
                    placeholder="Select TDS"
                    options={['No TDS', '194C - Contractor', '194J - Professional Fees', '194I - Rent']}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <Label>Upload Documents</Label>
              <DocumentUpload files={form.documents} onAdd={handleAddDocuments} onRemove={removeDocument} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Address */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={MapPin}
          title="Address"
          open={openSection === SECTIONS.ADDRESS}
          onToggle={() => toggleSection(SECTIONS.ADDRESS)}
        />

        {openSection === SECTIONS.ADDRESS && (
          <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AddressCard
              title="Billing Address"
              icon={MapPin}
              values={form.billing}
              onChange={setBillingField}
              action={
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#084E92] cursor-pointer bg-transparent border-0"
                >
                  <Map className="w-3.5 h-3.5" />
                  Pick From Map
                </button>
              }
            />
            <AddressCard
              title="Shipping Address"
              icon={Truck}
              values={shippingValues}
              onChange={setShippingField}
              disabled={form.sameAsBilling}
              action={
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.sameAsBilling}
                    onChange={toggleSameAsBilling}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  Same as Billing Address
                </label>
              }
            />
          </div>
        )}
      </SectionCard>

      {/* Bank Details */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={Landmark}
          title="Bank Details"
          open={openSection === SECTIONS.BANK}
          onToggle={() => toggleSection(SECTIONS.BANK)}
        />

        {openSection === SECTIONS.BANK && (
          <div className="px-6 py-6 space-y-4">
            {form.banks.map((bank) => (
              <div key={bank.id} className="border border-gray-200 rounded-xl p-5 space-y-4 relative">
                {form.banks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBank(bank.id)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 cursor-pointer bg-transparent border-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>Account Holder Name</Label>
                    <input
                      value={bank.accountHolderName}
                      onChange={(e) => setBankField(bank.id, 'accountHolderName', e.target.value)}
                      placeholder="As per bank records"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <Label required>Bank Name</Label>
                    <input
                      value={bank.bankName}
                      onChange={(e) => setBankField(bank.id, 'bankName', e.target.value)}
                      placeholder="e.g. HDFC Bank, ICICI Bank"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>Account Number</Label>
                    <input
                      value={bank.accountNumber}
                      onChange={(e) => setBankField(bank.id, 'accountNumber', e.target.value)}
                      placeholder="0000 0000 0000"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <Label required>Re-enter Account Number</Label>
                    <input
                      value={bank.reAccountNumber}
                      onChange={(e) => setBankField(bank.id, 'reAccountNumber', e.target.value)}
                      placeholder="0000 0000 0000"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <Label required>IFSC Code</Label>
                  <input
                    value={bank.ifsc}
                    onChange={(e) => setBankField(bank.id, 'ifsc', e.target.value.toUpperCase())}
                    placeholder="HDFC0000123"
                    className={`${inputCls} md:max-w-xs`}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addBank}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-gray-300 text-sm font-semibold text-[#084E92] hover:bg-blue-50/40 transition cursor-pointer bg-white"
            >
              <Plus className="w-4 h-4" />
              Add New Bank Details
            </button>
          </div>
        )}
      </SectionCard>

      {/* Remarks & Internal Notes */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={ClipboardList}
          title="Remarks & Internal Notes"
          open={openSection === SECTIONS.REMARKS}
          onToggle={() => toggleSection(SECTIONS.REMARKS)}
        />

        {openSection === SECTIONS.REMARKS && (
          <div className="px-6 py-6">
            <textarea
              rows={4}
              value={form.remarks}
              onChange={(e) => setField('remarks', e.target.value)}
              placeholder="Add any specific observations, compliance notes, or internal instructions regarding this vendor..."
              className={`${inputCls} resize-none`}
            />
          </div>
        )}
      </SectionCard>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 pb-4 my-6 border-t border-[#C3C6D1] py-6">
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          className="px-5 py-2.5 rounded-lg border border-[#737781] text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          Cancel
        </button>
        {!isEditMode && (
          <button
            type="button"
            onClick={handleSaveAndAddAnother}
            className="px-6 py-2.5 rounded-lg text-sky-900 border border-[#084E92] font-semibold text-sm transition cursor-pointer bg-white"
          >
            Save & Add Another
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition"
        >
          {isEditMode ? 'Update Vendor' : 'Save Vendor'}
        </button>
      </div>

      {showMapPicker && (
        <MapPickerModal
          initialLat={form.billing.latitude}
          initialLng={form.billing.longitude}
          onClose={() => setShowMapPicker(false)}
          onConfirm={({ lat, lng }) => {
            setBillingField('latitude', lat.toFixed(6));
            setBillingField('longitude', lng.toFixed(6));
            setShowMapPicker(false);
          }}
        />
      )}
    </div>
  );
};

export default VendorRegistration;