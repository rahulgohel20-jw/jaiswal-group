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
  Layers,
  Plus,
  Eye,
  ExternalLink,
} from "lucide-react";
import {
  getSubOutletById,
  deleteSubOutletById,
  getAllSubLocationsBySubOutletId,
  getAllSubLocations,
} from "@/services/apiServices";
import { notify } from "@/utils/toast";
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';

const extractArray = (res) => {
  if (!res) return [];
  const raw = res?.data?.data ?? res?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const InfoCard = ({ label, value }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
      {label}
    </p>
    <p className="text-sm font-semibold text-gray-800 mt-1 wrap-break-word">
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
          <span className="font-semibold text-gray-700">{subUnit?.subOutletName}</span> from your
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
    navigate("/sub-units/add", { state: { subUnit: raw } });
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

  const [subLocations, setSubLocations] = useState([]);
  const [loadingSubLocations, setLoadingSubLocations] = useState(false);

  useEffect(() => {
    const rawData = subUnit?.originalData || subUnit;
    const unitId = rawData?.id || params.id;
    if (!unitId) return;

    let isMounted = true;
    setLoadingSubLocations(true);

    (async () => {
      try {
        let res;
        try {
          res = await getAllSubLocationsBySubOutletId(unitId);
        } catch {
          res = await getAllSubLocations();
        }
        const all = extractArray(res);
        // Filter for this sub unit if getAllSubLocations was used as fallback
        const matching = all.filter(
          (loc) => String(loc.subOutletId || loc.subUnitId) === String(unitId)
        );
        if (isMounted) {
          setSubLocations(matching.length > 0 ? matching : all.filter(
            (loc) => String(loc.subOutletId) === String(unitId)
          ));
        }
      } catch (err) {
        console.error("Failed to load sub locations for sub unit:", err);
      } finally {
        if (isMounted) setLoadingSubLocations(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [subUnit, params.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl min-h-screen p-4 md:p-6 flex items-center justify-center text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sub unit...
      </div>
    );
  }

  if (loadError || !subUnit) {
    return (
      <div className="mx-auto max-w-7xl min-h-screen p-4 md:p-6">
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

  const raw = subUnit.originalData || subUnit;

  const subOutletName = raw.subOutletName || raw.name || "—";
  const outletName = raw.organizationName || raw.parentOrganizationName || raw.companyNameEnglish || "—";
  const outletCode = raw.companyCode || raw.organizationCode || "—";
  const contactPerson = raw.contactPerson || "—";
  const contactNumber = raw.contactNumber || raw.mobile || "—";
  const email = raw.email || "—";

  const addressLine1 = raw.address || raw.addressEnglish || raw.addressLine1 || "";
  const addressLine2 = raw.addressline2 || raw.addressLine2 || "";
  const city = raw.cityName || raw.city || "";
  const state = raw.stateName || raw.state || "";
  const country = raw.countryName || raw.country || "";
  const pincode = raw.pincode || "";
  const latitude = raw.latitude || "";
  const longitude = raw.longitude || "";

  const isActive = Boolean(raw.isActive);
  const statusLabel = isActive ? "Active" : "Inactive";

  return (
     <Container>
    <div className="mx-auto pt-2 pb-6 space-y-3.5">
      <PageHeader
        title={<span className="capitalize">{subOutletName}</span>}
        description="Complete sub unit profile and address information."
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/sub-units")}
              className="flex items-center gap-1.5 text-[#084E92] hover:text-[#063b6f] font-semibold text-sm cursor-pointer bg-transparent border-0 p-0"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sub Units
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="bg-[#084E92] hover:bg-[#073e77] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold border-0 cursor-pointer transition"
            >
              <SquarePen className="w-4 h-4" /> Edit Sub Unit
            </button>
          </div>
        }
      />

      {/* Profile Banner */}
      <div className="bg-white rounded-3xl my-6 border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-24 h-24 rounded-full bg-[#084E92]/10 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
          <Store className="w-10 h-10 text-[#084E92]" />
        </div>

        <div className="text-center sm:text-left flex-1">
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            {subOutletName}
          </h2>

          <p className="text-[#084E92] text-sm mt-1.5 font-medium">
            {email}
          </p>

          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
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
        {/* Parent Outlet Information */}
        <SectionCard
          title="Parent Outlet"
          icon={Store}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard label="Outlet Name" value={outletName} />
            <InfoCard label="Outlet Code" value={outletCode} />
          </div>
        </SectionCard>

        {/* Sub Unit Information */}
        <SectionCard
          title="Sub Unit Information"
          icon={Info}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard label="Type" value={raw.subOutletType || raw.type || raw.locationType || "LOCATION"} />
            <InfoCard label="Sub Outlet Name" value={subOutletName} />
            <InfoCard label="Contact Person" value={contactPerson} />
            <InfoCard label="Contact Number" value={contactNumber} />
            <InfoCard label="Email" value={email} />
          </div>
        </SectionCard>

        {/* Sub Locations Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#084E92]" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-base">
                  Registered Sub Locations
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Stores, kitchens, and sub locations under this sub unit
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  navigate('/sub-locations', {
                    state: {
                      subOutletId: raw.id,
                      subOutletName: subOutletName,
                      organizationId: raw.organizationId || raw.orgId,
                    },
                  })
                }
                className="text-xs font-semibold text-[#084E92] hover:underline flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-100 bg-blue-50/50 cursor-pointer"
              >
                View in Master
                <ExternalLink size={13} />
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate('/sub-locations/add', {
                    state: {
                      subLocation: {
                        subOutletId: raw.id,
                        organizationId: raw.organizationId || raw.orgId,
                      },
                    },
                  })
                }
                className="flex items-center gap-1.5 bg-[#084E92] text-white text-xs font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer hover:bg-[#073e77] transition"
              >
                <Plus size={14} /> Add Sub Location
              </button>
            </div>
          </div>

          <div className="p-6">
            {loadingSubLocations ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
                <Loader2 size={16} className="animate-spin" />
                Loading sub locations...
              </div>
            ) : subLocations.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p>No sub locations registered under this sub unit yet.</p>
                <button
                  type="button"
                  onClick={() =>
                    navigate('/sub-locations/add', {
                      state: {
                        subLocation: {
                          subOutletId: raw.id,
                          organizationId: raw.organizationId || raw.orgId,
                        },
                      },
                    })
                  }
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#084E92] hover:underline cursor-pointer bg-transparent border-0"
                >
                  <Plus size={15} /> Create First Sub Location
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/60">
                      <th className="py-2.5 px-4 rounded-l-lg">S.No</th>
                      <th className="py-2.5 px-4">Sub Location Name</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Code</th>
                      <th className="py-2.5 px-4">Contact</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right rounded-r-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subLocations.map((loc, idx) => (
                      <tr key={loc.id || idx} className="hover:bg-gray-50/50 transition">
                        <td className="py-3 px-4 text-gray-500 text-xs">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#084E92]">
                          {loc.locationName || loc.name || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-semibold text-gray-700 uppercase">
                            {loc.locationType || loc.type || 'STORE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-mono text-xs">
                          {loc.shortCode || loc.locationCode || '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {loc.contactPerson || loc.contactNumber || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-semibold ${
                              loc.isActive ? 'text-emerald-600' : 'text-gray-400'
                            }`}
                          >
                            {loc.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                navigate('/sub-locations/sub-location-details', {
                                  state: { subLocation: loc },
                                })
                              }
                              className="text-gray-500 hover:text-green-600 cursor-pointer"
                              title="View details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                navigate('/sub-locations/add', {
                                  state: { subLocation: loc },
                                })
                              }
                              className="text-gray-500 hover:text-blue-600 cursor-pointer"
                              title="Edit"
                            >
                              <SquarePen size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

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
    </Container>
  );
};

export default SubUnitDetails;