'use client';

import React, { useState, useEffect } from 'react';
import { Ruler, Save, X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { notify } from '@/utils/toast';
import { addUnitMaster, getAllRawMaterialUnits, updateUnitMaster } from '../../../services/apiServices';
import { getUserIdFromToken } from "../../../utils/auth";
// Replace these with your actual API service calls


const emptyRange = () => ({ minValue: '', maxValue: '', roundOffValue: '' });

const emptyForm = {
    name: '',
    symbol: '',
    isParentUnit: false,
    decimalLimit: undefined,
    parentUnitId: "",
    equivalent: '',
    rangeType: 'Range', // "Range" | "PrecisionRange" | "StepWiseRange"
    ranges: [emptyRange()],
};

const rangeTypeLabel = {
    Range: 'Range',
    PrecisionRange: 'Precision Range',
    StepWiseRange: 'Step Wise Range',
};

const AddRawMaterialUnit = ({ isOpen, onClose, onSaved, initialData }) => {
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [parentUnitOptions, setParentUnitOptions] = useState([]);
    const [loadingParents, setLoadingParents] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const isEditMode = Boolean(initialData?.id);

    //   Fetch units for the "Parent Unit" dropdown
    useEffect(() => {
        if (!isOpen) return;
        const fetchParents = async () => {
            setLoadingParents(true);
            try {
                const res = await getAllRawMaterialUnits();
                const raw = res?.data?.data['Unit Details'] ?? [];
                setParentUnitOptions(
                    raw
                        .filter((u) => u.isParentUnit && u.id !== initialData?.id)
                        .map((u) => ({
                            value: String(u.id),
                            label: u.nameEnglish,
                        }))
                );
            } catch (err) {
                console.error('Failed to fetch parent units:', err);
                setParentUnitOptions([]);
            } finally {
                setLoadingParents(false);
            }
        };
        fetchParents();
    }, [isOpen, initialData]);

    // Populate form on edit / reset on add
    useEffect(() => {
        if (!isOpen) return;

        if (initialData) {
            setForm({
                name: initialData.nameEnglish || "",
                symbol: initialData.symbolEnglish || "",
                isParentUnit: initialData.isParentUnit,
                decimalLimit: Number(initialData.decimalLimit),
                parentUnitId: initialData.parentUnit?.id
                    ? String(initialData.parentUnit.id)
                    : "",
                equivalent: initialData.equivalentValue ?? "",
                rangeType:
                    initialData.rangeType === "RANGE"
                        ? "Range"
                        : initialData.rangeType === "PRECISION"
                            ? "PrecisionRange"
                            : "StepWiseRange",
                ranges:
                    initialData.ranges?.length
                        ? initialData.ranges
                        : [emptyRange()],
                stepWiseRange: initialData.stepValue ?? "",
            });
        } else {
            setForm(emptyForm);
        }

        setError(null);
        setFieldErrors({});
    }, [isOpen, initialData]);

    const set = (key, value) =>
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));

    const setRangeField = (index, key, value) => {
        setForm((prev) => {
            const next = [...prev.ranges];
            next[index] = { ...next[index], [key]: value };
            return { ...prev, ranges: next };
        });
    };

    const addRangeRow = () => {
        setForm((prev) => ({ ...prev, ranges: [...prev.ranges, emptyRange()] }));
    };

    const removeRangeRow = (index) => {
        setForm((prev) => ({
            ...prev,
            ranges: prev.ranges.filter((_, i) => i !== index),
        }));
    };

    if (!isOpen) return null;

    const handleClose = () => {
        setForm(emptyForm);
        setError(null);
        onClose?.();
    };

    const validate = () => {
        const errors = {};

        if (!form.name.trim()) return { message: 'Name is required.', fieldErrors: errors };
        if (!form.symbol.trim()) return { message: 'Symbol is required.', fieldErrors: errors };
        if (form.decimalLimit === undefined || form.decimalLimit === '')
            return {
                message: 'Decimal Limit For Quantity is required.',
                fieldErrors: errors,
            };

        if (form.rangeType === 'StepWiseRange') {
            if (!form.stepWiseRange.toString().trim()) {
                errors.stepWiseRange = 'Step Wise Range is required.';
                return { message: null, fieldErrors: errors };
            }
        } else {
            // Range / PrecisionRange both use the Min/Max/Round Off table
            const hasIncompleteRow = form.ranges.some(
                (r) => r.minValue === '' || r.maxValue === '' || r.roundOffValue === ''
            );
            if (hasIncompleteRow) {
                return {
                    message: 'Minimum, Maximum and Round Off values are required for every range row.',
                    fieldErrors: errors,
                };
            }
        }

        return null;
    };

    const userId = getUserIdFromToken();

    const buildPayload = () => ({
        decimalLimit: Number(form.decimalLimit),

        equivalentValue: Number(form.equivalent || 0),
        isParentUnit: form.isParentUnit,
        nameEnglish: form.name,
        nameGujarati: "",
        nameHindi: "",

        parent_unit_id: form.isParentUnit
            ? 0
            : Number(form.parentUnitId || 0),
        rangeType:
            form.rangeType === "Range"
                ? "RANGE"
                : form.rangeType === "PrecisionRange"
                    ? "PRECISION"
                    : "STEPWISE",
        ranges:
            form.rangeType === "StepWiseRange"
                ? []
                : form.ranges.map((item) => ({
                    minValue: Number(item.minValue),
                    maxValue: Number(item.maxValue),
                    roundOffValue: Number(item.roundOffValue),
                })),
        stepValue:
            form.rangeType === "StepWiseRange"
                ? Number(form.stepWiseRange || 0)
                : 0,
        symbolEnglish: form.symbol,
        symbolGujarati: "",
        symbolHindi: "",

        userId: userId,
    });

    const save = async () => {
        const payload = buildPayload();

        if (isEditMode) {
            await updateUnitMaster(initialData.id, payload);
            // notify.success("Unit Updated Successfully");
        } else {
            await addUnitMaster(payload);

            // notify.success("Unit Created Successfully");
        }
    };

    const handleSave = async () => {
        const validationResult = validate();
        if (validationResult) {
            setError(validationResult.message);
            setFieldErrors(validationResult.fieldErrors || {});
            return;
        }

        setSaving(true);
        setError(null);
        setFieldErrors({});

        try {
            await save();
            setForm(emptyForm);
            onSaved?.();
            onClose?.();
        } catch (err) {
            console.error(err);
            const backendMsg = err?.response?.data?.msg || err?.response?.data?.message;
            const msg =
                backendMsg || `Failed to ${isEditMode ? 'update' : 'create'} unit. Please try again.`;
            setError(msg);
            notify.error(msg);
        } finally {
            setSaving(false);
        }
    };


    const rangeTypeLabel = {
        Range: 'Range',
        PrecisionRange: 'Precision Range',
        StepWiseRange: 'Step Wise Range',
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-4 border-b shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-primary shrink-0">
                            <Ruler className="h-5 w-5" />
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold leading-none">
                                {isEditMode ? 'Edit Unit' : 'Create New Unit'}
                            </h3>

                            <p className="text-xs text-gray-500 mt-2">
                                {isEditMode ? 'Update this measurement unit.' : 'Configure a new measurement unit.'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
                    >
                        <X className="h-5 w-5 cursor-pointer" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1 space-y-5">
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            {error}
                        </div>
                    )}

                    {/* Name / Symbol - English only */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="Name"
                                className="mt-1"
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">
                                Symbol <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="Symbol"
                                className="mt-1"
                                value={form.symbol}
                                onChange={(e) => set('symbol', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Is Parent Unit */}
                    <div className="flex items-center gap-3">
                        <label className="relative inline-flex cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.isParentUnit}
                                onChange={(e) => set('isParentUnit', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div
                                className="
                      w-11 h-6
                      bg-gray-300
                      rounded-full
                      peer
                      peer-checked:bg-[#084E92]
                      after:absolute
                      after:top-0.5
                      after:left-0.5
                      after:h-5
                      after:w-5
                      after:bg-white
                      after:rounded-full
                      after:transition-all
                      peer-checked:after:translate-x-full
                    "
                            />
                        </label>
                        <span className="text-sm font-medium">Is Parent Unit</span>
                    </div>

                    {/* Decimal Limit / Parent Unit / Equivalent */}
                    {/* Parent Unit and Equivalent only apply to a unit that is NOT itself a parent unit */}
                    <div className={`grid gap-4 ${form.isParentUnit ? 'grid-cols-1' : 'grid-cols-3'}`}>
                        <div className={form.isParentUnit ? 'max-w-xs' : ''}>
                            <label className="text-sm font-medium">
                                Decimal Limit For Quantity <span className="text-red-500">*</span>
                            </label>
                            <Select
                                value={
                                    form.decimalLimit !== undefined &&
                                        form.decimalLimit !== null
                                        ? String(form.decimalLimit)
                                        : ""
                                }
                                onValueChange={(value) => set('decimalLimit', Number(value))}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="-1">-1</SelectItem>
                                    <SelectItem value="0">0</SelectItem>
                                    <SelectItem value="1">1</SelectItem>
                                    <SelectItem value="2">2</SelectItem>
                                </SelectContent>

                            </Select>
                        </div>

                        {!form.isParentUnit && (
                            <>
                                <div>
                                    <label className="text-sm font-medium">Parent Unit</label>
                                    <Select
                                        value={String(form.parentUnitId || "")}
                                        onValueChange={(value) => set('parentUnitId', value)}
                                        disabled={loadingParents}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder={loadingParents ? 'Loading...' : 'Select'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {parentUnitOptions.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Equivalent</label>
                                    <Input
                                        placeholder="Enter Equivalent"
                                        className="mt-1"
                                        value={form.equivalent}
                                        onChange={(e) => set('equivalent', e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Range type selector */}
                    <div className="flex items-center gap-6">
                        {Object.entries(rangeTypeLabel).map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                    type="radio"
                                    name="rangeType"
                                    value={value}
                                    checked={form.rangeType === value}
                                    onChange={(e) => set('rangeType', e.target.value)}
                                    className="accent-[#084E92]"
                                />
                                {label}
                            </label>
                        ))}
                    </div>

                    {form.rangeType === 'Range' && (
                        <div className="bg-[#EFF4FF] border border-[#C3C6D1] rounded-lg p-4 text-sm text-[#43474F]">
                            <p>
                                This range checks the full measurement value. If it falls between Minimum and
                                Maximum, it is rounded to the Round Value.
                            </p>
                            <p className="mt-2">
                                <span className="font-semibold">Example:</span> If the measurement value is 150,
                                and the minimum value is 100, and the maximum value is 200, and the round off
                                value is 200, then the measurement value will be rounded to 200.
                            </p>
                        </div>
                    )}

                    {form.rangeType === 'PrecisionRange' && (
                        <div className="bg-[#EFF4FF] border border-[#C3C6D1] rounded-lg p-4 text-sm text-[#43474F]">
                            <p>
                                This range works on the child unit (decimal part) of the measurement. If it falls
                                between Minimum and Maximum, it is rounded to the Round Value.
                            </p>
                            <p className="mt-2">
                                <span className="font-semibold">Example:</span> If the measurement value is
                                1.150, and the minimum value is 100, and the maximum value is 200, and the round
                                off value is 200, then the measurement value will be rounded to 1.200.
                            </p>
                        </div>
                    )}

                    {form.rangeType === 'StepWiseRange' && (
                        <div className="bg-[#EFF4FF] border border-[#C3C6D1] rounded-lg p-4 text-sm text-[#43474F] space-y-3">
                            <p>
                                This range adjusts values in fixed steps based on the defined step size. Values
                                are rounded to the nearest step.
                            </p>
                            <p>
                                <span className="font-semibold">Example:</span> If the step size is 0.5, then
                                values from 0.1–0.5 round to 0.5, and 0.6–1.0 round to 1.0.
                            </p>

                            <div>
                                <label className="text-sm font-medium text-[#43474F]">
                                    Step Wise Range <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="number"
                                    placeholder="Enter Step Wise Range"
                                    className="mt-1 bg-white"
                                    value={form.stepWiseRange}
                                    onChange={(e) => {
                                        set('stepWiseRange', e.target.value);
                                        setFieldErrors((prev) => ({ ...prev, stepWiseRange: undefined }));
                                    }}
                                />
                                {fieldErrors.stepWiseRange && (
                                    <p className="text-red-500 text-xs mt-1">{fieldErrors.stepWiseRange}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Range / Precision Range share the same Min/Max/Round Off table */}
                    {(form.rangeType === 'Range' || form.rangeType === 'PrecisionRange') && (
                        <>
                            <div className="border border-[#C3C6D1] rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#F7F8FA] text-[#43474F]">
                                        <tr>
                                            <th className="text-left font-semibold px-3 py-2 w-10">#</th>
                                            <th className="text-left font-semibold px-3 py-2">Minimum Value*</th>
                                            <th className="text-left font-semibold px-3 py-2">Maximum Value*</th>
                                            <th className="text-left font-semibold px-3 py-2">Round Off Value*</th>
                                            <th className="text-left font-semibold px-3 py-2 w-16">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.ranges.map((range, index) => (
                                            <tr key={index} className="border-t border-[#C3C6D1]">
                                                <td className="px-3 py-2">{index + 1}</td>
                                                <td className="px-3 py-2">
                                                    <Input
                                                        type="number"
                                                        value={range.minValue}
                                                        onChange={(e) => setRangeField(index, 'minValue', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Input
                                                        type="number"
                                                        value={range.maxValue}
                                                        onChange={(e) => setRangeField(index, 'maxValue', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Input
                                                        type="number"
                                                        value={range.roundOffValue}
                                                        onChange={(e) =>
                                                            setRangeField(index, 'roundOffValue', e.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Trash2
                                                        size={18}
                                                        className="text-red-500 cursor-pointer hover:text-red-700"
                                                        onClick={() => removeRangeRow(index)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="border-none bg-[#084E92] hover:bg-[#073e77] text-white flex items-center gap-2 w-fit"
                                onClick={addRangeRow}
                            >
                                <Plus className="h-4 w-4" />
                                Add Range
                            </Button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 shrink-0">
                    <Button
                        variant="outline"
                        className="border-red-400 text-red-500 hover:bg-red-50"
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
                        {saving ? 'Saving...' : isEditMode ? 'Update Unit' : 'Save Unit'}
                    </Button>
                </div>
            </div>
        </div>
    );
};


export default AddRawMaterialUnit
