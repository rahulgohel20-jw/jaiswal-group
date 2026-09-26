import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getUserIdFromToken } from '@/utils/auth';
import { notify, getApiErrorMessage } from '@/utils/toast';
import {
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Landmark,
  Loader2,
  Map,
  MapPin,
  Plus,
  Receipt,
  RefreshCw,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import {
  getAllCountries,
  getAllDepartmentMaster,
  getAllRoleMasterByUserId,
  getCitiesByState,
  getOrganizationByType,
  getPages,
  getStatesByCountry,
  getUserRightsByRole,
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
import { Container } from '@/components/common/container';

const ACTIONS = [
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'view', label: 'View' },
  { key: 'delete', label: 'Delete' },
];

const emptyRow = { add: false, edit: false, view: false, delete: false };
const fullRow = { add: true, edit: true, view: true, delete: true };

const normalizePages = (res) => {
  const modules =
    res?.data?.data?.ModuleWiseUserRights ??
    res?.data?.ModuleWiseUserRights ??
    (Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : []);
  const grouped = {};
  if (Array.isArray(modules)) {
    modules.forEach((m) => {
      const pages = m.userRightsPages ?? m.userRights ?? m.pages ?? [];
      grouped[m.moduleName || `Module ${m.moduleId}`] = pages.map((p) => ({
        id: p.pageId ?? p.pageid ?? p.id,
        name: p.pagename ?? p.pageName ?? p.name ?? `Page ${p.pageId ?? p.pageid ?? p.id}`,
        moduleId: m.moduleId ?? p.moduleId,
      }));
    });
  }
  return grouped;
};

const normalizeExistingRights = (res) => {
  const raw = res?.data?.data ?? res?.data ?? res ?? {};
  const modules =
    raw?.UserRights ??
    raw?.userRights?.userRights ??
    raw?.userRights ??
    (Array.isArray(raw) ? raw : []);

  const map = {};
  if (Array.isArray(modules)) {
    modules.forEach((m) => {
      const pageList = m.userRights ?? m.userRightsPages ?? m.pages ?? (Array.isArray(m) ? m : []);
      pageList.forEach((r) => {
        const pid = r.pageid ?? r.pageId ?? r.id;
        if (pid != null) {
          map[pid] = {
            moduleId: m.moduleId ?? r.moduleId,
            add: Boolean(r.add),
            edit: Boolean(r.edit),
            view: Boolean(r.view),
            delete: Boolean(r.delete),
          };
        }
      });
    });
  }
  return map;
};


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

const Toggle = ({ checked, onChange, disabled = false, size = 'md' }) => {
  const isSm = size === 'sm';
  const widthCls = isSm ? 'w-9 h-5' : 'w-11 h-6';
  const knobCls = isSm ? 'w-3.5 h-3.5 top-[3px] left-[3px]' : 'w-4.5 h-4.5 top-[3px] left-[3px]';
  const translateCls = isSm ? 'translate-x-4' : 'translate-x-5';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex ${widthCls} rounded-full transition-all duration-300 ease-in-out shrink-0 cursor-pointer border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-[#084E92]/30 p-0 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      style={{
        backgroundColor: checked ? '#084E92' : '#E5E7EB',
        boxShadow: checked ? '0 2px 6px -1px rgba(8, 78, 146, 0.35)' : 'none',
      }}
    >
      <span
        className={`absolute ${knobCls} rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${
          checked ? translateCls : 'translate-x-0'
        }`}
      >
        {checked && <span className="w-1.5 h-1.5 rounded-full bg-[#084E92]" />}
      </span>
    </button>
  );
};

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  PERMISSIONS: 'permissions',
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

  const [openSections, setOpenSections] = useState({
    [SECTIONS.PERSONAL]: true,
    [SECTIONS.PERMISSIONS]: true,
    [SECTIONS.COMMON]: true,
    [SECTIONS.BUSINESS]: true,
    [SECTIONS.ADDRESS]: true,
    [SECTIONS.BANK]: true,
    [SECTIONS.REMARKS]: true,
    terms: true,
  });
  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Which address the map picker modal is currently editing.
  const [mapPickerTarget, setMapPickerTarget] = useState(null); // 'commonAddress' | 'billingAddress' | 'shippingAddress' | null

  const [form, setForm] = useState(DEFAULT_FORM);
  const [savedTermsContent, setSavedTermsContent] = useState('');

  // Departments from /api/department/getall
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Roles from /api/roles/getallbyuserid
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Permissions / Pages state
  const [pagesByModule, setPagesByModule] = useState({});
  const [checks, setChecks] = useState({});
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingRoleRights, setLoadingRoleRights] = useState(false);

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

            // Load existing user rights if present in vendor data
            const initialChecks = normalizeExistingRights(data);
            if (Object.keys(initialChecks).length > 0) {
              setChecks(initialChecks);
            }

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
      setChecks({});
      setSavedTermsContent('');
      setTradeNameTouched(false);
    }
    setErrors({});
    setBankErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  // Fetch departments from Department Master
  useEffect(() => {
    let cancelled = false;
    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const res = await getAllDepartmentMaster();
        if (!cancelled) {
          const list = extractList(res).map((d) => ({
            id: d.id,
            name: d.name ?? d.departmentName ?? '',
          }));
          setDepartments(list);
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
        if (!cancelled) setDepartments([]);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
    };
    fetchDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch roles for logged in user
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
        if (!cancelled) {
          const list = extractList(res).map((r) => ({
            id: r.id,
            name: r.name ?? r.roleName ?? '',
          }));
          setRoles(list);
        }
      } catch (err) {
        console.error('Failed to load roles:', err);
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

  // Fetch module pages definition for permissions grid
  useEffect(() => {
    let cancelled = false;
    const fetchModulePages = async () => {
      setLoadingPages(true);
      try {
        const pagesRes = await getPages(false, true);
        if (!cancelled) {
          setPagesByModule(normalizePages(pagesRes));
        }
      } catch (err) {
        console.error('Failed to load pages for permissions:', err);
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    };
    fetchModulePages();
    return () => {
      cancelled = true;
    };
  }, []);

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
    const cleaned = val.replace(/[^a-zA-Z\s]/g, '');
    setForm((f) => ({
      ...f,
      vendorName: cleaned,
      tradeName: tradeNameTouched ? f.tradeName : cleaned,
    }));
    setErrorFor('vendorName', validateRequired(cleaned, 'Vendor Name'));
  };

  const handleTradeNameChange = (val) => {
    setTradeNameTouched(true);
    const cleaned = val.replace(/[^a-zA-Z\s]/g, '');
    setField('tradeName', cleaned);
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

  // --- Permission helper methods ---
  const allPageIds = useMemo(
    () =>
      Object.values(pagesByModule)
        .flat()
        .map((p) => p.id),
    [pagesByModule],
  );

  const isRowFullyChecked = (pageId) => {
    const row = checks[pageId];
    if (!row) return false;
    return ACTIONS.every((a) => Boolean(row[a.key]));
  };

  const isColumnFullyChecked = (actionKey) =>
    allPageIds.length > 0 && allPageIds.every((id) => Boolean(checks[id]?.[actionKey]));

  const isEverythingChecked = useMemo(() => {
    return allPageIds.length > 0 && allPageIds.every((id) => isRowFullyChecked(id));
  }, [allPageIds, checks]);

  const toggle = (pageId, actionKey, moduleId) => {
    setChecks((prev) => {
      const prevRow = prev[pageId] ?? emptyRow;
      return {
        ...prev,
        [pageId]: {
          ...prevRow,
          moduleId: prevRow.moduleId ?? moduleId,
          [actionKey]: !prevRow[actionKey],
        },
      };
    });
  };

  const toggleRow = (pageId, moduleId) => {
    const shouldCheck = !isRowFullyChecked(pageId);
    setChecks((prev) => ({
      ...prev,
      [pageId]: shouldCheck
        ? { ...fullRow, moduleId: prev[pageId]?.moduleId ?? moduleId }
        : { ...emptyRow, moduleId: prev[pageId]?.moduleId ?? moduleId },
    }));
  };

  const toggleColumn = (actionKey) => {
    const shouldCheck = !isColumnFullyChecked(actionKey);
    setChecks((prev) => {
      const next = { ...prev };
      allPageIds.forEach((id) => {
        const pageInfo = Object.values(pagesByModule).flat().find((p) => p.id === id);
        next[id] = {
          ...(next[id] ?? emptyRow),
          moduleId: next[id]?.moduleId ?? pageInfo?.moduleId,
          [actionKey]: shouldCheck,
        };
      });
      return next;
    });
  };

  const toggleEverything = () => {
    const shouldCheck = !isEverythingChecked;
    setChecks((prev) => {
      const next = { ...prev };
      Object.values(pagesByModule).flat().forEach((p) => {
        next[p.id] = shouldCheck
          ? { ...fullRow, moduleId: p.moduleId }
          : { ...emptyRow, moduleId: p.moduleId };
      });
      return next;
    });
  };

  // --- Role selection and auto-loading permissions ---
  const handleRoleChange = async (value) => {
    const roleId = typeof value === 'object' && value?.target ? value.target.value : value;
    setField('roleId', roleId);
    setErrorFor('roleId', '');
    if (!roleId) return;

    setLoadingRoleRights(true);
    try {
      const res = await getUserRightsByRole(roleId);
      const rightsMap = normalizeExistingRights(res);
      setChecks(rightsMap);
      notify.success('Permissions loaded for selected role');
    } catch (err) {
      console.error('Failed to fetch role user rights:', err);
      notify.error('Failed to load permissions for the selected role.');
    } finally {
      setLoadingRoleRights(false);
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

    const deptErr = validateRequired(form.deptId, 'Department');
    if (deptErr) formErrors.deptId = deptErr;

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

    if (form.isGstApplicable) {
      const gstinErr = validateGSTIN(form.gstin);
      if (gstinErr) formErrors.gstin = gstinErr;

      const gstCompanyNameErr = validateRequired(
        form.gstCompanyName,
        'Company Name (as per GST)',
      );
      if (gstCompanyNameErr) formErrors.gstCompanyName = gstCompanyNameErr;
    }

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
      const sectionsToOpen = {};
      if (Object.keys(bankErrs).length > 0) {
        sectionsToOpen[SECTIONS.BANK] = true;
      }
      Object.keys(formErrors).forEach((firstKey) => {
        sectionsToOpen[sectionForKey(firstKey)] = true;
      });
      setOpenSections((prev) => ({ ...prev, ...sectionsToOpen }));
    }
    return hasErrors;
  };

  const handleSubmit = async () => {
    setSubmitError('');
    const { formErrors, bankErrs } = runValidation();
    if (applyValidationResult(formErrors, bankErrs)) return;

    const payload = buildVendorPayload(form, { isEditMode, editingVendor, checks });
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

    const payload = buildVendorPayload(form, { isEditMode, editingVendor, checks });
    setSubmitting(true);
    try {
      await saveVendor(payload);
      notify.success('Vendor created successfully');
      setForm((f) => ({ ...DEFAULT_FORM, organizationId: f.organizationId }));
      setChecks({});
      setSavedTermsContent('');
      setTradeNameTouched(false);
      setErrors({});
      setBankErrors({});
      setOpenSections({
        [SECTIONS.PERSONAL]: true,
        [SECTIONS.PERMISSIONS]: true,
        [SECTIONS.COMMON]: true,
        [SECTIONS.BUSINESS]: true,
        [SECTIONS.ADDRESS]: true,
        [SECTIONS.BANK]: true,
        [SECTIONS.REMARKS]: true,
        terms: true,
      });
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
    'deptId',
    'password',
  ].some((k) => errors[k]);
  const commonSectionHasError = Object.keys(errors).some((k) =>
    k.startsWith('commonAddress.'),
  );
  const businessSectionHasError = [
    ...(form.isGstApplicable ? ['gstin', 'gstCompanyName'] : []),
    ...(form.msmeRegistered ? ['msmeType', 'msmeNumber'] : []),
  ].some((k) => errors[k]);
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
     <Container>
    <div className="mx-auto p-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span className='cursor-pointer hover:text-blue-400' onClick={() => navigate('/')}>Dashboard</span>
          <ChevronRight size={12} />
          <span className='cursor-pointer hover:text-blue-400' onClick={() => navigate(-1)}>Vendors</span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">
             Add Vendor  
          </span>
        </div>
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-[#101828] text-[28px]">
          {isEditMode ? 'Update Vendor' : 'Vendor Registration'}
        </h1>
        <p className="text-[#667085] text-sm mt-1.5 max-w-xl">
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
          open={!!openSections[SECTIONS.PERSONAL]}
          onToggle={() => toggleSection(SECTIONS.PERSONAL)}
          hasError={personalSectionHasError}
        />

        {openSections[SECTIONS.PERSONAL] && (
          <div className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    setField(
                      'contactPersonName',
                      e.target.value.replace(/[^a-zA-Z\s]/g, '')
                    )
                  }
                  placeholder="Enter contact person name"
                  className={inputCls}
                />
              </div>
            </div>

            <div
              className={`grid grid-cols-1 ${isEditMode ? 'sm:grid-cols-2' : 'grid-cols-1'} gap-4`}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Department</Label>
                <SearchableSelect
                  name="deptId"
                  value={form.deptId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setField('deptId', val);
                    setErrorFor('deptId', validateRequired(val, 'Department'));
                  }}
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                  placeholder={loadingDepartments ? 'Loading...' : 'Select Department'}
                  disabled={loadingDepartments}
                  hasError={!!errors.deptId}
                />
                <ErrorText error={errors.deptId} />
              </div>

              <div>
                <Label>Role</Label>
                <SearchableSelect
                  name="roleId"
                  value={form.roleId}
                  onChange={handleRoleChange}
                  options={roles.map((r) => ({
                    value: r.id,
                    label: r.name,
                  }))}
                  placeholder={
                    loadingRoles
                      ? 'Loading...'
                      : loadingRoleRights
                      ? 'Loading permissions...'
                      : 'Select Role (optional)'
                  }
                  disabled={loadingRoles || loadingRoleRights}
                />
              </div>
            </div>

          </div>
        )}
      </SectionCard>

      {/* User Permissions Matrix */}
      <SectionCard className="mt-4">
        <SectionHeader
          icon={ShieldCheck}
          title="User Permissions"
          subtitle="Configure or customize module and page-level access permissions for this vendor"
          open={!!openSections[SECTIONS.PERMISSIONS]}
          onToggle={() => toggleSection(SECTIONS.PERMISSIONS)}
        />

        {openSections[SECTIONS.PERMISSIONS] && (
          <div className="px-6 py-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-gray-500">
              <p>
                {form.roleId
                  ? 'Permissions populated from selected role. You can edit or grant additional rights below.'
                  : 'Select a role above to auto-populate rights, or check specific permissions manually.'}
              </p>
              {loadingRoleRights && (
                <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                  <Loader2 className="animate-spin h-3.5 w-3.5" />
                  Loading role rights...
                </div>
              )}
            </div>

            {loadingPages ? (
              <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 className="animate-spin" size={18} />
                Loading pages and modules...
              </div>
            ) : Object.keys(pagesByModule).length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">
                No page modules available.
              </div>
            ) : (
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB]">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-[#43474F]">
                        Page Name
                      </th>
                      <th className="text-center px-4 py-3 font-semibold">
                        <div className="flex flex-col items-center gap-1">
                          <span>All</span>
                          <input
                            type="checkbox"
                            checked={isEverythingChecked}
                            onChange={toggleEverything}
                            className="rounded cursor-pointer"
                            title="Toggle Add/Edit/View/Delete for every page"
                          />
                        </div>
                      </th>
                      {ACTIONS.map((a) => (
                        <th
                          key={a.key}
                          className="text-center px-4 py-3 font-semibold"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span>{a.label}</span>
                            <input
                              type="checkbox"
                              checked={isColumnFullyChecked(a.key)}
                              onChange={() => toggleColumn(a.key)}
                              className="rounded cursor-pointer"
                              title={`Toggle ${a.label} for all`}
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(pagesByModule).map(([moduleName, pages]) => (
                      <React.Fragment key={moduleName}>
                        <tr className="bg-[#F7F8FA]">
                          <td
                            colSpan={ACTIONS.length + 2}
                            className="px-4 py-2 font-semibold text-[#43474F]"
                          >
                            {moduleName}
                          </td>
                        </tr>
                        {pages.map((page) => (
                          <tr
                            key={page.id}
                            className="border-b border-[#F0F1F3] last:border-b-0"
                          >
                            <td className="px-4 py-2.5 pl-8 text-gray-700">
                              {page.name}
                            </td>
                            <td className="text-center px-4 py-2.5">
                              <input
                                type="checkbox"
                                checked={isRowFullyChecked(page.id)}
                                onChange={() => toggleRow(page.id, page.moduleId)}
                                className="rounded cursor-pointer"
                                title="Toggle Add/Edit/View/Delete for this row"
                              />
                            </td>
                            {ACTIONS.map((a) => (
                              <td key={a.key} className="text-center px-4 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={Boolean(checks[page.id]?.[a.key])}
                                  onChange={() => toggle(page.id, a.key, page.moduleId)}
                                  className="rounded cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
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
          open={!!openSections[SECTIONS.COMMON]}
          onToggle={() => toggleSection(SECTIONS.COMMON)}
          hasError={commonSectionHasError}
        />

        {openSections[SECTIONS.COMMON] && (
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
          open={!!openSections[SECTIONS.BUSINESS]}
          onToggle={() => toggleSection(SECTIONS.BUSINESS)}
          hasError={businessSectionHasError}
        />

        {openSections[SECTIONS.BUSINESS] && (
          <div className="px-6 py-6 space-y-6">
            <div className="space-y-5">
              {/* Registration Toggles (Side-by-side Interactive Cards) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* GST Toggle Card */}
                <div
                  onClick={() => {
                    const next = !form.isGstApplicable;
                    setField('isGstApplicable', next);
                    if (!next) {
                      setErrorFor('gstin', '');
                      setErrorFor('gstCompanyName', '');
                    }
                  }}
                  className={`group relative flex items-center justify-between border-2 rounded-2xl p-4.5 transition-all duration-300 cursor-pointer select-none ${
                    form.isGstApplicable
                      ? 'border-[#084E92]/40 bg-gradient-to-br from-blue-50/60 via-white to-blue-50/30 shadow-sm ring-2 ring-[#084E92]/10'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        form.isGstApplicable
                          ? 'bg-gradient-to-tr from-[#084E92] to-[#0A66C2] text-white shadow-sm scale-105'
                          : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200/70 group-hover:text-gray-600'
                      }`}
                    >
                      <Receipt size={20} />
                    </div>
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-gray-900">
                          GST Registered Vendor
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase w-max tracking-wider px-2 py-0.5 mb-1 rounded-full border transition-colors ${
                            form.isGstApplicable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          {form.isGstApplicable ? 'GST Active' : 'Non-GST'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Enable GSTIN, tax invoices & GST rate calculation
                      </p>
                    </div>
                  </div>
                  <div className="pl-3">
                    <Toggle
                      checked={form.isGstApplicable}
                      onChange={(v) => {
                        setField('isGstApplicable', v);
                        if (!v) {
                          setErrorFor('gstin', '');
                          setErrorFor('gstCompanyName', '');
                        }
                      }}
                    />
                  </div>
                </div>

                {/* MSME Toggle Card */}
                <div
                  onClick={() => {
                    const next = !form.msmeRegistered;
                    setField('msmeRegistered', next);
                    if (!next) {
                      setErrorFor('msmeType', '');
                      setErrorFor('msmeNumber', '');
                    }
                  }}
                  className={`group relative flex items-center justify-between border-2 rounded-2xl p-4.5 transition-all duration-300 cursor-pointer select-none ${
                    form.msmeRegistered
                      ? 'border-[#084E92]/40 bg-gradient-to-br from-blue-50/60 via-white to-blue-50/30 shadow-sm ring-2 ring-[#084E92]/10'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        form.msmeRegistered
                          ? 'bg-gradient-to-tr from-[#084E92] to-[#0A66C2] text-white shadow-sm scale-105'
                          : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200/70 group-hover:text-gray-600'
                      }`}
                    >
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-gray-900">
                          MSME / Udyam Registered
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase w-max mb-1 tracking-wider px-2 py-0.5 rounded-full border transition-colors ${
                            form.msmeRegistered
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          {form.msmeRegistered ? 'MSME Active' : 'Not Applicable'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Enable MSME classification & Udyam certificate
                      </p>
                    </div>
                  </div>
                  <div className="pl-3">
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
                </div>
              </div>

              {/* GST Fields (Expanded) */}
              {form.isGstApplicable && (
                <div className="p-5 rounded-2xl border border-blue-100/90 bg-gradient-to-b from-blue-50/40 to-slate-50/20 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-100/70 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-[#084E92]/10 flex items-center justify-center text-[#084E92]">
                        <Receipt className="w-3.5 h-3.5" />
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#084E92]">
                        GST Registration Information
                      </h4>
                    </div>
                    <span className="text-xs font-medium text-emerald-700  w-max my-2 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      GST Invoice Applicable
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </div>
              )}

              {/* MSME Fields (Expanded) */}
              {form.msmeRegistered && (
                <div className="p-5 rounded-2xl border border-blue-100/90 bg-gradient-to-b from-blue-50/40 to-slate-50/20 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-100/70 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-[#084E92]/10 flex items-center justify-center text-[#084E92]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#084E92]">
                        MSME / Udyam Details
                      </h4>
                    </div>
                    <span className="text-xs font-medium text-blue-700 w-max my-2 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                      MSME Benefits Linked
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          open={!!openSections[SECTIONS.ADDRESS]}
          onToggle={() => toggleSection(SECTIONS.ADDRESS)}
          hasError={addressSectionHasError}
        />

        {openSections[SECTIONS.ADDRESS] && (
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
          open={!!openSections[SECTIONS.BANK]}
          onToggle={() => toggleSection(SECTIONS.BANK)}
          hasError={bankSectionHasError}
        />

        {openSections[SECTIONS.BANK] && (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          open={!!openSections[SECTIONS.REMARKS]}
          onToggle={() => toggleSection(SECTIONS.REMARKS)}
        />

        {openSections[SECTIONS.REMARKS] && (
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
          open={!!openSections.terms}
          onToggle={() => toggleSection('terms')}
        />

        {openSections.terms && (
          <div className="px-6 py-6 space-y-4">
            <textarea
              rows={8}
              value={form.termsAndConditions}
              onChange={(e) => setField('termsAndConditions', e.target.value)}
              placeholder="Write the terms and conditions for this vendor..."
              className={`${inputCls} resize-y min-h-48 leading-6`}
            />

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
    </Container>
  );
};

export default VendorRegistration;
