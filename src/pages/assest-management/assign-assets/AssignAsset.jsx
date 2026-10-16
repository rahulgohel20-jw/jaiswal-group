import React, { useEffect, useMemo, useState } from 'react';
import DeleteConfirmModal from '@/utils/DeleteConfirmModal';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useOrgScope } from '@/hooks/useOrgScope';
import {
  ArrowLeftRight,
  CircleCheck,
  Clock,
  Download,
  Eye,
  MapPin,
  Package,
  QrCode,
  RotateCcw,
  SquarePen,
  Trash2,
  UserCog,
  Wrench,
  X,
  Save,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import {
  deleteAssignAsset,
  getActiveCompany,
  getAllAssignAssets,
  updateAssignAsset,
  getAssetUnitLocationsByOrganization,
} from '@/services/apiServices.js';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Container } from '@/components/common/container';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageErrorAlert } from '@/components/common/PageErrorAlert';
import { SearchBar } from '@/components/common/SearchBar';
import SearchableSelect from '../../../utils/SearchableSelect';
import MasterExportModal from '../../../utils/MasterExportModal';

// Safely pulls the array out of a response, regardless of whether the
// service resolves to the raw axios response, an already-unwrapped
// `{ msg, data, success }` body, or a bare array.
const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const ASSIGN_TYPE_META = {
  individual: { label: 'Individual', className: 'bg-purple-100 text-purple-700' },
  company_outlet: { label: 'Company/Unit', className: 'bg-sky-100 text-sky-700' },
};


