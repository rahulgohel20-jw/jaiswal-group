import React from "react";
import { useLocation, useNavigate } from "react-router";
import {
    ArrowLeft,
    SquarePen,
    AlertTriangle,
    Handshake,
    MapPin,
    Building2,
    Calendar,
    BadgeCheck,
} from "lucide-react";

const SectionCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#084E92]" />
            </div>

            <h2 className="font-bold text-gray-800">{title}</h2>
        </div>

        <div className="px-6 py-4">
            {children}
        </div>
    </div>
);

const STATUS = {
    verified:
        "bg-emerald-50 text-emerald-700 border border-emerald-200",

    pending:
        "bg-amber-50 text-amber-700 border border-amber-200",

    rejected:
        "bg-red-50 text-red-600 border border-red-200",
};
const InfoCard = ({ label, value }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-800 mt-1">
      {value || '—'}
    </p>
  </div>
);

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
        {label}
      </p>

      <div className="w-9 h-9 rounded-xl bg-[#084E92]/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#084E92]" />
      </div>
    </div>

    <p className="mt-3 text-sm font-semibold text-gray-800">
      {value || '—'}
    </p>
  </div>
);

const VendorViewDetails = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const vendor = location.state?.vendor;

    if (!vendor) {
        navigate("/vendors");
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

            {/* Header */}

            {/* <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                <div>

                    <button
                        onClick={() => navigate("/vendors")}
                        className="flex items-center gap-2 text-[#084E92] font-semibold mb-3 cursor-pointer"
                    >
                        <ArrowLeft size={18} />
                        Back to Vendors
                    </button>

                    <h1 className="text-3xl font-bold text-[#084E92]">
                        {vendor.name}
                    </h1>

                    <p className="text-gray-500 mt-1">
                        View complete vendor profile and KYC information.
                    </p>

                </div>

                <button
                    onClick={() =>
                        navigate("/vendors/update-vendor", {
                            state: { vendor },
                        })
                    }
                    className="flex items-center justify-center gap-2 bg-[#084E92] text-white px-5 py-3 rounded-lg font-medium cursor-pointer"
                >
                    <SquarePen size={18} />
                    Edit Vendor
                </button>

            </div> */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div>
                    <button
                        onClick={() => navigate("/vendors")}
                        className="flex items-center gap-2 text-[#084E92] font-semibold text-sm mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Vendors
                    </button>

                    <h1 className="text-3xl md:text-4xl font-bold text-[#084E92]">
                        {vendor.name}
                    </h1>

                    <p className="text-[#737781] mt-1">
                        Complete vendor profile and company information.
                    </p>
                </div>

                <button
                    onClick={() =>
                        navigate("/vendors/update-vendor", {
                            state: { vendor },
                        })
                    }
                    className="bg-[#084E92] text-white px-5 py-3 rounded-xl flex items-center gap-2"
                >
                    <SquarePen className="w-4 h-4" />
                    Edit Vendor
                </button>

            </div>


            <div className="mt-6 bg-white border border-gray-100 rounded-3xl shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">

                <div className="w-24 h-24 rounded-full bg-[#084E92]/10 flex items-center justify-center shrink-0">
                    <Handshake className="w-12 h-12 text-[#084E92]" />
                </div>

                <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {vendor.name}
                    </h2>

                    <p className="text-gray-500 mt-1">
                        Vendor
                    </p>

                    <p className="text-[#084E92] text-sm mt-2">
                        {vendor.email}
                    </p>

                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                        <span className="bg-blue-50 text-[#084E92] text-xs font-medium px-3 py-1 rounded-full">
                            {vendor.code}
                        </span>

                        <span
                            className={`text-xs font-medium px-3 py-1 rounded-full ${vendor.kycStatus === "verified"
                                ? "bg-green-50 text-green-700"
                                : vendor.kycStatus === "pending"
                                    ? "bg-yellow-50 text-yellow-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                        >
                            {vendor.kycStatus}
                        </span>
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">

                <StatCard
                    label="Company"
                    value={vendor.company}
                    icon={Building2}
                />

                <StatCard
                    label="Category"
                    value={vendor.category}
                    icon={Handshake}
                />

                <StatCard
                    label="Created On"
                    value={vendor.createdOn}
                    icon={Calendar}
                />

                <StatCard
                    label="KYC Status"
                    value={vendor.kycStatus}
                    icon={BadgeCheck}
                />

            </div>

            <SectionCard icon={Handshake} title="Vendor Information">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <InfoCard
                        label="Vendor Name"
                        value={vendor.name}
                    />

                    <InfoCard
                        label="Vendor Code"
                        value={vendor.code}
                    />

                    <InfoCard
                        label="Email Address"
                        value={vendor.email}
                    />

                    <InfoCard
                        label="Mobile Number"
                        value={vendor.mobile}
                    />

                    <InfoCard
                        label="Company"
                        value={vendor.company}
                    />

                    <InfoCard
                        label="Category"
                        value={vendor.category}
                    />


                </div>

            </SectionCard>
            <SectionCard icon={MapPin} title="Address Information">

                <div className="space-y-4">

                    <InfoCard
                        label="Address Line 1"
                        value={vendor.addressLine1}
                    />

                    <InfoCard
                        label="Address Line 2"
                        value={vendor.addressLine2}
                    />

                    <InfoCard
                        label="City"
                        value={vendor.city}
                    />

                    <InfoCard
                        label="State"
                        value={vendor.state}
                    />

                    <InfoCard
                        label="Country"
                        value={vendor.country}
                    />

                    <InfoCard
                        label="Pincode"
                        value={vendor.pincode}
                    />

                </div>

            </SectionCard>
        </div>
    );
};

export default VendorViewDetails;