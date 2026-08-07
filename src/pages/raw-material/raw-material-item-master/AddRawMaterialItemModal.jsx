import React, { useEffect, useRef, useState } from "react";
import { X, UploadCloud, Users, PackagePlus, Search } from "lucide-react";
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getUserIdFromToken } from "../../../utils/auth";
import { addRawMaterialItem, getAllRawMaterialCategory, getAllRawMaterialUnits, updateRawMaterialItem } from "../../../services/apiServices";



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

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };
    useEffect(() => {
        const loadDropdowns = async () => {
            try {
                const [unitRes, categoryRes] = await Promise.all([
                    getAllRawMaterialUnits(),
                    getAllRawMaterialCategory(1),
                ]);
                setUnits(
                    unitRes?.data?.data["Unit Details"] ||
                    unitRes?.data?.data ||
                    []
                );

                setCategories(
                    categoryRes?.data?.data?.["Raw Material Category Details"] ||
                    categoryRes?.data?.data ||
                    []
                );
            } catch (err) {
                console.error(err);
            }
        };

        if (isOpen) {
            loadDropdowns();
        }
    }, [isOpen]);

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
                    editData.unit?.id || ""
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
    }, [editData]);

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
            onClose();
            setForm(emptyForm);

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

                    <button onClick={onClose} className="cursor-pointer">
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

                            <Select
                                value={String(form.rawMaterialCatId || "")}
                                onValueChange={(value) => set("rawMaterialCatId", value)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>

                                <SelectContent>
                                    {categories.map((item) => (
                                        <SelectItem
                                            key={item.id}
                                            value={String(item.id)}
                                        >
                                            {item.nameEnglish}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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

                            <Select
                                value={String(form.unitId || "")}
                                onValueChange={(value) => set("unitId", value)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select Unit" />
                                </SelectTrigger>

                                <SelectContent>
                                    {units.map((item) => (
                                        <SelectItem
                                            key={item.id}
                                            value={String(item.id)}
                                        >
                                            {item.nameEnglish}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                onChange={(e) => set("supplierRate", e.target.value)}
                            />
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
                                onChange={(e) =>
                                    set("dailyConsumption", e.target.value)
                                }
                            />
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
                        <button onClick={onClose} className="border border-[#00376C] text-[#00376C] px-5 py-2 rounded-lg cursor-pointer">
                            Cancle
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
        </div>
    );
};

export default AddRawMaterialItemModal;