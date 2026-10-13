import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
    ArrowLeft,
    SquarePen,
    Package,
    Boxes,
    Layers,
    Scale,
    ShieldAlert,
    Calendar,
    BadgeCheck,
} from "lucide-react";
import { Container } from "@/components/common/container";
import { PageHeader } from "@/components/common/PageHeader";
import { getRawMaterialById } from "@/services/apiServices";

const SectionCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-[#084E92]" />
            </div>
            <h2 className="text-xs font-bold text-gray-800">{title}</h2>
        </div>
        <div className="px-4 py-3">{children}</div>
    </div>
);

const InfoCard = ({ label, value }) => (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
            {label}
        </p>
        <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">
            {typeof value === "object" ? value?.msg : value || "—"}
        </p>
    </div>
);

const StatCard = ({ label, value, icon: Icon }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
        <div className="w-7 h-7 rounded-lg bg-[#D5E3FF] flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-[#00376C]" />
        </div>
        <div className="flex flex-col items-end text-right">
            <span className="text-[10px] font-semibold text-[#00376C]">{label}</span>
            <span className="text-xs font-bold text-[#1B1B1F] mt-0.5">{value || "—"}</span>
        </div>
    </div>
);

const ViewRawMaterialItem = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();

    const [item, setItem] = useState(location.state?.item || null);
    const [loading, setLoading] = useState(!location.state?.item && Boolean(id));

    useEffect(() => {
        if (location.state?.item) return;

        if (!id) {
            navigate("/material/items");
            return;
        }

        const fetchDetails = async () => {
            try {
                setLoading(true);
                const res = await getRawMaterialById(id);
                const rawDetail = res?.data?.data?.["Raw Material Details"]?.[0] || null;
                if (!rawDetail) {
                    navigate("/material/items");
                    return;
                }
                setItem(rawDetail);
            } catch (err) {
                console.error("Failed to load raw material details:", err);
                navigate("/material/items");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id, location.state?.item, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-xs text-[#667085]">Loading raw material details...</div>
            </div>
        );
    }

    if (!item) return null;

    const categoryType = item.rawMaterialCat?.rawMaterialCatType;
    const category = item.rawMaterialCat;
    const unit = item.unit;

    const latestImage = Array.isArray(item.images) && item.images.length > 0
        ? [...item.images].sort((a, b) => Number(b.id) - Number(a.id))[0]?.path || ""
        : "";

    return (
        <Container>
            <div className="mx-auto pt-2 pb-6 space-y-3">
                <PageHeader
                    title={"Raw Material Details"}
                    description="Complete raw material profile and inventory configuration."
                    actions={
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={() => navigate("/material/items")}
                                className="flex items-center gap-1 text-[#084E92] hover:text-[#063b6f] font-semibold text-xs cursor-pointer bg-transparent border-0 p-0"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Back to Raw Material Items
                            </button>
                            <button
                                onClick={() =>
                                    navigate(`/material/items/edit/${item.id}`, {
                                        state: { item },
                                    })
                                }
                                className="bg-[#084E92] text-white px-3.5 py-1.5 cursor-pointer rounded-lg flex items-center gap-1.5 text-xs font-medium"
                            >
                                <SquarePen className="w-3.5 h-3.5" />
                                Edit Raw Material
                            </button>
                        </div>
                    }
                />

                {/* Profile Overview Card */}
                <div className="my-3 bg-white border border-gray-100 rounded-2xl shadow-xs p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    {latestImage ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 bg-white flex items-center justify-center shrink-0">
                            <img
                                src={latestImage}
                                alt={item.nameEnglish}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-[#084E92]/10 flex items-center justify-center shrink-0">
                            <Package className="w-8 h-8 text-[#084E92]" />
                        </div>
                    )}

                    <div className="text-center sm:text-left flex-1">
                        <h2 className="text-base font-bold text-gray-900">
                            {item.nameEnglish}
                        </h2>

                        <p className="text-xs text-gray-500 mt-0.5">
                            Type: {categoryType?.nameEnglish || "—"}
                        </p>

                        <p className="text-[#084E92] text-xs mt-0.5">
                            Category: {category?.nameEnglish || "—"}
                        </p>

                        <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2.5">
                            {item.subCategoryName && (
                                <span className="bg-blue-50 text-[#084E92] text-[10px] font-medium px-2 py-0.5 rounded-full">
                                    {item.subCategoryName}
                                </span>
                            )}

                            {unit?.nameEnglish && (
                                <span className="bg-gray-100 text-gray-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                    {unit.nameEnglish} {unit.symbolEnglish ? `(${unit.symbolEnglish})` : ""}
                                </span>
                            )}

                            <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                    item.isActive
                                        ? "bg-green-50 text-green-700"
                                        : "bg-red-50 text-red-700"
                                }`}
                            >
                                {item.isActive ? "Active" : "Inactive"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                    <StatCard
                        label="Category"
                        value={category?.nameEnglish}
                        icon={Boxes}
                    />

                    <StatCard
                        label="Type"
                        value={categoryType?.nameEnglish}
                        icon={BadgeCheck}
                    />

                    <StatCard
                        label="Unit"
                        value={unit?.nameEnglish ? `${unit.nameEnglish} (${unit.symbolEnglish || ""})` : "—"}
                        icon={Scale}
                    />

                    <StatCard
                        label="Created On"
                        value={item.createdAt}
                        icon={Calendar}
                    />
                </div>

                {/* Section 1: Basic Information */}
                <SectionCard title="Basic Information" icon={Package}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        <InfoCard
                            label="Raw Material Name"
                            value={item.nameEnglish}
                        />

                        <InfoCard
                            label="Type"
                            value={categoryType?.nameEnglish}
                        />

                        <InfoCard
                            label="Category"
                            value={category?.nameEnglish}
                        />

                        <InfoCard
                            label="Sub Category"
                            value={item.subCategoryName}
                        />

                        <InfoCard
                            label="Unit"
                            value={unit?.nameEnglish ? `${unit.nameEnglish} (${unit.symbolEnglish || ""})` : "—"}
                        />

                        <InfoCard
                            label="Brand"
                            value={item.brandName}
                        />
                    </div>
                </SectionCard>

                {/* Section 2: Stock Inventory */}
                <SectionCard title="Stock Inventory" icon={Layers}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <InfoCard
                            label="Minimum Stock"
                            value={item.minStock}
                        />

                        <InfoCard
                            label="Maximum Stock"
                            value={item.maxStock}
                        />
                    </div>
                </SectionCard>

                {/* Section 3: Taxation & Compliance */}
                <SectionCard title="Taxation & Compliance" icon={ShieldAlert}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <InfoCard
                            label="HSN / SAC Code"
                            value={item.hsnCode}
                        />

                        <InfoCard
                            label="Tax (%)"
                            value={item.tax !== null && item.tax !== undefined ? `${item.tax} %` : "0 %"}
                        />

                        <InfoCard
                            label="Is Cess Applicable?"
                            value={item.isCessApplicable || Number(item.cess) > 0 ? "Yes" : "No"}
                        />

                        <InfoCard
                            label="Is Use By?"
                            value={item.isUsedBy || item.useByDate ? "Yes" : "No"}
                        />
                    </div>
                </SectionCard>
            </div>
        </Container>
    );
};

export default ViewRawMaterialItem;