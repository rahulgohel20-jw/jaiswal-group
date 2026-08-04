import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Briefcase,
  ChevronDown,
  Check,
  ImageUp,
  Info,
  Map,
  MapPin,
  X,
} from 'lucide-react';
import { createCompany, getAllCountry, getCityByState, getRegisteredCompany, getStateByCountry, updateCompany } from '../../services/apiServices';
import { notify } from "@/utils/toast";

const COMPANIES = [
  'Jaiswal Group',
  'Jaiswal Retail Pvt Ltd',
  'Jaiswal Enterprises',
  'Jaiswal Foods & Beverages',
];

const SERVICE_TYPES = [
  'Retail Store',
  'Wholesale Depot',
  'Franchise Unit',
  'Service Center',
  'Warehouse',
];

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


const ImageUploadBox = ({ label, hint, value, onChange }) => {
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      onChange(file);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div
        onClick={() => fileRef.current?.click()}
        className="relative w-full border border-dashed border-gray-300 rounded-lg px-3.5 py-2.5 flex items-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition bg-white"
      >
        {value ? (
          <img
            src={value instanceof File ? URL.createObjectURL(value) : value}
            alt={label}
            className="w-8 h-8 rounded-md object-cover border border-gray-200 shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
            <ImageUp className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-gray-600 truncate">
            {value ? 'Replace image' : 'Click to upload'}
          </p>
          <p className="text-xs text-gray-400">{hint}</p>
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="ml-auto w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition cursor-pointer bg-white shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  );
};

const Select = ({ value, onChange, placeholder, options }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className={`${inputCls} appearance-none pr-9 cursor-pointer ${value === '' ? 'text-gray-400' : 'text-gray-800'}`}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt} className="text-gray-800">
          {opt}
        </option>
      ))}
    </select>
    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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

// Maps a row from the Units listing table onto the shape this form uses.
// The listing's mock data doesn't carry every field this form has (logo,
// address lines, manager, etc.) so anything missing just falls back to blank.

const mapUnitToForm = (unit) => ({
  UnitName: unit.companyNameEnglish || "",
  UnitCode: unit.companyCode || "",
  shortCode: unit.shortCode || "",
  email: unit.emailid || "",
  mobile: unit.mobilenumber || "",
  altMobile: unit.alternatemobilenumber || "",
  capacity: unit.capacity || "",

  company: unit.parentId || "",
  addressLine1: unit.addressEnglish || "",
  addressLine2: unit.addressline2 || "",
  pincode: unit.pincode || "",
  latitude: unit.latitude || "",
  longitude: unit.longitude || "",
});

const DEFAULT_FORM = {
  UnitName: '',
  UnitCode: 'AHD-2526-0001',
  logo: null,
  favicon: null,
  shortCode: '',
  email: '',
  mobile: '',
  altMobile: '',
  capacity: '',
  company: '',
  serviceType: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  latitude: '',
  longitude: '',
};

