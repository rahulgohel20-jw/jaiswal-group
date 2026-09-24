import React from 'react';
import { STATUS_DOT, STATUS_LABELS, STATUS_STYLES } from './eventHelper';

export const StatusBadge = ({ status }) => {
  const normalizedStatus = (status || 'inquiry').toString().toLowerCase().replace(/\s+/g, '-');
  const style = STATUS_STYLES[normalizedStatus] || 'bg-gray-50 text-gray-700 border-gray-200';
  const dot = STATUS_DOT[normalizedStatus] || 'bg-gray-400';
  const label = STATUS_LABELS[normalizedStatus] || status || 'Unknown';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full text-xs px-2.5 py-1 border ${style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};

export default StatusBadge;
