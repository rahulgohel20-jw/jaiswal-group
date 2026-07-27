import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { addMenuCategory, updateMenuCategory } from "@/services/apiServices";

// Decodes the JWT stored under the "authToken" localStorage key and pulls
// the user id out of its payload. Tries the common claim names in order
// (userId, id, sub) since APIs vary in what they call it.
const getUserIdFromToken = () => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return null;

    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    const payload = JSON.parse(json);

    return payload.userId ?? payload.id ?? payload.sub ?? null;
  } catch (err) {
    console.error("Failed to decode authToken:", err);
    return null;
  }
};

const CreateMenuCategory = ({ open, onClose, onSuccess, editData }) => {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    sequence: "",
    slogan: "",
    image: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || "",
        price: editData.price ?? "",
        sequence: editData.sequence ?? "",
        slogan: editData.slogan || "",
        image: null, // existing image shown via editData.image, not re-uploaded unless changed
      });
    } else {
      setFormData({ name: "", price: "", sequence: "", slogan: "", image: null });
    }
    setError(null);
  }, [editData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImage = (e) => {
    setFormData((prev) => ({ ...prev, image: e.target.files[0] }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    const userId = getUserIdFromToken();
    if (!userId) {
      setError("Could not identify the logged-in user. Please log in again.");
      return;
    }

    const payload = new FormData();
    if (editData) payload.append("id", editData.id);
    payload.append("nameEnglish", formData.name.trim());
    payload.append("userId", userId);

    if (formData.price !== "" && formData.price !== null) {
      payload.append("price", formData.price);
    }
    if (formData.sequence !== "" && formData.sequence !== null) {
      payload.append("sequence", formData.sequence);
    }
    if (formData.slogan && formData.slogan.trim() !== "") {
      payload.append("slogan", formData.slogan.trim());
    }
    if (formData.image) {
      payload.append("image", formData.image);
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editData) {
        await updateMenuCategory(payload);
      } else {
        await addMenuCategory(payload);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to save category:", err);
      setError("Failed to save category. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-212.5 p-7">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-semibold">
            {editData ? "Edit Menu Category" : "Create New Menu Category"}
          </h2>

          <X className="cursor-pointer text-gray-500" onClick={onClose} />
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-3">{error}</p>
        )}

        {/* Form */}
        <div className="mt-5 grid grid-cols-2 gap-6">

          {/* Name */}
          <div className="col-span-2">
            <label className="block text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Name.."
              className="w-full border rounded-lg px-4 py-2 outline-none"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block mb-2">Price</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2 outline-none"
            />
          </div>

          {/* Sequence */}
          <div>
            <label className="block mb-2">Sequence</label>
            <input
              type="number"
              name="sequence"
              value={formData.sequence}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2 outline-none"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block mb-2">Image</label>
            <label className="border-2 border-dashed rounded-lg h-20 flex items-center justify-center cursor-pointer text-gray-400">
              {formData.image
                ? formData.image.name
                : "Drag & drop an image here, or click to select"}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImage}
              />
            </label>
          </div>

          {/* Slogan */}
          <div className="col-span-2">
            <label className="block mb-2">Slogan</label>
            <textarea
              name="slogan"
              value={formData.slogan}
              onChange={handleChange}
              rows="2"
              className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-blue-900"
            />
          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-3 rounded-lg bg-gray-200 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-3 rounded-lg bg-[#084E92] text-white cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateMenuCategory;