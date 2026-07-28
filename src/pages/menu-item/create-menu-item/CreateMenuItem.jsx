import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, FileText, Image, Layers, Menu, Plus, UploadCloud } from "lucide-react";
import CreateSubCategory from "../menu-subcategory/CreateSubCategory";
import CreateMenuCategory from "../menu-category/CreateMenuCategory";
import { Link, useNavigate, useParams } from "react-router";
import { addMenuItem, getAllMenuCategory, getAllMenuSubCategoryById, getMenuItemById, updateMenuItem } from "../../../services/apiServices";
import { notify } from "@/utils/toast";
import { getUserIdFromToken } from "../../../utils/auth";
import { Container } from "@/components/common/container";

const inputCls =
    'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
    'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const errorInputCls =
    'w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
    'placeholder-gray-400 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-300';

const Label = ({ children, required }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {children}
        {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

const Select = ({ value, onChange, placeholder, options, hasError }) => (
    <div className="relative">
        <select
            value={value}
            onChange={onChange}
            className={`${hasError ? errorInputCls : inputCls} appearance-none pr-9 cursor-pointer ${value === '' ? 'text-gray-400' : 'text-gray-800'
                }`}
        >
            <option value="" disabled>
                {placeholder}
            </option>
            {options.map((opt) => (
                <option key={opt} value={opt} className="text-gray-800">
                    {opt}
                </option>
            ))}
        </select>
        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
);



const SectionCard = ({ children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
        {children}
    </div>
);


const SectionHeader = ({ icon: Icon, title, subtitle, open, onToggle }) => (
    <div
        className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 cursor-pointer select-none"
        onClick={onToggle}
    >
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
            <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
            <h2 className="text-sm font-bold text-gray-800 leading-none">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
        >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
    </div>
);

const CreateMenuItem = () => {
    const [openCategory, setOpenCategory] = useState(false);
    const [openSubCategory, setSubOpenCategory] = useState(false);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedSubCategory, setSelectedSubCategory] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const { id } = useParams();
    const isEdit = !!id;

    const navigate = useNavigate();

    const [openSections, setOpenSections] = useState({
        basic: true,
        category: true,
        details: true,
        image: true
    });


    const toggleSection = (key) => {
        setOpenSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const initialForm = {
        nameEnglish: "",
        nameHindi: "",
        nameGujarati: "",
        slogan: "",
        price: "",
        sequence: "",
        remarks: "",
        instructionEnglish: "",
        instructionHindi: "",
        instructionGujarati: "",
        url: "",
        dishCosting: "",
        totalRate: "",
    };

    const [form, setForm] = useState(initialForm);
    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };
    const handleImageChange = (e) => {
        const file = e.target.files[0];

        if (!file) return;

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const userId = getUserIdFromToken();

    const fetchMenuItemById = useCallback(async () => {
        try {
            const res = await getMenuItemById(id);

            const item =
                res?.data?.data?.["Menu Item Details"] ||
                res?.data?.data ||
                res?.data;

            if (!item) return;

            setForm({
                nameEnglish: item.nameEnglish || "",
                nameHindi: item.nameHindi || "",
                nameGujarati: item.nameGujarati || "",
                slogan: item.slogan || "",
                price: item.price || "",
                sequence: item.sequence || "",
                remarks: item.remarks || "",
                instructionEnglish: item.instructionEnglish || "",
                instructionHindi: item.instructionHindi || "",
                instructionGujarati: item.instructionGujarati || "",
                url: item.url || "",
                dishCosting: item.dishCosting || "",
                totalRate: item.totalRate || "",
            });

            setSelectedCategory(item.menuCategory?.id?.toString() || "");
            setSelectedSubCategory(item.menuSubCategory?.id?.toString() || "");

            if (item.imagePath) {
                setImagePreview(item.imagePath);
            }
        } catch (err) {
            console.error(err);
            notify.error("Failed to load Menu Item");
        }
    }, [id]);
    useEffect(() => {
        if (isEdit) {
            fetchMenuItemById();
        }
    }, [isEdit, fetchMenuItemById]);


    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await getAllMenuCategory();
                const data =
                    res.data.data['Menu Category Details'] ||
                    [];
                setCategories(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load categories", err);
                notify.error("Failed to load categories")
            }
        };

        fetchCategories();
    }, []);

    const fetchSubCategories = useCallback(async () => {
        try {
            const res = await getAllMenuSubCategoryById(userId);

            const payload = res?.data?.data ?? res?.data ?? res;

            const rawList = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.["Menu Sub Category Details"])
                    ? payload["Menu Sub Category Details"]
                    : [];

            const list = rawList.map(item => ({
                id: item.id,
                name: item.nameEnglish ?? item.name ?? "",
                menuCategoryId: item.menuCategory?.id,
            }));

            setSubCategories(list);
        } catch (err) {
            console.error(err);
            setSubCategories([]);
        }
    }, [userId]);

    const filteredSubCategories = selectedCategory
        ? subCategories.filter(
            (item) => String(item.menuCategoryId) === String(selectedCategory)
        )
        : [];
    useEffect(() => {
        fetchSubCategories();
    }, [fetchSubCategories]);

    const handleSave = async () => {
        try {
            if (!form.nameEnglish) {
                notify.error("Name required. Please Enter name")
                return;
            }
            if (!selectedCategory) {
                notify.error("Please Select Category")
                return;
            }
            if (!form.instructionEnglish) {
                notify.error("Instruction required")
                return;
            }
            const formData = new FormData();

            formData.append("nameEnglish", form.nameEnglish);
            formData.append("nameHindi", form.nameHindi || "");
            formData.append("nameGujarati", form.nameGujarati || "");
            formData.append("slogan", form.slogan || "");
            formData.append("price", form.price || 0);
            formData.append("sequence", form.sequence || 0);
            formData.append("remarks", form.remarks || "");
            formData.append("instructionEnglish", form.instructionEnglish);
            formData.append("instructionHindi", form.instructionHindi || "");
            formData.append("instructionGujarati", form.instructionGujarati || "");
            formData.append("menuCategoryId", selectedCategory);
            formData.append("menuSubCategoryId", selectedSubCategory);
            formData.append("url", form.url || "");
            formData.append("dishCosting", form.dishCosting || "");
            formData.append("totalRate", form.totalRate || 0);
            formData.append("userId", userId);

            if (imageFile) {
                formData.append("file", imageFile);
            }

            if (isEdit) {
                await updateMenuItem(id, formData);
                notify.success("Menu Item updated successfully");
            } else {
                await addMenuItem(formData);
                notify.success("Menu Item created successfully");
            }
            setForm(initialForm);
            setSelectedCategory("");
            setSelectedSubCategory("");
            setImageFile(null);
            setImagePreview(null);
            navigate("/menu-item/menu-items")
        } catch (err) {
            console.error(err);
            notify.error(`Failed to ${isEdit ? 'update' : 'Create'} Menu Item`);
        }
    };
    return (
        <Container>
            <div className="mx-4 min-h-screen p-2">

            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl md:text-4xl text-[#084E92] font-semibold">
                    {isEdit ? "Update Menu Item" : "Create Menu Item"}
                </h1>

                <p className="text-[#43474F]">
                    {isEdit
                        ? "Update menu item details."
                        : "Create a new menu item for your organization."
                    }
                </p>
            </div>

            {/* Basic Information */}
            <SectionCard className="mt-4">

                <SectionHeader
                    icon={Menu}
                    title="Basic Information"
                    open={openSections.basic}
                    onToggle={() => toggleSection("basic")}
                />
                {openSections.basic && (
                    <div className="px-6 py-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Name */}
                            <div className="col-span-2">
                                <Label required>Name</Label>

                                <input
                                    name="nameEnglish"
                                    value={form.nameEnglish}
                                    onChange={handleChange}
                                    placeholder="Enter Name"
                                    className={inputCls}
                                />
                            </div>
                            {/* Slogan */}
                            <div className="col-span-2">
                                <Label>Slogan</Label>

                                <input
                                    name="slogan"
                                    value={form.slogan}
                                    onChange={handleChange}
                                    placeholder="Enter Slogan"
                                    className={inputCls}
                                />
                            </div>
                            {/* Price */}
                            <div>
                                <Label>Price</Label>

                                <input
                                    name="price"
                                    value={form.price}
                                    onChange={handleChange}
                                    type="number"
                                    placeholder="Enter Price"
                                    className={inputCls}
                                />
                            </div>
                            {/* Sequence */}
                            <div>
                                <Label>Sequence</Label>
                                <input
                                    name="sequence"
                                    value={form.sequence}
                                    onChange={handleChange}
                                    type="number"
                                    placeholder="Enter Sequence"
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </SectionCard>

            {/* Category Information */}
            <SectionCard className="mt-4">
                <SectionHeader
                    icon={Layers}
                    title="Category Information"
                    open={openSections.category}
                    onToggle={() => toggleSection("category")}
                />
                {openSections.category && (
                    <div className="px-6 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Category */}
                            <div>
                                <Label required>
                                    Category
                                </Label>
                                <div className="flex gap-2">

                                    <div className="flex-1 border rounded-lg px-4 py-2">
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => {
                                                setSelectedCategory(e.target.value);
                                                setSelectedSubCategory("");
                                            }}
                                            className="w-full outline-none"
                                        >
                                            <option>
                                                Select Category
                                            </option>
                                            {categories.map(category => (
                                                <option
                                                    key={category.id}
                                                    value={category.id}
                                                >
                                                    {category.nameEnglish}
                                                </option>
                                            ))}

                                        </select>
                                    </div>
                                    <button
                                        onClick={() => setOpenCategory(true)}
                                        className="w-10 h-10 bg-[#084E92] rounded-lg text-white flex items-center justify-center"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>
                            {/* Sub Category */}
                            <div>
                                <Label>
                                    Sub Category
                                </Label>
                                <div className="flex gap-2">
                                    <div className="flex-1 border rounded-lg px-4 py-2">
                                        <select
                                            value={selectedSubCategory}
                                            onChange={(e) => setSelectedSubCategory(e.target.value)}
                                            className="w-full outline-none"
                                        >
                                            <option>
                                                Select Sub Category
                                            </option>
                                            {filteredSubCategories.map(sub => (
                                                <option
                                                    key={sub.id}
                                                    value={sub.id}
                                                >
                                                    {sub.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => setSubOpenCategory(true)}
                                        className="w-10 h-10 bg-[#084E92] rounded-lg text-white flex items-center justify-center"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </SectionCard>
            {/* Image Section */}
            <SectionCard className="mt-4">
                <SectionHeader
                    icon={Image}
                    title="Menu Image"
                    open={openSections.image}
                    onToggle={() => toggleSection("image")}
                />
                {openSections.image && (
                    <div className="px-6 py-6">
                        <Label>
                            Upload Image
                        </Label>
                        <input
                            type="file"
                            id="menuImage"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                        <label
                            htmlFor="menuImage"
                            className="border-2 border-dashed border-gray-300 rounded-xl min-h-40 flex items-center justify-center cursor-pointer hover:border-[#084E92]"
                        >
                            {imagePreview ? (
                                <div className="flex gap-4 items-center p-4">
                                    <img
                                        src={imagePreview}
                                        className="w-24 h-24 rounded-lg object-cover"
                                    />
                                    <div>
                                        <p className="font-medium">
                                            {imageFile?.name}
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            Click to change image
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500">
                                    <UploadCloud
                                        size={40}
                                        className="mx-auto text-[#084E92]"
                                    />
                                    <p>
                                        Drag your files or
                                        <span className="text-[#084E92]">
                                            Browse
                                        </span>
                                    </p>
                                </div>
                            )}
                        </label>
                    </div>
                )}

            </SectionCard>

            {/* Additional Details */}
            <SectionCard className="mt-4">

                <SectionHeader
                    icon={FileText}
                    title="Additional Details"
                    open={openSections.details}
                    onToggle={() => toggleSection("details")}
                />


                {openSections.details && (

                    <div className="px-6 py-6 space-y-5">
                        <div>
                            <Label required>
                                Instruction
                            </Label>

                            <textarea
                                rows={3}
                                name="instructionEnglish"
                                value={form.instructionEnglish}
                                onChange={handleChange}
                                placeholder="Enter Instruction"
                                className={inputCls}
                            />

                        </div>
                        <div>
                            <Label>
                                URL
                            </Label>

                            <input
                                name="url"
                                value={form.url}
                                onChange={handleChange}
                                placeholder="Insert URL"
                                className={inputCls}
                            />

                        </div>
                        <div>
                            <Label>
                                Remarks
                            </Label>

                            <textarea
                                rows={3}
                                name="remarks"
                                value={form.remarks}
                                onChange={handleChange}
                                placeholder="Enter Remarks"
                                className={inputCls}
                            />

                        </div>

                    </div>

                )}

            </SectionCard>
            {/* Footer */}
            <div className="flex justify-end gap-3 my-6 border-t py-6">

                <Link
                    to="/menu-item/menu-items"
                    className="px-6 py-3 rounded-lg border text-gray-600"
                >
                    Cancel
                </Link>


                <button
                    onClick={handleSave}
                    className="px-6 py-3 rounded-lg bg-[#084E92] text-white"
                >
                    {isEdit ? "Update" : "Save"}
                </button>

            </div>

            <CreateMenuCategory
                open={openCategory}
                onClose={() => setOpenCategory(false)}
            />


            <CreateSubCategory
                open={openSubCategory}
                onClose={() => setSubOpenCategory(false)}
            />


        </div>
        </Container>
    );
};

export default CreateMenuItem;