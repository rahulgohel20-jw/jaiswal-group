'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Info, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getActiveCompany } from '@/services/apiServices';
import { extractList } from '../user/utils/Employeemappers';

// Root org id — everything else in the org tree hangs off this via parentId.
const MAIN_GROUP_ID = 1;

const AddDepartmentModal = ({ isOpen, onClose, onSave, initialData }) => {
  const isEditMode = Boolean(initialData);

  const [form, setForm] = useState({
    name: '',
    status: 'Active',
    description: '',
    companyId: '',
    outletId: '',
  });
  const [errors, setErrors] = useState({});

  // Full org tree — companies + units in one flat list, each with a parentId.
  // Fetched once whenever the modal opens; Company/Unit options are derived
  // from it on the frontend (same pattern as User Registration).
  const [allOrgs, setAllOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetchOrgs = async () => {
      setLoadingOrgs(true);
      try {
        const res = await getActiveCompany();
        if (!cancelled) setAllOrgs(extractList(res));
      } catch (err) {
        console.error(err);
        if (!cancelled) setAllOrgs([]);
      } finally {
        if (!cancelled) setLoadingOrgs(false);
      }
    };
    fetchOrgs();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Companies = orgs whose parent is the root MAIN_GROUP.
  const companies = useMemo(
    () =>
      allOrgs
        .filter((o) => String(o.parentId) === String(MAIN_GROUP_ID))
        .map((c) => ({ id: String(c.id), name: c.companyNameEnglish || c.name })),
    [allOrgs],
  );

  // Units = orgs whose parent is whichever company is currently selected.
  const outlets = useMemo(
    () =>
      form.companyId
        ? allOrgs
            .filter((o) => String(o.parentId) === String(form.companyId))
            .map((u) => ({ id: String(u.id), name: u.companyNameEnglish || u.name }))
        : [],
    [allOrgs, form.companyId],
  );

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: initialData?.name || '',
        description: initialData?.description || '',
        status: initialData?.status || 'Active',
        companyId: initialData?.companyId ? String(initialData.companyId) : '',
        outletId: initialData?.outletId ? String(initialData.outletId) : '',
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleCompanyChange = (value) => {
    setForm((f) => ({ ...f, companyId: value, outletId: '' }));
    setErrors((prev) => ({ ...prev, companyId: undefined, outletId: undefined }));
  };

  const handleUnitChange = (value) => {
    set('outletId', value);
  };

  if (!isOpen) return null;

  const resetForm = () =>
    setForm({ name: '', status: 'Active', description: '', companyId: '', outletId: '' });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Department name is required';
    if (!form.companyId) e.companyId = 'Company is required';
    // Unit is optional — if not selected, the department is added directly
    // under the company.
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Unit takes precedence when selected — department is registered under
    // the unit; otherwise falls back to the company itself.
    const payload = {
      departmentName: form.name,
      description: form.description,
      status: form.status,
      organizationId: form.outletId || form.companyId,
    };

    onSave?.(payload, { addAnother: false });
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    setErrors({});
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none text-primary">
                {isEditMode ? 'Edit Department' : 'Add Department'}
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                {isEditMode ? 'Update organization structure' : 'Configure organization structure'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0" aria-label="Close">
            <X className="h-5 w-5 cursor-pointer" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#737781] uppercase tracking-wide">
              Department Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Sales & Marketing"
              className="mt-1.5"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#737781] uppercase tracking-wide">
              Company <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.companyId}
              onValueChange={handleCompanyChange}
              disabled={loadingOrgs}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={loadingOrgs ? 'Loading...' : 'Select Company'} />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.companyId && <p className="text-xs text-red-500 mt-1">{errors.companyId}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#737781] uppercase tracking-wide">
              Unit
            </label>
            <Select
              value={form.outletId}
              onValueChange={handleUnitChange}
              disabled={!form.companyId || loadingOrgs}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue
                  placeholder={form.companyId ? 'Select Unit (optional)' : 'Select company first'}
                />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-gray-400 mt-1">
              Leave blank to add the department directly under the company.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#737781] uppercase tracking-wide">
              Description
            </label>
            <Textarea
              placeholder="Brief description of this department's function..."
              className="mt-1.5 resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#737781] uppercase tracking-wide">Status</label>
            <Select value={form.status} onValueChange={(value) => set('status', value)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-[#EFF4FF] border border-[#DDE7FF] rounded-lg p-3 flex gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-[#43474F] leading-relaxed">
              Departments are linked to employee roles and resource allocation. Deactivating a
              department may affect active workflows.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || !form.companyId}
            className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {isEditMode ? 'Update Department' : 'Save Department'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddDepartmentModal;