import React, { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { getUserIdFromToken } from '@/utils/auth';
import { notify, getApiErrorMessage } from '@/utils/toast';
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
  getVendorById,
} from '@/services/apiServices';
import {
  buildVendorPayload,
  DEFAULT_FORM,
  extractList,
  makeBank,
  mapVendorToForm,
} from './vendorHelper';
import {
  validateRequired,
  validateEmail,
  validateMobile,
  validatePincode,
  validateGSTIN,
  validateMSMEType,
  validateMSMENumber,
  validateAccountHolderName,
  validateBankName,
  validateAccountNumber,
  validateReAccountNumber,
  validateIFSC,
  validateIFSCBankMatch,
  lookupIFSC,
} from '@/utils/validations';
import SearchableSelect from '../../utils/SearchableSelect';



const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

const errorInputCls = 'border-red-300 focus:border-red-400 focus:ring-red-200';

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

// Red error message rendered directly under an input. Renders nothing when empty.
const ErrorText = ({ error }) =>
  error ? <p className="text-xs text-red-500 mt-1">{error}</p> : null;

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
      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'
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

const SectionHeader = ({ icon: Icon, title, subtitle, open, onToggle, hasError }) => (
  <div
    className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 cursor-pointer select-none"
    onClick={onToggle}
  >
    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1">
      <h2 className="text-sm font-bold text-gray-800 leading-none flex items-center gap-2">
        {title}
        {hasError && (
          <span className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
            Fix errors
          </span>
        )}
      </h2>
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
  errors = {},
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label required>Country</Label>
        <SearchableSelect
          name="country"
          value={address.countryId}
          onChange={onCountryChange}
          options={countries.map((country) => ({
            value: country.id,
            label: country.name,
          }))}
          placeholder="Select Country"
        />
        <ErrorText error={errors.countryId} />
      </div>
      <div>
        <Label required>State</Label>
        <SearchableSelect
          name="state"
          value={address.stateId}
          onChange={onStateChange}
          options={states.map((state) => ({
            value: state.id,
            label: state.name,
          }))}
          placeholder="Select State"
          disabled={!address.countryId}
        />
        <ErrorText error={errors.stateId} />
      </div>
    </div>

    <div>
      <Label required>Address Line 1</Label>
      <input
        value={address.addressLine1}
        onChange={(e) => onFieldChange('addressLine1', e.target.value)}
        placeholder="Building, Street Name"
        className={`${inputCls} ${errors.addressLine1 ? errorInputCls : ''}`}
        disabled={disabled}
      />
      <ErrorText error={errors.addressLine1} />
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
        <SearchableSelect
          name="city"
          value={address.cityId}
          onChange={onCityChange}
          options={cities.map((city) => ({
            value: city.id,
            label: city.name,
          }))}
          placeholder="Select City"
          disabled={!address.stateId}
        />
        <ErrorText error={errors.cityId} />
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
          className={`${inputCls} ${errors.pincode ? errorInputCls : ''}`}
          disabled={disabled}
        />
        <ErrorText error={errors.pincode} />
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

const validateAddressFields = (address) => {
  const e = {};
  const countryErr = validateRequired(address.countryId, 'Country');
  const stateErr = validateRequired(address.stateId, 'State');
  const line1Err = validateRequired(address.addressLine1, 'Address Line 1');
  const cityErr = validateRequired(address.cityId, 'City');
  const pincodeErr = validatePincode(address.pincode);
  if (countryErr) e.countryId = countryErr;
  if (stateErr) e.stateId = stateErr;
  if (line1Err) e.addressLine1 = line1Err;
  if (cityErr) e.cityId = cityErr;
  if (pincodeErr) e.pincode = pincodeErr;
  return e;
};

// Per-field validation used for live (as-you-type / as-you-select) checks on
// a single address field, mirroring validateAddressFields above.
const validateAddressFieldValue = (field, value) => {
  switch (field) {
    case 'countryId':
      return validateRequired(value, 'Country');
    case 'stateId':
      return validateRequired(value, 'State');
    case 'addressLine1':
      return validateRequired(value, 'Address Line 1');
    case 'cityId':
      return validateRequired(value, 'City');
    case 'pincode':
      return validatePincode(value);
    default:
      return '';
  }
};

const sectionForKey = (key) => {
  if (key.startsWith('commonAddress.')) return SECTIONS.COMMON;
  if (key.startsWith('billingAddress.') || key.startsWith('shippingAddress.'))
    return SECTIONS.ADDRESS;
  if (['gstin', 'gstCompanyName', 'msmeType', 'msmeNumber'].includes(key))
    return SECTIONS.BUSINESS;
  return SECTIONS.PERSONAL;
};

const VendorRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const vendorId = location.state?.vendorId || location.state?.vendor?.id || null;
  const isEditMode = !!vendorId;

  const [editingVendor, setEditingVendor] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Top-level + nested field errors. Nested address errors use
  // "commonAddress.pincode" style keys.
  const [errors, setErrors] = useState({});
  // Bank-row errors keyed by bank.id: { [bankId]: { field: message } }
  const [bankErrors, setBankErrors] = useState({});

  const [openSection, setOpenSection] = useState(SECTIONS.PERSONAL);
  const toggleSection = (key) =>
    setOpenSection((prev) => (prev === key ? null : key));

  // Which address the map picker modal is currently editing.
  const [mapPickerTarget, setMapPickerTarget] = useState(null); // 'commonAddress' | 'billingAddress' | 'shippingAddress' | null

  const [form, setForm] = useState(DEFAULT_FORM);
  const [savedTermsContent, setSavedTermsContent] = useState('');

  // Once the user manually edits Company Name, stop auto-syncing it from
  // Vendor Name.
  const [tradeNameTouched, setTradeNameTouched] = useState(false);

  useEffect(() => {
    if (vendorId) {
      let cancelled = false;
      const fetchVendor = async () => {
        setLoadingVendor(true);
        try {
          const res = await getVendorById(vendorId);
          const data = res?.data?.data ?? res?.data ?? res;
          if (!cancelled) {
            setEditingVendor(data);
            const mapped = mapVendorToForm(data);
            setForm(mapped);
            setSavedTermsContent(mapped.termsAndConditions);
            setTradeNameTouched(true);

            // Auto-trigger IFSC lookup for loaded banks to populate branch name
            mapped.banks.forEach((bank) => {
              if (bank.ifsc && !validateIFSC(bank.ifsc)) {
                lookupIFSC(bank.ifsc).then((result) => {
                  if (result) {
                    setBankField(bank.id, 'bankBranch', result.branch);
                  }
                });
              }
            });
          }
        } catch (err) {
          console.error("Failed to load vendor details:", err);
          if (!cancelled) {
            setSubmitError("Failed to load vendor details. Please try again.");
          }
        } finally {
          if (!cancelled) setLoadingVendor(false);
        }
      };
      fetchVendor();
      return () => {
        cancelled = true;
      };
    } else {
      setEditingVendor(null);
      setForm(DEFAULT_FORM);
      setSavedTermsContent('');
      setTradeNameTouched(false);
    }
    setErrors({});
    setBankErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const setAddressField = (addressKey, key, val) =>
    setForm((f) => ({
      ...f,
      [addressKey]: { ...f[addressKey], [key]: val },
    }));

  // Sets or clears a single top-level error. Pass an empty/falsy `err` to
  // clear. Used for live validation as the user types or selects.
  const setErrorFor = (key, err) =>
    setErrors((prev) => {
      if (!err) {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: err };
    });

  // Sets or clears a single nested address error, e.g. "commonAddress.pincode".
  const setAddressErrorFor = (addressKey, field, err) =>
    setErrorFor(`${addressKey}.${field}`, err);

  // Sets or clears a single bank-row error.
  const setBankErrorFor = (bankId, field, err) =>
    setBankErrors((prev) => {
      if (!err) {
        if (!prev[bankId]?.[field]) return prev;
        const next = { ...prev, [bankId]: { ...prev[bankId] } };
        delete next[bankId][field];
        if (Object.keys(next[bankId]).length === 0) delete next[bankId];
        return next;
      }
      return { ...prev, [bankId]: { ...prev[bankId], [field]: err } };
    });

  const handleVendorNameChange = (val) => {
    setForm((f) => ({
      ...f,
      vendorName: val,
      tradeName: tradeNameTouched ? f.tradeName : val,
    }));
    setErrorFor('vendorName', validateRequired(val, 'Vendor Name'));
  };

  const handleTradeNameChange = (val) => {
    setTradeNameTouched(true);
    setField('tradeName', val);
  };

  const addBank = () =>
    setForm((f) => ({ ...f, banks: [...f.banks, makeBank()] }));
  const removeBank = (id) => {
    setForm((f) => ({ ...f, banks: f.banks.filter((b) => b.id !== id) }));
    setBankErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const setBankField = (id, key, val) =>
    setForm((f) => ({
      ...f,
      banks: f.banks.map((b) => (b.id === id ? { ...b, [key]: val } : b)),
    }));

const [ifscLoading, setIfscLoading] = useState({}); // { [bankId]: boolean }

const handleIfscBlur = async (bankId, ifscValue) => {
  const formatErr = validateIFSC(ifscValue);
  setBankErrorFor(bankId, 'ifsc', formatErr);
  if (formatErr) {
    setBankField(bankId, 'bankName', '');
    setBankField(bankId, 'bankBranch', '');
    return;
  }

  setIfscLoading((prev) => ({ ...prev, [bankId]: true }));
  try {
    const result = await lookupIFSC(ifscValue);
    if (!result) {
      setBankErrorFor(bankId, 'ifsc', 'This IFSC code was not found. Please check and re-enter.');
      setBankField(bankId, 'bankName', '');
      setBankField(bankId, 'bankBranch', '');
      return;
    }
    setBankErrorFor(bankId, 'ifsc', '');
    setBankErrorFor(bankId, 'bankName', '');
    setBankField(bankId, 'bankName', result.bank);
    setBankField(bankId, 'bankBranch', result.branch);
  } finally {
    setIfscLoading((prev) => ({ ...prev, [bankId]: false }));
  }
};

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
  const handleCommonFieldChange = (key, val) => {
    setAddressField('commonAddress', key, val);
    setAddressErrorFor('commonAddress', key, validateAddressFieldValue(key, val));
  };

  // --- Common address country/state/city handlers ---

  const handleCommonCountryChange = (e) => {
    const countryId = e.target.value;
    setForm((prev) => ({
      ...prev,
      commonAddress: {
        ...prev.commonAddress,
        countryId: countryId,
        stateId: "",
        cityId: "",
      },
    }));
    setCommonStates([]);
    setCommonCities([]);
    setAddressErrorFor('commonAddress', 'countryId', validateRequired(countryId, 'Country'));
    // States are fetched reactively by the useEffect watching form.commonAddress.countryId
  };

  const handleCommonStateChange = (e) => {
    const stateId = e.target.value;
    setForm((prev) => ({
      ...prev,
      commonAddress: {
        ...prev.commonAddress,
        stateId: stateId,
        cityId: "",
      },
    }));
    setCommonCities([]);
    setAddressErrorFor('commonAddress', 'stateId', validateRequired(stateId, 'State'));
    // City list is fetched reactively by the useEffect watching form.commonAddress.stateId
  };
  const handleCommonCityChange = (e) => {
    const cityId = e.target.value;
    setAddressField('commonAddress', 'cityId', cityId);
    setAddressErrorFor('commonAddress', 'cityId', validateRequired(cityId, 'City'));
  };
  // --- Billing address handlers ---
  const handleBillingFieldChange = (key, val) => {
    setAddressField('billingAddress', key, val);
    setAddressErrorFor('billingAddress', key, validateAddressFieldValue(key, val));
  };

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
    setAddressErrorFor('billingAddress', 'countryId', validateRequired(value, 'Country'));
  };

  const handleBillingStateChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      billingAddress: { ...f.billingAddress, stateId: value, cityId: '' },
    }));
    setBillingCities([]);
    setAddressErrorFor('billingAddress', 'stateId', validateRequired(value, 'State'));
  };

  const handleBillingCityChange = (e) => {
    const value = e.target.value;
    setAddressField('billingAddress', 'cityId', value);
    setAddressErrorFor('billingAddress', 'cityId', validateRequired(value, 'City'));
  };

  // --- Shipping address handlers ---
  const handleShippingFieldChange = (key, val) => {
    setAddressField('shippingAddress', key, val);
    setAddressErrorFor('shippingAddress', key, validateAddressFieldValue(key, val));
  };

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
    setAddressErrorFor('shippingAddress', 'countryId', validateRequired(value, 'Country'));
  };

  const handleShippingStateChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      shippingAddress: { ...f.shippingAddress, stateId: value, cityId: '' },
    }));
    setShippingCities([]);
    setAddressErrorFor('shippingAddress', 'stateId', validateRequired(value, 'State'));
  };

  const handleShippingCityChange = (e) => {
    const value = e.target.value;
    setAddressField('shippingAddress', 'cityId', value);
    setAddressErrorFor('shippingAddress', 'cityId', validateRequired(value, 'City'));
  };

  const handleRoleChange = (e) => {
    const value = e.target.value;
    setField('roleId', value);
    setErrorFor('roleId', validateRequired(value, 'Role'));
  };


  const runValidation = () => {
    const formErrors = {};

    const vendorNameErr = validateRequired(form.vendorName, 'Vendor Name');
    if (vendorNameErr) formErrors.vendorName = vendorNameErr;

    const usernameErr = validateRequired(form.username, 'Username');
    if (usernameErr) formErrors.username = usernameErr;

    const emailErr = validateEmail(form.email);
    if (emailErr) formErrors.email = emailErr;

    const mobileErr = validateMobile(form.mobile);
    if (mobileErr) formErrors.mobile = mobileErr;

    const roleErr = validateRequired(form.roleId, 'Role');
    if (roleErr) formErrors.roleId = roleErr;

    // Password is optional in edit/update mode — only validate if the user has typed something.
    if (!isEditMode && form.password === '' ) {
      // new vendor: do nothing — password field is not shown on add form
    } else if (isEditMode && form.password && form.password.trim() !== '') {
      // edit mode: only validate format if the user started typing a new password
      const passwordErr = validateRequired(form.password, 'Password');
      if (passwordErr) formErrors.password = passwordErr;
    }

    const commonAddrErrors = validateAddressFields(form.commonAddress);
    Object.entries(commonAddrErrors).forEach(([k, v]) => {
      formErrors[`commonAddress.${k}`] = v;
    });

    const gstinErr = validateGSTIN(form.gstin);
    if (gstinErr) formErrors.gstin = gstinErr;

    const gstCompanyNameErr = validateRequired(
      form.gstCompanyName,
      'Company Name (as per GST)',
    );
    if (gstCompanyNameErr) formErrors.gstCompanyName = gstCompanyNameErr;

    if (form.msmeRegistered) {
      const msmeTypeErr = validateMSMEType(form.msmeType, true);
      if (msmeTypeErr) formErrors.msmeType = msmeTypeErr;

      const msmeNumberErr = validateMSMENumber(form.msmeNumber, true);
      if (msmeNumberErr) formErrors.msmeNumber = msmeNumberErr;
    }

    const billingErrors = validateAddressFields(form.billingAddress);
    Object.entries(billingErrors).forEach(([k, v]) => {
      formErrors[`billingAddress.${k}`] = v;
    });

    if (!form.shippingSameAsBilling) {
      const shippingErrors = validateAddressFields(form.shippingAddress);
      Object.entries(shippingErrors).forEach(([k, v]) => {
        formErrors[`shippingAddress.${k}`] = v;
      });
    }

    const bankErrs = {};
    form.banks.forEach((bank) => {
      const be = {};
      const nameErr = validateAccountHolderName(bank.accountHolderName);
      const bankNameErr = validateBankName(bank.bankName);
      const acctErr = validateAccountNumber(bank.accountNumber);
      const reAcctErr = validateReAccountNumber(
        bank.reAccountNumber,
        bank.accountNumber,
      );
      const ifscFormatErr = validateIFSC(bank.ifsc);

      if (nameErr) be.accountHolderName = nameErr;
      if (bankNameErr) be.bankName = bankNameErr;
      if (acctErr) be.accountNumber = acctErr;
      if (reAcctErr) be.reAccountNumber = reAcctErr;

      if (ifscFormatErr) {
        be.ifsc = ifscFormatErr;
      } else if (!bankNameErr) {
        const matchErr = validateIFSCBankMatch(bank.ifsc, bank.bankName);
        if (matchErr) be.ifsc = matchErr;
      }

      if (Object.keys(be).length > 0) {
        bankErrs[bank.id] = be;
      }
    });

    return { formErrors, bankErrs };
  };

  const applyValidationResult = (formErrors, bankErrs) => {
    setErrors(formErrors);
    setBankErrors(bankErrs);
    const hasErrors =
      Object.keys(formErrors).length > 0 || Object.keys(bankErrs).length > 0;

    if (hasErrors) {
      setSubmitError('Please fix the highlighted errors before saving.');
      if (Object.keys(bankErrs).length > 0) {
        setOpenSection(SECTIONS.BANK);
      } else {
        const firstKey = Object.keys(formErrors)[0];
        setOpenSection(sectionForKey(firstKey));
      }
    }
    return hasErrors;
  };

  const handleSubmit = async () => {
    setSubmitError('');
    const { formErrors, bankErrs } = runValidation();
    if (applyValidationResult(formErrors, bankErrs)) return;

    const payload = buildVendorPayload(form, { isEditMode, editingVendor });
    setSubmitting(true);
    try {
      if (isEditMode) {
        await updateVendor(payload);
      } else {
        await saveVendor(payload);
      }
      notify.success(`Vendor ${isEditMode ? 'updated' : 'created'} successfully`);
      navigate('/vendors');
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(err, `Failed to ${isEditMode ? 'update' : 'save'} vendor. Please try again.`);
      setSubmitError(msg);
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndAddAnother = async () => {
    setSubmitError('');
    const { formErrors, bankErrs } = runValidation();
    if (applyValidationResult(formErrors, bankErrs)) return;

    const payload = buildVendorPayload(form, { isEditMode, editingVendor });
    setSubmitting(true);
    try {
      await saveVendor(payload);
      notify.success('Vendor created successfully');
      setForm((f) => ({ ...DEFAULT_FORM, organizationId: f.organizationId }));
      setSavedTermsContent('');
      setTradeNameTouched(false);
      setErrors({});
      setBankErrors({});
      setOpenSection(SECTIONS.PERSONAL);
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(err, 'Failed to save vendor. Please try again.');
      setSubmitError(msg);
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const personalSectionHasError = [
    'vendorName',
    'username',
    'email',
    'mobile',
    'roleId',
    'password',
  ].some((k) => errors[k]);
  const commonSectionHasError = Object.keys(errors).some((k) =>
    k.startsWith('commonAddress.'),
  );
  const businessSectionHasError = ['gstin', 'gstCompanyName', 'msmeType', 'msmeNumber'].some(
    (k) => errors[k],
  );
  const addressSectionHasError = Object.keys(errors).some(
    (k) => k.startsWith('billingAddress.') || k.startsWith('shippingAddress.'),
  );
  const bankSectionHasError = Object.keys(bankErrors).length > 0;

  if (loadingVendor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50">
        <RefreshCw className="w-8 h-8 text-[#084E92] animate-spin mb-2" />
        <p className="text-sm font-medium text-gray-500">Loading vendor details...</p>
      </div>
    );
  }

  return (
    <div className="mx-4 min-h-screen p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
          {isEditMode ? 'Update Vendor' : 'Vendor Registration'}
        </h1>
        <p className="text-[#43474F]">
          {isEditMode
            ? `Update the account details for ${editingVendor?.fullName ?? editingVendor?.name ?? 'this vendor'}.`
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
          hasError={personalSectionHasError}
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
                  className={`${inputCls} ${errors.vendorName ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.vendorName} />
              </div>
              <div>
                <Label required>Username</Label>
                <input
                  value={form.username}
                  onChange={(e) => {
                    const val = e.target.value;
                    setField('username', val);
                    setErrorFor('username', validateRequired(val, 'Username'));
                  }}
                  placeholder="Login username"
                  className={`${inputCls} ${errors.username ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.username} />
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setField('email', val);
                    setErrorFor('email', validateEmail(val));
                  }}
                  placeholder="example@jaiswalgroup.com"
                  className={`${inputCls} ${errors.email ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.email} />
              </div>
              <div>
                <Label required>Mobile Number</Label>
                <input
                  value={form.mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setField('mobile', val);
                    setErrorFor('mobile', validateMobile(val));
                  }}
                  placeholder="+91 00000 00000"
                  maxLength={10}
                  className={`${inputCls} ${errors.mobile ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.mobile} />
              </div>
              <div>
                <Label>Alternate Mobile Number</Label>
                <input
                  value={form.altMobile}
                  onChange={(e) =>
                    setField('altMobile', e.target.value.replace(/\D/g, ''))
                  }
                  placeholder="+91 00000 00000"
                  maxLength={10}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label required>Role</Label>
                <SearchableSelect
                  name="role"
                  value={form.roleId}
                  onChange={handleRoleChange}
                  options={roles.map((role) => ({
                    value: role.id,
                    label: role.name,
                  }))}
                  placeholder={loadingRoles ? 'Loading...' : 'Select Role'}
                  disabled={loadingRoles}
                  error={!!errors.roleId}
                />
                <ErrorText error={errors.roleId} />
              </div>
            </div>


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
          hasError={commonSectionHasError}
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
              errors={{
                countryId: errors['commonAddress.countryId'],
                stateId: errors['commonAddress.stateId'],
                addressLine1: errors['commonAddress.addressLine1'],
                cityId: errors['commonAddress.cityId'],
                pincode: errors['commonAddress.pincode'],
              }}
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
          hasError={businessSectionHasError}
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
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setField('gstin', val);
                      setErrorFor('gstin', validateGSTIN(val));
                    }}
                    placeholder="22AAAAA0000A1Z5"
                    className={`${inputCls} ${errors.gstin ? errorInputCls : ''}`}
                  />
                  <ErrorText error={errors.gstin} />
                </div>
                <div>
                  <Label required>Company Name (as per GST)</Label>
                  <input
                    value={form.gstCompanyName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setField('gstCompanyName', val);
                      setErrorFor(
                        'gstCompanyName',
                        validateRequired(val, 'Company Name (as per GST)'),
                      );
                    }}
                    placeholder="Company Name"
                    className={`${inputCls} ${errors.gstCompanyName ? errorInputCls : ''}`}
                  />
                  <ErrorText error={errors.gstCompanyName} />
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
                  onChange={(v) => {
                    setField('msmeRegistered', v);
                    if (!v) {
                      setErrorFor('msmeType', '');
                      setErrorFor('msmeNumber', '');
                    }
                  }}
                />
              </div>

              {form.msmeRegistered && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>MSME/Udyam Registration Type</Label>
                    <SearchableSelect
                      name="msmeType"
                      value={form.msmeType}
                      onChange={(e) => {
                        const value = e.target.value;
                        setField('msmeType', value);
                        setErrorFor('msmeType', validateMSMEType(value, true));
                      }}
                      options={['Micro', 'Small', 'Medium'].map((v) => ({
                        value: v,
                        label: v,
                      }))}
                      placeholder="Select the Registration type"
                      error={!!errors.msmeType}
                    />
                    <ErrorText error={errors.msmeType} />
                  </div>
                  <div>
                    <Label required>MSME/Udyam Registration Number</Label>
                    <input
                      value={form.msmeNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setField('msmeNumber', val);
                        setErrorFor('msmeNumber', validateMSMENumber(val, true));
                      }}
                      placeholder="UDYAM-GJ-01-1234567"
                      className={`${inputCls} ${errors.msmeNumber ? errorInputCls : ''}`}
                    />
                    <ErrorText error={errors.msmeNumber} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Currency</Label>
                  <SearchableSelect
                    name="currency"
                    value={form.currency}
                    onChange={(e) => setField('currency', e.target.value)}
                    options={['INR - Indian Rupee'].map((v) => ({
                      value: v,
                      label: v,
                    }))}
                    placeholder="Select currency"
                  />
                </div>
                <div>
                  <Label>Accounts Payable</Label>
                  <SearchableSelect
                    name="accountsPayable"
                    value={form.accountsPayable}
                    onChange={(e) => setField('accountsPayable', e.target.value)}
                    options={['Trade Creditors'].map((v) => ({
                      value: v,
                      label: v,
                    }))}
                    placeholder="Select account"
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
                  <SearchableSelect
                    name="paymentTerms"
                    value={form.paymentTerms}
                    onChange={(e) => setField('paymentTerms', e.target.value)}
                    options={[
                      'Due on Receipt',
                      'Net 15',
                      'Net 30',
                      'Net 45',
                      'Net 60',
                    ].map((v) => ({ value: v, label: v }))}
                    placeholder="Select terms"
                  />
                </div>
                <div>
                  <Label>TDS Applicability</Label>
                  <SearchableSelect
                    name="tdsApplicability"
                    value={form.tdsApplicability}
                    onChange={(e) => setField('tdsApplicability', e.target.value)}
                    options={[
                      'No TDS',
                      '194C - Contractor',
                      '194J - Professional Fees',
                      '194I - Rent',
                    ].map((v) => ({ value: v, label: v }))}
                    placeholder="Select TDS"
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
          hasError={addressSectionHasError}
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
                errors={{
                  countryId: errors['billingAddress.countryId'],
                  stateId: errors['billingAddress.stateId'],
                  addressLine1: errors['billingAddress.addressLine1'],
                  cityId: errors['billingAddress.cityId'],
                  pincode: errors['billingAddress.pincode'],
                }}
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
                onFieldChange={
                  form.shippingSameAsBilling
                    ? handleBillingFieldChange
                    : handleShippingFieldChange
                }
                onCountryChange={
                  form.shippingSameAsBilling
                    ? handleBillingCountryChange
                    : handleShippingCountryChange
                }
                onStateChange={
                  form.shippingSameAsBilling
                    ? handleBillingStateChange
                    : handleShippingStateChange
                }
                onCityChange={
                  form.shippingSameAsBilling
                    ? handleBillingCityChange
                    : handleShippingCityChange
                }
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
                errors={
                  form.shippingSameAsBilling
                    ? {}
                    : {
                      countryId: errors['shippingAddress.countryId'],
                      stateId: errors['shippingAddress.stateId'],
                      addressLine1: errors['shippingAddress.addressLine1'],
                      cityId: errors['shippingAddress.cityId'],
                      pincode: errors['shippingAddress.pincode'],
                    }
                }
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
          hasError={bankSectionHasError}
        />

        {openSection === SECTIONS.BANK && (
          <div className="px-6 py-6 space-y-4">
            {form.banks.map((bank) => {
              const be = bankErrors[bank.id] || {};
              return (
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
                        onChange={(e) => {
                          const val = e.target.value;
                          setBankField(bank.id, 'accountHolderName', val);
                          setBankErrorFor(
                            bank.id,
                            'accountHolderName',
                            validateAccountHolderName(val),
                          );
                        }}
                        placeholder="As per bank records"
                        className={`${inputCls} ${be.accountHolderName ? errorInputCls : ''
                          }`}
                      />
                      <ErrorText error={be.accountHolderName} />
                    </div>
              <div>
                      <Label required>Bank Name</Label>
                      <input
                        value={bank.bankName}
                        disabled
                        placeholder={ifscLoading[bank.id] ? 'Looking up bank…' : 'Auto-filled from IFSC'}
                        className={`${inputCls} ${be.bankName ? errorInputCls : ''}`}
                      />
                      <ErrorText error={be.bankName} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label required>Account Number</Label>
                      <input
                        value={bank.accountNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setBankField(bank.id, 'accountNumber', val);
                          setBankErrorFor(
                            bank.id,
                            'accountNumber',
                            validateAccountNumber(val),
                          );
                          if (bank.reAccountNumber) {
                            setBankErrorFor(
                              bank.id,
                              'reAccountNumber',
                              validateReAccountNumber(bank.reAccountNumber, val),
                            );
                          }
                        }}
                        placeholder="0000 0000 0000"
                        className={`${inputCls} ${be.accountNumber ? errorInputCls : ''
                          }`}
                      />
                      <ErrorText error={be.accountNumber} />
                    </div>
                    <div>
                      <Label required>Re-enter Account Number</Label>
                      <input
                        value={bank.reAccountNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setBankField(bank.id, 'reAccountNumber', val);
                          setBankErrorFor(
                            bank.id,
                            'reAccountNumber',
                            validateReAccountNumber(val, bank.accountNumber),
                          );
                        }}
                        placeholder="0000 0000 0000"
                        className={`${inputCls} ${be.reAccountNumber ? errorInputCls : ''
                          }`}
                      />
                      <ErrorText error={be.reAccountNumber} />
                    </div>
                  </div>
                 <div>
  <div>
    <Label required>IFSC Code</Label>
    <input
      value={bank.ifsc}
      onChange={(e) => {
        const val = e.target.value.toUpperCase();
        setBankField(bank.id, 'ifsc', val);
        setBankErrorFor(bank.id, 'ifsc', validateIFSC(val));
      }}
      onBlur={(e) => handleIfscBlur(bank.id, e.target.value)}
      disabled={ifscLoading[bank.id]}
      placeholder="HDFC0000123"
      className={`${inputCls} ${be.ifsc ? errorInputCls : ''}`}
    />
    <ErrorText error={be.ifsc} />
    {ifscLoading[bank.id] && (
      <p className="text-xs text-gray-400 mt-1">Verifying IFSC…</p>
    )}
  </div>
</div>
                </div>
              );
            })}

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

      {/* Terms & Conditions */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={ClipboardList}
          title="Terms & Conditions"
          subtitle="Add the terms and conditions applicable to this vendor"
          open={openSection === 'terms'}
          onToggle={() => toggleSection('terms')}
        />

        <div className={openSection === 'terms' ? 'block' : 'hidden'}>
          <div className="px-6 py-6 space-y-4">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Rich text editor
                </span>
                <span className="text-xs text-gray-400">Format your vendor terms</span>
              </div>
              <ReactQuill
                theme="snow"
                value={form.termsAndConditions}
                onChange={(value) => setField('termsAndConditions', value)}
                placeholder="Write the terms and conditions for this vendor..."
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ list: 'bullet' }, { list: 'ordered' }],
                    [{ align: [] }],
                  ],
                }}
                className="text-sm text-gray-800 [&_.ql-toolbar.ql-snow]:border-x-0 [&_.ql-toolbar.ql-snow]:border-t-0 [&_.ql-toolbar.ql-snow]:border-b-gray-200 [&_.ql-toolbar.ql-snow]:bg-white [&_.ql-container.ql-snow]:min-h-48 [&_.ql-container.ql-snow]:border-x-0 [&_.ql-container.ql-snow]:border-b-0 [&_.ql-editor]:min-h-48 [&_.ql-editor]:px-4 [&_.ql-editor]:py-3.5 [&_.ql-editor]:text-sm [&_.ql-editor]:leading-6 [&_.ql-editor]:text-gray-800 [&_.ql-editor.ql-blank::before]:not-italic [&_.ql-editor.ql-blank::before]:text-gray-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setField('termsAndConditions', savedTermsContent);
                  toggleSection('terms');
                }}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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
