import { useEffect, useState } from 'react';
import { X, Loader2, FileText } from 'lucide-react';
import { notify } from '@/utils/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  saveOrUpdateProposalType,
  updateProposalType,
} from '../../../services/apiServices';
import { getUserIdFromToken } from '@/utils/auth';

const ProposalTypeModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  zIndex = 'z-50',
}) => {
  const isEdit = Boolean(initialData?.id);
  const loggedInUserId = getUserIdFromToken() || 0;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          description: initialData.description || '',
          isActive: initialData.isActive !== false,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          isActive: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Proposal type name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const generatedCode =
        initialData?.code ||
        formData.name
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .slice(0, 50);

      const payload = {
        id: isEdit ? Number(initialData.id) : 0,
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        code: generatedCode,
        isActive: formData.isActive,
        userId: Number(initialData?.userId || loggedInUserId) || 0,
      };

      if (isEdit && initialData?.id) {
        try {
          await updateProposalType(Number(initialData.id), payload);
        } catch (err) {
          if (err?.response?.status === 404 || err?.response?.status === 405) {
            await saveOrUpdateProposalType(payload);
          } else {
            throw err;
          }
        }
      } else {
        await saveOrUpdateProposalType(payload);
      }

      notify.success(
        isEdit
          ? 'Proposal type updated successfully'
          : 'Proposal type added successfully'
      );
      onSuccess?.(payload);
      onClose();
    } catch (err) {
      console.error('Failed to save proposal type:', err);
      notify.error(err?.response?.data?.msg || err?.response?.data?.message || 'Failed to save proposal type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/40 backdrop-blur-xs p-4`}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#E5E7EB] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#00376C] flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isEdit ? 'Edit Proposal Type' : 'Add Proposal Type'}
              </h3>
              <p className="text-xs text-gray-500">
                {isEdit
                  ? 'Update proposal type details'
                  : 'Add a new proposal type configuration'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Proposal Type Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Wedding, Corporate, Birthday, Institutional"
                className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition ${errors.name
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[#C3C6D1] focus:border-[#084E92]'
                  }`}
              />
              {errors.name && (
                <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Enter description for this proposal type..."
                className="w-full p-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 focus:border-[#084E92] transition resize-none"
              />
            </div>

            {/* Status Field / Toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Status
              </label>
              <Select
                value={formData.isActive ? 'Active' : 'Inactive'}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: val === 'Active',
                  }))
                }
              >
                <SelectTrigger className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:ring-2 focus:ring-[#084E92]/20 focus:border-[#084E92]">
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
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-[#C3C6D1] rounded-xl hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-[#084E92] rounded-xl hover:bg-[#00376C] transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Update Proposal Type' : 'Save Proposal Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProposalTypeModal;
