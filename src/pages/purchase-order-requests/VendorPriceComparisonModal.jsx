import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, ChevronDown, Info, Link2, Loader2, TrendingDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { assignVendorOutletMapping } from '@/services/apiServices';
import { getUsernameFromToken, getUserCodeFromToken } from '@/utils/auth';
import { getApiErrorMessage } from '@/utils/toast';

const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

/**
 * Expects quotations shaped like the /vendor-price-configurations response:
 * { id, vendorId, vendorName, vendorCode, vendorCompanyName, rawMaterialId,
 *   rawMaterialNameEnglish, price, fromDate, toDate, isMapped }
 */
const VendorPriceComparisonModal = ({
  open,
  onClose,
  item,
  quotations = [],
  loading = false,
  onSelectPrice,
  outletId,
  onVendorMapped,
  lockedVendorId = null,
}) => {
  const [sortOrder, setSortOrder] = useState('desc'); // desc = Highest to Lowest
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [quantities, setQuantities] = useState({}); // { [quotationId]: string }
  const [localQuotations, setLocalQuotations] = useState([]);
  const [mappingVendorId, setMappingVendorId] = useState(null);

  // the PO/PR line item's required quantity — support whichever field name the caller passes
  const poQuantity =
    item?.approvedQty ?? item?.quantity ?? item?.qty ?? item?.requiredQuantity ?? null;

  // reset local state whenever a different item is opened
  // (PR/PO line items are keyed by rawMaterialId, not id)
  // pre-fill every vendor row with the PO's required quantity, so Amount shows immediately
  useEffect(() => {
    if (open) {
      setSortOrder('desc');
      setSelectedVendorId(null);
      setLocalQuotations(quotations);
      const defaults = {};
      quotations.forEach((q) => {
        defaults[q.id] = poQuantity != null ? String(poQuantity) : '';
      });
      setQuantities(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.rawMaterialId, quotations, poQuantity]);

  const handleMapVendor = async (quotation) => {
    const currentOutletId = outletId || item?.outletId;
    if (!currentOutletId) {
      toast.error('Please select an outlet in the Purchase Order to map vendor.');
      return;
    }
    if (!quotation.vendorId) {
      toast.error('Invalid vendor ID.');
      return;
    }
    setMappingVendorId(quotation.vendorId);
    try {
      const username = getUsernameFromToken() || getUserCodeFromToken() || 'system';
      await assignVendorOutletMapping({
        outletIds: [Number(currentOutletId)],
        username,
        vendorId: Number(quotation.vendorId),
      });
      toast.success(`${quotation.vendorName || 'Vendor'} mapped to outlet successfully!`);
      setLocalQuotations((prev) =>
        prev.map((q) =>
          Number(q.vendorId) === Number(quotation.vendorId) ? { ...q, isMapped: true } : q,
        ),
      );
      onVendorMapped?.(quotation.vendorId, currentOutletId);
    } catch (err) {
      console.error('Failed to map vendor to outlet', err);
      toast.error(getApiErrorMessage(err, 'Failed to map vendor to outlet.'));
    } finally {
      setMappingVendorId(null);
    }
  };

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // lowest price is computed from the FULL list, independent of sorting
  const lowestPrice = useMemo(() => {
    if (!localQuotations.length) return null;
    const prices = localQuotations
      .map((q) => Number(q.price))
      .filter((n) => !Number.isNaN(n));
    return prices.length ? Math.min(...prices) : null;
  }, [localQuotations]);

  const sortedQuotations = useMemo(() => {
    const list = [...localQuotations];
    list.sort((a, b) => {
      const priceA = Number(a.price) || 0;
      const priceB = Number(b.price) || 0;
      return sortOrder === 'desc' ? priceB - priceA : priceA - priceB;
    });
    return list;
  }, [localQuotations, sortOrder]);

  const handleQuantityChange = (id, value) => {
    // allow empty string, and non-negative numbers only
    if (value !== '' && (Number.isNaN(Number(value)) || Number(value) < 0)) return;
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  const handleClose = (e) => {
    e?.stopPropagation?.();
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A]">
              Vendor Price Comparison
            </h2>
            <p className="text-sm text-[#737781] mt-1">
              Item:{' '}
              <span className="font-medium text-[#475569]">
                {item?.itemName || item?.rawMaterialNameEnglish || '-'}
              </span>
              {item?.unit ? ` (${item.unit})` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer relative z-10"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info + Sort bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 text-sm text-[#475569]">
            <Info size={16} className="text-[#94A3B8]" />
            <span>
              {loading
                ? 'Loading vendor prices...'
                : `Reviewing ${quotations.length} vendor price${quotations.length === 1 ? '' : 's'} for procurement.`}
              {!loading && poQuantity != null && (
                <span className="ml-1 font-semibold text-[#0F172A]">
                  · PO Quantity: {poQuantity}
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#64748B]">Sort by:</span>
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-9 pl-3 pr-9 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#1E293B] appearance-none outline-none cursor-pointer focus:border-[#0B5CAD]"
              >
                <option value="desc">Price: Highest to Lowest</option>
                <option value="asc">Price: Lowest to Highest</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[55vh] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-[1]">
              <tr className="border-b border-[#E2E8F0]">
                <th className="text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide px-6 py-3">
                  Vendor
                </th>
                <th className="text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide px-4 py-3">
                  Item Price
                </th>
                <th className="text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide px-4 py-3">
                  Quantity
                </th>
                <th className="text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide px-4 py-3">
                  Amount
                </th>
                <th className="text-center text-xs font-semibold text-[#64748B] uppercase tracking-wide px-4 py-3">
                  Status
                </th>
                <th className="text-center text-xs font-semibold text-[#64748B] uppercase tracking-wide px-6 py-3">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm text-[#94A3B8]">Loading vendor prices...</p>
                  </td>
                </tr>
              )}

              {!loading &&
                sortedQuotations.map((q) => {
                  const isLowest = lowestPrice !== null && Number(q.price) === lowestPrice;
                  const isSelected = selectedVendorId === q.id;
                  const qty = quantities[q.id] ?? '';
                  const amount =
                    qty !== '' ? Number(q.price) * Number(qty) : null;
                  const isVendorDisabled = Boolean(lockedVendorId && String(q.vendorId) !== String(lockedVendorId));

                  return (
                    <tr
                      key={q.id}
                      className={`border-b border-[#F1F5F9] transition-colors ${
                        isLowest
                          ? 'bg-[#ECFDF5] hover:bg-[#DCFCE7]'
                          : 'hover:bg-[#F8FAFC]'
                      } ${isSelected ? 'ring-2 ring-inset ring-[#084E92]' : ''} ${
                        isVendorDisabled ? 'opacity-60 bg-gray-50/50' : ''
                      }`}
                    >
                      {/* Vendor name + code, side by side */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              isLowest ? 'bg-[#D1FAE5]' : 'bg-[#EFF6FF]'
                            }`}
                          >
                            <Building2
                              size={16}
                              className={
                                isLowest ? 'text-[#047857]' : 'text-[#0B5CAD]'
                              }
                            />
                          </div>

                          <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#1E293B] truncate">
                              {q.vendorName}
                            </span>
                            {q.vendorCode && (
                              <span className="text-[11px] font-medium text-[#0B5CAD] bg-[#EFF6FF] px-2 py-0.5 rounded-full shrink-0">
                                {q.vendorCode}
                              </span>
                            )}
                            {isVendorDisabled && (
                              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                Different Vendor
                              </span>
                            )}
                            {isLowest && !isVendorDisabled && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#047857] w-full">
                                <TrendingDown size={11} />
                                Lowest Price
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Item price — lowest gets a different colour */}
                      <td className="px-4 py-4 text-right">
                        <span
                          className={`text-sm font-semibold ${
                            isLowest ? 'text-[#047857]' : 'text-[#DC2626]'
                          }`}
                        >
                          ₹ {formatINR(q.price)}
                        </span>
                      </td>

                      {/* Editable quantity */}
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          min="0"
                          value={qty}
                          disabled={isVendorDisabled}
                          onChange={(e) => handleQuantityChange(q.id, e.target.value)}
                          placeholder="0"
                          className="w-20 h-8 px-2 text-right text-sm border border-[#E2E8F0] rounded-md outline-none focus:border-[#0B5CAD] disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>

                      {/* Amount = price x quantity */}
                      <td className="px-4 py-4 text-right">
                        <div
                          className={`text-sm font-bold ${
                            isLowest ? 'text-[#047857]' : 'text-[#0F172A]'
                          }`}
                        >
                          {amount !== null ? `₹ ${formatINR(amount)}` : '—'}
                        </div>
                        {amount !== null && (
                          <div className="text-[11px] text-[#94A3B8] mt-0.5">
                            {formatINR(q.price)} × {qty}
                          </div>
                        )}
                      </td>

                      {/* Status — mapped vs not mapped, distinct colours */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          {q.isMapped ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              Mapped
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Not Mapped
                              </span>
                              <button
                                type="button"
                                disabled={isVendorDisabled || mappingVendorId === q.vendorId || (!outletId && !item?.outletId)}
                                onClick={() => handleMapVendor(q)}
                                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#084E92] bg-blue-50/90 hover:bg-blue-100/90 border border-blue-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                                title={isVendorDisabled ? 'Different vendor from this PO' : 'Map vendor to this outlet'}
                              >
                                {mappingVendorId === q.vendorId ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#084E92]" />
                                    <span>Mapping...</span>
                                  </>
                                ) : (
                                  <>
                                    <Link2 size={13} className="text-[#084E92]" />
                                    <span>Map to Outlet</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          disabled={isVendorDisabled}
                          onClick={() => {
                            setSelectedVendorId(q.id);
                            onSelectPrice?.({ ...q, quantity: qty, amount }, item);
                          }}
                          title={
                            isVendorDisabled
                              ? 'This PO is generated for a specific vendor. Only prices from this PO vendor can be selected.'
                              : 'Select Price'
                          }
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-xs ${
                            isVendorDisabled
                              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                              : isLowest
                                ? 'bg-[#047857] hover:bg-[#036848] text-white cursor-pointer'
                                : 'bg-[#084E92] hover:bg-[#063d73] text-white cursor-pointer'
                          }`}
                        >
                          {isVendorDisabled ? 'Different Vendor' : (isSelected ? 'Selected' : 'Select Price')}
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {!loading && !sortedQuotations.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Building2
                      size={28}
                      className="mx-auto mb-3 text-[#CBD5E1]"
                    />
                    <p className="text-sm text-[#94A3B8]">
                      No vendor prices found for this item.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendorPriceComparisonModal;