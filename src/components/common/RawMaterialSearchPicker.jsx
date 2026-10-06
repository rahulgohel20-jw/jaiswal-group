import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

/**
 * Normalizes available stock number from varied item payloads.
 */
export const extractItemStock = (item) => {
  if (!item) return null;
  const stockObj = item.currentStock;
  if (typeof stockObj === 'object' && stockObj !== null) {
    const val = stockObj.currentStock ?? stockObj.availableStock;
    return val !== undefined && val !== null ? Number(val) : null;
  }
  if (typeof stockObj === 'number') return stockObj;
  if (item.availableStock !== undefined && item.availableStock !== null) return Number(item.availableStock);
  if (item.actualStock !== undefined && item.actualStock !== null) return Number(item.actualStock);
  if (item.stock !== undefined && item.stock !== null) return Number(item.stock);
  if (item.opbStock !== undefined && item.opbStock !== null) return Number(item.opbStock);
  return null;
};

/**
 * Normalizes display unit string from varied item payloads.
 */
export const extractItemUnit = (item) => {
  if (!item) return '';
  return (
    item.currentStock?.unitName ||
    item.currentStock?.unitSymbol ||
    item.unit?.nameEnglish ||
    item.unit?.symbolEnglish ||
    item.unitName ||
    item.unitSymbol ||
    item.unitOfMeasurement?.nameEnglish ||
    item.measureUnit?.nameEnglish ||
    (typeof item.unit === 'string' && item.unit !== 'Units' ? item.unit : '') ||
    ''
  );
};

/**
 * Normalizes supplier rate / unit price from varied item payloads.
 */
export const extractItemPrice = (item) => {
  if (!item) return null;
  const val = item.supplierRate ?? item.unitRate ?? item.price ?? item.rate;
  return val !== undefined && val !== null && val !== '' ? Number(val) : null;
};

/**
 * Standardized Raw Material Search & Picker Component
 */
const RawMaterialSearchPicker = ({
  items = [],
  alreadyAddedIds = null,
  onSelect,
  loading = false,
  disabled = false,
  placeholder = 'Search raw material by name or code...',
  label = 'Select Item to Add',
  showStock = true,
  showPrice = true,
  showCode = true,
  className = '',
  isSticky = false,
  autoClearOnSelect = true,
}) => {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter already added IDs
  const addedSet = useMemo(() => {
    if (!alreadyAddedIds) return new Set();
    if (alreadyAddedIds instanceof Set) return alreadyAddedIds;
    if (Array.isArray(alreadyAddedIds)) {
      return new Set(alreadyAddedIds.map((id) => String(id)));
    }
    return new Set();
  }, [alreadyAddedIds]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const q = term.trim().toLowerCase();

    return items
      .filter((item) => {
        const idStr = String(item.id || item.rawMaterialId || item.itemId || '');
        return !addedSet.has(idStr);
      })
      .filter((item) => {
        if (!q) return true;
        const name = String(item.nameEnglish || item.itemName || item.name || '').toLowerCase();
        const code = String(item.itemCode || item.code || item.sku || '').toLowerCase();
        const category = String(item.category || item.rawMaterialCategoryName || item.rawMaterialCat?.nameEnglish || '').toLowerCase();
        return name.includes(q) || code.includes(q) || category.includes(q);
      });
  }, [items, term, addedSet]);

  const handleSelect = (item) => {
    if (onSelect) {
      onSelect(item);
    }
    if (autoClearOnSelect) {
      setTerm('');
    }
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setTerm('');
    setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className={`w-full max-w-lg ${
        isSticky ? 'sticky top-0 z-20 bg-white/95 backdrop-blur-xs py-1.5' : 'relative'
      } ${className}`}
    >
      {label && (
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

        <input
          type="text"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!disabled && !loading) setOpen(true);
          }}
          placeholder={loading ? 'Loading items...' : placeholder}
          disabled={disabled || loading}
          autoComplete="off"
          spellCheck={false}
          className="w-full h-9.5 pl-9 pr-8 text-xs rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none transition focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
        />

        {loading ? (
          <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
        ) : term ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer transition"
            title="Clear search"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      {open && !disabled && (
        <div className="absolute z-50 left-0 mt-1 w-full max-h-60 overflow-y-auto overscroll-contain bg-white border border-gray-200 rounded-xl shadow-2xl divide-y divide-gray-50">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-3.5 text-xs text-gray-400 text-center">
              {loading ? 'Loading items...' : 'No matching items found.'}
            </div>
          ) : (
            filteredItems.map((item) => {
              const stock = extractItemStock(item);
              const unit = extractItemUnit(item);
              const price = extractItemPrice(item);
              const name = item.nameEnglish || item.itemName || item.name || `Item #${item.id}`;
              const code = item.itemCode || item.code || item.sku;

              const formattedStock =
                stock !== null && stock !== undefined
                  ? Number.isInteger(stock)
                    ? stock
                    : Number(stock.toFixed(2))
                  : null;

              return (
                <button
                  key={item.id || item.rawMaterialId || item.itemId}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 text-left hover:bg-blue-50/80 transition-colors cursor-pointer group"
                >
                  {/* Left: Name + Code */}
                  <div className="min-w-0 flex-1 flex items-center gap-1.5">
                    <span
                      className="text-xs font-medium text-gray-800 group-hover:text-[#084E92] truncate"
                      title={name}
                    >
                      {name}
                    </span>
                    {showCode && code && (
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">
                        ({code})
                      </span>
                    )}
                  </div>

                  {/* Right: Stock + Price */}
                  <div className="text-right shrink-0 flex items-center gap-2">
                    {showStock && formattedStock !== null && (
                      <span className="text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-200/80 px-1.5 py-0.5 rounded whitespace-nowrap">
                        Stock:{' '}
                        <strong className="text-gray-900 font-semibold">
                          {formattedStock}
                          {unit ? ` ${unit}` : ''}
                        </strong>
                      </span>
                    )}

                    {showPrice && price !== null && (
                      <span className="text-[11px] font-bold text-gray-800 min-w-[36px] text-right font-mono">
                        ₹{price}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default RawMaterialSearchPicker;
