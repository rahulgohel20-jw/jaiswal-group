import React, { useCallback, useEffect, useState } from "react";
import { Plus, UploadCloud } from "lucide-react";
import CreateSubCategory from "../menu-subcategory/CreateSubCategory";
import CreateMenuCategory from "../menu-category/CreateMenuCategory";
import { Link, useNavigate, useParams } from "react-router";
import { addMenuItem, getAllMenuCategory, getAllMenuSubCategoryById, getMenuItemById, updateMenuItem } from "../../../services/apiServices";
import { notify } from "@/utils/toast";
import { getUserIdFromToken } from "../../../utils/auth";

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
            notify.error(`Failed to ${isEdit ? 'update' : 'Create' } Menu Item`);
        }
    };
    return (
        <div className="p-4 md:p-6 text-gray-600">

            {/* Page Title */}
            <h2 className="text-2xl font-semibold mb-6 text-black">
                {isEdit ? "Update Menu Item" : "Create Menu Item"}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Name */}
                <div className="lg:col-span-2">
                    <label className="block mb-2 font-medium">
                        Name <span className="text-red-500">*</span>
                    </label>

                    <div className="flex">
                        <input
                            name="nameEnglish"
                            value={form.nameEnglish}
                            onChange={handleChange}
                            type="text"
                            placeholder="Enter Name"
                            className="flex-1 border rounded-l-lg px-4 py-2 outline-none"
                        />
                    </div>
                </div>

                {/* Slogan */}
                <div className="lg:col-span-2">
                    <label className="block mb-2 font-medium">
                        Slogan
                    </label>

                    <input
                        name="slogan"
                        value={form.slogan}
                        onChange={handleChange}
                        type="text"
                        placeholder="Enter Slogan"
                        className="w-full border rounded-lg px-4 py-2 outline-none bg-[#F8FAFC]"
                    />
                </div>

                {/* Price */}
                <div>
                    <label className="block mb-2 font-medium">
                        Price
                    </label>

                    <input
                        name="price"
                        value={form.price}
                        onChange={handleChange}
                        type="number"
                        placeholder="Enter Price"
                        className="w-full border rounded-lg px-4 py-2 outline-none bg-[#F8FAFC]"
                    />
                </div>

                {/* Sequence */}
                <div>
                    <label className="block mb-2 font-medium">
                        Sequence
                    </label>

                    <input
                        name="sequence"
                        value={form.sequence}
                        onChange={handleChange}
                        type="number"
                        placeholder="Enter Sequence"
                        className="w-full border rounded-lg px-4 py-2 outline-none bg-[#F8FAFC]"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block mb-2 font-medium">
                        Category <span className="text-red-500">*</span>
                    </label>

                    <div className="flex gap-2">
                        <p className="flex-1 border rounded-lg px-4 py-2">
                            <select
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    setSelectedSubCategory(""); // Reset when category changes
                                }}
                                className="w-full outline-none">
                                <option>Select Category</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.nameEnglish}
                                    </option>
                                ))}
                            </select>
                        </p>

                        <button onClick={() => setOpenCategory(true)} className="w-10 h-10 bg-[#084E92] rounded-lg flex items-center justify-center text-white cursor-pointer">
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Sub Category */}
                <div>
                    <label className="block mb-2 font-medium">
                        Sub Category
                    </label>

                    <div className="flex gap-2">
                        <p className="flex-1 border rounded-lg px-4 py-2 ">
                            <select
                                value={selectedSubCategory}
                                onChange={(e) => setSelectedSubCategory(e.target.value)}
                                className="w-full outline-none">
                                <option>Select Sub Category</option>
                                {filteredSubCategories.map((sub) => (
                                    <option key={sub.id} value={sub.id}>
                                        {sub.name}
                                    </option>
                                ))}
                            </select>
                        </p>

                        <button onClick={() => setSubOpenCategory(true)} className="w-10 h-10 bg-[#084E92] rounded-lg flex items-center justify-center text-white cursor-pointer">
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Remarks */}
                <div className="lg:col-span-2">
                    <label className="block mb-2 font-medium">
                        Remarks
                    </label>

                    <textarea
                        rows={2}
                        name="remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2 outline-none resize-none bg-[#F8FAFC]"
                        placeholder="Enter Remarks"
                    />
                </div>

                {/* Instruction */}
                <div className="lg:col-span-2">
                    <label className="block mb-2 font-medium">
                        Instruction <span className="text-red-500">*</span>
                    </label>

                    <textarea
                        rows={2}
                        name="instructionEnglish"
                        value={form.instructionEnglish}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-4 py-2 outline-none resize-none bg-[#F8FAFC]"
                        placeholder="Enter Instruction"
                    />
                </div>

                <div className="lg:col-span-2">
                    <label className="block mb-2 font-medium">
                        Image
                    </label>

                    {/* Hidden File Input */}
                    <input
                        type="file"
                        id="menuImage"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                    />

                    {/* Clickable Upload Area */}
                    <label
                        htmlFor="menuImage"
                        className="border-2 border-dashed border-gray-300 rounded-lg min-h-40 flex items-center justify-center cursor-pointer hover:border-[#084E92] hover:bg-gray-50 transition"
                    >
                        {imagePreview ? (
                            <div className="flex items-center gap-4 p-4 w-full">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-24 h-24 rounded-lg object-cover border"
                                />

                                <div>
                                    <p className="font-medium text-gray-700">
                                        {imageFile?.name}
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        {(imageFile?.size / 1024).toFixed(1)} KB
                                    </p>

                                    <p className="text-[#084E92] text-sm mt-1">
                                        Click to change image
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-gray-500">
                                <UploadCloud size={40} className="text-[#084E92] mb-3" />

                                <p>
                                    Drag your files or{" "}
                                    <span className="text-[#084E92] font-medium">
                                        Browse
                                    </span>
                                </p>

                                <small className="mt-1 text-gray-400">
                                    Only support .jpg, .png, .svg files. Max 10 MB.
                                </small>
                            </div>
                        )}
                    </label>
                </div>

                {/* URL */}
                <div className="lg:col-span-2">
                    <label className="block mb-2 font-medium">
                        URL
                    </label>

                    <input
                        name="url"
                        value={form.url}
                        onChange={handleChange}
                        type="text"
                        placeholder="Insert URL"
                        className="w-full border rounded-lg px-4 py-2 outline-none bg-[#F8FAFC]"
                    />
                </div>

            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 mt-8">
                <Link
                    to="/menu-item/menu-items"
                    className="px-6 py-3 rounded-lg border cursor-pointer">
                    Cancel
                </Link>

                <button
                    onClick={handleSave}
                    className="px-6 py-3 rounded-lg bg-[#084E92] text-white cursor-pointer">
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
    );
};

export default CreateMenuItem;