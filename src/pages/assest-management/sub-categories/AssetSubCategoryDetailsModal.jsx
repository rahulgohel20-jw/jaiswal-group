import { X } from 'lucide-react';
import React from 'react';

const AssetSubCategoryDetailsModal = ({ isOpen, onClose, subCategory }) => {
    if (!isOpen || !subCategory) return null;

    const {
        id,
        name,
        parentCategory,
        description,
        assetCount = '—',
        healthIndex = 92,
        healthLabel = 'Excellent',
        code,
    } = subCategory;

    const subCategoryCode = code || `SUB-${String(id).padStart(3, '0')}`;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div className="relative w-full max-w-sm bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="bg-[#084E92] px-5 py-4 flex items-start justify-between">
                    <div>
                        <h2 className="text-white text-lg font-bold">Details</h2>
                        <p className="text-[#BFD8F5] text-xs mt-0.5">
                            Sub Category: {subCategoryCode}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white cursor-pointer"
                        aria-label="Close details panel"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
                    <div>
                        <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                            Sub Category Name
                        </p>
                        <h3 className="text-lg font-bold text-[#084E92] mt-1">{name}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                                Parent Category
                            </p>
                            <p className="text-sm font-semibold text-[#1B1B1F] mt-1">
                                {parentCategory}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                                Asset Count
                            </p>
                            <p className="text-sm font-semibold text-[#1B1B1F] mt-1">
                                {assetCount} Units
                            </p>
                        </div>
                    </div>

                    <div>
                        <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                            Full Description
                        </p>
                        <p className="text-sm text-[#43474F] mt-1 leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-[#E5E7EB] px-5 py-4 flex gap-3">
                       <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-[#C3C6D1] text-[#43474F] rounded-lg font-medium hover:bg-gray-50 transition cursor-pointer"
                    >
                        Close
                    </button>         
                </div>
            </div>
        </div>
    );
};

export default AssetSubCategoryDetailsModal;