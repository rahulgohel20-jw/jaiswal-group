import { Building2, X } from 'lucide-react';
import React from 'react';

/**
 * Slide-over panel shown when the "view" (eye) icon is clicked on a
 * Department row. Expects `department` to optionally carry:
 *   code, totalEmployees, createdDate, activity: [{ title, detail, time }]
 * Falls back to sensible defaults so it also works against the
 * lightweight rows used in DepartmentMaster.js.
 */
const DepartmentDetailsModal = ({ isOpen, onClose, department }) => {
    if (!isOpen || !department) return null;

    const {
        id,
        name,
        description = 'No description provided for this department yet.',
        status,
        code,
        totalEmployees = '—',
        createdDate = '—',
        activity = [
            { title: 'Department Updated', detail: 'Details were modified by Admin', time: 'Recently' },
            { title: 'Department Created', detail: 'Initial setup', time: createdDate },
        ],
    } = department;

    const departmentCode = code || `DEPT-${String(id).padStart(3, '0')}`;
    const isActive = status === 'Active';

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
                <div className="px-5 py-4 flex items-start justify-between border-b border-[#E5E7EB]">
                    <h2 className="text-[#1B1B1F] text-base font-bold">Department Details</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        aria-label="Close details panel"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#D5E3FF] flex items-center justify-center text-[#00376C] shrink-0">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <p className="text-base font-bold text-[#1B1B1F]">{name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-[#737781]">{departmentCode}</span>
                                <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                                        isActive
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-200 text-gray-600'
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
                                Total Employees
                            </p>
                            <p className="text-lg font-bold text-[#1B1B1F] mt-1">{totalEmployees}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                                Created Date
                            </p>
                            <p className="text-lg font-bold text-[#1B1B1F] mt-1">{createdDate}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                            Description
                        </p>
                        <p className="text-sm text-[#43474F] mt-1 leading-relaxed">
                            {description}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm font-bold text-[#1B1B1F] mb-3">Activity Timeline</p>
                        <div className="flex flex-col gap-4">
                            {activity.map((item, idx) => (
                                <div key={idx} className="flex gap-3">
                                    <div className="flex flex-col items-center pt-1">
                                        <span className="w-2 h-2 rounded-full bg-[#084E92] shrink-0" />
                                        {idx !== activity.length - 1 && (
                                            <span className="w-px flex-1 bg-[#E5E7EB] mt-1" />
                                        )}
                                    </div>
                                    <div className="pb-1">
                                        <p className="text-sm font-semibold text-[#1B1B1F]">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-[#43474F] mt-0.5">{item.detail}</p>
                                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-[#E5E7EB] px-5 py-4 flex gap-3">
                    <button
                        type="button"
                        className="flex-1 px-4 py-2 bg-[#084E92] text-white rounded-lg font-medium hover:bg-[#073e77] transition cursor-pointer"
                    >
                        Edit Department
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

export default DepartmentDetailsModal;