import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Users } from 'lucide-react';
import { notify } from '@/utils/toast';
import SearchableSelect from '../../../utils/SearchableSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  saveOrUpdateManpower,
  getAllStates,
} from '../../../services/apiServices';

const extractArray = (res) => {
  if (!res) return [];
  const raw = res?.data?.data ?? res?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.content)) return raw.content;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const cleanStateName = (name) => {
  if (!name) return '';
  return name.replace(/\s*\((Zone\s*[A-Za-z0-9]+)\)/gi, '').trim();
};

const ManPowerModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  currentOrgId,
  stateOptions: externalStateOptions = [],
}) => {
  const isEdit = Boolean(initialData?.id);
  const orgId = Number(initialData?.organizationId || currentOrgId || 18);

  const [loading, setLoading] = useState(false);
  const [internalStates, setInternalStates] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    basicSalary: '',
    stateId: '',
    status: 'Active',
  });

  const [errors, setErrors] = useState({});

  // Fallback state loader if stateOptions aren't provided by the parent
  useEffect(() => {
    if (!isOpen || (externalStateOptions && externalStateOptions.length > 0)) return;

    const fetchStates = async () => {
      try {
        const res = await getAllStates();
        setInternalStates(extractArray(res));
      } catch (err) {
        console.error('Failed to load states:', err);
      }
    };

    fetchStates();
  }, [isOpen, externalStateOptions]);

  const stateOptions = useMemo(() => {
    const sourceList = externalStateOptions.length > 0 ? externalStateOptions : internalStates;
    return sourceList.map((st) => ({
      value: String(st.id ?? st.value),
      label: cleanStateName(st.name || st.stateName || st.label || `State #${st.id ?? st.value}`),
    }));
  }, [externalStateOptions, internalStates]);

  // Sync data on open
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          basicSalary:
            initialData.basicSalary !== undefined && initialData.basicSalary !== null
              ? String(initialData.basicSalary)
              : '',
          stateId: initialData.stateId ? String(initialData.stateId) : '',
          status: initialData.isActive !== false && initialData.status !== 'Inactive' ? 'Active' : 'Inactive',
        });
      } else {
        setFormData({
          name: '',
          basicSalary: '',
          stateId: '',
          status: 'Active',
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (formData.basicSalary === '' || isNaN(Number(formData.basicSalary))) {
      newErrors.basicSalary = 'Enter a valid basic salary';
    } else if (Number(formData.basicSalary) < 0) {
      newErrors.basicSalary = 'Salary cannot be negative';
    }
    if (!formData.stateId) {
      newErrors.stateId = 'Please select a state';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'basicSalary' && value !== '' && Number(value) < 0) {
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...(initialData?.raw || {}),
        id: initialData?.id ? Number(initialData.id) : 0,
        name: formData.name.trim(),
        basicSalary: Number(formData.basicSalary),
        stateId: Number(formData.stateId),
        isActive: formData.status === 'Active',
        organizationId: orgId,
      };

      await saveOrUpdateManpower(payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to save manpower:', err);
      notify.error(err?.response?.data?.msg || 'Failed to save manpower');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#E5E7EB] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#00376C] flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isEdit ? 'Edit Manpower' : 'Add Manpower'}
              </h3>
              <p className="text-xs text-gray-500">
                {isEdit ? 'Update manpower details and salary' : 'Add a new manpower configuration'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Head Chef, Line Cook, Kitchen Helper"
                className={`w-full h-10 px-3.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition ${
                  errors.name
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Basic Salary */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Basic Salary (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="basicSalary"
                min="0"
                step="0.01"
                value={formData.basicSalary}
                onKeyDown={(e) => {
                  if (['-', '+', 'e', 'E'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={handleChange}
                placeholder="e.g. 25000"
                className={`w-full h-10 px-3.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition ${
                  errors.basicSalary
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
              />
              {errors.basicSalary && (
                <p className="text-xs text-red-500 mt-1">{errors.basicSalary}</p>
              )}
            </div>

            {/* State Searchable Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                State <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                name="stateId"
                value={formData.stateId}
                onChange={(e) => {
                  const val = e?.target?.value ?? e?.value ?? '';
                  setFormData((prev) => ({ ...prev, stateId: val }));
                  if (errors.stateId) setErrors((prev) => ({ ...prev, stateId: '' }));
                }}
                options={stateOptions}
                placeholder="Select State"
                isClearable={false}
              />
              {errors.stateId && (
                <p className="text-xs text-red-500 mt-1">{errors.stateId}</p>
              )}
            </div>

            {/* Status Dropdown Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Status <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
              >
                <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl bg-white text-sm">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-[#F8FAFC]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-[#C3C6D1] rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-[#084E92] rounded-xl hover:bg-[#00376C] transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Update Manpower' : 'Save Manpower'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManPowerModal;