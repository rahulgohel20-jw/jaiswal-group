import React, { useEffect, useMemo, useState } from "react";
import { Calculator, X } from "lucide-react";
import SearchableSelect from "../../../utils/SearchableSelect";
import { notify } from "@/utils/toast";

const inputCls =
    "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
    "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed";

const Label = ({ children, required }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {children}
        {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

const UnitConversionModal = ({
    isOpen,
    onClose,
    currentWeight,
    currentUnitLabel,
    unitOptions = [],
    onApplyConversion,
}) => {
    // Row 1: Target UOM dropdown state
    const [targetUnitId, setTargetUnitId] = useState("");

    // Row 2: Conversion factor per unit state
    const [conversionWeightPerUnit, setConversionWeightPerUnit] = useState("");

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setTargetUnitId("");
            setConversionWeightPerUnit("");
        }
    }, [isOpen]);

    // Target unit label lookup
    const targetUnitLabel = useMemo(() => {
        const match = unitOptions.find((u) => String(u.value) === String(targetUnitId));
        return match?.label || "Selected Unit";
    }, [unitOptions, targetUnitId]);

    // Row 3: Live calculation => (Conversion Weight) * (Previously Added Weight)
    const totalConvertedWeight = useMemo(() => {
        const factor = parseFloat(conversionWeightPerUnit);
        const original = parseFloat(currentWeight);
        if (Number.isFinite(factor) && Number.isFinite(original)) {
            return +(factor * original).toFixed(4);
        }
        return 0;
    }, [conversionWeightPerUnit, currentWeight]);

    if (!isOpen) return null;

    const handleApply = () => {
        if (!targetUnitId) {
            notify.error("Please select a target Unit of Measure");
            return;
        }
        if (!conversionWeightPerUnit || Number(conversionWeightPerUnit) <= 0) {
            notify.error("Please enter a valid conversion weight");
            return;
        }

        onApplyConversion({
            convertedWeight: String(totalConvertedWeight),
            targetUnitId: String(targetUnitId),
            targetUnitLabel,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-[#084E92]">
                        <Calculator className="w-5 h-5" />
                        <h3 className="text-base font-semibold text-gray-800">Unit Conversion</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Row 1: Target Unit (UOM) Dropdown */}
                    <div>
                        <Label required>UOM &rarr; (Target Unit)</Label>
                        <SearchableSelect
                            name="targetUnit"
                            options={unitOptions}
                            value={targetUnitId}
                            onChange={(e) => {
                                const val = e?.target?.value ?? e?.value ?? "";
                                setTargetUnitId(val ? String(val) : "");
                            }}
                            placeholder="Select Unit to convert into (e.g. KG)"
                        />
                    </div>

                    {/* Row 2: Conversion weight per previously selected unit */}
                    <div>
                        <Label required>
                            Conversion weight per ({currentUnitLabel || "Unit"})
                        </Label>
                        <input
                            type="number"
                            min="0.00001"
                            step="any"
                            onWheel={(e) => e.currentTarget.blur()}
                            value={conversionWeightPerUnit}
                            onChange={(e) => setConversionWeightPerUnit(e.target.value)}
                            placeholder="e.g. 0.02"
                            className={inputCls}
                        />
                    </div>

                    {/* Row 3: Total calculation display */}
                    <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 space-y-1">
                        <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                            Total Calculation
                        </span>
                        <div className="text-sm text-gray-700">
                            Total in {targetUnitLabel} &rarr;{" "}
                            <span className="font-mono text-gray-500">
                                {conversionWeightPerUnit || "0"} &times; {currentWeight || "0"} ={" "}
                            </span>
                            <span className="font-bold text-[#084E92] text-base">
                                {totalConvertedWeight} {targetUnitLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="px-5 py-2 text-sm font-medium text-white bg-[#084E92] hover:bg-[#063b6f] rounded-lg transition cursor-pointer"
                    >
                        Apply Conversion
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnitConversionModal;