import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Plus,
  Box,
  Loader2,
  AlertCircle,
  Search,
  ChevronDown,
  Check,
} from 'lucide-react';
import { getAllActiveWithSearchPaginated } from '@/services/apiServices';

export const AddAssetModal = ({ isOpen, onClose, onAddAsset }) => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Dropdown open/close state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Selected asset
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState('');

  // Form values
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});

  // Reset modal state on open
  useEffect(() => {
    if (!isOpen) return;

    setQuantity('1');
    setPrice('');
    setRemarks('');
    setSelectedAsset(null);
    setSelectedAssetId('');
    setSearchTerm('');
    setDebouncedSearch('');
    setDropdownOpen(false);
    setErrors({});
    setPage(0);
    setTotalPages(1);
  }, [isOpen]);

  // Debounce search input
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch paginated assets using getAllActiveWithSearchPaginated
  const fetchAssets = useCallback(
    async (pageToFetch = 0, query = '', append = false) => {
      if (pageToFetch === 0 && !append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await getAllActiveWithSearchPaginated({
          page: pageToFetch,
          size: 20,
          search: query.trim() || undefined,
        });

        const pageData = res?.data?.data ?? res?.data ?? {};
        const newItems = Array.isArray(pageData?.content)
          ? pageData.content
          : Array.isArray(pageData)
          ? pageData
          : [];
        const total = Number(pageData?.totalPages ?? 1);

        setTotalPages(total);
        setPage(pageToFetch);

        if (append) {
          setAssets((prev) => {
            const existingIds = new Set(prev.map((a) => a.id));
            const filteredNew = newItems.filter((a) => !existingIds.has(a.id));
            return [...prev, ...filteredNew];
          });
        } else {
          setAssets(newItems);
        }
      } catch (err) {
        console.warn('Failed to load active paginated assets:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Trigger search / initial load
  useEffect(() => {
    if (!isOpen) return;
    fetchAssets(0, debouncedSearch, false);
  }, [debouncedSearch, isOpen, fetchAssets]);

  // Infinite scroll handler on the dropdown menu
  const handleDropdownScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 40) {
      if (page + 1 < totalPages && !loading && !loadingMore) {
        fetchAssets(page + 1, debouncedSearch, true);
      }
    }
  };

  // Select asset and auto-set price from asset response
  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    setSelectedAssetId(String(asset.id));
    if (errors.assetId) {
      setErrors((prev) => ({ ...prev, assetId: '' }));
    }

    // Set price according to the asset response we get
    const assetPrice =
      asset.price ??
      asset.currentValue ??
      asset.purchaseCost ??
      asset.value ??
      asset.cost ??
      0;

    const numPrice = Number(assetPrice) || 0;
    setPrice(String(numPrice));
    setDropdownOpen(false);
  };

  // Clear selected asset
  const handleClearSelectedAsset = (e) => {
    e.stopPropagation();
    setSelectedAsset(null);
    setSelectedAssetId('');
    setPrice('');
  };

  // Quantity input handler (prevent negative)
  const handleQuantityChange = (val) => {
    if (val === '') {
      setQuantity('');
      return;
    }
    const num = Math.max(0, parseInt(val, 10) || 0);
    setQuantity(String(num));
    if (errors.quantity) {
      setErrors((prev) => ({ ...prev, quantity: '' }));
    }
  };

  // Price input handler (prevent negative)
  const handlePriceChange = (val) => {
    if (val === '') {
      setPrice('');
      return;
    }
    const num = Math.max(0, parseFloat(val) || 0);
    setPrice(val);
    if (errors.price) {
      setErrors((prev) => ({ ...prev, price: '' }));
    }
  };

  // Auto-calculated monthly total
  const calculatedTotal =
    (parseFloat(quantity) || 0) * (parseFloat(price) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!selectedAssetId) {
      newErrors.assetId = 'Please select an asset';
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      newErrors.quantity = 'Quantity must be at least 1';
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      newErrors.price = 'Price must be non-negative';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const assetData = {
      assetId: Number(selectedAssetId),
      assetCode:
        selectedAsset?.assetCode ??
        selectedAsset?.assetId ??
        `AST-${selectedAssetId}`,
      assetName:
        selectedAsset?.itemName ||
        selectedAsset?.assetName ||
        selectedAsset?.name ||
        `Asset #${selectedAssetId}`,
      categoryName:
        selectedAsset?.categoryName || selectedAsset?.category || '',
      brandName: selectedAsset?.brandName || '',
      quantity: numQty,
      price: numPrice,
      totalCost: calculatedTotal,
      remarks: remarks?.trim() || '',
    };

    onAddAsset(assetData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084E92] border border-blue-100 flex items-center justify-center shrink-0">
              <Box size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-snug">
                Add Asset Allocation
              </h3>
              <p className="text-[11px] text-gray-500">
                Equipment allocation with monthly unit price.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Asset Selection with Active Paginated Search on Scroll */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Select Asset <span className="text-red-500">*</span>
            </label>

            {/* Single Search Bar & Selection Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={
                  selectedAsset
                    ? `${selectedAsset.itemName || selectedAsset.assetName || selectedAsset.name || `Asset #${selectedAsset.id}`} (${selectedAsset.assetCode || `AST-${selectedAsset.id}`})`
                    : searchTerm
                }
                onChange={(e) => {
                  if (selectedAsset) {
                    setSelectedAsset(null);
                    setSelectedAssetId('');
                    setPrice('');
                  }
                  setSearchTerm(e.target.value);
                  if (!dropdownOpen) setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Search asset by name, code..."
                className={`w-full h-9.5 pl-8.5 pr-8 text-xs rounded-xl border bg-white focus:outline-none transition ${
                  errors.assetId
                    ? 'border-red-500 ring-1 ring-red-200'
                    : dropdownOpen
                    ? 'border-[#084E92] ring-2 ring-[#084E92]/15'
                    : 'border-[#C3C6D1] hover:border-gray-400'
                }`}
              />

              {selectedAsset ? (
                <button
                  type="button"
                  onClick={handleClearSelectedAsset}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition cursor-pointer"
                  title="Clear selection"
                >
                  <X size={13} />
                </button>
              ) : (
                <ChevronDown
                  size={14}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform pointer-events-none ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </div>

            {errors.assetId && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.assetId}
              </p>
            )}

            {/* Dropdown Menu (Only Paginated Scroll List, No Duplicate Search Bar) */}
            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden flex flex-col animate-in fade-in duration-100">
                {/* Paginated Options List */}
                <div
                  onScroll={handleDropdownScroll}
                  className="max-h-56 overflow-y-auto divide-y divide-gray-50 text-xs"
                >
                  {loading && assets.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-1.5">
                      <Loader2 size={14} className="animate-spin text-[#084E92]" />
                      Loading assets...
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="py-7 text-center text-gray-400 text-xs">
                      No active assets found
                    </div>
                  ) : (
                    assets.map((asset) => {
                      const isSelected =
                        String(asset.id) === String(selectedAssetId);
                      const name =
                        asset.itemName ||
                        asset.assetName ||
                        asset.name ||
                        `Asset #${asset.id}`;
                      const code =
                        asset.assetCode || asset.code || `AST-${asset.id}`;
                      const cat =
                        asset.categoryName || asset.category || '';
                      const rawPrice =
                        asset.price ??
                        asset.currentValue ??
                        asset.purchaseCost ??
                        asset.value ??
                        asset.cost ??
                        0;

                      return (
                        <div
                          key={asset.id}
                          onClick={() => handleSelectAsset(asset)}
                          className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-50/80 text-[#084E92]'
                              : 'hover:bg-gray-50 text-gray-800'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-semibold truncate">
                              {name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500">
                              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-mono">
                                {code}
                              </span>
                              {cat && <span>• {cat}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {Number(rawPrice) > 0 && (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                ₹{Number(rawPrice).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            )}
                            {isSelected && (
                              <Check size={14} className="text-[#084E92] stroke-[2.5]" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Loading more on scroll spinner */}
                  {loadingMore && (
                    <div className="py-2.5 text-center text-xs text-gray-400 flex items-center justify-center gap-1 bg-gray-50/50">
                      <Loader2 size={12} className="animate-spin text-[#084E92]" />
                      Loading more...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quantity & Monthly Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder="1"
                className={`w-full h-9 px-3 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                  errors.quantity ? 'border-red-500' : 'border-[#C3C6D1]'
                }`}
              />
              {errors.quantity && (
                <p className="text-[11px] text-red-500 mt-1">{errors.quantity}</p>
              )}
            </div>

            {/* Monthly Unit Price (Auto-set from asset response, editable) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Monthly Price (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="0.00"
                  className={`w-full h-9 pl-6 pr-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 ${
                    errors.price ? 'border-red-500' : 'border-[#C3C6D1]'
                  }`}
                />
              </div>
              {errors.price && (
                <p className="text-[11px] text-red-500 mt-1">{errors.price}</p>
              )}
            </div>
          </div>

          {/* Monthly Total Cost (Computed preview) */}
          <div className="bg-[#F8FAFC] border border-[#E4E7EC] rounded-xl px-3.5 py-2.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-gray-600 block">
                Monthly Total Amount
              </span>
              <span className="text-[10px] text-gray-400">
                Quantity × Monthly Price
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-[#084E92]">
                ₹{' '}
                {calculatedTotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Remarks <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. For main kitchen operations"
              className="w-full h-9 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2.5 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 h-8.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4.5 h-8.5 text-xs font-bold text-white bg-[#084E92] hover:bg-[#073d73] rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} />
              Add Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
