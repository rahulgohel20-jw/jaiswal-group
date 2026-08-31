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
import { Container } from "@/components/common/container";
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const inputCls =
    "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-[#fffff] placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const selectCls =
    "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-[#fffff] outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 appearance-none cursor-pointer";

const Select = ({
    value,
    onChange,
    options = [],
    placeholder = "Select...",
    name,
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const selectedOption = options.find(
        (option) =>
            String(option.value ?? option) === String(value)
    );

    const selectedLabel = selectedOption
        ? String(selectedOption.label ?? selectedOption)
        : "";

    React.useEffect(() => {
        if (!open) {
            setSearch(selectedLabel);
        }
    }, [open, selectedLabel]);

    const filteredOptions = options.filter((option) => {
        const label = String(option.label ?? option);

        return label
            .toLowerCase()
            .includes(search.trim().toLowerCase());
    });

    const handleSelect = (option) => {
        const optionValue = option.value ?? option;
        const optionLabel = option.label ?? option;

        onChange({
            target: {
                name,
                value: String(optionValue),
            },
        });

        setSearch(String(optionLabel));
        setOpen(false);
    };

    const handleInputChange = (e) => {
        const inputValue = e.target.value;

        setSearch(inputValue);
        setOpen(true);

        // Search start karte hi old selected value clear
        if (String(inputValue) !== String(selectedLabel)) {
            onChange({
                target: {
                    name,
                    value: "",
                },
            });
        }
    };

    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (nextOpen) {
                    setSearch(selectedLabel);
                }
            }}
            modal={false}
        >
            <PopoverTrigger asChild>
                <div className="relative w-full">
                    <input
                        name={name}
                        value={search}
                        placeholder={placeholder}
                        onClick={() => {
                            setOpen(true);
                            setSearch(selectedLabel);
                        }}
                        onChange={handleInputChange}
                        className={`${inputCls} pr-10 cursor-text`}
                    />

                    <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
                    />
                </div>
            </PopoverTrigger>

            <PopoverContent
                side="bottom"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="p-0 w-(--radix-popover-trigger-width) overflow-hidden z-100"
            >
                <div className="max-h-52 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => {
                            const optionValue =
                                option.value ?? option;

                            const optionLabel =
                                option.label ?? option;

                            const isSelected =
                                String(value) ===
                                String(optionValue);

                            return (
                                <button
                                    key={String(optionValue)}
                                    type="button"
                                    onMouseDown={(e) =>
                                        e.preventDefault()
                                    }
                                    onClick={() =>
                                        handleSelect(option)
                                    }
                                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 ${
                                        isSelected
                                            ? "bg-blue-50 text-primary font-medium"
                                            : "text-gray-700"
                                    }`}
                                >
                                    {optionLabel}
                                </button>
                            );
                        })
                    ) : (
                        <div className="px-3 py-3 text-sm text-gray-500">
                            No options found
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
const AddAssetsDisposal = () => {
    const { canAdd, canView } = usePagePermissions('Asset Disposal');

    const [form, setForm] = useState({
        assetId: "AST-2024-0089",
        assetName: "",
        kitchen: "Central Kitchen - Sector 12",
        disposalDate: "",
        disposalMethod: "Sale",
        disposalReason: "",
        saleValue: "",
        purchaserDetails: "",
        approvedBy: "Marcus Chen",
        witnessName: "",
        disposalCertificateId: "CERT-2024-0098",
        status: "Completed",
        environmentalCompliance: "certified",
        dataSanitized: "yes",
    });

    const set = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    if (!canView || !canAdd) {
        return <AccessDenied pageTitle="Asset Disposal Registration" />;
    }

    const Label = ({ children, required }) => (
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
            {children}
            {required && <span className="text-red-500">*</span>}
        </label>
    );


    return (
       <Container>
         <div className="p-4 md:p-6">
            {/* Breadcrumb */}

            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#0151a8] font-medium">
                    Asset Disposal Registration
                </span>
            </div>

            {/* Header */}

            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">
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
       </Container>
    );
};

export default AddAssetsDisposal;