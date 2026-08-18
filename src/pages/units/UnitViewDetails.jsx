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
    <p className="text-sm font-semibold text-gray-800 mt-1">
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

    <p className="mt-3 text-sm font-semibold text-gray-800">
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

      <h2 className="font-bold text-gray-800">
        {title}
      </h2>
    </div>

    <div className="px-6 py-4">
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

  return (
    <div className="p-4 md:p-6">

      {/* Header */}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">

        <div>
          <button
            onClick={() => navigate("/units")}
            className="flex items-center gap-2 text-[#084E92] font-semibold text-sm mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Units
          </button>

          <h1 className="text-3xl md:text-4xl font-bold text-[#084E92]">
            {unit.name}
          </h1>

          <p className="text-[#737781] mt-1">
            Complete unit information.
          </p>
        </div>

        <button
          onClick={() =>
            navigate("/units/update-unit", {
              state: {
                unit: unit.originalData || unit,
              },
            })
          }
          className="bg-[#084E92] text-white px-5 py-3 rounded-xl flex items-center gap-2"
        >
          <SquarePen className="w-4 h-4" />
          Edit Unit
        </button>
      </div>

      {/* Profile */}

      <div className="mt-6 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row gap-5">

        <div className="w-24 h-24 rounded-full bg-[#084E92]/10 flex items-center justify-center overflow-hidden border border-gray-200">

          {unit.originalData?.images?.length > 0 && (
            <img
              src={unit.originalData.images[unit.originalData.images.length - 1]?.path}
              alt={unit.name}
              className="w-full h-full object-cover"
            />
          )}

        </div>

        <div>

          <h2 className="text-2xl font-bold">
            {unit.name}
          </h2>

          <p className="text-gray-500 mt-1">
            {unit.parentName}
          </p>

          <p className="text-[#084E92] mt-2">
            {unit.email}
          </p>

          <div className="flex gap-2 mt-4 flex-wrap">

            <span className="bg-blue-50 text-[#084E92] px-3 py-1 rounded-full text-xs">
              {unit.code}
            </span>

            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs">
              {unit.status}
            </span>

          </div>

        </div>

      </div>

      {/* Stats */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">

        <StatCard
          label="Company"
          value={unit.parentName}
          icon={Building2}
        />

        <StatCard
          label="Location"
          value={unit.location}
          icon={MapPin}
        />

        <StatCard
          label="Status"
          value={unit.status}
          icon={BadgeCheck}
        />

      </div>

      {/* Sections */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">

        <div className="xl:col-span-2">

          <SectionCard
            title="Unit Information"
            icon={Store}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <InfoCard label="Unit Name" value={unit.name} />
              <InfoCard label="Unit Code" value={unit.code} />
              <InfoCard label="Company" value={unit.parentName} />
              <InfoCard label="Email" value={unit.email} />
              <InfoCard label="Mobile" value={unit.mobile} />

            </div>
          </SectionCard>

        </div>

        <SectionCard
          title="Address Information"
          icon={MapPin}
        >
          <div className="space-y-4">

            <InfoCard
              label="Location"
              value={unit.location}
            />

            <InfoCard
              label="Address"
              value={unit.address}
            />

          </div>
        </SectionCard>

      </div>

    </div>
  );
};

export default UnitViewDetails;