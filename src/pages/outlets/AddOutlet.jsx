// Requires: npm install leaflet react-leaflet
// (OpenStreetMap tiles are used for the map picker, no API key needed)

import React, { useState, useRef, useEffect } from "react";
import {
  Briefcase,
  Building2,
  ChevronDown,
  ImageUp,
  Info,
  Landmark,
  MapPin,
  X,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [23.0225, 72.5714]; // Ahmedabad fallback

const COMPANIES = [
  "Jaiswal Group",
  "Jaiswal Retail Pvt Ltd",
  "Jaiswal Enterprises",
  "Jaiswal Foods & Beverages",
];

const SERVICE_TYPES = [
  "Retail Store",
  "Wholesale Depot",
  "Franchise Outlet",
  "Service Center",
  "Warehouse",
];

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
    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1">
      <h2 className="text-sm font-bold text-gray-800 leading-none">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
    <button
      type="button"
      onClick={onToggle}
      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
    >
      <ChevronDown
        className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>
  </div>
);

const ImageUploadBox = ({ label, hint, value, onChange }) => {
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onChange(URL.createObjectURL(file));
  };

  return (
    <div>
      <Label>{label}</Label>
      <div
        onClick={() => fileRef.current?.click()}
        className="relative w-full border border-dashed border-gray-300 rounded-lg px-3.5 py-2.5 flex items-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition bg-white"
      >
        {value ? (
          <img src={value} alt={label} className="w-8 h-8 rounded-md object-cover border border-gray-200 flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
            <ImageUp className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-gray-600 truncate">{value ? "Replace image" : "Click to upload"}</p>
          <p className="text-xs text-gray-400">{hint}</p>
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="ml-auto w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition cursor-pointer bg-white flex-shrink-0"
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
      className={`${inputCls} appearance-none pr-9 cursor-pointer ${value === "" ? "text-gray-400" : "text-gray-800"}`}
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

// Recenters the map when coordinates change from outside a map click (e.g. manual lat/lng typing)
const RecenterOnChange = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom() < 13 ? 14 : map.getZoom(), { duration: 0.6 });
    }
  }, [position, map]);
  return null;
};

const LocationMarker = ({ position, onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return position ? (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          onSelect(lat, lng);
        },
      }}
    />
  ) : null;
};

const MapPicker = ({ latitude, longitude, onSelect }) => {
  const hasCoords = latitude !== "" && longitude !== "" && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude));
  const position = hasCoords ? [parseFloat(latitude), parseFloat(longitude)] : null;

  return (
    <div className="w-full h-56 rounded-xl overflow-hidden border border-gray-200 relative z-0">
      <MapContainer
        center={position || DEFAULT_CENTER}
        zoom={position ? 14 : 12}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} onSelect={onSelect} />
        <RecenterOnChange position={position} />
      </MapContainer>
    </div>
  );
};

const AddOutlet = () => {

  const [openSection, setOpenSection] = useState("outlet");
  const toggleSection = (section) =>
    setOpenSection((prev) => (prev === section ? prev : section));

  const [form, setForm] = useState({
    outletName: "",
    outletCode: "AHD-2526-0001",
    logo: null,
    favicon: null,
    shortCode: "",
    email: "",
    company: "",
    serviceType: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    latitude: "",
    longitude: "",
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleMapSelect = (lat, lng) => {
    setForm((f) => ({
      ...f,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 -mt-10">
      <div className="max-w-4xl mx-auto space-y-5 py-12">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-sky-900 leading-none">Add New Outlet</h1>
            <p className="text-xs text-gray-400 mt-0.5">Complete the form below to register a new outlet under the Jaiswal Group ecosystem.</p>
          </div>
        </div>

        {/* Outlet Information */}
        <SectionCard>
          <SectionHeader
            icon={Info}
            title="Outlet Information"
            open={openSection === "outlet"}
            onToggle={() => toggleSection("outlet")}
          />

          {openSection === "outlet" && (
            <div className="px-6 py-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Outlet Name</Label>
                  <input
                    value={form.outletName}
                    onChange={(e) => set("outletName", e.target.value)}
                    placeholder="e.g. Jaiswal Group - Maninagar"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Outlet Code (Auto Generated)</Label>
                  <input
                    value={form.outletCode}
                    disabled
                    className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ImageUploadBox
                  label="Outlet Logo"
                  hint="PNG, JPG upto 2MB"
                  value={form.logo}
                  onChange={(v) => set("logo", v)}
                />
                <ImageUploadBox
                  label="Favicon"
                  hint="32×32 or 64×64px"
                  value={form.favicon}
                  onChange={(v) => set("favicon", v)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Short Code</Label>
                  <input
                    value={form.shortCode}
                    onChange={(e) => set("shortCode", e.target.value)}
                    placeholder="e.g. MNGR01"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label required>Email</Label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="outlet@example.com"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Business Details */}
        <SectionCard>
          <SectionHeader
            icon={Briefcase}
            title="Business Details"
            open={openSection === "business"}
            onToggle={() => toggleSection("business")}
          />

          {openSection === "business" && (
            <div className="grid grid-cols-2 gap-4 px-6 py-6">
              <div>
                <Label required>Company</Label>
                <Select
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
                  placeholder="Select company"
                  options={COMPANIES}
                />
              </div>
              <div>
                <Label required>Service Type</Label>
                <Select
                  value={form.serviceType}
                  onChange={(e) => set("serviceType", e.target.value)}
                  placeholder="Select service type"
                  options={SERVICE_TYPES}
                />
              </div>
            </div>
          )}
        </SectionCard>

        {/* Address & Location */}
        <SectionCard>
          <SectionHeader
            icon={MapPin}
            title="Address & Location"
            open={openSection === "address"}
            onToggle={() => toggleSection("address")}
          />
          {openSection === "address" && (
            <div className="px-6 py-6 space-y-5">
              <div>
                <Label required>Address Line 1</Label>
                <input
                  value={form.addressLine1}
                  onChange={(e) => set("addressLine1", e.target.value)}
                  placeholder="Plot No, Street, Landmark"
                  className={inputCls}
                />
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>City</Label>
                  <input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="City"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label required>State</Label>
                  <input
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                    placeholder="State"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Country</Label>
                  <input
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                    placeholder="Country"
                    className={inputCls}
                  />
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
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <input
                    value={form.latitude}
                    onChange={(e) => set("latitude", e.target.value)}
                    placeholder="e.g. 23.0225"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <input
                    value={form.longitude}
                    onChange={(e) => set("longitude", e.target.value)}
                    placeholder="e.g. 72.5714"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Map picker */}
              <div>
                <Label>Pin Location on Map</Label>
                <p className="text-xs text-gray-400 mb-2">
                  Click anywhere on the map, or drag the pin, to set latitude and longitude automatically.
                </p>
                <MapPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onSelect={handleMapSelect}
                />
              </div>
            </div>
          )}
        </SectionCard>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <button
            type="button"
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-6 py-2.5 rounded-lg text-sky-900 border border-sky-900 font-semibold text-sm transition cursor-pointer bg-white"
          >
            Save Outlet
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddOutlet;