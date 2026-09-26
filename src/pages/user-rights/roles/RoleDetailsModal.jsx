import React from 'react';
import { Shield, X } from 'lucide-react';

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

  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  const commaIdx = str.indexOf(',');
  if (commaIdx !== -1) return str.slice(0, commaIdx).trim();

  return str.replace(/\s+\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i, '').trim();
};

const RoleDetailsModal = ({ isOpen, onClose, onEdit, role }) => {
  if (!isOpen || !role) return null;

  const {
    id,
    name,
    description = 'No description provided for this role yet.',
    createdAt,
  } = role;

  const displayCreatedAt = formatDateOnly(createdAt);
  const roleCode = `ROLE-${String(id).padStart(3, '0')}`;

  const handleEditClick = () => {
    onEdit?.(role);
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
            Role Details
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
              <Shield size={20} />
            </div>
            <div>
              <p className="text-base font-bold text-[#1B1B1F]">{name}</p>
              <span className="text-xs text-[#737781]">{roleCode}</span>
            </div>
          </div>

          <div className="bg-[#EFF4FF] border border-[#DDE7FF] rounded-lg p-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                Role ID
              </p>
              <p className="text-sm font-semibold text-[#1B1B1F] mt-0.5">
                #{id}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
                Created Date
              </p>
              <p className="text-sm font-semibold text-[#1B1B1F] mt-0.5">
                {displayCreatedAt}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#737781] uppercase tracking-wide">
              Description
            </p>
            <p className="text-xs sm:text-sm text-[#43474F] mt-1 leading-relaxed">
              {description || '—'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5E7EB] px-5 py-3 flex items-center justify-end gap-2.5 bg-[#F9FAFB]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium border border-[#D0D5DD] text-[#344054] rounded-lg hover:bg-white hover:border-gray-300 transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleEditClick}
            className="px-4 py-2 text-xs sm:text-sm font-medium bg-[#084E92] text-white rounded-lg hover:bg-[#073e77] transition cursor-pointer shadow-xs"
          >
            Edit Role
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleDetailsModal;
