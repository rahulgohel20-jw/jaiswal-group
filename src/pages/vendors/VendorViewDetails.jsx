import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  SquarePen,
  Handshake,
  MapPin,
  Building2,
  Calendar,
  BadgeCheck,
  Landmark,
  ClipboardList,
} from "lucide-react";
import { getVendorById } from "@/services/apiServices";

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#084E92]" />
      </div>
      <h2 className="font-bold text-gray-800">{title}</h2>
    </div>
    <div className="px-6 py-4">{children}</div>
  </div>
);

const InfoCard = ({ label, value }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-800 mt-1">{value || "—"}</p>
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
    <p className="mt-3 text-sm font-semibold text-gray-800">{value || "—"}</p>
  </div>
);

// "13/08/2026 04:51:03 PM" -> "13/08/2026"
const dateOnly = (v) => (v ? v.split(" ")[0] : "—");

const VendorViewDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // supports either the new { vendorId } flow or a legacy { vendor } object
  const vendorId = location.state?.vendorId ?? location.state?.vendor?.id;

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vendorId) {
      navigate("/vendors");
      return;
    }

    const fetchVendor = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getVendorById(vendorId);
        const data = res?.data?.data ?? res?.data;
        setVendor(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load vendor details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [vendorId, navigate]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <p className="text-sm text-gray-400">Loading vendor details...</p>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <button
          onClick={() => navigate("/vendors")}
          className="flex items-center gap-2 text-[#084E92] font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vendors
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  const shippingAddress = vendor.addresses?.find(
    (a) => a.addresstype === "SHIPPING",
  );
  const billingAddress = vendor.addresses?.find(
    (a) => a.addresstype === "BILLING",
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
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
            {vendor.fullName}
          </h1>

          <p className="text-[#737781] mt-1">
            Complete vendor profile and company information.
          </p>
        </div>

        <button
          onClick={() =>
            navigate("/vendors/update-vendor", { state: { vendorId: vendor.id, vendor } })
          }
          className="bg-[#084E92] text-white px-5 py-3 rounded-xl flex items-center gap-2"
        >
          <SquarePen className="w-4 h-4" />
          Edit Vendor
        </button>
      </div>

      {/* Profile summary */}
      <div className="mt-6 bg-white border border-gray-100 rounded-3xl shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-24 h-24 rounded-full bg-[#084E92]/10 flex items-center justify-center shrink-0">
          <Handshake className="w-12 h-12 text-[#084E92]" />
        </div>

        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-gray-900">
            {vendor.fullName}
          </h2>
          <p className="text-gray-500 mt-1">{vendor.roleName || "Vendor"}</p>
          <p className="text-[#084E92] text-sm mt-2">{vendor.emailid}</p>

          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
            <span className="bg-blue-50 text-[#084E92] text-xs font-medium px-3 py-1 rounded-full">
              {vendor.vendorCode}
            </span>
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${
                vendor.isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {vendor.isActive ? "Active" : "Inactive"}
            </span>
            {vendor.gstVerified && (
              <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full">
                GST Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        <StatCard
          label="Company"
          value={vendor.companyName}
          icon={Building2}
        />
        <StatCard
          label="Organization"
          value={vendor.organizationName}
          icon={Handshake}
        />
        <StatCard
          label="Created On"
          value={dateOnly(vendor.createdAt)}
          icon={Calendar}
        />
        <StatCard
          label="Status"
          value={vendor.isActive ? "Active" : "Inactive"}
          icon={BadgeCheck}
        />
      </div>

      {/* Vendor info */}
      <SectionCard icon={Handshake} title="Vendor Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard label="Vendor Name" value={vendor.fullName} />
          <InfoCard label="Vendor Code" value={vendor.vendorCode} />
          <InfoCard label="Email Address" value={vendor.emailid} />
          <InfoCard label="Mobile Number" value={vendor.mobileNumber} />
          <InfoCard
            label="Alternate Mobile"
            value={vendor.alternateMobile}
          />
          <InfoCard label="Company Name" value={vendor.companyName} />
          <InfoCard label="Contact Person" value={vendor.contactpersonName} />
          <InfoCard label="Organization" value={vendor.organizationName} />
        </div>
      </SectionCard>

      {/* Tax & payment info */}
      <SectionCard icon={BadgeCheck} title="Tax & Payment Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard label="GST Number" value={vendor.gstNumber} />
          <InfoCard
            label="GST Registered Name"
            value={vendor.gstRegisteredName}
          />
          <InfoCard
            label="MSME Registered"
            value={vendor.isMsmeRegistered ? "Yes" : "No"}
          />
          {vendor.isMsmeRegistered && (
            <>
              <InfoCard
                label="MSME Registration Type"
                value={vendor.msmeRegistrationType}
              />
              <InfoCard
                label="MSME Registration Number"
                value={vendor.msmeRegistrationNumber}
              />
            </>
          )}
          <InfoCard label="Currency" value={vendor.currency} />
          <InfoCard label="Payment Terms" value={vendor.paymentTerms} />
          <InfoCard label="TDS Applicability" value={vendor.tdsApplicability} />
          <InfoCard
            label="Accounts Payable Ledger"
            value={vendor.accountsPayableLedger}
          />
          <InfoCard label="Opening Balance" value={vendor.openingBalance} />
        </div>
      </SectionCard>

      {/* Primary address */}
      <SectionCard icon={MapPin} title="Address Information">
        <div className="space-y-4">
          <InfoCard label="Address Line 1" value={vendor.addressLine1} />
          <InfoCard label="Address Line 2" value={vendor.addressLine2} />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <InfoCard label="City" value={vendor.cityName} />
            <InfoCard label="State" value={vendor.stateName} />
            <InfoCard label="Country" value={vendor.countryName} />
            <InfoCard label="Pincode" value={vendor.pincode} />
          </div>
        </div>
      </SectionCard>

      {/* Billing / Shipping addresses, if present */}
      {(billingAddress || shippingAddress) && (
        <SectionCard icon={MapPin} title="Billing & Shipping Addresses">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {billingAddress && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Billing
                </p>
                <div className="space-y-2">
                  <InfoCard
                    label="Address"
                    value={[
                      billingAddress.addressLine1,
                      billingAddress.addressLine2,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <InfoCard
                    label="City / State / Country"
                    value={[
                      billingAddress.cityName,
                      billingAddress.stateName,
                      billingAddress.countryName,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <InfoCard label="Pincode" value={billingAddress.pincode} />
                  <InfoCard
                    label="Phone"
                    value={billingAddress.phoneNumber}
                  />
                </div>
              </div>
            )}
            {shippingAddress && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Shipping
                </p>
                <div className="space-y-2">
                  <InfoCard
                    label="Address"
                    value={[
                      shippingAddress.addressLine1,
                      shippingAddress.addressLine2,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <InfoCard
                    label="City / State / Country"
                    value={[
                      shippingAddress.cityName,
                      shippingAddress.stateName,
                      shippingAddress.countryName,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <InfoCard label="Pincode" value={shippingAddress.pincode} />
                  <InfoCard
                    label="Phone"
                    value={shippingAddress.phoneNumber}
                  />
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Bank details */}
      {vendor.bankDetails?.length > 0 && (
        <SectionCard icon={Landmark} title="Bank Details">
          <div className="space-y-4">
            {vendor.bankDetails.map((bank) => (
              <div
                key={bank.id}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-100 rounded-xl p-4"
              >
                <InfoCard
                  label="Account Holder"
                  value={bank.accountHolderName}
                />
                <InfoCard label="Bank Name" value={bank.bankName} />
                <InfoCard
                  label="Account Number"
                  value={bank.accountNumber}
                />
                <InfoCard label="IFSC Code" value={bank.ifscCode} />
                {bank.isPrimary && (
                  <span className="bg-blue-50 text-[#084E92] text-xs font-medium px-3 py-1 rounded-full w-fit">
                    Primary Account
                  </span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Terms & Conditions */}
      <SectionCard icon={ClipboardList} title="Terms & Conditions">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm leading-6 text-gray-800 whitespace-pre-wrap">
            {vendor.termsAndConditions || "—"}
          </p>
        </div>
      </SectionCard>
    </div>
  );
};

export default VendorViewDetails;