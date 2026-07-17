import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ChevronDown, Map, MapPin, User, X, Check } from 'lucide-react';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const selectCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 appearance-none cursor-pointer';

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const Select = ({ value, onChange, options, placeholder }) => (
  <div className="relative">
    <select value={value} onChange={onChange} className={selectCls}>
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

const SectionCard = ({ children, className = '' }) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}
  >
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

// Splits the listing's single "name" field into first/last/surname as a
// best-effort guess, since the form collects those separately.
const splitName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '', surname: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '', surname: '' };
  if (parts.length === 2) return { firstName: parts[0], lastName: '', surname: parts[1] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1, -1).join(' '),
    surname: parts[parts.length - 1],
  };
};

// Maps a row from the vendor listing table onto the shape this form uses.
// The listing's mock data doesn't carry every field this form has (password,
// address lines, alt mobile, etc.) so anything missing just falls back to blank.
const mapVendorToForm = (vendor) => ({
  ...splitName(vendor.name),
  vendorCode: vendor.code ?? 'VND-2023-0892',
  email: vendor.email ?? '',
  company: vendor.company ?? '',
  unit: vendor.unit ?? '',
  password: '',
  mobile: vendor.mobile ?? '',
  altMobile: vendor.altMobile ?? '',
  addressLine1: vendor.addressLine1 ?? '',
  addressLine2: vendor.addressLine2 ?? '',
  country: vendor.country ?? 'India',
  state: vendor.state ?? 'Gujarat',
  city: vendor.city ?? '',
  pincode: vendor.pincode ?? '',
  latitude: vendor.latitude ?? '',
  longitude: vendor.longitude ?? '',
});

const DEFAULT_FORM = {
  firstName: '',
  lastName: '',
  surname: '',
  vendorCode: 'VND-2023-0892',
  email: '',
  company: '',
  unit: '',
  password: '',
  mobile: '',
  altMobile: '',
  addressLine1: '',
  addressLine2: '',
  country: 'India',
  state: 'Gujarat',
  city: '',
  pincode: '',
  latitude: '',
  longitude: '',
};

const VendorRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // If we arrived here via the edit action, the vendor row is passed in
  // location.state. Its presence is what puts the page into edit mode.
  const editingVendor = location.state?.vendor ?? null;
  const isEditMode = !!editingVendor;

  const [openSections, setOpenSections] = useState({
    personal: true,
    address: true,
  });

  const toggleSection = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const [showMapPicker, setShowMapPicker] = useState(false);

  const [form, setForm] = useState(() =>
    editingVendor ? mapVendorToForm(editingVendor) : DEFAULT_FORM,
  );

  // If the user navigates here again with a different vendor (e.g. clicking
  // edit on another row without leaving the app), refresh the form.
  useEffect(() => {
    setForm(editingVendor ? mapVendorToForm(editingVendor) : DEFAULT_FORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingVendor?.id]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Changing company invalidates whatever unit was picked before, since
  // units are scoped to a company.
  const setCompany = (val) => setForm((f) => ({ ...f, company: val, unit: '' }));

  const unitOptions = UNITS_BY_COMPANY[form.company] || [];

  const handleSubmit = () => {
    const fullName = [form.firstName, form.lastName, form.surname].filter(Boolean).join(' ');
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
    const fullName = [form.firstName, form.lastName, form.surname].filter(Boolean).join(' ');
    alert(`Saved ${fullName || 'vendor'}`);
    setForm(DEFAULT_FORM);
  };

  return (
    <div className="mx-4 min-h-screen">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
          {isEditMode ? 'Update Vendor' : 'Vendor Registration'}
        </h1>
        <p className="text-[#43474F]">
          {isEditMode
            ? `Update the account details for ${editingVendor?.name ?? 'this vendor'}.`
            : 'Create a new enterprise vendor account across organizational levels.'}
        </p>
      </div>

      <SectionCard className="mt-4">
        <SectionHeader
          icon={User}
          title="Personal Information"
          open={openSections.personal}
          onToggle={() => toggleSection('personal')}
        />

          {openSections.personal && (
            <div className="px-6 py-6 space-y-5">
               <div className="grid grid-cols-3 gap-4">
              <div>
              <Label required>First Name</Label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder="Enter First Name"
                className={inputCls}
              />
            </div>

              <div>
              <Label required>Last Name</Label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder="Enter Last Name"
                className={inputCls}
              />
            </div>

             <div>
              <Label required>Surname</Label>
              <input
                value={form.surname}
                onChange={(e) => set('surname', e.target.value)}
                placeholder="Enter Surname"
                className={inputCls}
              />
            </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vendor Code (Auto Generated)</Label>
                <input
                  value={form.vendorCode}
                  disabled
                  className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                />
              </div>

              <div>
                <Label required>Email Address</Label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="example@jaiswalgroup.com"
                  className={inputCls}
                />
              </div>
            </div>

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
                  onChange={(e) => set('unit', e.target.value)}
                  placeholder={form.company ? 'Select unit' : 'Select a company first'}
                  options={unitOptions}
                />
              </div>
            </div>

            <div className={`grid gap-4 ${isEditMode ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {!isEditMode && (
                <div>
                  <Label required>Password</Label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>
              )}

              <div>
                <Label required>Mobile Number</Label>
                <input
                  value={form.mobile}
                  onChange={(e) => set('mobile', e.target.value)}
                  placeholder="+91 00000 00000"
                  maxLength={10}
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Alternate Mobile Number</Label>
                <input
                  value={form.altMobile}
                  onChange={(e) => set('altMobile', e.target.value)}
                  placeholder="+91 00000 00000"
                  maxLength={10}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard className="mt-4">
        <SectionHeader
          icon={MapPin}
          title="Registered Address"
          open={openSections.address}
          onToggle={() => toggleSection('address')}
        />
        {openSections.address && (
          <div className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Address Line 1</Label>
                <input
                  value={form.addressLine1}
                  onChange={(e) => set("addressLine1", e.target.value)}
                  placeholder="Building, Street Name"
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Address Line 2</Label>
                <input
                  value={form.addressLine2}
                  onChange={(e) => set("addressLine2", e.target.value)}
                  placeholder="Locality, Landmark"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">

                <div>
                <Label required>Country</Label>
                <input
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  placeholder="Country"
                  className={inputCls}
                />
              </div>
              <div>
                <Label required>State</Label>
                <input
                  value={form.state}
                  onChange={(e) => set('state', e.target.value)}
                  placeholder="State"
                  className={inputCls}
                />
              </div>
              <div>
                <Label required>City</Label>
                <input
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="City Name"
                  className={inputCls}
                />
              </div>
              <div>
                <Label required>Pincode</Label>
                <input
                  value={form.pincode}
                  onChange={(e) => set('pincode', e.target.value)}
                  placeholder="6 Digits"
                  maxLength={6}
                  className={inputCls}
                />
              </div>

            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Latitude</Label>
                <input
                  value={form.latitude}
                  onChange={(e) => set('latitude', e.target.value)}
                  placeholder="23.0225"
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <input
                  value={form.longitude}
                  onChange={(e) => set('longitude', e.target.value)}
                  placeholder="72.5714"
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="flex gap-1 items-end text-[#084E92] cursor-pointer bg-transparent border-0 p-0"
              >
                <Map size={15} />
                <p className="font-bold text-sm">Pick from Map</p>
              </button>
            </div>
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
            initialLat={form.latitude}
            initialLng={form.longitude}
            onClose={() => setShowMapPicker(false)}
            onConfirm={({ lat, lng }) => {
              set('latitude', lat.toFixed(6));
              set('longitude', lng.toFixed(6));
              setShowMapPicker(false);
            }}
          />
        )}
    </div>
  );
};

export default VendorRegistration;