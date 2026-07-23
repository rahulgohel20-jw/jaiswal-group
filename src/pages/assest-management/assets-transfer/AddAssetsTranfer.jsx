import { ChevronRight, ScanLine, RotateCcw } from 'lucide-react';
import React, { useState } from 'react'
import { Link } from 'react-router';

const KITCHENS = [
    "Central Kitchen",
    "North Wing",
    "Bakery Unit",
    "South Kitchen",
    "Storage Room",
    "Production Kitchen",
    "Cold Storage",
    "Main Kitchen",
];

const APPROVERS = ["John Doe", "Mike Ross", "Emily Clark"];
const RECEIVERS = ["Sarah Smith", "Jane Doe", "David Lee"];

const emptyForm = {
    transferId: "",
    assetId: "",
    fromKitchen: "",
    toKitchen: "",
    transferDate: "",
    approvedBy: "",
    receivedBy: "",
    reason: "",
};

const FieldLabel = ({ children, required }) => (
    <label className="block text-xs font-semibold text-[#121C2A] mb-2">
        {children} {required && <span className="text-red-500">*</span>}
    </label>
);

const selectClass =
    "w-full h-11 rounded-xl border border-[#D9E2EC] bg-[#F8F9FF80] px-4 text-sm text-[#121C2A] outline-none focus:ring-2 focus:ring-[#0B5CAB]/20 appearance-none";

const inputClass =
    "w-full h-11 rounded-xl border border-[#D9E2EC] bg-[#F8F9FF80] px-4 text-sm text-[#121C2A] outline-none focus:ring-2 focus:ring-[#0B5CAB]/20";

