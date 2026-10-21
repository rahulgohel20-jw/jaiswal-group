import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronDown,
  FileText,
  MapPin,
  PackageCheck,
  Save,
  Search,
  Store,
  Trash2,
  Users,
  X,
  Loader2,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useNavigate, useParams, useLocation } from 'react-router';
import {
  createAssignAsset,
  getActiveCompany,
  getAllActiveEmployees,
  getAllActiveAssetsPaginated,
  getAssignAssetById,
  updateAssignAsset,
  getAssetUnitLocationsByOrganization,
} from '@/services/apiServices.js';
import { usePagePermissions } from '@/utils/permissions';
import { useOrgScope } from '@/hooks/useOrgScope';
import { AccessDenied } from '@/components/common/AccessDenied';
import SearchableSelect from '../../../utils/SearchableSelect';
import { getAllActiveSubOutlets } from '../../../services/apiServices';
import { Container } from "@/components/common/container";
import { PageHeader } from "@/components/common/PageHeader";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatRemarks } from '@/utils/textUtils';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

// Safely pulls the array out of a response, regardless of whether the
// service resolves to the raw axios response, an already-unwrapped
// `{ msg, data, success }` body, or a bare array.
const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

// Matches the confirmed getAllAssets response shape:
// { id, assetCode, itemName, categoryName, brandName, modelNumber,
//   totalQuantity, availableQuantity, assetImagePaths, ... }
const extractAssetFields = (asset) => ({
  id: asset.id,
  code: asset.assetCode ?? String(asset.id),
  name: asset.itemName ?? asset.assetName ?? 'Unnamed Asset',
  category: asset.categoryName ?? '—',
  brand: asset.brandName ?? '—',
  model: asset.modelNumber ?? '—',
  totalQuantity: Number(asset.totalQuantity) || 0,
  availableQuantity: Number(asset.availableQuantity) || 0,
  imageUrl:
    asset.images?.[0]?.path ??
    (Array.isArray(asset.assetImagePaths) ? asset.assetImagePaths[0] : null),
});

// Org type -> friendly label + icon, used only for the badge shown next
// to the "Companies *" label (option lists themselves stay unlabeled —
// the type is inferred from selection, not printed per-row).
const ORG_TYPE_META = {
  GROUP: { label: 'Group', icon: Users },
  SUB_COMPANY: { label: 'Company', icon: Building2 },
  OUTLET: { label: 'Outlet', icon: Store },
};
const orgTypeLabel = (orgType) => ORG_TYPE_META[orgType]?.label ?? '-';

// Returns yyyy-mm-dd for today, matching what <input type="date"> expects.
const todayInputDate = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const toDDMMYYYY = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return null;
  return `${day}/${month}/${year}`;
};

const toInputDate = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) return dateStr;
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const Label = ({ children, required }) => (
  <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1.5">
    {children}
    {required && <span className="text-red-500">*</span>}
  </label>
);

const SectionCard = ({ children, className = '' }) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}
  >
    {children}
  </div>
);

const SubHeading = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-3.5 h-3.5 text-[#084E92]" />
    <h3 className="text-sm font-bold text-gray-800">{title}</h3>
  </div>
);

