import React, { useState } from "react";
import { Plus, UploadCloud } from "lucide-react";
import CreateSubCategory from "../menu-subcategory/CreateSubCategory";
import CreateMenuCategory from "../menu-category/CreateMenuCategory";

const CreateMenuItem = () => {
    const [openCategory, setOpenCategory] = useState(false);
    const [openSubCategory, setSubOpenCategory] = useState(false);
    return (
        <div className="p-4 md:p-6 text-gray-600">

            {/* Page Title */}
            <h2 className="text-2xl font-semibold mb-6 text-black">
                Create Menu Item
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Name */}
                <div className="lg:col-span-2">
                    <label className="block mb-2 font-medium">
                        Name <span className="text-red-500">*</span>
                    </label>

                    <div className="flex">
                        <input
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
                            <select className="w-full outline-none">
                                <option>Select Category</option>
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
                            <select className="w-full outline-none">
                                <option>Select Sub Category</option>
                            </select>
                        </p>

                        <button onClick={() => setSubOpenCategory(true)}  className="w-10 h-10 bg-[#084E92] rounded-lg flex items-center justify-center text-white cursor-pointer">
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
                        className="hidden"
                    />

                    {/* Clickable Upload Area */}
                    <label
                        htmlFor="menuImage"
                        className="border-2 border-dashed border-gray-300 rounded-lg h-35 flex flex-col justify-center items-center text-gray-500 cursor-pointer hover:border-[#084E92] hover:bg-gray-50 transition"
                    >
                        <UploadCloud size={40} className="text-[#084E92] mb-3" />

                        <p>
                            Drag your files or{" "}
                            <span className="text-[#084E92] font-medium">
                                Browse
                            </span>
                        </p>

                        <small className="mt-1 text-gray-400">
                            Only support .jpg, .png, .svg and .zip files. Max 10 MB files are allowed.
                        </small>
                    </label>
                </div>

                {/* URL */}
                <div className="lg:col-span-2">
                    <label className="block mb-2 font-medium">
                        URL
                    </label>

                    <input
                        type="text"
                        placeholder="Insert URL"
                        className="w-full border rounded-lg px-4 py-2 outline-none bg-[#F8FAFC]"
                    />
                </div>

            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 mt-8">
                <button className="px-6 py-3 rounded-lg border cursor-pointer">
                    Cancel
                </button>

                <button className="px-6 py-3 rounded-lg bg-[#084E92] text-white cursor-pointer">
                    Save
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