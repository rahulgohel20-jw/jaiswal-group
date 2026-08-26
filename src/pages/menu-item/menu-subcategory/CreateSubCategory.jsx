import React, { useEffect, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { addMenuSubCategory, getAllMenuCategory, getAllMenuSubCategoryById, updateMenuSubCategory } from "../../../services/apiServices";
import { notify } from "@/utils/toast";
import { getOrgIdFromToken, getUserIdFromToken } from "../../../utils/auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';

const CreateSubCategory = ({ open, onClose, editData, onSuccess, }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState({
    nameEnglish: "",
    menuCategoryId: "",
  });
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const isEditMode = !!editData;
  const resetForm = () => {
  setForm({
    nameEnglish: "",
    menuCategoryId: "",
  });

  setCategorySearch("");
  setCategoryOpen(false);
};
const handleClose = () => {
  resetForm();
  onClose();
};
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

  useEffect(() => {
  if (!editData) {
    setCategorySearch("");
  }
}, [editData]);

  useEffect(() => {
  if (!editData || categories.length === 0) return;

  const categoryId = editData.menuCategory?.id;

  const selectedCategory = categories.find(
    (category) => String(category.id) === String(categoryId)
  );

  if (selectedCategory) {
    setCategorySearch(selectedCategory.nameEnglish || "");
  }
}, [editData, categories]);

  const userId = getUserIdFromToken();
  const orgId = getOrgIdFromToken();

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
        orgId: Number(orgId),
      };

      const formData = new FormData();
      formData.append(
        "request",
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );
      if (editData) {
        await updateMenuSubCategory(editData.id, formData);
      } else {
        await addMenuSubCategory(formData);
      }

      onSuccess?.();

      onClose();
      await getAllMenuSubCategoryById();

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
      res?.data?.data?.["Menu Category Details"] || [];

       const activeCategories = Array.isArray(data)
      ? data.filter((item) => item.isActive === true)
      : [];

    setCategories(activeCategories);
      } catch (err) {
        console.error("Failed to load categories", err);
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
            onClick={handleClose}
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

                      if (form.menuCategoryId) {
                        setForm((prev) => ({
                          ...prev,
                          menuCategoryId: "",
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
                  {categories
                    .filter((item) =>
                      item.nameEnglish
                        ?.toLowerCase()
                        .includes(categorySearch.trim().toLowerCase())
                    )
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            menuCategoryId: String(item.id),
                          }));

                          setCategorySearch(item.nameEnglish || "");
                          setCategoryOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 ${String(form.menuCategoryId) === String(item.id)
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
                      .includes(categorySearch.trim().toLowerCase())
                  ).length === 0 && (
                      <div className="px-3 py-3 text-sm text-gray-500">
                        No category found
                      </div>
                    )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

        </div>


        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-4">

          <button
            onClick={handleClose}
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
