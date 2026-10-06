import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  ChevronDown,
  Info,
  MapPin,
  Layers,
  Map,
  X,
  Check,
} from "lucide-react";
import {
  getOrganizationByType,
  getAllSubOutlets,
  getAllSubOutletsByOrganization,
  getSubOutletById,
  saveSubLocation,
  updateSubLocation,
  getAllCountry,
  getStateByCountry,
  getCityByState,
} from "@/services/apiServices";
import { OrgTypes } from "@/constants/orgTypes";
import { notify } from "@/utils/toast";
import { useAuth } from '@/auth/context/auth-context';
import { useOrgScope } from "@/hooks/useOrgScope";
import {
  validateRequired,
  validateEmail,
  validateMobile,
  validatePincode,
} from '@/utils/validations';
import SearchableSelect from "../../utils/SearchableSelect";
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { Switch } from '@/components/ui/switch';

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const ErrorText = ({ error }) =>
  error ? <p className="text-xs text-red-500 mt-1">{error}</p> : null;

const SectionCard = ({ children, className = "" }) => (
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
      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
  </div>
);

// MapPickerModal using Leaflet (OpenStreetMap)
const MapPickerModal = ({ initialLat, initialLng, onConfirm, onClose }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [coords, setCoords] = useState({
    lat: initialLat ? parseFloat(initialLat) : 23.0225,
    lng: initialLng ? parseFloat(initialLng) : 72.5714,
  });
  const [loaded, setLoaded] = useState(!!(typeof window !== "undefined" && window.L));

  useEffect(() => {
    if (window.L) {
      setLoaded(true);
      return;
    }
    let cancelled = false;

    if (!document.querySelector("link[data-leaflet]")) {
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      cssLink.setAttribute("data-leaflet", "true");
      document.head.appendChild(cssLink);
    }

    const existingScript = document.querySelector("script[data-leaflet]");
    if (existingScript) {
      existingScript.addEventListener("load", () => !cancelled && setLoaded(true));
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.setAttribute("data-leaflet", "true");
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

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map);

    const updateFromLatLng = (latlng) => {
      setCoords({ lat: latlng.lat, lng: latlng.lng });
      marker.setLatLng(latlng);
    };

    map.on("click", (e) => updateFromLatLng(e.latlng));
    marker.on("dragend", () => updateFromLatLng(marker.getLatLng()));

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
          <div ref={mapRef} className={loaded ? "h-80 w-full" : "h-0 w-full overflow-hidden"} />
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

const LOCATION_TYPE_OPTIONS = [
  { value: "STORE", label: "STORE" },
  { value: "KITCHEN", label: "KITCHEN" },
];

const emptyForm = {
  organizationId: "",
  subOutletId: "",
  locationName: "",
  locationType: "STORE",
  shortCode: "",
  contactPerson: "",
  contactNumber: "",
  email: "",
  address: "",
  pincode: "",
  latitude: "",
  longitude: "",
  isActive: true,
};

const mapSubLocationToForm = (subLocation) => {
  if (!subLocation) return emptyForm;
  const raw = subLocation.originalData || subLocation;
  return {
    ...emptyForm,
    id: raw.id,
    organizationId: raw.organizationId
      ? String(raw.organizationId)
      : raw.orgId
        ? String(raw.orgId)
        : "",
    subOutletId: raw.subOutletId
      ? String(raw.subOutletId)
      : raw.subUnitId
        ? String(raw.subUnitId)
        : "",
    locationName: raw.locationName || raw.name || "",
    locationType: raw.locationType || raw.type || "STORE",
    shortCode: raw.shortCode || "",
    contactPerson: raw.contactPerson || "",
    contactNumber: raw.contactNumber || raw.mobile || "",
    email: raw.email || "",
    address: raw.address || raw.addressEnglish || raw.addressLine1 || "",
    pincode: raw.pincode ? String(raw.pincode) : "",
    latitude: raw.latitude ? String(raw.latitude) : "",
    longitude: raw.longitude ? String(raw.longitude) : "",
    isActive: raw.isActive ?? true,
  };
};

const AddSubLocation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    loading: scopeLoading,
    showUnitDropdown,
    effectiveOutletId,
  } = useOrgScope();

  const editingSubLocation = location.state?.subLocation ?? null;
  const isEditMode = !!editingSubLocation;

  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(true);

  const [subUnits, setSubUnits] = useState([]);
  const [loadingSubUnits, setLoadingSubUnits] = useState(true);

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const [locationTouched, setLocationTouched] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [openSections, setOpenSections] = useState({
    hierarchy: true,
    info: true,
    address: true,
  });

  const toggleSection = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const [form, setForm] = useState(() =>
    isEditMode ? mapSubLocationToForm(editingSubLocation) : emptyForm
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const rawSubLocation = editingSubLocation?.originalData || editingSubLocation;

  // Selected sub unit object for pre-fill info banner
  const selectedSubUnitObj = useMemo(() => {
    return subUnits.find((su) => String(su.id) === String(form.subOutletId)) || null;
  }, [subUnits, form.subOutletId]);

  // Load countries on mount
  useEffect(() => {
    getAllCountry()
      .then((res) => setCountries(res?.data?.data || []))
      .catch((err) => console.log("Country error", err));
  }, []);

  // Auto-set organizationId for logged-in Outlet user only after scope is resolved
  useEffect(() => {
    if (!scopeLoading && !showUnitDropdown && effectiveOutletId) {
      setForm((prev) => {
        if (!prev.organizationId || prev.organizationId === "0" || prev.organizationId === "") {
          return { ...prev, organizationId: String(effectiveOutletId) };
        }
        return prev;
      });
    }
  }, [scopeLoading, showUnitDropdown, effectiveOutletId]);

  // Load parent Units if dropdown is enabled
  useEffect(() => {
    if (scopeLoading) return;
    if (showUnitDropdown) {
      getOrganizationByType(OrgTypes.OUTLET)
        .then((res) => {
          const list =
            res?.data?.data ||
            res?.data?.content ||
            res?.data ||
            [];
          setUnits(Array.isArray(list) ? list : []);
        })
        .catch((err) => console.error("Failed to load units", err))
        .finally(() => setLoadingUnits(false));
    } else {
      setLoadingUnits(false);
    }
  }, [scopeLoading, showUnitDropdown]);

  // Load Sub Units (Parent Sub Outlets)
  useEffect(() => {
    if (scopeLoading) return;
    const fetchSubUnitsData = async () => {
      setLoadingSubUnits(true);
      try {
        if (!showUnitDropdown && effectiveOutletId) {
          const res = await getAllSubOutletsByOrganization(effectiveOutletId);
          const list = res?.data?.data || res?.data || [];
          setSubUnits(Array.isArray(list) ? list : []);
        } else {
          const res = await getAllSubOutlets();
          const list = res?.data?.data || res?.data?.content || res?.data || [];
          setSubUnits(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("Failed to load sub units", err);
      } finally {
        setLoadingSubUnits(false);
      }
    };

    fetchSubUnitsData();
  }, [scopeLoading, showUnitDropdown, effectiveOutletId]);

  // If in edit mode, populate form and load country / state / city
  useEffect(() => {
    if (!editingSubLocation) return;
    const raw = editingSubLocation.originalData || editingSubLocation;
    setForm(mapSubLocationToForm(editingSubLocation));

    const countryVal = raw.countryId ? String(raw.countryId) : "";
    const stateVal = raw.stateId ? String(raw.stateId) : "";
    const cityVal = raw.cityId ? String(raw.cityId) : "";

    setSelectedCountry(countryVal);
    setSelectedState(stateVal);
    setSelectedCity(cityVal);

    (async () => {
      try {
        if (raw.countryId) {
          const stateRes = await getStateByCountry(raw.countryId);
          setStates(stateRes?.data?.data || []);
        }
        if (raw.stateId) {
          const cityRes = await getCityByState(raw.stateId);
          setCities(cityRes?.data?.data?.["City Details"] || cityRes?.data?.data || []);
        }
      } catch (err) {
        console.log("Edit location load error:", err);
      }
    })();
  }, [editingSubLocation]);

  const set = (key, val) => {
    if (["address", "pincode", "latitude", "longitude"].includes(key)) {
      setLocationTouched(true);
    }
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setErrorFor = (key, err) =>
    setErrors((prev) => ({ ...prev, [key]: err || undefined }));

  const unitOptions = useMemo(() => {
    const opts = units.map((u) => ({
      value: String(u.id),
      label: u.companyNameEnglish || u.companyCode || `Unit #${u.id}`,
    }));

    if (form.organizationId && !opts.some((o) => String(o.value) === String(form.organizationId))) {
      const fallbackName =
        rawSubLocation?.organizationName ||
        rawSubLocation?.unitName ||
        `Unit #${form.organizationId}`;
      opts.unshift({ value: String(form.organizationId), label: fallbackName });
    }
    return opts;
  }, [units, form.organizationId, rawSubLocation]);

  const subUnitOptions = useMemo(() => {
    let list = subUnits;
    if (form.organizationId && showUnitDropdown) {
      list = list.filter(
        (su) => String(su.organizationId || su.orgId) === String(form.organizationId)
      );
    }
    const opts = list.map((su) => ({
      value: String(su.id),
      label: su.subOutletName || su.name || `Sub Unit #${su.id}`,
    }));

    if (form.subOutletId && !opts.some((o) => String(o.value) === String(form.subOutletId))) {
      const fallbackName =
        rawSubLocation?.subOutletName ||
        rawSubLocation?.subUnitName ||
        `Sub Unit #${form.subOutletId}`;
      opts.unshift({ value: String(form.subOutletId), label: fallbackName });
    }
    return opts;
  }, [subUnits, form.organizationId, form.subOutletId, showUnitDropdown, rawSubLocation]);

  const countryOptions = useMemo(() => {
    const opts = (countries || []).map((c) => ({ value: String(c.id), label: c.name }));
    if (selectedCountry && !opts.some((c) => String(c.value) === String(selectedCountry))) {
      if (rawSubLocation?.countryName) {
        opts.unshift({ value: String(selectedCountry), label: rawSubLocation.countryName });
      }
    }
    return opts;
  }, [countries, selectedCountry, rawSubLocation]);

  const stateOptions = useMemo(() => {
    const opts = (states || []).map((s) => ({ value: String(s.id), label: s.name }));
    if (selectedState && !opts.some((s) => String(s.value) === String(selectedState))) {
      if (rawSubLocation?.stateName) {
        opts.unshift({ value: String(selectedState), label: rawSubLocation.stateName });
      }
    }
    return opts;
  }, [states, selectedState, rawSubLocation]);

  const cityOptions = useMemo(() => {
    const opts = (cities || []).map((c) => ({ value: String(c.id), label: c.name || c.cityName }));
    if (selectedCity && !opts.some((c) => String(c.value) === String(selectedCity))) {
      if (rawSubLocation?.cityName) {
        opts.unshift({ value: String(selectedCity), label: rawSubLocation.cityName });
      }
    }
    return opts;
  }, [cities, selectedCity, rawSubLocation]);

  const handleCountryChange = async (e) => {
    const countryId = e.target.value;
    setLocationTouched(true);
    setSelectedCountry(countryId);
    setStates([]);
    setCities([]);
    setSelectedState("");
    setSelectedCity("");
    setErrorFor("country", validateRequired(countryId, "Country"));
    setErrorFor("state", "");
    setErrorFor("city", "");

    try {
      const res = await getStateByCountry(countryId);
      setStates(res?.data?.data || []);
    } catch (err) {
      console.log("State error", err);
    }
  };

  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    setLocationTouched(true);
    setSelectedState(stateId);
    setCities([]);
    setSelectedCity("");
    setErrorFor("state", validateRequired(stateId, "State"));
    setErrorFor("city", "");

    try {
      const res = await getCityByState(stateId);
      setCities(res?.data?.data?.["City Details"] || res?.data?.data || []);
    } catch (err) {
      console.log("City error", err);
    }
  };

  const handleUnitChange = (unitId) => {
    set("organizationId", unitId);

    // If currently selected sub-unit does not belong to new unit, clear it
    if (form.subOutletId) {
      const su = subUnits.find((s) => String(s.id) === String(form.subOutletId));
      if (su && String(su.organizationId || su.orgId) !== String(unitId)) {
        set("subOutletId", "");
      }
    }
  };

  const handleSubUnitChange = async (subUnitId) => {
    setLocationTouched(false);
    set("subOutletId", subUnitId);
    setErrorFor("subOutletId", validateRequired(subUnitId, "Sub Unit / Location"));

    let matchingSubUnit = subUnits.find((su) => String(su.id) === String(subUnitId));

    // If detailed address is missing from the list, fetch full subunit details
    if (subUnitId && (!matchingSubUnit || (!matchingSubUnit.countryId && !matchingSubUnit.address))) {
      try {
        const detailRes = await getSubOutletById(subUnitId);
        const detailed = detailRes?.data?.data || detailRes?.data;
        if (detailed) {
          matchingSubUnit = detailed;
        }
      } catch (err) {
        console.warn("Could not fetch subunit details:", err);
      }
    }

    if (matchingSubUnit) {
      if (showUnitDropdown) {
        const parentUnitId = matchingSubUnit.organizationId || matchingSubUnit.orgId;
        if (parentUnitId && String(parentUnitId) !== String(form.organizationId)) {
          set("organizationId", String(parentUnitId));
        }
      }

      // Auto-fill address fields from the selected sub-unit
      if (!isEditMode) {
        setForm((f) => ({
          ...f,
          address: matchingSubUnit.address || matchingSubUnit.addressLine1 || matchingSubUnit.addressEnglish || f.address,
          pincode: matchingSubUnit.pincode ? String(matchingSubUnit.pincode) : f.pincode,
          latitude: matchingSubUnit.latitude ? String(matchingSubUnit.latitude) : f.latitude,
          longitude: matchingSubUnit.longitude ? String(matchingSubUnit.longitude) : f.longitude,
        }));

        const cId = matchingSubUnit.countryId ? String(matchingSubUnit.countryId) : "";
        const sId = matchingSubUnit.stateId ? String(matchingSubUnit.stateId) : "";
        const ctId = matchingSubUnit.cityId ? String(matchingSubUnit.cityId) : "";

        if (cId) {
          setSelectedCountry(cId);
          setErrorFor("country", "");
        }
        if (sId) {
          setSelectedState(sId);
          setErrorFor("state", "");
        }
        if (ctId) {
          setSelectedCity(ctId);
          setErrorFor("city", "");
        }

        try {
          if (cId) {
            const stateRes = await getStateByCountry(cId);
            setStates(stateRes?.data?.data || []);
          }
          if (sId) {
            const cityRes = await getCityByState(sId);
            setCities(cityRes?.data?.data?.["City Details"] || cityRes?.data?.data || []);
          }
        } catch (err) {
          console.error("Auto-fill location fetch error:", err);
        }
      }
    }
  };

  function validate() {
    const next = {};

    const targetOrgId = form.organizationId || (!showUnitDropdown ? String(effectiveOutletId) : "");
    const unitErr = validateRequired(targetOrgId, "Unit");
    if (unitErr) next.organizationId = unitErr;

    const subUnitErr = validateRequired(form.subOutletId, "Sub Unit / Location");
    if (subUnitErr) next.subOutletId = subUnitErr;

    const nameErr = validateRequired(form.locationName, "Location Name");
    if (nameErr) next.locationName = nameErr;

    const typeErr = validateRequired(form.locationType, "Location Type");
    if (typeErr) next.locationType = typeErr;

    const addressErr = validateRequired(form.address, "Address");
    if (addressErr) next.address = addressErr;

    if (form.pincode) {
      const pincodeErr = validatePincode(form.pincode);
      if (pincodeErr) next.pincode = pincodeErr;
    }

    if (form.email) {
      const emailErr = validateEmail(form.email);
      if (emailErr) next.email = emailErr;
    }

    if (form.contactNumber) {
      const contactErr = validateMobile(form.contactNumber);
      if (contactErr) next.contactNumber = contactErr;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);

    const targetOrgId = form.organizationId || (!showUnitDropdown ? Number(effectiveOutletId) : 0);

    const payload = {
      id: isEditMode ? editingSubLocation.id : 0,
      organizationId: Number(targetOrgId),
      subOutletId: Number(form.subOutletId),
      locationName: form.locationName.trim(),
      locationType: form.locationType,
      shortCode: form.shortCode?.trim() || "",
      contactPerson: form.contactPerson?.trim() || "",
      contactNumber: form.contactNumber?.trim() || "",
      email: form.email?.trim() || "",
      address: form.address?.trim() || "",
      cityId: selectedCity ? Number(selectedCity) : 0,
      stateId: selectedState ? Number(selectedState) : 0,
      countryId: selectedCountry ? Number(selectedCountry) : 0,
      pincode: form.pincode ? String(form.pincode).trim() : "",
      latitude: form.latitude ? String(form.latitude) : "",
      longitude: form.longitude ? String(form.longitude) : "",
      isActive: Boolean(form.isActive),
      username: user?.email || "",
    };

    try {
      if (isEditMode) {
        await updateSubLocation(payload);
        notify.success("Sub Location Updated Successfully");
      } else {
        await saveSubLocation(payload);
        notify.success("Sub Location Added Successfully");
      }
      navigate("/sub-locations");
    } catch (err) {
      console.error("Sub location save error:", err.response?.data || err.message);
      notify.error(err, "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const subOutletDisplayName =
    selectedSubUnitObj?.subOutletName ||
    selectedSubUnitObj?.name ||
    rawSubLocation?.subOutletName ||
    "Sub Unit";

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title={isEditMode ? "Update Sub Location" : "Register Sub Location"}
          description={
            isEditMode
              ? `Edit the details for ${editingSubLocation.locationName || ""} and save your changes.`
              : "Complete the form below to register a new sub location under a subunit / location."
          }
          actions={
            <button
              type="button"
              onClick={() => navigate('/sub-locations')}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0 shrink-0 whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sub Locations
            </button>
          }
        />

        {/* Section 1: Hierarchy Selection */}
        <SectionCard className="mt-4">
          <SectionHeader
            icon={Layers}
            title="Parent Hierarchy"
            subtitle={
              showUnitDropdown
                ? "Select the parent Unit and Sub Unit for this sub location"
                : "Select the Sub Unit / location for this sub location"
            }
            open={openSections.hierarchy}
            onToggle={() => toggleSection("hierarchy")}
          />
          {openSections.hierarchy && (
            <div className="px-6 py-6">
              <div className={`grid gap-4 ${showUnitDropdown ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 max-w-2xl"}`}>
                {showUnitDropdown && (
                  <div>
                    <Label required>Parent Unit</Label>
                    <SearchableSelect
                      name="organizationId"
                      value={form.organizationId}
                      onChange={(e) => handleUnitChange(e.target.value)}
                      options={unitOptions}
                      placeholder={loadingUnits ? "Loading units..." : "Select Parent Unit"}
                      disabled={loadingUnits}
                      hasError={!!errors.organizationId}
                    />
                    <ErrorText error={errors.organizationId} />
                  </div>
                )}

                <div>
                  <Label required>Sub Unit / Location</Label>
                  <SearchableSelect
                    name="subOutletId"
                    value={form.subOutletId}
                    onChange={(e) => handleSubUnitChange(e.target.value)}
                    options={subUnitOptions}
                    placeholder={
                      loadingSubUnits
                        ? "Loading sub units..."
                        : showUnitDropdown && form.organizationId
                          ? "Select Sub Unit / Location"
                          : "Select Sub Unit / Location"
                    }
                    disabled={loadingSubUnits}
                    hasError={!!errors.subOutletId}
                  />
                  <ErrorText error={errors.subOutletId} />
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Section 2: Sub Location Info */}
        <SectionCard className="mt-4">
          <SectionHeader
            icon={Info}
            title="Sub Location Details"
            subtitle="Name, type, code, and contact information"
            open={openSections.info}
            onToggle={() => toggleSection("info")}
          />
          {openSections.info && (
            <div className="px-6 py-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label required>Sub Location Name</Label>
                  <input
                    value={form.locationName}
                    onChange={(e) => {
                      const val = e.target.value;
                      set("locationName", val);
                      setErrorFor("locationName", validateRequired(val, "Location Name"));
                    }}
                    placeholder="e.g. Main Kitchen, Ground Floor Store, Bar Storage"
                    className={`${inputCls} ${errors.locationName ? "border-red-400" : ""}`}
                  />
                  <ErrorText error={errors.locationName} />
                </div>

                <div>
                  <Label>Short Code</Label>
                  <input
                    value={form.shortCode}
                    onChange={(e) => set("shortCode", e.target.value.toUpperCase())}
                    placeholder="e.g. MK-01, STR-01"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Location Type Dropdown & Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div className="sm:col-span-1">
                  <Label required>Location Type</Label>
                  <SearchableSelect
                    name="locationType"
                    value={form.locationType}
                    onChange={(e) => {
                      const val = e.target.value;
                      set("locationType", val);
                      setErrorFor("locationType", validateRequired(val, "Location Type"));
                    }}
                    options={LOCATION_TYPE_OPTIONS}
                    placeholder="Select Location Type"
                    hasError={!!errors.locationType}
                  />
                  <ErrorText error={errors.locationType} />
                </div>

                <div className="sm:col-span-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-3 h-[42px] px-3.5 border border-gray-200 rounded-lg bg-gray-50/50">
                    <Switch
                      id="subLocationActive"
                      checked={form.isActive}
                      onCheckedChange={(checked) => set("isActive", checked)}
                      size="sm"
                    />
                    <label htmlFor="subLocationActive" className="text-sm text-gray-700 cursor-pointer select-none flex items-center gap-1.5">
                      <span className="font-semibold text-gray-800">{form.isActive ? "Active" : "Inactive"}</span>
                      <span className="text-xs text-gray-500">— {form.isActive ? "Available for operations" : "Disabled for operations"}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <Label>Contact Person</Label>
                  <input
                    value={form.contactPerson}
                    onChange={(e) => set("contactPerson", e.target.value)}
                    placeholder="e.g. Ramesh Shah"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Contact Number</Label>
                  <input
                    value={form.contactNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      set("contactNumber", val);
                      setErrorFor("contactNumber", val ? validateMobile(val) : "");
                    }}
                    placeholder="9876543210"
                    maxLength={10}
                    className={`${inputCls} ${errors.contactNumber ? "border-red-400" : ""}`}
                  />
                  <ErrorText error={errors.contactNumber} />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      const val = e.target.value;
                      set("email", val);
                      setErrorFor("email", val ? validateEmail(val) : "");
                    }}
                    placeholder="kitchen@example.com"
                    className={`${inputCls} ${errors.email ? "border-red-400" : ""}`}
                  />
                  <ErrorText error={errors.email} />
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Section 3: Address Information (identical to Sub-Unit) */}
        <SectionCard className="mt-4">
          <SectionHeader
            icon={MapPin}
            title="Address Information"
            subtitle="Location, country, state, city, pincode, and coordinates"
            open={openSections.address}
            onToggle={() => toggleSection("address")}
          />
          {openSections.address && (
            <div className="px-6 py-6 space-y-4">
              {form.subOutletId && !locationTouched && !isEditMode && (
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  Pre-filled from {subOutletDisplayName}'s address. Edit any field below if this sub location
                  is located elsewhere.
                </p>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label required>Address</Label>
                  <input
                    value={form.address}
                    onChange={(e) => {
                      const val = e.target.value;
                      set("address", val);
                      setErrorFor("address", validateRequired(val, "Address"));
                    }}
                    placeholder="Floor No, Room, Area, Landmark"
                    className={`${inputCls} ${errors.address ? "border-red-400" : ""}`}
                  />
                  <ErrorText error={errors.address} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label>Country</Label>
                    <SearchableSelect
                      name="country"
                      value={selectedCountry}
                      onChange={(e) => handleCountryChange({ target: { value: e.target.value } })}
                      options={countryOptions}
                      placeholder="Select Country"
                      hasError={!!errors.country}
                    />
                    <ErrorText error={errors.country} />
                  </div>
                  <div>
                    <Label>State</Label>
                    <SearchableSelect
                      name="state"
                      value={selectedState}
                      onChange={(e) => handleStateChange({ target: { value: e.target.value } })}
                      options={stateOptions}
                      placeholder={selectedCountry ? "Select State" : "Select country first"}
                      disabled={!selectedCountry}
                      hasError={!!errors.state}
                    />
                    <ErrorText error={errors.state} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <SearchableSelect
                      name="city"
                      value={selectedCity}
                      onChange={(e) => {
                        setLocationTouched(true);
                        setSelectedCity(e.target.value);
                      }}
                      options={cityOptions}
                      placeholder={selectedState ? "Select City" : "Select state first"}
                      disabled={!selectedState}
                      hasError={!!errors.city}
                    />
                    <ErrorText error={errors.city} />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <input
                      value={form.pincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        set("pincode", val);
                        setErrorFor("pincode", val ? validatePincode(val) : "");
                      }}
                      placeholder="380009"
                      maxLength={6}
                      className={`${inputCls} ${errors.pincode ? "border-red-400" : ""}`}
                    />
                    <ErrorText error={errors.pincode} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <input
                    value={form.latitude}
                    onChange={(e) => set("latitude", e.target.value)}
                    placeholder="23.0225"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <input
                    value={form.longitude}
                    onChange={(e) => set("longitude", e.target.value)}
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
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-lg border border-[#737781] text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition disabled:opacity-60"
          >
            {saving ? "Saving..." : isEditMode ? "Update" : "Save"}
          </button>
        </div>

        {showMapPicker && (
          <MapPickerModal
            initialLat={form.latitude}
            initialLng={form.longitude}
            onClose={() => setShowMapPicker(false)}
            onConfirm={({ lat, lng }) => {
              set("latitude", lat.toFixed(6));
              set("longitude", lng.toFixed(6));
              setShowMapPicker(false);
            }}
          />
        )}
      </div>
    </Container>
  );
};

export default AddSubLocation;
