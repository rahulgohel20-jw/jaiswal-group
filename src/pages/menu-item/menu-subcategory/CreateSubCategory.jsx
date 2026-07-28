import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { addMenuSubCategory, getAllMenuCategory, getAllMenuSubCategoryById, updateMenuSubCategory } from "../../../services/apiServices";
import { notify } from "@/utils/toast";
import { getUserIdFromToken } from "../../../utils/auth";

const CreateSubCategory = ({ open, onClose, editData, onSuccess, }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState({
    nameEnglish: "",
    menuCategoryId: "",
  });
  const isEditMode = !!editData;
  useEffect(() => {
    if (editData) {
      setForm({
        nameEnglish: editData.nameEnglish ?? "",
        menuCategoryId: editData.menuCategory?.id ?? "",
      });
    } else {
      setForm({
        nameEnglish: "",
        menuCategoryId: "",
      });
    }
  }, [editData]);

  const userId = getUserIdFromToken();
  const handleSave = async () => {
    try {
      if (!form.nameEnglish.trim()) {
        notify.error("Enter sub category name");
        return;
      }

      if (!form.menuCategoryId) {
        notify.error("Select category");
        return;
      }

      const payload = {
        menuCatId: Number(form.menuCategoryId),
        nameEnglish: form.nameEnglish,
        nameGujarati: "",
        nameHindi: "",
        userId: Number(userId),
      };


      if (editData) {
        await updateMenuSubCategory(editData.id, payload);
        notify.success("Sub Category Updated Successfully");
      } else {
        await addMenuSubCategory(payload);
        notify.success("Sub Category Added Successfully");
      }

      onSuccess?.();

      onClose();
      await getAllMenuSubCategoryById(userId);

    } catch (err) {
      console.error(err);
      notify.error(`Something went wrong while ${isEditMode ? 'updating' : 'saving'} this user. Please try again.`);
    }
  };
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

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh] p-6">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-semibold">
            {editData ? "Update Menu Sub Category" : "Create New Menu Sub Category"}
          </h2>

          <X
            className="cursor-pointer text-gray-500"
            onClick={onClose}
          />
        </div>


        {/* Form */}
        <div className="mt-2 grid grid-cols-1 gap-3">

          {/* Name */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm">
              Name  <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              name="name"
              value={form.nameEnglish}
              onChange={(e) =>
                setForm({
                  ...form,
                  nameEnglish: e.target.value,
                })
              }
              placeholder="Name.."
              className="w-full border rounded px-4 py-2 outline-none"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2 text-sm">
              Select Category <span className="text-red-500">*</span>
            </label>

            <div className="w-full border rounded px-4 py-2">
              <select
                value={form.menuCategoryId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    menuCategoryId: Number(e.target.value),
                  })
                }
                className="w-full outline-none"
              >
                <option value="">Select Category</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nameEnglish}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>


        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-4">

          <button
            onClick={onClose}
            className="px-6 py-2 rounded bg-gray-200  cursor-pointer text-sm"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2 rounded bg-[#084E92] text-white cursor-pointer text-sm"
          >
            Save
          </button>

        </div>

      </div>
    </div>
  )
}

export default CreateSubCategory
