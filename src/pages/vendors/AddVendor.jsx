import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Map, MapPin, User, X, Check } from 'lucide-react';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
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

const VendorRegistration = () => {

  const [openSections, setOpenSections] = useState({
    personal: true,
    address: true,
  });

  const toggleSection = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const [showMapPicker, setShowMapPicker] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    surname: '',
    vendorCode: "VND-2023-0892",
    email: "",
    company: "Jaiswal Group India Pvt Ltd",
    password: "",
    mobile: "",
    altMobile: "",
    addressLine1: "",
    addressLine2: "",
    country: "India",
    state: "Gujarat",
    city: "",
    pincode: "",
    latitude: "",
    longitude: "",
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="mx-4 min-h-screen">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
          Vendor Registration
        </h1>
        <p className="text-[#43474F]">
          Create a new enterprise vendor account across organizational levels.
        </p>
      </div>

      <SectionCard className="mt-4">
        <SectionHeader
          icon={User}
          title="Personal Information"
          open={openSections.personal}
          onToggle={() => toggleSection('personal')}
        />

          {openSections.personal === "personal" && (
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>User Code</Label>
                <input
                  value={form.userCode}
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

              <div>
                <Label required>Company</Label>
                <input value={form.company} disabled className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
            className="px-5 py-2.5 rounded-lg border border-[#737781] text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-6 py-2.5 rounded-lg text-sky-900 border border-[#084E92] font-semibold text-sm transition cursor-pointer bg-white"
          >
            Save & Add Another
          </button>
          <button
            type="button"
            className="px-6 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition"
          >
            Save Vendor
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