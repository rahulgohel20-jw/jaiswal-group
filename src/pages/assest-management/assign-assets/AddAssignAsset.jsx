import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  ChevronDown,
  FileText,
  MapPin,
  PackageCheck,
  Save,
  Search,
  Store,
  Users,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useNavigate, useParams } from 'react-router';
import {
  createAssignAsset,
  getActiveCompany,
  getAllActiveEmployees,
  getAllAssets,
  getAssignAssetById,
  updateAssignAsset,
} from '@/services/apiServices.js';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
  name: asset.itemName ?? 'Unnamed Asset',
  category: asset.categoryName ?? '—',
  brand: asset.brandName ?? '—',
  model: asset.modelNumber ?? '—',
  totalQuantity: Number(asset.totalQuantity) || 0,
  availableQuantity: Number(asset.availableQuantity) || 0,
  imageUrl: Array.isArray(asset.assetImagePaths)
    ? asset.assetImagePaths[0]
    : null,
});

const Label = ({ children, required }) => (
  <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1.5">
    {children}
    {required && <span className="text-red-500">*</span>}
  </label>
);

const Select = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  name,
  disabled = false,
  icon: Icon = ChevronDown,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = options.find(
    (option) => String(option.value ?? option) === String(value),
  );

  const selectedLabel = selectedOption
    ? String(selectedOption.label ?? selectedOption)
    : '';

  React.useEffect(() => {
    if (!open) {
      setSearch(selectedLabel);
    }
  }, [open, selectedLabel]);

  const filteredOptions = options.filter((option) => {
    const label = String(option.label ?? option);
    return label.toLowerCase().includes(search.trim().toLowerCase());
  });

  const handleSelect = (option) => {
    const optionValue = option.value ?? option;
    const optionLabel = option.label ?? option;

    onChange({
      target: {
        name,
        value: String(optionValue),
      },
    });

    setSearch(String(optionLabel));
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value;

    setSearch(inputValue);
    setOpen(true);

    if (String(inputValue) !== String(selectedLabel)) {
      onChange({
        target: {
          name,
          value: '',
        },
      });
    }
  };

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={(nextOpen) => {
        if (disabled) return;
        setOpen(nextOpen);
        if (nextOpen) setSearch(selectedLabel);
      }}
      modal={false}
    >
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <input
            name={name}
            value={search}
            placeholder={placeholder}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setOpen(true);
              setSearch(selectedLabel);
            }}
            onChange={handleInputChange}
            className={`${inputCls} pr-10 cursor-text`}
          />
          <Icon
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-0 w-(--radix-popover-trigger-width) overflow-hidden z-100"
      >
        <div className="max-h-52 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const optionValue = option.value ?? option;
              const optionLabel = option.label ?? option;
              const isSelected = String(value) === String(optionValue);

              return (
                <button
                  key={String(optionValue)}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 ${
                    isSelected
                      ? 'bg-blue-50 text-primary font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  {optionLabel}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-sm text-gray-500">
              No options found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

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

// ---- Assignment Type: two options ----
const ASSIGN_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'company_outlet', label: 'Company / Outlet' },
];

