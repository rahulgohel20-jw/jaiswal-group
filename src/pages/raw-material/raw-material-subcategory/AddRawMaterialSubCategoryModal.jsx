'use client';

import React, { useEffect, useState } from 'react';
import { Layers, Save, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { notify, getApiErrorMessage } from '@/utils/toast';
import { getUserIdFromToken } from '@/utils/auth';

import {
    getAllRawMaterialCategory,
} from '@/services/apiServices';
import SearchableSelect from '../../../utils/SearchableSelect';
import {  saveOrUpdateRawMaterialSubCategory } from '../../../services/apiServices';


const emptyForm = {
    nameEnglish: '',
    rawMaterialCatId: '',
};

const AddRawMaterialSubCategoryModal = ({
    isOpen,
    onClose,
    onSaved,
    initialData,
}) => {
    const [form, setForm] = useState(emptyForm);

    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [errors, setErrors] = useState({});

    const isEditMode = Boolean(initialData?.id);


    useEffect(() => {
        if (!isOpen) return;

        const fetchCategories = async () => {
            setLoadingCategories(true);

            try {
                const res = await getAllRawMaterialCategory();

                const raw =
                    res?.data?.data?.['Raw Material Category Details'] ??
                    res?.data?.data ??
                    [];

                setCategories(
                    Array.isArray(raw)
                        ? raw
                            .filter(
                                (category) =>
                                    category?.id &&
                                    category?.nameEnglish &&
                                    category?.isActive !== false
                            )
                            .map((category) => ({
                                value: category.id,
                                label: category.nameEnglish,
                            }))
                        : []
                );
            } catch (err) {
                console.error('Failed to fetch raw material categories:', err);
                setCategories([]);
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchCategories();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        if (initialData) {

            const categoryId =
                initialData?.categoryId ??
                initialData?.rawMaterialCategory?.id ??
                '';

            setForm({
                nameEnglish: initialData?.nameEnglish || '',
                rawMaterialCatId:
                    categoryId !== null && categoryId !== undefined
                        ? Number(categoryId)
                        : '',
            });
        } else {
            setForm(emptyForm);
        }

        setErrors({});
        setError(null);
    }, [isOpen, initialData]);


    const set = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));

        setErrors((prev) => ({
            ...prev,
            [key]: '',
        }));
        setError(null);
    };

    if (!isOpen) return null;

    const handleClose = () => {
        setForm(emptyForm);
        setErrors({});
        setError(null);
        onClose?.();
    };

    const validate = () => {
        const newErrors = {};

        if (!form.nameEnglish.trim()) {
            newErrors.nameEnglish = 'Subcategory name is required';
        }

        if (!form.rawMaterialCatId) {
            newErrors.rawMaterialCatId = 'Category is required';
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

   const save = async () => {
        const payload = {
            nameEnglish: form.nameEnglish.trim(),
            categoryId: form.rawMaterialCatId,
            isActive: true,
            ...(isEditMode && { id: initialData.id }),
        };

        await saveOrUpdateRawMaterialSubCategory(payload);
    };

    const handleSave = async () => {
        if (!validate()) {
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await save();

            setForm(emptyForm);
            setErrors({});

            onSaved?.();
            onClose?.();
        } catch (err) {
            console.error('Save subcategory error:', err);
            const message = getApiErrorMessage(
                err,
                `Failed to ${isEditMode ? 'update' : 'create'} material subcategory. Please try again.`,
            );
            setError(message);
            notify.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-4 border-b shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
                            <Layers className="h-5 w-5" />
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold leading-none">
                                {isEditMode
                                    ? 'Edit Raw Material Subcategory'
                                    : 'Add Raw Material Subcategory'}
                            </h3>

                            <p className="text-xs text-gray-500 mt-2">
                                {isEditMode
                                    ? 'Update this Material Subcategory.'
                                    : 'Configure a new Material Subcategory.'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        disabled={saving}
                        className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
                    >
                        <X className="h-5 w-5 cursor-pointer" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4">

                    {/* Backend Error */}
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">

                        {/* Subcategory Name */}
                        <div>
                            <Label>
                                Subcategory Name{' '}
                                <span className="text-red-500">*</span>
                            </Label>

                            <Input
                                placeholder="e.g. Vegetables"
                                className="mt-1"
                                value={form.nameEnglish}
                                onChange={(e) =>
                                    set('nameEnglish', e.target.value)
                                }
                                disabled={saving}
                            />

                            {errors.nameEnglish && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.nameEnglish}
                                </p>
                            )}
                        </div>

                        {/* Category */}
                        <div>
                            <Label>
                                Category <span className="text-red-500">*</span>
                            </Label>

                            <div className="[&_input]:h-9! mt-1">
                                <SearchableSelect
                                    name="category"
                                    value={form.rawMaterialCatId}
                                    onChange={(e) => {
                                        set('rawMaterialCatId', e.target.value);
                                    }}
                                    placeholder={
                                        loadingCategories
                                            ? 'Loading categories...'
                                            : 'Select Category'
                                    }
                                    disabled={loadingCategories || saving}
                                    options={categories}
                                />
                            </div>

                            {errors.rawMaterialCatId && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.rawMaterialCatId}
                                </p>
                            )}
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50 shrink-0">

                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={saving}
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary hover:bg-[#073e77] text-white flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />

                        {saving
                            ? 'Saving...'
                            : isEditMode
                                ? 'Update Subcategory'
                                : 'Save Subcategory'}
                    </Button>

                </div>
            </div>
        </div>
    );
};

export default AddRawMaterialSubCategoryModal;