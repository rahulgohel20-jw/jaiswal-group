import React, { useState } from "react";
import { X } from "lucide-react";

const CreateSubCategory = ({ open, onClose }) => {

    
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
              <div>
                <label className="block text-gray-700 mb-2">
                  Name  <span className="text-red-500">*</span>
                </label>
    
                <input
                  type="text"
                  name="name"
                  placeholder="Name.."
                  className="w-full border rounded-lg px-4 py-2 outline-none"
                />
              </div>
           <div>
            
              <label className="block text-gray-700 mb-2">
                  Select Category <span className="text-red-500">*</span>
                </label>
               <p className="w-full border rounded-lg px-4 py-2 ">
                <select className="outline-none w-full">
                <option value="">Select Category</option>
                <option value="">Soup Station</option>
               </select>
               </p>
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
                className="px-6 py-3 rounded-lg bg-[#084E92] text-white cursor-pointer"
              >
                Save
              </button>
    
            </div>
    
          </div>
        </div>
  )
}

export default CreateSubCategory
