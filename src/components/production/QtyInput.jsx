import React from 'react';

/**
 * QtyInput - Reusable numerical input with unit badge matching design tokens.
 */
export const QtyInput = ({
  value,
  onChange,
  unit = 'kg',
  min = 0,
  max,
  disabled = false,
  error = false,
  className = '',
  placeholder = '0'
}) => {
  return (
    <div
      className={`inline-flex items-center h-8 px-2 rounded-lg border text-xs bg-white transition-colors ${
        error
          ? 'border-rose-400 ring-1 ring-rose-300'
          : 'border-[#C3C6D1] focus-within:border-[#084E92] focus-within:ring-1 focus-within:ring-[#084E92]'
      } ${disabled ? 'bg-gray-100 opacity-70 cursor-not-allowed' : ''} ${className}`}
    >
      <input
        type="number"
        min={min}
        max={max}
        value={value ?? ''}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-14 bg-transparent outline-none text-right font-semibold text-gray-800 disabled:cursor-not-allowed"
      />
      {unit && <span className="ml-1 text-[11px] font-medium text-gray-400 select-none">{unit}</span>}
    </div>
  );
};

export default QtyInput;
