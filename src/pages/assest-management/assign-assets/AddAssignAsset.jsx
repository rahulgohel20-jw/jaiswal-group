import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  FileText,
  MapPin,
  PackageCheck,
  Save,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import {
  createAssignAsset,
  getActiveCompany,
  getAllActiveEmployees,
  getAllAssets,
} from '@/services/apiServices.js';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const selectCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 appearance-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

// Safely pulls the array out of a response, regardless of whether
// getActiveCompany/getAllActiveEmployees/getAllAssets resolve to the raw axios
// response, an already-unwrapped `{ msg, data, success }` body, or
// a bare array. Confirmed shape from the API: { msg, data: [...], success }.
const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

// Today's date in yyyy-mm-dd, for the native <input type="date"> default value.
const getTodayIso = () => new Date().toISOString().split('T')[0];

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
  loading = false,
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

    // Search start karte hi old selected value clear
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
      open={open && !disabled}
      onOpenChange={(nextOpen) => {
        if (disabled) return;
        setOpen(nextOpen);

        if (nextOpen) {
          setSearch(selectedLabel);
        }
      }}
      modal={false}
    >
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <input
            name={name}
            value={loading ? 'Loading...' : search}
            placeholder={placeholder}
            disabled={disabled || loading}
            onClick={() => {
              if (disabled || loading) return;
              setOpen(true);
              setSearch(selectedLabel);
            }}
            onChange={handleInputChange}
            className={`${inputCls} pr-10 cursor-text ${
              disabled || loading
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                : ''
            }`}
          />

          <ChevronDown
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

const ASSIGNMENT_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'company/outlet', label: 'Company / Outlet' },
];

