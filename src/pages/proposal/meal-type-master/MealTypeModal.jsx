import React, { useEffect, useState } from 'react';
import { X, Loader2, UtensilsCrossed } from 'lucide-react';
import { notify } from '@/utils/toast';
import { saveOrUpdateMealType } from '../../../services/apiServices';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { getOrgIdFromToken } from '@/utils/auth';
import { getAuth } from '@/auth/lib/helpers';

const getLoggedInOrgId = () => {
    const tokenOrgId = getOrgIdFromToken();
    if (tokenOrgId && !isNaN(Number(tokenOrgId)) && Number(tokenOrgId) > 0) {
        return Number(tokenOrgId);
    }
    const storedAuth = getAuth();
    const authOrg = storedAuth?.organizationId || storedAuth?.data?.organizationId || storedAuth?.accessibleScope?.assignments?.[0]?.organizationId;
    if (authOrg && !isNaN(Number(authOrg)) && Number(authOrg) > 0) {
        return Number(authOrg);
    }
    const local = localStorage.getItem('organizationId') || localStorage.getItem('selectedCompanyId');
    if (local && !isNaN(Number(local)) && Number(local) > 0) {
        return Number(local);
    }
    return 18;
};

const MealTypeModal = ({
    isOpen,
    onClose,
    onSuccess,
    initialData = null,
    zIndex = 'z-50',
}) => {
    const isEdit = Boolean(initialData?.id);
    const loggedInOrgId = getLoggedInOrgId();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        isActive: true,
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name || initialData.mealTypeName || '',
                    isActive: initialData.isActive !== false,
                });
            } else {
                setFormData({
                    name: '',
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
            newErrors.name = 'Meal type name is required';
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
            const orgId = Number(initialData?.organizationId || loggedInOrgId);
            const payload = {
                ...(initialData?.raw || initialData || {}),
                id: initialData?.id || undefined,
                name: formData.name.trim(),
                sequence: initialData?.sequence ?? 0,
                isActive: formData.isActive,
                organizationId: orgId,
            };

            const res = await saveOrUpdateMealType(payload);
            const savedData = res?.data?.data ?? res?.data;
            onSuccess?.(savedData || payload);
            onClose();
        } catch (err) {
            console.error('Failed to save meal type:', err);
            notify.error(err?.response?.data?.msg || 'Failed to save meal type');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/40 backdrop-blur-xs p-4`}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#E5E7EB] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#00376C] flex items-center justify-center shrink-0">
                            <UtensilsCrossed size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">
                                {isEdit ? 'Edit Meal Type' : 'Add Meal Type'}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {isEdit
                                    ? 'Update meal type details'
                                    : 'Add a new meal type'}
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
                        {/* Name Field */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Meal Type Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Breakfast, Lunch, Dinner"
                                className={`w-full h-10 px-3.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 transition ${errors.name
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-[#C3C6D1] focus:border-[#084E92]'
                                    }`}
                            />
                            {errors.name && (
                                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Status
                            </label>
                            <Select
                                value={formData.isActive ? 'true' : 'false'}
                                onValueChange={(val) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        isActive: val === 'true',
                                    }))
                                }
                            >
                                <SelectTrigger className="w-full h-10 px-3.5 text-sm rounded-xl border border-[#C3C6D1] bg-white focus:ring-2 focus:ring-[#084E92]/20 focus:border-[#084E92]">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Active</SelectItem>
                                    <SelectItem value="false">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="block text-xs text-gray-500 mt-1">
                                Set whether this meal type is active or inactive
                            </span>
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
                            {isEdit ? 'Update Meal Type' : 'Save Meal Type'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MealTypeModal;