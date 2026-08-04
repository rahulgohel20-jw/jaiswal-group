import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  SquarePen,
  Trash2,
  Store,
  Info,
  MapPin,
  Phone,
  Mail,
  User,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { getSubOutletById, deleteSubOutletById } from "@/services/apiServices";
import { notify } from "@/utils/toast";

const SectionCard = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1">
      <h2 className="text-sm font-bold text-gray-800 leading-none">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  </div>
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    {Icon && (
      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5" />
      </div>
    )}
    <div className="min-w-0">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800 break-words">{value || "—"}</p>
    </div>
  </div>
);

const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ring-1 ring-inset ${
      active
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-gray-100 text-gray-500 ring-gray-200"
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-400"}`} />
    {active ? "Active" : "Inactive"}
  </span>
);

const DeleteConfirmModal = ({ subUnit, onCancel, onConfirm, deleting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
      <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Delete sub unit?</h2>
        <p className="text-sm text-gray-500 mt-1.5">
          This will permanently remove{" "}
          <span className="font-semibold text-gray-700">{subUnit.subOutletName}</span> from your
          sub unit list. This action cannot be undone.
        </p>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-5 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold border-0 cursor-pointer transition disabled:opacity-60 flex items-center gap-2"
        >
          {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  </div>
);

const SubUnitDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  // Prefer data passed via router state (from the list page's Eye button).
  // Fall back to fetching by id from the URL, so a direct link/refresh still works.
  const [subUnit, setSubUnit] = useState(location.state?.subUnit ?? null);
  const [loading, setLoading] = useState(!location.state?.subUnit);
  const [loadError, setLoadError] = useState("");

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (subUnit) return;

    const id = params.id;
    if (!id) {
      setLoadError("No sub unit specified.");
      setLoading(false);
      return;
    }

    setLoading(true);
    getSubOutletById(id)
      .then((res) => setSubUnit(res?.data?.data ?? res?.data ?? null))
      .catch((err) => {
        console.error("Failed to load sub unit", err);
        setLoadError("Couldn't load this sub unit. It may have been deleted.");
      })
      .finally(() => setLoading(false));
  }, [params.id, subUnit]);

  const handleEdit = () => {
    navigate("/sub-units/update-sub-unit", { state: { subUnit } });
  };

  const handleDeleteConfirmed = async () => {
    setDeleting(true);
    try {
      await deleteSubOutletById(subUnit.id);
      notify.success("Sub unit deleted successfully");
      navigate("/sub-units");
    } catch (err) {
      console.error("Failed to delete sub unit", err);
      notify.error("Couldn't delete this sub unit. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-4 min-h-screen p-4 md:p-6 flex items-center justify-center text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sub unit...
      </div>
    );
  }

  if (loadError || !subUnit) {
    return (
      <div className="mx-4 min-h-screen p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-4">
          {loadError || "Sub unit not found."}
        </div>
        <button
          type="button"
          onClick={() => navigate("/sub-units")}
          className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[#084E92] cursor-pointer bg-transparent border-0 p-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sub Units
        </button>
      </div>
    );
  }

  const fullAddress = [subUnit.address, subUnit.addressline2].filter(Boolean).join(", ");
  const locationLine = [subUnit.cityName, subUnit.stateName, subUnit.countryName]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-4 min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <button
            type="button"
            onClick={() => navigate("/sub-units")}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition cursor-pointer bg-transparent border-0 p-0 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sub Units
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl text-[#084E92] font-semibold">
              {subUnit.subOutletName}
            </h1>
            <StatusBadge active={Boolean(subUnit.isActive)} />
          </div>
          <p className="text-[#43474F] mt-1.5">
            Registered under{" "}
            <span className="font-medium text-gray-700">
              {subUnit.parentOrganizationName || subUnit.organizationName || "—"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer transition"
          >
            <SquarePen className="w-4 h-4" /> Edit Sub Unit
          </button>
        </div>
      </div>

      {/* Parent Outlet */}
      <SectionCard className="mt-6">
        <SectionHeader icon={Store} title="Parent Outlet" />
        <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoRow
            label="Outlet Name"
            value={subUnit.parentOrganizationName || subUnit.organizationName}
          />
          <InfoRow label="Outlet Code" value={subUnit.organizationCode} />
          <InfoRow label="Sub Unit Code" value={subUnit.subOutletCode} />
        </div>
      </SectionCard>

      {/* Sub Unit Information */}
      <SectionCard className="mt-4">
        <SectionHeader icon={Info} title="Sub Unit Information" />
        <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoRow icon={User} label="Contact Person" value={subUnit.contactPerson} />
          <InfoRow icon={Phone} label="Contact Number" value={subUnit.contactNumber} />
          <InfoRow icon={Mail} label="Email" value={subUnit.email} />
        </div>
      </SectionCard>

      {/* Address & Location */}
      <SectionCard className="mt-4">
        <SectionHeader icon={MapPin} title="Address & Location" />
        <div className="px-6 py-6 space-y-6">
          <InfoRow label="Address" value={fullAddress} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <InfoRow label="City / State / Country" value={locationLine} />
            <InfoRow label="Pincode" value={subUnit.pincode} />
            <InfoRow label="Latitude" value={subUnit.latitude} />
            <InfoRow label="Longitude" value={subUnit.longitude} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default SubUnitDetails;