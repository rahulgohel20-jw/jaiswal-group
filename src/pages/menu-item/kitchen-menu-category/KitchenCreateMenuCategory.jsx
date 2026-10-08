import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import {
  addKitchenMenuCategory,
  updateKitchenMenuCategory,
} from "@/services/apiServices";
import { notify } from "@/utils/toast";
import SearchableSelect from "../../../utils/SearchableSelect";

const getLatestImage = (images) => {
  if (!Array.isArray(images) || images.length === 0) {
    return "";
  }

  return [...images]
    .sort((a, b) => Number(b.id) - Number(a.id))[0]?.path || "";
};

const KitchenCreateMenuCategory = ({ open, onClose, onSuccess, editData }) => {

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const isValidSelection = (val) => {
    if (val == null || val === "" || val === "undefined" || val === "null") return false;
    if (typeof val === "object") return Boolean(val.id);
    return Boolean(String(val).trim());
  };


  // Handle editData or reset when modal opens/closes
  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || editData.nameEnglish || "",
        description: editData.menuSlogan || editData.description || editData.slogan || "",
        image: null,
      });

      const latestImage = getLatestImage(editData.images);
      setImagePreview(latestImage);
    } else {
      setFormData({ name: "", description: "", image: null });
      setImagePreview("");
   
    }
    setError(null);
  }, [editData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData((prev) => ({
      ...prev,
      image: file,
    }));

    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    // Kitchen API has no userId param, so it is not sent
    const payload = new FormData();
    if (editData?.id) payload.append("id", editData.id);
    payload.append("nameEnglish", formData.name.trim());
    payload.append("orgId", '');

    if (formData.description && formData.description.trim() !== "") {
      payload.append("menuSlogan", formData.description.trim());
      payload.append("description", formData.description.trim());
    }
    if (formData.image instanceof File) {
      payload.append("file", formData.image);
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editData) {
        await updateKitchenMenuCategory(payload);
      } else {
        await addKitchenMenuCategory(payload);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      notify.error(`Failed to ${editData ? "update" : "Create"} Category`);
      setError("Failed to save category. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh] p-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-semibold">
            {editData ? "Edit Menu Category" : "Create New Menu Category"}
          </h2>
          <X className="cursor-pointer text-gray-500" onClick={onClose} />
        </div>

        {error && <p className="text-[11px] text-red-600 mt-3">{error}</p>}

        {/* Form */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm overflow-y-auto pr-1">
          {/* Name */}
          <div className="col-span-2">
            <label className="block text-gray-700 mb-1 font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Name.."
              className="w-full border rounded px-4 py-2 outline-none focus:border-blue-400"
            />
          </div>

          {/* Image */}
          <div className="col-span-2">
            <label className="block mb-1 text-gray-700 font-medium">Image</label>
            <label className="border-2 border-dashed rounded min-h-20 flex items-center justify-center cursor-pointer p-3 hover:border-blue-400 transition">
              {imagePreview ? (
                <div className="flex items-center gap-3 w-full">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-16 h-16 rounded object-cover border"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {formData.image ? formData.image.name : "Current Image"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Click to change image
                    </p>
                  </div>
                </div>
              ) : (
                <span className="text-gray-400 text-xs text-center">
                  Drag & drop an image here, or click to select
                </span>
              )}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImage}
              />
            </label>
          </div>

          {/* Description */}
          <div className="col-span-2">
            <label className="block mb-1 text-gray-700 font-medium">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              placeholder="Enter Description..."
              className="w-full border rounded px-4 py-2 outline-none focus:ring-1 focus:ring-blue-900"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2 text-sm rounded-lg bg-gray-200 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 text-sm rounded-lg bg-[#084E92] text-white cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KitchenCreateMenuCategory;