const AddUnit = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [companies, setCompanies] = useState([])

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await getRegisteredCompany();
        const list = res?.data?.data || [];
        const subCompanies = list.filter(
          (item) => item.orgType === "SUB_COMPANY"
        );

        setCompanies(subCompanies);

      } catch (error) {
        console.log(error);
      }
    };

    fetchCompanies();
  }, []);
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await getAllCountry();
        setCountries(res.data.data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchCountries();
  }, []);

  const handleCountryChange = async (e) => {

    const countryId = e.target.value;

    setSelectedCountry(countryId);
    setStates([]);
    setCities([]);
    setSelectedState("");
    setSelectedCity("");

    try {
      const res = await getStateByCountry(countryId);
      setStates(res.data.data);

    } catch (error) {
      console.log(error);
    }

  }
  const handleStateChange = async (e) => {

    const stateId = e.target.value;

    setSelectedState(stateId);
    setCities([]);
    setSelectedCity("");

    try {

      const res = await getCityByState(stateId);
      setCities(res.data.data["City Details"]);
    } catch (error) {
      console.log(error);
    }

  }
  // If we arrived here via the edit action, the Unit row is passed in
  // location.state. Its presence is what puts the page into edit mode.
  const editingUnit = location.state?.unit ?? null;
  const isEditMode = !!editingUnit;

  useEffect(() => {
    const loadLocationData = async () => {
      if (!editingUnit) return;

      try {
        setSelectedCountry(editingUnit.countryId?.toString() || "");

        const stateRes = await getStateByCountry(editingUnit.countryId);
        setStates(stateRes.data.data || []);

        setSelectedState(editingUnit.stateId?.toString() || "");

        const cityRes = await getCityByState(editingUnit.stateId);
        setCities(cityRes.data.data["City Details"] || []);

        setSelectedCity(editingUnit.cityId?.toString() || "");
      } catch (error) {
        console.log(error);
      }
    };

    loadLocationData();
  }, [editingUnit]);
  // Each section has its own independent open/closed state
  const [openSections, setOpenSections] = useState({
    Unit: true,
    business: true,
    address: true,
  });

  const toggleSection = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const [showMapPicker, setShowMapPicker] = useState(false);

  const [form, setForm] = useState(() =>
    editingUnit ? mapUnitToForm(editingUnit) : DEFAULT_FORM,
  );

  // If the user navigates here again with a different Unit (e.g. clicking
  // edit on another row without leaving the app), refresh the form.
  useEffect(() => {
    setForm(editingUnit ? mapUnitToForm(editingUnit) : DEFAULT_FORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingUnit?.id]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // const handleSubmit = async () => {

  //   try {

  //     const payload = {
  //       orgType: "OUTLET",
  //       parentId: Number(form.company),
  //       username: 1,
  //       isverified: true,
  //       companyNameEnglish: form.UnitName,
  //       emailid: form.email,
  //       mobilenumber: form.mobile,
  //       alternatemobilenumber: form.altMobile,
  //       addressEnglish: form.addressLine1,
  //       addressline2: form.addressLine2,
  //       countryId: Number(selectedCountry),
  //       stateId: Number(selectedState),
  //       cityId: Number(selectedCity),
  //       pincode: form.pincode,
  //       latitude: form.latitude,
  //       longitude: form.longitude,
  //       capacity: form.capacity,
  //     };
  //     const formData = new FormData();
  //     if (form.logo) {
  //       formData.append("logo", form.logo)
  //     }
  //     if (form.favicon) {
  //       formData.append("favicon", form.favicon)
  //     }
  //     await createCompany(payload, formData);
  //     navigate("/Units");
  //   } catch (error) {
  //     console.log(error.response?.data || error.message)
  //   }
  // }
const handleSubmit = async () => {
  try {
    const payload = {
      orgType: "OUTLET",
      parentId: form.company ? Number(form.company) : null,
      username: 1,
      isverified: true,

      companyNameEnglish: form.UnitName,
      shortCode: form.shortCode,

      emailid: form.email,
      mobilenumber: form.mobile,
      alternatemobilenumber: form.altMobile,

      addressEnglish: form.addressLine1,
      addressline2: form.addressLine2,

      countryId: selectedCountry ? Number(selectedCountry) : null,
      stateId: selectedState ? Number(selectedState) : null,
      cityId: selectedCity ? Number(selectedCity) : null,

      pincode: form.pincode,
      latitude: form.latitude,
      longitude: form.longitude,

      capacity: form.capacity,
    };

    if (isEditMode) {
      // updateCompany(data) -> PUT body is `data` (multipart/form-data).
      // All fields, including id, must be inside this single FormData.
      const formData = new FormData();
      formData.append("id", editingUnit.id);

      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value ?? "");
      });

      if (form.logo instanceof File) {
        formData.append("logo", form.logo);
      }
      if (form.favicon instanceof File) {
        formData.append("favicon", form.favicon);
      }

      await updateCompany(formData);
      notify.success("Unit updated successfully");
    } else {
      // createCompany(params, formData) -> `params` becomes the query
      // string, `formData` is the POST body — used only for files.
      const formData = new FormData();

      if (form.logo instanceof File) {
        formData.append("logo", form.logo);
      }
      if (form.favicon instanceof File) {
        formData.append("favicon", form.favicon);
      }

      await createCompany(payload, formData);
      notify.success("Unit Created successfully");
    }

    navigate("/Units");
  } catch (error) {
    console.log(error.response?.data || error.message);
  }
};

  return (
    <div className="mx-4 min-h-screen p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
          {isEditMode ? 'Update Unit' : 'Register New Unit'}
        </h1>
        <p className="text-[#43474F]">
          {isEditMode
            ? `Update the details for ${editingUnit?.name ?? 'this Unit'} within the Jaiswal Group ecosystem.`
            : 'Complete the form below to register a new Unit under the Jaiswal Group ecosystem.'}
        </p>
      </div>

      {/* Unit Information */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={Info}
          title="Unit Information"
          open={openSections.Unit}
          onToggle={() => toggleSection('Unit')}
        />

        {openSections.Unit && (
          <div className="px-6 py-6 space-y-5">
  <div className={`grid gap-4 ${isEditMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
    <div>
      <Label required>Unit Name</Label>
      <input
        value={form.UnitName}
        onChange={(e) => set('UnitName', e.target.value)}
        placeholder="e.g. Jaiswal Group - Maninagar"
        className={inputCls}
      />
    </div>
    {isEditMode && (
      <div>
        <Label>Unit Code (Auto Generated)</Label>
        <input
          value={form.UnitCode}
          disabled
          className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
        />
      </div>
    )}
  </div>

  <div className="grid grid-cols-2 gap-4">
    <ImageUploadBox
      label="Unit Logo"
      hint="PNG, JPG upto 2MB"
      value={form.logo}
      onChange={(v) => set('logo', v)}
    />
    <ImageUploadBox
      label="Favicon"
      hint="32×32 or 64×64px"
      value={form.favicon}
      onChange={(v) => set('favicon', v)}
    />
  </div>

  <div className="grid grid-cols-2 gap-4">
    {isEditMode && (
      <div>
        <Label>Short Code</Label>
        <input
          value={form.shortCode}
          disabled
          className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
        />
      </div>
    )}
    <div>
      <Label required>Email</Label>
      <input
        type="email"
        value={form.email}
        onChange={(e) => set('email', e.target.value)}
        placeholder="Unit@example.com"
        className={inputCls}
      />
    </div>
    <div>
      <Label required>Mobile Number</Label>
      <input
        value={form.mobile}
        onChange={(e) => set('mobile', e.target.value)}
        placeholder="+91 98675 34210"
        maxLength={10}
        className={inputCls}
      />
    </div>
    <div>
      <Label>Alternate Mobile Number</Label>
      <input
        value={form.altMobile}
        onChange={(e) => set('altMobile', e.target.value)}
        placeholder="Secondary Mobile"
        maxLength={10}
        className={inputCls}
      />
    </div>
    <div>
      <Label required>Capacity ( Meals Per Day )</Label>
      <input
        type="number"
        value={form.capacity}
        onChange={(e) => set('capacity', e.target.value)}
        placeholder="e.g. 200"
        className={inputCls}
      />
    </div>
  </div>
</div>
        )}
      </SectionCard>

      {/* Business Details */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={Briefcase}
          title="Business Details"
          open={openSections.business}
          onToggle={() => toggleSection('business')}
        />

        {openSections.business && (
          <div className="grid grid-cols-2 gap-4 px-6 py-6">
            <div>
              <Label required>Company</Label>
              <p className={inputCls}>
                <select
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
                  className='w-full outline-none'
                >
                  <option value="">Select Company</option>

                  {companies.map((company) => (
                    <option
                      key={company.id}
                      value={company.id}
                    >
                      {company.companyNameEnglish}
                    </option>
                  ))}
                </select>
              </p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Address & Location */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={MapPin}
          title="Address & Location"
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
                  onChange={(e) => set('addressLine1', e.target.value)}
                  placeholder="Plot No, Street, Landmark"
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Address Line 2</Label>
                <input
                  value={form.addressLine2}
                  onChange={(e) => set('addressLine2', e.target.value)}
                  placeholder="Area, Building Name"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label required>Country</Label>
                <p className={inputCls}>
                  <select
                    value={selectedCountry}
                    onChange={handleCountryChange}
                    className='w-full outline-none'
                  >
                    <option value="">
                      Select Country
                    </option>

                    {countries.map((country) => (
                      <option
                        key={country.id}
                        value={country.id}
                      >
                        {country.name}
                      </option>
                    ))}

                  </select>
                </p>
              </div>
              <div>
                <Label required>State</Label>
                <p className={inputCls}>
                  <select
                    value={selectedState}
                    onChange={handleStateChange}
                    className='w-full outline-none'
                  >
                    <option value="">
                      Select State
                    </option>

                    {states.map((state) => (
                      <option
                        key={state.id}
                        value={state.id}
                      >
                        {state.name}
                      </option>
                    ))}

                  </select>
                </p>
              </div>
              <div>
                <Label required>City</Label>
                <p className={inputCls}>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className='w-full outline-none'
                  >
                    <option value="">
                      Select City
                    </option>

                    {cities?.map((city) => (
                      <option
                        key={city.id}
                        value={city.id}
                      >
                        {city.name}
                      </option>
                    ))}

                  </select>
                </p>
              </div>
              <div>
                <Label required>Pincode</Label>
                <input
                  value={form.pincode}
                  onChange={(e) => set('pincode', e.target.value)}
                  placeholder="380009"
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
          onClick={() => navigate('/Units')}
          className="px-5 py-2.5 rounded-lg border border-[#737781] text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition"
        >
          {isEditMode ? 'Update' : 'Save'}
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

export default AddUnit;