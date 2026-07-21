import { Ruler, X } from 'lucide-react';
import React from 'react';

const AssetUnitDetailsModal = ({ isOpen, onClose, unit, loading }) => {
    if (!isOpen) return null;

    if (loading || !unit) {
        return (
            <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
                <div className="relative w-full max-w-sm bg-white h-full shadow-xl flex items-center justify-center">
                    <p className="text-sm text-gray-500">Loading details...</p>
                </div>
            </div>
        );
    }

    const { id, name, symbol, status } = unit;
    const unitCode = `UNIT-${String(id).padStart(3, '0')}`;
    const isActive = status === 'Active';

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

            <div className="relative w-full max-w-sm bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
                <div className="px-5 py-4 flex items-start justify-between border-b border-[#E5E7EB]">
                    <h2 className="text-[#1B1B1F] text-base font-bold">Unit Details</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        aria-label="Close details panel"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#D5E3FF] flex items-center justify-center text-[#00376C] shrink-0">
                            <Ruler size={20} />
                        </div>
                        <div>
                            <p className="text-base font-bold text-[#1B1B1F]">{name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-[#737781]">{unitCode}</span>
                                <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                                        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                    }`}
                                >
                                    {status}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#EFF4FF] border border-[#DDE7FF] rounded-xl p-4 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                                Unit Name
                            </p>
                            <p className="text-lg font-bold text-[#1B1B1F] mt-1">{name}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                                Symbol
                            </p>
                            <p className="text-lg font-bold text-[#1B1B1F] mt-1">{symbol}</p>
                        </div>
                    </div>
                </div>

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

export default AssetUnitDetailsModal;