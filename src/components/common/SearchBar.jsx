import PropTypes from 'prop-types';
import { Search, X } from 'lucide-react';

/**
 * Standardized SearchBar component across ERP listing pages.
 * 
 * Dimensions & Styling:
 * - Uniform height: h-10 (40px)
 * - Uniform border & radius: border border-[#C3C6D1] rounded-xl text-sm
 * - Width rules:
 *   - When standalone (no filters): covers 70% width of screen / container (w-full max-w-[70%])
 *   - When alongside filters: fits within grid column or flex layout (w-full)
 */
export const SearchBar = ({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  wrapperClassName = '',
  isStandalone = false,
  autoFocus = false,
  disabled = false,
  ...rest
}) => {
  const widthCls = isStandalone ? 'w-full max-w-[70%]' : 'w-full';

  const handleClear = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className={`relative ${widthCls} ${wrapperClassName}`.trim()}>
      <Search
        size={18}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none shrink-0"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full h-10 pl-10 pr-9 border border-[#C3C6D1] rounded-xl text-sm text-gray-800 bg-white placeholder-gray-400 outline-none transition-all duration-150 focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/15 disabled:bg-gray-50 disabled:text-gray-400 ${className}`.trim()}
        {...rest}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full cursor-pointer transition z-10"
          title="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

SearchBar.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onClear: PropTypes.func,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  wrapperClassName: PropTypes.string,
  isStandalone: PropTypes.bool,
  autoFocus: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default SearchBar;
