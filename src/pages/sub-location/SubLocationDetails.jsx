import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  SquarePen,
  Store,
  UtensilsCrossed,
  Info,
  MapPin,
  Layers,
  Loader2,
} from "lucide-react";
import { getSubLocationById } from "@/services/apiServices";
import { notify } from "@/utils/toast";
import { Container } from '@/components/common/container';

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

const SubLocationDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const [subLocation, setSubLocation] = useState(location.state?.subLocation ?? null);
  const [loading, setLoading] = useState(!location.state?.subLocation);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (subLocation) return;

    const id = params.id;
    if (!id) {
      setLoadError("No sub location specified.");
      setLoading(false);
      return;
    }

    setLoading(true);
    getSubLocationById(id)
      .then((res) => setSubLocation(res?.data?.data ?? res?.data ?? null))
      .catch((err) => {
        console.error("Failed to load sub location", err);
        setLoadError("Couldn't load this sub location. It may have been deleted.");
      })
      .finally(() => setLoading(false));
  }, [params.id, subLocation]);

  const raw = subLocation?.originalData || subLocation;

  const handleEdit = () => {
    navigate("/sub-locations/add", { state: { subLocation: raw } });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl min-h-screen p-4 md:p-6 flex items-center justify-center text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sub location...
      </div>
    );
  }

  if (loadError || !subLocation) {
    return (
      <div className="mx-auto max-w-7xl min-h-screen p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-4">
          {loadError || "Sub location not found."}
        </div>
        <button
          type="button"
          onClick={() => navigate("/sub-locations")}
          className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[#084E92] cursor-pointer bg-transparent border-0 p-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sub Locations
        </button>
      </div>
    );
  }

  const locationName = raw.locationName || raw.name || "—";
  const locationType = String(raw.locationType || raw.type || "STORE").toUpperCase();
  const shortCode = raw.shortCode || "—";
  const unitName = raw.organizationName || raw.unitName || raw.parentOrganizationName || raw.companyNameEnglish || `Unit #${raw.organizationId || ""}`;
  const subUnitName = raw.subOutletName || raw.subUnitName || `Sub Unit #${raw.subOutletId || ""}`;
  const contactPerson = raw.contactPerson || "—";
  const contactNumber = raw.contactNumber || raw.mobile || "—";
  const email = raw.email || "—";
  const address = raw.address || raw.addressLine1 || raw.addressEnglish || "—";
  const pincode = raw.pincode ? String(raw.pincode) : "—";
  const city = raw.cityName || raw.city || (raw.cityId ? `City #${raw.cityId}` : "—");
  const state = raw.stateName || raw.state || (raw.stateId ? `State #${raw.stateId}` : "—");
  const country = raw.countryName || raw.country || (raw.countryId ? `Country #${raw.countryId}` : "—");
  const latitude = raw.latitude || "—";
  const longitude = raw.longitude || "—";

  const isActive = Boolean(raw.isActive);
  const statusLabel = isActive ? "Active" : "Inactive";
  const isKitchen = locationType === "KITCHEN";

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-[#101828] text-xl sm:text-2xl capitalize">
              {locationName}
            </h1>
            <p className="text-[#737781] mt-0.5 text-xs">
              Complete sub location details, type, and parent hierarchy information.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleEdit}
              className="bg-[#084E92] hover:bg-[#073e77] text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold border-0 cursor-pointer transition shadow-xs"
            >
              <SquarePen className="w-3.5 h-3.5" /> Edit Sub Location
            </button>
            <button
              type="button"
              onClick={() => navigate("/sub-locations")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sub Locations
            </button>
          </div>
        </div>

        {/* Profile Banner */}
        <div className="bg-white rounded-3xl my-6 border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border shrink-0 ${
              isKitchen
                ? "bg-amber-50 border-amber-200 text-amber-600"
                : "bg-blue-50 border-blue-200 text-[#084E92]"
            }`}
          >
            {isKitchen ? (
              <UtensilsCrossed className="w-10 h-10" />
            ) : (
              <Store className="w-10 h-10" />
            )}
          </div>

          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {locationName}
            </h2>

            <p className="text-[#084E92] text-sm mt-1.5 font-medium">
              {email !== "—" ? email : `${locationType} · ${subUnitName}`}
            </p>

            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isKitchen
                    ? "bg-amber-100 text-amber-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {locationType}
              </span>

              {shortCode !== "—" && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 font-mono">
                  Code: {shortCode}
                </span>
              )}

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

        {/* Sections */}
        <div className="space-y-6">
          {/* Parent Hierarchy */}
          <SectionCard
            title="Parent Hierarchy"
            icon={Layers}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard label="Parent Unit" value={unitName} />
              <InfoCard label="Sub Unit / Location" value={subUnitName} />
            </div>
          </SectionCard>

          {/* Sub Location Details */}
          <SectionCard
            title="Sub Location Information"
            icon={Info}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoCard label="Location Name" value={locationName} />
              <InfoCard label="Location Type" value={locationType} />
              <InfoCard label="Short Code" value={shortCode} />
              <InfoCard label="Contact Person" value={contactPerson} />
              <InfoCard label="Contact Number" value={contactNumber} />
              <InfoCard label="Email Address" value={email} />
            </div>
          </SectionCard>

          {/* Address Information */}
          <SectionCard
            title="Address Information"
            icon={MapPin}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoCard label="Address" value={address} />
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
    </Container>
  );
};

export default SubLocationDetails;
