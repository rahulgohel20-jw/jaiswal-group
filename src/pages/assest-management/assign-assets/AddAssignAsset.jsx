import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  ChevronDown,
  FileText,
  MapPin,
  PackageCheck,
  Save,
  Search,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { getActiveCompany, getAllActiveEmployees } from '@/services/apiServices.js';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const selectCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 appearance-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

// Safely pulls the array out of a response, regardless of whether
// getActiveCompany/getAllActiveEmployees resolve to the raw axios
// response, an already-unwrapped `{ msg, data, success }` body, or
// a bare array. Confirmed shape from the API: { msg, data: [...], success }.
const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const Label = ({ children, required }) => (
  <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1.5">
    {children}
    {required && <span className="text-red-500">*</span>}
  </label>
);

const Select = ({ value, onChange, options, placeholder, disabled, loading }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      disabled={disabled || loading}
      className={selectCls}
    >
      <option value="" disabled>
        {loading ? 'Loading...' : placeholder}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
);

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const SubHeading = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-3.5 h-3.5 text-[#084E92]" />
    <h3 className="text-sm font-bold text-gray-800">{title}</h3>
  </div>
);

const AddAssignAsset = () => {
  const [form, setForm] = useState({
    assetSearch: 'AST-98212',
    assignedTo: '',
    company: '',
    unit: '',
    floorLevel: 'Ground Floor',
    quantity: '5',
    assignmentDate: '2023-11-24',
    purpose: 'Operational Deployment',
    remarks: '',
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // ---- Dynamic data: organizations (companies + outlets) and employees ----
  const [organizations, setOrganizations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadOrganizations = async () => {
      try {
        setLoadingOrgs(true);
        const res = await getActiveCompany();
        if (!cancelled) setOrganizations(extractArray(res));
      } catch (err) {
        if (!cancelled) setFetchError('Failed to load companies.');
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
        if (!cancelled) setFetchError((prev) => prev || 'Failed to load employees.');
        console.error(err);
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    };

    loadOrganizations();
    loadEmployees();

    return () => {
      cancelled = true;
    };
  }, []);

  // "Company" = SUB_COMPANY orgs.
  const companyOptions = useMemo(
    () =>
      (organizations ?? [])
        .filter((o) => o.orgType === 'SUB_COMPANY')
        .map((o) => ({ value: o.id, label: o.companyNameEnglish })),
    [organizations]
  );

  // "Unit" = OUTLET orgs whose parentId matches the selected company.
  const unitOptions = useMemo(() => {
    if (!form.company) return [];
    return (organizations ?? [])
      .filter((o) => o.orgType === 'OUTLET' && o.parentId === Number(form.company))
      .map((o) => ({ value: o.id, label: o.companyNameEnglish }));
  }, [organizations, form.company]);

  const selectedUnit = (organizations ?? []).find((o) => o.id === Number(form.unit));

  // Employees are scoped to whichever org level is currently selected:
  // prefer the unit (most specific), fall back to the company, and if
  // neither is picked yet, show everyone so the field isn't empty.
  const employeeOptions = useMemo(() => {
    const scopeOrgId = form.unit ? Number(form.unit) : form.company ? Number(form.company) : null;
    const pool = scopeOrgId
      ? (employees ?? []).filter((e) => e.organizationId === scopeOrgId)
      : employees ?? [];
    return pool.map((e) => ({
      value: e.id,
      label: e.designation ? `${e.fullName} — ${e.designation}` : e.fullName,
    }));
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

  const availableStock = 20;
  const totalStock = 20;
  const qtyNum = Number(form.quantity) || 0;
  const remaining = Math.max(availableStock - qtyNum, 0);

  const assetCode = form.assetSearch?.trim() || 'AST-00000';

  const resetForm = () =>
    setForm({
      assetSearch: '',
      assignedTo: '',
      company: '',
      unit: '',
      floorLevel: '',
      quantity: '',
      assignmentDate: '',
      purpose: '',
      remarks: '',
    });

  return (
    <div className="mx-4 min-h-screen pb-8 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">Assign Asset</h1>
          <p className="text-[#43474F] mt-1">Configure deployment parameters for enterprise inventory.</p>
        </div>
      </div>

      {fetchError && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
          {fetchError}
        </div>
      )}

      <SectionCard className="mt-6">
        <div className="px-6 py-6 space-y-6">
          {/* Asset summary */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-5 py-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs text-gray-400 mt-2">{form.assetSearch}</p>
                <p className="text-base font-bold text-gray-900">Commercial Oven XL-500</p>
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
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Category</p>
                <p className="text-sm font-semibold text-gray-700 mt-0.5">Kitchen Equipment</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Brand</p>
                <p className="text-sm font-semibold text-gray-700 mt-0.5">MasterChef Pro</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Model</p>
                <p className="text-sm font-semibold text-gray-700 mt-0.5">MC-XL500-2024</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <SubHeading icon={MapPin} title="Deployment Destination" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div>
                <Label>Asset Search</Label>
                <div className="relative w-full">
                  <input
                    value={form.assetSearch}
                    onChange={(e) => set('assetSearch', e.target.value)}
                    className={`${inputCls} pr-9`}
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
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
                  placeholder={form.company ? 'Select unit' : 'Select company first'}
                  options={unitOptions}
                  disabled={!form.company}
                />
              </div>
              <div className="w-full">
                <Label>Assigned To</Label>
                <Select
                  value={form.assignedTo}
                  onChange={(e) => set('assignedTo', e.target.value)}
                  placeholder="Select employee"
                  options={employeeOptions}
                  loading={loadingEmployees}
                />
              </div>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">City</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">
                  {selectedUnit?.cityName ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">State</p>
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
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-5 py-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-bold text-gray-800">Quantity Distribution</p>
                <div className="flex items-center gap-5 text-right">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Available</p>
                    <p className="text-sm font-bold text-[#084E92]">{availableStock}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total Stock</p>
                    <p className="text-sm font-bold text-gray-700">{totalStock}</p>
                  </div>
                </div>
              </div>

              <input
                type="number"
                min={0}
                max={availableStock}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Assignment Date</Label>
                <div className="relative">
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
                <Label>Purpose of Assignment</Label>
                <Select
                  value={form.purpose}
                  onChange={(e) => set('purpose', e.target.value)}
                  placeholder="Select purpose"
                  options={[
                    { value: 'Operational Deployment', label: 'Operational Deployment' },
                    { value: 'Event / Seasonal Use', label: 'Event / Seasonal Use' },
                    { value: 'Replacement', label: 'Replacement' },
                    { value: 'Trial / Evaluation', label: 'Trial / Evaluation' },
                  ]}
                />
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 hover:bg-[#073e77] transition cursor-pointer whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            Save Assignment
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAssignAsset;