import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  SquarePen,
  Handshake,
  MapPin,
  Building2,
  BadgeCheck,
  Landmark,
  ClipboardList,
  Briefcase,
  ShieldCheck,
  Check,
  ChevronDown,
  Layers,
} from "lucide-react";
import { getVendorById } from "@/services/apiServices";
import { Container } from '@/components/common/container';

const SectionCard = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  open = true,
  onToggle,
  children,
}) => {
  const [internalOpen, setInternalOpen] = useState(true);
  const isControlled = onToggle !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleToggle = () => {
    if (isControlled) {
      onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6 transition-all">
      <div
        className={`flex items-center justify-between px-6 py-4 flex-wrap gap-2 cursor-pointer select-none transition-colors hover:bg-gray-50/70 ${
          isOpen ? 'border-b border-gray-100' : ''
        }`}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#084E92] shrink-0">
            <Icon className="w-5 h-5 text-[#084E92]" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-base">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {badge && <div onClick={(e) => e.stopPropagation()}>{badge}</div>}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            title={isOpen ? 'Collapse section' : 'Expand section'}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {isOpen && <div className="px-6 py-5">{children}</div>}
    </div>
  );
};

const PermissionIndicator = ({ enabled, label }) => {
  if (enabled) {
    return (
      <span
        title={`${label}: Granted`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60"
      >
        <Check className="w-3 h-3 stroke-[2.5]" />
        {label}
      </span>
    );
  }
  return (
    <span
      title={`${label}: Denied`}
      className="inline-flex items-center justify-center text-gray-300 text-xs font-medium"
    >
      —
    </span>
  );
};

const InfoCard = ({ label, value }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-800 mt-1">{value || "—"}</p>
  </div>
);

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-[#084E92]" />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span
        className="text-sm font-semibold text-gray-800 mt-0.5 truncate"
        title={typeof value === 'string' ? value : undefined}
      >
        {value || "—"}
      </span>
    </div>
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

  const departmentName = vendor.deptName || vendor.department?.name || '—';
  const roleName = vendor.userRights?.roleName || vendor.roleName || null;

  // Extract module-wise user rights
  const userRightsObj = vendor.userRights;
  const moduleRightsList = Array.isArray(userRightsObj?.userRights)
    ? userRightsObj.userRights
    : Array.isArray(userRightsObj)
    ? userRightsObj
    : [];

  const totalModules = moduleRightsList.length;
  const totalPages = moduleRightsList.reduce((acc, m) => acc + (m.userRights?.length || 0), 0);

  return (
    <Container>
    <div className="mx-auto p-4">
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

          <h1 className="text-[28px] font-bold text-[#101828]">
            {vendor.fullName}
          </h1>

          <p className="text-[#667085] text-sm mt-1.5 max-w-xl">
            Complete vendor profile, department, and access permission details.
          </p>
        </div>

        <button
          onClick={() =>
            navigate("/vendors/update-vendor", { state: { vendorId: vendor.id, vendor } })
          }
          className="bg-[#084E92] text-white px-5 py-3 rounded-xl flex items-center gap-2 font-semibold text-sm cursor-pointer hover:bg-[#073e77] transition shadow-xs"
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

        <div className="text-center sm:text-left flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {vendor.fullName}
          </h2>
          <p className="text-gray-500 mt-1">{roleName || vendor.roleName || "Vendor"}</p>
          <p className="text-[#084E92] text-sm mt-2">{vendor.emailid}</p>

          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
            <span className="bg-blue-50 text-[#084E92] text-xs font-medium px-3 py-1 rounded-full">
              {vendor.vendorCode}
            </span>
            {departmentName !== '—' && (
              <span className="bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {departmentName}
              </span>
            )}
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${
                vendor.isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {vendor.isActive ? "Active" : "Inactive"}
            </span>
            {vendor.isGstApplicable && (
              <span className="bg-blue-50 text-[#084E92] text-xs font-medium px-3 py-1 rounded-full">
                GST Enabled
              </span>
            )}
            {vendor.gstVerified && (
              <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full">
                GST Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <StatCard
          label="Company"
          value={vendor.companyName}
          icon={Building2}
        />
        <StatCard
          label="Department"
          value={departmentName}
          icon={Briefcase}
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
          <InfoCard label="Department" value={departmentName} />
          <InfoCard label="Organization" value={vendor.organizationName} />
        </div>
      </SectionCard>

      {/* User Rights & Permissions Matrix */}
      <SectionCard
        icon={ShieldCheck}
        title="User Rights & Permissions"
        subtitle="Module-wise access control permissions configured for this vendor."
        badge={
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-[#084E92] text-xs font-semibold px-2.5 py-1 rounded-lg border border-blue-100">
              {totalModules} Modules
            </span>
            <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
              {totalPages} Pages
            </span>
          </div>
        }
      >
        {moduleRightsList.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            No specific user rights configured.
          </div>
        ) : (
          <div className="border border-[#E5E7EB] rounded-xl overflow-hidden overflow-x-auto shadow-2xs">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB]">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-[#43474F] min-w-[220px]">
                    Module / Page Name
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-[#43474F] w-24">
                    Add
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-[#43474F] w-24">
                    Edit
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-[#43474F] w-24">
                    View
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-[#43474F] w-24">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody>
                {moduleRightsList.map((mod) => (
                  <React.Fragment key={mod.moduleId ?? mod.moduleName}>
                    {/* Module Header Row */}
                    <tr className="bg-[#F0F4FA] border-t border-[#E5E7EB]">
                      <td
                        colSpan={5}
                        className="px-5 py-2.5 font-bold text-[#084E92] flex items-center gap-2"
                      >
                        <Layers className="w-4 h-4" />
                        <span>{mod.moduleName}</span>
                        <span className="text-xs font-normal text-gray-500 ml-1">
                          ({(mod.userRights || mod.userRightsPages || []).length} pages)
                        </span>
                      </td>
                    </tr>

                    {/* Pages in Module */}
                    {(mod.userRights || mod.userRightsPages || []).map((p) => (
                      <tr
                        key={p.id ?? p.pageid ?? p.pageId ?? p.pageName ?? p.pagename}
                        className="border-b border-[#F0F1F3] last:border-b-0 hover:bg-[#FAFBFC] transition-colors"
                      >
                        <td className="px-5 py-2.5 pl-10 text-gray-700 font-medium text-[13px]">
                          {p.pageName || p.pagename || p.name}
                        </td>
                        <td className="text-center px-4 py-2.5">
                          <PermissionIndicator enabled={Boolean(p.add)} label="Add" />
                        </td>
                        <td className="text-center px-4 py-2.5">
                          <PermissionIndicator enabled={Boolean(p.edit)} label="Edit" />
                        </td>
                        <td className="text-center px-4 py-2.5">
                          <PermissionIndicator enabled={Boolean(p.view)} label="View" />
                        </td>
                        <td className="text-center px-4 py-2.5">
                          <PermissionIndicator enabled={Boolean(p.delete)} label="Delete" />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Tax & payment info */}
      <SectionCard icon={BadgeCheck} title="Tax & Payment Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard
            label="GST Applicable"
            value={vendor.isGstApplicable ? "Yes" : "No"}
          />
          {vendor.isGstApplicable && (
            <>
              <InfoCard label="GST Number" value={vendor.gstNumber} />
              <InfoCard
                label="GST Registered Name"
                value={vendor.gstRegisteredName}
              />
            </>
          )}
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
    </Container>
  );
};

export default VendorViewDetails;