const AddAssignAsset = () => {
  const [form, setForm] = useState({
    assetId: '', // id of the selected asset from the searchable dropdown
    assignType: 'individual', // 'individual' | 'company_outlet'
    assignedTo: '',
    company: '',
    unit: '',
    floorLevel: '',
    quantity: '', // string while editing; sanitized on change
    assignmentDate: '',
    remarks: '',
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // ---- Dynamic data: assets, organizations, employees ----
  const [assets, setAssets] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const [loadingRecord, setLoadingRecord] = useState(isEditMode);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadRecord = async () => {
      try {
        setLoadingRecord(true);
        const res = await getAssignAssetById(id);
        const record = res?.data?.data ?? res?.data ?? res;
        if (!cancelled && record) {
          setForm((f) => ({
            ...f,
            assetId: record.assetId ? String(record.assetId) : '',
            assignType: record.assignToId ? 'individual' : 'company_outlet',
            assignedTo: record.assignToId ? String(record.assignToId) : '',
            quantity: record.quantity != null ? String(record.quantity) : '',
            // Held until `organizations` has loaded; resolved into
            // company/unit by the effect below, then cleared.
            _pendingCompaniesId: record.companiesId ?? null,
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

  // Resolves the record's companiesId into company + unit once the
  // organizations list is available, since we need parentId to know
  // whether it was an outlet-level or company-level assignment.
  useEffect(() => {
    if (!form._pendingCompaniesId || organizations.length === 0) return;
    const org = organizations.find(
      (o) => o.id === Number(form._pendingCompaniesId),
    );
    if (!org) return;

    setForm((f) => ({
      ...f,
      company: org.orgType === 'OUTLET' ? String(org.parentId) : String(org.id),
      unit: org.orgType === 'OUTLET' ? String(org.id) : '',
      _pendingCompaniesId: null,
    }));
  }, [organizations, form._pendingCompaniesId]);

  const assetOptions = useMemo(
    () =>
      (assets ?? []).map((a) => {
        const { id, code, name } = extractAssetFields(a);
        return { value: id, label: `${code} — ${name}` };
      }),
    [assets],
  );

  const selectedAsset = useMemo(() => {
    if (!form.assetId) return null;
    const raw = (assets ?? []).find(
      (a) => String(a.id) === String(form.assetId),
    );
    return raw ? extractAssetFields(raw) : null;
  }, [assets, form.assetId]);

  const isIndividual = form.assignType === 'individual';

  // "Company" = SUB_COMPANY orgs.
  const companyOptions = useMemo(
    () =>
      (organizations ?? [])
        .filter((o) => o.orgType === 'SUB_COMPANY')
        .map((o) => ({ value: o.id, label: o.companyNameEnglish })),
    [organizations],
  );

  // "Unit/Outlet" = OUTLET orgs whose parentId matches the selected company.
  const unitOptions = useMemo(() => {
    if (!form.company) return [];
    return (organizations ?? [])
      .filter(
        (o) => o.orgType === 'OUTLET' && o.parentId === Number(form.company),
      )
      .map((o) => ({ value: o.id, label: o.companyNameEnglish }));
  }, [organizations, form.company]);

  const selectedUnit = (organizations ?? []).find(
    (o) => o.id === Number(form.unit),
  );

  // Employees are scoped by assignType:
  // - individual      -> everyone, no org filter
  // - company_outlet  -> filtered to the unit if picked, else the company
  const employeeOptions = useMemo(() => {
    if (isIndividual) {
      return (employees ?? []).map((e) => ({
        value: e.id,
        label: e.designation ? `${e.fullName} — ${e.designation}` : e.fullName,
      }));
    }

    const scopeOrgId = form.unit
      ? Number(form.unit)
      : form.company
        ? Number(form.company)
        : null;

    if (!scopeOrgId) return [];

    return (employees ?? [])
      .filter((e) => e.organizationId === scopeOrgId)
      .map((e) => ({
        value: e.id,
        label: e.designation ? `${e.fullName} — ${e.designation}` : e.fullName,
      }));
  }, [employees, isIndividual, form.company, form.unit]);

  const handleAssetChange = (e) => {
    // Changing the asset invalidates whatever quantity was typed for the
    // previous asset's stock, so clear it rather than carry over a value
    // that may now be negative-relative or over the new asset's available stock.
    setForm((f) => ({ ...f, assetId: e.target.value, quantity: '' }));
  };

  // Switching assignType resets the fields that no longer apply.
  const handleAssignTypeChange = (e) => {
    const newType = e.target.value;
    setForm((f) => ({
      ...f,
      assignType: newType,
      company: newType === 'individual' ? '' : f.company,
      unit: newType === 'individual' ? '' : f.unit,
      assignedTo: '',
    }));
  };

  const handleCompanyChange = (e) => {
    const newCompanyId = e.target.value;
    setForm((f) => ({ ...f, company: newCompanyId, unit: '', assignedTo: '' }));
  };

  const handleUnitChange = (e) => {
    const newUnitId = e.target.value;
    setForm((f) => ({ ...f, unit: newUnitId, assignedTo: '' }));
  };

  const availableStock = selectedAsset?.availableQuantity ?? 0;
  const totalStock = selectedAsset?.totalQuantity ?? 0;

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
    if (num > availableStock) num = availableStock;

    set('quantity', String(num));
  };

  const qtyNum = Number(form.quantity) || 0;
  const remaining = Math.max(availableStock - qtyNum, 0);

  // Payload for createAssignAsset: { active, assetId, assignToId, companiesId, quantity }
  const buildPayload = () => {
    const companiesId = isIndividual
      ? null
      : form.unit
        ? Number(form.unit)
        : form.company
          ? Number(form.company)
          : null;

    return {
      active: true,
      assetId: form.assetId ? Number(form.assetId) : null,
      assignToId: form.assignedTo ? Number(form.assignedTo) : null,
      companiesId,
      quantity: qtyNum,
    };
  };

  const handleSave = async () => {
    setSaveError('');
    setSaveSuccess(false);

    if (!form.assetId) {
      setSaveError('Please select an asset.');
      return;
    }
    if (!isIndividual && !(form.unit || form.company)) {
      setSaveError('Please select a company (and optionally an outlet).');
      return;
    }
    if (isIndividual && !form.assignedTo) {
      setSaveError('Please select an employee to assign to.');
      return;
    }
    if (qtyNum <= 0) {
      setSaveError('Quantity must be at least 1.');
      return;
    }
    if (qtyNum > availableStock) {
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
      setTimeout(() => navigate('/assets/assign-assets'), 600);
    } catch (err) {
      console.error(err);
      setSaveError(err?.response?.data?.msg || 'Failed to save assignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-4 min-h-screen pb-8 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {isEditMode ? 'Edit Assignment' : 'Assign Asset'}
          </h1>
          <p className="text-[#43474F] mt-1">
            Configure deployment parameters for enterprise inventory.
          </p>
        </div>
      </div>

      {fetchError && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
          {fetchError}
        </div>
      )}
      {saveError && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2">
          Assignment saved successfully.
        </div>
      )}

      <SectionCard className="mt-6">
        <div className="px-6 py-6 space-y-6">
          {/* Asset picker — always visible, at the top */}
          <div>
            <Label required>Search Asset</Label>
            <Select
              value={form.assetId}
              onChange={handleAssetChange}
              placeholder={
                loadingAssets
                  ? 'Loading assets...'
                  : 'Search by asset ID or name...'
              }
              options={assetOptions}
              icon={Search}
              disabled={loadingAssets}
            />
          </div>

          {/* Asset summary — only appears once an item is picked above */}
          {selectedAsset && (
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-5 py-5 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedAsset.imageUrl && (
                    <img
                      src={selectedAsset.imageUrl}
                      alt={selectedAsset.name}
                      className="w-14 h-14 rounded-md border border-gray-200 object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">
                      {selectedAsset.code}
                    </p>
                    <p className="text-base font-bold text-gray-900 truncate">
                      {selectedAsset.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-14 h-14 rounded-md border border-gray-200 bg-white flex items-center justify-center p-1.5">
                    <QRCode
                      value={selectedAsset.code}
                      size={256}
                      style={{ height: 'auto', width: '100%' }}
                      viewBox="0 0 256 256"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-blue-100">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Category
                  </p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">
                    {selectedAsset.category}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Brand
                  </p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">
                    {selectedAsset.brand}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Model
                  </p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">
                    {selectedAsset.model}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Total Stock
                  </p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">
                    {selectedAsset.totalQuantity}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Available
                  </p>
                  <p className="text-sm font-bold text-[#084E92] mt-0.5">
                    {selectedAsset.availableQuantity}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <SubHeading icon={MapPin} title="Deployment Destination" />

            <div>
              <Label required>Assign To Type</Label>
              <div className="sm:w-1/2">
                <Select
                  value={form.assignType}
                  onChange={handleAssignTypeChange}
                  placeholder="Select assignment type"
                  options={ASSIGN_TYPE_OPTIONS}
                />
              </div>
            </div>

            <div
              className={`grid grid-cols-1 gap-4 w-full ${
                isIndividual ? 'sm:grid-cols-1' : 'sm:grid-cols-3'
              }`}
            >
              {!isIndividual && (
                <div className="w-full">
                  <Label required>Company</Label>
                  <Select
                    value={form.company}
                    onChange={handleCompanyChange}
                    placeholder="Select company"
                    options={companyOptions}
                  />
                </div>
              )}

              {!isIndividual && (
                <div className="w-full">
                  <Label>Outlet (optional)</Label>
                  <Select
                    value={form.unit}
                    onChange={handleUnitChange}
                    placeholder={
                      form.company ? 'Select outlet' : 'Select company first'
                    }
                    options={unitOptions}
                    disabled={!form.company}
                  />
                </div>
              )}

              <div className="w-full">
                <Label required={isIndividual}>Assigned To</Label>
                <Select
                  value={form.assignedTo}
                  onChange={(e) => set('assignedTo', e.target.value)}
                  placeholder="Select employee"
                  options={employeeOptions}
                  disabled={!isIndividual && !form.company}
                />
              </div>
            </div>

            {!isIndividual && form.unit && (
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    City
                  </p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    {selectedUnit?.cityName ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    State
                  </p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    {selectedUnit?.stateName ?? '—'}
                  </p>
                </div>
                <div>
                  <Label>Floor / Level</Label>
                  <input
                    value={form.floorLevel}
                    onChange={(e) => set('floorLevel', e.target.value)}
                    className={`${inputCls} bg-white`}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-5 py-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-bold text-gray-800">
                  Quantity Distribution
                </p>
                <div className="flex items-center gap-5 text-right">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Available
                    </p>
                    <p className="text-sm font-bold text-[#084E92]">
                      {selectedAsset ? availableStock : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Total Stock
                    </p>
                    <p className="text-sm font-bold text-gray-700">
                      {selectedAsset ? totalStock : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <input
                type="text"
                inputMode="numeric"
                min={0}
                max={availableStock}
                value={form.quantity}
                onChange={handleQuantityChange}
                disabled={!selectedAsset || availableStock === 0}
                placeholder={
                  !selectedAsset
                    ? 'Select an asset first'
                    : availableStock === 0
                      ? 'No stock available'
                      : `1 – ${availableStock}`
                }
                className={`${inputCls} bg-white sm:w-56`}
              />

              <div className="flex justify-end">
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                  <PackageCheck className="w-3.5 h-3.5" />
                  Remaining: {selectedAsset ? remaining : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <SubHeading icon={FileText} title="Assignment Documentation" />

            <div>
              <Label>Assignment Date</Label>
              <div className="relative sm:w-1/2">
                <input
                  type="date"
                  value={form.assignmentDate}
                  onChange={(e) => set('assignmentDate', e.target.value)}
                  className={`${inputCls} pr-9`}
                />
                <CalendarDays className="w-3.5 h-3.5 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <Label>Remarks / Notes</Label>
              <textarea
                value={form.remarks}
                onChange={(e) => set('remarks', e.target.value)}
                placeholder="Enter specific instructions or conditions for this assignment..."
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex items-center justify-end gap-3 mt-6 border-t border-gray-200 pt-6 flex-wrap">
        <div className="flex items-center gap-3">
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
    </div>
  );
};

export default AddAssignAsset;
