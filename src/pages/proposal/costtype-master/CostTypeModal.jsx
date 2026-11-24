import  { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { notify } from '@/utils/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { saveOrUpdateProposalCostType } from '../../../services/apiServices';

const CostTypeModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const isEdit = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    costName: '',
    sequence: 0,
    status: 'Active',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        costName: initialData.costName || '',
        sequence: initialData.sequence != null ? initialData.sequence : 0,
        status: initialData.isActive !== false ? 'Active' : 'Inactive',
      });
    } else {
      setFormData({
        costName: '',
        sequence: 0,
        status: 'Active',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const err = {};
    if (!formData.costName.trim()) {
      err.costName = 'Cost Name is required';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        id: isEdit ? Number(initialData.id) : 0,
        costName: formData.costName.trim(),
        sequence: Number(formData.sequence) || 0,
        isActive: formData.status === 'Active',
      };

      await saveOrUpdateProposalCostType(payload);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save other cost:', err);
      notify.error(err?.response?.data?.msg || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">
            {isEdit ? 'Edit Cost Type' : 'Add Cost Type'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Cost Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Cost Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.costName}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, costName: e.target.value }));
                if (errors.costName) setErrors((prev) => ({ ...prev, costName: '' }));
              }}
              placeholder="Enter cost name"
              className={`w-full h-10 px-3 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition ${
                errors.costName
                  ? 'border-red-500'
                  : 'border-[#C3C6D1] focus:border-[#084E92]'
              }`}
            />
            {errors.costName && (
              <p className="text-[11px] text-red-500 mt-1">{errors.costName}</p>
            )}
          </div>



          {/* Status Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Status <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.status}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
            >
              <SelectTrigger className="w-full h-10 border-[#C3C6D1] rounded-xl bg-white text-xs">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#00376C] rounded-xl transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {isEdit ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CostTypeModal;