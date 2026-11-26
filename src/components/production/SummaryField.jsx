import React from 'react';

/**
 * SummaryField - Summary tile for top horizontal strips across production screens.
 */
export const SummaryField = ({ icon: Icon, label, value, subtext, highlight = false, className = '' }) => {
  return (
    <div className={`p-3 rounded-xl border border-[#E7EAF0] bg-white flex items-center gap-3 min-w-[150px] flex-1 ${className}`}>
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-gray-500 truncate uppercase tracking-wider">{label}</p>
        <p className={`text-xs font-bold truncate mt-0.5 ${highlight ? 'text-[#084E92]' : 'text-gray-900'}`}>
          {value ?? '-'}
        </p>
        {subtext && <p className="text-[10px] text-gray-400 truncate">{subtext}</p>}
      </div>
    </div>
  );
};

export default SummaryField;
