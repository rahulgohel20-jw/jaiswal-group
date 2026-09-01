import { ArrowLeft, Calendar, ChevronDown, ChevronRight, ClipboardList, Info, MapPin, Save, TriangleAlert, Wallet, Wrench, CircleDollarSign, Timer } from 'lucide-react';
import React, { useState } from 'react'
import { Link } from 'react-router';
import { Container } from "@/components/common/container";
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const inputCls =
    'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-[#F8F9FF] ' +
    'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const selectCls =
    'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-[#F8F9FF] ' +
    'outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300 appearance-none cursor-pointer';

const AddAssetsMaintenanceLog = () => {
    const { canAdd, canView } = usePagePermissions('Asset Maintenance');

    const [form, setForm] = useState({
        assetId: "",
        assetName: "",
        kitchen: "",
        engineerName: "",
        complaint: "",

        actionTaken: "",
        maintenanceCost: "",
        downtime: "",
        status: "",
        nextServiceDate: "",
    });

    const set = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };
    const Label = ({ children, required, hint }) => (
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
            {children}
            {required && <span className="text-red-500">*</span>}
            {hint && (
                <span className="w-3.5 h-3.5 rounded-full border border-gray-300 text-[9px] leading-3.25 text-gray-400 text-center font-semibold">
                    i
                </span>
            )}
        </label>
    );

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
            (option) => String(option.value ?? option) === String(value)
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

            // Clear old selected value when user starts searching
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
                                const optionValue = option.value ?? option;
                                const optionLabel = option.label ?? option;

                                const isSelected =
                                    String(value) === String(optionValue);

                                return (
                                    <button
                                        key={String(optionValue)}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelect(option)}
                                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 ${isSelected
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

    if (!canView || !canAdd) {
        return <AccessDenied pageTitle="Add Maintenance Log" />;
    }

    return (
       <Container>
         <div className='p-4 md:p-6'>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span>Asset Management</span>
                <ChevronRight size={12} />
                <span className="text-[#002246] font-medium">Add Maintenance Log</span>
            </div>
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold">
                        Maintenance Log Registration
                    </h1>

                    <p className="text-sm text-gray-500 mt-1">
                        Record maintenance activities performed on assets for tracking and
                        service history.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/assets/asset-maintenance">
                        <button
                            type="button"
                            className="flex items-center cursor-pointer gap-2 px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to List
                        </button>
                    </Link>

                    <button
                        type="button"
                        className="flex items-center cursor-pointer gap-2 px-5 py-2.5 rounded-lg bg-[#084E92] text-white font-medium hover:bg-[#073e77] transition"
                    >
                        <Save className="w-4 h-4" />
                        Save Maintenance Log
                    </button>
                </div>
            </div>

            <div className="mt-5 border rounded-2xl shadow-2xs flex flex-col border-t-5 border-indigo-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">

                    <div>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#084E92]">
                                <ClipboardList className="w-4 h-4" />
                            </div>

                            <h2 className="font-semibold text-gray-800">
                                Asset Information
                            </h2>
                        </div>

                        <div className="space-y-4">

                            {/* Asset ID */}
                            <div>
                                <Label required>Asset ID</Label>
                                <input
                                    className={inputCls}
                                    placeholder="e.g. AST-2023-001"
                                />
                            </div>

                            {/* Asset Name */}
                            <div>
                                <Label required>Asset Name</Label>

                                <Select
                                    value={form.assetName}
                                    onChange={(e) => set("assetName", e.target.value)}
                                    placeholder="Select Asset..."
                                    options={[
                                        "Deep Freezer",
                                        "Oven",
                                        "Air Conditioner",
                                        "Mixer Grinder"
                                    ]}
                                />
                            </div>

                            {/* Unit */}
                            <div>
                                <Label>Unit Name</Label>

                                <div className="relative">
                                    <Select
                                        value={form.kitchen}
                                        onChange={(e) => set("kitchen", e.target.value)}
                                        placeholder="Select Location..."
                                        options={[
                                            "Central Unit",
                                            "Unit A",
                                            "Unit B"
                                        ]}
                                    />

                                    <MapPin className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">

                                <div>
                                    <Label>Date</Label>

                                    <div className="relative">
                                        <input
                                            type="date"
                                            className={inputCls}
                                        />

                                        {/* <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /> */}
                                    </div>
                                </div>

                                <div>
                                    <Label>Engineer Name</Label>

                                    <input
                                        className={inputCls}
                                        placeholder="John Doe"
                                    />
                                </div>

                            </div>

                            {/* Complaint */}
                            <div>
                                <Label>Complaint Description</Label>

                                <textarea
                                    rows={5}
                                    placeholder="Describe the issue reported..."
                                    className={`${inputCls} resize-none`}
                                />
                            </div>

                        </div>
                    </div>

                    <div>

                        <div className="flex items-center gap-2 mb-5">

                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#084E92]">
                                <Wrench className="w-4 h-4" />
                            </div>

                            <h2 className="font-semibold text-gray-800">
                                Service Details
                            </h2>

                        </div>

                        <div className="space-y-4">

                            {/* Action */}
                            <div>
                                <Label>Action Taken</Label>

                                <textarea
                                    rows={4}
                                    className={`${inputCls} resize-none`}
                                    placeholder="Detail the repairs performed..."
                                />
                            </div>

                            {/* Cost + Downtime */}

                            <div className="grid grid-cols-2 gap-4">

                                <div>
                                    <Label>Maintenance Cost</Label>

                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                           ₹
                                        </span>

                                        <input
                                            className={`${inputCls} pl-7`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>Downtime (Hours)</Label>

                                    <div className="relative">
                                        <input
                                            className={`${inputCls} pr-12`}
                                            placeholder="e.g. 4.5"
                                        />

                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                            HRS
                                        </span>
                                    </div>
                                </div>

                            </div>

                            {/* Status + Next Service */}

                            <div className="grid grid-cols-2 gap-4">

                                <div>
                                    <Label>Status</Label>

                                    <Select
                                        value={form.status}
                                        onChange={(e) => set("status", e.target.value)}
                                        placeholder="Completed"
                                        options={[
                                            "Completed",
                                            "Pending",
                                            "In Progress"
                                        ]}
                                    />
                                </div>

                                <div>
                                    <Label>Next Service Date</Label>

                                    <input
                                        type="date"
                                        className={inputCls}
                                    />
                                </div>

                            </div>

                            {/* Information Box */}

                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex gap-3">

                                <Info className="w-5 h-5 text-[#084E92] mt-0.5" />

                                <p className="text-xs leading-5 text-gray-700">
                                    Maintenance history for this asset will be updated
                                    automatically upon saving this log. Notifications
                                    will be sent to the department head.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>
                {/* Footer Actions */}
                <div className="border-t border-[#DCE5EF] mt-8 p-6 mx-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">

                        {/* Left Side */}
                        <div className="flex items-center gap-6">
                           <Link to="/assets/asset-maintenance">
                            <button
                                type="button"
                                className="text-gray-600 cursor-pointer font-medium hover:text-gray-800 transition"
                            >
                                Cancel
                            </button>
                           </Link>

                            <button
                                type="button"
                                className="text-red-500 cursor-pointer font-medium hover:text-red-600 transition"
                            >
                                Reset
                            </button>
                        </div>

                        {/* Right Side */}
                        <div className="flex items-center gap-3 flex-col md:flex-row">

                            <button
                                type="button"
                                className="px-6 py-2.5 cursor-pointer rounded-lg text-sm  border border-[#084E92] text-[#084E92] font-semibold hover:bg-blue-50 transition"
                            >
                                Save & Add Another
                            </button>

                            <button
                                type="button"
                                className="px-6 py-2.5 cursor-pointer rounded-lg text-sm bg-[#084E92] text-white font-semibold hover:bg-[#073e77] transition"
                            >
                                Save Maintenance Log
                            </button>

                        </div>

                    </div>
                </div>
            </div>

        </div>
       </Container>
    )
}

export default AddAssetsMaintenanceLog;   