// Pass `transferToEdit` (an existing transfer record) to open the form in edit mode,
// which reveals the read-only Transfer ID field. Omit it to open in "add new" mode,
// where the Transfer ID is hidden and gets assigned on save (e.g. by the backend).
const AddAssetsTransfer = ({ onBackToList, onSaveTransfer, transferToEdit }) => {
    const isEditMode = Boolean(transferToEdit);
    const initialForm = isEditMode ? { ...emptyForm, ...transferToEdit } : emptyForm;

    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const validate = () => {
        const required = ["assetId", "fromKitchen", "toKitchen", "transferDate", "approvedBy"];
        const nextErrors = {};

        required.forEach((field) => {
            if (!form[field]) nextErrors[field] = "This field is required";
        });

        if (form.fromKitchen && form.toKitchen && form.fromKitchen === form.toKitchen) {
            nextErrors.toKitchen = "Destination must differ from origin";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleReset = () => {
        setForm(initialForm);
        setErrors({});
    };

    const handleSave = (addAnother) => {
        if (!validate()) return;

        onSaveTransfer?.(form);

        if (addAnother) {
            setForm(emptyForm);
            setErrors({});
        }
    };

    return (
        <div className="p-4 md:p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2 flex-wrap">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <button onClick={onBackToList} className="hover:underline">
                    Asset Transfer Log
                </button>
                <ChevronRight size={12} />
                <span className="text-[#002246] font-medium">
                    {isEditMode ? "Edit Asset Transfer" : "Add Asset Transfer"}
                </span>
            </div>

            {/* Header */}
            <div className="flex justify-between flex-col gap-5 sm:flex-row sm:items-start">
                <div>
                    <h1 className="text-3xl font-bold text-[#0B3B75]">
                        Asset Transfer Registration
                    </h1>

                    <p className="text-[#6B7280] mt-1 w-[90%] md:w-full">
                        Systematically record and track the movement of operational assets between kitchen
                        facilities and hub locations.
                    </p>
                </div>

                 <div className="flex gap-3 shrink-0">
                    <Link
                        to="/assets/asset-transfer-log"
                        className="h-11 px-5 cursor-pointer rounded-xl border border-[#D9E2EC] text-[#121C2A] font-medium hover:bg-gray-50 transition inline-flex items-center justify-center"
                    >
                        Back to List
                    </Link>

                    <button
                        onClick={() => handleSave(false)}
                        className="h-11 px-5 cursor-pointer rounded-xl bg-[#0B5CAB] text-white font-medium hover:bg-[#094b8f] transition"
                    >
                        Save Transfer
                    </button>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-white border border-[#E6EAF2] rounded-2xl mt-6 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6EAF2]">
                    <div className="flex items-center gap-2 text-[#0B3B75] font-semibold">
                        <ArrowsIcon />
                        <span>Transfer Information</span>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {/* Transfer ID — edit mode only */}
                    {isEditMode && (
                        <div>
                            <FieldLabel>Transfer ID</FieldLabel>
                            <input
                                type="text"
                                value={form.transferId}
                                disabled
                                className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
                            />
                        </div>
                    )}

                    {/* Asset ID */}
                    <div>
                        <FieldLabel required>Asset ID</FieldLabel>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.assetId}
                                onChange={handleChange("assetId")}
                                placeholder="Enter or scan Asset ID"
                                className={`${inputClass} pr-10`}
                            />
                            <ScanLine
                                size={16}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                        </div>
                        {errors.assetId && <p className="text-xs text-red-500 mt-1">{errors.assetId}</p>}
                    </div>

                    {/* From Kitchen */}
                    <div>
                        <FieldLabel required>From Kitchen</FieldLabel>
                        <select
                            value={form.fromKitchen}
                            onChange={handleChange("fromKitchen")}
                            className={selectClass}
                        >
                            <option value="">Select origin kitchen...</option>
                            {KITCHENS.map((k) => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                        {errors.fromKitchen && <p className="text-xs text-red-500 mt-1">{errors.fromKitchen}</p>}
                    </div>

                    {/* To Kitchen */}
                    <div>
                        <FieldLabel required>To Kitchen</FieldLabel>
                        <select
                            value={form.toKitchen}
                            onChange={handleChange("toKitchen")}
                            className={selectClass}
                        >
                            <option value="">Select destination kitchen...</option>
                            {KITCHENS.map((k) => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                        {errors.toKitchen && <p className="text-xs text-red-500 mt-1">{errors.toKitchen}</p>}
                    </div>

                    {/* Transfer Date */}
                    <div>
                        <FieldLabel required>Transfer Date</FieldLabel>
                        <input
                            type="date"
                            value={form.transferDate}
                            onChange={handleChange("transferDate")}
                            placeholder="mm/dd/yyyy"
                            className={inputClass}
                        />
                        {errors.transferDate && <p className="text-xs text-red-500 mt-1">{errors.transferDate}</p>}
                    </div>

                    {/* Approved By */}
                    <div>
                        <FieldLabel required>Approved By</FieldLabel>
                        <select
                            value={form.approvedBy}
                            onChange={handleChange("approvedBy")}
                            className={selectClass}
                        >
                            <option value="">Select Approver...</option>
                            {APPROVERS.map((a) => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                        {errors.approvedBy && <p className="text-xs text-red-500 mt-1">{errors.approvedBy}</p>}
                    </div>

                    {/* Received By */}
                    <div>
                        <FieldLabel>Received By</FieldLabel>
                        <select
                            value={form.receivedBy}
                            onChange={handleChange("receivedBy")}
                            className={selectClass}
                        >
                            <option value="">Assign receiver...</option>
                            {RECEIVERS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Reason */}
                    <div className="md:col-span-2">
                        <FieldLabel>Reason for Transfer</FieldLabel>
                        <textarea
                            value={form.reason}
                            onChange={handleChange("reason")}
                            placeholder="Enter detailed reason for asset movement..."
                            rows={5}
                            className="w-full rounded-xl border border-[#D9E2EC] bg-[#F8F9FF80] px-4 py-3 text-sm text-[#121C2A] outline-none focus:ring-2 focus:ring-[#0B5CAB]/20 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-[#E6EAF2] bg-[#EFF4FF4D] flex-wrap gap-3">

                    <div className="flex gap-3">
                        <button
                            onClick={() => handleSave(false)}
                            className="h-11 px-5 cursor-pointer rounded-xl bg-[#0B5CAB] text-white font-medium hover:bg-[#094b8f] transition"
                        >
                            Save Transfer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ArrowsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 7h10M17 7l-4-4M17 7l-4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 17H7M7 17l4 4M7 17l4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default AddAssetsTransfer;