const AddAssignAsset = () => {
  const [form, setForm] = useState({
    assetId: '',
    assignedTo: '',
    company: '',
    unit: '',
    quantity: '1',
    assignmentDate: getTodayIso(),
    remarks: '',
  });

  // 'individual' assigns the asset to an employee (assignToId); 'company'
  // assigns it to the selected company/outlet only (assignToId omitted).
  const [assignmentType, setAssignmentType] = useState('individual');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // ---- Dynamic data: assets, organizations (companies + outlets), employees ----
  const [assets, setAssets] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadAssets = async () => {
      try {
        setLoadingAssets(true);
        const res = await getAllAssets();
        if (!cancelled) setAssets(extractArray(res));
      } catch (err) {
        if (!cancelled)
          setFetchError((prev) => prev || 'Failed to load assets.');
        console.error(err);
      } finally {
        if (!cancelled) setLoadingAssets(false);
      }
    };

    const loadOrganizations = async () => {
      try {
        setLoadingOrgs(true);
        const res = await getActiveCompany();
        if (!cancelled) setOrganizations(extractArray(res));
      } catch (err) {
        if (!cancelled)
          setFetchError((prev) => prev || 'Failed to load companies.');
        console.error(err);
      } finally {
        if (!cancelled) setLoadingOrgs(false);
      }
    };

    const loadEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const res = await getAllActiveEmployees();
        if (!cancelled) setEmployees(extractArray(res));
      } catch (err) {
        if (!cancelled)
          setFetchError((prev) => prev || 'Failed to load employees.');
        console.error(err);
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    };

    loadAssets();
    loadOrganizations();
    loadEmployees();

    return () => {
      cancelled = true;
    };
  }, []);

  // Asset dropdown options — searchable by code and name (Select filters on `label`).
  // `itemName` is the API field for the asset's display name.
  const assetOptions = useMemo(
    () =>
      (assets ?? []).map((a) => {
        const code = a.assetCode ?? a.code ?? `AST-${a.id}`;
        const name = a.itemName ?? 'Unnamed Asset';
        return { value: a.id, label: `${code} — ${name}` };
      }),
    [assets],
  );

  const selectedAsset = (assets ?? []).find(
    (a) => a.id === Number(form.assetId),
  );

  // "Company" = SUB_COMPANY orgs.
  const companyOptions = useMemo(
    () =>
      (organizations ?? [])
        .filter((o) => o.orgType === 'SUB_COMPANY')
        .map((o) => ({ value: o.id, label: o.companyNameEnglish })),
    [organizations],
  );

  // "Unit" = OUTLET orgs whose parentId matches the selected company.
  const unitOptions = useMemo(() => {
    if (!form.company) return [];
    return (organizations ?? [])
      .filter(
        (o) => o.orgType === 'OUTLET' && o.parentId === Number(form.company),
      )
      .map((o) => ({ value: o.id, label: o.companyNameEnglish }));
  }, [organizations, form.company]);

  // Employees are scoped to whichever org level is currently selected:
  // prefer the unit (most specific), fall back to the company, and if
  // neither is picked yet, show everyone so the field isn't empty.
  // Each option is labelled with the employee's name, code, and department.
  const employeeOptions = useMemo(() => {
    const scopeOrgId = form.unit
      ? Number(form.unit)
      : form.company
        ? Number(form.company)
        : null;
    const pool = scopeOrgId
      ? (employees ?? []).filter((e) => e.organizationId === scopeOrgId)
      : (employees ?? []);

    return pool.map((e) => {
      const code = e.employeeCode ?? e.code ?? '';
      const department =
        e.departmentName ?? e.department?.name ?? e.department ?? '';

      let label = e.fullName;
      if (code) label += ` — ${code}`;
      if (department) label += ` (${department})`;

      return { value: e.id, label };
    });
  }, [employees, form.unit, form.company]);

  const handleCompanyChange = (e) => {
    const newCompanyId = e.target.value;
    // Reset unit and assignedTo since they may no longer be valid for the new company.
    setForm((f) => ({ ...f, company: newCompanyId, unit: '', assignedTo: '' }));
  };

  const handleUnitChange = (e) => {
    const newUnitId = e.target.value;
    // Reset assignedTo since the employee pool changes with the unit.
    setForm((f) => ({ ...f, unit: newUnitId, assignedTo: '' }));
  };

  // Switching to a company/outlet assignment clears any employee already picked.
  useEffect(() => {
    if (assignmentType === 'company' && form.assignedTo) {
      setForm((f) => ({ ...f, assignedTo: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentType]);

  const availableStock =
    selectedAsset?.availableQuantity ?? selectedAsset?.availableStock ?? 0;
  const totalStock =
    selectedAsset?.totalQuantity ?? selectedAsset?.totalStock ?? 0;
  const qtyNum = Number(form.quantity) || 0;
  const remaining = Math.max(availableStock - qtyNum, 0);

  const assetCode =
    selectedAsset?.assetCode ??
    selectedAsset?.code ??
    (form.assetId ? `AST-${form.assetId}` : 'AST-00000');

  const resetForm = () => {
    setForm({
      assetId: '',
      assignedTo: '',
      company: '',
      unit: '',
      quantity: '1',
      assignmentDate: getTodayIso(),
      remarks: '',
    });
    setAssignmentType('individual');
  };

  const handleSaveAssignment = async () => {
    setSaveError('');

    if (!form.assetId) {
      setSaveError('Please select an asset.');
      return;
    }

    const companiesId = Number(form.unit || form.company) || 0;
    if (!companiesId) {
      setSaveError('Please select a company / unit.');
      return;
    }

    if (assignmentType === 'individual' && !form.assignedTo) {
      setSaveError('Please select who this asset is assigned to.');
      return;
    }

    const payload = {
      active: true,
      assetId: Number(form.assetId),
      assignToId: assignmentType === 'individual' ? Number(form.assignedTo) : 0,
      companiesId,
      quantity: qtyNum,
      assignmentDate: form.assignmentDate,
      remarks: form.remarks,
    };

    try {
      setSaving(true);
      await createAssignAsset(payload);
      resetForm();
    } catch (err) {
      console.error(err);
      setSaveError('Failed to save assignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-4 min-h-screen pb-8 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Assign Asset</h1>
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

      <SectionCard className="mt-6">
        <div className="px-6 py-6 space-y-6">
          {/* Asset search + summary */}
          <div className="space-y-4">
            <div>
              <Label required>Asset</Label>
              <Select
                value={form.assetId}
                onChange={(e) => set('assetId', e.target.value)}
                placeholder="Search by asset code or name"
                options={assetOptions}
                loading={loadingAssets}
              />
            </div>

            <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-5 py-5 space-y-4">
              {selectedAsset ? (
                <>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 mt-2">{assetCode}</p>
                      <p className="text-base font-bold text-gray-900">
                        {selectedAsset.itemName ?? 'Unnamed Asset'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-14 h-14 rounded-md border border-gray-200 bg-white flex items-center justify-center p-1.5">
                        <QRCode
                          value={assetCode}
                          size={256}
                          style={{ height: 'auto', width: '100%' }}
                          viewBox="0 0 256 256"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-blue-100">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Category
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-0.5">
                        {selectedAsset.categoryName ??
                          selectedAsset.category ??
                          '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Brand
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-0.5"></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Model
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-0.5">
                        {selectedAsset.model ?? '—'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  {loadingAssets
                    ? 'Loading assets…'
                    : 'Search and select an asset above to see its details.'}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <SubHeading icon={MapPin} title="Deployment Destination" />

            <div
              className={`grid grid-cols-2 gap-4 w-full ${
                assignmentType === 'individual'
                  ? 'sm:grid-cols-4'
                  : 'sm:grid-cols-3'
              }`}
            >
              <div className="w-full">
                <Label required>Assign To</Label>
                <Select
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  placeholder="Select assignment type"
                  options={ASSIGNMENT_TYPE_OPTIONS}
                />
              </div>
              <div className="w-full">
                <Label>Company</Label>
                <Select
                  value={form.company}
                  onChange={handleCompanyChange}
                  placeholder="Select company"
                  options={companyOptions}
                  loading={loadingOrgs}
                />
              </div>
              <div className="w-full">
                <Label>Unit / Outlet</Label>
                <Select
                  value={form.unit}
                  onChange={handleUnitChange}
                  placeholder={
                    form.company ? 'Select unit' : 'Select company first'
                  }
                  options={unitOptions}
                  disabled={!form.company}
                />
              </div>
              {assignmentType === 'individual' && (
                <div className="w-full">
                  <Label required>Assigned To</Label>
                  <Select
                    value={form.assignedTo}
                    onChange={(e) => set('assignedTo', e.target.value)}
                    placeholder="Select employee"
                    options={employeeOptions}
                    loading={loadingEmployees}
                  />
                </div>
              )}
            </div>
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
                      {availableStock}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Total Stock
                    </p>
                    <p className="text-sm font-bold text-gray-700">
                      {totalStock}
                    </p>
                  </div>
                </div>
              </div>

              <input
                type="number"
                min={0}
                max={availableStock || undefined}
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                className={`${inputCls} bg-white sm:w-56`}
              />

              <div className="flex justify-end">
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                  <PackageCheck className="w-3.5 h-3.5" />
                  Remaining: {remaining}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <SubHeading icon={FileText} title="Assignment Documentation" />

            <div>
              <Label>Assignment Date</Label>
              <div className="relative sm:w-56">
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
            onClick={handleSaveAssignment}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 hover:bg-[#073e77] transition cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
