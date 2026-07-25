import React, { useState } from "react";
import { X } from "lucide-react";

const CreateMenuCategory = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    sequence: "",
    slogan: "",
    image: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImage = (e) => {
    setFormData((prev) => ({
      ...prev,
      image: e.target.files[0],
    }));
  };

  const handleSubmit = () => {
    console.log(formData);
    // API call here
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-212.5 p-7">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-semibold">
            Create New Menu Category
          </h2>

          <X
            className="cursor-pointer text-gray-500"
            onClick={onClose}
          />
        </div>


        {/* Form */}
        <div className="mt-5 grid grid-cols-2 gap-6">

          {/* Name */}
          <div className="col-span-2">
            <label className="block text-gray-700 mb-2">
              Name  <span className="text-red-500">*</span>
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
            <label className="block mb-2">
              Price
            </label>

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
            <label className="block mb-2">
              Sequence
            </label>

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
            <label className="block mb-2">
              Image
            </label>

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
            <label className="block mb-2">
              Slogan
            </label>

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
            className="px-6 py-3 rounded-lg bg-gray-200  cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="px-6 py-3 rounded-lg bg-[#084E92] text-white cursor-pointer"
          >
            Save
          </button>

        </div>

      </div>
    </div>
  );
};

export default CreateMenuCategory;