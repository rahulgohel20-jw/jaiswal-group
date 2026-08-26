import React, { useEffect, useRef, useState } from 'react';
import { notify } from '@/utils/toast';
import {
  Building2,
  Check,
  ChevronDown,
  ImageUp,
  Info,
  Landmark,
  Map,
  MapPin,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import {
  createCompany,
  getAllCountry,
  getCityByState,
  getStateByCountry,
  updateCompany,
} from '../../services/apiServices';
import {
  validateRequired,
  validateEmail,
  validateMobile,
  validatePincode,
  validateGSTIN,
  validateAccountHolderName,
  validateBankName,
  validateAccountNumber,
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

const emptyForm = {
  companyName: '',
  companyCode: 'AHD-2526-0001',
  shortCode: '',
  gstNumber: '',
  panNumber: '',
  mobile: '',
  altMobile: '',
  email: '',
  logo: null,
  favicon: null,
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  latitude: '',
  longitude: '',
  accountHolder: '',
  accountNumber: '',
  bankName: '',
  branchName: '',
  ifsc: '',
  upiId: '',
};

// Maps the (smaller) row shape used by the companies list table onto the
// full form shape. Any field the list doesn't carry is left at its default
// so the user can fill it in.
const mapCompanyToForm = (company) => {
  const latestImage =
    Array.isArray(company.images) && company.images.length > 0
      ? company.images[company.images.length - 1]
      : null;

      
    return {
       ...emptyForm,

  id: company.id,

  companyName: company.companyNameEnglish || '',
  companyCode: company.companyCode || '',
  shortCode: company.shortCode || '',

  gstNumber: company.gstNumber || '',
  panNumber: company.panNumber || '',

  mobile: company.mobilenumber || '',
  altMobile: company.alternatemobilenumber || '',

  email: company.emailid || '',

  addressLine1: company.addressEnglish || '',
  addressLine2: company.addressline2 || '',

  pincode: company.pincode || '',
  latitude: company.latitude || '',
  longitude: company.longitude || '',

  accountHolder: company.accountholdername || '',
  accountNumber: company.accountnumber || '',

  bankName: company.bankname || '',
  branchName: company.branchname || '',
  ifsc: company.bankifsccode || '',

  upiId: company.upiid || '',

  countryId: company.countryId,
  stateId: company.stateId,
  cityId: company.cityId,

  logo: latestImage?.path || null,
  favicon: company.favicon,
    }
}

// PAN isn't validated anywhere else in the app yet, so it lives here for now —
// move this into `@/utils/validations` alongside the others if another form
// ends up needing it too.
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const validatePAN = (value) => {
  if (!value || !value.trim()) return 'PAN Number is required';
  if (!PAN_REGEX.test(value.trim())) return 'Enter a valid PAN (e.g. ABCDE1234F)';
  return '';
};

// GST is optional on this form — only validate format once the user has
// actually typed something.
const validateGSTNumberOptional = (value) => {
  if (!value || !value.trim()) return '';
  return validateGSTIN(value);
};

// Alternate mobile is optional — only validate format once filled in.
const validateAltMobileOptional = (value) => {
  if (!value || !value.trim()) return '';
  return validateMobile(value);
};
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const validateUPIOptional = (value) => {
  if (!value || !value.trim()) return '';
  if (!UPI_REGEX.test(value.trim())) return 'Enter a valid UPI ID (e.g. name@okhdfcbank)';
  return '';
};

// Letters only — no digits, spaces, or special characters.
const SHORT_CODE_REGEX = /^[A-Za-z]+$/;
const validateShortCode = (value) => {
  if (!value || !value.trim()) return 'Short Code is required';
  if (!SHORT_CODE_REGEX.test(value.trim())) return 'Only letters are allowed';
  return '';
};

const SECTIONS = {
  COMPANY: 'company',
  ADDRESS: 'address',
  BANK: 'bank',
};

const CompanyRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Top-level field errors, keyed by form field name (or 'country' / 'state' /
  // 'city' for the location selects).
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // Sets or clears a single error. Pass an empty/falsy `err` to clear. Used
  // for live validation as the user types or selects.
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

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await getAllCountry();
        setCountries(res.data.data);
      } catch (error) {
        console.log('Country error', error);
      }
    };

    fetchCountries();
  }, []);

  const handleCountryChange = async (e) => {
    const countryId = e.target.value;
    setSelectedCountry(countryId);
    setStates([]);
    setCities([]);
    setSelectedState('');
    setSelectedCity('');
    setErrorFor('country', validateRequired(countryId, 'Country'));
    setErrorFor('state', '');
    setErrorFor('city', '');

    try {
      const res = await getStateByCountry(countryId);
      setStates(res.data.data);
    } catch (error) {
      console.log('State error', error);
    }
  };

  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    setSelectedState(stateId);
    setCities([]);
    setSelectedCity('');
    setErrorFor('state', validateRequired(stateId, 'State'));
    setErrorFor('city', '');

    try {
      const res = await getCityByState(stateId);
      const cityList = res?.data?.data?.['City Details'] || [];

      console.log('cityList:', cityList);

      setCities(cityList);
    } catch (error) {
      console.log('City error', error);
    }
  };

  const handleCityChange = (e) => {
    const cityId = e.target.value;
    setSelectedCity(cityId);
    setErrorFor('city', validateRequired(cityId, 'City'));
  };

  // Edit mode is detected purely from router state: the list page's edit
  // button navigates here with `{ state: { company } }`. No company in
  // state means this is a fresh "Register New Company" visit.
  const editingCompany = location.state?.company ?? null;

  useEffect(() => {
    if (!editingCompany) return;

    setForm(mapCompanyToForm(editingCompany));
    setSelectedCountry(editingCompany.countryId?.toString() || '');
    setSelectedState(editingCompany.stateId?.toString() || '');
    setSelectedCity(editingCompany.cityId?.toString() || '');
    setErrors({});
    setSubmitError('');
  }, [editingCompany]);

  useEffect(() => {
    if (!editingCompany) return;

    const loadLocationData = async () => {
      try {
        const stateRes = await getStateByCountry(editingCompany.countryId);
        setStates(stateRes.data.data);

        const cityRes = await getCityByState(editingCompany.stateId);
        setCities(cityRes.data.data['City Details']);
      } catch (error) {
        console.log(error);
      }
    };

    loadLocationData();
  }, [editingCompany]);

  const isEditMode = !!editingCompany;

  const [openSections, setOpenSections] = useState({
    company: true,
    address: true,
    bank: true,
  });

  const toggleSection = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const [showMapPicker, setShowMapPicker] = useState(false);

  const [form, setForm] = useState(() =>
    editingCompany ? mapCompanyToForm(editingCompany) : emptyForm,
  );

  // If the user navigates here again with a different company (e.g. clicking
  // Edit on another row without a full page reload), keep the form in sync.
  useEffect(() => {
    setForm(editingCompany ? mapCompanyToForm(editingCompany) : emptyForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCompany]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Runs the offline IFSC ↔ bank name prefix check and sets/clears the
  // "ifsc" error. Synchronous — no network call.
  const [ifscLoading, setIfscLoading] = useState(false);

  const handleIfscBlur = async (ifscValue) => {
    const formatErr = validateIFSC(ifscValue);
    setErrorFor('ifsc', formatErr);
    if (formatErr) {
      set('bankName', '');
      set('branchName', '');
      return;
    }

    setIfscLoading(true);
    try {
      const result = await lookupIFSC(ifscValue);
      if (!result) {
        setErrorFor('ifsc', 'This IFSC code was not found. Please check and re-enter.');
        set('bankName', '');
        set('branchName', '');
        return;
      }
      setErrorFor('ifsc', '');
      setErrorFor('bankName', '');
      setErrorFor('branchName', '');
      set('bankName', result.bank);
      set('branchName', result.branch);
    } finally {
      setIfscLoading(false);
    }
  };

  const runValidation = () => {
    const formErrors = {};

    const companyNameErr = validateRequired(form.companyName, 'Company Name');
    if (companyNameErr) formErrors.companyName = companyNameErr;

    const shortCodeErr = validateShortCode(form.shortCode);
    if (shortCodeErr) formErrors.shortCode = shortCodeErr;

    const gstErr = validateGSTNumberOptional(form.gstNumber);
    if (gstErr) formErrors.gstNumber = gstErr;

    const panErr = validatePAN(form.panNumber);
    if (panErr) formErrors.panNumber = panErr;

    const mobileErr = validateMobile(form.mobile);
    if (mobileErr) formErrors.mobile = mobileErr;

    const altMobileErr = validateAltMobileOptional(form.altMobile);
    if (altMobileErr) formErrors.altMobile = altMobileErr;

    const emailErr = validateEmail(form.email);
    if (emailErr) formErrors.email = emailErr;

    const addressLine1Err = validateRequired(form.addressLine1, 'Address Line 1');
    if (addressLine1Err) formErrors.addressLine1 = addressLine1Err;

    const countryErr = validateRequired(selectedCountry, 'Country');
    if (countryErr) formErrors.country = countryErr;

    const stateErr = validateRequired(selectedState, 'State');
    if (stateErr) formErrors.state = stateErr;

    const cityErr = validateRequired(selectedCity, 'City');
    if (cityErr) formErrors.city = cityErr;

    const pincodeErr = validatePincode(form.pincode);
    if (pincodeErr) formErrors.pincode = pincodeErr;

    const accountHolderErr = validateAccountHolderName(form.accountHolder);
    if (accountHolderErr) formErrors.accountHolder = accountHolderErr;

    const accountNumberErr = validateAccountNumber(form.accountNumber);
    if (accountNumberErr) formErrors.accountNumber = accountNumberErr;

    const bankNameErr = validateBankName(form.bankName);
    if (bankNameErr) formErrors.bankName = bankNameErr;

    const branchNameErr = validateRequired(form.branchName, 'Branch Name');
    if (branchNameErr) formErrors.branchName = branchNameErr;

    const ifscFormatErr = validateIFSC(form.ifsc);
    if (ifscFormatErr) formErrors.ifsc = ifscFormatErr;

    const upiErr = validateUPIOptional(form.upiId);
    if (upiErr) formErrors.upiId = upiErr;

    return formErrors;
  };

  const sectionForKey = (key) => {
    if (['addressLine1', 'country', 'state', 'city', 'pincode'].includes(key))
      return SECTIONS.ADDRESS;
    if (
      ['accountHolder', 'accountNumber', 'bankName', 'branchName', 'ifsc'].includes(
        key,
      )
    )
      return SECTIONS.BANK;
    return SECTIONS.COMPANY;
  };

  const applyValidationResult = (formErrors) => {
    setErrors(formErrors);
    const hasErrors = Object.keys(formErrors).length > 0;

    if (hasErrors) {
      setSubmitError('Please fix the highlighted errors before saving.');
      const firstKey = Object.keys(formErrors)[0];
      const section = sectionForKey(firstKey);
      setOpenSections((prev) => ({ ...prev, [section]: true }));
    } else {
      setSubmitError('');
    }

    return hasErrors;
  };

  const handleSubmit = async () => {
    const formErrors = runValidation();
    if (applyValidationResult(formErrors)) return;

    try {
      const payload = {
        orgType: 'SUB_COMPANY',
        parentId: 1,
        username: 1,
        isverified: true,

        companyNameEnglish: form.companyName,
        shortCode: form.shortCode,
        gstNumber: form.gstNumber,
        panNumber: form.panNumber,
        mobilenumber: form.mobile,
        alternatemobilenumber: form.altMobile,
        emailid: form.email,

        addressEnglish: form.addressLine1,
        addressline2: form.addressLine2,

        countryId: Number(selectedCountry),
        stateId: Number(selectedState),
        cityId: Number(selectedCity),

        pincode: form.pincode,
        latitude: form.latitude,
        longitude: form.longitude,

        accountholdername: form.accountHolder,
        accountnumber: form.accountNumber,
        bankname: form.bankName,
        branchname: form.branchName,
        bankifsccode: form.ifsc,
        upiid: form.upiId,
      };
      if (isEditMode) {
        const formData = new FormData();

        formData.append('id', editingCompany.id);

        Object.entries(payload).forEach(([key, value]) => {
          formData.append(key, value ?? '');
        });

        if (form.logo instanceof File) {
          formData.append('logo', form.logo);
        }

        if (form.favicon instanceof File) {
          formData.append('favicon', form.favicon);
        }

        const res = await updateCompany(formData);

        notify.success('Company Updated Successfully');
      } else {
        const formData = new FormData();

        Object.entries(payload).forEach(([key, value]) => {
          formData.append(key, value ?? '');
        });

        if (form.logo instanceof File) {
          formData.append('logo', form.logo);
        }

        if (form.favicon instanceof File) {
          formData.append('favicon', form.favicon);
        }

        await createCompany(formData);

        notify.success('Company Added Successfully');
      }

      navigate('/companies');
    } catch (error) {
      console.log('Company save error:', error.response?.data || error.message);
      setSubmitError(
        error?.response?.data?.message ||
        `Failed to ${isEditMode ? 'update' : 'save'} company. Please try again.`,
      );
    }
  };

  const companySectionHasError = [
    'companyName',
    'shortCode',
    'gstNumber',
    'panNumber',
    'mobile',
    'altMobile',
    'email',
  ].some((k) => errors[k]);
  const addressSectionHasError = [
    'addressLine1',
    'country',
    'state',
    'city',
    'pincode',
  ].some((k) => errors[k]);
  const bankSectionHasError = [
    'accountHolder',
    'accountNumber',
    'bankName',
    'branchName',
    'ifsc',
    'upiId',
  ].some((k) => errors[k]);

  return (
    <div className="mx-4 min-h-screen p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
          {isEditMode ? 'Update Company' : 'Register New Company'}
        </h1>
        <p className="text-[#43474F] mt-2">
          {isEditMode
            ? `Edit the details for ${editingCompany.companyNameEnglish || ''} and save your changes.`
            : 'Complete the form below to establish a new corporate entity in the Jaiswal Group ecosystem.'}
        </p>
      </div>

      <SectionCard className="mt-4">
        <SectionHeader
          icon={Info}
          title="Company Information"
          open={openSections.company}
          onToggle={() => toggleSection('company')}
          hasError={companySectionHasError}
        />

        {openSections.company && (
          <div className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Company Name</Label>
                <input
                  value={form.companyName}
                  onChange={(e) => {
                    const val = e.target.value;
                    set('companyName', val);
                    setErrorFor('companyName', validateRequired(val, 'Company Name'));
                  }}
                  placeholder="e.g. Jaiswal Group"
                  className={`${inputCls} ${errors.companyName ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.companyName} />
              </div>
              <div>
                <Label required>Short Code</Label>
                <input
                  value={form.shortCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                    set('shortCode', val);
                    setErrorFor('shortCode', validateShortCode(val));
                  }}
                  placeholder="e.g. JSG"
                  className={`${inputCls} ${errors.shortCode ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.shortCode} />
              </div>
            </div>

            <div
              className={`grid gap-4 ${isEditMode ? 'grid-cols-2' : 'grid-cols-1'}`}
            >
              {isEditMode && (
                <div>
                  <Label>Company Code</Label>
                  <input
                    value={form.companyCode}
                    disabled
                    className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                  />
                </div>
              )}
              <div>
                <Label>GST Number</Label>
                <input
                  value={form.gstNumber}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    set('gstNumber', val);
                    setErrorFor('gstNumber', validateGSTNumberOptional(val));
                  }}
                  placeholder="Enter GST Number"
                  className={`${inputCls} ${errors.gstNumber ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.gstNumber} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label required>PAN Number</Label>
                <input
                  value={form.panNumber}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    set('panNumber', val);
                    setErrorFor('panNumber', validatePAN(val));
                  }}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className={`${inputCls} ${errors.panNumber ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.panNumber} />
              </div>
              <div>
                <Label required>Mobile Number</Label>
                <input
                  value={form.mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    set('mobile', val);
                    setErrorFor('mobile', validateMobile(val));
                  }}
                  placeholder="+91 98675 34210"
                  maxLength={10}
                  className={`${inputCls} ${errors.mobile ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.mobile} />
              </div>
              <div>
                <Label>Alternate Mobile Number</Label>
                <input
                  value={form.altMobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    set('altMobile', val);
                    setErrorFor('altMobile', validateAltMobileOptional(val));
                  }}
                  placeholder="Secondary Mobile"
                  maxLength={10}
                  className={`${inputCls} ${errors.altMobile ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.altMobile} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label required>Email</Label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    const val = e.target.value;
                    set('email', val);
                    setErrorFor('email', validateEmail(val));
                  }}
                  placeholder="company@example.com"
                  className={`${inputCls} ${errors.email ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.email} />
              </div>
              <ImageUploadBox
                label="Company Logo"
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
          </div>
        )}
      </SectionCard>

      <SectionCard className="mt-4">
        <SectionHeader
          icon={MapPin}
          title="Address Information"
          open={openSections.address}
          onToggle={() => toggleSection('address')}
          hasError={addressSectionHasError}
        />
        {openSections.address && (
          <div className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Address Line 1</Label>
                <input
                  value={form.addressLine1}
                  onChange={(e) => {
                    const val = e.target.value;
                    set('addressLine1', val);
                    setErrorFor(
                      'addressLine1',
                      validateRequired(val, 'Address Line 1'),
                    );
                  }}
                  placeholder="Plot No, Street, Landmark"
                  className={`${inputCls} ${errors.addressLine1 ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.addressLine1} />
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
                <SearchableSelect
                  name="country"
                  value={selectedCountry}
                  onChange={(e) => handleCountryChange({ target: { value: e.target.value } })}
                  options={countries.map((country) => ({ value: country.id, label: country.name }))}
                  placeholder="Select Country"
                  error={!!errors.country}
                />
                <ErrorText error={errors.country} />
              </div>
              <div>
                <Label required>State</Label>
                <SearchableSelect
                  name="state"
                  value={selectedState}
                  onChange={(e) => handleStateChange({ target: { value: e.target.value } })}
                  options={states.map((state) => ({ value: state.id, label: state.name }))}
                  placeholder={selectedCountry ? 'Select State' : 'Select country first'}
                  disabled={!selectedCountry}
                  error={!!errors.state}
                />
                <ErrorText error={errors.state} />
              </div>
              <div>
                <Label required>City</Label>
                <SearchableSelect
                  name="city"
                  value={selectedCity}
                  onChange={(e) => handleCityChange({ target: { value: e.target.value } })}
                  options={cities?.map((city) => ({ value: city.id, label: city.name })) || []}
                  placeholder={selectedState ? 'Select City' : 'Select state first'}
                  disabled={!selectedState}
                  error={!!errors.city}
                />
                <ErrorText error={errors.city} />
              </div>
              <div>
                <Label required>Pincode</Label>
                <input
                  value={form.pincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    set('pincode', val);
                    setErrorFor('pincode', validatePincode(val));
                  }}
                  placeholder="380009"
                  maxLength={6}
                  className={`${inputCls} ${errors.pincode ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.pincode} />
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

      <SectionCard className="mt-4">
        <SectionHeader
          icon={Landmark}
          title="Bank Details"
          open={openSections.bank}
          onToggle={() => toggleSection('bank')}
          hasError={bankSectionHasError}
        />
        {openSections.bank && (
          <div className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label required>Account Holder Name</Label>
                <input
                  value={form.accountHolder}
                  onChange={(e) => {
                    const val = e.target.value;
                    set('accountHolder', val);
                    setErrorFor('accountHolder', validateAccountHolderName(val));
                  }}
                  placeholder="As per bank records"
                  className={`${inputCls} ${errors.accountHolder ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.accountHolder} />
              </div>
              <div>
                <Label required>Account Number</Label>
                <input
                  value={form.accountNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    set('accountNumber', val);
                    setErrorFor('accountNumber', validateAccountNumber(val));
                  }}
                  placeholder="Enter account number"
                  className={`${inputCls} ${errors.accountNumber ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.accountNumber} />
              </div>
              <div>
                <Label required>Bank Name</Label>
                <input
                  value={form.bankName}
                  disabled
                  placeholder={ifscLoading ? 'Looking up bank…' : 'Auto-filled from IFSC'}
                  className={`${inputCls} ${errors.bankName ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.bankName} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label required>Branch Name</Label>
                <input
                  value={form.branchName}
                  disabled
                  placeholder={ifscLoading ? 'Looking up branch…' : 'Auto-filled from IFSC'}
                  className={`${inputCls} ${errors.branchName ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.branchName} />
              </div>
              <div>
                <Label required>IFSC Code</Label>
                <input
                  value={form.ifsc}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    set('ifsc', val);
                    setErrorFor('ifsc', validateIFSC(val));
                  }}
                  onBlur={(e) => handleIfscBlur(e.target.value)}
                  disabled={ifscLoading}
                  placeholder="e.g. HDFC0001234"
                  maxLength={11}
                  className={`${inputCls} ${errors.ifsc ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.ifsc} />
                {ifscLoading && (
                  <p className="text-xs text-gray-400 mt-1">Verifying IFSC…</p>
                )}
              </div>
              <div>
                <Label>UPI ID</Label>
                <input
                  value={form.upiId}
                  onChange={(e) => {
                    const val = e.target.value;
                    set('upiId', val);
                    setErrorFor('upiId', validateUPIOptional(val));
                  }}
                  placeholder="name@bank"
                  className={`${inputCls} ${errors.upiId ? errorInputCls : ''}`}
                />
                <ErrorText error={errors.upiId} />
              </div>
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
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-lg border border-[#737781] text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2.5 rounded-lg text-sky-900 border border-[#084E92] font-semibold text-sm transition cursor-pointer bg-white"
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

export default CompanyRegistration;