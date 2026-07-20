import {
    ArrowLeft,
    Calendar,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    FileText,
    Lock,
    Save,
    Search,
} from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router";

const inputCls =
    "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-[#fffff] placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const selectCls =
    "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-[#fffff] outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 appearance-none cursor-pointer";

const AddAssetsDisposal = () => {
    const [form, setForm] = useState({
        assetId: "AST-2024-0089",
        assetName: "",
        kitchen: "Central Kitchen - Sector 12",
        disposalDate: "",
        disposalMethod: "",
        saleValue: "",
        reason: "",
        approvedBy: "Rajesh Kumar (Operations Manager)",
    });

    const update = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const Label = ({ children, required }) => (
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
            {children}
            {required && <span className="text-red-500">*</span>}
        </label>
    );

    const Select = ({ value, onChange, options, placeholder }) => (
        <div className="relative">
            <select value={value} onChange={onChange} className={selectCls}>
                <option value="" disabled>
                    {placeholder}
                </option>

                {options.map((item) => (
                    <option key={item} value={item}>
                        {item}
                    </option>
                ))}
            </select>

            <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
        </div>
    );

    return (
        <div className="p-4 md:p-6">
            {/* Breadcrumb */}

            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#002246] font-medium">
                    Asset Disposal Registration
                </span>
            </div>

            {/* Header */}

            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-[#084E92]">
                        Asset Disposal Registration
                    </h1>

                    <p className="text-sm text-gray-500 mt-1">
                        Systematically record disposal details for organizational assets to
                        ensure accurate lifecycle tracking and regulatory compliance.
                    </p>
                </div>

                <div className="flex gap-3">
                    <Link to="/assets/asset-disposal">
                        <button className="flex items-center cursor-pointer text-xs gap-2 border-2 border-[#E2E8F0] text-[#334155] font-semibold px-5 py-2.5 rounded-lg bg-white hover:bg-gray-50">
                            <ArrowLeft size={16} />
                            Back to List
                        </button>
                    </Link>

                    <button className="flex items-center cursor-pointer text-xs gap-2 bg-[#084E92] text-white px-5 py-2.5 rounded-lg hover:bg-[#06396c]">
                        <Save size={16} />
                        Save Record
                    </button>
                </div>
            </div>

            {/* Card */}

            <div className="mt-6 rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#084E92]">
                            <FileText size={18} />
                        </div>

                        <div>
                            <h2 className="font-semibold text-gray-800">
                                Disposal Information
                            </h2>

                            <p className="text-xs text-gray-500">
                                Please provide accurate details of the asset disposal event.
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Asset ID */}

                        <div>
                            <Label required>Asset ID</Label>

                            <div className="relative bg-[#F8FAFC]">
                                <input
                                    className={inputCls}
                                    value={form.assetId}
                                    readOnly
                                />

                                <Lock
                                    size={16}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Asset Name */}

                        <div>
                            <Label required>Asset Name</Label>

                            <div className="relative">
                                <input
                                    className={`${inputCls} pr-10`}
                                    placeholder="Search asset name..."
                                    value={form.assetName}
                                    onChange={(e) =>
                                        update("assetName", e.target.value)
                                    }
                                />

                                <Search
                                    size={16}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Kitchen */}

                        <div>
                            <Label required>Kitchen Name</Label>

                            <Select
                                value={form.kitchen}
                                onChange={(e) => update("kitchen", e.target.value)}
                                placeholder="Select Kitchen"
                                options={[
                                    "Central Kitchen - Sector 12",
                                    "Central Kitchen - Sector 18",
                                    "Warehouse",
                                ]}
                            />
                        </div>

                        {/* Date */}

                        <div>
                            <Label required>Disposal Date</Label>

                            <div className="relative">
                                <input
                                    type="date"
                                    className={inputCls}
                                    value={form.disposalDate}
                                    onChange={(e) =>
                                        update("disposalDate", e.target.value)
                                    }
                                />
                            </div>
                        </div>

                        {/* Method */}

                        <div>
                            <Label required>Disposal Method</Label>

                            <input
                                className={inputCls}
                                placeholder="e.g. Sold, Scrap, Recycled"
                                value={form.disposalMethod}
                                onChange={(e) =>
                                    update("disposalMethod", e.target.value)
                                }
                            />
                        </div>

                        {/* Sale Value */}

                        <div>
                            <Label>Sale Value (Realized)</Label>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    ₹
                                </span>

                                <input
                                    className={`${inputCls} text-left pl-7`}
                                    placeholder="0.00"
                                    value={form.saleValue}
                                    onChange={(e) =>
                                        update("saleValue", e.target.value)
                                    }
                                />
                            </div>
                        </div>

                        {/* Reason */}

                        <div className="md:col-span-2">
                            <Label required>Reason for Disposal</Label>

                            <textarea
                                rows={5}
                                className={`${inputCls} resize-none`}
                                placeholder="Detailed reason for disposing this asset (e.g., End of useful life, excessive maintenance costs, damaged beyond repair)..."
                                value={form.reason}
                                onChange={(e) =>
                                    update("reason", e.target.value)
                                }
                            />
                        </div>

                        {/* Approved */}

                        <div>
                            <Label required>Approved By</Label>

                            <Select
                                value={form.approvedBy}
                                onChange={(e) =>
                                    update("approvedBy", e.target.value)
                                }
                                placeholder="Select Approver"
                                options={[
                                    "Rajesh Kumar (Operations Manager)",
                                    "Amit Sharma",
                                    "Admin",
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}

                <div className="border-t p-6 flex justify-between flex-wrap gap-4 bg-[#F8FAFC80]">
                    <div className="flex gap-3">
                        <button className="px-6 py-2 bg-[#FFFFFF] cursor-pointer border-2 border-[#E2E8F0] rounded-lg hover:bg-gray-100">
                            Cancel
                        </button>

                        <button className="px-6 py-2 bg-[#FFFFFF] cursor-pointer border-2 border-[#E2E8F0] rounded-lg hover:bg-gray-100">
                            Reset
                        </button>
                    </div>

                    <div className="flex gap-3">
                        <button className="px-6 py-2 rounded-lg text-xs font-semibold cursor-pointer border-2 border-[#084E92] text-[#084E92] hover:bg-blue-50">
                            Save & Add Another
                        </button>

                        <button className="px-6 py-2 rounded-lg text-xs font-semibold cursor-pointer bg-[#084E92] text-white hover:bg-[#06396c]">
                            Save Disposal Record
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddAssetsDisposal;