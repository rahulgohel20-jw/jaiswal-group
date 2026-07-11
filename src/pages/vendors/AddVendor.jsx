import { useEffect, useState } from "react";
import { ChevronDown, Eye, EyeOff, Handshake, Info, MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const DEFAULT_CENTER = [23.0225, 72.5714];

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

const RecenterOnChange = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom() < 13 ? 14 : map.getZoom(), { duration: 0.6 });
    }
  }, [position, map]);
  return null;
};

const SectionCard = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
    {children}
  </div>
);

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

const VendorRegistration = () => {
  const [openSection, setOpenSection] = useState("personal");
  const toggleSection = (section) =>
    setOpenSection((prev) => (prev === section ? prev : section));

  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
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

    const handleMapSelect = (lat, lng) => {
    setForm((f) => ({
      ...f,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  const handleSave = () => {
    // Wire this up to your create-vendor API call
    alert("Vendor saved");
  };

  const handleSaveAndAddAnother = () => {
    alert("Vendor saved — form reset for another entry");
    setForm((f) => ({
      ...f,
      fullName: "",
      email: "",
      password: "",
      mobile: "",
      altMobile: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      pincode: "",
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 -mt-4">
      <div className="max-w-4xl mx-auto space-y-5 pt-2">
        {/* Page header */}
        <div className="flex items-center gap-3 mt-5 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-sky-900 leading-none">Vendor Registration</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Create and onboard new enterprise vendors with complete profiling.
            </p>
          </div>
        </div>

        <SectionCard>
          <SectionHeader
            icon={Info}
            title="Personal Information"
            open={openSection === "personal"}
            onToggle={() => toggleSection("personal")}
          />

          {openSection === "personal" && (
            <div className="px-6 py-6 space-y-5">
              <div>
                <Label required>Vendor Full Name</Label>
                <input
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="Enter Full Name"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Vendor Code (Auto-Generated)</Label>
                  <input
                    value={form.vendorCode}
                    disabled
                    className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                  />
                </div>
                <div>
                  <Label required>Email Address</Label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="example@jaiswalgroup.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label required>Company</Label>
                  <input
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label required>Password</Label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="Enter password"
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer bg-white border-0 p-0"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label required>Mobile Number</Label>
                  <input
                    value={form.mobile}
                    onChange={(e) => set("mobile", e.target.value)}
                    placeholder="+91 00000 00000"
                    maxLength={10}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Alternate Mobile</Label>
                  <input
                    value={form.altMobile}
                    onChange={(e) => set("altMobile", e.target.value)}
                    placeholder="+91 00000 00000"
                    maxLength={10}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard>
          <SectionHeader
            icon={MapPin}
            title="Residential Address"
            open={openSection === "address"}
            onToggle={() => toggleSection("address")}
          />
          {openSection === "address" && (
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
                  <select
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                    className={`${inputCls} appearance-none cursor-pointer`}
                  >
                    <option value="India">India</option>
                    <option value="UAE">UAE</option>
                  </select>
                </div>
                <div>
                  <Label required>State</Label>
                  <select
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                    className={`${inputCls} appearance-none cursor-pointer`}
                  >
                    <option value="Gujarat">Gujarat</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Rajasthan">Rajasthan</option>
                  </select>
                </div>
                <div>
                  <Label required>City</Label>
                  <input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="City Name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label required>Pincode</Label>
                  <input
                    value={form.pincode}
                    onChange={(e) => set("pincode", e.target.value)}
                    placeholder="6 Digits"
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
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <input
                    value={form.longitude}
                    onChange={(e) => set("longitude", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
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
          )}
        </SectionCard>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={() => alert("Cancelled")}
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndAddAnother}
            className="px-6 py-2.5 rounded-lg text-sky-900 border border-sky-900 font-semibold text-sm transition cursor-pointer bg-white"
          >
            Save &amp; Add Another
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-lg text-white bg-sky-900 text-sm font-semibold border-0 cursor-pointer transition"
          >
            Save User
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorRegistration;