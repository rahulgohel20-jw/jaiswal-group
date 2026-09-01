import React, { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { addState, getAllCountries, updateState } from "../../../services/apiServices";
import { notify } from "@/utils/toast";
import { getUserIdFromToken } from "../../../utils/auth";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';

const AddStateModel = ({ open, onClose, editData, onSuccess, isViewOnly = false }) => {
    const [countries, setCountries] = useState([]);
    const [form, setForm] = useState({
        name: "",
        countryId: "",
    });
    const [countrySearch, setCountrySearch] = useState("");
    const [countryOpen, setCountryOpen] = useState(false);

    const isEditMode = !!editData;

    useEffect(() => {
        if (!open) {
            setForm({ name: "", countryId: "" });
            setCountrySearch("");
            return;
        }

        if (editData) {
            setForm({
                name: editData.name ?? "",
                countryId: editData.countryId ? String(editData.countryId) : "",
            });
        } else {
            setForm({
                name: "",
                countryId: "",
            });
        }
    }, [open, editData]);

    useEffect(() => {
        if (!editData || countries.length === 0) return;

        const selectedCountry = countries.find(
            (country) => String(country.id) === String(editData.countryId)
        );

        if (selectedCountry) {
            setCountrySearch(selectedCountry.name || "");
        }
    }, [editData, countries]);


    useEffect(() => {
        if (!editData) {
            setCountrySearch("");
        }
    }, [editData]);

    useEffect(() => {
        if (!editData || countries.length === 0) return;

        const countryId = editData.country?.id;

        const selectedCountry = countries.find(
            (country) => String(country.id) === String(countryId)
        );

        if (selectedCountry) {
            setCountrySearch(selectedCountry.name || "");
        }
    }, [editData, countries]);

    const userId = getUserIdFromToken();

    const handleSave = async () => {
        try {
            if (!form.name.trim()) {
                notify.error("Enter state name");
                return;
            }

            if (!form.countryId) {
                notify.error("Select country");
                return;
            }

            const payload = {
                countryId: Number(form.countryId),
                name: form.name,
            };

            if (editData) {
                // id goes as a query param, payload as body
                await updateState(editData.id, payload);
            } else {
                await addState(payload);
            }

            onSuccess?.();
            onClose();

        } catch (err) {
            console.error(err);
        }
    };
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const res = await getAllCountries();

                const data = res?.data?.data || [];

                setCountries(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load countries", err);
            }
        };

        fetchCountries();
    }, []);

    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh] p-6">

                {/* Header */}
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-semibold">
                        {isViewOnly ? "View State Details" : editData ? "Update State" : "Create New State"}
                    </h2>

                    <X
                        className="cursor-pointer text-gray-500"
                        onClick={onClose}
                    />
                </div>

                {/* Form */}
                <div className="mt-2 grid grid-cols-1 gap-3">

                    {/* Country */}
                    <div>
                        <label className="block text-gray-700 mb-2 text-sm">
                            Select Country <span className="text-red-500">*</span>
                        </label>

                        <Popover
                            open={!isViewOnly && countryOpen}
                            onOpenChange={!isViewOnly ? setCountryOpen : undefined}
                            modal={false}
                        >
                            <PopoverTrigger asChild>
                                <div className="relative w-full">
                                    <Input
                                        type="text"
                                        value={countrySearch}
                                        placeholder="Select Country"
                                        disabled={isViewOnly}
                                        onClick={() => {
                                            if (!isViewOnly) setCountryOpen(true);
                                        }}
                                        onChange={(e) => {
                                            if (isViewOnly) return;
                                            setCountrySearch(e.target.value);
                                            setCountryOpen(true);

                                            if (form.countryId) {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    countryId: "",
                                                }));
                                            }
                                        }}
                                        className="w-full h-10 pr-10"
                                    />

                                    <ChevronDown
                                        size={16}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
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
                                    {countries
                                        .filter((item) =>
                                            item.name
                                                ?.toLowerCase()
                                                .includes(countrySearch.trim().toLowerCase())
                                        )
                                        .map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        countryId: String(item.id),
                                                    }));

                                                    setCountrySearch(item.name || "");
                                                    setCountryOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 ${String(form.countryId) === String(item.id)
                                                    ? "bg-blue-50 text-primary font-medium"
                                                    : "text-gray-700"
                                                    }`}
                                            >
                                                {item.name}
                                            </button>
                                        ))}

                                    {countries.filter((item) =>
                                        item.name
                                            ?.toLowerCase()
                                            .includes(countrySearch.trim().toLowerCase())
                                    ).length === 0 && (
                                            <div className="px-3 py-3 text-sm text-gray-500">
                                                No country found
                                            </div>
                                        )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-gray-700 mb-2 text-sm">
                            State Name <span className="text-red-500">*</span>
                        </label>

                        <input
                            type="text"
                            name="name"
                            disabled={isViewOnly}
                            value={form.name}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    name: e.target.value,
                                })
                            }
                            placeholder="Name.."
                            className="w-full border rounded px-4 py-2 outline-none disabled:bg-gray-50"
                        />
                    </div>

                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-4">

                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded bg-gray-200 cursor-pointer text-sm"
                    >
                        {isViewOnly ? "Close" : "Cancel"}
                    </button>

                    {!isViewOnly && (
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 rounded bg-[#084E92] text-white cursor-pointer text-sm"
                        >
                            Save
                        </button>
                    )}

                </div>

            </div>
        </div>
    )
}

export default AddStateModel