const AssignTypeBadge = ({ assignType }) => {
  const meta = ASSIGN_TYPE_META[assignType] ?? {
    label: '-',
    className: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${meta.className} inline-flex items-center justify-center w-fit`}
    >
      {meta.label}
    </span>
  );
};

// const STATUS_TEXT_COLORS = {
//   Assigned: 'text-emerald-600',
//   Pending: 'text-amber-600',
//   Returned: 'text-gray-500',
//   Overdue: 'text-rose-600',
// };

// const StatusBadge = ({ status }) => {
//   const color = STATUS_TEXT_COLORS[status] ?? 'text-gray-600';
//   return (
//     <span className={`text-xs font-semibold whitespace-nowrap ${color}`}>
//       {status || '-'}
//     </span>
//   );
// };

const AssignLocationModal = ({
  isOpen,
  onClose,
  initialUnitId,
  selectedCount,
  onSave,
  saving,
  preloadedOrganizations = [],
}) => {
  const {
    isGroupUser,
    isCompanyUser,
    isOutletUser,
    units: scopedUnits,
    effectiveOutletId,
    userCompanyId,
    selfOrg,
  } = useOrgScope();

  const [organizations, setOrganizations] = useState(preloadedOrganizations);
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');

  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (preloadedOrganizations.length > 0) {
      setOrganizations(preloadedOrganizations);
    }
  }, [preloadedOrganizations]);

  // Determine the organization record of the asset's current assignment
  const selectedAssetOrg = useMemo(() => {
    if (!initialUnitId || organizations.length === 0) return null;
    return organizations.find((o) => String(o.id) === String(initialUnitId)) || null;
  }, [initialUnitId, organizations]);

  // Check if asset is assigned directly to the Main Group (or has no specific sub-org)
  const isAssignedToGroup = useMemo(() => {
    return !selectedAssetOrg || selectedAssetOrg.orgType === 'GROUP';
  }, [selectedAssetOrg]);

  // Check if asset is assigned to a Sub-Company
  const isAssignedToCompany = useMemo(() => {
    return selectedAssetOrg?.orgType === 'SUB_COMPANY';
  }, [selectedAssetOrg]);

  // Check if asset is assigned to an actual Outlet / Unit
  const isAssignedToOutlet = useMemo(() => {
    return selectedAssetOrg?.orgType === 'OUTLET';
  }, [selectedAssetOrg]);

  // Set initial states when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSelectedLocationId('');

    if (isOutletUser) {
      const compId = userCompanyId || selfOrg?.id;
      setSelectedCompanyId(compId ? String(compId) : 'ALL');
      setSelectedUnitId(String(initialUnitId || effectiveOutletId || scopedUnits?.[0]?.id || ''));
    } else if (isCompanyUser) {
      const compId = userCompanyId || selfOrg?.id;
      setSelectedCompanyId(compId ? String(compId) : 'ALL');
      setSelectedUnitId(initialUnitId ? String(initialUnitId) : (scopedUnits?.[0]?.id ? String(scopedUnits[0].id) : ''));
    } else {
      // Group user
      if (isAssignedToCompany) {
        setSelectedCompanyId(String(selectedAssetOrg.id));
        setSelectedUnitId('');
      } else if (isAssignedToOutlet) {
        setSelectedCompanyId(selectedAssetOrg.parentId ? String(selectedAssetOrg.parentId) : 'ALL');
        setSelectedUnitId(String(selectedAssetOrg.id));
      } else {
        // Assigned to Main Group -> Company stays 'ALL' or user can pick, Unit is cleared
        setSelectedCompanyId('ALL');
        setSelectedUnitId('');
      }
    }
  }, [isOpen, isOutletUser, isCompanyUser, userCompanyId, selfOrg, effectiveOutletId, scopedUnits, initialUnitId, selectedAssetOrg, isAssignedToCompany, isAssignedToOutlet]);

  // Company is disabled only if user scope restricts it OR asset already belongs to a fixed Sub-Company/Outlet
  const isCompanyDisabled = useMemo(() => {
    if (isOutletUser || isCompanyUser) return true;
    if (isAssignedToCompany || isAssignedToOutlet) return true;
    return false; // Group user with Main Group asset can select Company freely
  }, [isOutletUser, isCompanyUser, isAssignedToCompany, isAssignedToOutlet]);

  // Unit is disabled ONLY if it's already an outlet assignment or user is an outlet user
  // If it's a Main Group asset or Sub-Company asset, Unit is NOT disabled!
  const isUnitDisabled = useMemo(() => {
    if (isOutletUser) return true;
    if (isCompanyUser && scopedUnits?.length === 1) return true;
    if (isAssignedToOutlet) return true; // Already assigned to a specific unit
    return false; // Main Group or Sub-Company allows picking unit
  }, [isOutletUser, isCompanyUser, scopedUnits, isAssignedToOutlet]);

  // Company Options
  const companyOptions = useMemo(() => {
    if (!organizations || organizations.length === 0) return [];
    const companies = organizations
      .filter((org) => org.orgType === 'SUB_COMPANY')
      .map((org) => ({
        value: String(org.id),
        label: org.companyNameEnglish || `Company #${org.id}`,
      }));

    return [{ value: 'ALL', label: 'All Units' }, ...companies];
  }, [organizations]);

  // Unit Options based on selected Company
  const unitOptions = useMemo(() => {
    if (isOutletUser && scopedUnits?.length > 0) {
      return scopedUnits.map((u) => ({
        value: String(u.id),
        label: u.name || u.companyNameEnglish || `Unit #${u.id}`,
      }));
    }

    if (isCompanyUser) {
      if (scopedUnits && scopedUnits.length > 0) {
        return scopedUnits.map((u) => ({
          value: String(u.id),
          label: u.name || u.companyNameEnglish || `Unit #${u.id}`,
        }));
      }
      const compId = userCompanyId || selfOrg?.id;
      return organizations
        .filter((o) => o.orgType === 'OUTLET' && o.parentId === Number(compId))
        .map((o) => ({
          value: String(o.id),
          label: o.companyNameEnglish || `Unit #${o.id}`,
        }));
    }

    // When a specific company is picked in the filter
    if (selectedCompanyId && selectedCompanyId !== 'ALL') {
      return organizations
        .filter((o) => o.orgType === 'OUTLET' && String(o.parentId) === String(selectedCompanyId))
        .map((o) => ({
          value: String(o.id),
          label: o.companyNameEnglish || `Unit #${o.id}`,
        }));
    }

    // Main Group / ALL: list all units
    return organizations
      .filter((o) => o.orgType === 'OUTLET')
      .map((o) => ({
        value: String(o.id),
        label: o.companyNameEnglish || `Unit #${o.id}`,
      }));
  }, [organizations, selectedCompanyId, isCompanyUser, isOutletUser, scopedUnits, userCompanyId, selfOrg]);

  // Fetch unit locations when unit changes
  useEffect(() => {
    if (!selectedUnitId) {
      setLocations([]);
      setSelectedLocationId('');
      return;
    }

    let cancelled = false;
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        setError('');
        const res = await getAssetUnitLocationsByOrganization(selectedUnitId);
        if (!cancelled) {
          setLocations(extractArray(res));
        }
      } catch (err) {
        console.error('Failed to load locations', err);
        if (!cancelled) setError('Failed to load unit locations.');
      } finally {
        if (!cancelled) setLoadingLocations(false);
      }
    };

    fetchLocations();
    return () => {
      cancelled = true;
    };
  }, [selectedUnitId]);

  const locationOptions = useMemo(() => {
    return locations.map((loc) => ({
      value: String(loc.id),
      label: loc.locationName || `Location #${loc.id}`,
    }));
  }, [locations]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUnitId) {
      setError('Please select a unit');
      return;
    }
    if (!selectedLocationId) {
      setError('Please select a location');
      return;
    }
    const locObj = locations.find((l) => String(l.id) === String(selectedLocationId));
    onSave({
      unitId: selectedUnitId,
      locationId: selectedLocationId,
      locationName: locObj?.locationName || '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Assign to Location</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Assigning {selectedCount} asset{selectedCount > 1 ? 's' : ''} to a destination
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-2.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Company dropdown: Enabled when asset belongs to Main Group */}
          {isGroupUser && (
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1.5">
                Company (Filter Units)
                {isCompanyDisabled && <span className="text-[10px] text-gray-400 font-normal">(Auto-selected)</span>}
              </label>
              <SearchableSelect
                name="modalCompanyId"
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setSelectedUnitId(''); // clear unit so user can choose from the new company's units
                  setSelectedLocationId('');
                  setError('');
                }}
                placeholder="Select Company or All Units..."
                options={companyOptions}
                disabled={isCompanyDisabled}
              />
            </div>
          )}

          {/* Unit dropdown: Active and selectable according to the chosen company */}
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1.5">
              Select Unit <span className="text-red-500">*</span>
              {isUnitDisabled && <span className="text-[10px] text-gray-400 font-normal">(Auto-selected)</span>}
            </label>
            <SearchableSelect
              name="modalUnitId"
              value={selectedUnitId}
              onChange={(e) => {
                setSelectedUnitId(e.target.value);
                setSelectedLocationId('');
                setError('');
              }}
              placeholder={
                unitOptions.length === 0
                  ? 'No units available'
                  : 'Search unit...'
              }
              options={unitOptions}
              disabled={isUnitDisabled}
            />
          </div>

          {/* Location dropdown: Active once unit is selected */}
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1.5">
              Select Location <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              name="modalLocationId"
              value={selectedLocationId}
              onChange={(e) => {
                setSelectedLocationId(e.target.value);
                setError('');
              }}
              placeholder={
                !selectedUnitId
                  ? 'Select Unit first'
                  : loadingLocations
                  ? 'Loading locations...'
                  : locationOptions.length === 0
                  ? 'No locations found for this unit'
                  : 'Search location...'
              }
              options={locationOptions}
              disabled={!selectedUnitId || loadingLocations || locationOptions.length === 0}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedLocationId || !selectedUnitId}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#084E92] hover:bg-[#073e77] text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Updating...' : 'Assign Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
