import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ChevronDown,
  Check,
  Info,
  Map,
  MapPin,
  Store,
  X,
} from "lucide-react";
import {
  getAllCountry,
  getStateByCountry,
  getCityByState,
  getOrganizationByType,
  saveSubOutlet,
  updateSubOutlet,
} from "@/services/apiServices";
import { OrgTypes } from "@/constants/orgTypes";
import { notify } from "@/utils/toast";
import { useAuth } from '@/auth/context/auth-context';

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

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

function unwrapList(res, hints = []) {
  const body = res && res.data !== undefined ? res.data : res;
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];
  for (const h of hints) {
    if (Array.isArray(body[h])) return body[h];
  }
  for (const key of ["data", "result", "list", "records"]) {
    if (Array.isArray(body[key])) return body[key];
  }
  if (body.data && typeof body.data === "object" && !Array.isArray(body.data)) {
    for (const h of hints) {
      if (Array.isArray(body.data[h])) return body.data[h];
    }
  }
  console.warn("unwrapList: no matching key found.", body, hints);
  return [];
}

// Outlet objects carry the name under companyNameEnglish, not `name`
const getOrgLabel = (o) => (o ? o.companyNameEnglish || o.companyCode || String(o.id ?? "") : "");

const nextSubUnitCode = (outletCode) => (outletCode ? `${outletCode}-SU01` : "Select an outlet first");

const emptyForm = {
  outletId: "",
  subOutletName: "",
  contactPerson: "",
  contactNumber: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  pincode: "",
  latitude: "",
  longitude: "",
  isActive: true,
};

// Maps the row shape used by the sub-unit list/details page onto the full form shape.
const mapSubUnitToForm = (subUnit) => ({
  ...emptyForm,
  id: subUnit.id,
  outletId: subUnit.organizationId ? String(subUnit.organizationId) : "",
  subOutletName: subUnit.subOutletName || "",
  contactPerson: subUnit.contactPerson || "",
  contactNumber: subUnit.contactNumber || "",
  email: subUnit.email || "",
  addressLine1: subUnit.address || "",
  addressLine2: subUnit.addressline2 || "",
  pincode: subUnit.pincode || "",
  latitude: subUnit.latitude || "",
  longitude: subUnit.longitude || "",
  isActive: subUnit.isActive ?? true,
});

