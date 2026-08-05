import React, { useRef, useState } from "react";
import { X, UploadCloud, Users, PackagePlus, Search } from "lucide-react";
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';



const emptyForm = {
    materialName: '',
    status: 'Active',
    category: '',
    unit: '',
    rate: '',
    dailyConsumption: '',
    priority: 'Low',
    expiryDate: '',
    openingBalance: '',
    closingQuantity: '',
    image: null,
};
const AddRawMaterialItemModal = ({ isOpen, onClose }) => {
    const [isFixedRawMaterial, setIsFixedRawMaterial] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [supplierName, setSupplierName] = useState('');
    const [suppliers, setSuppliers] = useState([]);

    const imageRef = useRef(null);
    if (!isOpen) return null;

    const set = (key, value) =>
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        set('image', file);
    };
    const imagePreview = form.image
        ? URL.createObjectURL(form.image)
        : null;

    const handleSaveSupplier = () => {
        // if (!supplierName.trim()) return;

        // setSuppliers((prev) => [...prev, supplierName]);

        setSupplierName('');
        setIsSupplierModalOpen(false);
    };
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
                                Add New Raw Material Item
                            </h2>

                            <p className="text-xs text-gray-500">
                                Configure material properties and supplier associations
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
                                value={form.materialName}
                                onChange={(e) => set("materialName", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">
                                Status
                            </label>

                            <Select
                                value={form.status}
                                onValueChange={(value) => set("status", value)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2 */}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <label className="text-sm font-medium">
                                Raw Material Category
                                <span className="text-red-500">*</span>
                            </label>

                            <Select
                                value={form.category}
                                onValueChange={(value) => set("category", value)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="food">
                                        Food Category
                                    </SelectItem>

                                    <SelectItem value="fuel">
                                        Fuel Category
                                    </SelectItem>

                                    <SelectItem value="beverage">
                                        Beverage Category
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">
                                Unit
                                <span className="text-red-500">*</span>
                            </label>

                            <Select
                                value={form.unit}
                                onValueChange={(value) => set("unit", value)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select Unit" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="kg">KG</SelectItem>
                                    <SelectItem value="gm">GM</SelectItem>
                                    <SelectItem value="ltr">LTR</SelectItem>
                                    <SelectItem value="pcs">PCS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">
                                Rate (Per Unit)
                            </label>

                            <Input
                                type="number"
                                placeholder="₹ 0.00"
                                className="mt-1"
                                value={form.rate}
                                onChange={(e) => set("rate", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Row 3 */}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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

                        <div>
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
                        </div>

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
                                value={form.openingBalance}
                                onChange={(e) =>
                                    set("openingBalance", e.target.value)
                                }
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">
                                Closing Quantity
                            </label>

                            <Input
                                type="number"
                                placeholder="0"
                                className="mt-1"
                                value={form.closingQuantity}
                                onChange={(e) =>
                                    set("closingQuantity", e.target.value)
                                }
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
                            {form.image ? (
                                <div className="flex flex-col items-center gap-3">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-28 h-28 rounded-lg object-cover"
                                    />

                                    <span className="text-sm text-gray-600">
                                        {form.image.name}
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
                                onClick={() => setIsFixedRawMaterial(!isFixedRawMaterial)}
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
                        <button className="border border-[#00376C] text-[#00376C] px-5 py-2 rounded-lg cursor-pointer">
                            Save as Draft
                        </button>

                        <button className="bg-[#00376C] text-white px-5 py-2 rounded-lg cursor-pointer">
                            Save Material
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