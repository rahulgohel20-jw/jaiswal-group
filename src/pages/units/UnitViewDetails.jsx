import React from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  SquarePen,
  Store,
  Building2,
  MapPin,
  Calendar,
  BadgeCheck,
  Mail,
  Phone,
} from "lucide-react";

const InfoCard = ({ label, value }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-800 mt-1 break-words">
      {value || "—"}
    </p>
  </div>
);

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
        {label}
      </p>

      <div className="w-9 h-9 rounded-xl bg-[#084E92]/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#084E92]" />
      </div>
    </div>

    <p className="mt-3 text-sm font-semibold text-gray-800 break-words">
      {value || "—"}
    </p>
  </div>
);

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#084E92]" />
      </div>

      <h2 className="font-bold text-gray-800 text-base">
        {title}
      </h2>
    </div>

    <div className="px-6 py-5">
      {children}
    </div>
  </div>
);

const UnitViewDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const unit = location.state?.unit;
  if (!unit) {
    navigate("/units");
    return null;
  }

  const raw = unit.originalData || unit;

  const name = raw.companyNameEnglish || unit.name || "—";
  const code = raw.companyCode || unit.code || "—";
  const shortCode = raw.shortCode || unit.shortCode || "—";
  const parentName = raw.parentName || unit.parentName || "—";
  const email = raw.emailid || raw.email || unit.email || "—";
  const mobile = raw.mobilenumber || raw.mobile || "—";
  const altMobile = raw.alternatemobilenumber || unit.altMobile || "";
  const addressLine1 = raw.addressEnglish || raw.addressLine1 || "";
  const addressLine2 = raw.addressline2 || raw.addressLine2 || "";
  const city = raw.cityName || raw.city || unit.location || "";
  const state = raw.stateName || raw.state || "";
  const country = raw.countryName || raw.country || "";
  const pincode = raw.pincode || "";
  const latitude = raw.latitude || "";
  const longitude = raw.longitude || "";
  const gstNumber = raw.gstNumber || "";
  const panNumber = raw.panNumber || "";
  const createdAt = raw.createdAt || "";
  const isActive = raw.isActive !== undefined ? raw.isActive : (unit.status === 'active' || unit.status === 'Active');
  const statusLabel = isActive ? "Active" : "Inactive";

  const logoUrl =
    raw.companyLogo ||
    (raw.images?.length > 0
      ? raw.images[raw.images.length - 1]?.path
      : null);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/units")}
            className="flex items-center gap-2 text-[#084E92] font-semibold text-sm mb-2 cursor-pointer bg-transparent border-0 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Units
          </button>

          <h1 className="text-3xl md:text-4xl font-bold text-[#084E92]">
            {name}
          </h1>

          <p className="text-[#737781] mt-1 text-sm">
            Complete unit profile and address information.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/units/add-unit", {
              state: {
                unit: raw,
              },
            })
          }
          className="bg-[#084E92] hover:bg-[#073e77] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold border-0 cursor-pointer transition self-start lg:self-auto"
        >
          <SquarePen className="w-4 h-4" />
          Edit Unit
        </button>
      </div>

      {/* Profile Banner */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-24 h-24 rounded-full bg-[#084E92]/10 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Store className="w-10 h-10 text-[#084E92]" />
          )}
        </div>

        <div className="text-center sm:text-left flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {name}
          </h2>

          <p className="text-gray-500 mt-1 text-sm">
            {parentName}
          </p>

          <p className="text-[#084E92] text-sm mt-1.5 font-medium">
            {email}
          </p>

          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
            <span className="bg-blue-50 text-[#084E92] px-3 py-1 rounded-full text-xs font-semibold">
              {code}
            </span>

            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Company"
          value={parentName}
          icon={Building2}
        />

        <StatCard
          label="Short Code"
          value={shortCode}
          icon={BadgeCheck}
        />

        <StatCard
          label="Location"
          value={city}
          icon={MapPin}
        />

        <StatCard
          label="Status"
          value={statusLabel}
          icon={BadgeCheck}
        />
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {/* Unit Information */}
        <SectionCard
          title="Unit Information"
          icon={Store}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard label="Unit Name" value={name} />
            <InfoCard label="Unit Code" value={code} />
            <InfoCard label="Short Code" value={shortCode} />
            <InfoCard label="Parent Company" value={parentName} />
            <InfoCard label="Email" value={email} />
            <InfoCard label="Mobile Number" value={mobile} />
            {altMobile && <InfoCard label="Alternate Mobile" value={altMobile} />}
            {gstNumber && <InfoCard label="GST Number" value={gstNumber} />}
            {panNumber && <InfoCard label="PAN Number" value={panNumber} />}
            {createdAt && <InfoCard label="Created On" value={createdAt} />}
          </div>
        </SectionCard>

        {/* Address Information */}
        <SectionCard
          title="Address Information"
          icon={MapPin}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoCard label="Address Line 1" value={addressLine1} />
            <InfoCard label="Address Line 2" value={addressLine2} />
            <InfoCard label="City" value={city} />
            <InfoCard label="State" value={state} />
            <InfoCard label="Country" value={country} />
            <InfoCard label="Pincode" value={pincode} />
            <InfoCard label="Latitude" value={latitude} />
            <InfoCard label="Longitude" value={longitude} />
          </div>
        </SectionCard>
      </div>

    </div>
  );
};

export default UnitViewDetails;