const AssignmentPreviewDrawer = ({
  assignment,
  onClose,
  onTransfer,
  actionSaving,
  canEdit = true,
}) => {
  if (!assignment) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="bg-blue-50/50 border border-blue-100 flex items-start justify-between px-5 py-4 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#265FA4]">
              Assignment Preview
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {assignment.assignmentId} Details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition cursor-pointer bg-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Item summary */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl shadow-sm px-4 py-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
              {assignment.assetImageUrl ? (
                <img
                  src={assignment.assetImageUrl}
                  alt={assignment.itemName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <QrCode className="w-7 h-7" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{assignment.assignmentId}</p>
              <p className="text-sm font-bold text-gray-900 truncate">
                {assignment.itemName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Type: {assignment.assignType}
              </p>
            </div>
          </div>

          {/* Current assignment */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserCog className="w-4 h-4 text-[#265FA4]" />
              <h3 className="text-sm font-bold text-[#265FA4]">
                Current Assignment
              </h3>
            </div>
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-4 grid grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Type
                </p>
                <div className="mt-1">
                  <AssignTypeBadge assignType={assignment.assignType} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={assignment.status} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Assigned To
                </p>
                <p className="text-xs font-semibold text-gray-800 mt-1">
                  {assignment.assignedTo}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Quantity
                </p>
                <p className="text-xs font-semibold text-gray-800 mt-1">
                  {assignment.qty}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  Location / Unit
                </p>
                <p className="text-xs font-semibold text-gray-800 mt-1">
                  {assignment.location}
                  {assignment.assetUnitLocationName && assignment.assetUnitLocationName !== '-'
                    ? ` - ${assignment.assetUnitLocationName}`
                    : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={() => onTransfer?.(assignment)}
              disabled={actionSaving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition disabled:opacity-60"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Transfer Asset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const AssignAssets = () => {
  const { canAdd, canEdit, canDelete, canView, canExport } = usePagePermissions('Assigned Asset');
  const [showExportModal, setShowExportModal] = useState(false);
  const {
    isOutletUser,
    isCompanyUser,
    units,
    effectiveOutletId,
    allowedOutletIds,
  } = useOrgScope();

  const [assignments, setAssignments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [previewAssignment, setPreviewAssignment] = useState(null);
  const [actionSaving] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [outletInput, setOutletInput] = useState('All');
  const [typeInput, setTypeInput] = useState('All');
  const [statusInput, setStatusInput] = useState('All');
  const [locationInput, setLocationInput] = useState('All');
  const [unitLocations, setUnitLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Row selection state
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState([]);
  const [selectedUnitScope, setSelectedUnitScope] = useState(null);

  // Location assign modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationAssignSaving, setLocationAssignSaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (isOutletUser) {
      const targetOutletId = effectiveOutletId || units?.[0]?.id;
      if (targetOutletId) {
        setOutletInput(String(targetOutletId));
      }
    } else if (isCompanyUser && units?.length === 1) {
      setOutletInput(String(units[0].id));
    }
  }, [isOutletUser, isCompanyUser, effectiveOutletId, units]);

  const loadAll = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [assignRes, orgRes] = await Promise.all([
        getAllAssignAssets(),
        getActiveCompany(),
      ]);
      setAssignments(extractArray(assignRes));
      setOrganizations(extractArray(orgRes));
    } catch (err) {
      console.error(err);
      setLoadError('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setLocationInput('All');
    if (!outletInput || outletInput === 'All') {
      setUnitLocations([]);
      return;
    }

    let cancelled = false;
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        const res = await getAssetUnitLocationsByOrganization(outletInput);
        if (!cancelled) {
          setUnitLocations(extractArray(res));
        }
      } catch (err) {
        console.error('Failed to load unit locations:', err);
        if (!cancelled) {
          setUnitLocations([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingLocations(false);
        }
      }
    };

    fetchLocations();
    return () => {
      cancelled = true;
    };
  }, [outletInput]);

  // Read directly from the assign asset response
  const enrichedAssignments = useMemo(() => {
    return (assignments ?? []).map((record) => {
      const assignedToLabel = record.assignedToName || record.companiesName || '-';

      return {
        id: record.id,
        rawRecord: record,
        assignmentId: `ASGN-${String(record.id).padStart(4, '0')}`,
        assetDbId: record.assetId,
        assetCode: record.assetCode || `AST-${String(record.assetId).padStart(4, '0')}`,
        itemName: record.assetName ?? '-',
        assignType: record.assetType ?? 'individual',
        assignedTo: assignedToLabel,
        companiesId: record.companiesId ?? null,
        companiesName: record.companiesName ?? '-',
        assetUnitLocationId: record.assetUnitLocationId ?? null,
        assetUnitLocationName: record.assetUnitLocationName ?? record.locationName ?? '-',
        subOutletId: record.subOutletId ?? null,
        subOutletName: record.suboutletname ?? '-',
        location: record.companiesName ?? '-',
        qty: record.quantity ?? 0,
        active: record.active,
        status: record.active ? 'Assigned' : 'Returned',
        createdAt: record.createdAt ?? null,
        assignedDate: record.createdAt ? record.createdAt.split(' ')[0] : '-',
      };
    });
  }, [assignments]);

const outletOptions = useMemo(() => {
    if (!units || units.length === 0) return [];
    return units.map((u) => ({
      value: String(u.id),
      label: u.name || u.companyNameEnglish || `Outlet #${u.id}`,
    }));
  }, [units]);

  const subLocationOptions = useMemo(() => {
    return (unitLocations ?? []).map((loc) => ({
      value: String(loc.id),
      label: loc.locationName || `Location #${loc.id}`,
    }));
  }, [unitLocations]);

  const scopedAssignments = useMemo(() => {
    if (!enrichedAssignments || enrichedAssignments.length === 0) return [];

    if (isOutletUser) {
      const myOutletId = Number(effectiveOutletId || units[0]?.id || 0);
      return enrichedAssignments.filter((item) => {
        if (!item.companiesId) return false;
        return (
          Number(item.companiesId) === myOutletId ||
          allowedOutletIds.has(Number(item.companiesId))
        );
      });
    }

    if (isCompanyUser) {
      return enrichedAssignments.filter((item) => {
        if (!item.companiesId) return false;
        return allowedOutletIds.has(Number(item.companiesId));
      });
    }

    return enrichedAssignments;
  }, [
    enrichedAssignments,
    isOutletUser,
    isCompanyUser,
    effectiveOutletId,
    units,
    allowedOutletIds,
  ]);

  
  const filteredAssignments = useMemo(() => {
    return scopedAssignments.filter((item) => {
      const search = searchInput.toLowerCase().trim();

      const searchMatch =
        !search ||
        item.assignmentId.toLowerCase().includes(search) ||
        item.assetCode.toLowerCase().includes(search) ||
        item.itemName.toLowerCase().includes(search) ||
        item.assignedTo.toLowerCase().includes(search) ||
        item.companiesName.toLowerCase().includes(search) ||
        (item.assetUnitLocationName && item.assetUnitLocationName.toLowerCase().includes(search));

      const outletMatch =
        outletInput === 'All' ||
        String(item.companiesId) === String(outletInput) ||
        item.companiesName === outletInput ||
        item.location === outletInput;

      const locationMatch =
        locationInput === 'All' ||
        String(item.assetUnitLocationId) === String(locationInput) ||
        item.assetUnitLocationName === locationInput;

      const typeMatch = typeInput === 'All' || item.assignType === typeInput;
      const statusMatch = statusInput === 'All' || item.status === statusInput;

      return searchMatch && outletMatch && locationMatch && typeMatch && statusMatch;
    });
  }, [
    scopedAssignments,
    searchInput,
    outletInput,
    locationInput,
    typeInput,
    statusInput,
  ]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchInput, outletInput, locationInput, typeInput, statusInput]);

  useEffect(() => {
    if (selectedAssignmentIds.length === 0) {
      setSelectedUnitScope(null);
    }
  }, [selectedAssignmentIds]);

  const totalAssignments = scopedAssignments.length;
  const activeAssignments = scopedAssignments.filter(
    (a) => a.status === 'Assigned',
  ).length;
  const returnedAssignments = scopedAssignments.filter(
    (a) => a.status === 'Returned',
  ).length;

  const STATS = [
    {
      title: 'Total Assignments',
      value: String(totalAssignments),
      icon: <Package size={18} />,
      iconBg: 'bg-[#D5E3FF]',
      iconColor: 'text-[#00376C]',
      color: 'text-[#1B1B1F]',
    },
    {
      title: 'Active Assignments',
      value: String(activeAssignments),
      icon: <CircleCheck size={18} />,
      iconBg: 'bg-[#DCFCE7]',
      iconColor: 'text-[#15803D]',
      color: 'text-[#15803D]',
    },
    {
      title: 'Returned Assets',
      value: String(returnedAssignments),
      icon: <RotateCcw size={18} />,
      iconBg: 'bg-[#D5E3FF]',
      iconColor: 'text-[#265FA4]',
      color: 'text-[#1B1B1F]',
    },
    {
      title: 'Pending Returns',
      value: '-',
      icon: <Clock size={18} />,
      iconBg: 'bg-[#FFEDD5]',
      iconColor: 'text-[#C2410C]',
      color: 'text-[#C2410C]',
    },
    {
      title: 'Transfer Requests',
      value: '-',
      icon: <ArrowLeftRight size={18} />,
      iconBg: 'bg-[#D5E3FF]',
      iconColor: 'text-[#265FA4]',
      color: 'text-[#265FA4]',
    },
    {
      title: 'Under Maintenance',
      value: '-',
      icon: <Wrench size={18} />,
      iconBg: 'bg-[#FEE2E2]',
      iconColor: 'text-[#BA1A1A]',
      color: 'text-[#BA1A1A]',
    },
  ];

  const handleToggleSelectRow = (row) => {
    const isSelected = selectedAssignmentIds.includes(row.id);
    if (isSelected) {
      const next = selectedAssignmentIds.filter((id) => id !== row.id);
      setSelectedAssignmentIds(next);
      if (next.length === 0) setSelectedUnitScope(null);
    } else {
      if (selectedAssignmentIds.length === 0) {
        setSelectedUnitScope(row.companiesId);
        setSelectedAssignmentIds([row.id]);
      } else if (String(selectedUnitScope) === String(row.companiesId)) {
        setSelectedAssignmentIds((prev) => [...prev, row.id]);
      }
    }
  };

  const handleSelectAllVisibleOfUnit = (e) => {
    if (e.target.checked) {
      if (selectedUnitScope) {
        const matchingIds = filteredAssignments
          .filter((item) => String(item.companiesId) === String(selectedUnitScope))
          .map((item) => item.id);
        setSelectedAssignmentIds(matchingIds);
      } else {
        const firstRow = filteredAssignments.find((item) => item.companiesId);
        if (firstRow) {
          setSelectedUnitScope(firstRow.companiesId);
          const matchingIds = filteredAssignments
            .filter((item) => String(item.companiesId) === String(firstRow.companiesId))
            .map((item) => item.id);
          setSelectedAssignmentIds(matchingIds);
        }
      }
    } else {
      setSelectedAssignmentIds([]);
      setSelectedUnitScope(null);
    }
  };

  const handleBulkAssignLocation = async ({ unitId, locationId, locationName }) => {
    try {
      setLocationAssignSaving(true);
      const updatePromises = selectedAssignmentIds.map((id) => {
        const fullItem = enrichedAssignments.find((a) => a.id === id);
        return updateAssignAsset({
          ...(fullItem?.rawRecord || {}),
          id,
          companiesId: Number(unitId),
          assetUnitLocationId: Number(locationId),
        });
      });

      await Promise.all(updatePromises);

      setAssignments((prev) =>
        prev.map((rec) =>
          selectedAssignmentIds.includes(rec.id)
            ? {
                ...rec,
                companiesId: Number(unitId),
                assetUnitLocationId: Number(locationId),
                locationName,
                assetUnitLocationName: locationName,
              }
            : rec
        )
      );

      setSelectedAssignmentIds([]);
      setSelectedUnitScope(null);
      setShowLocationModal(false);
    } catch (err) {
      console.error(err);
      setLoadError('Failed to update asset unit locations.');
    } finally {
      setLocationAssignSaving(false);
    }
  };

  const openDeleteConfirm = (row) => {
    setDeleteTarget({ id: row.id, itemLabel: row.itemName });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteSaving) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await deleteAssignAsset(deleteTarget.id);
      setAssignments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setSelectedAssignmentIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      closeDeleteConfirm();
    } catch (err) {
      console.error(err);
      setLoadError('Failed to delete assignment.');
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleTransfer = (assignment) => {
    navigate(`/assets/assign-asset/edit/${assignment.id}`);
    setPreviewAssignment(null);
  };

  const isAllSelectableChecked = useMemo(() => {
    if (filteredAssignments.length === 0) return false;
    const targetUnit = selectedUnitScope || filteredAssignments[0]?.companiesId;
    const eligibleRows = filteredAssignments.filter(
      (r) => String(r.companiesId) === String(targetUnit)
    );
    if (eligibleRows.length === 0) return false;
    return eligibleRows.every((r) => selectedAssignmentIds.includes(r.id));
  }, [filteredAssignments, selectedUnitScope, selectedAssignmentIds]);

  const columns = useMemo(() => [
    {
      id: 'select',
      header: () => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isAllSelectableChecked}
            onChange={handleSelectAllVisibleOfUnit}
            title={selectedUnitScope ? 'Select/Deselect visible rows for selected Unit' : 'Select all rows of first Unit'}
            className="w-3.5 h-3.5 rounded border-gray-300 text-[#084E92] accent-[#084E92] focus:ring-0 cursor-pointer"
          />
        </div>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isChecked = selectedAssignmentIds.includes(item.id);
        const isDisabled =
          selectedUnitScope !== null &&
          String(selectedUnitScope) !== String(item.companiesId);

        return (
          <div className="flex items-center justify-center py-2">
            <input
              type="checkbox"
              checked={isChecked}
              disabled={isDisabled}
              onChange={() => handleToggleSelectRow(item)}
              title={isDisabled ? 'You can only select assets from the same Unit' : ''}
              className={`w-3.5 h-3.5 rounded border-gray-300 text-[#084E92] accent-[#084E92] focus:ring-0 ${
                isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
            />
          </div>
        );
      },
      enableSorting: false,
      size: 32,
    },
    {
      id: 'sno',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="S.NO"
          column={column}
          className="my-2 text-xs"
        />
      ),
      cell: ({ row }) => (
        <span className="text-gray-500 py-2 text-xs">{String(row.index + 1).padStart(2, '0')}</span>
      ),
      enableSorting: false,
      size: 36,
    },
    {
      id: 'assignmentId',
      accessorFn: (row) => row.assignmentId,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ASSIGN ID"
          column={column}
          className="my-2 text-xs"
        />
      ),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setPreviewAssignment(row.original)}
          className="font-semibold text-xs text-[#084E92] leading-5 py-2 hover:underline cursor-pointer text-left truncate max-w-[100px]"
        >
          {row.original.assignmentId}
        </button>
      ),
      enableSorting: true,
      size: 100,
    },
    {
      id: 'assetCode',
      accessorFn: (row) => row.assetCode,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ASSET ID"
          column={column}
          className="my-2 text-xs"
        />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-gray-800 font-medium py-1 truncate max-w-[75px] block">{row.original.assetCode}</span>
      ),
      enableSorting: true,
      size: 75,
    },
    {
      id: 'itemName',
      accessorFn: (row) => row.itemName,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ITEM NAME"
          column={column}
          className="my-2 text-xs"
        />
      ),
      cell: ({ row }) => (
        <span title={row.original.itemName} className="font-medium text-xs text-gray-800 py-1 truncate max-w-[120px] block">
          {row.original.itemName}
        </span>
      ),
      enableSorting: true,
      size: 120,
    },
    {
      id: 'assignee',
      accessorFn: (row) => row.assignedTo,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ASSIGNED TO"
          column={column}
          className="my-2 text-xs"
        />
      ),
      cell: ({ row }) => (
        <div className="py-1 truncate max-w-[100px]">
          <p title={row.original.assignedTo} className="font-medium text-xs text-gray-800 leading-tight truncate">
            {row.original.assignedTo}
          </p>
        </div>
      ),
      enableSorting: true,
      size: 100,
    },
    {
      id: 'outlet',
      accessorFn: (row) => row.companiesName,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="UNIT"
          column={column}
          className="my-2 text-xs"
        />
      ),
      cell: ({ row }) => (
        <span title={row.original.companiesName} className="text-xs text-gray-800 font-medium py-1 truncate max-w-[95px] block">{row.original.companiesName}</span>
      ),
      enableSorting: false,
      size: 95,
    },
    {
      id: 'subLocation',
      accessorFn: (row) => row.assetUnitLocationName,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="LOCATION"
          column={column}
          className="my-2 text-xs"
        />
      ),
      cell: ({ row }) => (
        <span title={row.original.assetUnitLocationName} className="text-xs text-gray-800 font-medium py-1 truncate max-w-[95px] block">{row.original.assetUnitLocationName}</span>
      ),
      enableSorting: false,
      size: 95,
    },
    {
      id: 'assignedDate',
      accessorFn: (row) => row.assignedDate,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="DATE"
          column={column}
          className="my-2 text-xs whitespace-nowrap"
        />
      ),
      cell: ({ row }) => (
        <span className="text-gray-600 font-medium text-xs py-1 whitespace-nowrap">{row.original.assignedDate}</span>
      ),
      enableSorting: true,
      size: 85,
    },
    {
      id: 'qty',
      accessorFn: (row) => row.qty,
      header: ({ column }) => (
        <DataGridColumnHeader
          title="QTY"
          column={column}
          className="my-2 text-xs whitespace-nowrap"
        />
      ),
      cell: ({ row }) => (
        <span className="text-gray-800 font-medium text-xs py-1 whitespace-nowrap">
          {row.original.qty}
        </span>
      ),
      enableSorting: true,
      size: 50,
    },
    {
      id: 'actions',
      header: ({ column }) => (
        <DataGridColumnHeader
          title="ACTIONS"
          column={column}
          className="my-2 text-xs whitespace-nowrap"
        />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3 py-1 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setPreviewAssignment(row.original)}
            title="View Assignment"
          >
            <Eye
              size={18}
              className="text-gray-500 hover:text-blue-600 cursor-pointer"
            />
          </button>
          {canEdit && (
            <Link to={`/assets/assign-asset/edit/${row.original.id}`}>
              <SquarePen
                size={18}
                className="text-gray-500 hover:text-green-600 cursor-pointer"
              />
            </Link>
          )}
          {canDelete && (
            <button type="button" onClick={() => openDeleteConfirm(row.original)} title="Delete Assignment">
              <Trash2
                size={18}
                className="text-red-300 hover:text-red-600 cursor-pointer"
              />
            </button>
          )}
        </div>
      ),
      enableSorting: false,
      size: 75,
    },
  ], [canEdit, canDelete, selectedAssignmentIds, selectedUnitScope, isAllSelectableChecked, filteredAssignments]);

  const table = useReactTable({
    data: filteredAssignments,
    columns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!canView) {
    return <AccessDenied pageTitle="Assigned Asset" />;
  }

  return (
    <Container>
      <div className="pt-2 pb-6 mx-auto space-y-4">
        <PageHeader
          title="Assign Assets"
          actions={
            <div className="flex items-center gap-3 flex-wrap">
              {canExport && (
                <HeaderActionButton
                  variant="outline"
                  onClick={() => setShowExportModal(true)}
                  icon={<Download className="w-3.5 h-3.5" />}
                  label="Export"
                />
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  disabled={selectedAssignmentIds.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-white border-[#084E92] text-[#084E92] hover:bg-blue-50"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Assign to Location {selectedAssignmentIds.length > 0 && `(${selectedAssignmentIds.length})`}
                </button>
              )}

              {canAdd && (
                <HeaderActionButton to="/assets/assign-asset">
                  Assign Asset
                </HeaderActionButton>
              )}
            </div>
          }
        />

        <PageErrorAlert error={loadError} onRetry={loadAll} className="my-3" />

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 text-[#43474F]">
          {STATS.map((item) => (
            <div
              key={item.title}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs"
            >
              <div
                className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}
              >
                {item.icon}
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-[#00376C]">{item.title}</span>
                <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
            {/* Search */}
            <SearchBar
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ID, Name, Kitchen, Person..."
            />

            <div className={`grid grid-cols-1 ${isOutletUser ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
              {!isOutletUser && (
                <div>
                  <SearchableSelect
                    name="outletFilter"
                    value={outletInput === 'All' ? '' : outletInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOutletInput(val ? val : 'All');
                    }}
                    placeholder="All Units"
                    options={outletOptions}
                    isClearable={true}
                  />
                </div>
              )}

              {/* Sub Location */}
              <div>
                <SearchableSelect
                  name="locationFilter"
                  value={locationInput === 'All' ? '' : locationInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocationInput(val ? val : 'All');
                  }}
                  placeholder={
                    loadingLocations
                      ? 'Loading...'
                      : outletInput === 'All'
                        ? 'Select Unit First'
                        : 'All Locations'
                  }
                  options={subLocationOptions}
                  disabled={outletInput === 'All' || loadingLocations}
                  isClearable={true}
                />
              </div>

              {/* Status */}
              {/* <div>
                <Select value={statusInput} onValueChange={setStatusInput}>
                  <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg text-sm text-gray-600">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="Returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}

              {/* Assignment Type */}
              <div>
                <Select value={typeInput} onValueChange={setTypeInput}>
                  <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-lg text-sm text-gray-600">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Types</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company_outlet">Company/Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full my-6 border border-[#C3C6D1] rounded-2xl overflow-hidden bg-white">
          <DataGrid
            table={table}
            recordCount={filteredAssignments.length}
            isLoading={loading}
            className="rounded-2xl"
            tableLayout={{
              dense: true,
              width: 'fixed',
              cellBorder: true,
              headerBorder: true,
              rowBorder: true,
            }}
          >
            <Card className="rounded-t-none border-t-0 rounded-2xl">
              <CardTable className="w-full overflow-x-hidden">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-8 h-8 border-3 border-[#084E92]/20 border-t-[#084E92] rounded-full animate-spin" />
                    <p className="text-sm font-medium text-gray-500">Loading assignments...</p>
                  </div>
                ) : (
                  <DataGridTable />
                )}
              </CardTable>
              {!loading && (
                <CardFooter className="bg-[#EFF4FF] border-t border-[#C3C6D1] rounded-b-2xl">
                  <DataGridPagination />
                </CardFooter>
              )}
            </Card>
          </DataGrid>
        </div>

        {/* Dynamic Location Re-assignment Modal */}
        <AssignLocationModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          initialUnitId={selectedUnitScope}
          selectedCount={selectedAssignmentIds.length}
          onSave={handleBulkAssignLocation}
          saving={locationAssignSaving}
          preloadedOrganizations={organizations}
        />

        {previewAssignment && (
          <AssignmentPreviewDrawer
            assignment={previewAssignment}
            onClose={() => setPreviewAssignment(null)}
            onTransfer={handleTransfer}
            actionSaving={actionSaving}
            canEdit={canEdit}
          />
        )}
        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={closeDeleteConfirm}
          onConfirm={confirmDelete}
          itemLabel={deleteTarget?.itemLabel}
          saving={deleteSaving}
        />
        <MasterExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          tableName="assign_asset"
          title="Export Assign Asset Report"
        />
      </div>
    </Container>
  );
};

export default AssignAssets;
