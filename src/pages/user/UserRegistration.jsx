import React, { useEffect, useMemo, useRef, useState } from 'react';
import { notify } from '@/utils/toast';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Map,
  MapPin,
  User,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import {
  getActiveCompany,
  getAllCountries,
  getAllRoleMasterByUserId,
  getCitiesByState,
  getEmployeeById,
  getStatesByCountry,
  saveEmployee,
  updateEmployee,
} from '@/services/apiServices';
import { getUserIdFromToken } from '../../utils/auth';
import {
  buildEmployeePayload,
  DEFAULT_FORM,
  extractItem,
  extractList,
  mapEmployeeToForm,
} from './utils/Employeemappers';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const errorInputCls =
  'w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-300';

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const ErrorText = ({ message }) =>
  message ? <p className="text-xs text-red-500 mt-1">{message}</p> : null;

// Generic string-option select (used for Department)
const Select = ({ value, onChange, placeholder, options, hasError }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className={`${hasError ? errorInputCls : inputCls} appearance-none pr-9 cursor-pointer ${value === '' ? 'text-gray-400' : 'text-gray-800'
        }`}
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

// {id, name} option select — used for Country / State / City / Company / Unit / Department
const IdSelect = ({
  value,
  onChange,
  placeholder,
  options,
  hasError,
  disabled,
  loading,
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      disabled={disabled || loading}
      className={`${hasError ? errorInputCls : inputCls} appearance-none pr-9 cursor-pointer ${value === '' ? 'text-gray-400' : 'text-gray-800'
        } ${disabled || loading ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
    >
      <option value="" disabled>
        {loading ? 'Loading...' : placeholder}
      </option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id} className="text-gray-800">
          {opt.name}
        </option>
      ))}
    </select>
    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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

// Root org id — everything else in the org tree hangs off this via parentId.
const MAIN_GROUP_ID = 1;

// Password must be at least 8 chars with 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Stricter email pattern: no consecutive dots, no leading/trailing dots in the
// local or domain part, and the TLD must be 2-24 letters only.
const EMAIL_REGEX =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,24}$/;

const KNOWN_TLDS = new Set([
  'com',
  'net',
  'org',
  'edu',
  'gov',
  'mil',
  'info',
  'biz',
  'co',
  'in',
  'io',
  'us',
  'uk',
  'ca',
  'au',
  'de',
  'fr',
  'jp',
  'cn',
  'ai',
  'me',
  'app',
  'dev',
  'tech',
  'store',
  'online',
  'xyz',
  'name',
  'pro',
]);

const isValidEmail = (rawEmail) => {
  const email = rawEmail.trim();
  if (!email) return false;
  if (email.includes('..')) return false;
  if (!EMAIL_REGEX.test(email)) return false;
  const tld = email.split('.').pop().toLowerCase();
  return KNOWN_TLDS.has(tld);
};

const MOBILE_REGEX = /^\d{10}$/;
const PINCODE_REGEX = /^\d{6}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,20}$/;

const UserRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const editingUser = location.state?.user ?? null;
  const isEditMode = !!editingUser;

  const [openSections, setOpenSections] = useState({
    personal: true,
    address: true,
  });

  const toggleSection = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [loadingUser, setLoadingUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Location lookups
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Roles / departments — fetched once from /api/rolemaster/getall
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Full org tree — every entity (companies, units) in one flat list, each
  // carrying a parentId. We fetch it once and derive dropdown options from
  // it on the frontend instead of hitting the API again per selection.
  const [allOrgs, setAllOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Fetch org tree once on mount
  useEffect(() => {
    let cancelled = false;
    const fetchOrgs = async () => {
      setLoadingOrgs(true);
      try {
        const res = await getActiveCompany();
        if (!cancelled) setAllOrgs(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setAllOrgs([]);
      } finally {
        if (!cancelled) setLoadingOrgs(false);
      }
    };
    fetchOrgs();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch all roles once on mount — these serve as the Department options
  useEffect(() => {
    let cancelled = false;
    const fetchRoles = async () => {
      setLoadingDepartments(true);
      try {
        const res = await getAllRoleMasterByUserId(getUserIdFromToken());
        if (!cancelled) {
          const list = extractList(res).map((d) => ({
            id: d.id,
            // Adjust the field name below if the API returns a different key
            name: d.name ?? d.roleName ?? d.departmentName ?? '',
          }));
          setDepartments(list);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setDepartments([]);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
    };
    fetchRoles();
    return () => {
      cancelled = true;
    };
  }, []); // no dependency on companyId / outletId — roles are global

  // Companies = orgs whose parent is the root MAIN_GROUP.
  const companies = useMemo(
    () =>
      allOrgs
        .filter((o) => String(o.parentId) === String(MAIN_GROUP_ID))
        .map((c) => ({ id: c.id, name: c.companyNameEnglish || c.name })),
    [allOrgs],
  );

  // Units = orgs whose parent is whichever company is currently selected.
  const outlets = useMemo(
    () =>
      form.companyId
        ? allOrgs
          .filter((o) => String(o.parentId) === String(form.companyId))
          .map((u) => ({ id: u.id, name: u.companyNameEnglish || u.name }))
        : [],
    [allOrgs, form.companyId],
  );

  const handleCompanyChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, companyId: value, outletId: '' }));
    setErrors((prev) => ({
      ...prev,
      companyId: undefined,
      outletId: undefined,
    }));
  };

  const handleUnitChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, outletId: value }));
    setErrors((prev) => ({ ...prev, outletId: undefined }));
  };

  // Edit mode: pull the full record from the backend rather than trusting
  // the (possibly partial) row passed in via navigation state.
  useEffect(() => {
    setErrors({});
    setSubmitError('');
    setStates([]);
    setCities([]);

    if (!editingUser?.id) {
      setForm(DEFAULT_FORM);
      return;
    }

    let cancelled = false;
    const fetchEmployee = async () => {
      setLoadingUser(true);
      try {
        const res = await getEmployeeById(editingUser.id);
        const emp = extractItem(res);
        if (!cancelled) setForm(mapEmployeeToForm(emp));
      } catch (err) {
        console.error(err);
        if (!cancelled) setForm(mapEmployeeToForm(editingUser));
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    };
    fetchEmployee();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingUser?.id]);

  // Load countries once
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

  // Load states whenever countryId changes
  useEffect(() => {
    if (!form.countryId) {
      setStates([]);
      return;
    }
    let cancelled = false;
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await getStatesByCountry(form.countryId);
        if (!cancelled) setStates(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setStates([]);
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    };
    fetchStates();
    return () => {
      cancelled = true;
    };
  }, [form.countryId]);

  // Load cities whenever stateId changes
  useEffect(() => {
    if (!form.stateId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await getCitiesByState(form.stateId);
        if (!cancelled) setCities(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setCities([]);
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    };
    fetchCities();
    return () => {
      cancelled = true;
    };
  }, [form.stateId]);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // Email gets its own setter so we can validate live as the user types.
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, email: value }));
    setErrors((prev) => {
      if (!value.trim()) return { ...prev, email: undefined };
      if (!isValidEmail(value))
        return { ...prev, email: 'Enter a valid email address' };
      return { ...prev, email: undefined };
    });
  };

  const handleCountryChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, countryId: value, stateId: '', cityId: '' }));
    setStates([]);
    setCities([]);
    setErrors((prev) => ({
      ...prev,
      countryId: undefined,
      stateId: undefined,
      cityId: undefined,
    }));
  };

  const handleStateChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, stateId: value, cityId: '' }));
    setCities([]);
    setErrors((prev) => ({ ...prev, stateId: undefined, cityId: undefined }));
  };

  const handleCityChange = (e) => {
    set('cityId', e.target.value);
  };

  const validate = () => {
    const e = {};

    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';

    if (!form.username.trim()) e.username = 'Username is required';
    else if (!USERNAME_REGEX.test(form.username))
      e.username =
        'Username must be 3-20 characters (letters, numbers, . _ - only)';

    if (!form.email.trim()) e.email = 'Email address is required';
    else if (!isValidEmail(form.email))
      e.email = 'Enter a valid email address (check the domain spelling)';

    if (!isEditMode) {
      if (!form.password) e.password = 'Password is required';
      else if (!PASSWORD_REGEX.test(form.password))
        e.password =
          'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character';
    }

    if (!form.mobile.trim()) e.mobile = 'Mobile number is required';
    else if (!MOBILE_REGEX.test(form.mobile))
      e.mobile = 'Enter a valid 10-digit mobile number';

    if (form.altMobile && !MOBILE_REGEX.test(form.altMobile))
      e.altMobile = 'Enter a valid 10-digit mobile number';

    if (!form.companyId) e.companyId = 'Company is required';

    if (!form.departmentId) e.departmentId = 'Department is required';
    if (!form.designation.trim()) e.designation = 'Designation is required';

    if (!form.addressLine1.trim())
      e.addressLine1 = 'Address line 1 is required';
    if (!form.countryId) e.countryId = 'Country is required';
    if (!form.stateId) e.stateId = 'State is required';
    if (!form.cityId) e.cityId = 'City is required';

    if (!form.pincode.trim()) e.pincode = 'Pincode is required';
    else if (!PINCODE_REGEX.test(form.pincode))
      e.pincode = 'Enter a valid 6-digit pincode';

    return e;
  };

  const focusFirstError = (errs) => {
    const firstKey = Object.keys(errs)[0];
    if (!firstKey) return;
    const el = document.querySelector(`[name="${firstKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus?.();
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      focusFirstError(errs);
      return;
    }

    const payload = buildEmployeePayload(form, { isEditMode });
    console.log('payload', payload);
    setSubmitting(true);
    setSubmitError('');

    try {
      if (isEditMode) {
        await updateEmployee(payload);
        notify.success('User Updated Successfully');
      } else {
        await saveEmployee(payload);
        notify.success('User Created Successfully');
      }
      navigate('/users');
    } catch (err) {
      console.error(err);
      setSubmitError(
        err?.response?.data?.message ||
        `Something went wrong while ${isEditMode ? 'updating' : 'saving'} this user. Please try again.`,
      );
      notify.error(
        `Something went wrong while ${isEditMode ? 'updating' : 'saving'} this user. Please try again.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndAddAnother = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      focusFirstError(errs);
      return;
    }
    const payload = buildEmployeePayload(form, { isEditMode: false });
    setSubmitting(true);
    setSubmitError('');
    try {
      await saveEmployee(payload);
      setForm(DEFAULT_FORM);
      notify.success('User Created Successfully');
      setStates([]);
      setCities([]);
      setErrors({});
    } catch (err) {
      console.error(err);
      setSubmitError(
        err?.response?.data?.message ||
          'Something went wrong while saving this user. Please try again.',
      );
      notify.error(
        'Something went wrong while saving this user. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-4 min-h-screen p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
          {isEditMode ? 'Update User' : 'User Registration'}
        </h1>
        <p className="text-[#43474F]">
          {isEditMode
            ? `Update the account details for ${editingUser?.name ?? 'this user'}.`
            : 'Create a new enterprise user account across organizational levels.'}
        </p>
      </div>

      {submitError && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {loadingUser ? (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm px-6 py-10 text-center text-sm text-gray-400">
          Loading user details...
        </div>
      ) : (
        <>
          {/* ── Personal Information ── */}
          <SectionCard className="mt-4">
            <SectionHeader
              icon={User}
              title="Personal Information"
              open={openSections.personal}
              onToggle={() => toggleSection('personal')}
            />

            {openSections.personal && (
              <div className="px-6 py-6 space-y-5">
                {/* Row 1 — Name */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label required>First Name</Label>
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={(e) => set('firstName', e.target.value)}
                      placeholder="Enter First Name"
                      className={errors.firstName ? errorInputCls : inputCls}
                    />
                    <ErrorText message={errors.firstName} />
                  </div>

                  <div>
                    <Label>Middle Name</Label>
                    <input
                      name="middlename"
                      value={form.middlename}
                      onChange={(e) => set('middlename', e.target.value)}
                      placeholder="Enter Middlename"
                      className={errors.middlename ? errorInputCls : inputCls}
                    />
                  </div>

                  <div>
                    <Label required>Last Name</Label>
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={(e) => set('lastName', e.target.value)}
                      placeholder="Enter Last Name"
                      className={errors.lastName ? errorInputCls : inputCls}
                    />
                    <ErrorText message={errors.lastName} />
                  </div>
                </div>

                {/* Row 2 — Username / Email / Company (+ User Code in edit mode) */}
                <div
                  className={`grid gap-4 ${isEditMode ? 'grid-cols-4' : 'grid-cols-3'}`}
                >
                  {isEditMode && (
                    <div>
                      <Label>User Code (Auto Generated)</Label>
                      <input
                        value={form.userCode}
                        disabled
                        className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                      />
                    </div>
                  )}

                  <div>
                    <Label>Username</Label>
                    <input
                      name="username"
                      value={form.username}
                      onChange={(e) => set('username', e.target.value)}
                      placeholder="e.g., rjaiswal"
                      disabled={isEditMode}
                      className={`${errors.username ? errorInputCls : inputCls} ${
                        isEditMode
                          ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                          : ''
                      }`}
                    />
                    <ErrorText message={errors.username} />
                  </div>

                  <div>
                    <Label required>Email Address</Label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleEmailChange}
                      onBlur={handleEmailChange}
                      placeholder="example@jaiswalgroup.com"
                      className={errors.email ? errorInputCls : inputCls}
                    />
                    <ErrorText message={errors.email} />
                  </div>

                  <div>
                    <Label required>Company</Label>
                    <IdSelect
                      value={form.companyId}
                      onChange={handleCompanyChange}
                      placeholder="Select Company"
                      options={companies}
                      hasError={!!errors.companyId}
                      loading={loadingOrgs}
                    />
                    <ErrorText message={errors.companyId} />
                  </div>
                </div>

                {/* Row 3 — Unit / Password / Mobile / Alt Mobile */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Unit</Label>
                    <IdSelect
                      value={form.outletId}
                      onChange={handleUnitChange}
                      placeholder={
                        form.companyId
                          ? 'Select Unit (optional)'
                          : 'Select company first'
                      }
                      options={outlets}
                      hasError={!!errors.outletId}
                      disabled={!form.companyId}
                      loading={loadingOrgs}
                    />
                    <ErrorText message={errors.outletId} />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Leave blank to register the user directly under the
                      company.
                    </p>
                  </div>

                  {!isEditMode && (
                    <div>
                      <Label required>Password</Label>
                      <div className="relative">
                        <input
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => set('password', e.target.value)}
                          placeholder="••••••••"
                          className={`${errors.password ? errorInputCls : inputCls} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-0 p-0"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {errors.password ? (
                        <ErrorText message={errors.password} />
                      ) : (
                        <p className="text-[11px] text-gray-400 mt-1">
                          Min 8 characters, with uppercase, lowercase, number
                          &amp; special character.
                        </p>
                      )}
                    </div>
                  )}

                </div>

                <div className="grid grid-cols-3 gap-4">

                  
                  <div>
                    <Label required>Mobile Number</Label>
                    <input
                      name="mobile"
                      value={form.mobile}
                      onChange={(e) =>
                        set('mobile', e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="+91 00000 00000"
                      maxLength={10}
                      className={errors.mobile ? errorInputCls : inputCls}
                    />
                    <ErrorText message={errors.companyId} />
                  </div>

                  <div>
                    <Label>Alternate Mobile Number</Label>
                    <input
                      name="altMobile"
                      value={form.altMobile}
                      onChange={(e) =>
                        set('altMobile', e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="+91 00000 00000"
                      maxLength={10}
                      className={errors.altMobile ? errorInputCls : inputCls}
                    />
                    <ErrorText message={errors.outletId} />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Leave blank to register the user directly under the company.
                    </p>
                  </div>

                {/* Row 4 — Department / Designation */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>Department</Label>
                    <IdSelect
                      value={form.departmentId}
                      onChange={(e) => set('departmentId', e.target.value)}
                      placeholder="Select Department"
                      options={departments}
                      hasError={!!errors.departmentId}
                      disabled={false}
                      loading={loadingDepartments}
                    />
                    <ErrorText message={errors.departmentId} />
                  </div>

                  
                </div>

                <div className="grid grid-cols-3 gap-4">
                  
                  <div>
                    <Label required>Designation</Label>
                    <input
                      name="designation"
                      value={form.designation}
                      onChange={(e) => set('designation', e.target.value)}
                      placeholder="e.g., Manager"
                      className={errors.designation ? errorInputCls : inputCls}
                    />
                    <ErrorText message={errors.designation} />
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Residential Address ── */}
          <SectionCard className="mt-4">
            <SectionHeader
              icon={MapPin}
              title="Residential Address"
              open={openSections.address}
              onToggle={() => toggleSection('address')}
            />
            {openSections.address && (
              <div className="px-6 py-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>Address Line 1</Label>
                    <input
                      name="addressLine1"
                      value={form.addressLine1}
                      onChange={(e) => set('addressLine1', e.target.value)}
                      placeholder="Building, Street Name"
                      className={errors.addressLine1 ? errorInputCls : inputCls}
                    />
                    <ErrorText message={errors.addressLine1} />
                  </div>
                  <div>
                    <Label>Address Line 2</Label>
                    <input
                      value={form.addressLine2}
                      onChange={(e) => set('addressLine2', e.target.value)}
                      placeholder="Locality, Landmark"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label required>Country</Label>
                    <IdSelect
                      value={form.countryId}
                      onChange={handleCountryChange}
                      placeholder="Select Country"
                      options={countries}
                      hasError={!!errors.countryId}
                      loading={loadingCountries}
                    />
                    <ErrorText message={errors.countryId} />
                  </div>
                  <div>
                    <Label required>State</Label>
                    <IdSelect
                      value={form.stateId}
                      onChange={handleStateChange}
                      placeholder={
                        form.countryId ? 'Select State' : 'Select country first'
                      }
                      options={states}
                      hasError={!!errors.stateId}
                      loading={loadingStates}
                      disabled={!form.countryId}
                    />
                    <ErrorText message={errors.stateId} />
                  </div>
                  <div>
                    <Label required>City</Label>
                    <IdSelect
                      value={form.cityId}
                      onChange={handleCityChange}
                      placeholder={
                        form.stateId ? 'Select City' : 'Select state first'
                      }
                      options={cities}
                      hasError={!!errors.cityId}
                      loading={loadingCities}
                      disabled={!form.stateId}
                    />
                    <ErrorText message={errors.cityId} />
                  </div>
                  <div>
                    <Label required>Pincode</Label>
                    <input
                      name="pincode"
                      value={form.pincode}
                      onChange={(e) =>
                        set('pincode', e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="6 Digits"
                      maxLength={6}
                      className={errors.pincode ? errorInputCls : inputCls}
                    />
                    <ErrorText message={errors.pincode} />
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
        </>
      )}

      {/* ── Footer actions ── */}
      <div className="flex items-center justify-end gap-3 pb-4 my-6 border-t border-[#C3C6D1] py-6">
        <button
          type="button"
          onClick={() => navigate('/users')}
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg border border-[#737781] text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || loadingUser}
          className="px-6 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition disabled:opacity-50"
        >
          {submitting ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
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

export default UserRegistration;