const AddSubUnit = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Edit mode is detected purely from router state, same pattern as
  // CompanyRegistration: the list/details page's edit action navigates here
  // with `{ state: { subUnit } }`. No subUnit in state means a fresh registration.
  const editingSubUnit = location.state?.subUnit ?? null;
  const isEditMode = !!editingSubUnit;

  const [outlets, setOutlets] = useState([]);
  const [loadingOutlets, setLoadingOutlets] = useState(true);

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const [locationTouched, setLocationTouched] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [openSections, setOpenSections] = useState({ outlet: true, info: true, address: true });
  const toggleSection = (section) => setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const [form, setForm] = useState(() =>
    isEditMode ? mapSubUnitToForm(editingSubUnit) : emptyForm
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const selectedOutlet = outlets.find((o) => o.id === Number(form.outletId));

  const set = (key, val) => {
    if (["addressLine1", "addressLine2", "pincode", "latitude", "longitude"].includes(key)) {
      setLocationTouched(true);
    }
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  useEffect(() => {
    getOrganizationByType(OrgTypes.OUTLET)
      .then((res) =>
        setOutlets(unwrapList(res, ["Organization Details", "Outlet Details", "organizations", "outlets"]))
      )
      .catch((err) => console.error("Failed to load outlets", err))
      .finally(() => setLoadingOutlets(false));

    getAllCountry()
      .then((res) => setCountries(res.data.data))
      .catch((err) => console.log("Country error", err));
  }, []);

  useEffect(() => {
    if (!isEditMode) return;

    setSelectedCountry(editingSubUnit.countryId?.toString() || "");
    setSelectedState(editingSubUnit.stateId?.toString() || "");
    setSelectedCity(editingSubUnit.cityId?.toString() || "");

    (async () => {
      try {
        if (editingSubUnit.countryId) {
          const stateRes = await getStateByCountry(editingSubUnit.countryId);
          setStates(stateRes.data.data);
        }
        if (editingSubUnit.stateId) {
          const cityRes = await getCityByState(editingSubUnit.stateId);
          setCities(cityRes.data.data["City Details"] || []);
        }
      } catch (err) {
        console.log(err);
      }
    })();
  }, [isEditMode, editingSubUnit]);

  const handleCountryChange = async (e) => {
    const countryId = e.target.value;
    setLocationTouched(true);
    setSelectedCountry(countryId);
    setStates([]);
    setCities([]);
    setSelectedState("");
    setSelectedCity("");

    try {
      const res = await getStateByCountry(countryId);
      setStates(res.data.data);
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

    try {
      const res = await getCityByState(stateId);
      setCities(res?.data?.data?.["City Details"] || []);
    } catch (err) {
      console.log("City error", err);
    }
  };

  // Auto-fill address/location from the selected outlet. Only runs once per
  // outlet selection, and only if the user hasn't started editing location
  // fields themselves.
  useEffect(() => {
    if (!selectedOutlet || locationTouched) return;

    setForm((f) => ({
      ...f,
      addressLine1: f.addressLine1 || selectedOutlet.addressEnglish || "",
      pincode: f.pincode || selectedOutlet.pincode || "",
      latitude: f.latitude || selectedOutlet.latitude || "",
      longitude: f.longitude || selectedOutlet.longitude || "",
    }));

    if (selectedOutlet.countryId) setSelectedCountry(String(selectedOutlet.countryId));
    if (selectedOutlet.stateId) setSelectedState(String(selectedOutlet.stateId));
    if (selectedOutlet.cityId) setSelectedCity(String(selectedOutlet.cityId));

    (async () => {
      try {
        if (selectedOutlet.countryId) {
          const stateRes = await getStateByCountry(selectedOutlet.countryId);
          setStates(stateRes.data.data);
        }
        if (selectedOutlet.stateId) {
          const cityRes = await getCityByState(selectedOutlet.stateId);
          setCities(cityRes?.data?.data?.["City Details"] || []);
        }
      } catch (err) {
        console.log(err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOutlet]);

  const handleOutletChange = (e) => {
    setLocationTouched(false);
    set("outletId", e.target.value);
  };

  const requiredFields = ["outletId", "subOutletName", "email", "addressLine1", "pincode"];

  function validate() {
    const next = {};
    requiredFields.forEach((k) => {
      if (!String(form[k] || "").trim()) next[k] = "Required";
    });
    if (!selectedCountry) next.country = "Required";
    if (!selectedState) next.state = "Required";
    if (!selectedCity) next.city = "Required";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      username: user?.email || "",
      address: form.addressLine1,
      addressline2: form.addressLine2,
      cityId: Number(selectedCity),
      contactNumber: form.contactNumber,
      contactPerson: form.contactPerson,
      countryId: Number(selectedCountry),
      email: form.email,
      isActive: form.isActive,
      latitude: form.latitude,
      longitude: form.longitude,
      organizationId: Number(form.outletId),
      pincode: form.pincode,
      stateId: Number(selectedState),
      subOutletName: form.subOutletName,
    };

    try {
      if (isEditMode) {
        await updateSubOutlet({ id: editingSubUnit.id, ...payload });
        notify.success("Sub Unit Updated Successfully");
      } else {
        await saveSubOutlet(payload);
        notify.success("Sub Unit Added Successfully");
      }
      navigate("/sub-units");
    } catch (err) {
      console.error("Sub unit save error:", err.response?.data || err.message);
      notify.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-4 min-h-screen p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
          {isEditMode ? "Update Sub Unit" : "Register Sub Unit"}
        </h1>
        <p className="text-[#43474F] mt-2">
          {isEditMode
            ? `Edit the details for ${editingSubUnit.subOutletName || ""} and save your changes.`
            : "Complete the form below to register a new sub unit under an existing outlet."}
        </p>
      </div>

      <SectionCard className="mt-4">
        <SectionHeader
          icon={Store}
          title="Parent Outlet"
          subtitle="The sub unit will be registered under this outlet"
          open={openSections.outlet}
          onToggle={() => toggleSection("outlet")}
        />
        {openSections.outlet && (
          <div className="px-6 py-6">
            <div className={`grid gap-4 ${isEditMode ? "grid-cols-2" : "grid-cols-1"}`}>
              <div>
                <Label required>Outlet</Label>
                <p className={inputCls}>
                  <select
                    value={form.outletId}
                    onChange={handleOutletChange}
                    disabled={loadingOutlets}
                    className="w-full outline-none"
                  >
                    <option value="">{loadingOutlets ? "Loading outlets..." : "Select Outlet"}</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {getOrgLabel(o)}
                      </option>
                    ))}
                  </select>
                </p>
                {errors.outletId && <p className="text-xs text-red-500 mt-1">{errors.outletId}</p>}
                {selectedOutlet && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    {selectedOutlet.companyCode} · {selectedOutlet.cityName}, {selectedOutlet.stateName}
                  </p>
                )}
              </div>

              {isEditMode && (
                <div>
                  <Label>Sub Unit Code</Label>
                  <input
                    value={nextSubUnitCode(selectedOutlet && selectedOutlet.companyCode)}
                    disabled
                    className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard className="mt-4">
        <SectionHeader
          icon={Info}
          title="Sub Unit Information"
          open={openSections.info}
          onToggle={() => toggleSection("info")}
        />
        {openSections.info && (
          <div className="px-6 py-6 space-y-5">
            <div>
              <Label required>Sub Outlet Name</Label>
              <input
                value={form.subOutletName}
                onChange={(e) => set("subOutletName", e.target.value)}
                placeholder="e.g. Maninagar - Billing Counter"
                className={inputCls}
              />
              {errors.subOutletName && <p className="text-xs text-red-500 mt-1">{errors.subOutletName}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Contact Person</Label>
                <input
                  value={form.contactPerson}
                  onChange={(e) => set("contactPerson", e.target.value)}
                  placeholder="e.g. Raj Patel"
                  className={inputCls}
                />
              </div>
              <div>
                <Label>Contact Number</Label>
                <input
                  value={form.contactNumber}
                  onChange={(e) => set("contactNumber", e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className={inputCls}
                />
              </div>
              <div>
                <Label required>Email</Label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="subunit@example.com"
                  className={inputCls}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard className="mt-4">
        <SectionHeader
          icon={MapPin}
          title="Address Information"
          open={openSections.address}
          onToggle={() => toggleSection("address")}
        />
        {openSections.address && (
          <div className="px-6 py-6 space-y-5">
            {selectedOutlet && !locationTouched && (
              <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                Pre-filled from {getOrgLabel(selectedOutlet)}'s address. Edit any field below if this sub unit
                is located elsewhere.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Address Line 1</Label>
                <input
                  value={form.addressLine1}
                  onChange={(e) => set("addressLine1", e.target.value)}
                  placeholder="Plot No, Street, Landmark"
                  className={inputCls}
                />
                {errors.addressLine1 && <p className="text-xs text-red-500 mt-1">{errors.addressLine1}</p>}
              </div>
              <div>
                <Label>Address Line 2</Label>
                <input
                  value={form.addressLine2}
                  onChange={(e) => set("addressLine2", e.target.value)}
                  placeholder="Area, Building Name"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label required>Country</Label>
                <p className={inputCls}>
                  <select value={selectedCountry} onChange={handleCountryChange} className="w-full outline-none">
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </p>
                {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country}</p>}
              </div>
              <div>
                <Label required>State</Label>
                <p className={inputCls}>
                  <select value={selectedState} onChange={handleStateChange} className="w-full outline-none">
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </p>
                {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
              </div>
              <div>
                <Label required>City</Label>
                <p className={inputCls}>
                  <select
                    value={selectedCity}
                    onChange={(e) => {
                      setLocationTouched(true);
                      setSelectedCity(e.target.value);
                    }}
                    className="w-full outline-none"
                  >
                    <option value="">Select City</option>
                    {cities?.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </p>
                {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
              </div>
              <div>
                <Label required>Pincode</Label>
                <input
                  value={form.pincode}
                  onChange={(e) => set("pincode", e.target.value)}
                  placeholder="380009"
                  maxLength={6}
                  className={inputCls}
                />
                {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
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
  );
};

export default AddSubUnit;