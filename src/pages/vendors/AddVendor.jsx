import React, { useEffect, useRef, useState } from 'react';
import { getUserIdFromToken } from '@/utils/auth';
import {
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  Landmark,
  Map,
  MapPin,
  Plus,
  RefreshCw,
  User,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import {
  getAllCountries,
  getAllRoleMasterByUserId,
  getCitiesByState,
  getOrganizationByType,
  getStatesByCountry,
  saveVendor,
  updateVendor,
} from '@/services/apiServices';
import {
  buildVendorPayload,
  DEFAULT_FORM,
  extractList,
  makeBank,
  mapVendorToForm,
} from './vendorHelper';

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
    <select
      value={value}
      onChange={onChange}
      className={selectCls}
      disabled={disabled}
    >
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

// {id, name} option select — used for Country / State / City / Role
const IdSelect = ({
  value,
  onChange,
  placeholder,
  options,
  disabled,
  loading,
  optional = false,
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      disabled={disabled || loading}
      className={`${selectCls} ${value === '' ? 'text-gray-400' : 'text-gray-800'}`}
    >
      <option value="" disabled={!optional}>
        {loading ? 'Loading...' : placeholder}
      </option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id} className="text-gray-800">
          {opt.name}
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

const SubHeading = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-3.5 h-3.5 text-blue-500" />
    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
      {title}
    </h3>
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
  const [loaded, setLoaded] = useState(
    !!(typeof window !== 'undefined' && window.L),
  );

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
      existingScript.addEventListener(
        'load',
        () => !cancelled && setLoaded(true),
      );
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

    const marker = L.marker([coords.lat, coords.lng], {
      draggable: true,
    }).addTo(map);

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
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Pick Location on Map
            </h2>
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
          <div
            ref={mapRef}
            className={loaded ? 'h-80 w-full' : 'h-0 w-full overflow-hidden'}
          />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              Lat:{' '}
              <span className="font-semibold text-gray-800">
                {coords.lat.toFixed(6)}
              </span>
            </span>
            <span>
              Lng:{' '}
              <span className="font-semibold text-gray-800">
                {coords.lng.toFixed(6)}
              </span>
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

// Small checkbox used for "Same as Billing Address".
const Checkbox = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-3.5 h-3.5 rounded border-gray-300 text-[#084E92] focus:ring-[#084E92] cursor-pointer"
    />
    {label}
  </label>
);

// Reusable address field block — used for Common, Billing, and Shipping cards.
// Compact 2-column layout so two of these can sit side by side.
const AddressFields = ({
  address,
  onFieldChange,
  onCountryChange,
  onStateChange,
  onCityChange,
  countries,
  loadingCountries,
  states,
  loadingStates,
  cities,
  loadingCities,
  disabled = false,
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label required>Country</Label>
        <IdSelect
          value={address.countryId}
          onChange={onCountryChange}
          placeholder="Select Country"
          options={countries}
          loading={loadingCountries}
          disabled={disabled}
        />
      </div>
      <div>
        <Label required>State</Label>
        <IdSelect
          value={address.stateId}
          onChange={onStateChange}
          placeholder={
            address.countryId ? 'Select State' : 'Select country first'
          }
          options={states}
          loading={loadingStates}
          disabled={disabled || !address.countryId}
        />
      </div>
    </div>

    <div>
      <Label required>Address Line 1</Label>
      <input
        value={address.addressLine1}
        onChange={(e) => onFieldChange('addressLine1', e.target.value)}
        placeholder="Building, Street Name"
        className={inputCls}
        disabled={disabled}
      />
    </div>

    <div>
      <Label>Address Line 2</Label>
      <input
        value={address.addressLine2}
        onChange={(e) => onFieldChange('addressLine2', e.target.value)}
        placeholder="Locality, Landmark"
        className={inputCls}
        disabled={disabled}
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label required>City</Label>
        <IdSelect
          value={address.cityId}
          onChange={onCityChange}
          placeholder={address.stateId ? 'Select City' : 'Select state first'}
          options={cities}
          loading={loadingCities}
          disabled={disabled || !address.stateId}
        />
      </div>
      <div>
        <Label required>Pincode</Label>
        <input
          value={address.pincode}
          onChange={(e) =>
            onFieldChange('pincode', e.target.value.replace(/\D/g, ''))
          }
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
          value={address.latitude}
          onChange={(e) => onFieldChange('latitude', e.target.value)}
          placeholder="23.0225"
          className={inputCls}
          disabled={disabled}
        />
      </div>
      <div>
        <Label>Longitude</Label>
        <input
          value={address.longitude}
          onChange={(e) => onFieldChange('longitude', e.target.value)}
          placeholder="72.5714"
          className={inputCls}
          disabled={disabled}
        />
      </div>
    </div>
  </div>
);

// Organizations are scoped to type "GROUP" (e.g. JAISWAL GROUP entities).
// Vendors always belong to this single organization, so we fetch it and
// assign the id directly instead of showing a picker.
const ORGANIZATION_TYPE = 'GROUP';

const SECTIONS = {
  PERSONAL: 'personal',
  COMMON: 'common',
  BUSINESS: 'business',
  ADDRESS: 'address',
  BANK: 'bank',
  REMARKS: 'remarks',
};

const VendorRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const editingVendor = location.state?.vendor ?? null;
  const isEditMode = !!editingVendor;

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [openSection, setOpenSection] = useState(SECTIONS.PERSONAL);
  const toggleSection = (key) =>
    setOpenSection((prev) => (prev === key ? null : key));

  // Which address the map picker modal is currently editing.
  const [mapPickerTarget, setMapPickerTarget] = useState(null); // 'commonAddress' | 'billingAddress' | 'shippingAddress' | null

  const [form, setForm] = useState(() =>
    editingVendor ? mapVendorToForm(editingVendor) : DEFAULT_FORM,
  );

  // Once the user manually edits Company Name, stop auto-syncing it from
  // Vendor Name.
  const [tradeNameTouched, setTradeNameTouched] = useState(!!editingVendor);

  useEffect(() => {
    setForm(editingVendor ? mapVendorToForm(editingVendor) : DEFAULT_FORM);
    setTradeNameTouched(!!editingVendor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingVendor?.id]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const setAddressField = (addressKey, key, val) =>
    setForm((f) => ({
      ...f,
      [addressKey]: { ...f[addressKey], [key]: val },
    }));

  const handleVendorNameChange = (val) => {
    setForm((f) => ({
      ...f,
      vendorName: val,
      tradeName: tradeNameTouched ? f.tradeName : val,
    }));
  };

  const handleTradeNameChange = (val) => {
    setTradeNameTouched(true);
    setField('tradeName', val);
  };

  const addBank = () =>
    setForm((f) => ({ ...f, banks: [...f.banks, makeBank()] }));
  const removeBank = (id) =>
    setForm((f) => ({ ...f, banks: f.banks.filter((b) => b.id !== id) }));
  const setBankField = (id, key, val) =>
    setForm((f) => ({
      ...f,
      banks: f.banks.map((b) => (b.id === id ? { ...b, [key]: val } : b)),
    }));

  // --- Organization (fetched by type = GROUP, assigned directly — no UI) ---
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchOrganizations = async () => {
      setLoadingOrganizations(true);
      try {
        const res = await getOrganizationByType(ORGANIZATION_TYPE);
        const list = extractList(res);
        if (!cancelled && list.length > 0) {
          setForm((f) =>
            f.organizationId ? f : { ...f, organizationId: list[0].id },
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingOrganizations(false);
      }
    };
    fetchOrganizations();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Role (fetched for the logged-in user) ---
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const userId = getUserIdFromToken();
        if (!userId) {
          if (!cancelled) setRoles([]);
          return;
        }
        const res = await getAllRoleMasterByUserId(userId);
        if (!cancelled) setRoles(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setRoles([]);
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };
    fetchRoles();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Countries (shared by all address sections) ---
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        const res = await getAllCountries();
        if (!cancelled) setCountries(extractList(res));
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    };
    fetchCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Common address: State / City lookups ---
  const [commonStates, setCommonStates] = useState([]);
  const [commonCities, setCommonCities] = useState([]);
  const [loadingCommonStates, setLoadingCommonStates] = useState(false);
  const [loadingCommonCities, setLoadingCommonCities] = useState(false);

  useEffect(() => {
    if (!form.commonAddress.countryId) {
      setCommonStates([]);
      return;
    }
    let cancelled = false;
    const fetchStates = async () => {
      setLoadingCommonStates(true);
      try {
        const res = await getStatesByCountry(form.commonAddress.countryId);
        if (!cancelled) setCommonStates(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setCommonStates([]);
      } finally {
        if (!cancelled) setLoadingCommonStates(false);
      }
    };
    fetchStates();
    return () => {
      cancelled = true;
    };
  }, [form.commonAddress.countryId]);

  useEffect(() => {
    if (!form.commonAddress.stateId) {
      setCommonCities([]);
      return;
    }
    let cancelled = false;
    const fetchCities = async () => {
      setLoadingCommonCities(true);
      try {
        const res = await getCitiesByState(form.commonAddress.stateId);
        if (!cancelled) setCommonCities(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setCommonCities([]);
      } finally {
        if (!cancelled) setLoadingCommonCities(false);
      }
    };
    fetchCities();
    return () => {
      cancelled = true;
    };
  }, [form.commonAddress.stateId]);

  // --- Billing address: State / City lookups ---
  const [billingStates, setBillingStates] = useState([]);
  const [billingCities, setBillingCities] = useState([]);
  const [loadingBillingStates, setLoadingBillingStates] = useState(false);
  const [loadingBillingCities, setLoadingBillingCities] = useState(false);

  useEffect(() => {
    if (!form.billingAddress.countryId) {
      setBillingStates([]);
      return;
    }
    let cancelled = false;
    const fetchStates = async () => {
      setLoadingBillingStates(true);
      try {
        const res = await getStatesByCountry(form.billingAddress.countryId);
        if (!cancelled) setBillingStates(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setBillingStates([]);
      } finally {
        if (!cancelled) setLoadingBillingStates(false);
      }
    };
    fetchStates();
    return () => {
      cancelled = true;
    };
  }, [form.billingAddress.countryId]);

  useEffect(() => {
    if (!form.billingAddress.stateId) {
      setBillingCities([]);
      return;
    }
    let cancelled = false;
    const fetchCities = async () => {
      setLoadingBillingCities(true);
      try {
        const res = await getCitiesByState(form.billingAddress.stateId);
        if (!cancelled) setBillingCities(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setBillingCities([]);
      } finally {
        if (!cancelled) setLoadingBillingCities(false);
      }
    };
    fetchCities();
    return () => {
      cancelled = true;
    };
  }, [form.billingAddress.stateId]);

  const [shippingStates, setShippingStates] = useState([]);
  const [shippingCities, setShippingCities] = useState([]);
  const [loadingShippingStates, setLoadingShippingStates] = useState(false);
  const [loadingShippingCities, setLoadingShippingCities] = useState(false);

  useEffect(() => {
    if (form.shippingSameAsBilling || !form.shippingAddress.countryId) {
      setShippingStates([]);
      return;
    }
    let cancelled = false;
    const fetchStates = async () => {
      setLoadingShippingStates(true);
      try {
        const res = await getStatesByCountry(form.shippingAddress.countryId);
        if (!cancelled) setShippingStates(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setShippingStates([]);
      } finally {
        if (!cancelled) setLoadingShippingStates(false);
      }
    };
    fetchStates();
    return () => {
      cancelled = true;
    };
  }, [form.shippingAddress.countryId, form.shippingSameAsBilling]);

  useEffect(() => {
    if (form.shippingSameAsBilling || !form.shippingAddress.stateId) {
      setShippingCities([]);
      return;
    }
    let cancelled = false;
    const fetchCities = async () => {
      setLoadingShippingCities(true);
      try {
        const res = await getCitiesByState(form.shippingAddress.stateId);
        if (!cancelled) setShippingCities(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setShippingCities([]);
      } finally {
        if (!cancelled) setLoadingShippingCities(false);
      }
    };
    fetchCities();
    return () => {
      cancelled = true;
    };
  }, [form.shippingAddress.stateId, form.shippingSameAsBilling]);

  // --- Common address handlers ---
  const handleCommonFieldChange = (key, val) =>
    setAddressField('commonAddress', key, val);

  const handleCommonCountryChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      commonAddress: {
        ...f.commonAddress,
        countryId: value,
        stateId: '',
        cityId: '',
      },
    }));
    setCommonStates([]);
    setCommonCities([]);
  };

  const handleCommonStateChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      commonAddress: { ...f.commonAddress, stateId: value, cityId: '' },
    }));
    setCommonCities([]);
  };

  const handleCommonCityChange = (e) =>
    setAddressField('commonAddress', 'cityId', e.target.value);

  // --- Billing address handlers ---
  const handleBillingFieldChange = (key, val) =>
    setAddressField('billingAddress', key, val);

  const handleBillingCountryChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      billingAddress: {
        ...f.billingAddress,
        countryId: value,
        stateId: '',
        cityId: '',
      },
    }));
    setBillingStates([]);
    setBillingCities([]);
  };

  const handleBillingStateChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      billingAddress: { ...f.billingAddress, stateId: value, cityId: '' },
    }));
    setBillingCities([]);
  };

  const handleBillingCityChange = (e) =>
    setAddressField('billingAddress', 'cityId', e.target.value);

  // --- Shipping address handlers ---
  const handleShippingFieldChange = (key, val) =>
    setAddressField('shippingAddress', key, val);

  const handleShippingCountryChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      shippingAddress: {
        ...f.shippingAddress,
        countryId: value,
        stateId: '',
        cityId: '',
      },
    }));
    setShippingStates([]);
    setShippingCities([]);
  };

  const handleShippingStateChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      shippingAddress: { ...f.shippingAddress, stateId: value, cityId: '' },
    }));
    setShippingCities([]);
  };

  const handleShippingCityChange = (e) =>
    setAddressField('shippingAddress', 'cityId', e.target.value);

  const handleRoleChange = (e) => setField('roleId', e.target.value);

  const handleSubmit = async () => {
    const payload = buildVendorPayload(form, { isEditMode, editingVendor });
    setSubmitError('');
    setSubmitting(true);
    try {
      if (isEditMode) {
        await updateVendor(payload);
      } else {
        await saveVendor(payload);
      }
      navigate('/vendors');
    } catch (err) {
      console.error(err);
      setSubmitError(
        err?.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'save'} vendor. Please try again.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndAddAnother = async () => {
    const payload = buildVendorPayload(form, { isEditMode, editingVendor });
    setSubmitError('');
    setSubmitting(true);
    try {
      await saveVendor(payload);
      setForm((f) => ({ ...DEFAULT_FORM, organizationId: f.organizationId }));
      setTradeNameTouched(false);
      setOpenSection(SECTIONS.PERSONAL);
    } catch (err) {
      console.error(err);
      setSubmitError(
        err?.response?.data?.message ||
          'Failed to save vendor. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-4 min-h-screen p-4 md:p-6">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Vendor Name</Label>
                <input
                  value={form.vendorName}
                  onChange={(e) => handleVendorNameChange(e.target.value)}
                  placeholder="Enter Vendor Name"
                  className={inputCls}
                />
              </div>
              <div>
                <Label required>Username</Label>
                <input
                  value={form.username}
                  onChange={(e) => setField('username', e.target.value)}
                  placeholder="Login username"
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Contact Person Name</Label>
                <input
                  value={form.contactPersonName}
                  onChange={(e) =>
                    setField('contactPersonName', e.target.value)
                  }
                  placeholder="Enter contact person name"
                  className={inputCls}
                />
              </div>
            </div>

            <div
              className={`grid ${isEditMode ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}
            >
              {isEditMode && (
                <div>
                  <Label>Vendor Code (Auto Generated)</Label>
                  <input
                    value={form.vendorCode}
                    disabled
                    className={inputCls}
                  />
                </div>
              )}

              <div>
                <Label>Company Name</Label>
                <input
                  value={form.tradeName}
                  onChange={(e) => handleTradeNameChange(e.target.value)}
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

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label required>Role</Label>
                <IdSelect
                  value={form.roleId}
                  onChange={handleRoleChange}
                  placeholder="Select Role"
                  options={roles}
                  loading={loadingRoles}
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

      {/* Common Address */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={Building2}
          title="Common Address"
          subtitle="A general address on record for this vendor"
          open={openSection === SECTIONS.COMMON}
          onToggle={() => toggleSection(SECTIONS.COMMON)}
        />

        {openSection === SECTIONS.COMMON && (
          <div className="px-6 py-6 space-y-4">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMapPickerTarget('commonAddress')}
                className="flex items-center gap-1 text-[#084E92] cursor-pointer bg-transparent border-0 p-0"
              >
                <Map size={13} />
                <span className="text-xs font-semibold">Pick from Map</span>
              </button>
            </div>

            <AddressFields
              address={form.commonAddress}
              onFieldChange={handleCommonFieldChange}
              onCountryChange={handleCommonCountryChange}
              onStateChange={handleCommonStateChange}
              onCityChange={handleCommonCityChange}
              countries={countries}
              loadingCountries={loadingCountries}
              states={commonStates}
              loadingStates={loadingCommonStates}
              cities={commonCities}
              loadingCities={loadingCommonCities}
            />
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
              <SubHeading icon={RefreshCw} title="GST Information" />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label required>GSTIN / UIN</Label>
                  <input
                    value={form.gstin}
                    onChange={(e) =>
                      setField('gstin', e.target.value.toUpperCase())
                    }
                    placeholder="22AAAAA0000A1Z5"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label required>Company Name (as per GST)</Label>
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

              <div className="flex items-center max-w-1/3 justify-between border border-gray-200 rounded-lg px-4 py-3">
                <span className="text-sm font-medium text-gray-700">
                  This vendor is MSME Registered
                </span>
                <Toggle
                  checked={form.msmeRegistered}
                  onChange={(v) => setField('msmeRegistered', v)}
                />
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
                    options={['INR - Indian Rupee']}
                  />
                </div>
                <div>
                  <Label>Accounts Payable</Label>
                  <Select
                    value={form.accountsPayable}
                    onChange={(e) =>
                      setField('accountsPayable', e.target.value)
                    }
                    placeholder="Select account"
                    options={['Trade Creditors']}
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
                    options={[
                      'Due on Receipt',
                      'Net 15',
                      'Net 30',
                      'Net 45',
                      'Net 60',
                    ]}
                  />
                </div>
                <div>
                  <Label>TDS Applicability</Label>
                  <Select
                    value={form.tdsApplicability}
                    onChange={(e) =>
                      setField('tdsApplicability', e.target.value)
                    }
                    placeholder="Select TDS"
                    options={[
                      'No TDS',
                      '194C - Contractor',
                      '194J - Professional Fees',
                      '194I - Rent',
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Address Details — Billing & Shipping side by side */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={MapPin}
          title="Address Details"
          subtitle="Billing and shipping addresses for this vendor"
          open={openSection === SECTIONS.ADDRESS}
          onToggle={() => toggleSection(SECTIONS.ADDRESS)}
        />

        {openSection === SECTIONS.ADDRESS && (
          <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Billing Address card */}
            <div className="border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-800">
                  <h3 className="text-sm font-bold">Billing Address</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMapPickerTarget('billingAddress')}
                  className="flex items-center gap-1 text-[#084E92] cursor-pointer bg-transparent border-0 p-0"
                >
                  <Map size={13} />
                  <span className="text-xs font-semibold">Pick from Map</span>
                </button>
              </div>

              <AddressFields
                address={form.billingAddress}
                onFieldChange={handleBillingFieldChange}
                onCountryChange={handleBillingCountryChange}
                onStateChange={handleBillingStateChange}
                onCityChange={handleBillingCityChange}
                countries={countries}
                loadingCountries={loadingCountries}
                states={billingStates}
                loadingStates={loadingBillingStates}
                cities={billingCities}
                loadingCities={loadingBillingCities}
              />
            </div>

            {/* Shipping Address card */}
            <div className="border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-800">
                  <h3 className="text-sm font-bold">Shipping Address</h3>
                </div>
                <div className="flex items-center gap-3">
                  {!form.shippingSameAsBilling && (
                    <button
                      type="button"
                      onClick={() => setMapPickerTarget('shippingAddress')}
                      className="flex items-center gap-1 text-[#084E92] cursor-pointer bg-transparent border-0 p-0"
                    >
                      <Map size={13} />
                      <span className="text-xs font-semibold">
                        Pick from Map
                      </span>
                    </button>
                  )}
                  <Checkbox
                    checked={form.shippingSameAsBilling}
                    onChange={(v) => setField('shippingSameAsBilling', v)}
                    label="Same as Billing Address"
                  />
                </div>
              </div>

              <AddressFields
                address={
                  form.shippingSameAsBilling
                    ? form.billingAddress
                    : form.shippingAddress
                }
                onFieldChange={handleShippingFieldChange}
                onCountryChange={handleShippingCountryChange}
                onStateChange={handleShippingStateChange}
                onCityChange={handleShippingCityChange}
                countries={countries}
                loadingCountries={loadingCountries}
                states={
                  form.shippingSameAsBilling ? billingStates : shippingStates
                }
                loadingStates={
                  form.shippingSameAsBilling
                    ? loadingBillingStates
                    : loadingShippingStates
                }
                cities={
                  form.shippingSameAsBilling ? billingCities : shippingCities
                }
                loadingCities={
                  form.shippingSameAsBilling
                    ? loadingBillingCities
                    : loadingShippingCities
                }
                disabled={form.shippingSameAsBilling}
              />
            </div>
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
              <div
                key={bank.id}
                className="border border-gray-200 rounded-xl p-5 space-y-4 relative"
              >
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
                      onChange={(e) =>
                        setBankField(
                          bank.id,
                          'accountHolderName',
                          e.target.value,
                        )
                      }
                      placeholder="As per bank records"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <Label required>Bank Name</Label>
                    <input
                      value={bank.bankName}
                      onChange={(e) =>
                        setBankField(bank.id, 'bankName', e.target.value)
                      }
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
                      onChange={(e) =>
                        setBankField(bank.id, 'accountNumber', e.target.value)
                      }
                      placeholder="0000 0000 0000"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <Label required>Re-enter Account Number</Label>
                    <input
                      value={bank.reAccountNumber}
                      onChange={(e) =>
                        setBankField(bank.id, 'reAccountNumber', e.target.value)
                      }
                      placeholder="0000 0000 0000"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <Label required>IFSC Code</Label>
                  <input
                    value={bank.ifsc}
                    onChange={(e) =>
                      setBankField(
                        bank.id,
                        'ifsc',
                        e.target.value.toUpperCase(),
                      )
                    }
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
        {submitError && (
          <p className="text-sm text-red-600 mr-auto">{submitError}</p>
        )}
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg border border-[#737781] text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
        </button>
      </div>

      {mapPickerTarget && (
        <MapPickerModal
          initialLat={form[mapPickerTarget].latitude}
          initialLng={form[mapPickerTarget].longitude}
          onClose={() => setMapPickerTarget(null)}
          onConfirm={({ lat, lng }) => {
            setAddressField(mapPickerTarget, 'latitude', lat.toFixed(6));
            setAddressField(mapPickerTarget, 'longitude', lng.toFixed(6));
            setMapPickerTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default VendorRegistration;
