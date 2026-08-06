import React from 'react';
import { Building2, X } from 'lucide-react';

// Backend sends createdAt as "DD/MM/YYYY" (e.g. "06/08/2026" = 06 Aug 2026).
// new Date("06/08/2026") would misparse this as MM/DD/YYYY (8 June), so
// we split it manually instead of trusting the Date constructor.
const formatDateOnly = (value) => {
  if (!value) return '—';

  const str = String(value);
  const slashParts = str.split('/');
  if (slashParts.length === 3) {
    const [day, month, year] = slashParts.map(Number);
    if (day && month && year) {
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        });
      }
    }
  }

  // Not a plain DD/MM/YYYY string — try letting Date() parse it directly
  // (covers ISO strings, etc).
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  // Last resort — it's probably already a formatted string like
  // "07/27/2026, 2:32:00 PM" or "Jul 27, 2026 14:32".
  // Strip anything from the first comma onward, or a trailing time pattern.
  const commaIdx = str.indexOf(',');
  if (commaIdx !== -1) return str.slice(0, commaIdx).trim();

  // fallback: strip a trailing HH:MM(:SS)? (AM/PM)? pattern
  return str.replace(/\s+\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i, '').trim();
};

const DepartmentDetailsModal = ({ isOpen, onClose, onEdit, department }) => {
  if (!isOpen || !department) return null;

  const {
    id,
    name,
    description = 'No description provided for this department yet.',
    code,
    totalEmployees = '—',
    createdAt,
  } = department;

  const displayCreatedAt = formatDateOnly(createdAt);
  const departmentCode = code || `DEPT-${String(id).padStart(3, '0')}`;

  const handleEditClick = () => {
    onEdit?.(department);
  };

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
          <h2 className="text-[#1B1B1F] text-base font-bold">
            Department Details
          </h2>
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
              <span className="text-xs text-[#737781]">{departmentCode}</span>
            </div>
          </div>

          <div className="bg-[#EFF4FF] border border-[#DDE7FF] rounded-xl p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                Total Employees
              </p>
              <p className="text-lg font-bold text-[#1B1B1F] mt-1">
                {totalEmployees}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                Created Date
              </p>
              <p className="text-lg font-bold text-[#1B1B1F] mt-1">
                {' '}
                {displayCreatedAt}
              </p>
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
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5E7EB] px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={handleEditClick}
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
