import React from "react";
import {
    X,
    Trash2,
    CalendarDays,
    Building2,
    Clock3,
    ClipboardList,
    UserCheck,
    Loader2,
} from "lucide-react";

const InfoCard = ({ label, value }) => (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3">
        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
            {label}
        </p>

        <p className="text-sm text-gray-800 font-semibold mt-1">
            {value ?? "—"}
        </p>
    </div>
);

const SpecRow = ({ label, value }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0 gap-4">
        <span className="text-sm text-gray-400">
            {label}
        </span>

        <span className="text-sm text-gray-800 font-medium text-right">
            {value ?? "—"}
        </span>
    </div>
);

const formatCurrency = (value) => {
    if (value == null || value === "") return "—";

    return `₹${Number(value).toLocaleString("en-IN")}`;
};

const formatDate = (date) => {
    if (!date) return "—";

    // API format: DD/MM/YYYY or "DD/MM/YYYY hh:mm:ss AM/PM"
    if (date.includes("/")) {
        const [datePart, ...rest] = date.split(" ");
        const [day, month, year] = datePart.split("/");

        const monthName = new Date(
            `${year}-${month}-${day}`
        ).toLocaleString("en-US", {
            month: "short",
        });

        const formatted = `${day} ${monthName} ${year}`;

        return rest.length ? `${formatted}, ${rest.join(" ")}` : formatted;
    }

    return date;
};

const DISPOSAL_METHOD_STYLES = {
    SALE: "bg-green-100 text-green-700",
    SCRAP: "bg-gray-200 text-gray-700",
    DONATION: "bg-blue-100 text-blue-700",
    RECYCLED: "bg-purple-100 text-purple-700",
};

const DISPOSAL_METHOD_LABELS = {
    SALE: "Sale",
    SCRAP: "Scrap",
    DONATION: "Donation",
    RECYCLED: "Recycled",
};

const ViewDisposalModal = ({
    disposal,
    loading,
    onClose,
}) => {
    const data = disposal ?? {};

    return (
        <div className="h-full flex flex-col bg-white">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <div>
                    <h2 className="text-base font-bold text-gray-800">
                        Disposal Details
                    </h2>

                    <p className="text-xs text-gray-400 mt-0.5">
                        Disposal Record #{data.id ?? "—"}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer bg-white"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />

                    <span className="text-sm">
                        Loading disposal details...
                    </span>
                </div>
            ) : (

                /* Content */
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

                    {/* Asset Identity */}
                    <div className="flex items-start gap-4">

                        <div className="w-14 h-14 shrink-0 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
                            <Trash2 className="w-6 h-6 text-[#084E92]" />
                        </div>

                        <div className="min-w-0">

                            <h3 className="text-lg font-bold text-gray-900 truncate">
                                {data.assetName ?? "—"}
                            </h3>

                            <p className="text-xs text-gray-400 mt-0.5">
                                {data.assetCode ?? "—"}
                            </p>

                            {data.orgName && (
                                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                                    <Building2 className="w-3.5 h-3.5 text-gray-400" />

                                    <span className="font-medium text-gray-600">
                                        {data.orgName}
                                    </span>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Disposal Status */}
                    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">

                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">

                            <span
                                className={`w-2 h-2 rounded-full ${data.isActive ? "bg-green-500" : "bg-gray-400"
                                    }`}
                            />

                            Record Status
                        </div>

                        <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${data.isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                        >
                            {data.isActive ? "Active" : "Inactive"}
                        </span>

                    </div>

                    {/* Disposal Information */}
                    <div>

                        <div className="flex items-center gap-1.5 mb-2.5">

                            <CalendarDays className="w-3.5 h-3.5 text-[#084E92]" />

                            <p className="text-[11px] uppercase tracking-wide text-[#084E92] font-bold">
                                Disposal Information
                            </p>

                        </div>

                        <div className="grid grid-cols-2 gap-3">

                            <InfoCard
                                label="Disposal Date"
                                value={formatDate(data.disposalDate)}
                            />

                            <InfoCard
                                label="Disposal Method"
                                value={
                                    <span
                                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DISPOSAL_METHOD_STYLES[data.disposableMethod] ??
                                            "bg-gray-100 text-gray-600"
                                            }`}
                                    >
                                        {DISPOSAL_METHOD_LABELS[data.disposableMethod] ??
                                            data.disposableMethod ??
                                            "—"}
                                    </span>
                                }
                            />

                            <InfoCard
                                label="Quantity"
                                value={data.qty}
                            />

                            <InfoCard
                                label="Sale Value"
                                value={formatCurrency(data.saleValue)}
                            />

                        </div>

                    </div>

                    {/* Disposal Details */}
                    <div>

                        <div className="flex items-center gap-1.5 mb-2.5">

                            <ClipboardList className="w-3.5 h-3.5 text-[#084E92]" />

                            <p className="text-[11px] uppercase tracking-wide text-[#084E92] font-bold">
                                Disposal Details
                            </p>

                        </div>

                        <div className="rounded-xl border border-gray-100 px-3.5">

                            <SpecRow
                                label="Remarks"
                                value={data.remarks}
                            />

                            <SpecRow
                                label="Approved By"
                                value={data.approvedByName}
                            />

                            <SpecRow
                                label="Sub Unit"
                                value={data.subOutletName}
                            />

                         

                        </div>

                    </div>

                    {/* Organization */}
                    <div>

                        <div className="flex items-center gap-1.5 mb-2.5">

                            <Building2 className="w-3.5 h-3.5 text-[#084E92]" />

                            <p className="text-[11px] uppercase tracking-wide text-[#084E92] font-bold">
                                Organization
                            </p>

                        </div>

                        <div className="rounded-xl border border-gray-100 px-3.5">

                            <SpecRow
                                label="Organization"
                                value={data.orgName}
                            />

                            <SpecRow
                                label="Sub Unit"
                                value={data.subOutletName}
                            />
                        </div>

                    </div>

                  

                </div>
            )}
        </div>
    );
};

export default ViewDisposalModal;
