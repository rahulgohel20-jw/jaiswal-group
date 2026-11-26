import React from 'react';

/**
 * KpiCard - Metric cards matching the 4-card metric strips in Figma designs.
 */
export const KpiCard = ({ icon: Icon, label, value, subtext, tag, tone = 'default', className = '' }) => {
  const toneMap = {
    default: {
      bg: 'bg-white',
      border: 'border-[#E7EAF0]',
      iconBg: 'bg-blue-50 text-[#084E92]',
      tagBg: 'bg-blue-50 text-[#084E92] border-blue-200'
    },
    emerald: {
      bg: 'bg-white',
      border: 'border-[#E7EAF0]',
      iconBg: 'bg-emerald-50 text-emerald-600',
      tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    amber: {
      bg: 'bg-white',
      border: 'border-[#E7EAF0]',
      iconBg: 'bg-amber-50 text-amber-600',
      tagBg: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    rose: {
      bg: 'bg-white',
      border: 'border-[#E7EAF0]',
      iconBg: 'bg-rose-50 text-rose-600',
      tagBg: 'bg-rose-50 text-rose-700 border-rose-200'
    }
  };

  const style = toneMap[tone] || toneMap.default;

  return (
    <div className={`p-4 rounded-2xl border ${style.border} ${style.bg} shadow-xs flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${style.iconBg}`}>
            <Icon size={20} />
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-gray-900 tracking-tight">{value}</span>
            {subtext && <span className="text-xs text-gray-400 font-normal">{subtext}</span>}
          </div>
        </div>
      </div>
      {tag && (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${style.tagBg}`}>
          {tag}
        </span>
      )}
    </div>
  );
};

export default KpiCard;
