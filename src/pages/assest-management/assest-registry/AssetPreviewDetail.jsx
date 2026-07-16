import React from "react";
import {
    X,
    ShieldCheck,
    Clock3,
    MapPin,
    User,
    QrCode,
    MonitorCog,
    LogOut,
} from "lucide-react";


const StatusBadge = ({ status }) => {
    const styles = {
        Available: "bg-[#10B981] text-white",
        Assigned: "bg-[#1D4ED8] text-white",
        Maintenance: "bg-orange-100 text-orange-700",
        Expiring: "bg-[#FEE2E2] text-[#BA1A1A]"
    };
    const dotStyle = {
        Available: "bg-[#16A34A]",
        Assigned: "bg-[#1D4ED8]",
        Maintenance: "bg-[#C2410C]",
        Expiring: "bg-[#BA1A1A]"
    }
    return (
        <div className="bg-[#F4FBF7] rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <p className={`w-2 h-2 rounded-full ${dotStyle[status]}`}></p>
                <p className="text-[12px] uppercase tracking-wider text-[#666]">
                    Current Status
                </p>
            </div>

            <span
                className={`p-1 px-2 rounded-full text-xs font-medium ${styles[status]} flex gap-1 items-center justify-center`}
            >

                <p>{status}</p>
            </span></div>
    );
};


const AssetPreviewDetail = ({ asset, onClose }) => {
    if (!asset) return null;
    return (
        <div className="w-95 h-screen bg-white border-l border-gray-200 overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-[#1D1B20]">
                            Asset Details
                        </h2>

                        <p className="text-xs text-[#666] mt-1">
                            Asset ID: {asset.assetId} | {asset.itemName}
                        </p>
                    </div>

                    <button onClick={onClose} className="cursor-pointer">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Asset Image */}
            <div className="p-4">
                <div className="relative">
                    <img
                        src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853"
                        alt="asset"
                        className="w-full h-40 rounded-xl object-cover"
                    />

                    <div className="absolute bottom-3 right-3 bg-white p-1 rounded-md shadow">
                        <QrCode size={18} />
                    </div>
                </div>
            </div>

            {/* Status */}
            <div className="px-4">
                <StatusBadge status={asset.status} />
            </div>

            {/* Operational Context */}
            <div className="p-4">
                <h3 className="text-xs font-semibold tracking-widest text-[#666] mb-3">
                    OPERATIONAL CONTEXT
                </h3>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#EEF2FF] rounded-xl p-3">
                        <p className="text-xs text-gray-500">Category</p>
                        <p className="font-semibold mt-1">{asset.category}</p>
                    </div>

                    <div className="bg-[#EEF2FF] rounded-xl p-3">
                        <p className="text-xs text-gray-500">Sub-Category</p>
                        <p className="font-semibold mt-1">Laptops</p>
                    </div>

                    <div className="bg-[#EEF2FF] rounded-xl p-3">
                        <p className="text-xs text-gray-500">Asset Type</p>
                        <p className="font-semibold mt-1">Fixed</p>
                    </div>

                    <div className="bg-[#EEF2FF] rounded-xl p-3">
                        <p className="text-xs text-gray-500">Assigned To</p>

                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                                <User size={14} />
                            </div>

                            <div>
                                <p className="text-sm font-medium">
                                    Rajesh Kumar
                                </p>
                                <p className="text-[10px] text-gray-500">
                                    Senior Chef
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Technical Specs */}
            <div className="px-4">
                <div className="border rounded-xl overflow-hidden">
                    <div className="p-3 flex items-center gap-2 font-medium">
                        <MonitorCog size={16} />
                        Technical Specifications
                    </div>

                    <div className="p-3 space-y-3 text-sm">
                        <div className="flex justify-between border-b border-[#E6EEFF] pb-1">
                            <span className="text-gray-500">Brand</span>
                            <span className="text-[#121C2A] font-semibold">Dell</span>
                        </div>

                        <div className="flex justify-between border-b border-[#E6EEFF] pb-1">
                            <span className="text-gray-500">Model</span>
                            <span className="text-[#121C2A] font-semibold">Latitude 5420</span>
                        </div>

                        <div className="flex justify-between border-b border-[#E6EEFF] pb-1">
                            <span className="text-gray-500">Serial Number</span>
                            <span className="text-[#121C2A] font-semibold">SN-9872134</span>
                        </div>

                        <div className="flex justify-between pb-1">
                            <span className="text-gray-500">Purchase Date</span>
                            <span className="text-[#121C2A] font-semibold">12 Oct 2023</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warranty */}
            <div className="p-4">
                <div className="bg-[#FFF7E6] border border-[#FFE2A8] rounded-xl p-3">
                    <p className="text-xs text-gray-500">
                        Warranty Status
                    </p>

                    <p className="font-medium text-[#C77700] mt-1">
                        {asset.warranty} (Expiring Soon)
                    </p>
                </div>
            </div>

            {/* Value Cards */}
            <div className="px-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#EEF2FF] rounded-xl p-3">
                        <p className="text-xs text-gray-500">
                            Asset Value
                        </p>

                        <p className="text-2xl font-semibold mt-1 text-[#002246]">
                            ₹{asset.value}
                        </p>
                    </div>

                    <div className="bg-[#EEF2FF] rounded-xl p-3">
                        <p className="text-xs text-gray-500">
                            Depreciation
                        </p>

                        <div className="flex gap-1">
                            <p className="text-2xl  font-medium text-[#BA1A1A] mt-1">
                                15%
                            </p>

                            <p className="text-xs text-[#BA1A1A] self-end pb-1">
                                Annual
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity History */}
              <div className="px-4 py-8">
                <h3 className="text-sm font-medium tracking-[3px] text-[#666] mb-5">
                    ACTIVITY HISTORY
                </h3>

                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-2.5 top-2 bottom-2 w-px bg-[#D9DCE3]" />

                    {asset.activities.map((activity, index) => (
                        <div
                            key={index}
                            className="relative flex gap-4 pb-7 last:pb-0"
                        >
                            {/* Timeline Dot */}
                            <div className="relative z-10">
                                {activity.active ? (
                                    <div className="w-4 h-4 rounded-full border-[3px] border-[#0A3768] bg-white" />
                                ) : (
                                    <div className="w-3 h-3 rounded-full bg-[#D1D5DB] mt-1 ml-1" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="-mt-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-[16px] text-[#1D2939]">
                                        {activity.title}
                                    </h4>

                                    {activity.status && (
                                        <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] text-xs font-medium">
                                            {activity.status}
                                        </span>
                                    )}
                                </div>

                                <p className="text-[#4B5563] text-sm mt-1">
                                    {activity.subtitle}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Footer Button */}
            <div className="sticky bottom-0 bg-white border-t p-4 z-50">
                <button className="w-full bg-[#002B5B] text-white py-3 rounded-lg font-medium cursor-pointer flex gap-2 items-center justify-center">
                    <LogOut size={20}/>
                    Transfer Asset
                </button>
            </div>
        </div>
    );
};

export default AssetPreviewDetail
