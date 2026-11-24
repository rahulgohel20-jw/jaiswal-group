import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Barcode,
    Loader2,
    AlertCircle,
    X,
    Package,
    Tag,
    Building2,
    MapPin,
    Layers,
    FileCode,
    Scale,
    Layers3
} from "lucide-react";
import { Container } from "@/components/common/container";
import { PageHeader } from "@/components/common/PageHeader";
import { PageErrorAlert } from "@/components/common/PageErrorAlert";
import { notify } from "@/utils/toast";
import { getStockDetailsByBatchNumber } from "@/services/apiServices";
import { AccessDenied } from "@/components/common/AccessDenied";
import { usePagePermissions } from "@/utils/permissions";

const DetailCard = ({ icon: Icon, label, value, subValue, mono = false, highlight = false, badge = false }) => (
    <div className="bg-white p-4 rounded-xl border border-[#E7EAF0] shadow-2xs flex flex-col justify-between gap-2">
        <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-[#084E92]">
                <Icon size={16} />
            </div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {label}
            </span>
        </div>
        <div>
            {badge ? (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                    {value ?? 0} {subValue && <span className="text-xs font-normal text-emerald-600">{subValue}</span>}
                </span>
            ) : (
                <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span
                        className={`text-sm font-semibold break-all ${
                            highlight
                                ? "text-[#084E92]"
                                : value
                                ? "text-gray-800"
                                : "text-gray-400 font-normal"
                        } ${mono ? "font-mono" : ""}`}
                    >
                        {value || "-"}
                    </span>
                    {subValue && (
                        <span className="text-xs text-gray-500 font-normal">
                            {subValue}
                        </span>
                    )}
                </div>
            )}
        </div>
    </div>
);

const RawMaterialBatchDetails = () => {
    const { canView } = usePagePermissions("Raw Material Batch Details");
    const [batchNumber, setBatchNumber] = useState("");
    const [batchData, setBatchData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasQueried, setHasQueried] = useState(false);
    const [error, setError] = useState(null);

    const inputRef = useRef(null);
    const latestBatchRef = useRef("");

    const fetchBatchDetails = useCallback(async (codeToFetch) => {
        const query = String(codeToFetch).trim();
        if (!query) {
            setBatchData(null);
            setHasQueried(false);
            return;
        }

        if (latestBatchRef.current === query) return;
        latestBatchRef.current = query;

        setLoading(true);
        setError(null);

        try {
            const res = await getStockDetailsByBatchNumber(query);
            const data = res?.data?.data ?? [];
            const record = Array.isArray(data) ? data[0] : data;

            if (record) {
                setBatchData(record);
                setHasQueried(true);
            } else {
                setBatchData(null);
                setHasQueried(true);
                notify.info("No stock batch details found for this batch number");
            }
        } catch (err) {
            console.error("Failed to fetch batch details:", err);
            const msg =
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                "Failed to load batch details";
            setError(msg);
            notify.error(msg);
            setBatchData(null);
            setHasQueried(true);
        } finally {
            setLoading(false);
        }
    }, []);

    // 400ms debounce
    useEffect(() => {
        const trimmed = batchNumber.trim();
        if (!trimmed) {
            setBatchData(null);
            setHasQueried(false);
            latestBatchRef.current = "";
            return;
        }

        const timer = setTimeout(() => {
            fetchBatchDetails(trimmed);
        }, 400);

        return () => clearTimeout(timer);
    }, [batchNumber, fetchBatchDetails]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const trimmed = batchNumber.trim();
            if (trimmed) fetchBatchDetails(trimmed);
        }
    };

    const handleClear = () => {
        setBatchNumber("");
        setBatchData(null);
        setHasQueried(false);
        setError(null);
        latestBatchRef.current = "";
        inputRef.current?.focus();
    };

    if (!canView) {
        return <AccessDenied pageTitle="Raw Material Barcode" />;
    }

    return (
        <Container>
            <div className="mx-auto pt-2 pb-8 space-y-5 max-w-7xl">
                {/* Header */}
                <PageHeader
                    title="Raw Material Batch Details"
                    description="Scan batch barcode to retrieve real-time stock details."
                />

                <PageErrorAlert
                    error={error}
                    onRetry={() => fetchBatchDetails(batchNumber)}
                />

                {/* Search Box */}
                <div className="bg-white p-5 rounded-2xl border border-[#E7EAF0] shadow-xs">
                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                        Batch Number / Barcode <span className="text-red-500">*</span>
                    </label>
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#084E92]">
                            <Barcode size={20} />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={batchNumber}
                            onChange={(e) => setBatchNumber(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Scan barcode gun or type batch code..."
                            className="w-full h-11 pl-11 pr-10 text-xs sm:text-sm font-mono border border-[#C3C6D1] rounded-xl text-gray-800 placeholder-gray-400 bg-white outline-none focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/15 transition"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                            {loading && (
                                <Loader2 size={18} className="animate-spin text-[#084E92]" />
                            )}
                            {batchNumber && !loading && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="text-gray-400 hover:text-red-500 cursor-pointer p-0.5"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* State Views */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#E7EAF0] text-gray-400 gap-2">
                        <Loader2 size={24} className="animate-spin text-[#084E92]" />
                        <span className="text-sm font-medium">Fetching details…</span>
                    </div>
                ) : !hasQueried ? (
                    <div className="h-48 flex flex-col justify-center items-center p-6 text-center bg-white rounded-2xl border border-[#E7EAF0]">
                        <Barcode size={32} className="text-[#084E92] mb-2 stroke-[1.5]" />
                        <h4 className="font-semibold text-sm text-[#00376C]">
                            Ready to Scan Batch Barcode
                        </h4>
                        <p className="text-xs text-gray-500 max-w-sm mt-0.5">
                            Scan a barcode or enter batch number to display item details.
                        </p>
                    </div>
                ) : !batchData ? (
                    <div className="h-44 flex flex-col justify-center items-center p-6 text-center bg-white rounded-2xl border border-[#E7EAF0]">
                        <AlertCircle size={28} className="text-amber-500 mb-2" />
                        <h4 className="font-semibold text-sm text-[#00376C]">
                            No Batch Record Found
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                            No records found for "<strong>{batchNumber}</strong>".
                        </p>
                    </div>
                ) : (
                    /* Specific Requested Fields Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {/* 1. Item Name */}
                        <DetailCard
                            icon={Package}
                            label="Raw Material Name"
                            value={batchData.itemName}
                        />

                        {/* 2. Category */}
                        <DetailCard
                            icon={Layers}
                            label="Category"
                            value={batchData.categoryName}
                            subValue={batchData.subCategoryName ? `(${batchData.subCategoryName})` : ""}
                        />

                        {/* 3. Remaining Quantity */}
                        <DetailCard
                            icon={Layers3}
                            label="Remaining Quantity"
                            value={batchData.remainingQuantity ?? 0}
                            subValue={batchData.unitSymbol || ""}
                            badge
                        />

                        {/* 4. HSN Code */}
                       {batchData.hsnCode && <DetailCard
                            icon={FileCode}
                            label="HSN Code"
                            value={batchData.hsnCode}
                            mono
                        />}

                        

                        {/* 5. Unit of Measure */}
                        <DetailCard
                            icon={Scale}
                            label="Unit of Measure"
                            value={batchData.unitName}
                            subValue={batchData.unitSymbol ? `(${batchData.unitSymbol})` : ""}
                        />

                        {/* 6. Outlet / Unit */}
                        {batchData.organizationName && <DetailCard
                            icon={Building2}
                            label="Outlet / Unit"
                            value={batchData.organizationName}
                        />
                        }

                        {/* 7. Sub Outlet */}
                        {batchData.subOutletName && <DetailCard
                            icon={Building2}
                            label="Sub-Outlet"
                            value={batchData.subOutletName}
                        />}

                        {/* 8. Sub Location */}
                        {batchData.subLocationName && <DetailCard
                            icon={MapPin}
                            label="Sub-Location"
                            value={batchData.subLocationName}
                        />}
                    </div>
                )}
            </div>
        </Container>
    );
};

export default RawMaterialBatchDetails;