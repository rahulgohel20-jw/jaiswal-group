import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Info, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createAssetUnitLocation,
  updateAssetUnitLocation,
} from '@/services/apiServices';
import { notify, getApiErrorMessage } from '@/utils/toast';
import SearchableSelect from '@/utils/SearchableSelect';
import { useOrgScope } from '@/hooks/useOrgScope';

const emptyForm = {
  organizationId: '',
  locationName: '',
  status: 'Active',
};

const AssetUnitLocationModal = ({
  isOpen,
  onClose,
  onSuccess,
  editData = null,
  units: propUnits = [],
}) => {
  const { units: scopeUnits = [], loading: scopeLoading } = useOrgScope();

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditMode = Boolean(editData?.id);

  // Fallback to scopeUnits if propUnits is empty
  const rawUnits = propUnits && propUnits.length > 0 ? propUnits : scopeUnits;

  const unitOptions = useMemo(() => {
    return (rawUnits || [])
      .filter((u) => u && (u.id != null || u.unitId != null || u.outletId != null))
      .map((unit) => {
        const id = unit.id ?? unit.unitId ?? unit.outletId;
        const label =
          unit.name ||
          unit.unitName ||
          unit.outletName ||
          unit.companyNameEnglish ||
          unit.companyName ||
          `Unit #${id}`;
        return {
          value: String(id),
          label: String(label),
        };
      });
  }, [rawUnits]);

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      // Robust detection of active/inactive state across boolean or string variants
      let resolvedStatus = 'Active';

      if (editData.status && typeof editData.status === 'string') {
        resolvedStatus = editData.status.trim().toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
      } else if (editData.active !== undefined) {
        resolvedStatus = editData.active ? 'Active' : 'Inactive';
      } else if (editData.isActive !== undefined) {
        resolvedStatus = editData.isActive ? 'Active' : 'Inactive';
      }

      setForm({
        organizationId: String(
          editData.organizationId ?? editData.orgId ?? ''
        ),
        locationName: editData.locationName || editData.name || '',
        status: resolvedStatus,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleClose = () => {
    setForm(emptyForm);
    setError(null);
    onClose?.();
  };

  const handleSave = async () => {
    if (!form.organizationId) {
      setError('Please select a unit');
      return;
    }
    if (!form.locationName.trim()) {
      setError('Location name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        organizationId: Number(form.organizationId),
        locationName: form.locationName.trim(),
        active: form.status === 'Active',
        createdBy: editData?.createdBy || 0,
        updatedBy: 0,
      };

      if (isEditMode) {
        await updateAssetUnitLocation(editData.id, payload);
      } else {
        await createAssetUnitLocation(payload);
      }

      setForm(emptyForm);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(
        err,
        `Failed to ${isEditMode ? 'update' : 'create'} location. Please try again.`
      );
      setError(msg);
      notify.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
              <MapPin className="h-5 w-5 text-[#084E92]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold leading-none">
                {isEditMode ? 'Edit Location' : 'Add New Location'}
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                {isEditMode
                  ? 'Update this asset unit location.'
                  : 'Create a unit location to map assets accurately across facilities.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
          >
            <X className="h-5 w-5 cursor-pointer text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Unit Select */}
          <div>
            <label className="text-sm font-medium">
              Unit <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <SearchableSelect
                name="organizationId"
                value={form.organizationId}
                onChange={(e) => set('organizationId', e.target.value)}
                options={unitOptions}
                placeholder={scopeLoading ? 'Loading Units...' : 'Select Unit'}
              />
            </div>
          </div>

          {/* Location Name */}
          <div>
            <label className="text-sm font-medium">
              Location Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Enter location name (e.g. Ground Floor Store, Kitchen A)"
              className="mt-1"
              value={form.locationName}
              onChange={(e) => set('locationName', e.target.value)}
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select
              key={`status-select-${editData?.id || 'new'}-${form.status}`}
              value={form.status || 'Active'}
              onValueChange={(value) => set('status', value)}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select Status">
                  {form.status || 'Active'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.locationName.trim() || !form.organizationId || saving}
            className="bg-[#084E92] hover:bg-[#073e77] text-white flex items-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving
              ? 'Saving...'
              : isEditMode
              ? 'Update Location'
              : 'Save Location'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssetUnitLocationModal;