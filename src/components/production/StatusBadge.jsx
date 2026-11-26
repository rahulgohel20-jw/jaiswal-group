import React from 'react';

/**
 * StatusBadge - Pill-style status badge matching the Figma design system tokens:
 * Success (emerald), Danger/Shortfall (rose), Warning/Pending (amber), Info (blue/primary).
 */
export const StatusBadge = ({ status, text, dot = true, className = '' }) => {
  const norm = (status || text || '').toString().toUpperCase().replace(/[\s-]/g, '_');

  let colorClasses = 'bg-slate-50 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (['COMPLETED', 'CONFIRMED', 'FULLY_AVAILABLE', 'READY', 'PASSED', 'APPROVED', 'DISPATCHED'].includes(norm)) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (['IN_PROGRESS', 'IN_TRANSIT', 'PARTIALLY_READY', 'READY_TO_DISPATCH'].includes(norm)) {
    colorClasses = 'bg-blue-50 text-[#084E92] border border-blue-200';
    dotColor = 'bg-[#084E92]';
  } else if (['PENDING', 'PENDING_ISSUE', 'DRAFT', 'DRAFT_PR', 'ACTION_REQ', 'WARNING'].includes(norm)) {
    colorClasses = 'bg-amber-50 text-amber-700 border border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (['SHORTFALL', 'PURCHASE_REQUIRED', 'CANCELLED', 'FAILED', 'SPOILED'].includes(norm)) {
    colorClasses = 'bg-rose-50 text-rose-700 border border-rose-200';
    dotColor = 'bg-rose-500';
  } else if (['NOT_STARTED'].includes(norm)) {
    colorClasses = 'bg-gray-100 text-gray-600 border border-gray-200';
    dotColor = 'bg-gray-400';
  }

  // User friendly display
  const displayText = text || status?.replace(/_/g, ' ') || 'Pending';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide capitalize shadow-2xs ${colorClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      {displayText}
    </span>
  );
};

export default StatusBadge;