const ASSET_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'company_outlet', label: 'Company / Outlet' },
];
export const AssetMultiSelect = ({
  options = [],
  selected = [],
  onChange,
  disabled = false,
  loading = false,
  hasMore = false,
  totalCount = 0,
  onLoadMore,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const observerRef = useRef(null);
 const totalItems = totalCount > 0 ? totalCount : options.length; 
  const sentinelCallback = useCallback(
    (node) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore?.();
        }
      }, { threshold: 0.1 });

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, onLoadMore]
  );

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) =>
      (o.name ?? "").toLowerCase().includes(term) ||
      (o.code ?? "").toLowerCase().includes(term)
    );
  }, [options, query]);

  const isSelected = (id) => selected.some((s) => String(s.id) === String(id));

  const toggleOption = (asset) => {
    if (isSelected(asset.id)) {
      onChange(selected.filter((s) => String(s.id) !== String(asset.id)));
    } else {
      onChange([...selected, asset]);
    }
  };

 const isAllSelected = options.length > 0 && selected.length >= totalItems;

  const toggleSelectAll = () => {
    onChange(isAllSelected ? [] : [...options]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={`min-h-11 w-full border rounded-lg px-3 py-1.5 flex flex-wrap items-center gap-1.5 transition-all ${disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
              : "bg-white cursor-pointer hover:border-gray-400 focus-within:border-[#084E92]"
            } border-[#C3C6D1]`}
        >
          {selected.length > 2 ? (
            <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2 py-0.5 rounded">
              {isAllSelected
                ? `All Assets (${totalItems})`
                : `Selected Assets (${selected.length})`}
              {!disabled && (
                <X
                  size={12}
                  className="cursor-pointer hover:text-red-500 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                />
              )}
            </span>
          ) : (
            selected.map((item) => (
              <span
                key={item.id}
                className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2 py-0.5 rounded"
              >
                <span className="truncate max-w-28">{item.name}</span>
                {!disabled && (
                  <X
                    size={12}
                    className="cursor-pointer hover:text-red-500 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(selected.filter((s) => String(s.id) !== String(item.id)));
                    }}
                  />
                )}
              </span>
            ))
          )}

          <input
            type="text"
            value={query}
            disabled={disabled}
            placeholder={
              selected.length === 0
                ? loading && options.length === 0
                  ? "Loading assets..."
                  : "Search and select assets..."
                : ""
            }
            onClick={(e) => {
              e.stopPropagation();
              if (!open) setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            className="flex-1 min-w-24 bg-transparent text-sm text-gray-800 outline-none border-none p-0.5 placeholder:text-gray-400 cursor-text"
          />

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {selected.length > 0 && !disabled && (
              <X
                size={14}
                className="text-gray-400 hover:text-red-500 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                  setQuery("");
                }}
              />
            )}
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-1 w-(--radix-popover-trigger-width) min-w-64 max-h-60 overflow-y-auto bg-white border border-[#C3C6D1] rounded-xl shadow-xl z-50 text-xs"
      >
        {filteredOptions.length === 0 && !loading ? (
          <p className="px-3 py-3 text-gray-400 text-center">No assets found.</p>
        ) : (
          <>
            {options.length > 0 && !query.trim() && (
              <label className="flex items-center gap-2 px-3 py-2 font-semibold text-[#00376C] hover:bg-blue-50/70 rounded cursor-pointer border-b border-gray-100 mb-1">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="accent-[#00376C] rounded"
                />
                Select All Assets ({totalItems})
              </label>
            )}

            {filteredOptions.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-blue-50/70 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected(opt.id)}
                  onChange={() => toggleOption(opt)}
                  className="accent-[#00376C] rounded"
                />
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium">{opt.name}</span>
                  {opt.code && <span className="text-[10px] text-gray-400">{opt.code}</span>}
                </div>
              </label>
            ))}

            {hasMore && (
              <div ref={sentinelCallback} className="h-6 w-full flex items-center justify-center">
                {loading && (
                  <div className="flex items-center justify-center gap-1.5 py-2 text-gray-500">
                    <Loader2 size={13} className="animate-spin text-[#00376C]" />
                    <span>Loading more assets...</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

const AddAssignAsset = () => {
  const { id } = useParams();
  const location = useLocation();
  const preSelectedIds = location.state?.preSelectedAssetIds;
  const isEditMode = Boolean(id);
  const { canAdd, canEdit, canView } = usePagePermissions('Assigned Asset');
  const {
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    units,
    effectiveOutletId,
    userCompanyId,
    selfOrg,
  } = useOrgScope();

  const [form, setForm] = useState({
    assetId: '',
    assetType: 'individual',
    assignedTo: '',
    company: '',
    unit: '',
    subOutletId: '',
    assetUnitLocationId: '',
    quantity: '',
    assignmentDate: todayInputDate(),
    remarks: '',
  });

  const [selectedAssets, setSelectedAssets] = useState([]);
  const [activeAssetId, setActiveAssetId] = useState('');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // ---- Dynamic data: assets, organizations, employees ----
  const [assets, setAssets] = useState([]);
  const [assetPage, setAssetPage] = useState(0);
  const [hasMoreAssets, setHasMoreAssets] = useState(true);
  const [loadingAssetsMore, setLoadingAssetsMore] = useState(false);

  const assetPageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);

  const [organizations, setOrganizations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [subOutlets, setSubOutlets] = useState([]);

  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingSubOutlets, setLoadingSubOutlets] = useState(false);

  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(isEditMode);
  const [originalAssignmentQty, setOriginalAssignmentQty] = useState(0);

  const [quantities, setQuantities] = useState({});

  const PAGE_SIZE = 50;
  const [totalAssetsCount, setTotalAssetsCount] = useState(0);  
  const fetchAssetsPage = async (pageToFetch = 0, isInitial = false) => {
  if (loadingMoreRef.current) return;
  try {
    if (isInitial) {
      setLoadingAssets(true);
    } else {
      loadingMoreRef.current = true;
      setLoadingAssetsMore(true);
    }

    const res = await getAllActiveAssetsPaginated(pageToFetch, PAGE_SIZE);
    const pageData = res?.data?.data ?? res?.data;
    const content = pageData?.content || [];
    const isLast = pageData?.last ?? (content.length < PAGE_SIZE);

    // Capture totalElements from backend
    if (pageData?.totalElements != null) {
      setTotalAssetsCount(Number(pageData.totalElements));
    }

    setAssets((prev) => {
      if (pageToFetch === 0) {
        const currentLoaded = content;
        const currentIds = new Set(currentLoaded.map((a) => String(a.id)));
        const preserved = prev.filter((a) => !currentIds.has(String(a.id)));
        return [...preserved, ...currentLoaded];
      }
      const existingIds = new Set(prev.map((a) => String(a.id)));
      const newUnique = content.filter((a) => !existingIds.has(String(a.id)));
      return [...prev, ...newUnique];
    });

    assetPageRef.current = pageToFetch;
    setAssetPage(pageToFetch);

    hasMoreRef.current = !isLast;
    setHasMoreAssets(!isLast);
  } catch (err) {
    console.error('Failed to load paginated assets:', err);
  } finally {
    if (isInitial) setLoadingAssets(false);
    loadingMoreRef.current = false;
    setLoadingAssetsMore(false);
  }
};

  const handleLoadMoreAssets = useCallback(() => {
    if (hasMoreRef.current && !loadingMoreRef.current) {
      fetchAssetsPage(assetPageRef.current + 1, false);
    }
  }, []);

  const handleAssetQuantityChange = (assetId, val, maxAvailable) => {
    if (val === '') {
      setQuantities((q) => ({ ...q, [assetId]: '' }));
      return;
    }
    if (!/^\d+$/.test(val)) return;

    let num = Number(val);

    // If maxAvailable is defined and > 0, cap it; otherwise allow typing
    if (maxAvailable > 0 && num > maxAvailable) {
      num = maxAvailable;
    }

    setQuantities((q) => ({ ...q, [assetId]: String(num) }));
  };

  const handleRemoveAsset = (assetId) => {
    setSelectedAssets((prev) => prev.filter((a) => String(a.id) !== String(assetId)));
  };

  const navigate = useNavigate();

  // Auto-select company for company users and outlet for outlet users
  useEffect(() => {
    if (isEditMode) return;

    if (isCompanyUser) {
      const compId = userCompanyId || selfOrg?.id;
      if (compId) {
        setForm((f) => ({
          ...f,
          company: String(compId),
        }));
      }
    } else if (isOutletUser) {
      const outletId = effectiveOutletId || units?.[0]?.id;
      const compId = userCompanyId || selfOrg?.id;
      if (outletId) {
        setForm((f) => ({
          ...f,
          unit: String(outletId),
          company: f.company || (compId ? String(compId) : ''),
        }));
      }
    }
  }, [isOutletUser, isCompanyUser, effectiveOutletId, units, userCompanyId, selfOrg, isEditMode]);

  // Load existing assignment record in edit mode and auto-select asset immediately
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadRecord = async () => {
      try {
        setLoadingRecord(true);
        const res = await getAssignAssetById(id);
        const record = res?.data?.data ?? res?.data ?? res;

        if (!cancelled && record) {
          const existingQty = Number(record.quantity ?? record.qty) || 0;
          setOriginalAssignmentQty(existingQty);

          const loadedQuantities = {};
          const preloadedSelected = [];

          if (Array.isArray(record.assetItems) && record.assetItems.length > 0) {
            record.assetItems.forEach((item) => {
              const aId = String(item.assetId);
              loadedQuantities[aId] = String(item.qty ?? item.quantity ?? 0);
              preloadedSelected.push({
                id: item.assetId,
                code: item.assetCode ?? String(item.assetId),
                name: item.assetName ?? item.itemName ?? 'Unnamed Asset',
                availableQuantity: Number(item.availableQuantity) || 0,
                totalQuantity: Number(item.totalQuantity) || 0,
              });
            });
          } else if (record.assetId != null) {
            const aId = String(record.assetId);
            loadedQuantities[aId] = String(existingQty);
            preloadedSelected.push({
              id: record.assetId,
              code: record.assetCode ?? String(record.assetId),
              name: record.assetName ?? record.itemName ?? 'Unnamed Asset',
              availableQuantity: Number(record.availableQuantity) || 0,
              totalQuantity: Number(record.totalQuantity) || 0,
            });
          }

          setQuantities(loadedQuantities);
          setSelectedAssets(preloadedSelected);
          if (preloadedSelected.length > 0) {
            setActiveAssetId(String(preloadedSelected[0].id));
          }

          // Ensure the asset is included in master assets list so preview and dropdown show it
          setAssets((prev) => {
            const existingIds = new Set(prev.map((a) => String(a.id)));
            const missing = preloadedSelected.filter((p) => !existingIds.has(String(p.id)));
            return missing.length > 0 ? [...missing, ...prev] : prev;
          });

          setForm((f) => ({
            ...f,
            assetId: record.assetId ? String(record.assetId) : '',
            assetType: record.assetType ?? (record.assignToId ? 'individual' : 'company_outlet'),
            assignedTo: record.assignToId ? String(record.assignToId) : '',
            company: record.companiesId ? String(record.companiesId) : '',
            _pendingCompaniesId: record.companiesId ?? null,
            _pendingAssetIds:
              Array.isArray(record.assetItems) && record.assetItems.length > 0
                ? record.assetItems.map((item) => item.assetId)
                : record.assetIds ?? (record.assetId ? [record.assetId] : []),
            assetUnitLocationId: record.assetUnitLocationId != null ? String(record.assetUnitLocationId) : '',
            subOutletId: record.subOutletId != null ? String(record.subOutletId) : '',
            remarks: record.remarks || '',
            quantity: String(existingQty),
            assignmentDate: record.assignmentDate
              ? toInputDate(record.assignmentDate)
              : f.assignmentDate,
          }));
        }
      } catch (err) {
        console.error(err);
        setFetchError((prev) => prev || 'Failed to load assignment record.');
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    };

    loadRecord();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Handle location.state preselected assets in create mode
  useEffect(() => {
    if (isEditMode) return;
    if (preSelectedIds && preSelectedIds.length > 0 && assets.length > 0) {
      const matched = assets
        .filter((a) => preSelectedIds.map(String).includes(String(a.id)))
        .map(extractAssetFields);
      if (matched.length > 0) {
        setSelectedAssets(matched);
      }
    }
  }, [assets, preSelectedIds, isEditMode]);

  useEffect(() => {
    if (selectedAssets.length === 0) {
      setActiveAssetId('');
    } else if (!activeAssetId || !selectedAssets.some((a) => String(a.id) === String(activeAssetId))) {
      setActiveAssetId(String(selectedAssets[0].id));
    }
  }, [selectedAssets, activeAssetId]);

  useEffect(() => {
    if (!form._pendingCompaniesId || organizations.length === 0) return;
    const org = organizations.find((o) => o.id === Number(form._pendingCompaniesId));
    if (!org) return;

    setForm((f) => ({
      ...f,
      company: org.orgType === 'OUTLET' ? String(org.parentId) : String(org.id),
      unit: org.orgType === 'OUTLET' ? String(org.id) : '',
      _pendingCompaniesId: null,
    }));
  }, [organizations, form._pendingCompaniesId]);

  // Combine fetched assets and selected assets so loaded items never disappear from options
  const assetOptions = useMemo(() => {
    const list = [...(assets ?? [])];
    const existingIds = new Set(list.map((a) => String(a.id)));
    selectedAssets.forEach((sel) => {
      if (!existingIds.has(String(sel.id))) {
        list.push(sel);
      }
    });
    return list.map((a) => extractAssetFields(a));
  }, [assets, selectedAssets]);

  useEffect(() => {
    let cancelled = false;

    const loadMasters = async () => {
      try {
        setLoadingOrgs(true);
        setLoadingEmployees(true);
        setLoadingSubOutlets(true);

        const [orgRes, empRes, subRes] = await Promise.allSettled([
          getActiveCompany(),
          getAllActiveEmployees(),
          getAllActiveSubOutlets(),
        ]);

        if (!cancelled) {
          if (orgRes.status === 'fulfilled') {
            setOrganizations(extractArray(orgRes.value));
          } else {
            console.error('Failed to load organizations:', orgRes.reason);
          }

          if (empRes.status === 'fulfilled') {
            setEmployees(extractArray(empRes.value));
          } else {
            console.error('Failed to load employees:', empRes.reason);
          }

          if (subRes.status === 'fulfilled') {
            setSubOutlets(extractArray(subRes.value));
          } else {
            console.error('Failed to load sub-outlets:', subRes.reason);
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setFetchError('Failed to load form reference data.');
      } finally {
        if (!cancelled) {
          setLoadingOrgs(false);
          setLoadingEmployees(false);
          setLoadingSubOutlets(false);
        }
      }
    };

    loadMasters();
    fetchAssetsPage(0, true);

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch Locations when unit changes
  useEffect(() => {
    if (!form.unit) {
      setLocations([]);
      return;
    }

    let cancelled = false;
    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        const res = await getAssetUnitLocationsByOrganization(form.unit);
        if (!cancelled) {
          setLocations(extractArray(res));
        }
      } catch (err) {
        console.error('Failed to load asset unit locations:', err);
        if (!cancelled) setLocations([]);
      } finally {
        if (!cancelled) setLoadingLocations(false);
      }
    };

    loadLocations();
    return () => {
      cancelled = true;
    };
  }, [form.unit]);

  const selectedAsset = useMemo(() => {
    if (selectedAssets.length > 0) {
      const found = selectedAssets.find((a) => String(a.id) === String(activeAssetId));
      return found || selectedAssets[0];
    }
    if (!form.assetId) return null;
    const raw = (assets ?? []).find((a) => String(a.id) === String(form.assetId));
    return raw ? extractAssetFields(raw) : null;
  }, [selectedAssets, activeAssetId, assets, form.assetId]);

  const selectedAssetDropdownOptions = useMemo(
    () =>
      selectedAssets.map((asset) => ({
        value: String(asset.id),
        label: `${asset.code ? `${asset.code} — ` : ''}${asset.name}`,
      })),
    [selectedAssets]
  );

  const isIndividual = form.assetType === 'individual';

  // "Companies" dropdown = Group + Company (SUB_COMPANY) orgs, plain
  // names only — no type suffix in the list. The type of whatever gets
  // picked is shown separately, as a badge next to the field's label.
  const companyOptions = useMemo(
    () =>
      (organizations ?? [])
        .filter((o) => o.orgType === 'GROUP' || o.orgType === 'SUB_COMPANY')
        .map((o) => ({ value: String(o.id), label: o.companyNameEnglish })),
    [organizations],
  );

  // The org record behind whatever is currently selected in `form.company`
  // — used only to resolve its orgType for the badge next to the label.
  const selectedCompanyOrg = useMemo(() => {
    const effectiveCompanyId =
      form.company || (isCompanyUser && (userCompanyId || selfOrg?.id) ? String(userCompanyId || selfOrg?.id) : '');
    if (!effectiveCompanyId) return null;
    return (
      (organizations ?? []).find((o) => String(o.id) === String(effectiveCompanyId)) ?? null
    );
  }, [organizations, form.company, isCompanyUser, userCompanyId, selfOrg]);

  // "Unit" dropdown = Outlet orgs scoped under the selected Companies
  // value — direct children if a Company is picked, or every outlet
  // under every company in the group if a Group is picked.
  const unitOptions = useMemo(() => {
    if (isCompanyUser) {
      if (units && units.length > 0) {
        return units.map((u) => ({
          value: String(u.id),
          label: u.name || u.companyNameEnglish || `Unit #${u.id}`,
        }));
      }
      const compId = userCompanyId || selfOrg?.id;
      if (compId) {
        return (organizations ?? [])
          .filter((o) => o.orgType === 'OUTLET' && o.parentId === Number(compId))
          .map((o) => ({ value: String(o.id), label: o.companyNameEnglish }));
      }
    }

    if (!selectedCompanyOrg) return [];

    if (selectedCompanyOrg.orgType === 'SUB_COMPANY') {
      return (organizations ?? [])
        .filter(
          (o) => o.orgType === 'OUTLET' && o.parentId === selectedCompanyOrg.id,
        )
        .map((o) => ({ value: String(o.id), label: o.companyNameEnglish }));
    }

    // GROUP: outlets belonging to any company under this group.
    const companyIds = new Set(
      (organizations ?? [])
        .filter(
          (o) => o.orgType === 'SUB_COMPANY' && o.parentId === selectedCompanyOrg.id,
        )
        .map((o) => o.id),
    );
    return (organizations ?? [])
      .filter((o) => o.orgType === 'OUTLET' && companyIds.has(o.parentId))
      .map((o) => ({ value: String(o.id), label: o.companyNameEnglish }));
  }, [organizations, selectedCompanyOrg, isCompanyUser, units, userCompanyId, selfOrg]);

  const locationOptions = useMemo(
    () =>
      (locations ?? []).map((loc) => ({
        value: String(loc.id),
        label: loc.locationName || `Location ${loc.id}`,
      })),
    [locations],
  );

  const subOutletOptions = useMemo(
    () =>
      (subOutlets ?? [])
        .filter((sub) => !form.unit || String(sub.organizationId) === String(form.unit))
        .map((sub) => ({
          value: String(sub.id),
          label: sub.subOutletName || `Sub Unit #${sub.id}`,
        })),
    [subOutlets, form.unit]
  );
  // Builds the set of org ids that fall "under" a given org — itself, plus
  // (for a Group) every Company under it and every Outlet under those
  // companies, or (for a Company) every Outlet under it. This lets the
  // Assigned To list include Group users / Company users / Outlet users
  // regardless of which level was picked, instead of only exact matches.
  const orgTreeIds = useMemo(() => {
    const effectiveId =
      form.unit || form.company || (isCompanyUser && (userCompanyId || selfOrg?.id) ? String(userCompanyId || selfOrg?.id) : '');
    if (!effectiveId) return new Set();

    const org = (organizations ?? []).find(
      (o) => String(o.id) === String(effectiveId),
    );
    if (!org) return new Set();

    const ids = new Set([org.id]);

    if (org.orgType === 'GROUP') {
      const companies = (organizations ?? []).filter(
        (o) => o.orgType === 'SUB_COMPANY' && o.parentId === org.id,
      );
      companies.forEach((c) => ids.add(c.id));
      const companyIds = new Set(companies.map((c) => c.id));
      (organizations ?? [])
        .filter((o) => o.orgType === 'OUTLET' && companyIds.has(o.parentId))
        .forEach((o) => ids.add(o.id));
    } else if (org.orgType === 'SUB_COMPANY') {
      (organizations ?? [])
        .filter((o) => o.orgType === 'OUTLET' && o.parentId === org.id)
        .forEach((o) => ids.add(o.id));
    }
    // OUTLET: just itself, already added above.

    return ids;
  }, [form.unit, form.company, organizations, isCompanyUser, userCompanyId, selfOrg]);

  // Employees are scoped by whatever Companies/Unit is picked, for BOTH
  // assignType values now — a Company/Group/Outlet pick narrows the list
  // (Group users, Company users, Outlet users). With nothing picked,
  // Individual falls back to the full employee list; Company/Outlet
  // assignments require a scope to be picked first.
  const employeeOptions = useMemo(() => {
    const effectiveId =
      form.unit || form.company || (isCompanyUser && (userCompanyId || selfOrg?.id) ? String(userCompanyId || selfOrg?.id) : '');

    if (!effectiveId) {
      return isIndividual
        ? (employees ?? []).map((e) => ({
          value: String(e.id),
          label: e.designation ? `${e.fullName} — ${e.designation}` : e.fullName,
        }))
        : [];
    }

    return (employees ?? [])
      .filter((e) => orgTreeIds.has(e.organizationId))
      .map((e) => ({
        value: String(e.id),
        label: e.designation ? `${e.fullName} — ${e.designation}` : e.fullName,
      }));
  }, [employees, isIndividual, form.unit, form.company, orgTreeIds, isCompanyUser, userCompanyId, selfOrg]);

  const handleAssetTypeChange = (e) => {
    setForm((f) => ({ ...f, assetType: e.target.value, assignedTo: '' }));
  };

  const handleCompanyChange = (e) => {
    const newCompanyId = e.target.value;
    setForm((f) => ({
      ...f,
      company: newCompanyId,
      unit: '',
      subOutletId: '',
      assetUnitLocationId: '',
      assignedTo: '',
    }));
  };

  const handleUnitChange = (e) => {
    const newUnitId = e.target.value;
    setForm((f) => ({
      ...f,
      unit: newUnitId,
      subOutletId: '',
      assetUnitLocationId: '',
      assignedTo: '',
    }));
  };

  const availableStock = selectedAsset?.availableQuantity ?? 0;
  const totalStock = selectedAsset?.totalQuantity ?? 0;
  const maxAssignableQty =
    availableStock + (isEditMode ? originalAssignmentQty : 0);

  // Sanitizes quantity input as the user types:
  // - strips anything non-numeric
  // - blocks negative values (clamps to 0)
  // - blocks values above the selected asset's availableQuantity (clamps to it)
  const handleQuantityChange = (e) => {
    const raw = e.target.value;

    if (raw === '') {
      set('quantity', '');
      return;
    }

    // Reject minus signs, decimals, etc. — whole numbers only.
    if (!/^\d+$/.test(raw)) return;

    let num = Number(raw);
    if (num < 0) num = 0;
    if (num > maxAssignableQty) num = maxAssignableQty;

    set('quantity', String(num));
  };

  const qtyNum = Number(form.quantity) || 0;
  const remaining = Math.max(availableStock - qtyNum, 0);

  // Payload for createAssignAsset: { active, assetId, assignToId, companiesId, quantity, assignmentDate, remarks }
  const buildPayload = () => {
    const companiesId =
      form.unit || form.company || (userCompanyId || selfOrg?.id ? Number(userCompanyId || selfOrg?.id) : 0);
    const assetItems = selectedAssets.map((a) => ({
      assetId: Number(a.id),
      qty: Number(quantities[String(a.id)]) || 0,
    }));
    const totalQty = assetItems.reduce((sum, item) => sum + item.qty, 0);

    return {
      active: true,
      assetItems,
      assetType: form.assetType,
      assetUnitLocationId: form.assetUnitLocationId ? Number(form.assetUnitLocationId) : 0,
      assignToId: form.assignedTo ? Number(form.assignedTo) : 0,
      companiesId: Number(companiesId) || 0,
      subOutletId: form.subOutletId ? Number(form.subOutletId) : 0,
      quantity: totalQty,
      assignmentDate: toDDMMYYYY(form.assignmentDate),
      remarks: formatRemarks(form.remarks || ''),
    };
  };

  const handleSave = async () => {
    setSaveError('');
    setSaveSuccess(false);

    if (selectedAssets.length === 0 && !form.assetId) {
      setSaveError('Please select an asset.');
      return;
    }
    // Company is required for organization assignment; Unit is optional
    if (!isIndividual && !(form.company || form.unit || userCompanyId || selfOrg?.id)) {
      setSaveError('Please select a Company to assign to.');
      return;
    }
    // Assigned To is mandatory only for Individual assignments — optional
    // (org-level) for Group / Company / Outlet.
    if (isIndividual && !form.assignedTo) {
      setSaveError('Please select an employee to assign to.');
      return;
    }

    if (qtyNum > maxAssignableQty) {
      setSaveError(
        `Quantity cannot exceed the available stock (${availableStock}).`,
      );
      return;
    }

    const payload = buildPayload();

    try {
      setSaving(true);
      if (isEditMode) {
        await updateAssignAsset({ id: Number(id), ...payload });
      } else {
        await createAssignAsset(payload);
      }
      setSaveSuccess(true);
      setTimeout(() => navigate('/assigned-assets'), 600);
    } catch (err) {
      console.error(err);
      const data = err?.response?.data;
      setSaveError(
        data?.errorMessage ||
        data?.message ||
        (data?.msg && data.msg !== 'FAILED' && data.msg !== 'ERROR' ? data.msg : null) ||
        err?.message ||
        'Failed to save assignment.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canView || (isEditMode ? !canEdit : !canAdd)) {
    return <AccessDenied pageTitle={isEditMode ? 'Edit Assignment' : 'Assign Asset'} />;
  }

  return (
    <Container>
      <div className="mx-auto pt-2 pb-6 space-y-3.5">
        <PageHeader
          title={isEditMode ? 'Edit Assignment' : 'Assign Asset'}
          description="Configure deployment parameters for enterprise inventory."
          actions={
            <button
              type="button"
              onClick={() => navigate('/assigned-assets')}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Assigned Assets
            </button>
          }
        />

        {(fetchError || saveError) && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
            {fetchError || saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2">
            Assignment saved successfully.
          </div>
        )}

        <SectionCard className="mt-6">
          <div className="px-6 py-6 space-y-6">
            {/* Asset Multi-Selector with Infinite Scroll */}
            <div>
              <Label required>Search Asset</Label>
              <AssetMultiSelect
                  options={assetOptions}
                  selected={selectedAssets}
                  onChange={(newSelected) => {
                    setSelectedAssets(newSelected);
                    set('quantity', '');
                  }}
                  disabled={loadingAssets && assets.length === 0}
                  loading={loadingAssetsMore || (loadingAssets && assets.length === 0)}
                  hasMore={hasMoreAssets}
                  totalCount={totalAssetsCount}
                  onLoadMore={handleLoadMoreAssets}
                />
              </div>

            {/* Asset Details Preview Card */}
            {selectedAsset && (
              <div className="bg-linear-to-b from-[#F8FAFC] to-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 bg-[#F1F5F9]/60 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#084E92]" />
                    <span className="text-xs font-bold text-gray-700 tracking-wide uppercase">
                      Asset Details Preview
                    </span>
                    {selectedAssets.length > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0E7FF] text-[#084E92]">
                        {selectedAssets.length} Selected
                      </span>
                    )}
                  </div>

                  {selectedAssets.length > 1 && (
                    <div className="w-full sm:w-72">
                      <SearchableSelect
                        name="activeAssetSelection"
                        value={activeAssetId}
                        onChange={(e) => setActiveAssetId(e.target.value)}
                        placeholder="Switch selected asset..."
                        options={selectedAssetDropdownOptions}
                      />
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {selectedAsset.imageUrl ? (
                        <img
                          src={selectedAsset.imageUrl}
                          alt={selectedAsset.name}
                          className="w-14 h-14 rounded-lg border border-gray-200 object-cover shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                          <PackageCheck className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="inline-block text-[11px] font-semibold text-[#084E92] bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 mb-1">
                          {selectedAsset.code}
                        </span>
                        <p className="text-base font-bold text-gray-900 truncate">
                          {selectedAsset.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      <div className="w-14 h-14 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-1.5 shadow-2xs">
                        <QRCode
                          value={selectedAsset.code}
                          size={256}
                          style={{ height: 'auto', width: '100%' }}
                          viewBox="0 0 256 256"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-gray-100">
                    <div className="bg-white border border-gray-100 rounded-lg p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Category
                      </p>
                      <p className="text-xs font-bold text-gray-800 mt-1 truncate">
                        {selectedAsset.category}
                      </p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-lg p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Brand
                      </p>
                      <p className="text-xs font-bold text-gray-800 mt-1 truncate">
                        {selectedAsset.brand}
                      </p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-lg p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Model
                      </p>
                      <p className="text-xs font-bold text-gray-800 mt-1 truncate">
                        {selectedAsset.model}
                      </p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-lg p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Total Stock
                      </p>
                      <p className="text-xs font-bold text-gray-800 mt-1">
                        {selectedAsset.totalQuantity}
                      </p>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                        Available Stock
                      </p>
                      <p className="text-xs font-extrabold text-[#084E92] mt-1">
                        {selectedAsset.availableQuantity}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deployment Destinations */}
            <div className="border-t border-gray-100 pt-6 space-y-4">
              <SubHeading icon={MapPin} title="Deployment Destination" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="w-full">
                  <Label required>Assign To Type</Label>
                  <SearchableSelect
                    name="assetType"
                    value={form.assetType}
                    onChange={handleAssetTypeChange}
                    placeholder="Select asset type"
                    options={ASSET_TYPE_OPTIONS}
                  />
                </div>

                {/* Company Field: Always shown unless user is an Outlet user */}
                {!isOutletUser && (
                  <div className="w-full">
                    <div className="flex items-center justify-between">
                      <Label required={!isIndividual}>Company</Label>
                      {selectedCompanyOrg && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-[#084E92] border border-blue-100">
                          {orgTypeLabel(selectedCompanyOrg.orgType)}
                        </span>
                      )}
                    </div>
                    <SearchableSelect
                      name="company"
                      value={form.company}
                      onChange={handleCompanyChange}
                      placeholder={
                        isCompanyUser
                          ? selectedCompanyOrg?.companyNameEnglish || 'Your Company'
                          : loadingOrgs
                            ? 'Loading...'
                            : 'Select Company...'
                      }
                      options={companyOptions}
                      disabled={isCompanyUser || loadingOrgs}
                    />
                  </div>
                )}
              </div>

              <div className={`grid grid-cols-1 ${isOutletUser ? 'sm:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3'} gap-4 w-full`}>
                {/* Unit dropdown: Completely OPTIONAL (Non-Mandatory) */}
                {!isOutletUser && (
                  <div className="w-full">
                    <Label>Unit (Optional)</Label>
                    <SearchableSelect
                      name="unit"
                      value={form.unit}
                      onChange={handleUnitChange}
                      placeholder={
                        isCompanyUser
                          ? 'Select unit (Optional)'
                          : form.company
                            ? 'Select unit (Optional)'
                            : 'Select company first'
                      }
                      options={unitOptions}
                      disabled={!isCompanyUser && !form.company}
                      isClearable={true}
                    />
                  </div>
                )}

                <div className="w-full">
                  <Label>Location</Label>
                  <SearchableSelect
                    name="assetUnitLocationId"
                    value={form.assetUnitLocationId}
                    onChange={(e) => set('assetUnitLocationId', e.target.value)}
                    placeholder={
                      !form.unit
                        ? 'Select unit first'
                        : loadingLocations
                          ? 'Loading locations...'
                          : 'Select location...'
                    }
                    options={locationOptions}
                    disabled={loadingLocations || !form.unit}
                    isClearable={true}
                  />
                </div>

                <div className="w-full">
                  <Label required={isIndividual}>Assigned To</Label>
                  <SearchableSelect
                    name="assignedTo"
                    value={form.assignedTo}
                    onChange={(e) => set('assignedTo', e.target.value)}
                    placeholder={
                      form.company || form.unit || (isCompanyUser && (userCompanyId || selfOrg?.id))
                        ? 'Search employee'
                        : 'Select company first'
                    }
                    options={employeeOptions}
                    disabled={!form.company && !form.unit && !(isCompanyUser && (userCompanyId || selfOrg?.id))}
                  />
                </div>
              </div>
            </div>

            {/* Quantity Distribution Per Asset Table */}
            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-3">
                <SubHeading icon={PackageCheck} title="Quantity Distribution Per Asset" />
                {selectedAssets.length > 0 && (
                  <span className="text-xs text-gray-500">
                    Total Units:{' '}
                    <strong className="text-[#084E92]">
                      {Object.values(quantities).reduce((acc, curr) => acc + (Number(curr) || 0), 0)}
                    </strong>
                  </span>
                )}
              </div>

              {selectedAssets.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400 text-xs">
                  No assets selected. Select assets from above to assign individual quantities.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                        <th className="py-3 px-4">Asset Code & Name</th>
                        <th className="py-3 px-4 text-center">Available Stock</th>
                        <th className="py-3 px-4 w-44">Assign Quantity</th>
                        <th className="py-3 px-4 text-center">Remaining</th>
                        <th className="py-3 px-4 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {selectedAssets.map((asset) => {
                        const assetIdKey = String(asset.id);
                        const assignedVal = quantities[assetIdKey] ?? '';
                        const assignedNum = Number(assignedVal) || 0;
                        const baseAvail = Number(asset.availableQuantity) || 0;
                        const editAllowance = isEditMode ? (originalAssignmentQty || Number(asset.quantity) || Number(assignedVal) || 0) : 0;
                        const maxAvail = baseAvail + editAllowance;
                        const remStock = Math.max(maxAvail - assignedNum, 0);

                        return (
                          <tr key={asset.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[#084E92] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shrink-0">
                                  {asset.code}
                                </span>
                                <span className="font-medium text-gray-800 truncate max-w-xs" title={asset.name}>
                                  {asset.name}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-center font-semibold text-gray-700">
                              {asset.availableQuantity}
                            </td>

                            <td className="py-3 px-4">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder={`1 - ${maxAvail}`}
                                value={assignedVal}
                                onChange={(e) =>
                                  handleAssetQuantityChange(assetIdKey, e.target.value, maxAvail)
                                }
                                disabled={!isEditMode && maxAvail === 0}
                                className={`${inputCls} px-3 text-center ${maxAvail === 0 ? 'bg-gray-100 cursor-not-allowed' : ''
                                  }`}
                              />
                            </td>

                            <td className="py-3 px-4 text-center font-medium">
                              <span
                                className={`text-xs px-2 py-1 rounded-md font-semibold ${remStock === 0
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-green-50 text-green-700 border border-green-200'
                                  }`}
                              >
                                {remStock}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveAsset(asset.id)}
                                className="text-gray-400 hover:text-red-500 p-1 rounded transition"
                                title="Remove asset"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Remarks & Date */}
            <div className="border-t border-gray-100 pt-6 space-y-4">
              <SubHeading icon={FileText} title="Assignment Documentation" />

              <div>
                <Label>Assignment Date</Label>
                <div className="relative sm:w-1/2">
                  <input
                    type="date"
                    value={form.assignmentDate}
                    onChange={(e) => set('assignmentDate', e.target.value)}
                    className={`${inputCls} pr-3`}
                  />
                </div>
              </div>

              <div>
                <Label>Remarks</Label>
                <textarea
                  value={form.remarks}
                  onChange={(e) => set('remarks', e.target.value)}
                  onBlur={() => set('remarks', formatRemarks(form.remarks))}
                  placeholder="Enter specific note or location details"
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="flex items-center justify-end gap-3 mt-6 border-t border-gray-200 pt-6 flex-wrap">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 hover:bg-[#073e77] transition cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Assignment'}
          </button>
        </div>
      </div>
    </Container>
  );
};

export default AddAssignAsset;