import React, { useEffect, useRef, useState } from "react";
import { X, UploadCloud, Users, PackagePlus, Search, Plus, ChevronDown } from "lucide-react";
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { getUserIdFromToken } from "../../../utils/auth";
import { addRawMaterialItem, getAllRawMaterialCategory, getAllRawMaterialUnits, updateRawMaterialItem } from "../../../services/apiServices";
import AddRawMaterialCategoryModal from "../row-material-categories/AddRowMaterialCategoryModel";
import AddRawMaterialUnit from "../raw-material-unit-master/AddRawMaterialUnit";



const emptyForm = {
    nameEnglish: "",
    rawMaterialCatId: "",
    status: "Active",
    unitId: "",
    supplierRate: "",
    dailyConsumption: "",
    expiryDate: "",
    opbStock: "",
    minStock: "",
    minOrder: "",
    sequence: "",
    weightPer100Pax: "",
    isGeneralFix: false,
    isApplyCal: false,
    file: null,
    imageUrl: "",
};
const AddRawMaterialItemModal = ({ isOpen, onClose, editData = null, fetchRawMaterialList, fetchStats }) => {
    const [isFixedRawMaterial, setIsFixedRawMaterial] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [supplierName, setSupplierName] = useState('');
    const [suppliers, setSuppliers] = useState([]);
    const [units, setUnits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [errors, setErrors] = useState({});
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [unitSearch, setUnitSearch] = useState("");
    const [categorySearch, setCategorySearch] = useState("");
    const [unitOpen, setUnitOpen] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);

    const handleClose = () => {
        setForm(emptyForm);
        setErrors({});
        setCategorySearch("");
        setUnitSearch("");
        setIsFixedRawMaterial(false);
        onClose();
    };
    const validate = () => {
        const newErrors = {};

        if (!form.nameEnglish.trim()) {
            newErrors.nameEnglish = "Raw Material Name is required";
        }

        if (!form.rawMaterialCatId) {
            newErrors.rawMaterialCatId = "Raw Material Category is required";
        }

        if (!form.unitId) {
            newErrors.unitId = "Unit is required";
        }

        if (form.supplierRate !== "" && Number(form.supplierRate) < 0) {
            newErrors.supplierRate = "Rate must be positive";
        }

        // Daily Consumption validation
        if (
            form.dailyConsumption !== "" &&
            Number(form.dailyConsumption) < 0
        ) {
            newErrors.dailyConsumption = "Daily Consumption must be positive";
        }
        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };
    const fetchUnits = async (editUnit = null) => {
        try {
            const res = await getAllRawMaterialUnits();
            const unitData =
                res?.data?.data?.["Unit Details"] ||
                res?.data?.data ||
                [];

            let activeList = unitData.filter((item) => item.isActive === true);

            if (editUnit && !activeList.some((u) => u.id === editUnit.id)) {
                activeList = [...activeList, editUnit];
            }

            setUnits(activeList);
        } catch (err) {
            console.error("Failed to load units:", err);
        }
    };

    const fetchCategories = async (editCategory = null) => {
        try {
            const res = await getAllRawMaterialCategory();
            const categoryData =
                res?.data?.data?.["Raw Material Category Details"] ||
                res?.data?.data ||
                [];

            let activeList = categoryData.filter((item) => item.isActive === true);

            if (editCategory && !activeList.some((c) => c.id === editCategory.id)) {
                activeList = [...activeList, editCategory];
            }

            setCategories(activeList);
        } catch (err) {
            console.error("Failed to load categories:", err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchUnits(editData?.unit || null);
            fetchCategories(editData?.rawMaterialCat || null);
        }
    }, [isOpen, editData]);

    const userId = getUserIdFromToken();

    const imageRef = useRef(null);
    const set = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));


        setErrors((prev) => ({
            ...prev,
            [key]: "",
        }));
    };
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        set('file', file);
    };
    const imagePreview = form.file
        ? URL.createObjectURL(form.file)
        : form.imageUrl;

    const handleSaveSupplier = () => {
        // if (!supplierName.trim()) return;

        // setSuppliers((prev) => [...prev, supplierName]);

        setSupplierName('');
        setIsSupplierModalOpen(false);
    };

    useEffect(() => {
        if (editData) {
            setForm({
                nameEnglish: editData.nameEnglish || "",
                rawMaterialCatId: String(
                    editData.rawMaterialCat?.id || ""
                ),
                unitId: String(
                    editData.unit?.id ??
                    editData.unitId ??
                    ""
                ),
                supplierRate: editData.supplierRate ?? "",
                status: editData.isActive ? "Active" : "Inactive",
                dailyConsumption: editData.dailyConsumption ?? "",

                expiryDate: editData.expiryDate
                    ? editData.expiryDate.split("/").reverse().join("-")
                    : "",
                opbStock: editData.opbStock ?? "",
                minStock: editData.minStock ?? "",
                minOrder: editData.minOrder ?? "",
                sequence: editData.sequence ?? "",
                weightPer100Pax: editData.weightPer100Pax ?? "",
                isGeneralFix: editData.isGeneralFix ?? false,
                isApplyCal: editData.isApplyCal ?? false,
                file: null,
                imageUrl: editData.file || "",
            });

            setIsFixedRawMaterial(editData.isGeneralFix ?? false);

        } else {
            setForm(emptyForm);
            setIsFixedRawMaterial(false);
        }

    }, [editData?.id]);

    useEffect(() => {
        if (!editData) return;

        const catId = editData.rawMaterialCat?.id ?? editData.rawMaterialCatId ?? "";
        const unitId = editData.unit?.id ?? editData.unitId ?? "";

        const selectedCategory = categories.find((item) => String(item.id) === String(catId));
        const selectedUnit = units.find((item) => String(item.id) === String(unitId));

        if (selectedCategory) setCategorySearch(selectedCategory.nameEnglish || "");
        if (selectedUnit) setUnitSearch(selectedUnit.nameEnglish || "");
    }, [editData, categories, units]);

    const handleSave = async () => {
        if (!validate()) return;
        try {

            const formData = new FormData();

            formData.append("nameEnglish", form.nameEnglish);
            formData.append("rawMaterialCatId", Number(form.rawMaterialCatId));
            formData.append("unitId", Number(form.unitId));
            formData.append("supplierRate", form.supplierRate);
            formData.append("dailyConsumption", form.dailyConsumption);
            let expiryDate = "";

            if (form.expiryDate) {
                const [year, month, day] = form.expiryDate.split("-");
                expiryDate = `${day}/${month}/${year}`;
            }

            formData.append("expiryDate", expiryDate);
            if (form.minStock !== "") {
                formData.append("minStock", Number(form.minStock));
            }

            if (form.closingStock !== "") {
                formData.append("closingStock", Number(form.closingStock));
            }

            if (form.sequence !== "") {
                formData.append("sequence", Number(form.sequence));
            }

            if (form.weightPer100Pax !== "") {
                formData.append("weightPer100Pax", Number(form.weightPer100Pax));
            }

            if (form.opbStock !== "") {
                formData.append("opbStock", Number(form.opbStock));
            }

            formData.append("isGeneralFix", form.isGeneralFix);
            formData.append("isApplyCal", form.isApplyCal);
            formData.append("userId", userId);

            if (form.file) {
                formData.append("file", form.file);
            }

            if (editData?.id) {
                formData.append("id", editData.id);
                await updateRawMaterialItem(formData);
            } else {
                await addRawMaterialItem(formData);
            }

            await fetchRawMaterialList?.();
            await fetchStats?.();
            handleClose()

        } catch (err) {
            console.error(err);
        }
    };
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-8">
            <div className="bg-white w-full max-w-3xl h-[95vh] sm:h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col">

                {/* Header */}

                <div className="flex justify-between items-center p-5 border-b border-[#C3C6D1]">
                    <div className="flex gap-2 items-center">
                        <div className="w-10 h-10 bg-[#00376C] text-[#7CA2DD] flex items-center justify-center rounded-xl">
                            <PackagePlus />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#00376C]">
                                {editData ? "Edit Raw Material Item" : "Add New Raw Material Item"}
                            </h2>

                            <p className="text-xs text-gray-500">
                                {editData
                                    ? "Update material properties and supplier associations"
                                    : "Configure material properties and supplier associations"}
                            </p>
                        </div>
                    </div>

                    <button onClick={handleClose} className="cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}

                <div className="p-6 flex-1 overflow-y-auto">

                    {/* Row 1 */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">
                                Raw Material Name
                                <span className="text-red-500">*</span>
                            </label>

                            <Input
                                placeholder="e.g. High-Grade Aluminum Ingots"
                                className="mt-1"
                                value={form.nameEnglish}
                                onChange={(e) => set("nameEnglish", e.target.value)}
                            />
                            {errors.nameEnglish && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.nameEnglish}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium">
                                Raw Material Category
                                <span className="text-red-500">*</span>
                            </label>

                            <div className="flex gap-2 items-center mt-1">
                                {/* Category Search Dropdown */}
                                <div className="flex-1 min-w-0">
                                    <Popover
                                        open={categoryOpen}
                                        onOpenChange={setCategoryOpen}
                                        modal={false}
                                    >
                                        <PopoverTrigger asChild>
                                            <div className="relative w-full">
                                                <Input
                                                    type="text"
                                                    value={categorySearch}
                                                    placeholder="Select Category"
                                                    onClick={() => setCategoryOpen(true)}
                                                    onChange={(e) => {
                                                        setCategorySearch(e.target.value);
                                                        setCategoryOpen(true);
                                                    }}
                                                    className="w-full h-8.5 pr-10 py-1"
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
                                            className="p-0 w-[var(--radix-popover-trigger-width)] overflow-hidden z-[100]"
                                        >
                                            <div className="max-h-52 overflow-y-auto">
                                                {categories
                                                    .filter((item) =>
                                                        item.nameEnglish
                                                            ?.toLowerCase()
                                                            .includes(
                                                                categorySearch.trim().toLowerCase()
                                                            )
                                                    )
                                                    .map((item) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                set(
                                                                    "rawMaterialCatId",
                                                                    String(item.id)
                                                                );

                                                                setCategorySearch(
                                                                    item.nameEnglish || ""
                                                                );

                                                                setCategoryOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 ${String(form.rawMaterialCatId) ===
                                                                String(item.id)
                                                                ? "bg-blue-50 text-primary font-medium"
                                                                : "text-gray-700"
                                                                }`}
                                                        >
                                                            {item.nameEnglish}
                                                        </button>
                                                    ))}

                                                {categories.filter((item) =>
                                                    item.nameEnglish
                                                        ?.toLowerCase()
                                                        .includes(
                                                            categorySearch.trim().toLowerCase()
                                                        )
                                                ).length === 0 && (
                                                        <div className="px-3 py-3 text-sm text-gray-500">
                                                            No category found
                                                        </div>
                                                    )}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Plus Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="w-8.5 h-8.5 border border-[#C3C6D1] rounded-lg hover:bg-gray-50 flex items-center justify-center cursor-pointer text-primary shrink-0"
                                    title="Add New Category"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>

                            {errors.rawMaterialCatId && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.rawMaterialCatId}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Row 2 */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

                        <div>
                            <label className="text-sm font-medium">
                                Unit
                                <span className="text-red-500">*</span>
                            </label>

                            <div className="flex gap-2 items-center mt-1">
                                {/* Unit Search Dropdown */}
                                <div className="flex-1 min-w-0">
                                    <Popover
                                        open={unitOpen}
                                        onOpenChange={setUnitOpen}
                                        modal={false}
                                    >
                                        <PopoverTrigger asChild>
                                            <div className="relative w-full">
                                                <Input
                                                    type="text"
                                                    value={unitSearch}
                                                    placeholder="Select Unit"
                                                    onClick={() => setUnitOpen(true)}
                                                    onChange={(e) => {
                                                        setUnitSearch(e.target.value);
                                                        setUnitOpen(true);
                                                    }}
                                                    className="w-full h-8.5 pr-10"
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
                                            className="p-0 w-[var(--radix-popover-trigger-width)] overflow-hidden z-[100]"
                                        >
                                            <div className="max-h-52 overflow-y-auto">
                                                {units
                                                    .filter((item) =>
                                                        item.nameEnglish
                                                            ?.toLowerCase()
                                                            .includes(
                                                                unitSearch.trim().toLowerCase()
                                                            )
                                                    )
                                                    .map((item) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                set(
                                                                    "unitId",
                                                                    String(item.id)
                                                                );

                                                                setUnitSearch(
                                                                    item.nameEnglish || ""
                                                                );

                                                                setUnitOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 ${String(form.unitId) ===
                                                                String(item.id)
                                                                ? "bg-blue-50 text-primary font-medium"
                                                                : "text-gray-700"
                                                                }`}
                                                        >
                                                            {item.nameEnglish}
                                                        </button>
                                                    ))}

                                                {units.filter((item) =>
                                                    item.nameEnglish
                                                        ?.toLowerCase()
                                                        .includes(
                                                            unitSearch.trim().toLowerCase()
                                                        )
                                                ).length === 0 && (
                                                        <div className="px-3 py-3 text-sm text-gray-500">
                                                            No unit found
                                                        </div>
                                                    )}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Plus Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsUnitModalOpen(true)}
                                    className="w-8.5 h-8.5 border border-[#C3C6D1] rounded-lg hover:bg-gray-50 flex items-center justify-center cursor-pointer text-primary shrink-0"
                                    title="Add New Unit"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>

                            {errors.unitId && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.unitId}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium">
                                Rate (Per Unit)
                            </label>

                            <Input
                                type="number"
                                placeholder="₹ 0.00"
                                className="mt-1"
                                value={form.supplierRate}
                                onWheel={(e) => e.currentTarget.blur()}
                                onChange={(e) => set("supplierRate", e.target.value)}
                            />
                            {errors.supplierRate && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.supplierRate}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Row 3 */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="text-sm font-medium">
                                Daily Consumption
                            </label>

                            <Input
                                type="number"
                                placeholder="0"
                                className="mt-1"
                                value={form.dailyConsumption}
                                onWheel={(e) => e.currentTarget.blur()}
                                onChange={(e) =>
                                    set("dailyConsumption", e.target.value)
                                }
                            />
                            {errors.dailyConsumption && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.dailyConsumption}
                                </p>
                            )}
                        </div>

                        {/* <div>
                            <label className="text-sm font-medium">
                                Priority
                            </label>

                            <div className="grid grid-cols-3 mt-1 border rounded-md overflow-hidden bg-[#EFF4FF]">
                                {['Low', 'Med', 'High'].map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => set('priority', item)}
                                        className={`py-1 m-1 rounded text-sm transition-all cursor-pointer ${form.priority === item
                                            ? 'bg-[#D9E3F6] text-primary font-medium'
                                            : ' hover:bg-gray-50'
                                            }`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div> */}

                        <div>
                            <label className="text-sm font-medium">
                                Expiry Date
                            </label>

                            <Input
                                type="date"
                                className="mt-1"
                                value={form.expiryDate}
                                onChange={(e) =>
                                    set("expiryDate", e.target.value)
                                }
                            />
                        </div>
                    </div>

                    {/* Row 4 */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="text-sm font-medium">
                                Opening Balance
                            </label>

                            <Input
                                type="number"
                                placeholder="0"
                                className="mt-1"
                                value={form.opbStock}
                                onChange={(e) =>
                                    set("opbStock", e.target.value)
                                }
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Minimum Stock</label>

                            <Input
                                type="number"
                                value={form.minStock}
                                className="mt-1"
                                onChange={(e) => set("minStock", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Upload */}

                    <div className="col-span-full">
                        <label className="text-sm font-medium">
                            Raw Material Image
                        </label>

                        <div
                            onClick={() => imageRef.current?.click()}
                            className="mt-2 border-2 border-dashed border-[#C3C6D199] bg-gray-50 rounded-xl h-52 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                            {form.file ? (
                                <div className="flex flex-col items-center gap-3">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-28 h-28 rounded-lg object-cover"
                                    />

                                    <span className="text-sm text-gray-600">
                                        {form.file.name}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="w-14 h-14 rounded-full bg-[#DEE9FC] flex items-center justify-center">
                                        <UploadCloud className="h-7 w-7 text-primary" />
                                    </div>

                                    <p className="mt-3 text-sm font-medium">
                                        Click or drag and drop to upload
                                    </p>

                                    <p className="text-xs text-gray-500 mt-1">
                                        PNG, JPG or WEBP (Max. 5MB)
                                    </p>
                                </>
                            )}
                        </div>

                        <input
                            ref={imageRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="hidden"
                            onChange={handleImageChange}
                        />
                    </div>
                    {/* Toggle Card */}
                    <div className="mt-6 bg-[#EEF4FF] border border-[#C3C6D1] rounded-xl p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium">
                                    General Fix Raw Material
                                </h4>

                                <p className="text-xs text-gray-500">
                                    Enable for standardized consumption items
                                </p>
                            </div>

                            {/* Toggle */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFixedRawMaterial(!isFixedRawMaterial);
                                    set("isGeneralFix", !isFixedRawMaterial);
                                }}
                                className={`w-12 h-6 rounded-full cursor-pointer flex items-center transition-all duration-300 p-1 ${isFixedRawMaterial ? "bg-[#00376C]" : "bg-gray-300"}`}
                            >
                                <span
                                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-300 ${isFixedRawMaterial ? "translate-x-6" : "translate-x-0"}`}
                                />
                            </button>
                        </div>


                        {isFixedRawMaterial && (
                            <div className="mt-4">
                                <label className="text-sm">
                                    Weight Per 100 Person
                                </label>

                                <input
                                    value={form.weightPer100Pax}
                                    onChange={(e) => set("weightPer100Pax", e.target.value)}
                                    type="number"
                                    placeholder="Enter weight"
                                    className="w-full mt-2 border rounded-lg px-3 py-2 outline-none bg-[#FFFFFF]"
                                />
                            </div>
                        )}
                    </div>

                    {/* Supplier Section */}

                    <div className="mt-8">
                        <h3 className="font-semibold text-[#00376C] mb-4">
                            Supplier Association
                        </h3>

                        <div className="flex gap-3 w-full justify-between flex-col sm:flex-row">
                            <div className="flex gap-2 bg-[#EBEDF0] w-full sm:w-[75%] items-center px-3 border rounded-lg">
                                <Search className="text-[#94A3B8]" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search and add supplier..."
                                    className="flex-1  px-3 py-2 outline-none "
                                />

                            </div>

                            <button onClick={() => setIsSupplierModalOpen(true)}
                                className="bg-[#00376C] text-white px-5 py-3 text-sm rounded-lg flex items-center gap-2 cursor-pointer">
                                <Users size={16} />
                                Add Supplier
                            </button>
                        </div>

                        <div className="border rounded-xl min-h-40 mt-4 p-4">
                            {suppliers.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {suppliers.map((supplier, index) => (
                                        <div
                                            key={index}
                                            className="bg-[#EEF4FF] border border-[#C3C6D1] px-3 py-2 rounded-lg text-sm"
                                        >
                                            {supplier}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-32 flex flex-col justify-center items-center">
                                    <h4 className="font-semibold text-[#00376C]">
                                        No suppliers linked yet
                                    </h4>

                                    <p className="text-sm text-gray-500">
                                        Link suppliers to this material to automate procurement workflows.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}

                <div className="border-t p-5 flex justify-end bg-[#EFF4FF] border border-[#C3C6D1] flex-col sm:flex-row gap-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <button onClick={handleClose} className="border border-[#00376C] text-[#00376C] px-5 py-2 rounded-lg cursor-pointer">
                            Cancel
                        </button>

                        <button
                            onClick={handleSave}
                            className="bg-[#00376C] text-white px-5 py-2 rounded-lg cursor-pointer">
                            {editData ? "Update Material" : "Save Material"}
                        </button>
                    </div>
                </div>
            </div>

            {isSupplierModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur flex items-center justify-center z-60">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden">

                        <div className="flex items-center justify-between p-5 border-b">
                            <div>
                                <h3 className="font-semibold text-lg">
                                    Add Supplier
                                </h3>

                                <p className="text-sm text-gray-500">
                                    Configure a new Supplier.
                                </p>
                            </div>

                            <button
                                className="cursor-pointer"
                                onClick={() => setIsSupplierModalOpen(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5">
                            <label className="text-sm font-medium">
                                Supplier
                            </label>

                            <div className="flex gap-2 mt-2">
                                <Input
                                    placeholder="Supplier Name"
                                    value={supplierName}
                                    onChange={(e) =>
                                        setSupplierName(e.target.value)
                                    }
                                />

                                <button
                                    onClick={handleSaveSupplier}
                                    className="w-9 h-9 rounded-full bg-[#00376C] text-white flex items-center justify-center shrink-0"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="border-t p-5 flex justify-end gap-3">
                            <button
                                onClick={() => setIsSupplierModalOpen(false)}
                                className="border px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleSaveSupplier}
                                className="text-[#084E92] px-4 py-2 rounded-lg border-2 border-[#084E9233] cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                            >
                                Save & Add Another
                            </button>

                            <button
                                onClick={handleSaveSupplier}
                                className="bg-[#00376C] text-white px-4 py-2 rounded-lg cursor-pointer"
                            >
                                Save Supplier
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {isCategoryModalOpen && (
                <AddRawMaterialCategoryModal
                    isOpen={isCategoryModalOpen}
                    onClose={() => setIsCategoryModalOpen(false)}
                    onSaved={fetchCategories}
                />
            )}

            {isUnitModalOpen && (
                <AddRawMaterialUnit
                    isOpen={isUnitModalOpen}
                    onClose={() => setIsUnitModalOpen(false)}
                    onSaved={fetchUnits}
                />
            )}
        </div>
    );
};

export default AddRawMaterialItemModal;