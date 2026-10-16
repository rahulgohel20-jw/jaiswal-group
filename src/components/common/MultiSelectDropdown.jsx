import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export const MultiSelectDropdown = ({
  label,
  required = false,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  options = [],
  selected = [],
  onChange,
  loading = false,
  disabled = false,
  allSelectedLabel,
  emptyText = 'No options found.',
  hasError = false,
  error = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeOptions = useMemo(() => (Array.isArray(options) ? options : []), [options]);
  const safeSelected = useMemo(() => (Array.isArray(selected) ? selected : []), [selected]);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return safeOptions;
    return safeOptions.filter((o) =>
      (o.name ?? o.label ?? '').toLowerCase().includes(term) ||
      (o.subtitle ? String(o.subtitle).toLowerCase().includes(term) : false)
    );
  }, [safeOptions, query]);

  const isSelected = (id) => safeSelected.some((s) => String(s.id) === String(id));

  const toggleOption = (option) => {
    if (disabled || !onChange) return;
    if (isSelected(option.id)) {
      onChange(safeSelected.filter((s) => String(s.id) !== String(option.id)));
    } else {
      onChange([...safeSelected, option]);
    }
  };

  const removeOption = (id) => {
    if (disabled || !onChange) return;
    onChange(safeSelected.filter((s) => String(s.id) !== String(id)));
  };

  const isAllSelected = safeOptions.length > 0 && safeSelected.length === safeOptions.length;

  const toggleSelectAll = () => {
    if (disabled || !onChange) return;
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...safeOptions]);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs sm:text-sm font-medium text-gray-700 block">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {safeSelected.length > 0 && (
            <span className="text-[11px] font-semibold text-[#084E92] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
              {safeSelected.length} selected
            </span>
          )}
        </div>
      )}

      <div
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`min-h-10 w-full border rounded-xl px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 cursor-pointer bg-white transition shadow-2xs ${
          disabled
            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
            : hasError
            ? 'border-red-400 focus-within:border-red-500'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {safeSelected.length === 0 && (
          <span className="text-gray-400 text-xs sm:text-sm px-1 truncate">
            {loading ? 'Loading...' : placeholder}
          </span>
        )}

        {isAllSelected && safeOptions.length > 0 ? (
          <span className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-semibold px-2.5 py-1 rounded-md">
            {allSelectedLabel || `All Selected (${safeOptions.length})`}
            {!disabled && (
              <X
                size={12}
                className="cursor-pointer hover:text-red-500 ml-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
              />
            )}
          </span>
        ) : (
          safeSelected.map((item) => (
            <span
              key={item.id}
              className="flex items-center gap-1 bg-[#EFF4FF] text-[#084E92] text-xs font-medium px-2 py-1 rounded-md max-w-full"
            >
              <span className="truncate max-w-[140px]" title={item.name}>
                {item.name}
              </span>
              {!disabled && (
                <X
                  size={12}
                  className="cursor-pointer hover:text-red-500 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(item.id);
                  }}
                />
              )}
            </span>
          ))
        )}

        <ChevronDown
          size={15}
          className={`ml-auto text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {open && !disabled && (
        <div className="absolute z-40 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-hidden flex flex-col animate-in fade-in-50 duration-100">
          <div className="relative border-b border-gray-100 bg-gray-50/50 p-1.5">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm outline-none bg-transparent"
            />
          </div>

          <div className="overflow-y-auto divide-y divide-gray-50 flex-1">
            {loading && (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">Loading options...</p>
            )}

            {!loading && filteredOptions.length === 0 && (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">
                {emptyText}
              </p>
            )}

            {/* "Select All" checkbox option */}
            {!loading && safeOptions.length > 0 && !query.trim() && (
              <label className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold border-b border-gray-100 hover:bg-[#F4F7FF] cursor-pointer text-[#084E92]">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="accent-[#084E92] w-4 h-4 rounded cursor-pointer"
                />
                <span>Select All ({safeOptions.length})</span>
              </label>
            )}

            {!loading &&
              filteredOptions.map((option) => {
                const checked = isSelected(option.id);
                return (
                  <label
                    key={option.id}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-blue-50 hover:text-[#084E92] cursor-pointer transition select-none"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(option)}
                      className="w-4 h-4 rounded text-[#084E92] accent-[#084E92] cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate leading-snug ${checked ? 'font-semibold text-[#084E92]' : ''}`}>
                        {option.name}
                      </p>
                      {option.subtitle && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {option.subtitle}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;