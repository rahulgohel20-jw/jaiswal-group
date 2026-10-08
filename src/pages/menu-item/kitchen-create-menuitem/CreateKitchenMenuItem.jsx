import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Image, Layers, Menu, Plus, UploadCloud, Save, ArrowLeft } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
    addKitchenMenuItem,
    updateKitchenMenuItem,
    getKitchenMenuItemById,
    getAllKitchenMenuCategory,
} from "../../../services/apiServices";
import { notify } from "@/utils/toast";
import { Container } from "@/components/common/container";
import { PageHeader } from "@/components/common/PageHeader";
import { HeaderActionButton } from "@/components/common/HeaderActionButton";
import SearchableSelect from "../../../utils/SearchableSelect";
import KitchenCreateMenuCategory from "../kitchen-menu-category/KitchenCreateMenuCategory";

const inputCls =
    'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
    'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const Label = ({ children, required }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {children}
        {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
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

const CreateKitchenMenuItem = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isEdit = !!id;

    const returnUrl = useMemo(
        () => location.state?.returnUrl || "/menu-item/menu-items",
        [location.state]
    );

    // Safe navigation back that signals useModuleState to keep filters
    const handleNavigateBack = useCallback(() => {
        navigate(returnUrl, { state: { fromChild: true } });
    }, [navigate, returnUrl]);

    const [openCategory, setOpenCategory] = useState(false);
    const [categories, setCategories] = useState([]);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedSubCategory, setSelectedSubCategory] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [saving, setSaving] = useState(false);

    const [openSections, setOpenSections] = useState({
        basic: true,
        category: true,
        image: true,
    });

    const toggleSection = (key) => {
        setOpenSections((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const initialForm = {
        nameEnglish: "",
        slogan: "",
        price: "",
        sequence: "",
    };

    const [form, setForm] = useState(initialForm);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    // Fetch Active Categories
    const fetchCategories = useCallback(async () => {
        setCategoryLoading(true);
        try {
            const res = await getAllKitchenMenuCategory({ isActive: true });
            const payload = res?.data?.data ?? res?.data ?? res;
            const rawList = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.["Menu Category Details"])
                    ? payload["Menu Category Details"]
                    : Object.values(payload || {}).find(Array.isArray) || [];

            const activeCategories = rawList.filter(
                (item) => item.isActive === true || item.status === true
            );

            setCategories(activeCategories);
        } catch (err) {
            console.error("Failed to load categories", err);
            notify.error("Failed to load categories");
            setCategories([]);
        } finally {
            setCategoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const categoryOptions = useMemo(
        () =>
            categories.map((c) => ({
                value: String(c.id),
                label: c.nameEnglish || c.name || "Unnamed Category",
            })),
        [categories]
    );

    // Fetch Item Details in Edit Mode
    const fetchMenuItemById = useCallback(async () => {
        try {
            const res = await getKitchenMenuItemById(id);
            const item =
                res?.data?.data?.["Kitchen MenuItem Details"] ||
                res?.data?.data?.["Kitchen Menu Item Details"] ||
                res?.data?.data?.["Menu Item Details"] ||
                res?.data?.data ||
                res?.data;

            if (!item) return;

            setForm({
                nameEnglish: item.nameEnglish ?? "",
                slogan: item.slogan ?? "",
                price: item.price != null ? String(item.price) : "",
                sequence: item.sequence != null ? String(item.sequence) : "",
            });

            setSelectedCategory(item.menuCategory?.id?.toString() || item.menuCategoryId?.toString() || "");
            setSelectedSubCategory(item.menuSubCategory?.id?.toString() || item.menuSubCategoryId?.toString() || "");

            const latestImage = item.files
                ?.filter(
                    (file) =>
                        file?.moduleName === "KITCHENMENUITEM" ||
                        (file?.moduleName === "MENUITEM" && file?.path)
                )
                ?.slice(-1)[0]?.path;

            if (latestImage) {
                setImagePreview(latestImage);
            }
        } catch (err) {
            console.error(err);
            notify.error("Failed to load Kitchen Menu Item");
        }
    }, [id]);

    useEffect(() => {
        if (isEdit) {
            fetchMenuItemById();
        }
    }, [isEdit, fetchMenuItemById]);

    const handleSave = async (redirectOnSuccess = true) => {
        if (!form.nameEnglish.trim()) {
            notify.error("Name required. Please enter name");
            return false;
        }
        if (!selectedCategory) {
            notify.error("Please select a Category");
            return false;
        }
        if (form.price && Number(form.price) < 0) {
            notify.error("Price must be positive");
            return false;
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("nameEnglish", form.nameEnglish.trim());
            formData.append("slogan", form.slogan || "");
            formData.append("price", form.price || 0);
            formData.append("sequence", form.sequence || 0);
            formData.append("menuCategoryId", selectedCategory);
            formData.append("menuSubCategoryId", selectedSubCategory || "");

            if (imageFile) {
                formData.append("file", imageFile);
            }

            if (isEdit) {
                formData.append("id", id);
                await updateKitchenMenuItem(formData);
            } else {
                await addKitchenMenuItem(formData);
            }
            if (redirectOnSuccess) {
                navigate(returnUrl, { state: { fromChild: true } });
            }
            return true;
        } catch (err) {
            console.error("Save failed:", err?.response?.data ?? err);
            notify.error(`Failed to ${isEdit ? "update" : "create"} Kitchen Menu Item`);
            return false;
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <div className="pt-2 pb-6 mx-auto space-y-4">
                {/* Standardized PageHeader with Back Button & Header Actions */}
                <PageHeader
                    title={isEdit ? "Update Menu Item" : "Create Menu Item"}
                    description={
                        isEdit
                            ? "Update menu item basic details, pricing, and category."
                            : "Create a new menu item and configure its category and details."
                    }
                    actions={
                        <button
                            type="button"
                            onClick={handleNavigateBack}
                            className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0 shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to MenuItem
                        </button>
                    }
                />

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
                                <div className="col-span-2">
                                    <Label>Description</Label>
                                    <input
                                        name="slogan"
                                        value={form.slogan}
                                        onChange={handleChange}
                                        placeholder="Enter Description"
                                        className={inputCls}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Price</Label>
                                    <input
                                        name="price"
                                        value={form.price}
                                        onChange={handleChange}
                                        type="number"
                                        onWheel={(e) => e.currentTarget.blur()}
                                        placeholder="Enter Price"
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
                        <div className="px-6 py-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <div>
                                    <Label required>Category</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 min-w-0">
                                            <SearchableSelect
                                                name="category"
                                                value={selectedCategory ? String(selectedCategory) : ""}
                                                onChange={(e) => {
                                                    const value = e?.target?.value ?? e?.value ?? "";
                                                    setSelectedCategory(value);
                                                    setSelectedSubCategory("");
                                                }}
                                                options={categoryOptions}
                                                placeholder={
                                                    categoryLoading
                                                        ? "Loading categories..."
                                                        : "Select Category"
                                                }
                                                disabled={categoryLoading}
                                                isClearable={true}
                                            />
                                        </div>
                                        <HeaderActionButton
                                            onClick={() => setOpenCategory(true)}
                                            icon={Plus}
                                            label="Add"
                                            className="h-10 px-3"
                                            title="Add Category"
                                        />
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
                            <Label>Upload Image</Label>
                            <input
                                type="file"
                                id="menuImage"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                            <label
                                htmlFor="menuImage"
                                className="border-2 border-dashed border-gray-300 rounded-xl min-h-40 flex items-center justify-center cursor-pointer hover:border-[#084E92] transition"
                            >
                                {imagePreview ? (
                                    <div className="flex gap-4 items-center p-4">
                                        <img src={imagePreview} className="w-24 h-24 rounded-lg object-cover" alt="Preview" />
                                        <div>
                                            <p className="font-medium">{imageFile?.name || "Current Menu Image"}</p>
                                            <p className="text-sm text-gray-400">Click to change image</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500">
                                        <UploadCloud size={40} className="mx-auto text-[#084E92]" />
                                        <p className="mt-1">
                                            Drag your files or <span className="text-[#084E92] font-semibold">Browse</span>
                                        </p>
                                    </div>
                                )}
                            </label>
                        </div>
                    )}
                </SectionCard>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 my-6 border-t pt-6">
                    <button
                        type="button"
                        onClick={handleNavigateBack}
                        disabled={saving}
                        className="px-10 py-2 cursor-pointer rounded-lg border text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="px-10 py-2 cursor-pointer rounded-lg bg-[#084E92] text-white hover:bg-[#063c70] transition disabled:opacity-60"
                    >
                        {saving ? "Saving..." : isEdit ? "Update" : "Save"}
                    </button>
                </div>

                <KitchenCreateMenuCategory
                    open={openCategory}
                    selectedCategory={selectedCategory}
                    onSuccess={async () => {
                        await fetchCategories();
                    }}
                    onClose={() => setOpenCategory(false)}
                />
            </div>
        </Container>
    );
};

export default CreateKitchenMenuItem;