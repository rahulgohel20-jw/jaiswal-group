import { Package, Pencil, X } from 'lucide-react';
import React from 'react';

export const formatDate = (dateString) => {
  if (!dateString) return "-";
  const [datePart] = dateString.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const AssetTypeDetailsModal = ({ isOpen, onClose, onEdit, assetType, loading }) => {
    if (!isOpen) return null;

    if (loading || !assetType) {
        return (
            <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
                <div className="relative w-full max-w-sm bg-white h-full shadow-xl flex items-center justify-center">
                    <p className="text-sm text-gray-500">Loading details...</p>
                </div>
            </div>
        );
    }

    const { id,name, description, status, createdAt } = assetType;
    const isActive = status === 'Active';

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
            <div className="relative w-full max-w-sm bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="px-5 py-4 flex items-start justify-between border-b border-[#E5E7EB]">
                    <h2 className="text-[#1B1B1F] text-base font-bold">Asset Type Details</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#DCEBFF] flex items-center justify-center text-[#084E92] shrink-0">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="text-base font-bold text-[#1B1B1F]">{name}</p>
                            <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                                    isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                }`}
                            >
                                {status}
                            </span>
                        </div>
                    </div>

                    <div className="bg-[#EFF4FF] border border-[#DDE7FF] rounded-xl p-4">
                        <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                            Created Date
                        </p>
                        <p className="text-lg font-bold text-[#1B1B1F] mt-1">{formatDate(createdAt)}</p>
                    </div>

                    <div>
                        <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                            Description
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
                        onClick={() => onEdit?.(assetType)}
                        className="flex-1 px-4 py-2 bg-[#084E92] text-white rounded-lg font-medium hover:bg-[#073e77] transition cursor-pointer flex items-center justify-center gap-2"
                    >
                        <Pencil size={16} />
                        Edit Asset Type
                    </button>
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

export default AssetTypeDetailsModal;